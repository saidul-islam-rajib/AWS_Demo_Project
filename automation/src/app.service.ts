import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return 'Hello from Jenkins CI/CD! Deploy #1';
  }
}
