import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { RegisterDto } from './dto/register.dto.js';
import { AuthResponseDto } from './dto/auth-response.dto.js';
import { RefreshTokenGuard } from './guards/refresh-token.guard.js';
import { GetUser } from '@/common/decorators/get-user.decorator.js';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard.js';
import { LoginDto } from './dto/login.dto.js';
import { LogoutResponseDto } from './dto/logout-response.dto.js';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

@ApiTags('身份认证')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // 用户注册账号
  @Post('register')
  @HttpCode(201)
  @ApiOperation({
    summary: '注册',
    description: '创建一个新的用户账号',
  })
  @ApiResponse({
    status: 201,
    description: '注册成功',
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: '请求参数校验失败',
  })
  @ApiResponse({
    status: 409,
    description: '该邮箱已被注册',
  })
  @ApiResponse({
    status: 500,
    description: '网络错误',
  })
  @ApiResponse({
    status: 429,
    description: '请求过于频繁，请稍后再试',
  })
  async register(@Body() registerDto: RegisterDto): Promise<AuthResponseDto> {
    return await this.authService.register(registerDto);
  }

  // 刷新token
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RefreshTokenGuard)
  @ApiBearerAuth('JWT-refresh')
  @ApiOperation({
    summary: '刷新访问令牌(accessToken)',
    description: '使用 refreshToken 去生成一个新的 accessToken',
  })
  @ApiResponse({
    status: 200,
    description: '访问令牌生成成功',
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: '用户未登录',
  })
  @ApiResponse({
    status: 429,
    description: '请求过于频繁，请稍后再试',
  })
  async refresh(@GetUser('id') userId: string): Promise<AuthResponseDto> {
    return await this.authService.refreshTokens(userId);
  }

  // 退出登录
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: '退出登录',
    description: '用户退出登录',
  })
  @ApiResponse({
    status: 200,
    description: '退出登录成功',
    type: LogoutResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: '用户未登录',
  })
  @ApiResponse({
    status: 429,
    description: '请求过于频繁，请稍后再试',
  })
  async logout(@GetUser('id') userId: string): Promise<LogoutResponseDto> {
    await this.authService.logout(userId);

    return {
      message: '退出登录成功',
    };
  }

  // 登录
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '登录',
    description: '用户登录',
  })
  @ApiResponse({
    status: 200,
    description: '登录成功',
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: '请求参数校验失败',
  })
  @ApiResponse({
    status: 401,
    description: '用户名或密码错误',
  })
  @ApiResponse({
    status: 429,
    description: '请求过于频繁，请稍后再试',
  })
  async login(@Body() loginDto: LoginDto): Promise<AuthResponseDto> {
    return this.authService.login(loginDto);
  }
}
