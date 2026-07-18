import { Module } from '@nestjs/common';
import { PostsController } from './posts/posts.controller';
import { AdminController } from './posts/admin.controller';
import { UploadsController } from './uploads/uploads.controller';
import { PostsService } from './posts/posts.service';
import { UploadsService } from './uploads/uploads.service';
import { AuthService } from './auth/auth.service';

@Module({
  imports: [],
  // AdminController and UploadsController are listed first so their fixed
  // paths are matched before PostsController's parameterised ones.
  controllers: [AdminController, UploadsController, PostsController],
  providers: [PostsService, UploadsService, AuthService],
})
export class AppModule {}
