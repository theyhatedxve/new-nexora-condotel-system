
import 'dotenv/config';
import { isAbsolute } from 'node:path';
import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { PrismaClient } from '../generated/prisma/client.js';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    // Preserve the existing backend/dev.db default.
    // An explicit absolute override supports an isolated smoke-test database.
    const runtimeUrl = process.env.NEXORA_RUNTIME_DATABASE_URL;
    if (runtimeUrl && (!runtimeUrl.startsWith('file:') || !isAbsolute(runtimeUrl.slice(5)))) {
      throw new Error('NEXORA_RUNTIME_DATABASE_URL must use an absolute file: path.');
    }
    const adapter = new PrismaBetterSqlite3({ url: runtimeUrl ?? 'file:./dev.db' });

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
