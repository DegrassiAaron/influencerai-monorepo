import { AuthService } from './auth.service';

describe('AuthService - magic login', () => {
  const prisma: any = { user: { findFirst: jest.fn() } };
  const jwt: any = { signAsync: jest.fn() };
  let service: AuthService;
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    prisma.user.findFirst.mockReset();
    jwt.signAsync.mockReset();
    service = new AuthService(prisma, jwt);
    process.env.NODE_ENV = 'test';
  });

  afterAll(() => {
    if (originalNodeEnv === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = originalNodeEnv;
    }
  });

  it('allows magic login outside production', async () => {
    const user = { id: 'user-1', tenantId: 'tenant-1', email: 'test@example.com', role: 'admin' };
    prisma.user.findFirst.mockResolvedValue(user);
    jwt.signAsync.mockResolvedValue('signed');

    await expect(service.loginWithMagicToken('tenant-1:test@example.com')).resolves.toEqual({ access_token: 'signed' });

    expect(prisma.user.findFirst).toHaveBeenCalledWith({ where: { tenantId: 'tenant-1', email: 'test@example.com' } });
    expect(jwt.signAsync).toHaveBeenCalledWith({ sub: 'user-1', tenantId: 'tenant-1', email: 'test@example.com', role: 'admin' });
  });

  it('blocks magic login in production', async () => {
    process.env.NODE_ENV = 'production';

    await expect(service.loginWithMagicToken('tenant-1:test@example.com')).rejects.toThrow(
      'Magic login is disabled in production',
    );

    expect(prisma.user.findFirst).not.toHaveBeenCalled();
    expect(jwt.signAsync).not.toHaveBeenCalled();
  });
});
