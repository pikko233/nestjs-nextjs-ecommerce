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
import { ProductModule } from '@/modules/product/product.module.js';
import { PrismaModule } from '@/prisma/prisma.module.js';

const JWT_SECRET = 'test-secret';

// 内存版 Prisma，只实现 product 模块用到的方法，避免连接真实数据库
function createPrismaMock() {
  const users = new Map<string, { id: string; email: string; role: string }>();
  const categories = new Map<string, { id: string; name: string }>();
  const products = new Map<string, any>();
  const orderItems: { productId: string }[] = [];

  const withCategory = (p: any) => ({
    ...p,
    category: categories.get(p.categoryId),
  });

  const matches = (p: any, where: any = {}) => {
    if (where.categoryId && p.categoryId !== where.categoryId) return false;
    if (where.isActive !== undefined && p.isActive !== where.isActive)
      return false;
    if (where.OR) {
      return where.OR.some((cond: any) => {
        const [field, { contains }] = Object.entries(cond)[0] as any;
        return (p[field] ?? '').toLowerCase().includes(contains.toLowerCase());
      });
    }
    return true;
  };

  const findUnique = ({ where, include }: any) => {
    const p = where.id
      ? products.get(where.id)
      : [...products.values()].find((x) => x.sku === where.sku);
    if (!p) return null;
    if (include?.orderItems) {
      return {
        ...p,
        orderItems: orderItems.filter((o) => o.productId === p.id),
        cartItems: [],
      };
    }
    return include?.category ? withCategory(p) : p;
  };

  return {
    users,
    categories,
    products,
    orderItems,
    user: {
      findUnique: async ({ where }: any) => users.get(where.id) ?? null,
    },
    category: {
      findUnique: async ({ where }: any) => categories.get(where.id) ?? null,
    },
    product: {
      findUnique: async (args: any) => findUnique(args),
      count: async ({ where }: any) =>
        [...products.values()].filter((p) => matches(p, where)).length,
      findMany: async ({ where, skip, take }: any) =>
        [...products.values()]
          .filter((p) => matches(p, where))
          .sort((a, b) => b.createdAt - a.createdAt)
          .slice(skip, skip + take)
          .map(withCategory),
      create: async ({ data }: any) => {
        const now = new Date();
        const p = {
          id: randomUUID(),
          description: null,
          imageUrl: null,
          ...data,
          price: new Prisma.Decimal(data.price),
          createdAt: now,
          updatedAt: now,
        };
        products.set(p.id, p);
        return withCategory(p);
      },
      update: async ({ where, data }: any) => {
        const p = {
          ...products.get(where.id),
          ...data,
          updatedAt: new Date(),
        };
        if (data.price !== undefined) p.price = new Prisma.Decimal(data.price);
        products.set(p.id, p);
        return withCategory(p);
      },
      delete: async ({ where }: any) => {
        const p = products.get(where.id);
        products.delete(where.id);
        return p;
      },
    },
  };
}

describe('Product API (e2e)', () => {
  let app: INestApplication;
  let prisma: ReturnType<typeof createPrismaMock>;
  let adminToken: string;
  let customerToken: string;
  let categoryId: string;

  const validProduct = () => ({
    name: 'iPhone 17 Pro',
    description: '6.3 英寸屏幕，256GB 存储',
    price: 7999.99,
    stock: 100,
    sku: `SKU-${randomUUID()}`,
    categoryId,
    isActive: true,
  });

  const createProduct = async (overrides: Record<string, unknown> = {}) => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/product')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ ...validProduct(), ...overrides })
      .expect(201);
    return res.body;
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
        ProductModule,
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
    const admin = { id: randomUUID(), email: 'admin@test.com', role: 'ADMIN' };
    const customer = {
      id: randomUUID(),
      email: 'customer@test.com',
      role: 'CUSTOMER',
    };
    prisma.users.set(admin.id, admin);
    prisma.users.set(customer.id, customer);
    adminToken = jwt.sign({ sub: admin.id, email: admin.email });
    customerToken = jwt.sign({ sub: customer.id, email: customer.email });

    categoryId = randomUUID();
    prisma.categories.set(categoryId, { id: categoryId, name: '电子产品' });
  });

  afterEach(async () => {
    await app.close();
  });

  describe('POST /product', () => {
    it('管理员可以创建商品', async () => {
      const body = await createProduct();
      expect(body).toMatchObject({
        name: 'iPhone 17 Pro',
        price: 7999.99,
        stock: 100,
        category: '电子产品',
        categoryId,
      });
      expect(body.id).toBeDefined();
    });

    it('未登录返回 401', () =>
      request(app.getHttpServer())
        .post('/api/v1/product')
        .send(validProduct())
        .expect(401));

    it('非管理员返回 403', () =>
      request(app.getHttpServer())
        .post('/api/v1/product')
        .set('Authorization', `Bearer ${customerToken}`)
        .send(validProduct())
        .expect(403));

    it('SKU 重复返回 409', async () => {
      const { sku } = await createProduct();
      await request(app.getHttpServer())
        .post('/api/v1/product')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ ...validProduct(), sku })
        .expect(409);
    });

    it('分类不存在返回 404', () =>
      request(app.getHttpServer())
        .post('/api/v1/product')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ ...validProduct(), categoryId: randomUUID() })
        .expect(404));

    it.each([
      ['价格为负', { price: -1 }],
      ['价格超过两位小数', { price: 1.234 }],
      ['库存为小数', { stock: 1.5 }],
      ['categoryId 不是 UUID', { categoryId: 'abc' }],
      ['缺少 name', { name: undefined }],
      ['多余字段', { foo: 'bar' }],
    ])('参数非法（%s）返回 400', async (_, overrides) => {
      await request(app.getHttpServer())
        .post('/api/v1/product')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ ...validProduct(), ...overrides })
        .expect(400);
    });
  });

  describe('GET /product', () => {
    it('返回分页数据和 meta', async () => {
      for (let i = 0; i < 3; i++) await createProduct({ name: `商品${i}` });

      const res = await request(app.getHttpServer())
        .get('/api/v1/product?page=1&limit=2')
        .expect(200);

      expect(res.body.data).toHaveLength(2);
      expect(res.body.meta).toEqual({
        total: 3,
        page: 1,
        limit: 2,
        totalPages: 2,
      });
    });

    it('不传分页参数时使用默认值', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/product')
        .expect(200);
      expect(res.body.meta).toMatchObject({ page: 1, limit: 10 });
    });

    it('按名称搜索（不区分大小写）', async () => {
      await createProduct({ name: 'iPhone 17' });
      await createProduct({ name: 'MacBook Air' });

      const res = await request(app.getHttpServer())
        .get('/api/v1/product?search=IPHONE')
        .expect(200);

      expect(res.body.data.map((p: any) => p.name)).toEqual(['iPhone 17']);
    });

    it('isActive=false 只返回下架商品', async () => {
      await createProduct({ name: '上架', isActive: true });
      await createProduct({ name: '下架', isActive: false });

      const res = await request(app.getHttpServer())
        .get('/api/v1/product?isActive=false')
        .expect(200);

      expect(res.body.data.map((p: any) => p.name)).toEqual(['下架']);
    });

    it('isActive=true 只返回上架商品', async () => {
      await createProduct({ name: '上架', isActive: true });
      await createProduct({ name: '下架', isActive: false });

      const res = await request(app.getHttpServer())
        .get('/api/v1/product?isActive=true')
        .expect(200);

      expect(res.body.data.map((p: any) => p.name)).toEqual(['上架']);
    });

    it('按分类 ID 筛选', async () => {
      const otherCategoryId = randomUUID();
      prisma.categories.set(otherCategoryId, {
        id: otherCategoryId,
        name: '图书',
      });
      await createProduct({ name: '手机' });
      await createProduct({ name: '小说', categoryId: otherCategoryId });

      const res = await request(app.getHttpServer())
        .get(`/api/v1/product?category=${otherCategoryId}`)
        .expect(200);

      expect(res.body.data.map((p: any) => p.name)).toEqual(['小说']);
    });

    it('category 不是 UUID 返回 400', () =>
      request(app.getHttpServer())
        .get('/api/v1/product?category=electronics')
        .expect(400));

    it('isActive 不是布尔值返回 400', () =>
      request(app.getHttpServer())
        .get('/api/v1/product?isActive=abc')
        .expect(400));

    it('page=0 返回 400', () =>
      request(app.getHttpServer()).get('/api/v1/product?page=0').expect(400));
  });

  describe('GET /product/:id', () => {
    it('返回商品详情', async () => {
      const created = await createProduct();
      const res = await request(app.getHttpServer())
        .get(`/api/v1/product/${created.id}`)
        .expect(200);
      expect(res.body).toMatchObject({ id: created.id, category: '电子产品' });
    });

    it('商品不存在返回 404', () =>
      request(app.getHttpServer())
        .get(`/api/v1/product/${randomUUID()}`)
        .expect(404));
  });

  describe('PATCH /product/:id', () => {
    it('只修改名称时，价格保持不变', async () => {
      const created = await createProduct({ price: 100 });

      const res = await request(app.getHttpServer())
        .patch(`/api/v1/product/${created.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: '新名字' })
        .expect(200);

      expect(res.body).toMatchObject({ name: '新名字', price: 100 });
    });

    it('修改 SKU 与其他商品冲突返回 409', async () => {
      const a = await createProduct();
      const b = await createProduct();
      await request(app.getHttpServer())
        .patch(`/api/v1/product/${b.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ sku: a.sku })
        .expect(409);
    });

    it('商品不存在返回 404', () =>
      request(app.getHttpServer())
        .patch(`/api/v1/product/${randomUUID()}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'x' })
        .expect(404));

    it('非管理员返回 403', async () => {
      const created = await createProduct();
      await request(app.getHttpServer())
        .patch(`/api/v1/product/${created.id}`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ name: 'x' })
        .expect(403);
    });
  });

  describe('PATCH /product/:id/stock', () => {
    it('按文档传 { quantity } 可以修改库存', async () => {
      const created = await createProduct({ stock: 5 });

      const res = await request(app.getHttpServer())
        .patch(`/api/v1/product/${created.id}/stock`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ quantity: 20 })
        .expect(200);

      expect(res.body.stock).toBe(20);
    });

    it('库存为负数返回 400', async () => {
      const created = await createProduct();
      await request(app.getHttpServer())
        .patch(`/api/v1/product/${created.id}/stock`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ quantity: -1 })
        .expect(400);
    });

    it('库存为小数返回 400', async () => {
      const created = await createProduct();
      await request(app.getHttpServer())
        .patch(`/api/v1/product/${created.id}/stock`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ quantity: 1.5 })
        .expect(400);
    });

    it('商品不存在返回 404', () =>
      request(app.getHttpServer())
        .patch(`/api/v1/product/${randomUUID()}/stock`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ quantity: 1 })
        .expect(404));
  });

  describe('DELETE /product/:id', () => {
    it('管理员可以删除商品', async () => {
      const created = await createProduct();
      await request(app.getHttpServer())
        .delete(`/api/v1/product/${created.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200, { message: '商品删除成功' });

      await request(app.getHttpServer())
        .get(`/api/v1/product/${created.id}`)
        .expect(404);
    });

    it('已有订单的商品不能删除，返回 400', async () => {
      const created = await createProduct();
      prisma.orderItems.push({ productId: created.id });
      await request(app.getHttpServer())
        .delete(`/api/v1/product/${created.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);
    });

    it('商品不存在返回 404', () =>
      request(app.getHttpServer())
        .delete(`/api/v1/product/${randomUUID()}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404));

    it('未登录返回 401', async () => {
      const created = await createProduct();
      await request(app.getHttpServer())
        .delete(`/api/v1/product/${created.id}`)
        .expect(401);
    });
  });
});
