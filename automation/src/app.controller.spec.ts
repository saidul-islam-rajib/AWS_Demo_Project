import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('blog dashboard', () => {
    it('serves the blog page', () => {
      const html = appController.getBlogPage();
      expect(html).toContain('<!doctype html>');
      expect(html).toContain('Saidul Islam Rajib');
      expect(html).toContain('Engineering blog');
    });
  });

  describe('login page', () => {
    it('serves the login page', () => {
      const html = appController.getLoginPage();
      expect(html).toContain('<!doctype html>');
      expect(html).toContain('Welcome back');
    });
  });

  describe('health', () => {
    it('reports ok with an uptime', () => {
      const health = appController.getHealth();
      expect(health.status).toBe('ok');
      expect(typeof health.uptime).toBe('number');
    });
  });
});
