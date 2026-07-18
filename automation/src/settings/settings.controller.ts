import {
  Body,
  Controller,
  Get,
  Header,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { AuthGuard } from '../auth/auth.guard';
import { SettingsService } from './settings.service';
import { parseFooterLinks } from './settings.model';
import { settingsPage } from '../views/settings.page';

interface SettingsForm {
  authorName?: string;
  authorRole?: string;
  authorBio?: string;
  avatarUrl?: string;
  siteTitle?: string;
  siteTagline?: string;
  shareIntro?: string;
  footerOwner?: string;
  footerOwnerUrl?: string;
  footerSuffix?: string;
  showIntro?: string;
  linkLabel?: string | string[];
  linkUrl?: string | string[];
}

@Controller('admin/settings')
@UseGuards(AuthGuard)
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  @Get()
  @Header('Content-Type', 'text/html')
  form(@Query('saved') saved?: string): string {
    return settingsPage(this.settings.get(), saved !== undefined);
  }

  @Post()
  save(@Body() body: SettingsForm, @Res() res: Response): void {
    this.settings.update({
      ...body,
      showIntro: body.showIntro !== undefined,
      footerLinks: parseFooterLinks(body.linkLabel, body.linkUrl),
    });

    res.redirect('/admin/settings?saved=1');
  }
}
