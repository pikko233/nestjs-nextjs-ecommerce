import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard.js';
import { RolesGuard } from '@/common/guards/roles.guard.js';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { UserService } from './user.service.js';
import { UserResponseDto } from './dto/user-response.dto.js';
import type { RequestWithUser } from '@/common/interfaces/request-with-user.interface.js';
import { Roles } from '@/common/decorators/roles.decorator.js';
import { Role } from '@prisma/client';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { GetUser } from '@/common/decorators/get-user.decorator.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';

@ApiTags('用户')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('me')
  @ApiOperation({ summary: '获取当前用户信息' })
  @ApiResponse({
    status: 200,
    description: '用户信息',
    type: UserResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: '用户未登录',
  })
  async getProfile(@Req() req: RequestWithUser): Promise<UserResponseDto> {
    return await this.userService.findOne(req.user.id);
  }

  @Get()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: '获取所有用户信息' })
  @ApiResponse({
    status: 200,
    description: '用户列表',
    type: [UserResponseDto],
  })
  @ApiResponse({ status: 401, description: '用户未登录' })
  async findAll(): Promise<UserResponseDto[]> {
    return await this.userService.findAll();
  }

  @Get(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: '根据id获取指定用户信息' })
  @ApiResponse({
    status: 200,
    description: '对应id的用户信息',
    type: UserResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: '用户未登录',
  })
  @ApiResponse({
    status: 404,
    description: '该用户不存在',
  })
  async getProfileById(@Param('id') id: string): Promise<UserResponseDto> {
    return await this.userService.findOne(id);
  }

  @Patch('me')
  @ApiOperation({ summary: '修改当前登录用户个人信息' })
  @ApiBody({
    type: UpdateUserDto,
  })
  @ApiResponse({
    status: 200,
    description: '更新成功',
  })
  @ApiResponse({
    status: 401,
    description: '用户未登录',
  })
  @ApiResponse({
    status: 409,
    description: '邮箱已存在',
  })
  async updateProfile(
    @GetUser('id') userId: string,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    return await this.userService.update(userId, updateUserDto);
  }

  @Patch('me/password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '修改密码' })
  @ApiResponse({
    status: 200,
    description: '密码修改成功',
  })
  @ApiResponse({
    status: 401,
    description: '用户未登录',
  })
  async changePassword(
    @GetUser('id') userId: string,
    @Body() changePasswordDto: ChangePasswordDto,
  ): Promise<{ message: string }> {
    return await this.userService.changePassword(userId, changePasswordDto);
  }

  @Delete('me')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '注销账号' })
  @ApiResponse({
    status: 200,
    description: '账号注销成功',
  })
  @ApiResponse({
    status: 401,
    description: '用户未登录',
  })
  async deleteAccount(
    @GetUser('id') userId: string,
  ): Promise<{ message: string }> {
    return await this.userService.remove(userId);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '根据用户ID删除对应的账户' })
  @ApiResponse({
    status: 200,
    description: '账号注销成功',
  })
  @ApiResponse({
    status: 401,
    description: '用户未登录',
  })
  @ApiResponse({ status: 403, description: '无权限' })
  async deleteAccountById(
    @Param('id') userId: string,
  ): Promise<{ message: string }> {
    return await this.userService.remove(userId);
  }
}
