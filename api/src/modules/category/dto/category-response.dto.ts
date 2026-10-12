import { ApiProperty } from '@nestjs/swagger';

export class CategoryResponseDto {
  @ApiProperty({
    description: '分类 ID',
    example: '3f1c2b4e-8a7d-4c1e-9b2a-5d6e7f8a9b0c',
  })
  id: string;

  @ApiProperty({
    description: '分类名称',
    example: '电器',
  })
  name: string;

  @ApiProperty({
    description: '分类描述',
    example: '各类家用电器',
    type: String,
    nullable: true,
  })
  description: string | null;

  @ApiProperty({
    description: '分类 slug（唯一）',
    example: 'electronics',
  })
  slug: string;

  @ApiProperty({
    description: '分类图片地址',
    example: 'https://example.com/images/electronics.png',
    type: String,
    nullable: true,
  })
  imageUrl: string | null;

  @ApiProperty({
    description: '是否启用',
    example: true,
  })
  isActive: boolean;

  @ApiProperty({
    description: '该分类下的产品数量',
    example: 150,
  })
  productCount: number;

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
