import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard.js';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadGatewayResponse,
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { PaymentService } from './payment.service.js';
import { GetUser } from '@/common/decorators/get-user.decorator.js';
import {
  CreatePaymentIntentResponse,
  PaymentResponseDto,
} from './dto/payment-response.dto.js';
import { ApiWrappedResponse } from '@/common/decorators/api-wrapped-response.decorator.js';
import { CreatePaymentIntentDto } from './dto/create-payment-intent.dto.js';
import { ConfirmPaymentDto } from './dto/confirm-payment.dto.js';
import { StripeExceptionFilter } from './filters/stripe-exception.filter.js';

@Controller('payment')
@UseGuards(JwtAuthGuard)
@UseFilters(StripeExceptionFilter)
@ApiBearerAuth('JWT-auth')
@ApiTags('支付')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('create-intent')
  @ApiOperation({
    summary: '创建支付意图',
  })
  @ApiWrappedResponse(CreatePaymentIntentResponse, {
    status: HttpStatus.CREATED,
    description: '支付意图创建成功',
  })
  @ApiBadRequestResponse({
    description: '订单已支付、订单状态不可支付、金额与订单不一致或支付参数无效',
  })
  @ApiNotFoundResponse({
    description: '订单不存在',
  })
  @ApiConflictResponse({
    description: '该订单正在发起支付',
  })
  @ApiBadGatewayResponse({
    description: '支付服务暂不可用',
  })
  async createPaymentIntent(
    @Body() createPaymentIntentDto: CreatePaymentIntentDto,
    @GetUser('id') userId: string,
  ) {
    return await this.paymentService.createPaymentIntent(
      userId,
      createPaymentIntentDto,
    );
  }

  @Post('confirm')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '确认支付',
  })
  @ApiWrappedResponse(PaymentResponseDto, {
    description: '支付成功',
  })
  @ApiBadRequestResponse({
    description:
      '支付已完成或已失效、尚未支付成功，或订单状态已变更（将自动退款）',
  })
  @ApiNotFoundResponse({
    description: '支付订单不存在',
  })
  @ApiBadGatewayResponse({
    description: '支付服务暂不可用',
  })
  async confirmPayment(
    @Body() confirmPaymentDto: ConfirmPaymentDto,
    @GetUser('id') userId: string,
  ) {
    return await this.paymentService.confirmPayment(userId, confirmPaymentDto);
  }

  @Get()
  @ApiOperation({ summary: '获取所有支付记录' })
  @ApiWrappedResponse(PaymentResponseDto, {
    description: '支付记录获取成功',
    isArray: true,
  })
  async findAll(@GetUser('id') userId: string) {
    return await this.paymentService.findAll(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: '根据支付记录ID获取支付记录信息' })
  @ApiParam({
    name: 'id',
    description: '支付记录ID',
  })
  @ApiWrappedResponse(PaymentResponseDto, {
    description: '支付信息获取成功',
  })
  @ApiNotFoundResponse({
    description: '支付记录不存在',
  })
  async findOne(@Param('id') id: string, @GetUser('id') userId: string) {
    return await this.paymentService.findOne(id, userId);
  }

  @Get('order/:orderId')
  @ApiOperation({ summary: '根据订单ID获取支付详情' })
  @ApiParam({
    name: 'orderId',
    description: '订单ID',
  })
  @ApiWrappedResponse(PaymentResponseDto, {
    description: '支付详情获取成功',
  })
  @ApiNotFoundResponse({
    description: '支付记录不存在',
  })
  async findOneByOrderId(
    @Param('orderId') orderId: string,
    @GetUser('id') userId: string,
  ) {
    return await this.paymentService.findOneByOrderId(orderId, userId);
  }
}
