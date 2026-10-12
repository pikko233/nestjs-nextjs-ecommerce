import { PrismaService } from '@/prisma/prisma.service.js';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto.js';
import { OrderResponseDto } from './dto/order-response.dto.js';
import { ApiResponseDto } from '@/common/dto/api-response.dto.js';
import {
  Order,
  OrderItem,
  OrderStatus,
  Prisma,
  Product,
  User,
} from '@prisma/client';
import { QueryOrderDto } from './dto/query-order.dto.js';
import { UpdateOrderDto } from './dto/update-order.dto.js';

@Injectable()
export class OrderService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    userId: string,
    createOrderDto: CreateOrderDto,
  ): Promise<ApiResponseDto<OrderResponseDto>> {
    const { items, shippingAddress } = createOrderDto;

    // 同一商品拆成多行时合并数量，按总数校验库存
    const quantities = new Map<string, number>();
    for (const { productId, quantity } of items) {
      quantities.set(productId, (quantities.get(productId) ?? 0) + quantity);
    }

    const products = new Map<string, Product>();
    for (const [productId, quantity] of quantities) {
      const product = await this.prisma.product.findUnique({
        where: { id: productId },
      });

      if (!product) {
        throw new NotFoundException(`商品ID ${productId} 不存在`);
      }

      if (!product.isActive) {
        throw new BadRequestException(`商品 ${product.name} 已下架`);
      }

      if (product.stock < quantity) {
        throw new BadRequestException(
          `商品库存不足，库存数量: ${product.stock}`,
        );
      }

      products.set(productId, product);
    }

    // 以数据库中的商品价格计算金额，避免客户端篡改价格
    const orderItems = [...quantities].map(([productId, quantity]) => ({
      productId,
      quantity,
      price: products.get(productId)!.price,
    }));
    const total = orderItems.reduce(
      (sum, item) => sum.add(item.price.mul(item.quantity)),
      new Prisma.Decimal(0),
    );

    const latestCart = await this.prisma.cart.findFirst({
      where: {
        userId,
        checkedOut: false,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const order = await this.prisma.$transaction(async (tx) => {
      // 创建新订单
      const newOrder = await tx.order.create({
        data: {
          userId,
          status: OrderStatus.PENDING,
          totalAmount: total,
          shippingAddress,
          cartId: latestCart?.id,
          orderItems: {
            create: orderItems,
          },
        },
        include: {
          orderItems: {
            include: {
              product: true,
            },
          },
          user: true,
        },
      });

      // 带库存条件扣减，并发下单时库存不足会更新 0 行，整个事务回滚
      for (const { productId, quantity } of orderItems) {
        const { count } = await tx.product.updateMany({
          where: { id: productId, stock: { gte: quantity } },
          data: { stock: { decrement: quantity } },
        });

        if (count === 0) {
          throw new BadRequestException(
            `商品 ${products.get(productId)!.name} 库存不足`,
          );
        }
      }

      return newOrder;
    });

    return this.wrap(order, '订单创建成功');
  }

  async findAllForAdmin(query: QueryOrderDto): Promise<{
    data: OrderResponseDto[];
    page: number;
    limit: number;
    total: number;
  }> {
    const { page = 1, limit = 10, status, search } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.OrderWhereInput = {};
    if (status) where.status = status;
    if (search)
      where.OR = [
        { id: { contains: search, mode: 'insensitive' } },
        { orderNumber: { contains: search, mode: 'insensitive' } },
      ];

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip,
        take: limit,
        include: {
          orderItems: {
            include: {
              product: true,
            },
          },
          user: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      this.prisma.order.count({ where }),
    ]);

    return {
      data: orders.map((order) => this.map(order)),
      page,
      limit,
      total,
    };
  }

  async findAll(
    userId: string,
    query: QueryOrderDto,
  ): Promise<{
    data: OrderResponseDto[];
    total: number;
    page: number;
    limit: number;
  }> {
    const { page = 1, limit = 10, status, search } = query;

    const skip = (page - 1) * limit;

    const where: Prisma.OrderWhereInput = { userId };
    if (status) where.status = status;
    if (search) where.OR = [{ id: { contains: search, mode: 'insensitive' } }];

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip,
        take: limit,
        include: {
          orderItems: {
            include: {
              product: true,
            },
          },
          user: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      this.prisma.order.count({ where }),
    ]);

    return {
      data: orders.map((order) => this.map(order)),
      total,
      page,
      limit,
    };
  }

  async findOne(
    id: string,
    userId?: string,
  ): Promise<ApiResponseDto<OrderResponseDto>> {
    const where: Prisma.OrderWhereInput = { id };

    if (userId) where.userId = userId;

    const order = await this.prisma.order.findFirst({
      where,
      include: {
        orderItems: {
          include: {
            product: true,
          },
        },
        user: true,
      },
    });

    if (!order) {
      throw new NotFoundException(`订单 ID: ${id} 不存在`);
    }

    return this.wrap(order, '获取订单成功');
  }

  async update(
    id: string,
    updateOrderDto: UpdateOrderDto,
    userId?: string,
  ): Promise<ApiResponseDto<OrderResponseDto>> {
    // 普通用户不能修改订单状态，取消订单请走 cancel 接口
    if (userId && updateOrderDto.status) {
      throw new ForbiddenException('无权修改订单状态，取消订单请使用取消接口');
    }

    // 取消订单需要回滚库存，统一走 cancel 逻辑
    if (updateOrderDto.status === OrderStatus.CANCELLED) {
      return this.cancel(id);
    }

    const where: Prisma.OrderWhereUniqueInput = { id };

    if (userId) where.userId = userId;

    const order = await this.prisma.order.findFirst({
      where,
    });

    if (!order) {
      throw new NotFoundException(`订单ID: ${id} 不存在`);
    }

    // 发货流程开始后收货地址不能再改
    if (
      updateOrderDto.shippingAddress !== undefined &&
      order.status !== OrderStatus.PENDING
    ) {
      throw new BadRequestException(
        `当前订单状态: ${order.status} 无法修改收货地址`,
      );
    }

    const updatedOrder = await this.prisma.order.update({
      where,
      data: updateOrderDto,
      include: {
        orderItems: {
          include: {
            product: true,
          },
        },
        user: true,
      },
    });

    return this.wrap(updatedOrder, '订单更新成功');
  }

  async cancel(
    id: string,
    userId?: string,
  ): Promise<ApiResponseDto<OrderResponseDto>> {
    const where: Prisma.OrderWhereUniqueInput = { id };
    if (userId) where.userId = userId;

    const order = await this.prisma.order.findUnique({
      where,
      include: {
        orderItems: true,
      },
    });

    if (!order) {
      throw new NotFoundException(`订单ID: ${id} 不存在`);
    }

    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException(
        `当前订单状态: ${order.status} 无法执行取消操作`,
      );
    }

    const cancelledOrder = await this.prisma.$transaction(async (tx) => {
      for (const item of order.orderItems) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } },
        });
      }

      return tx.order.update({
        where: { id },
        data: { status: OrderStatus.CANCELLED },
        include: {
          orderItems: {
            include: {
              product: true,
            },
          },
          user: true,
        },
      });
    });

    return this.wrap(cancelledOrder, '订单取消成功');
  }

  private wrap(
    order: Order & {
      orderItems: (OrderItem & { product: Product })[];
      user: User;
    },
    message: string,
  ): ApiResponseDto<OrderResponseDto> {
    return {
      success: true,
      message,
      data: this.map(order),
    };
  }

  private map(
    order: Order & {
      orderItems: (OrderItem & { product: Product })[];
      user: User;
    },
  ): OrderResponseDto {
    return {
      id: order.id,
      userId: order.userId,
      status: order.status,
      total: Number(order.totalAmount),
      shippingAddress: order.shippingAddress ?? '',
      items: order.orderItems.map((item) => ({
        id: item.id,
        productId: item.productId,
        productName: item.product.name,
        quantity: item.quantity,
        price: Number(item.price),
        subtotal: item.price.mul(item.quantity).toNumber(),
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
      })),
      ...(order.user && {
        userEmail: order.user.email,
        userName:
          `${order.user.firstName || ''} ${order.user.lastName || ''}`.trim(),
      }),
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    };
  }
}
