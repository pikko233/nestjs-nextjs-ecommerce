import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

export class QueryProductDto {
  @ApiPropertyOptional({
    description: '商品所属分类 ID',
    example: '3f1c2b4e-8a7d-4c1e-9b2a-5d6e7f8a9b0c',
  })
  @IsUUID()
  @IsOptional()
  category?: string;

  @ApiPropertyOptional({
    description: '是否上架',
    example: true,
  })
  // 读取原始值 obj.isActive：enableImplicitConversion 会先把 'false' 转成 true
  @Transform(({ obj }) => {
    const raw = obj.isActive;
    if (raw === 'true' || raw === true) return true;
    if (raw === 'false' || raw === false) return false;
    return raw;
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: '根据商品名称进行搜索',
    example: 'iphone 17',
  })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({
    description: '分页页码',
    example: 1,
    default: 1,
    minimum: 1,
  })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @IsOptional()
  page: number = 1;

  @ApiPropertyOptional({
    description: '分页大小',
    example: 10,
    default: 10,
    minimum: 1,
  })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @IsOptional()
  limit: number = 10;
}
