import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service.js';
import { CartService } from './cart.service.js';

type MockModel = Record<string, ReturnType<typeof vi.fn>>;

const userId = 'u1';
const activeCartWhere = { userId, checkedOut: false };
// 只能操作自己未结账购物车里的商品
const ownedItemWhere = (id: string) => ({
  id,
  cart: { userId, checkedOut: false },
});

const product = { id: 'p1', stock: 10, isActive: true };
const cart = {
  id: 'c1',
  userId,
  checkedOut: false,
  cartItems: [],
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('CartService', () => {
  let service: CartService;
  let prisma: {
    product: MockModel;
    cart: MockModel;
    cartItem: MockModel;
    $transaction: ReturnType<typeof vi.fn>;
  };
  // 事务内的客户端单独 mock，用来断言写操作确实走了 tx 而不是 this.prisma
  let tx: { cart: MockModel; cartItem: MockModel };

  beforeEach(async () => {
    tx = {
      cart: { findUniqueOrThrow: vi.fn(), findFirstOrThrow: vi.fn() },
      cartItem: {
        upsert: vi.fn(),
        updateMany: vi.fn(),
        findUniqueOrThrow: vi.fn(),
      },
    };
    prisma = {
      product: { findUnique: vi.fn() },
      cart: {
        findFirst: vi.fn(),
        findFirstOrThrow: vi.fn(),
        create: vi.fn(),
      },
      cartItem: { deleteMany: vi.fn(), updateMany: vi.fn() },
      $transaction: vi.fn((fn: (client: typeof tx) => unknown) => fn(tx)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [CartService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<CartService>(CartService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('取当前用户最新的未结账购物车', async () => {
      prisma.cart.findFirst.mockResolvedValue(cart);

      const result = await service.findAll(userId);

      expect(prisma.cart.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: activeCartWhere,
          orderBy: { createdAt: 'desc' },
        }),
      );
      expect(result.data).toBe(cart);
    });

    it('没有购物车时 data 为 null', async () => {
      prisma.cart.findFirst.mockResolvedValue(null);

      const result = await service.findAll(userId);

      expect(result).toMatchObject({ success: true, data: null });
    });
  });

  describe('addItem', () => {
    const dto = { productId: 'p1', quantity: 2 };

    it('商品不存在时抛出 NotFoundException', async () => {
      prisma.product.findUnique.mockResolvedValue(null);

      await expect(service.addItem(userId, dto)).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('商品已下架时抛出 BadRequestException', async () => {
      prisma.product.findUnique.mockResolvedValue({
        ...product,
        isActive: false,
      });

      await expect(service.addItem(userId, dto)).rejects.toThrow(
        BadRequestException,
      );
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('没有活跃购物车时为当前用户新建一个', async () => {
      prisma.product.findUnique.mockResolvedValue(product);
      prisma.cart.findFirst.mockResolvedValue(null);
      prisma.cart.create.mockResolvedValue({ id: 'c1' });
      tx.cartItem.upsert.mockResolvedValue({ quantity: 2 });
      tx.cart.findUniqueOrThrow.mockResolvedValue(cart);

      await service.addItem(userId, dto);

      expect(prisma.cart.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: { userId } }),
      );
    });

    it('并发创建撞上唯一索引时复用已存在的活跃购物车', async () => {
      prisma.product.findUnique.mockResolvedValue(product);
      prisma.cart.findFirst.mockResolvedValue(null);
      prisma.cart.create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
          code: 'P2002',
          clientVersion: 'test',
        }),
      );
      prisma.cart.findFirstOrThrow.mockResolvedValue({ id: 'c2' });
      tx.cartItem.upsert.mockResolvedValue({ quantity: 2 });
      tx.cart.findUniqueOrThrow.mockResolvedValue(cart);

      await service.addItem(userId, dto);

      expect(prisma.cart.findFirstOrThrow).toHaveBeenCalledWith(
        expect.objectContaining({ where: activeCartWhere }),
      );
      expect(tx.cartItem.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { cartId_productId: { cartId: 'c2', productId: 'p1' } },
        }),
      );
    });

    it('创建购物车遇到其他错误时原样抛出', async () => {
      prisma.product.findUnique.mockResolvedValue(product);
      prisma.cart.findFirst.mockResolvedValue(null);
      prisma.cart.create.mockRejectedValue(new Error('connection lost'));

      await expect(service.addItem(userId, dto)).rejects.toThrow(
        'connection lost',
      );
      expect(prisma.cart.findFirstOrThrow).not.toHaveBeenCalled();
    });

    it('已在购物车中的商品累加数量，并返回该购物车', async () => {
      prisma.product.findUnique.mockResolvedValue(product);
      prisma.cart.findFirst.mockResolvedValue({ id: 'c1' });
      tx.cartItem.upsert.mockResolvedValue({ quantity: 5 });
      tx.cart.findUniqueOrThrow.mockResolvedValue(cart);

      const result = await service.addItem(userId, dto);

      expect(prisma.cart.create).not.toHaveBeenCalled();
      expect(tx.cartItem.upsert).toHaveBeenCalledWith({
        where: { cartId_productId: { cartId: 'c1', productId: 'p1' } },
        create: { cartId: 'c1', productId: 'p1', quantity: 2 },
        update: { quantity: { increment: 2 } },
      });
      expect(tx.cart.findUniqueOrThrow).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'c1' } }),
      );
      expect(result.data).toBe(cart);
    });

    it('累加后超过库存时在事务内抛出 BadRequestException', async () => {
      prisma.product.findUnique.mockResolvedValue(product);
      prisma.cart.findFirst.mockResolvedValue({ id: 'c1' });
      tx.cartItem.upsert.mockResolvedValue({ quantity: 11 });

      await expect(service.addItem(userId, dto)).rejects.toThrow(
        BadRequestException,
      );
      expect(tx.cart.findUniqueOrThrow).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    const dto = { quantity: 3 };

    it('只更新自己未结账购物车里的商品，且在事务内执行', async () => {
      tx.cartItem.updateMany.mockResolvedValue({ count: 1 });
      tx.cartItem.findUniqueOrThrow.mockResolvedValue({
        cartId: 'c1',
        quantity: 3,
        product,
      });
      tx.cart.findFirstOrThrow.mockResolvedValue(cart);
      tx.cart.findUniqueOrThrow.mockResolvedValue(cart);

      const result = await service.update(userId, 'ci1', dto);

      expect(tx.cartItem.updateMany).toHaveBeenCalledWith({
        where: ownedItemWhere('ci1'),
        data: { quantity: 3 },
      });
      expect(prisma.cartItem.updateMany).not.toHaveBeenCalled();
      expect(result.data).toBe(cart);
    });

    it('商品不存在或不属于当前用户时抛出 NotFoundException', async () => {
      tx.cartItem.updateMany.mockResolvedValue({ count: 0 });

      await expect(service.update(userId, 'ci1', dto)).rejects.toThrow(
        NotFoundException,
      );
      expect(tx.cartItem.findUniqueOrThrow).not.toHaveBeenCalled();
    });

    it('数量超过库存时在事务内抛出 BadRequestException', async () => {
      tx.cartItem.updateMany.mockResolvedValue({ count: 1 });
      tx.cartItem.findUniqueOrThrow.mockResolvedValue({
        cartId: 'c1',
        quantity: 11,
        product,
      });

      await expect(service.update(userId, 'ci1', dto)).rejects.toThrow(
        BadRequestException,
      );
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    });
  });

  describe('remove', () => {
    it('只删除自己未结账购物车里的商品，并返回最新购物车', async () => {
      prisma.cartItem.deleteMany.mockResolvedValue({ count: 1 });
      prisma.cart.findFirstOrThrow.mockResolvedValue(cart);

      const result = await service.remove(userId, 'ci1');

      expect(prisma.cartItem.deleteMany).toHaveBeenCalledWith({
        where: ownedItemWhere('ci1'),
      });
      expect(result.data).toBe(cart);
    });

    it('商品不存在或不属于当前用户时抛出 NotFoundException', async () => {
      prisma.cartItem.deleteMany.mockResolvedValue({ count: 0 });

      await expect(service.remove(userId, 'ci1')).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.cart.findFirstOrThrow).not.toHaveBeenCalled();
    });
  });
});
