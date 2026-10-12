import { Module } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { AuthController } from './auth.controller.js';
import { JwtModule, type JwtSignOptions } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { JwtStrategy } from './strategies/jwt.strategy.js';
import { RefreshTokenStrategy } from './strategies/refresh-token.strategy.js';

@Module({
  imports: [
    PassportModule.register({
      defaultStrategy: 'jwt-auth',
    }),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        // 缺少 JWT_SECRET 时直接抛错，让服务启动失败，避免使用可预测的密钥
        secret: configService.getOrThrow<string>('JWT_SECRET'),
        signOptions: {
          expiresIn:
            configService.get<NonNullable<JwtSignOptions['expiresIn']>>(
              'JWT_EXPIRES_IN',
            ) ?? '600s',
        },
      }),
    }),
  ],
  providers: [AuthService, JwtStrategy, RefreshTokenStrategy],
  controllers: [AuthController],
})
export class AuthModule {}
