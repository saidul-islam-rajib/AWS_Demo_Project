import { Module } from '@nestjs/common';
import { PostsController } from './posts/posts.controller';
import { AdminController } from './posts/admin.controller';
import { UploadsController } from './uploads/uploads.controller';
import { ImagesController } from './uploads/images.controller';
import { SettingsController } from './settings/settings.controller';
import { AboutController } from './about/about.controller';
import { ProjectsController } from './projects/projects.controller';
import { TutorialsController } from './tutorials/tutorials.controller';
import { TutorialsAdminController } from './tutorials/tutorials.admin.controller';
import { SeoController } from './seo/seo.controller';
import { PostsService } from './posts/posts.service';
import { UploadsService } from './uploads/uploads.service';
import { ImagesService } from './uploads/images.service';
import { SettingsService } from './settings/settings.service';
import { AboutService } from './about/about.service';
import { ProjectsService } from './projects/projects.service';
import { TutorialsService } from './tutorials/tutorials.service';
import { EnrolmentService } from './tutorials/enrolment.service';
import { AuthService } from './auth/auth.service';
import { LoginThrottleService } from './auth/login-throttle.service';

@Module({
  imports: [],
  controllers: [
    SettingsController,
    AboutController,
    ProjectsController,
    TutorialsAdminController,
    TutorialsController,
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
    TutorialsService,
    EnrolmentService,
    AuthService,
    LoginThrottleService,
  ],
})
export class AppModule {}
