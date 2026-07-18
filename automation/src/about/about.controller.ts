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
import { AuthService } from '../auth/auth.service';
import { AuthGuard } from '../auth/auth.guard';
import { AboutService } from './about.service';
import {
  sortMilestones,
  parseGallery,
  parseLearning,
  parseMilestones,
  parseSkillGroups,
  parseSocials,
} from './about.model';
import { renderMarkdown } from '../posts/markdown';
import { aboutPage } from '../views/about.page';
import { aboutAdminPage } from '../views/about.admin.page';

interface AboutForm {
  headline?: string;
  intro?: string;
  milestonePeriod?: string | string[];
  milestoneTitle?: string | string[];
  milestoneOrg?: string | string[];
  milestoneDescription?: string | string[];
  skillGroupName?: string | string[];
  skillGroupItems?: string | string[];
  learningTitle?: string | string[];
  learningNote?: string | string[];
  learningStatus?: string | string[];
  galleryUrls?: string | string[];
  galleryCaption?: string | string[];
  socialLabel?: string | string[];
  socialUrl?: string | string[];
}

@Controller()
export class AboutController {
  constructor(
    private readonly about: AboutService,
    private readonly auth: AuthService,
  ) {}

  /** Public page. */
  @Get('about')
  @Header('Content-Type', 'text/html')
  page(@Req() req: Request): string {
    const content = this.about.get();
    const token = req.cookies?.[AuthService.COOKIE] as string | undefined;

    // Newest first, then render each description so markdown works there too.
    const milestones = sortMilestones(content.milestones);

    return aboutPage(
      { ...content, milestones },
      renderMarkdown(content.intro),
      this.auth.verifyToken(token),
      milestones.map((m) => renderMarkdown(m.description)),
    );
  }

  @Get('admin/about')
  @UseGuards(AuthGuard)
  @Header('Content-Type', 'text/html')
  form(@Query('saved') saved?: string): string {
    return aboutAdminPage(this.about.get(), saved !== undefined);
  }

  @Post('admin/about')
  @UseGuards(AuthGuard)
  save(@Body() body: AboutForm, @Res() res: Response): void {
    this.about.save({
      headline: (body.headline ?? '').trim(),
      intro: body.intro ?? '',
      milestones: parseMilestones(body),
      skillGroups: parseSkillGroups(body),
      learning: parseLearning(body),
      gallery: parseGallery(body),
      socials: parseSocials(body),
    });

    res.redirect('/admin/about?saved=1');
  }
}
