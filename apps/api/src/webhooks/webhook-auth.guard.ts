import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'node:crypto';
import type { AppConfig } from '../config/env.validation';

const HEADER_PIPELINE_TOKEN = 'x-pipeline-token';
const HEADER_WEBHOOK_SECRET = 'x-webhook-secret';

@Injectable()
export class PipelineWebhookAuthGuard implements CanActivate {
  constructor(private readonly config: ConfigService<AppConfig, true>) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const secret = this.config.get('PIPELINE_WEBHOOK_SECRET', { infer: true });

    if (!secret || secret.trim().length === 0) {
      throw new UnauthorizedException('Pipeline webhook secret not configured');
    }

    const candidates = new Set<string>();
    const headerToken = request.headers[HEADER_PIPELINE_TOKEN];
    if (typeof headerToken === 'string') {
      candidates.add(headerToken.trim());
    } else if (Array.isArray(headerToken) && headerToken.length > 0) {
      candidates.add(headerToken[0]?.trim());
    }

    const altHeader = request.headers[HEADER_WEBHOOK_SECRET];
    if (typeof altHeader === 'string') {
      candidates.add(altHeader.trim());
    } else if (Array.isArray(altHeader) && altHeader.length > 0) {
      candidates.add(altHeader[0]?.trim());
    }

    const authorization = request.headers.authorization;
    if (typeof authorization === 'string') {
      if (authorization.startsWith('Bearer ')) {
        candidates.add(authorization.slice(7).trim());
      } else {
        candidates.add(authorization.trim());
      }
    }

    const queryToken =
      typeof request.query?.token === 'string' ? (request.query.token as string).trim() : undefined;
    if (queryToken) {
      candidates.add(queryToken);
    }

    for (const candidate of candidates) {
      if (this.matches(secret, candidate)) {
        return true;
      }
    }

    throw new UnauthorizedException('Invalid pipeline webhook credentials');
  }

  private matches(secret: string, candidate: string | undefined): boolean {
    if (!candidate) return false;
    const secretBuffer = Buffer.from(secret, 'utf8');
    const candidateBuffer = Buffer.from(candidate, 'utf8');
    if (secretBuffer.length !== candidateBuffer.length) {
      return false;
    }
    try {
      return timingSafeEqual(secretBuffer, candidateBuffer);
    } catch {
      return false;
    }
  }
}
