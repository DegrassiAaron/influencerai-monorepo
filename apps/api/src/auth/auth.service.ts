import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService, private readonly jwt: JwtService) {}

  async validateUser(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new UnauthorizedException('Invalid credentials');
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Invalid credentials');
    return user;
  }

  async loginWithPassword(email: string, password: string) {
    const user = await this.validateUser(email, password);
    const payload = { sub: user.id, tenantId: user.tenantId, email: user.email, role: user.role };
    const access_token = await this.jwt.signAsync(payload);
    return { access_token };
  }

  isMagicLoginEnabled() {
    return process.env.NODE_ENV !== 'production';
  }

  async loginWithMagicToken(token: string) {
    if (!this.isMagicLoginEnabled()) {
      throw new UnauthorizedException('Magic login is disabled in production');
    }
    // For dev only: token format tenantId:email
    const [tenantId, email] = String(token || '').split(':');
    if (!tenantId || !email) throw new UnauthorizedException('Invalid token');
    const user = await this.prisma.user.findFirst({ where: { tenantId, email } });
    if (!user) throw new UnauthorizedException('Invalid token');
    const payload = { sub: user.id, tenantId: user.tenantId, email: user.email, role: user.role };
    const access_token = await this.jwt.signAsync(payload);
    return { access_token };
  }
}

