import { JwtService } from '@nestjs/jwt';

const DEFAULT_SECRET = process.env.JWT_SECRET ?? 'dev_jwt_secret_change_me';
const jwtService = new JwtService({ secret: DEFAULT_SECRET });

const defaultPayload = {
  sub: 'user_test_1',
  tenantId: 'tenant_test_1',
  email: 'tester@example.com',
  role: 'admin' as const,
};

export function getAuthHeader(
  overrides: Partial<typeof defaultPayload> = {},
): Record<'Authorization', string> {
  const token = jwtService.sign({ ...defaultPayload, ...overrides });
  return { Authorization: `Bearer ${token}` };
}
