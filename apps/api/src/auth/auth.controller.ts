import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { Public } from './public.decorator';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('login')
  async login(@Body() body: any) {
    const email = String(body?.email || '');
    const password = String(body?.password || '');
    const magic = String(body?.magic || '');
    if (magic) return this.auth.loginWithMagicToken(magic);
    return this.auth.loginWithPassword(email, password);
  }
}

