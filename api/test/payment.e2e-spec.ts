import { randomUUID } from 'node:crypto';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { Test } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import Stripe from 'stripe';
import request from 'supertest';
import { PrismaService } from '@/prisma/prisma.service.js';
import { JwtStrategy } from '@/modules/auth/strategies/jwt.strategy.js';
import { PaymentModule } from '@/modules/payment/payment.module.js';
import { PrismaModule } from '@/prisma/prisma.module.js';

// 用内存版 Stripe 替换 SDK，不发任何网络请求
const stripe = vi.hoisted(() => {
  const intents = new Map<string, any>();
  return {
    intents,
    create: vi.fn(async (params: any) => {
      const id = `pi_${Math.random().toString(36).slice(2)}`;
      const intent = {
        id,
        client_secret: `${id}_secret`,
        status: 'requires_payment_method',
        ...params,
      };
      intents.set(id, intent);
      return intent;
    }),
    retrieve: vi.fn(async (id: string) => {
      const intent = intents.get(id);
      if (!intent) throw new Error(`No such payment_intent: '${id}'`);
      return intent;
    }),
    cancel: vi.fn(async (id: string) => {
      const intent = intents.get(id);
      intent.status = 'canceled';
      return intent;
    }),
    refund: vi.fn(async (params: any, _options?: any) => ({
      id: `re_${Math.random().toString(36).slice(2)}`,
      status: 'succeeded',
      ...params,
    })),
  };
});

vi.mock('stripe', async (importOriginal) => {
  const { default: Stripe } = await importOriginal<typeof import('stripe')>();
  return {
    default: class {
      static errors = Stripe.errors;
      paymentIntents = {
        create: stripe.create,
        retrieve: stripe.retrieve,
        cancel: stripe.cancel,
      };
      refunds = { create: stripe.refund };
    },
  };
});

const JWT_SECRET = 'test-secret';

// 内存版 Prisma，只实现 payment 模块用到的方法；
// payment.orderId 与 schema 一样是 @unique，重复创建会抛错
function createPrismaMock() {
  const users = new Map<string, any>();
  const orders = new Map<string, any>();
  const payments = new Map<string, any>();
  const carts = new Map<string, any>();

  const matches = (row: any, where: any = {}) =>
    Object.entries(where).every(([k, v]) => row[k] === v);

  const updateMany =
    (rows: Map<string, any>) =>
    async ({ where, data }: any) => {
      const hits = [...rows.values()].filter((r) => matches(r, where));
      hits.forEach((r) => Object.assign(r, data, { updatedAt: new Date() }));
      return { count: hits.length };
    };

  // 事务失败时把数据恢复到事务开始前，模拟数据库回滚
  const snapshot = () =>
    [orders, payments, carts].map(
      (m) => new Map([...m].map(([k, v]) => [k, { ...v }])),
    );
  const restore = (saved: Map<string, any>[]) =>
    [orders, payments, carts].forEach((m, i) => {
      m.clear();
      saved[i].forEach((v, k) => m.set(k, v));
    });

  const prisma: any = {
    users,
    orders,
    payments,
    carts,
    user: {
      findUnique: async ({ where }: any) => users.get(where.id) ?? null,
    },
    order: {
      findFirst: async ({ where }: any) =>
        [...orders.values()].find((o) => matches(o, where)) ?? null,
      update: async ({ where, data }: any) => {
        const o = orders.get(where.id);
        if (!o) throw new Error('Record to update not found');
        Object.assign(o, data, { updatedAt: new Date() });
        return o;
      },
      updateMany: updateMany(orders),
    },
    payment: {
      create: async ({ data }: any) => {
        if ([...payments.values()].some((p) => p.orderId === data.orderId)) {
          throw new Prisma.PrismaClientKnownRequestError(
            'Unique constraint failed on the fields: (`orderId`)',
            { code: 'P2002', clientVersion: 'test' },
          );
        }
        const now = new Date();
        const p = {
          id: randomUUID(),
          ...data,
          amount: new Prisma.Decimal(data.amount),
          createdAt: now,
          updatedAt: now,
        };
        payments.set(p.id, p);
        return p;
      },
      findFirst: async ({ where }: any) =>
        [...payments.values()].find((p) => matches(p, where)) ?? null,
      findFirstOrThrow: async ({ where }: any) => {
        const p = [...payments.values()].find((x) => matches(x, where));
        if (!p) throw new Error('No Payment found');
        return p;
      },
      updateMany: updateMany(payments),
      findMany: async ({ where }: any) =>
        [...payments.values()]
          .filter((p) => matches(p, where))
          .sort((a, b) => b.createdAt - a.createdAt),
      update: async ({ where, data }: any) => {
        const p = payments.get(where.id);
        if (!p) throw new Error('Record to update not found');
        Object.assign(p, data, { updatedAt: new Date() });
        return p;
      },
    },
    cart: {
      update: async ({ where, data }: any) => {
        const c = carts.get(where.id);
        if (!c) throw new Error('Record to update not found');
        return Object.assign(c, data);
      },
    },
    $transaction: async (arg: any) => {
      if (Array.isArray(arg)) return Promise.all(arg);
      const saved = snapshot();
      try {
        return await arg(prisma);
      } catch (error) {
        restore(saved);
        throw error;
      }
    },
  };
  return prisma;
}

describe('Payment API (e2e)', () => {
  let app: INestApplication;
  let prisma: ReturnType<typeof createPrismaMock>;
  let userToken: string;
  let otherUserToken: string;
  let userId: string;
  let otherUserId: string;

  const http = () => request(app.getHttpServer());
  const auth = (token = userToken) => ({ Authorization: `Bearer ${token}` });

  const addOrder = (overrides: Record<string, unknown> = {}) => {
    const now = new Date();
    const o = {
      id: randomUUID(),
      orderNumber: `c${randomUUID().replace(/-/g, '')}`,
      status: 'PENDING',
      totalAmount: new Prisma.Decimal(200),
      userId,
      cartId: null,
      shippingAddress: '上海市浦东新区 xx 路 1 号',
      createdAt: now,
      updatedAt: now,
      ...overrides,
    };
    prisma.orders.set(o.id, o);
    return o;
  };

  const createIntent = async (orderId: string, amount = 200) => {
    const res = await http()
      .post('/api/v1/payment/create-intent')
      .set(auth())
      .send({ orderId, amount })
      .expect(201);
    return res.body.data as { clientSecret: string; paymentId: string };
  };

  // 模拟前端用 clientSecret 在 Stripe 完成付款
  const succeedIntent = (paymentId: string) => {
    const intentId = prisma.payments.get(paymentId).transactionId;
    stripe.intents.get(intentId).status = 'succeeded';
    return intentId as string;
  };

  beforeEach(async () => {
    process.env.JWT_SECRET = JWT_SECRET;
    stripe.intents.clear();
    stripe.create.mockClear();
    stripe.retrieve.mockClear();
    stripe.cancel.mockClear();
    stripe.refund.mockClear();
    prisma = createPrismaMock();

    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true }),
        PrismaModule,
        PassportModule,
        JwtModule.register({ secret: JWT_SECRET }),
        PaymentModule,
      ],
      providers: [JwtStrategy],
    })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    // 与 main.ts 中的全局校验管道保持一致
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    await app.init();

    const jwt = moduleRef.get(JwtService);
    const mkUser = (email: string) => {
      const u = {
        id: randomUUID(),
        email,
        firstName: 'San',
        lastName: 'Zhang',
        role: 'USER',
      };
      prisma.users.set(u.id, u);
      return { id: u.id, token: jwt.sign({ sub: u.id, email }) };
    };
    ({ id: userId, token: userToken } = mkUser('user@test.com'));
    ({ id: otherUserId, token: otherUserToken } = mkUser('other@test.com'));
  });

  afterEach(async () => {
    await app.close();
  });

  describe('POST /payment/create-intent', () => {
    it('创建支付意图，返回 clientSecret 并落库 PENDING 记录', async () => {
      const order = addOrder({ totalAmount: new Prisma.Decimal(199.99) });
      const res = await http()
        .post('/api/v1/payment/create-intent')
        .set(auth())
        .send({ orderId: order.id, amount: 199.99 })
        .expect(201);

      expect(res.body).toMatchObject({
        success: true,
        message: '支付意图创建成功',
      });
      const { clientSecret, paymentId } = res.body.data;
      expect(clientSecret).toMatch(/^pi_.+_secret$/);
      expect(prisma.payments.get(paymentId)).toMatchObject({
        orderId: order.id,
        userId,
        status: 'PENDING',
        currency: 'usd',
        paymentMethod: 'STRIPE',
      });
      expect(stripe.create).toHaveBeenCalledWith({
        amount: 19999,
        currency: 'usd',
        metadata: { orderId: order.id, userId },
      });
    });

    it('未登录返回 401', () =>
      http()
        .post('/api/v1/payment/create-intent')
        .send({ orderId: 'x', amount: 1 })
        .expect(401));

    it('订单不存在返回 404', () =>
      http()
        .post('/api/v1/payment/create-intent')
        .set(auth())
        .send({ orderId: randomUUID(), amount: 1 })
        .expect(404));

    it('为别人的订单创建支付返回 404', async () => {
      const order = addOrder({ userId: otherUserId });
      await http()
        .post('/api/v1/payment/create-intent')
        .set(auth())
        .send({ orderId: order.id, amount: 200 })
        .expect(404);
      expect(stripe.create).not.toHaveBeenCalled();
    });

    it('订单已支付返回 400', async () => {
      const order = addOrder();
      const { paymentId } = await createIntent(order.id);
      prisma.payments.get(paymentId).status = 'COMPLETED';
      await http()
        .post('/api/v1/payment/create-intent')
        .set(auth())
        .send({ orderId: order.id, amount: 200 })
        .expect(400);
    });

    it.each([
      ['缺少 orderId', { orderId: undefined, amount: 1 }],
      ['amount 为 0', { amount: 0 }],
      ['amount 为负数', { amount: -1 }],
      ['amount 不是数字', { amount: 'abc' }],
      ['多余字段', { amount: 1, foo: 'bar' }],
    ])('参数非法（%s）返回 400', async (_, body) => {
      const order = addOrder();
      await http()
        .post('/api/v1/payment/create-intent')
        .set(auth())
        .send({ orderId: order.id, ...body })
        .expect(400);
    });

    it('[安全] 客户端金额与订单金额不一致返回 400，不调用 Stripe', async () => {
      const order = addOrder({ totalAmount: new Prisma.Decimal(200) });
      await http()
        .post('/api/v1/payment/create-intent')
        .set(auth())
        .send({ orderId: order.id, amount: 0.01 })
        .expect(400);
      expect(stripe.create).not.toHaveBeenCalled();
      expect(prisma.payments.size).toBe(0);
    });

    it('向 Stripe 扣款的金额取订单金额（分）', async () => {
      const order = addOrder({ totalAmount: new Prisma.Decimal(19.9) });
      await createIntent(order.id, 19.9);
      expect(stripe.create.mock.calls[0][0].amount).toBe(1990);
    });

    describe('重复发起支付', () => {
      it('未完成的支付意图可复用，返回同一个 clientSecret 和支付记录', async () => {
        const order = addOrder();
        const first = await createIntent(order.id);
        const second = await createIntent(order.id);
        expect(second).toEqual(first);
        expect(stripe.create).toHaveBeenCalledTimes(1);
        expect(prisma.payments.size).toBe(1);
      });

      it('原支付意图已失效时创建新意图并更新原记录', async () => {
        const order = addOrder();
        const first = await createIntent(order.id);
        const oldIntentId = prisma.payments.get(first.paymentId).transactionId;
        stripe.intents.get(oldIntentId).status = 'canceled';
        prisma.payments.get(first.paymentId).status = 'FAILED';

        const second = await createIntent(order.id);
        expect(second.paymentId).toBe(first.paymentId);
        expect(second.clientSecret).not.toBe(first.clientSecret);
        expect(prisma.payments.get(first.paymentId)).toMatchObject({
          status: 'PENDING',
          transactionId: expect.not.stringMatching(oldIntentId),
        });
        expect(prisma.payments.size).toBe(1);
      });

      it('更换币种时取消旧意图再创建新意图', async () => {
        const order = addOrder();
        const first = await createIntent(order.id);
        const oldIntentId = prisma.payments.get(first.paymentId).transactionId;

        await http()
          .post('/api/v1/payment/create-intent')
          .set(auth())
          .send({ orderId: order.id, amount: 200, currency: 'eur' })
          .expect(201);
        expect(stripe.cancel).toHaveBeenCalledWith(oldIntentId);
        expect(stripe.intents.get(oldIntentId).status).toBe('canceled');
        expect(prisma.payments.get(first.paymentId).currency).toBe('eur');
      });

      it('Stripe 已扣款但尚未确认时返回 400，不再创建新意图', async () => {
        const order = addOrder();
        const { paymentId } = await createIntent(order.id);
        succeedIntent(paymentId);
        await http()
          .post('/api/v1/payment/create-intent')
          .set(auth())
          .send({ orderId: order.id, amount: 200 })
          .expect(400);
        expect(stripe.create).toHaveBeenCalledTimes(1);
      });

      it('并发创建撞上唯一约束返回 409，并取消多出的意图', async () => {
        const order = addOrder();
        const findFirst = prisma.payment.findFirst;
        // 模拟并发：查询时还看不到另一个请求刚写入的记录
        prisma.payment.findFirst = async () => null;
        await createIntent(order.id);
        const res = await http()
          .post('/api/v1/payment/create-intent')
          .set(auth())
          .send({ orderId: order.id, amount: 200 })
          .expect(409);
        prisma.payment.findFirst = findFirst;
        expect(res.body.message).toBe('该订单正在发起支付，请稍后重试');
        const orphan = stripe.create.mock.results[1].value;
        expect(stripe.cancel).toHaveBeenCalledWith((await orphan).id);
        expect(prisma.payments.size).toBe(1);
      });
    });

    it.each(['CANCELLED', 'PROCESSING', 'SHIPPED', 'DELIVERED'])(
      '[业务] 订单状态为 %s 时不能发起支付',
      async (status) => {
        const order = addOrder({ status });
        await http()
          .post('/api/v1/payment/create-intent')
          .set(auth())
          .send({ orderId: order.id, amount: 200 })
          .expect(400);
        expect(stripe.create).not.toHaveBeenCalled();
      },
    );

    it('[校验] 金额超过两位小数应返回 400', async () => {
      const order = addOrder();
      await http()
        .post('/api/v1/payment/create-intent')
        .set(auth())
        .send({ orderId: order.id, amount: 199.999 })
        .expect(400);
    });

    describe('Stripe 报错', () => {
      const send = (orderId: string) =>
        http()
          .post('/api/v1/payment/create-intent')
          .set(auth())
          .send({ orderId, amount: 200 });

      it('请求参数无效返回 400，不透出 Stripe 内部信息', async () => {
        const order = addOrder();
        stripe.create.mockRejectedValueOnce(
          new Stripe.errors.StripeInvalidRequestError({
            message: 'Invalid currency: xxx',
          }),
        );
        const res = await send(order.id).expect(400);
        expect(res.body.message).toBe('支付请求参数无效');
        expect(prisma.payments.size).toBe(0);
      });

      it('卡被拒返回 400，带上 Stripe 的提示', async () => {
        const order = addOrder();
        stripe.create.mockRejectedValueOnce(
          new Stripe.errors.StripeCardError({
            message: 'Your card was declined.',
          }),
        );
        const res = await send(order.id).expect(400);
        expect(res.body.message).toBe('Your card was declined.');
      });

      it.each([
        ['网络连接失败', Stripe.errors.StripeConnectionError],
        ['Stripe 服务故障', Stripe.errors.StripeAPIError],
        ['密钥无效', Stripe.errors.StripeAuthenticationError],
        ['触发限流', Stripe.errors.StripeRateLimitError],
      ])('%s返回 502', async (_, ErrorClass) => {
        const order = addOrder();
        stripe.create.mockRejectedValueOnce(
          new ErrorClass({ message: 'upstream error' }),
        );
        const res = await send(order.id).expect(502);
        expect(res.body.message).toBe('支付服务暂不可用，请稍后重试');
      });

      it('非 Stripe 的错误仍按 500 处理', async () => {
        const order = addOrder();
        stripe.create.mockRejectedValueOnce(new Error('boom'));
        await send(order.id).expect(500);
      });
    });
  });

  describe('POST /payment/confirm', () => {
    it('Stripe 支付成功后确认：支付 COMPLETED、订单 PROCESSING、购物车结算', async () => {
      prisma.carts.set('cart-1', { id: 'cart-1', checkedOut: false });
      const order = addOrder({ cartId: 'cart-1' });
      const { paymentId } = await createIntent(order.id);
      const paymentIntentId = succeedIntent(paymentId);

      const res = await http()
        .post('/api/v1/payment/confirm')
        .set(auth())
        .send({ paymentIntentId, orderId: order.id });

      expect(res.status).toBeLessThan(300);
      expect(res.body).toMatchObject({
        success: true,
        message: '支付已确认',
        data: { id: paymentId, status: 'COMPLETED', amount: 200 },
      });
      expect(prisma.orders.get(order.id).status).toBe('PROCESSING');
      expect(prisma.carts.get('cart-1').checkedOut).toBe(true);
    });

    it('Stripe 尚未支付成功返回 400，状态不变', async () => {
      const order = addOrder();
      const { paymentId } = await createIntent(order.id);
      const paymentIntentId = prisma.payments.get(paymentId).transactionId;

      await http()
        .post('/api/v1/payment/confirm')
        .set(auth())
        .send({ paymentIntentId, orderId: order.id })
        .expect(400);
      expect(prisma.payments.get(paymentId).status).toBe('PENDING');
      expect(prisma.orders.get(order.id).status).toBe('PENDING');
    });

    it('重复确认返回 400', async () => {
      const order = addOrder();
      const { paymentId } = await createIntent(order.id);
      const paymentIntentId = succeedIntent(paymentId);
      const confirm = () =>
        http()
          .post('/api/v1/payment/confirm')
          .set(auth())
          .send({ paymentIntentId, orderId: order.id });
      await confirm();
      await confirm().expect(400);
    });

    it('确认别人的支付返回 404', async () => {
      const order = addOrder();
      const { paymentId } = await createIntent(order.id);
      const paymentIntentId = succeedIntent(paymentId);
      await http()
        .post('/api/v1/payment/confirm')
        .set(auth(otherUserToken))
        .send({ paymentIntentId, orderId: order.id })
        .expect(404);
    });

    it('paymentIntentId 与订单不匹配返回 404', async () => {
      const orderA = addOrder();
      const orderB = addOrder();
      const { paymentId } = await createIntent(orderA.id);
      await createIntent(orderB.id);
      const intentA = succeedIntent(paymentId);
      await http()
        .post('/api/v1/payment/confirm')
        .set(auth())
        .send({ paymentIntentId: intentA, orderId: orderB.id })
        .expect(404);
      expect(prisma.orders.get(orderB.id).status).toBe('PENDING');
    });

    it.each([
      ['缺少 paymentIntentId', { orderId: 'x' }],
      ['缺少 orderId', { paymentIntentId: 'pi_x' }],
      ['多余字段', { orderId: 'x', paymentIntentId: 'pi_x', foo: 1 }],
    ])('参数非法（%s）返回 400', async (_, body) => {
      await http()
        .post('/api/v1/payment/confirm')
        .set(auth())
        .send(body)
        .expect(400);
    });

    it('未登录返回 401', () =>
      http().post('/api/v1/payment/confirm').send({}).expect(401));

    it('确认成功返回 200', async () => {
      const order = addOrder();
      const { paymentId } = await createIntent(order.id);
      const paymentIntentId = succeedIntent(paymentId);
      await http()
        .post('/api/v1/payment/confirm')
        .set(auth())
        .send({ paymentIntentId, orderId: order.id })
        .expect(200);
    });

    describe('订单状态', () => {
      it('付款期间订单被取消：订单保持 CANCELLED，自动全额退款并标记 REFUNDED', async () => {
        prisma.carts.set('cart-1', { id: 'cart-1', checkedOut: false });
        const order = addOrder({ cartId: 'cart-1' });
        const { paymentId } = await createIntent(order.id);
        const paymentIntentId = succeedIntent(paymentId);
        prisma.orders.get(order.id).status = 'CANCELLED';

        const res = await http()
          .post('/api/v1/payment/confirm')
          .set(auth())
          .send({ paymentIntentId, orderId: order.id })
          .expect(400);

        expect(res.body.message).toBe('订单状态已变更，款项将原路退回');
        expect(prisma.orders.get(order.id).status).toBe('CANCELLED');
        expect(prisma.payments.get(paymentId).status).toBe('REFUNDED');
        expect(prisma.carts.get('cart-1').checkedOut).toBe(false);
        expect(stripe.refund).toHaveBeenCalledWith(
          { payment_intent: paymentIntentId },
          { idempotencyKey: `refund-${paymentIntentId}` },
        );
      });

      it('已退款的支付再次确认返回 400，不会重复退款', async () => {
        const order = addOrder();
        const { paymentId } = await createIntent(order.id);
        const paymentIntentId = succeedIntent(paymentId);
        prisma.payments.get(paymentId).status = 'REFUNDED';

        const res = await http()
          .post('/api/v1/payment/confirm')
          .set(auth())
          .send({ paymentIntentId, orderId: order.id })
          .expect(400);
        expect(res.body.message).toBe('支付记录已失效');
        expect(stripe.refund).not.toHaveBeenCalled();
      });

      it('[并发] 另一个请求已确认成功时返回 400，不能误退款', async () => {
        const order = addOrder();
        const { paymentId } = await createIntent(order.id);
        const paymentIntentId = succeedIntent(paymentId);
        // 模拟并发：本请求读到的还是 PENDING，但另一个请求已经确认完成
        const stale = { ...prisma.payments.get(paymentId) };
        prisma.payments.get(paymentId).status = 'COMPLETED';
        prisma.orders.get(order.id).status = 'PROCESSING';
        prisma.payment.findFirst = async () => stale;

        await http()
          .post('/api/v1/payment/confirm')
          .set(auth())
          .send({ paymentIntentId, orderId: order.id })
          .expect(400);
        expect(stripe.refund).not.toHaveBeenCalled();
        expect(prisma.payments.get(paymentId).status).toBe('COMPLETED');
        expect(prisma.orders.get(order.id).status).toBe('PROCESSING');
      });

      it('退款调用失败返回 502，支付保持 PENDING，重试会用同一个幂等 key', async () => {
        const order = addOrder();
        const { paymentId } = await createIntent(order.id);
        const paymentIntentId = succeedIntent(paymentId);
        prisma.orders.get(order.id).status = 'CANCELLED';
        stripe.refund.mockRejectedValueOnce(
          new Stripe.errors.StripeConnectionError({ message: 'timeout' }),
        );
        const confirm = () =>
          http()
            .post('/api/v1/payment/confirm')
            .set(auth())
            .send({ paymentIntentId, orderId: order.id });

        await confirm().expect(502);
        expect(prisma.payments.get(paymentId).status).toBe('PENDING');

        await confirm().expect(400);
        expect(prisma.payments.get(paymentId).status).toBe('REFUNDED');
        const keys = stripe.refund.mock.calls.map((c) => c[1].idempotencyKey);
        expect(keys).toEqual([
          `refund-${paymentIntentId}`,
          `refund-${paymentIntentId}`,
        ]);
      });
    });
  });

  describe('GET /payment', () => {
    it('只返回当前用户的支付记录，按创建时间倒序', async () => {
      const first = await createIntent(addOrder().id);
      await new Promise((r) => setTimeout(r, 5));
      const second = await createIntent(addOrder().id);
      const others = addOrder({ userId: otherUserId });
      await http()
        .post('/api/v1/payment/create-intent')
        .set(auth(otherUserToken))
        .send({ orderId: others.id, amount: 200 })
        .expect(201);

      const res = await http().get('/api/v1/payment').set(auth()).expect(200);
      expect(res.body.data.map((p: any) => p.id)).toEqual([
        second.paymentId,
        first.paymentId,
      ]);
      expect(res.body.data[0].amount).toBe(200);
    });

    it('未登录返回 401', () => http().get('/api/v1/payment').expect(401));
  });

  describe('GET /payment/:id', () => {
    it('查看自己的支付记录', async () => {
      const { paymentId } = await createIntent(addOrder().id);
      const res = await http()
        .get(`/api/v1/payment/${paymentId}`)
        .set(auth())
        .expect(200);
      expect(res.body.data).toMatchObject({ id: paymentId, status: 'PENDING' });
    });

    it('查看别人的支付记录返回 404', async () => {
      const { paymentId } = await createIntent(addOrder().id);
      await http()
        .get(`/api/v1/payment/${paymentId}`)
        .set(auth(otherUserToken))
        .expect(404);
    });

    it('支付记录不存在返回 404', () =>
      http().get(`/api/v1/payment/${randomUUID()}`).set(auth()).expect(404));
  });

  describe('GET /payment/order/:orderId', () => {
    it('按订单 ID 查询支付记录', async () => {
      const order = addOrder();
      const { paymentId } = await createIntent(order.id);
      const res = await http()
        .get(`/api/v1/payment/order/${order.id}`)
        .set(auth())
        .expect(200);
      expect(res.body.data.id).toBe(paymentId);
    });

    it('查询别人订单的支付记录返回 404', async () => {
      const order = addOrder();
      await createIntent(order.id);
      await http()
        .get(`/api/v1/payment/order/${order.id}`)
        .set(auth(otherUserToken))
        .expect(404);
    });

    it('订单无支付记录返回 404', () =>
      http()
        .get(`/api/v1/payment/order/${randomUUID()}`)
        .set(auth())
        .expect(404));
  });
});
