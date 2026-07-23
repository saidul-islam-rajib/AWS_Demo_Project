import { Module } from '@nestjs/common';
import { AssetsModule } from './shared/assets/assets.module';
import { ConfigService } from './shared/config/config.service';
import { ConfigController } from './shared/config/config.controller';
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
import { CertificatesService } from './tutorials/certificates.service';
import { ProgressService } from './tutorials/progress.service';
import { AccountsService } from './accounts/accounts.service';
import { AccountSessionService } from './accounts/account-session.service';
import { AccountResetService } from './accounts/account-reset.service';
import { AccountAssetsBootstrap } from './accounts/account.assets.bootstrap';
import { AccountsController } from './accounts/accounts.controller';
import { AccountsAdminController } from './accounts/accounts.admin.controller';
import { AuthService } from './auth/auth.service';
import { LoginThrottleService } from './auth/login-throttle.service';

@Module({
  imports: [AssetsModule],
  controllers: [
    ConfigController,
    SettingsController,
    AboutController,
    ProjectsController,
    AccountsAdminController,
    AccountsController,
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
    CertificatesService,
    ProgressService,
    AccountsService,
    AccountSessionService,
    AccountResetService,
    AccountAssetsBootstrap,
    AuthService,
    LoginThrottleService,
    ConfigService,
  ],
})
export class AppModule {}
