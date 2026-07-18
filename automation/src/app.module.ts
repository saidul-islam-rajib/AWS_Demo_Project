import { Module } from '@nestjs/common';
import { PostsController } from './posts/posts.controller';
import { AdminController } from './posts/admin.controller';
import { UploadsController } from './uploads/uploads.controller';
import { SettingsController } from './settings/settings.controller';
import { AboutController } from './about/about.controller';
import { PostsService } from './posts/posts.service';
import { UploadsService } from './uploads/uploads.service';
import { SettingsService } from './settings/settings.service';
import { AboutService } from './about/about.service';
import { AuthService } from './auth/auth.service';

@Module({
  imports: [],
  // Controllers with fixed paths are listed before PostsController, whose
  // parameterised routes would otherwise swallow them.
  controllers: [
    SettingsController,
    AboutController,
    AdminController,
    UploadsController,
    PostsController,
  ],
  providers: [
    PostsService,
    UploadsService,
    SettingsService,
    AboutService,
    AuthService,
  ],
})
export class AppModule {}
