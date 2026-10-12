import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard.js';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiNotFoundResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { CartService } from './cart.service.js';
import { GetUser } from '@/common/decorators/get-user.decorator.js';
import { ApiWrappedResponse } from '@/common/decorators/api-wrapped-response.decorator.js';
import { CartResponseDto } from './dto/cart-response.dto.js';
import { AddCartItemDto } from './dto/add-cart-item.dto.js';
import { UpdateCartItemDto } from './dto/update-cart-item.dto.js';

@Controller('cart')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
@ApiTags('购物车')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  @ApiOperation({ summary: '获取购物车列表' })
  @ApiWrappedResponse(CartResponseDto, {
    description: '购物车列表获取成功',
    nullable: true,
  })
  async findAll(@GetUser('id') userId: string) {
    return await this.cartService.findAll(userId);
  }

  @Post('items')
  @ApiOperation({ summary: '添加商品至购物车' })
  @ApiBody({
    type: AddCartItemDto,
  })
  @ApiWrappedResponse(CartResponseDto, {
    status: HttpStatus.CREATED,
    description: '已添加至购物车',
  })
  async addItem(@Body() dto: AddCartItemDto, @GetUser('id') userId: string) {
    return await this.cartService.addItem(userId, dto);
  }

  @Patch('items/:id')
  @ApiOperation({ summary: '修改购物车的商品数量' })
  @ApiParam({
    name: 'id',
    description: '购物车子项ID',
  })
  @ApiWrappedResponse(CartResponseDto, {
    description: '商品数量修改成功',
  })
  @ApiNotFoundResponse({
    description: '购物车中不存在该商品',
  })
  @ApiBadRequestResponse({
    description: '商品库存不足',
  })
  async update(
    @Body() dto: UpdateCartItemDto,
    @Param('id', ParseUUIDPipe) cartItemId: string,
    @GetUser('id') userId: string,
  ) {
    return await this.cartService.update(userId, cartItemId, dto);
  }

  @Delete('items/:id')
  @ApiOperation({ summary: '移除购物车中的商品' })
  @ApiParam({
    name: 'id',
    description: '购物车子项ID',
  })
  @ApiWrappedResponse(CartResponseDto, {
    description: '商品移除成功',
  })
  @ApiNotFoundResponse({
    description: '购物车中不存在该商品',
  })
  async remove(
    @Param('id', ParseUUIDPipe) cartItemId: string,
    @GetUser('id') userId: string,
  ) {
    return await this.cartService.remove(userId, cartItemId);
  }
}
