import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrderStatus, Payment, PaymentStatus, Prisma } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service.js';
import {
  PaymentResponseDto,
  CreatePaymentIntentResponse,
} from './dto/payment-response.dto.js';
import { ApiResponseDto } from '@/common/dto/api-response.dto.js';
import { CreatePaymentIntentDto } from './dto/create-payment-intent.dto.js';
import Stripe from 'stripe';
import { ConfirmPaymentDto } from './dto/confirm-payment.dto.js';

// 这些状态的 PaymentIntent 还可以继续让用户付款
const REUSABLE_INTENT_STATUSES = new Set<Stripe.PaymentIntent.Status>([
  'requires_payment_method',
  'requires_confirmation',
  'requires_action',
]);

// 确认支付时订单已不是待支付状态，用于回滚事务并触发退款
class OrderNotPayableError extends Error {}

@Injectable()
export class PaymentService {
  private stripe: Stripe;

  constructor(private readonly prisma: PrismaService) {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2026-09-30.endive',
    });
  }

  // 创建支付意图
  async createPaymentIntent(
    userId: string,
    createPaymentIntentDto: CreatePaymentIntentDto,
  ): Promise<ApiResponseDto<CreatePaymentIntentResponse>> {
    const { orderId, amount, currency = 'usd' } = createPaymentIntentDto;

    const existingOrder = await this.prisma.order.findFirst({
      where: { id: orderId, userId },
    });

    if (!existingOrder) {
      throw new NotFoundException(`订单ID: ${orderId} 不存在`);
    }

    const existingPayment = await this.prisma.payment.findFirst({
      where: { orderId },
    });

    if (existingPayment && existingPayment.status === PaymentStatus.COMPLETED) {
      throw new BadRequestException('订单已支付，请勿重复支付');
    }

    if (existingOrder.status !== OrderStatus.PENDING) {
      throw new BadRequestException('订单当前状态不可支付');
    }

    // 金额以订单为准，客户端传的金额只用于核对
    if (!existingOrder.totalAmount.equals(amount)) {
      throw new BadRequestException('支付金额与订单金额不一致');
    }

    const paymentIntent = await this.getOrCreatePaymentIntent(existingPayment, {
      amount: existingOrder.totalAmount.mul(100).toNumber(),
      currency,
      metadata: { orderId, userId },
    });

    const paymentData = {
      amount: existingOrder.totalAmount,
      currency,
      status: PaymentStatus.PENDING,
      paymentMethod: 'STRIPE',
      transactionId: paymentIntent.id,
    };

    let payment: Payment;
    try {
      payment = existingPayment
        ? await this.prisma.payment.update({
            where: { id: existingPayment.id },
            data: paymentData,
          })
        : await this.prisma.payment.create({
            data: { ...paymentData, orderId, userId },
          });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        await this.stripe.paymentIntents.cancel(paymentIntent.id);
        throw new ConflictException('该订单正在发起支付，请稍后重试');
      }
      throw error;
    }

    return {
      data: {
        clientSecret: paymentIntent.client_secret!,
        paymentId: payment.id,
      },
      success: true,
      message: '支付意图创建成功',
    };
  }

  // 确认支付
  async confirmPayment(
    userId: string,
    confirmPaymentDto: ConfirmPaymentDto,
  ): Promise<ApiResponseDto<PaymentResponseDto>> {
    const { paymentIntentId, orderId } = confirmPaymentDto;

    const payment = await this.prisma.payment.findFirst({
      where: {
        userId,
        orderId,
        transactionId: paymentIntentId,
      },
    });

    if (!payment) {
      throw new NotFoundException('支付订单不存在');
    }

    if (payment.status === PaymentStatus.COMPLETED) {
      throw new BadRequestException('订单已支付，请勿重复支付');
    }

    if (payment.status !== PaymentStatus.PENDING) {
      throw new BadRequestException('支付记录已失效');
    }

    const paymentIntent =
      await this.stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status !== 'succeeded') {
      throw new BadRequestException('未成功支付');
    }

    let updatedPayment: Payment;
    try {
      updatedPayment = await this.prisma.$transaction(async (tx) => {
        // 带状态条件更新，并发确认时只有一个请求能成功
        const paid = await tx.payment.updateMany({
          where: { id: payment.id, status: PaymentStatus.PENDING },
          data: { status: PaymentStatus.COMPLETED },
        });
        if (paid.count === 0) {
          throw new BadRequestException('订单已支付，请勿重复支付');
        }

        const order = await tx.order.findFirst({ where: { id: orderId } });
        const processing = await tx.order.updateMany({
          where: { id: orderId, status: OrderStatus.PENDING },
          data: { status: OrderStatus.PROCESSING },
        });
        if (processing.count === 0) {
          throw new OrderNotPayableError();
        }

        if (order?.cartId) {
          await tx.cart.update({
            where: { id: order.cartId },
            data: { checkedOut: true },
          });
        }

        return tx.payment.findFirstOrThrow({ where: { id: payment.id } });
      });
    } catch (error) {
      if (error instanceof OrderNotPayableError) {
        await this.refundPayment(payment.id, paymentIntentId);
        throw new BadRequestException('订单状态已变更，款项将原路退回');
      }
      throw error;
    }

    return {
      success: true,
      data: this.mapToPaymentResponse(updatedPayment),
      message: '支付已确认',
    };
  }

  // 获取支付记录列表
  async findAll(userId: string): Promise<ApiResponseDto<PaymentResponseDto[]>> {
    const payments = await this.prisma.payment.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return {
      success: true,
      data: payments.map((v) => this.mapToPaymentResponse(v)),
      message: '支付记录获取成功',
    };
  }

  // 获取支付记录详情
  async findOne(
    id: string,
    userId: string,
  ): Promise<ApiResponseDto<PaymentResponseDto>> {
    const payment = await this.prisma.payment.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!payment) {
      throw new NotFoundException(`支付记录ID ${id} 不存在`);
    }

    return {
      success: true,
      data: this.mapToPaymentResponse(payment),
      message: '支付详情获取成功',
    };
  }

  // 获取支付记录详情
  async findOneByOrderId(
    orderId: string,
    userId: string,
  ): Promise<ApiResponseDto<PaymentResponseDto>> {
    const payment = await this.prisma.payment.findFirst({
      where: {
        orderId,
        userId,
      },
    });

    if (!payment) {
      throw new NotFoundException(`订单ID ${orderId} 不存在`);
    }

    return {
      success: true,
      data: this.mapToPaymentResponse(payment),
      message: '支付详情获取成功',
    };
  }

  // 订单在付款期间被取消等情况下，Stripe 已扣的款需要退回
  private async refundPayment(paymentId: string, paymentIntentId: string) {
    await this.stripe.refunds.create(
      { payment_intent: paymentIntentId },
      { idempotencyKey: `refund-${paymentIntentId}` },
    );
    await this.prisma.payment.update({
      where: { id: paymentId },
      data: { status: PaymentStatus.REFUNDED },
    });
  }

  // 已有未完成的支付时优先复用 Stripe 上的支付意图，避免同一订单出现多个可扣款的意图
  private async getOrCreatePaymentIntent(
    existingPayment: Payment | null,
    params: Stripe.PaymentIntentCreateParams,
  ): Promise<Stripe.PaymentIntent> {
    if (existingPayment?.transactionId) {
      const intent = await this.stripe.paymentIntents.retrieve(
        existingPayment.transactionId,
      );

      if (intent.status === 'succeeded') {
        throw new BadRequestException('订单已支付，请确认支付结果');
      }

      if (REUSABLE_INTENT_STATUSES.has(intent.status)) {
        if (
          intent.amount === params.amount &&
          intent.currency === params.currency
        ) {
          return intent;
        }
        await this.stripe.paymentIntents.cancel(intent.id);
      }
    }

    return this.stripe.paymentIntents.create(params);
  }

  private mapToPaymentResponse(payment: Payment): PaymentResponseDto {
    return {
      id: payment.id,
      amount: payment.amount.toNumber(),
      status: payment.status,
      currency: payment.currency,
      paymentMethod: payment.paymentMethod,
      transactionId: payment.transactionId,
      userId: payment.userId,
      orderId: payment.orderId,
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt,
    };
  }
}
