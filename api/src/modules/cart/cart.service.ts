import { PrismaService } from '@/prisma/prisma.service.js';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ApiResponseDto } from '@/common/dto/api-response.dto.js';
import { CartResponseDto } from './dto/cart-response.dto.js';
import { AddCartItemDto } from './dto/add-cart-item.dto.js';
import { UpdateCartItemDto } from './dto/update-cart-item.dto.js';
import { Prisma } from '@prisma/client';

@Injectable()
export class CartService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    userId: string,
  ): Promise<ApiResponseDto<CartResponseDto | null>> {
    const cart = await this.prisma.cart.findFirst({
      where: { userId, checkedOut: false },
      orderBy: { createdAt: 'desc' },
      include: {
        cartItems: true,
      },
    });

    return {
      success: true,
      data: cart,
      message: '购物车列表获取成功',
    };
  }

  // 添加商品至购物车
  async addItem(
    userId: string,
    dto: AddCartItemDto,
  ): Promise<ApiResponseDto<CartResponseDto>> {
    const { productId, quantity } = dto;

    // 查询商品是否存在
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });
    if (!product) {
      throw new NotFoundException('商品不存在');
    }
    // 判断商品是否已下架, isActive
    if (!product.isActive) {
      throw new BadRequestException('商品已下架');
    }

    // 获取或创建当前用户的活跃购物车
    const cart = await this.getOrCreateActiveCart(userId);

    // 往购物车里添加商品
    const newCart = await this.prisma.$transaction(async (tx) => {
      const newCartItem = await tx.cartItem.upsert({
        where: { cartId_productId: { cartId: cart.id, productId } },
        create: { cartId: cart.id, productId, quantity },
        update: { quantity: { increment: quantity } },
      });

      if (product.stock < newCartItem.quantity) {
        throw new BadRequestException('商品库存不足');
      }

      const newCart = await tx.cart.findUniqueOrThrow({
        where: { id: cart.id },
        include: {
          cartItems: true,
        },
      });

      return newCart;
    });

    return {
      success: true,
      data: newCart,
      message: '加购成功',
    };
  }

  // 更新购物车的商品数量
  async update(
    userId: string,
    cartItemId: string,
    dto: UpdateCartItemDto,
  ): Promise<ApiResponseDto<CartResponseDto>> {
    const { quantity } = dto;

    const newCart = await this.prisma.$transaction(async (tx) => {
      const { count } = await tx.cartItem.updateMany({
        where: { id: cartItemId, cart: { userId, checkedOut: false } },
        data: { quantity },
      });

      if (count === 0) {
        throw new NotFoundException('购物车中不存在该商品');
      }

      const cartItem = await tx.cartItem.findUniqueOrThrow({
        where: { id: cartItemId },
        include: { product: true },
      });

      if (cartItem.quantity > cartItem.product.stock) {
        throw new BadRequestException('商品库存不足');
      }

      return await tx.cart.findFirstOrThrow({
        where: { id: cartItem.cartId },
        include: { cartItems: true },
      });
    });

    return {
      success: true,
      data: newCart,
      message: '商品数量修改成功',
    };
  }

  // 移除购物车中的商品
  async remove(
    userId: string,
    cartItemId: string,
  ): Promise<ApiResponseDto<CartResponseDto>> {
    const { count } = await this.prisma.cartItem.deleteMany({
      where: { id: cartItemId, cart: { userId, checkedOut: false } },
    });
    if (count === 0) {
      throw new NotFoundException('购物车中不存在该商品');
    }
    const newCart = await this.prisma.cart.findFirstOrThrow({
      where: { userId, checkedOut: false },
      orderBy: { createdAt: 'desc' },
      include: { cartItems: true },
    });

    return {
      data: newCart,
      success: true,
      message: '商品移除成功',
    };
  }

  // 获取或创建当前用户的活跃购物车
  private async getOrCreateActiveCart(userId: string) {
    const where = { userId, checkedOut: false };

    const cart = await this.prisma.cart.findFirst({
      where,
      select: { id: true },
    });
    if (cart) return cart;

    try {
      return await this.prisma.cart.create({
        data: { userId },
        select: { id: true },
      });
    } catch (error) {
      // 并发请求已抢先建好活跃购物车（部分唯一索引 carts_userId_active_key），直接复用
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        return this.prisma.cart.findFirstOrThrow({
          where,
          select: { id: true },
        });
      }
      throw error;
    }
  }
}
