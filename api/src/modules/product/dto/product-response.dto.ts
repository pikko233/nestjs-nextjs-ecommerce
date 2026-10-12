import { ApiProperty } from '@nestjs/swagger';

export class ProductResponseDto {
  @ApiProperty({
    description: '商品 ID',
    example: '7a2d9c1e-4b3f-4e8a-9c1d-2b3e4f5a6b7c',
  })
  id: string;

  @ApiProperty({
    description: '商品名称',
    example: 'iPhone 17 Pro',
  })
  name: string;

  @ApiProperty({
    description: '商品描述',
    example: '6.3 英寸屏幕，256GB 存储',
    type: String,
    nullable: true,
  })
  description: string | null;

  @ApiProperty({
    description: '商品价格',
    example: 7999.99,
  })
  price: number;

  @ApiProperty({
    description: '库存数量',
    example: 100,
  })
  stock: number;

  @ApiProperty({
    description: '商品 SKU（唯一）',
    example: 'IPH-17-PRO-256-BLK',
  })
  sku: string;

  @ApiProperty({
    description: '商品图片地址',
    example: 'https://example.com/images/iphone-17-pro.png',
    type: String,
    nullable: true,
  })
  imageUrl: string | null;

  @ApiProperty({
    description: '是否上架',
    example: true,
  })
  isActive: boolean;

  @ApiProperty({
    description: '所属分类',
    example: '电子产品',
  })
  category: string;

  @ApiProperty({
    description: '所属分类 ID',
    example: '3f1c2b4e-8a7d-4c1e-9b2a-5d6e7f8a9b0c',
  })
  categoryId: string;

  @ApiProperty({
    description: '创建时间',
    example: '2026-01-01T00:00:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: '更新时间',
    example: '2026-01-01T00:00:00.000Z',
  })
  updatedAt: Date;
}
