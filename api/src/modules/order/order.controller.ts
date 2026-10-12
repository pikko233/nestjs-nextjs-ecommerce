import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard.js';
import { RolesGuard } from '@/common/guards/roles.guard.js';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
  ApiTooManyRequestsResponse,
  getSchemaPath,
} from '@nestjs/swagger';
import { OrderService } from './order.service.js';
import {
  ModerateThrottler,
  RelaxedThrottler,
} from '@/common/decorators/custom-throttler.decorator.js';
import { CreateOrderDto } from './dto/create-order.dto.js';
import {
  OrderResponseDto,
  PagenatedOrderResponseDto,
} from './dto/order-response.dto.js';
import { ApiResponseDto } from '@/common/dto/api-response.dto.js';
import { ApiWrappedResponse } from '@/common/decorators/api-wrapped-response.decorator.js';
import { GetUser } from '@/common/decorators/get-user.decorator.js';
import { Roles } from '@/common/decorators/roles.decorator.js';
import { Role } from '@prisma/client';
import { QueryOrderDto } from './dto/query-order.dto.js';
import { UpdateOrderDto } from './dto/update-order.dto.js';

@ApiTags('订单')
@ApiBearerAuth('JWT-auth')
@Controller('order')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post()
  @ModerateThrottler()
  @ApiOperation({ summary: '创建订单' })
  @ApiBody({
    type: CreateOrderDto,
  })
  @ApiWrappedResponse(OrderResponseDto, {
    status: HttpStatus.CREATED,
    description: '订单创建成功',
  })
  @ApiBadRequestResponse({
    description: '请求参数错误或者商品库存不足',
  })
  @ApiNotFoundResponse({
    description: '商品不存在',
  })
  @ApiTooManyRequestsResponse({
    description: '请求过于频繁，请稍后再试~',
  })
  async create(
    @Body() createOrderDto: CreateOrderDto,
    @GetUser('id') userId: string,
  ): Promise<ApiResponseDto<OrderResponseDto>> {
    return await this.orderService.create(userId, createOrderDto);
  }

  @Get('admin/all')
  @Roles(Role.ADMIN)
  @RelaxedThrottler()
  @ApiOperation({ summary: '[管理员权限]: 获取所有订单' })
  @ApiQuery({
    name: 'status',
    required: false,
    type: String,
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
  })
  @ApiResponse({
    description: '订单列表',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: { $ref: getSchemaPath(OrderResponseDto) },
        },
        total: {
          type: 'number',
        },
        limit: {
          type: 'number',
        },
        page: {
          type: 'number',
        },
      },
    },
  })
  @ApiForbiddenResponse({
    description: '仅限管理员访问',
  })
  async findAllForAdmin(@Query() query: QueryOrderDto) {
    return await this.orderService.findAllForAdmin(query);
  }

  @Get()
  @RelaxedThrottler()
  @ApiOperation({ summary: '获取当前用户的所有订单' })
  @ApiQuery({
    name: 'status',
    required: false,
    type: String,
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
  })
  @ApiOkResponse({
    description: '用户订单列表',
    type: PagenatedOrderResponseDto,
  })
  async findAll(@Query() query: QueryOrderDto, @GetUser('id') userId: string) {
    return await this.orderService.findAll(userId, query);
  }

  @Get('admin/:id')
  @Roles(Role.ADMIN)
  @RelaxedThrottler()
  @ApiOperation({ summary: '[管理员权限]: 根据ID获取订单信息' })
  @ApiParam({
    name: 'id',
    description: '订单ID',
  })
  @ApiWrappedResponse(OrderResponseDto, {
    description: '订单详情',
  })
  @ApiNotFoundResponse({
    description: '订单不存在',
  })
  @ApiForbiddenResponse({
    description: '仅限管理员访问',
  })
  async findOneForAdmin(@Param('id') id: string) {
    return await this.orderService.findOne(id);
  }

  @Get(':id')
  @RelaxedThrottler()
  @ApiOperation({ summary: '用户获取订单' })
  @ApiParam({
    name: 'id',
    description: '订单ID',
  })
  @ApiWrappedResponse(OrderResponseDto, {
    description: '订单详情',
  })
  @ApiNotFoundResponse({
    description: '订单不存在',
  })
  async findOne(@Param('id') id: string, @GetUser('id') userId: string) {
    return await this.orderService.findOne(id, userId);
  }

  @Patch('admin/:id')
  @Roles(Role.ADMIN)
  @RelaxedThrottler()
  @ApiOperation({ summary: '[管理员权限]: 更新订单' })
  @ApiParam({
    name: 'id',
    description: '订单ID',
  })
  @ApiBody({
    type: UpdateOrderDto,
  })
  @ApiWrappedResponse(OrderResponseDto, {
    description: '订单更新成功',
  })
  @ApiNotFoundResponse({
    description: '订单不存在',
  })
  @ApiForbiddenResponse({
    description: '仅限管理员访问',
  })
  async updateForAdmin(@Param('id') id: string, @Body() dto: UpdateOrderDto) {
    return await this.orderService.update(id, dto);
  }

  @Patch(':id')
  @ModerateThrottler()
  @ApiOperation({ summary: '用户修改订单收货地址（仅待处理订单）' })
  @ApiParam({
    name: 'id',
    description: '订单ID',
  })
  @ApiBody({
    type: UpdateOrderDto,
  })
  @ApiWrappedResponse(OrderResponseDto, {
    description: '订单更新成功',
  })
  @ApiNotFoundResponse({
    description: '订单不存在',
  })
  @ApiBadRequestResponse({
    description: '订单不是待处理状态，无法修改收货地址',
  })
  @ApiForbiddenResponse({
    description: '普通用户不能修改订单状态',
  })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateOrderDto,
    @GetUser('id') userId: string,
  ) {
    return await this.orderService.update(id, dto, userId);
  }

  @Delete('admin/:id')
  @Roles(Role.ADMIN)
  @ModerateThrottler()
  @ApiOperation({ summary: '[管理员权限]: 取消订单' })
  @ApiParam({
    name: 'id',
    description: '订单ID',
  })
  @ApiWrappedResponse(OrderResponseDto, {
    description: '取消订单',
  })
  @ApiNotFoundResponse({
    description: '订单不存在',
  })
  async cancelForAdmin(@Param('id') id: string) {
    return await this.orderService.cancel(id);
  }

  @Delete(':id')
  @ModerateThrottler()
  @ApiOperation({ summary: '用户取消订单' })
  @ApiParam({
    name: 'id',
    description: '订单ID',
  })
  @ApiWrappedResponse(OrderResponseDto, {
    description: '取消订单',
  })
  @ApiNotFoundResponse({
    description: '订单不存在',
  })
  async cancel(@Param('id') id: string, @GetUser('id') userId: string) {
    return await this.orderService.cancel(id, userId);
  }
}
