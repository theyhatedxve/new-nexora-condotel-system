
import 'dotenv/config';
import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { PrismaClient } from '../generated/prisma/client.js';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    // Prisma CLI resolves file:./dev.db relative to prisma/schema.prisma.
    // The runtime adapter resolves its URL from the process directory.
    // NestJS runs from backend/, so specify prisma/dev.db explicitly.
    const adapter = new PrismaBetterSqlite3({
      url: 'file:./dev.db',
    });

    super({ adapter });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
    await this.$queryRaw`SELECT 1`;
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
