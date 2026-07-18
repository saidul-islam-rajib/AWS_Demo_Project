import { Module } from '@nestjs/common';
import { PostsController } from './posts/posts.controller';
import { AdminController } from './posts/admin.controller';
import { UploadsController } from './uploads/uploads.controller';
import { ImagesController } from './uploads/images.controller';
import { SettingsController } from './settings/settings.controller';
import { AboutController } from './about/about.controller';
import { ProjectsController } from './projects/projects.controller';
import { SeoController } from './seo/seo.controller';
import { PostsService } from './posts/posts.service';
import { UploadsService } from './uploads/uploads.service';
import { ImagesService } from './uploads/images.service';
import { SettingsService } from './settings/settings.service';
import { AboutService } from './about/about.service';
import { ProjectsService } from './projects/projects.service';
import { AuthService } from './auth/auth.service';
import { LoginThrottleService } from './auth/login-throttle.service';

@Module({
  imports: [],
  // Controllers with fixed paths are listed before PostsController, whose
  // parameterised routes would otherwise swallow them.
  controllers: [
    SettingsController,
    AboutController,
    ProjectsController,
    SeoController,
    AdminController,
    UploadsController,
    ImagesController,
    PostsController,
  ],
  providers: [
    PostsService,
    UploadsService,
    ImagesService,
    SettingsService,
    AboutService,
    ProjectsService,
    AuthService,
    LoginThrottleService,
  ],
})
export class AppModule {}
