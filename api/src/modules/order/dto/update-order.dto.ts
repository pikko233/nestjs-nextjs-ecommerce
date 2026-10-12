import { ApiProperty } from '@nestjs/swagger';
import { OrderStatus } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdateOrderDto {
  @ApiProperty({
    enum: OrderStatus,
    required: false,
    description: '仅管理员可修改',
  })
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @ApiProperty({ required: false, description: '仅待处理订单可修改' })
  @IsOptional()
  @IsNotEmpty({ message: '收货地址不能为空' })
  @IsString()
  shippingAddress?: string;
}
