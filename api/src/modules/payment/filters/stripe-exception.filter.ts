import {
  ArgumentsHost,
  BadGatewayException,
  BadRequestException,
  Catch,
  ExceptionFilter,
  HttpException,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import Stripe from 'stripe';

// 把 Stripe SDK 抛出的错误转换成对应的 HTTP 响应，避免统一变成 500
@Catch(Stripe.errors.StripeError)
export class StripeExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(StripeExceptionFilter.name);

  catch(error: Stripe.errors.StripeError, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    const exception = this.toHttpException(error);
    response.status(exception.getStatus()).json(exception.getResponse());
  }

  private toHttpException(error: Stripe.errors.StripeError): HttpException {
    // 卡被拒、余额不足等，Stripe 的提示本身就是给用户看的
    if (error instanceof Stripe.errors.StripeCardError) {
      return new BadRequestException(error.message);
    }

    if (error instanceof Stripe.errors.StripeInvalidRequestError) {
      this.logger.warn(`Stripe 请求参数无效: ${error.message}`);
      return new BadRequestException('支付请求参数无效');
    }

    // 鉴权、限流、网络、Stripe 服务故障等，属于上游问题
    this.logger.error(`Stripe 调用失败: ${error.type} ${error.message}`);
    return new BadGatewayException('支付服务暂不可用，请稍后重试');
  }
}
