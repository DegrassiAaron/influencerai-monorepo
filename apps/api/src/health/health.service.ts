import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import Redis from 'ioredis';
import { StorageService } from '../storage/storage.service';

export interface CheckResult {
  status: 'ok' | 'error';
  latency_ms?: number;
  error?: string;
}

export interface HealthReport {
  status: 'ok' | 'error';
  timestamp: string;
  checks: {
    db: CheckResult;
    redis: CheckResult;
    minio: CheckResult;
  };
}

@Injectable()
export class HealthService {
  constructor(private readonly prisma: PrismaService, private readonly storage: StorageService) {}

  private async time<T>(fn: () => Promise<T>): Promise<{ ms: number; error?: Error }>
  {
    const start = Date.now();
    try {
      await fn();
      return { ms: Date.now() - start };
    } catch (e: any) {
      return { ms: Date.now() - start, error: e instanceof Error ? e : new Error(String(e)) };
    }
  }

  async checkDb(): Promise<CheckResult> {
    const { ms, error } = await this.time(async () => {
      // lightweight ping
      await this.prisma.$queryRaw`SELECT 1`;
    });
    return error ? { status: 'error', latency_ms: ms, error: error.message } : { status: 'ok', latency_ms: ms };
  }

  async checkRedis(): Promise<CheckResult> {
    const url = process.env.REDIS_URL || 'redis://localhost:6379';
    const { ms, error } = await this.time(async () => {
      const client = new Redis(url, { lazyConnect: true, maxRetriesPerRequest: 1, connectTimeout: 2000 });
      try {
        await client.connect();
        await client.ping();
      } finally {
        client.disconnect();
      }
    });
    return error ? { status: 'error', latency_ms: ms, error: error.message } : { status: 'ok', latency_ms: ms };
  }

  async checkMinio(): Promise<CheckResult> {
    const { ms, error } = await this.time(async () => {
      await this.storage.ensureBucket();
    });
    return error ? { status: 'error', latency_ms: ms, error: error.message } : { status: 'ok', latency_ms: ms };
  }

  async health(): Promise<HealthReport> {
    const [db, redis, minio] = await Promise.all([this.checkDb(), this.checkRedis(), this.checkMinio()]);
    const status: 'ok' | 'error' = [db, redis, minio].some((c) => c.status === 'error') ? 'error' : 'ok';
    return { status, timestamp: new Date().toISOString(), checks: { db, redis, minio } };
  }
}

