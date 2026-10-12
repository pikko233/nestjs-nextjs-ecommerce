import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiExtraModels,
  ApiOperation,
  ApiResponse,
  ApiTags,
  getSchemaPath,
} from '@nestjs/swagger';
import { ProductService } from './product.service.js';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard.js';
import { RolesGuard } from '@/common/guards/roles.guard.js';
import { Roles } from '@/common/decorators/roles.decorator.js';
import { Role } from '@prisma/client';
import { ProductResponseDto } from './dto/product-response.dto.js';
import { CreateProductDto } from './dto/create-product.dto.js';
import { QueryProductDto } from './dto/query-product.dto.js';
import { UpdateProductDto } from './dto/update-product.dto.js';
import { UpdateStockDto } from './dto/update-stock.dto.js';

@ApiTags('商品')
@Controller('product')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: '创建商品' })
  @ApiResponse({
    status: 200,
    description: '商品创建成功',
    type: ProductResponseDto,
  })
  @ApiBody({
    type: CreateProductDto,
  })
  async create(
    @Body() createProductDto: CreateProductDto,
  ): Promise<ProductResponseDto> {
    return await this.productService.create(createProductDto);
  }

  @Get()
  @ApiOperation({ summary: '获取所有商品' })
  @ApiExtraModels(ProductResponseDto)
  @ApiResponse({
    status: 200,
    description: '商品列表获取成功',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: { $ref: getSchemaPath(ProductResponseDto) },
        },
        meta: {
          type: 'object',
          properties: {
            total: { type: 'number' },
            page: { type: 'number' },
            limit: { type: 'number' },
            totalPages: { type: 'number' },
          },
        },
      },
    },
  })
  async findAll(@Query() queryDto: QueryProductDto) {
    return await this.productService.findAll(queryDto);
  }

  @Get(':id')
  @ApiOperation({ summary: '根据 ID 获取商品' })
  @ApiResponse({
    status: 200,
    description: '商品获取成功',
    type: ProductResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: '未找到该商品',
  })
  async findOne(@Param('id') id: string): Promise<ProductResponseDto> {
    return await this.productService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: '修改商品信息' })
  @ApiBody({
    type: UpdateProductDto,
  })
  @ApiResponse({
    status: 200,
    description: '商品信息修改成功',
    type: ProductResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: '用户未登录',
  })
  @ApiResponse({
    status: 404,
    description: '商品不存在或已下架',
  })
  @ApiResponse({
    status: 409,
    description: 'SKU 重复',
  })
  async update(
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto,
  ): Promise<ProductResponseDto> {
    return await this.productService.update(id, updateProductDto);
  }

  @Patch(':id/stock')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: '根据商品 ID 修改库存' })
  @ApiBody({
    type: UpdateStockDto,
  })
  @ApiResponse({
    status: 200,
    description: '商品库存修改成功',
    type: ProductResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: '库存数量非法',
  })
  @ApiResponse({
    status: 404,
    description: '商品不存在',
  })
  async updateStock(
    @Param('id') id: string,
    @Body() { quantity }: UpdateStockDto,
  ): Promise<ProductResponseDto> {
    return await this.productService.updateStock(id, quantity);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '删除商品' })
  @ApiResponse({
    status: 200,
    description: '商品删除成功',
  })
  @ApiResponse({
    status: 400,
    description: '删除失败',
  })
  @ApiResponse({
    status: 404,
    description: '商品不存在',
  })
  async delete(@Param('id') id: string): Promise<{ message: string }> {
    return await this.productService.remove(id);
  }
}
