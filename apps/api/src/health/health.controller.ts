import { Controller, Get, HttpException, HttpStatus } from '@nestjs/common';
import { Public } from '../auth/public.decorator';
import { HealthService } from './health.service';

@Controller()
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get('healthz')
  @Public()
  async healthz() {
    return this.healthService.health();
  }

  @Get('readyz')
  @Public()
  async readyz() {
    const report = await this.healthService.health();
    if (report.status !== 'ok') {
      throw new HttpException(report, HttpStatus.SERVICE_UNAVAILABLE);
    }
    return report;
  }
}
