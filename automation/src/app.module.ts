import { Module } from '@nestjs/common';
import { PostsController } from './posts/posts.controller';
import { AdminController } from './posts/admin.controller';
import { PostsService } from './posts/posts.service';
import { AuthService } from './auth/auth.service';

@Module({
  imports: [],
  // AdminController is listed first so its fixed paths are matched before
  // PostsController's parameterised ones.
  controllers: [AdminController, PostsController],
  providers: [PostsService, AuthService],
})
export class AppModule {}
