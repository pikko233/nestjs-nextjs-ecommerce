import { PrismaService } from '@/prisma/prisma.service.js';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Category, Prisma, Product } from '@prisma/client';
import { CreateProductDto } from './dto/create-product.dto.js';
import { ProductResponseDto } from './dto/product-response.dto.js';
import { QueryProductDto } from './dto/query-product.dto.js';
import { UpdateProductDto } from './dto/update-product.dto.js';

@Injectable()
export class ProductService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    createProductDto: CreateProductDto,
  ): Promise<ProductResponseDto> {
    const { sku, categoryId } = createProductDto;

    const existingProduct = await this.prisma.product.findUnique({
      where: { sku },
    });

    if (existingProduct) {
      throw new ConflictException(`该 SKU 已存在: ${sku}`);
    }

    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
    });

    if (!category) {
      throw new NotFoundException('分类不存在');
    }

    const product = await this.prisma.product.create({
      data: createProductDto,
      include: {
        category: true,
      },
    });

    return this.formatProduct(product);
  }

  async findAll(queryDto: QueryProductDto): Promise<{
    data: ProductResponseDto[];
    meta: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  }> {
    const { category, isActive, search, page, limit } = queryDto;

    const where: Prisma.ProductWhereInput = {};

    if (category) {
      where.categoryId = category;
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const total = await this.prisma.product.count({ where });

    const products = await this.prisma.product.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        category: true,
      },
    });

    return {
      data: products.map((product) => this.formatProduct(product)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string): Promise<ProductResponseDto> {
    const existingProduct = await this.prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
      },
    });

    if (!existingProduct) {
      throw new NotFoundException('该商品不存在或已下架');
    }

    return this.formatProduct(existingProduct);
  }

  async update(
    id: string,
    updateProductDto: UpdateProductDto,
  ): Promise<ProductResponseDto> {
    const existingProduct = await this.prisma.product.findUnique({
      where: { id },
    });

    if (!existingProduct) {
      throw new NotFoundException('商品不存在');
    }

    if (updateProductDto.sku && updateProductDto.sku !== existingProduct.sku) {
      const skuTaken = await this.prisma.product.findUnique({
        where: { sku: updateProductDto.sku },
      });
      if (skuTaken) {
        throw new ConflictException(`SKU 不能重复: ${skuTaken.sku} 已存在`);
      }
    }

    const { price, ...rest } = updateProductDto;

    const updatedProduct = await this.prisma.product.update({
      where: { id },
      data: {
        ...rest,
        // 未传 price 时不更新价格
        ...(price !== undefined && { price: new Prisma.Decimal(price) }),
      },
      include: {
        category: true,
      },
    });

    return this.formatProduct(updatedProduct);
  }

  // 更新商品库存
  async updateStock(id: string, quantity: number): Promise<ProductResponseDto> {
    if (quantity < 0 || quantity % 1 !== 0) {
      throw new BadRequestException('库存数量必须为非负的整数');
    }

    const existingProduct = await this.prisma.product.findUnique({
      where: { id },
    });

    if (!existingProduct) {
      throw new NotFoundException('商品不存在');
    }

    const updatedProduct = await this.prisma.product.update({
      where: { id },
      data: {
        stock: quantity,
      },
      include: {
        category: true,
      },
    });

    return this.formatProduct(updatedProduct);
  }

  // 删除商品
  async remove(id: string): Promise<{ message: string }> {
    const product = await this.prisma.product.findUnique({
      where: {
        id,
      },
      include: {
        orderItems: true,
        cartItems: true,
      },
    });

    if (!product) {
      throw new NotFoundException('商品不存在');
    }

    if (product.orderItems.length > 0) {
      throw new BadRequestException(
        '无法删除属于现有订单的产品。建议仅将其标记为“下架”状态',
      );
    }

    await this.prisma.product.delete({
      where: { id },
    });

    return {
      message: '商品删除成功',
    };
  }

  private formatProduct(
    product: Product & { category: Category },
  ): ProductResponseDto {
    return {
      ...product,
      price: product.price.toNumber(),
      category: product.category.name,
      categoryId: product.categoryId,
    };
  }
}
