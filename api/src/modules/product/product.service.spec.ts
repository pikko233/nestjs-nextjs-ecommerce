import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service.js';
import { ProductService } from './product.service.js';

const product = {
  id: 'p1',
  name: 'iPhone 17 Pro',
  description: null,
  price: new Prisma.Decimal(7999.99),
  stock: 10,
  sku: 'SKU-1',
  imageUrl: null,
  isActive: true,
  categoryId: 'c1',
  category: { id: 'c1', name: '电子产品' },
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('ProductService', () => {
  let service: ProductService;
  let prisma: {
    product: Record<string, ReturnType<typeof vi.fn>>;
    category: Record<string, ReturnType<typeof vi.fn>>;
  };

  beforeEach(async () => {
    prisma = {
      product: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      category: {
        findUnique: vi.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [ProductService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<ProductService>(ProductService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const dto = {
      name: 'iPhone 17 Pro',
      price: 7999.99,
      stock: 10,
      sku: 'SKU-1',
      categoryId: 'c1',
      isActive: true,
    };

    it('SKU 已存在时抛出 ConflictException', async () => {
      prisma.product.findUnique.mockResolvedValue(product);
      await expect(service.create(dto)).rejects.toThrow(ConflictException);
    });

    it('分类不存在时抛出 NotFoundException', async () => {
      prisma.product.findUnique.mockResolvedValue(null);
      prisma.category.findUnique.mockResolvedValue(null);
      await expect(service.create(dto)).rejects.toThrow(NotFoundException);
    });

    it('返回的价格为 number，分类为名称', async () => {
      prisma.product.findUnique.mockResolvedValue(null);
      prisma.category.findUnique.mockResolvedValue(product.category);
      prisma.product.create.mockResolvedValue(product);

      const result = await service.create(dto);

      expect(result.price).toBe(7999.99);
      expect(result.category).toBe('电子产品');
    });
  });

  describe('findAll', () => {
    it('按页码计算 skip/take 和 totalPages', async () => {
      prisma.product.count.mockResolvedValue(25);
      prisma.product.findMany.mockResolvedValue([product]);

      const result = await service.findAll({ page: 3, limit: 10 });

      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 20, take: 10 }),
      );
      expect(result.meta).toEqual({
        total: 25,
        page: 3,
        limit: 10,
        totalPages: 3,
      });
    });
  });

  describe('update', () => {
    it('未传 price 时不更新价格', async () => {
      prisma.product.findUnique.mockResolvedValue(product);
      prisma.product.update.mockResolvedValue(product);

      await service.update('p1', { name: '新名字' });

      expect(prisma.product.update.mock.calls[0][0].data).toEqual({
        name: '新名字',
      });
    });

    it('SKU 被其他商品占用时抛出 ConflictException', async () => {
      prisma.product.findUnique
        .mockResolvedValueOnce(product)
        .mockResolvedValueOnce({ ...product, id: 'p2', sku: 'SKU-2' });

      await expect(service.update('p1', { sku: 'SKU-2' })).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('updateStock', () => {
    it('库存为负数时抛出 BadRequestException', async () => {
      await expect(service.updateStock('p1', -1)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('remove', () => {
    it('商品已有订单时抛出 BadRequestException', async () => {
      prisma.product.findUnique.mockResolvedValue({
        ...product,
        orderItems: [{ id: 'o1' }],
        cartItems: [],
      });

      await expect(service.remove('p1')).rejects.toThrow(BadRequestException);
      expect(prisma.product.delete).not.toHaveBeenCalled();
    });
  });
});
