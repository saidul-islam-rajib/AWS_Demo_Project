import { Controller, Get, Header } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @Header('Content-Type', 'text/html')
  getBlogPage(): string {
    return this.appService.getBlogPage();
  }

  @Get('login')
  @Header('Content-Type', 'text/html')
  getLoginPage(): string {
    return this.appService.getLoginPage();
  }

  @Get('health')
  getHealth(): { status: string; uptime: number } {
    return { status: 'ok', uptime: Math.floor(process.uptime()) };
  }
}
