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

  describe('root', () => {
    it('should return the login page HTML', () => {
      const html = appController.getLoginPage();
      expect(html).toContain('<!doctype html>');
      expect(html).toContain('Sign in');
      expect(html).toContain('Deploy #2');
    });
  });
});
