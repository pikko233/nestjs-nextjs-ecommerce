import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

// 不接收客户端传的价格，下单时以数据库中的商品价格为准
class OrderItemDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  productId: string;

  @ApiProperty({ minimum: 1 })
  @IsInt({ message: '购买数量必须是整数' })
  @Min(1, { message: '购买数量至少为 1' })
  quantity: number;
}

export class CreateOrderDto {
  @ApiProperty({ type: [OrderItemDto] })
  @IsArray()
  @ArrayNotEmpty({ message: '订单至少包含一个商品' })
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];

  @ApiProperty()
  @IsNotEmpty({ message: '收货地址不能为空' })
  @IsString()
  shippingAddress: string;
}
