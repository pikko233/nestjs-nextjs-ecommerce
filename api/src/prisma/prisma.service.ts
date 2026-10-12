import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    const adapter = new PrismaPg({
      connectionString: process.env.DATABASE_URL,
    });
    super({
      adapter,
      log:
        process.env.NODE_ENV === 'development'
          ? ['query', 'error', 'warn']
          : ['error'],
    });
  }

  async onModuleInit() {
    await this.$connect();
    console.log('数据库连接成功~');
  }

  async onModuleDestroy() {
    await this.$disconnect();
    console.log('数据库连接已断开!');
  }

  async clearDatabase() {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('禁止清除线上数据库!');
    }

    const tables = await this.$queryRaw<{ tablename: string }[]>`
      SELECT tablename FROM pg_tables WHERE schemaname = 'public'
    `;

    const targets = tables
      .map(({ tablename }) => tablename)
      .filter((name) => name !== '_prisma_migrations')
      .map((name) => `"public"."${name}"`);

    if (targets.length === 0) return;

    // CASCADE 让 Postgres 自行处理外键依赖顺序
    await this.$executeRawUnsafe(
      `TRUNCATE TABLE ${targets.join(', ')} CASCADE`,
    );
  }
}
