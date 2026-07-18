import { Injectable } from '@nestjs/common';
import { blogPage } from './pages/blog.page';
import { loginPage } from './pages/login.page';

@Injectable()
export class AppService {
  getBlogPage(): string {
    return blogPage();
  }

  getLoginPage(): string {
    return loginPage();
  }
}
