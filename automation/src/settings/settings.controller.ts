import {
  Body,
  Controller,
  Get,
  Header,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthGuard } from '../auth/auth.guard';
import { SettingsService } from './settings.service';
import { parseFooterLinks } from './settings.model';
import { settingsPage } from '../views/admin/settings.page';

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
  siteUrl?: string;
  githubUser?: string;
  linkLabel?: string | string[];
  linkUrl?: string | string[];
}

@Controller('admin/settings')
@UseGuards(AuthGuard)
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  @Get()
  @Header('Content-Type', 'text/html')
  form(@Req() req: Request, @Query('saved') saved?: string): string {
    const host = req.get('host') ?? '';
    const origin = host ? `${req.protocol}://${host}` : '';

    return settingsPage(this.settings.get(), saved !== undefined, origin);
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
