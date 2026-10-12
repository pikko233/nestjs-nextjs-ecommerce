import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateProductDto {
  @ApiProperty({
    description: '商品名称',
    example: 'iPhone 17 Pro',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;

  @ApiProperty({
    description: '商品描述',
    example: '6.3 英寸屏幕，256GB 存储',
    required: false,
  })
  @IsString()
  @IsOptional()
  @MaxLength(2000)
  description?: string;

  @ApiProperty({
    description: '商品价格（最多两位小数）',
    example: 7999.99,
    minimum: 0,
  })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  price: number;

  @ApiProperty({
    description: '库存数量',
    example: 100,
    minimum: 0,
    required: true,
    default: 0,
  })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  stock: number;

  @ApiProperty({
    description: '商品 SKU（唯一）',
    example: 'IPH-17-PRO-256-BLK',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  sku: string;

  @ApiProperty({
    description: '商品图片地址',
    example: 'https://example.com/images/iphone-17-pro.png',
    required: false,
  })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  imageUrl?: string;

  @ApiProperty({
    description: '所属分类 ID',
    example: '3f1c2b4e-8a7d-4c1e-9b2a-5d6e7f8a9b0c',
  })
  @IsUUID()
  @IsNotEmpty()
  categoryId: string;

  @ApiProperty({
    description: '是否上架',
    required: true,
    default: true,
  })
  @IsBoolean()
  isActive: boolean;
}
