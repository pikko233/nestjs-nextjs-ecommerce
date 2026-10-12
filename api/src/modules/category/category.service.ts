import { CreateCategoryDto } from './dto/create-category.dto.js';
import { PrismaService } from '@/prisma/prisma.service.js';
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CategoryResponseDto } from './dto/category-response.dto.js';
import { Category, Prisma } from '@prisma/client';
import { QueryCategoryDto } from './dto/query-category.dto.js';
import { UpdateCategoryDto } from './dto/update-category.dto.js';

@Injectable()
export class CategoryService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    createCategoryDto: CreateCategoryDto,
  ): Promise<CategoryResponseDto> {
    const { name, slug, ...rest } = createCategoryDto;

    const toSlug = (text: string) =>
      text
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '-') // 空白变 -
        .replace(/[^\p{L}\p{N}_-]/gu, '') // 保留各国文字、数字、_ 和 -
        .replace(/-+/g, '-') // 合并连续的 -
        .replace(/^-|-$/g, ''); // 去掉首尾的 -

    const categorySlug = slug ?? (toSlug(name) || 'category');

    const existingCategory = await this.prisma.category.findUnique({
      where: { slug: categorySlug },
    });

    if (existingCategory) {
      throw new ConflictException(`该分类已存在: ${categorySlug}`);
    }

    const category = await this.prisma.category.create({
      data: {
        name,
        slug: categorySlug,
        ...rest,
      },
    });

    return this.formatCategory(category, 0);
  }

  async findAll(queryDto: QueryCategoryDto): Promise<{
    data: CategoryResponseDto[];
    meta: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  }> {
    const { isActive, search, page = 1, limit = 10 } = queryDto;

    const where: Prisma.CategoryWhereInput = {};

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    if (search) {
      where.OR = [
        {
          name: { contains: search, mode: 'insensitive' },
        },
        {
          description: { contains: search, mode: 'insensitive' },
        },
      ];
    }

    const total = await this.prisma.category.count({ where });

    const categories = await this.prisma.category.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            products: true,
          },
        },
      },
    });

    return {
      data: categories.map((category) =>
        this.formatCategory(category, category._count.products),
      ),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string): Promise<CategoryResponseDto> {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            products: true,
          },
        },
      },
    });

    if (!category) {
      throw new NotFoundException('分类不存在');
    }

    return this.formatCategory(category, Number(category._count.products));
  }

  async findBySlug(slug: string): Promise<CategoryResponseDto> {
    const category = await this.prisma.category.findUnique({
      where: { slug },
      include: {
        _count: {
          select: {
            products: true,
          },
        },
      },
    });

    if (!category) {
      throw new NotFoundException('分类不存在');
    }

    return this.formatCategory(category, Number(category._count.products));
  }

  async update(
    id: string,
    updateCategoryDto: UpdateCategoryDto,
  ): Promise<CategoryResponseDto> {
    const existingCategory = await this.prisma.category.findUnique({
      where: { id },
    });

    if (!existingCategory) {
      throw new NotFoundException('该分类ID不存在');
    }

    if (
      updateCategoryDto.slug &&
      updateCategoryDto.slug !== existingCategory.slug
    ) {
      const slugTaken = await this.prisma.category.findUnique({
        where: { slug: updateCategoryDto.slug },
      });

      if (slugTaken) {
        throw new ConflictException('slug已重复');
      }
    }

    const updatedCategory = await this.prisma.category.update({
      where: { id },
      data: updateCategoryDto,
      include: {
        _count: {
          select: {
            products: true,
          },
        },
      },
    });

    return this.formatCategory(
      updatedCategory,
      Number(updatedCategory._count.products),
    );
  }

  async remove(id: string): Promise<{ message: string }> {
    const existingCategory = await this.prisma.category.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            products: true,
          },
        },
      },
    });

    if (!existingCategory) {
      throw new NotFoundException('该分类不存在');
    }

    if (existingCategory._count.products > 0) {
      throw new ConflictException(
        `该分类下还存在${existingCategory._count.products}项商品，不可删除`,
      );
    }

    await this.prisma.category.delete({
      where: { id },
    });

    return {
      message: '分类删除成功',
    };
  }

  private formatCategory(
    category: Category & { _count?: unknown },
    productCount: number,
  ): CategoryResponseDto {
    const { _count, ...rest } = category;
    return {
      ...rest,
      productCount,
    };
  }
}
