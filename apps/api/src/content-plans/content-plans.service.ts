import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateContentPlanDto, ContentPlanResponse } from './dto';
import { fetchWithTimeout, HTTPError, parseRetryAfter, shouldRetry, backoffDelay, sleep } from '../lib/http-utils';
import { OpenRouterResponseSchema } from '../types/openrouter';
import { ContentPlanDataSchema } from '../types/content';
import { LoggerService, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppConfig } from '../config/env.validation';

// Minimal local prompt to avoid build coupling; align with @influencerai/prompts
function contentPlanPrompt(persona: string, theme: string) {
  return `You are helping create a content plan for a virtual influencer with the following persona:\n${persona}\n\nTheme: ${theme}\n\nGenerate 3-5 post ideas with captions and hashtags suitable for Instagram, TikTok, and YouTube Shorts.\nReturn the response as a JSON array with this structure:\n[ { \"caption\": \"engaging caption text\", \"hashtags\": [\"tag1\", \"tag2\"] } ]`;
}

@Injectable()
export class ContentPlansService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<AppConfig, true>,
    @Optional() private readonly logger?: LoggerService,
  ) {}

  // Extracted so tests can mock only this part
  async generatePlanPosts(persona: string, theme: string): Promise<{ caption: string; hashtags: string[] }[]> {
    const prompt = contentPlanPrompt(persona, theme);
    const apiKey = this.config.get('OPENROUTER_API_KEY', { infer: true });
    const url = 'https://openrouter.ai/api/v1/chat/completions';

    const maxAttempts = this.config.get('OPENROUTER_MAX_RETRIES', { infer: true });
    const timeoutMs = this.config.get('OPENROUTER_TIMEOUT_MS', { infer: true });
    const backoffBaseMs = this.config.get('OPENROUTER_BACKOFF_BASE_MS', { infer: true });
    const backoffJitterMs = this.config.get('OPENROUTER_BACKOFF_JITTER_MS', { infer: true });
    let attempt = 0;
    let lastError: unknown = null;
    while (attempt < maxAttempts) {
      attempt += 1;
      try {
        const res = await fetchWithTimeout(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: 'openrouter/auto',
            messages: [
              { role: 'system', content: 'You are a helpful assistant that returns strict JSON.' },
              { role: 'user', content: prompt },
            ],
            response_format: { type: 'json_object' },
          }),
        }, timeoutMs);

        if (!res.ok) {
          const status = res.status ?? 500;
          const body = await safeReadBody(res);
          if (shouldRetry(status) && attempt < maxAttempts) {
            const ra = parseRetryAfter(res.headers?.get?.('Retry-After'));
            const delay = Math.max(ra ?? 0, backoffDelay(attempt, backoffBaseMs, backoffJitterMs));
            await sleep(delay);
            continue;
          }
          throw new HTTPError('OpenRouter request failed', { status, body, url, method: 'POST' });
        }

        const raw = await res.json();
        const parsed = OpenRouterResponseSchema.safeParse(raw);
        if (!parsed.success) {
          throw new HTTPError('OpenRouter invalid response shape', { status: 502, body: raw, url, method: 'POST' });
        }
        const data = parsed.data;
        try {
          const usage = data.usage;
          if (usage) this.logger?.debug?.({ usage } as any, 'OpenRouter usage');
        } catch {}

        const text = data.choices?.[0]?.message?.content ?? '[]';
        let normalized: { caption: string; hashtags: string[] }[] = [];
        try {
          const json = JSON.parse(text);
          const posts = ContentPlanDataSchema.safeParse(json);
          if (posts.success) {
            normalized = posts.data.map((p) => ({ caption: p.caption, hashtags: p.hashtags }));
          } else {
            this.logger?.warn?.('OpenRouter posts validation failed, defaulting to empty array');
            normalized = [];
          }
        } catch {
          this.logger?.warn?.('OpenRouter response content is not valid JSON array, defaulting to empty array');
          normalized = [];
        }
        return normalized;
      } catch (err: unknown) {
        lastError = err;
        // Network/timeout errors: retry until attempts exhausted
        if (attempt < maxAttempts) {
          await sleep(backoffDelay(attempt, backoffBaseMs, backoffJitterMs));
          continue;
        }
        throw err;
      }
    }
    // Fallback, should not reach
    if (lastError) throw lastError;
    return [];
  }

  async createPlan(input: CreateContentPlanDto): Promise<{ id: string; plan: ContentPlanResponse }> {
    const infl = await this.prisma.influencer.findUnique({ where: { id: input.influencerId } });
    if (!infl) throw new NotFoundException('Influencer not found');

    const posts = await this.generatePlanPosts(JSON.stringify(infl.persona ?? {}), input.theme);
    const createdAt = new Date().toISOString();
    const plan: ContentPlanResponse = {
      influencerId: input.influencerId,
      theme: input.theme,
      targetPlatforms: input.targetPlatforms ?? ['instagram'],
      posts,
      createdAt,
    };

    const job = await this.prisma.job.create({
      data: {
        type: 'content-plan',
        status: 'completed',
        payload: {
          influencerId: input.influencerId,
          tenantId: infl.tenantId,
          theme: input.theme,
          targetPlatforms: plan.targetPlatforms,
        } as unknown as Record<string, unknown>,
        result: plan as unknown as Record<string, unknown>,
        finishedAt: new Date(),
      },
    });

    return { id: job.id, plan };
  }

  async getPlan(id: string): Promise<{ id: string; plan: ContentPlanResponse } | null> {
    const job = await this.prisma.job.findUnique({ where: { id } });
    if (!job || job.type !== 'content-plan') return null;
    const plan = job.result as unknown as ContentPlanResponse;
    return { id: job.id, plan };
  }

  async listPlans(params: { influencerId?: string; take?: number; skip?: number }): Promise<{ id: string; plan: ContentPlanResponse }[]> {
    const where: Record<string, unknown> = { type: 'content-plan' };
    if (params.influencerId) {
      where.payload = { path: ['influencerId'], equals: params.influencerId };
    }

    const jobs = await this.prisma.job.findMany({
      where: where as any,
      orderBy: { createdAt: 'desc' },
      take: params.take ?? 20,
      skip: params.skip ?? 0,
    });
    return jobs.map((job: { id: string; result: unknown }) => ({
      id: job.id,
      plan: job.result as unknown as ContentPlanResponse,
    }));
  }
}

async function safeReadBody(res: Response) {
  try {
    const ct = res.headers?.get?.('content-type') || '';
    if (ct.includes('application/json')) return await res.json();
    return await res.text();
  } catch {
    return null;
  }
}
