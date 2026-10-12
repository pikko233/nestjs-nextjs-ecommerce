import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { RegisterDto } from './dto/register.dto.js';
import { AuthResponseDto } from './dto/auth-response.dto.js';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { hashRefreshToken } from './token-hash.util.js';
import { JWT_REFRESH_SECRET_FALLBACK } from './constants.js';
import { LoginDto } from './dto/login.dto.js';

// 返回给前端的用户字段，不含密码、refreshToken 等敏感信息
const AUTH_USER_SELECT = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  role: true,
} as const;

@Injectable()
export class AuthService {
  private readonly SALT_ROUNDS = 10; // bcrypt计算强度
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  // 用户注册
  async register(registerDto: RegisterDto): Promise<AuthResponseDto> {
    const { email, password, firstName, lastName } = registerDto;

    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    // 该email已被注册
    if (existingUser) {
      throw new ConflictException('该邮箱已被别人注册');
    }

    try {
      const hashedPassword = await bcrypt.hash(password, this.SALT_ROUNDS);

      const user = await this.prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          firstName,
          lastName,
        },
        select: AUTH_USER_SELECT,
      });

      const tokens = await this.generateTokens(user.id, user.email);

      await this.updateRefreshToken(user.id, tokens.refreshToken);

      return {
        ...tokens,
        user,
      };
    } catch (error) {
      console.error('注册失败: ', error);
      throw new InternalServerErrorException('注册失败，请稍后再试~');
    }
  }

  // 生成 accessToken 和 refreshToken
  private async generateTokens(
    userId: string,
    email: string,
  ): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    const payload = { sub: userId, email };
    const refreshId = randomBytes(16).toString('hex');
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, { expiresIn: '15m' }),
      // refresh token 必须用独立密钥签发，与 RefreshTokenStrategy 的验签保持一致
      this.jwtService.signAsync(
        { ...payload, refreshId },
        {
          secret:
            this.configService.get<string>('JWT_REFRESH_SECRET') ??
            JWT_REFRESH_SECRET_FALLBACK,
          expiresIn: '7d',
        },
      ),
    ]);

    return { accessToken, refreshToken };
  }

  // 更新数据库中对应用户的refreshToken（只存哈希，不存原文）
  async updateRefreshToken(userId: string, refreshToken: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        refreshToken: hashRefreshToken(refreshToken),
      },
    });
  }

  // 刷新 accessToken
  async refreshTokens(userId: string): Promise<AuthResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: AUTH_USER_SELECT,
    });

    if (!user) {
      throw new UnauthorizedException('用户不存在');
    }

    const tokens = await this.generateTokens(user.id, user.email);

    await this.updateRefreshToken(user.id, tokens.refreshToken);

    return {
      ...tokens,
      user,
    };
  }

  // 退出登录
  async logout(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        refreshToken: null,
      },
    });
  }

  // 登录
  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    const { email, password } = loginDto;

    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { ...AUTH_USER_SELECT, password: true },
    });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      throw new UnauthorizedException('用户名或密码错误');
    }

    // 密码哈希只用于校验，不能返回给前端
    const { password: _password, ...authUser } = user;

    const tokens = await this.generateTokens(authUser.id, authUser.email);

    await this.updateRefreshToken(authUser.id, tokens.refreshToken);

    return {
      ...tokens,
      user: authUser,
    };
  }
}
