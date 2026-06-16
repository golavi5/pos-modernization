import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  /**
   * Liveness — process is up. No external dependencies. Wired to the container /
   * Coolify healthcheck, so it must NOT depend on the DB (a transient DB blip
   * shouldn't flip the backend "unhealthy"). Readiness lives at /health/ready.
   */
  @Get('health')
  getHealth(): { status: string; timestamp: string } {
    return this.appService.getHealth();
  }

  /**
   * Readiness — process AND its dependencies (DB) are reachable. For dashboards/
   * monitoring; NOT wired to the restart healthcheck. Returns 503 if the DB ping
   * fails.
   */
  @Get('health/ready')
  async getReadiness(): Promise<{
    status: string;
    db: string;
    timestamp: string;
  }> {
    try {
      await this.dataSource.query('SELECT 1');
    } catch {
      throw new ServiceUnavailableException({
        status: 'unavailable',
        db: 'down',
        timestamp: new Date().toISOString(),
      });
    }
    return {
      status: 'ready',
      db: 'up',
      timestamp: new Date().toISOString(),
    };
  }
}
