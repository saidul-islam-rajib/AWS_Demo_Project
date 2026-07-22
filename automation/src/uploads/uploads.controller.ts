import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { AuthGuard } from '../auth/auth.guard';
import { MAX_UPLOAD_BYTES, UploadsService, uploadDir } from './uploads.service';

const allowed = new UploadsService();

@Controller('admin/uploads')
@UseGuards(AuthGuard)
export class UploadsController {
  constructor(private readonly uploads: UploadsService) {}

  @Get()
  list() {
    return this.uploads.list();
  }

  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => cb(null, uploadDir()),
        filename: (_req, file, cb) =>
          cb(null, allowed.generateName(file.originalname)),
      }),
      limits: { fileSize: MAX_UPLOAD_BYTES },
      fileFilter: (_req, file, cb) => {
        if (!allowed.isAllowed(file.originalname)) {
          cb(
            new BadRequestException(
              'Only png, jpg, gif, webp and svg are allowed',
            ),
            false,
          );
          return;
        }
        cb(null, true);
      },
    }),
  )
  upload(@UploadedFile() file?: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file received');

    return {
      url: `/uploads/${file.filename}`,
      name: file.filename,
      size: file.size,
      markdown: `![${file.originalname.replace(/\.[^.]+$/, '')}](/uploads/${file.filename})`,
    };
  }

  @Delete(':name')
  remove(@Param('name') name: string) {
    const removed = this.uploads.remove(name);
    if (!removed) throw new BadRequestException('No such upload');
    return { removed: true };
  }
}
