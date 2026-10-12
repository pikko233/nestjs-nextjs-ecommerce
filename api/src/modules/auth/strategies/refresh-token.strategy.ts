import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/prisma/prisma.service.js';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { Request } from 'express';
import type { JwtPayload } from './jwt.strategy.js';
import { hashRefreshToken } from '../token-hash.util.js';
import { JWT_REFRESH_SECRET_FALLBACK } from '../constants.js';

@Injectable()
export class RefreshTokenStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor(
    private prisma: PrismaService,
    configService: ConfigService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey:
        configService.get<string>('JWT_REFRESH_SECRET') ??
        JWT_REFRESH_SECRET_FALLBACK,
      passReqToCallback: true,
    });
  }

  // passReqToCallback: true 时第一个参数才是 req
  async validate(req: Request, payload: JwtPayload) {
    const refreshToken = ExtractJwt.fromAuthHeaderAsBearerToken()(req);

    if (!refreshToken) {
      throw new UnauthorizedException('缺少 refresh token');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        role: true,
        refreshToken: true,
      },
    });

    // 库里存的是哈希，拿请求里的原文哈希后比对
    if (
      !user?.refreshToken ||
      user.refreshToken !== hashRefreshToken(refreshToken)
    ) {
      throw new UnauthorizedException('refresh token 已失效，请重新登录');
    }

    const { refreshToken: _stored, ...safeUser } = user;
    return { ...safeUser, refreshToken };
  }
}
