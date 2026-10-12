import { randomUUID } from 'node:crypto';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { Test } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import request from 'supertest';
import { PrismaService } from '@/prisma/prisma.service.js';
import { JwtStrategy } from '@/modules/auth/strategies/jwt.strategy.js';
import { OrderModule } from '@/modules/order/order.module.js';
import { PrismaModule } from '@/prisma/prisma.module.js';

const JWT_SECRET = 'test-secret';
const ORDER_STATUSES = [
  'PENDING',
  'PROCESSING',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
];
const ORDER_FIELDS = new Set([
  'id',
  'orderNumber',
  'status',
  'totalAmount',
  'userId',
  'cartId',
  'shippingAddress',
  'createdAt',
  'updatedAt',
]);

// 内存版 Prisma，只实现 order 模块用到的方法；
// 对真实 Prisma 会拒绝的输入（非法枚举、缺必填字段、未知字段、负数 skip）同样抛错
function createPrismaMock() {
  const users = new Map<string, any>();
  const products = new Map<string, any>();
  const orders = new Map<string, any>();
  const orderItems: any[] = [];
  const carts: any[] = [];

  const assertStatus = (status: unknown) => {
    if (status !== undefined && !ORDER_STATUSES.includes(status as string)) {
      throw new Error(`Invalid value for argument \`status\`: ${status}`);
    }
  };

  const matches = (o: any, where: any = {}) => {
    assertStatus(where.status);
    if (where.id && o.id !== where.id) return false;
    if (where.userId && o.userId !== where.userId) return false;
    if (where.status && o.status !== where.status) return false;
    if (where.OR) {
      return where.OR.some((cond: any) => {
        const [field, { contains }] = Object.entries(cond)[0] as any;
        return (o[field] ?? '').toLowerCase().includes(contains.toLowerCase());
      });
    }
    return true;
  };

  const hydrate = (o: any, include: any = {}) => {
    const items = orderItems.filter((i) => i.orderId === o.id);
    return {
      ...o,
      ...(include.orderItems && {
        orderItems: include.orderItems.include?.product
          ? items.map((i) => ({ ...i, product: products.get(i.productId) }))
          : items,
      }),
      ...(include.user && { user: users.get(o.userId) }),
    };
  };

  const prisma: any = {
    users,
    products,
    orders,
    orderItems,
    carts,
    user: {
      findUnique: async ({ where }: any) => users.get(where.id) ?? null,
    },
    product: {
      findUnique: async ({ where }: any) => products.get(where.id) ?? null,
      update: async ({ where, data }: any) => {
        const p = products.get(where.id);
        if (!p) throw new Error('Record to update not found');
        if (data.stock?.decrement !== undefined) p.stock -= data.stock.decrement;
        if (data.stock?.increment !== undefined) p.stock += data.stock.increment;
        return p;
      },
      updateMany: async ({ where, data }: any) => {
        const p = products.get(where.id);
        if (!p || p.stock < where.stock.gte) return { count: 0 };
        p.stock -= data.stock.decrement;
        return { count: 1 };
      },
    },
    cart: {
      findFirst: async ({ where }: any) =>
        carts
          .filter((c) => c.userId === where.userId && !c.checkedOut)
          .sort((a, b) => b.createdAt - a.createdAt)[0] ?? null,
    },
    order: {
      create: async ({ data, include }: any) => {
        if (typeof data.shippingAddress !== 'string') {
          throw new Error('Argument `shippingAddress` is missing.');
        }
        const now = new Date();
        const o = {
          id: randomUUID(),
          orderNumber: `c${randomUUID().replace(/-/g, '')}`,
          status: data.status,
          totalAmount: new Prisma.Decimal(data.totalAmount),
          userId: data.userId,
          cartId: data.cartId ?? null,
          shippingAddress: data.shippingAddress,
          createdAt: now,
          updatedAt: now,
        };
        orders.set(o.id, o);
        for (const item of data.orderItems.create) {
          orderItems.push({
            id: randomUUID(),
            orderId: o.id,
            productId: item.productId,
            quantity: item.quantity,
            price: new Prisma.Decimal(item.price),
            createdAt: now,
            updatedAt: now,
          });
        }
        return hydrate(o, include);
      },
      findFirst: async ({ where, include }: any) => {
        const o = [...orders.values()].find((x) => matches(x, where));
        return o ? hydrate(o, include) : null;
      },
      findUnique: async ({ where, include }: any) => {
        const o = orders.get(where.id);
        return o && matches(o, where) ? hydrate(o, include) : null;
      },
      findMany: async ({ where, skip, take, include }: any) => {
        if (skip < 0) throw new Error('Invalid value for argument `skip`');
        return [...orders.values()]
          .filter((o) => matches(o, where))
          .sort((a, b) => b.createdAt - a.createdAt)
          .slice(skip, skip + take)
          .map((o) => hydrate(o, include));
      },
      count: async ({ where }: any) =>
        [...orders.values()].filter((o) => matches(o, where)).length,
      update: async ({ where, data, include }: any) => {
        // 与 Prisma 一致：值为 undefined 的字段会被忽略
        for (const [key, value] of Object.entries(data)) {
          if (value !== undefined && !ORDER_FIELDS.has(key)) {
            throw new Error(`Unknown argument \`${key}\``);
          }
        }
        assertStatus(data.status);
        const o = orders.get(where.id);
        if (!o || !matches(o, where)) {
          throw new Error('Record to update not found');
        }
        for (const [key, value] of Object.entries(data)) {
          if (value !== undefined) o[key] = value;
        }
        o.updatedAt = new Date();
        return hydrate(o, include);
      },
    },
    $transaction: async (fn: any) => fn(prisma),
  };
  return prisma;
}

describe('Order API (e2e)', () => {
  let app: INestApplication;
  let prisma: ReturnType<typeof createPrismaMock>;
  let adminToken: string;
  let userToken: string;
  let otherUserToken: string;
  let productId: string;

  const http = () => request(app.getHttpServer());

  const addProduct = (overrides: Record<string, unknown> = {}) => {
    const p = {
      id: randomUUID(),
      name: 'iPhone 17 Pro',
      price: new Prisma.Decimal(100),
      stock: 10,
      isActive: true,
      ...overrides,
    };
    prisma.products.set(p.id, p);
    return p;
  };

  const validOrder = (overrides: Record<string, unknown> = {}) => ({
    items: [{ productId, quantity: 2 }],
    shippingAddress: '上海市浦东新区 xx 路 1 号',
    ...overrides,
  });

  const createOrder = async (
    token = userToken,
    overrides: Record<string, unknown> = {},
  ) => {
    const res = await http()
      .post('/api/v1/order')
      .set('Authorization', `Bearer ${token}`)
      .send(validOrder(overrides))
      .expect(201);
    return res.body.data;
  };

  beforeEach(async () => {
    process.env.JWT_SECRET = JWT_SECRET;
    prisma = createPrismaMock();

    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true }),
        PrismaModule,
        PassportModule,
        JwtModule.register({ secret: JWT_SECRET }),
        OrderModule,
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
    const mkUser = (email: string, role: string) => {
      const u = {
        id: randomUUID(),
        email,
        firstName: 'San',
        lastName: 'Zhang',
        role,
      };
      prisma.users.set(u.id, u);
      return jwt.sign({ sub: u.id, email });
    };
    adminToken = mkUser('admin@test.com', 'ADMIN');
    userToken = mkUser('user@test.com', 'USER');
    otherUserToken = mkUser('other@test.com', 'USER');

    productId = addProduct().id;
  });

  afterEach(async () => {
    await app.close();
  });

  describe('POST /order', () => {
    it('创建订单成功，扣减库存并返回订单详情', async () => {
      const order = await createOrder();

      expect(order).toMatchObject({
        status: 'PENDING',
        total: 200,
        shippingAddress: '上海市浦东新区 xx 路 1 号',
        userEmail: 'user@test.com',
        userName: 'San Zhang',
      });
      expect(order.items).toEqual([
        expect.objectContaining({
          productId,
          productName: 'iPhone 17 Pro',
          quantity: 2,
          price: 100,
          subtotal: 200,
        }),
      ]);
      expect(prisma.products.get(productId).stock).toBe(8);
    });

    it('关联当前用户最新的未结算购物车', async () => {
      const userId = [...prisma.users.values()].find(
        (u: any) => u.email === 'user@test.com',
      ).id;
      prisma.carts.push(
        { id: 'old', userId, checkedOut: false, createdAt: new Date(1) },
        { id: 'new', userId, checkedOut: false, createdAt: new Date(2) },
        { id: 'done', userId, checkedOut: true, createdAt: new Date(3) },
      );
      const order = await createOrder();
      expect(prisma.orders.get(order.id).cartId).toBe('new');
    });

    it('未登录返回 401', () =>
      http().post('/api/v1/order').send(validOrder()).expect(401));

    it('商品不存在返回 404', () =>
      http()
        .post('/api/v1/order')
        .set('Authorization', `Bearer ${userToken}`)
        .send(validOrder({ items: [{ productId: randomUUID(), quantity: 1 }] }))
        .expect(404));

    it('库存不足返回 400 且不扣库存', async () => {
      await http()
        .post('/api/v1/order')
        .set('Authorization', `Bearer ${userToken}`)
        .send(validOrder({ items: [{ productId, quantity: 11 }] }))
        .expect(400);
      expect(prisma.products.get(productId).stock).toBe(10);
    });

    it.each([
      ['items 不是数组', { items: 'x' }],
      ['缺少 productId', { items: [{ quantity: 1 }] }],
      ['多余字段', { foo: 'bar' }],
    ])('参数非法（%s）返回 400', async (_, overrides) => {
      await http()
        .post('/api/v1/order')
        .set('Authorization', `Bearer ${userToken}`)
        .send(validOrder(overrides))
        .expect(400);
    });

    // ---- 以下用例描述期望行为，用来暴露潜在缺陷 ----

    it('[安全] 订单金额以数据库商品价格为准', async () => {
      prisma.products.get(productId).price = new Prisma.Decimal(19.9);
      const order = await createOrder(userToken, {
        items: [{ productId, quantity: 3 }],
      });
      expect(order.total).toBe(59.7);
      expect(order.items[0]).toMatchObject({ price: 19.9, subtotal: 59.7 });
    });

    it('[安全] 客户端传 price 字段返回 400', () =>
      http()
        .post('/api/v1/order')
        .set('Authorization', `Bearer ${userToken}`)
        .send(validOrder({ items: [{ productId, quantity: 2, price: 0.01 }] }))
        .expect(400));

    it.each([
      ['数量为负数', -5],
      ['数量为 0', 0],
      ['数量为小数', 1.5],
    ])('[校验] %s 应返回 400', async (_, quantity) => {
      await http()
        .post('/api/v1/order')
        .set('Authorization', `Bearer ${userToken}`)
        .send(validOrder({ items: [{ productId, quantity }] }))
        .expect(400);
      expect(prisma.products.get(productId).stock).toBe(10);
    });

    it('[校验] items 为空数组应返回 400', () =>
      http()
        .post('/api/v1/order')
        .set('Authorization', `Bearer ${userToken}`)
        .send(validOrder({ items: [] }))
        .expect(400));

    it('[校验] 缺少 shippingAddress 应返回 400（schema 中为必填）', () =>
      http()
        .post('/api/v1/order')
        .set('Authorization', `Bearer ${userToken}`)
        .send(validOrder({ shippingAddress: undefined }))
        .expect(400));

    it('同一商品拆成多行时合并为一个订单项', async () => {
      const order = await createOrder(userToken, {
        items: [
          { productId, quantity: 6 },
          { productId, quantity: 3 },
        ],
      });
      expect(order.items).toEqual([
        expect.objectContaining({ productId, quantity: 9, subtotal: 900 }),
      ]);
      expect(order.total).toBe(900);
      expect(prisma.products.get(productId).stock).toBe(1);
    });

    it('[并发] 校验后库存被其他订单抢走时返回 400', async () => {
      const stale = { ...prisma.products.get(productId) };
      prisma.products.get(productId).stock = 1;
      prisma.product.findUnique = async () => stale;
      await http()
        .post('/api/v1/order')
        .set('Authorization', `Bearer ${userToken}`)
        .send(validOrder({ items: [{ productId, quantity: 2 }] }))
        .expect(400);
      expect(prisma.products.get(productId).stock).toBe(1);
    });

    it('[库存] 同一商品拆成多行时应按总数校验库存', async () => {
      await http()
        .post('/api/v1/order')
        .set('Authorization', `Bearer ${userToken}`)
        .send(
          validOrder({
            items: [
              { productId, quantity: 6 },
              { productId, quantity: 6 },
            ],
          }),
        )
        .expect(400);
      expect(prisma.products.get(productId).stock).toBe(10);
    });

    it('[业务] 已下架商品不能下单', async () => {
      const inactive = addProduct({ isActive: false });
      await http()
        .post('/api/v1/order')
        .set('Authorization', `Bearer ${userToken}`)
        .send(validOrder({ items: [{ productId: inactive.id, quantity: 1 }] }))
        .expect(400);
    });

    it('创建成功提示「订单创建成功」', async () => {
      const res = await http()
        .post('/api/v1/order')
        .set('Authorization', `Bearer ${userToken}`)
        .send(validOrder())
        .expect(201);
      expect(res.body.message).toBe('订单创建成功');
    });
  });

  describe('GET /order', () => {
    it('只返回当前用户的订单，带分页信息', async () => {
      await createOrder();
      await createOrder();
      await createOrder(otherUserToken);

      const res = await http()
        .get('/api/v1/order?page=1&limit=1')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(res.body).toMatchObject({ total: 2, page: 1, limit: 1 });
      expect(res.body.data).toHaveLength(1);
    });

    it('不传分页参数时使用默认值', async () => {
      const res = await http()
        .get('/api/v1/order')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);
      expect(res.body).toMatchObject({ page: 1, limit: 10, total: 0 });
    });

    it('未登录返回 401', () => http().get('/api/v1/order').expect(401));

    it('按 status=PENDING 筛选只返回待处理订单', async () => {
      await createOrder();
      const cancelled = await createOrder();
      prisma.orders.get(cancelled.id).status = 'CANCELLED';
      const res = await http()
        .get('/api/v1/order?status=PENDING')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);
      expect(res.body.total).toBe(1);
    });

    it('[校验] status 非法值应返回 400', () =>
      http()
        .get('/api/v1/order?status=FOO')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(400));

    it.each(['page=0', 'page=1.5', 'limit=0', 'limit=101'])(
      '[校验] %s 应返回 400',
      async (qs) => {
        await http()
          .get(`/api/v1/order?${qs}`)
          .set('Authorization', `Bearer ${userToken}`)
          .expect(400);
      },
    );
  });

  describe('GET /order/admin/all', () => {
    it('管理员可以查看所有用户订单', async () => {
      await createOrder();
      await createOrder(otherUserToken);
      const res = await http()
        .get('/api/v1/order/admin/all')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(res.body.total).toBe(2);
    });

    it('按订单号搜索', async () => {
      const order = await createOrder();
      await createOrder(otherUserToken);
      const { orderNumber } = prisma.orders.get(order.id);
      const res = await http()
        .get(`/api/v1/order/admin/all?search=${orderNumber.slice(0, 10).toUpperCase()}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(res.body.data.map((o: any) => o.id)).toEqual([order.id]);
    });

    it('普通用户返回 403', () =>
      http()
        .get('/api/v1/order/admin/all')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403));
  });

  describe('GET /order/:id', () => {
    it('用户可以查看自己的订单', async () => {
      const order = await createOrder();
      const res = await http()
        .get(`/api/v1/order/${order.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);
      expect(res.body.data.id).toBe(order.id);
    });

    it('查看别人的订单返回 404', async () => {
      const order = await createOrder(otherUserToken);
      await http()
        .get(`/api/v1/order/${order.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(404);
    });

    it('管理员可以通过 admin/:id 查看任意订单', async () => {
      const order = await createOrder();
      await http()
        .get(`/api/v1/order/admin/${order.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });

    it('普通用户访问 admin/:id 返回 403', async () => {
      const order = await createOrder();
      await http()
        .get(`/api/v1/order/admin/${order.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });

    it('查询接口提示「获取订单成功」', async () => {
      const order = await createOrder();
      const res = await http()
        .get(`/api/v1/order/${order.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);
      expect(res.body.message).toBe('获取订单成功');
    });
  });

  describe('PATCH /order/:id', () => {
    it('管理员可以修改订单状态', async () => {
      const order = await createOrder();
      const res = await http()
        .patch(`/api/v1/order/admin/${order.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'SHIPPED' })
        .expect(200);
      expect(res.body.data.status).toBe('SHIPPED');
      expect(res.body.message).toBe('订单更新成功');
    });

    it('状态非法返回 400', async () => {
      const order = await createOrder();
      await http()
        .patch(`/api/v1/order/admin/${order.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'FOO' })
        .expect(400);
    });

    it('修改别人的订单返回 404', async () => {
      const order = await createOrder(otherUserToken);
      await http()
        .patch(`/api/v1/order/${order.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({})
        .expect(404);
    });

    it('用户可以修改待处理订单的收货地址', async () => {
      const order = await createOrder();
      const res = await http()
        .patch(`/api/v1/order/${order.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ shippingAddress: '北京市朝阳区 yy 路 2 号' })
        .expect(200);
      expect(res.body.data.shippingAddress).toBe('北京市朝阳区 yy 路 2 号');
      expect(res.body.data.status).toBe('PENDING');
    });

    it.each(['PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'])(
      '订单状态为 %s 时修改收货地址返回 400',
      async (status) => {
        const order = await createOrder();
        prisma.orders.get(order.id).status = status;
        await http()
          .patch(`/api/v1/order/${order.id}`)
          .set('Authorization', `Bearer ${userToken}`)
          .send({ shippingAddress: '新地址' })
          .expect(400);
        expect(prisma.orders.get(order.id).shippingAddress).toBe(
          '上海市浦东新区 xx 路 1 号',
        );
      },
    );

    it('收货地址为空字符串返回 400', async () => {
      const order = await createOrder();
      await http()
        .patch(`/api/v1/order/${order.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ shippingAddress: '' })
        .expect(400);
    });

    it('修改别人订单的收货地址返回 404', async () => {
      const order = await createOrder(otherUserToken);
      await http()
        .patch(`/api/v1/order/${order.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ shippingAddress: '新地址' })
        .expect(404);
    });

    it('同时修改地址和状态返回 403', async () => {
      const order = await createOrder();
      await http()
        .patch(`/api/v1/order/${order.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ shippingAddress: '新地址', status: 'PROCESSING' })
        .expect(403);
      expect(prisma.orders.get(order.id).shippingAddress).toBe(
        '上海市浦东新区 xx 路 1 号',
      );
    });

    it('普通用户修改订单状态返回 403', async () => {
      const order = await createOrder();
      await http()
        .patch(`/api/v1/order/${order.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ status: 'PROCESSING' })
        .expect(403);
    });

    it('传 Order 表中不存在的 trackingNumber 返回 400 而不是 500', async () => {
      const order = await createOrder();
      await http()
        .patch(`/api/v1/order/admin/${order.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ trackingNumber: 'SF123' })
        .expect(400);
    });

    it('[安全] 普通用户不应能把自己的订单改成 DELIVERED', async () => {
      const order = await createOrder();
      await http()
        .patch(`/api/v1/order/${order.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ status: 'DELIVERED' })
        .expect((res) => expect(res.status).toBeGreaterThanOrEqual(400));
    });

    it('管理员通过 PATCH 改为 CANCELLED 时回滚库存', async () => {
      const order = await createOrder();
      const res = await http()
        .patch(`/api/v1/order/admin/${order.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'CANCELLED' })
        .expect(200);
      expect(res.body.data.status).toBe('CANCELLED');
      expect(prisma.products.get(productId).stock).toBe(10);
    });

    it('[安全] 普通用户不应能通过 PATCH 绕过库存回滚把订单改成 CANCELLED', async () => {
      const order = await createOrder();
      await http()
        .patch(`/api/v1/order/${order.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ status: 'CANCELLED' });
      const stored = prisma.orders.get(order.id);
      // 要么不允许改，要么改了也要把库存加回来
      if (stored.status === 'CANCELLED') {
        expect(prisma.products.get(productId).stock).toBe(10);
      }
    });
  });

  describe('DELETE /order/:id（取消订单）', () => {
    it('用户取消自己的待处理订单，库存回滚', async () => {
      const order = await createOrder();
      expect(prisma.products.get(productId).stock).toBe(8);

      const res = await http()
        .delete(`/api/v1/order/${order.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(res.body.data.status).toBe('CANCELLED');
      expect(res.body.message).toBe('订单取消成功');
      expect(prisma.products.get(productId).stock).toBe(10);
    });

    it('重复取消返回 400，库存不会再次增加', async () => {
      const order = await createOrder();
      const cancel = () =>
        http()
          .delete(`/api/v1/order/${order.id}`)
          .set('Authorization', `Bearer ${userToken}`);
      await cancel().expect(200);
      await cancel().expect(400);
      expect(prisma.products.get(productId).stock).toBe(10);
    });

    it('取消别人的订单返回 404', async () => {
      const order = await createOrder(otherUserToken);
      await http()
        .delete(`/api/v1/order/${order.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(404);
    });

    it('管理员可以取消任意订单', async () => {
      const order = await createOrder();
      await http()
        .delete(`/api/v1/order/admin/${order.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(prisma.products.get(productId).stock).toBe(10);
    });

    it('订单不存在返回 404', () =>
      http()
        .delete(`/api/v1/order/${randomUUID()}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(404));
  });
});
