import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateContentPlanDto, ContentPlanResponse } from './dto';
import { fetchWithTimeout, HTTPError, parseRetryAfter, shouldRetry, backoffDelay, sleep } from '../lib/http-utils';

// Minimal local prompt to avoid build coupling; align with @influencerai/prompts
function contentPlanPrompt(persona: string, theme: string) {
  return `You are helping create a content plan for a virtual influencer with the following persona:\n${persona}\n\nTheme: ${theme}\n\nGenerate 3-5 post ideas with captions and hashtags suitable for Instagram, TikTok, and YouTube Shorts.\nReturn the response as a JSON array with this structure:\n[ { \"caption\": \"engaging caption text\", \"hashtags\": [\"tag1\", \"tag2\"] } ]`;
}

@Injectable()
export class ContentPlansService {
  constructor(private readonly prisma: PrismaService) {}

  // Extracted so tests can mock only this part
  async generatePlanPosts(persona: string, theme: string): Promise<{ caption: string; hashtags: string[] }[]> {
    const prompt = contentPlanPrompt(persona, theme);
    const apiKey = process.env.OPENROUTER_API_KEY || '';
    const url = 'https://openrouter.ai/api/v1/chat/completions';

    const maxAttempts = Number(process.env.OPENROUTER_MAX_RETRIES || 3);
    const timeoutMs = Number(process.env.OPENROUTER_TIMEOUT_MS || 60000);
    const backoffBaseMs = Number(process.env.OPENROUTER_BACKOFF_BASE_MS || 250);
    const backoffJitterMs = Number(process.env.OPENROUTER_BACKOFF_JITTER_MS || 100);
    let attempt = 0;
    let lastError: any = null;
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

        if (!(res as any).ok) {
          const status = (res as any).status ?? 500;
          const body = await safeReadBody(res);
          if (shouldRetry(status) && attempt < maxAttempts) {
            const ra = parseRetryAfter((res as any).headers?.get?.('Retry-After'));
            const delay = Math.max(ra ?? 0, backoffDelay(attempt, backoffBaseMs, backoffJitterMs));
            await sleep(delay);
            continue;
          }
          throw new HTTPError('OpenRouter request failed', { status, body, url, method: 'POST' });
        }

        const data = await (res as any).json();
        // Token usage logging if provided
        try {
          const usage = (data as any)?.usage;
          if (usage) console.info('[OpenRouter] usage', usage);
        } catch {}

        const text: string = data?.choices?.[0]?.message?.content || '[]';
        let posts: any = [];
        try { posts = JSON.parse(text); } catch { posts = []; }
        if (!Array.isArray(posts)) posts = [];
        // validate/normalize
        const normalized = posts.map((p: any) => ({ caption: String(p?.caption ?? ''), hashtags: Array.isArray(p?.hashtags) ? p.hashtags.map(String) : [] }));
        if (!Array.isArray(normalized)) {
          console.warn('[OpenRouter] invalid posts structure, defaulting to empty array');
          return [];
        }
        return normalized;
      } catch (err: any) {
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
        type: 'content-plan' as any,
        status: 'completed',
        payload: { influencerId: input.influencerId, tenantId: infl.tenantId, theme: input.theme, targetPlatforms: plan.targetPlatforms } as any,
        result: plan as any,
        finishedAt: new Date(),
      },
    });

    return { id: job.id, plan };
  }

  async getPlan(id: string): Promise<{ id: string; plan: ContentPlanResponse } | null> {
    const job = await this.prisma.job.findUnique({ where: { id } });
    if (!job || job.type !== ('content-plan' as any)) return null;
    const plan = (job.result as any) as ContentPlanResponse;
    return { id: job.id, plan };
  }

  async listPlans(params: { influencerId?: string; take?: number; skip?: number }): Promise<{ id: string; plan: ContentPlanResponse }[]> {
    const jobs = await this.prisma.job.findMany({
      where: {
        type: 'content-plan' as any,
        ...(params.influencerId ? { payload: { path: ['influencerId'], equals: params.influencerId } as any } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: params.take ?? 20,
      skip: params.skip ?? 0,
    });
    return jobs.map((j: any) => ({ id: j.id, plan: (j.result as any) as ContentPlanResponse }));
  }
}

async function safeReadBody(res: any) {
  try {
    const ct = res.headers?.get?.('content-type') || '';
    if (ct.includes('application/json')) return await res.json();
    return await res.text();
  } catch {
    return null;
  }
}
