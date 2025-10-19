import { UnauthorizedException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { PipelineWebhookAuthGuard } from './webhook-auth.guard';
import type { ExecutionContext } from '@nestjs/common';

const createExecutionContext = (request: Record<string, any>): ExecutionContext =>
  ({
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  }) as ExecutionContext;

describe('PipelineWebhookAuthGuard', () => {
  const secret = 'super-secret';
  let guard: PipelineWebhookAuthGuard;
  let configGetSpy: jest.SpyInstance;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        PipelineWebhookAuthGuard,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'PIPELINE_WEBHOOK_SECRET') {
                return secret;
              }
              return undefined;
            }),
          },
        },
      ],
    }).compile();

    guard = moduleRef.get(PipelineWebhookAuthGuard);
    const configService = moduleRef.get<ConfigService>(ConfigService);
    configGetSpy = jest.spyOn(configService, 'get');
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('throws when secret is not configured', () => {
    configGetSpy.mockReturnValueOnce('');
    const context = createExecutionContext({ headers: {} });
    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });

  it('allows request with matching x-pipeline-token header', () => {
    const context = createExecutionContext({
      headers: { 'x-pipeline-token': secret },
    });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('allows request with matching Bearer token', () => {
    const context = createExecutionContext({
      headers: { authorization: `Bearer ${secret}` },
    });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('rejects request with invalid token', () => {
    const context = createExecutionContext({
      headers: { 'x-pipeline-token': 'invalid' },
    });

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });
});
