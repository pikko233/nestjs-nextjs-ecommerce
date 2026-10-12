import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service.js';

// 全局模块：业务模块无需再 import 即可注入 PrismaService
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
