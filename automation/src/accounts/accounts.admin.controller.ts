import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  Param,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { AuthGuard } from '../auth/auth.guard';
import { AccountsService } from './accounts.service';
import { AccountResetService } from './account-reset.service';
import { Account, formatRecoveryCode } from './account.model';
import { CertificatesService } from '../tutorials/certificates.service';
import { getSettings } from '../settings/settings.store';
import {
  AccountDetailState,
  accountDetailPage,
  accountsAdminPage,
} from '../views/admin/accounts.page';

const FLASHES: Record<string, string> = {
  revoked: 'The outstanding reset code was cancelled.',
};

@Controller('admin/accounts')
@UseGuards(AuthGuard)
export class AccountsAdminController {
  constructor(
    private readonly accounts: AccountsService,
    private readonly resets: AccountResetService,
    private readonly certificates: CertificatesService,
  ) {}

  /**
   * The code has to travel to the learner somehow, and a link they can click
   * beats twenty characters read down a phone line. Both are offered.
   */
  private resetUrl(code: string): string {
    const base = (getSettings().siteUrl || '').replace(/\/+$/, '');

    return `${base}/account/reset?code=${formatRecoveryCode(code)}`;
  }

  private detail(
    account: Account,
    extra: Partial<AccountDetailState> = {},
  ): string {
    return accountDetailPage({
      account,
      certificates: this.certificates.forAccount(account.id).length,
      live: this.resets.live(account.id),
      history: this.resets.history(account.id),
      ...extra,
    });
  }

  @Get()
  @Header('Content-Type', 'text/html')
  index(@Query('q') q = ''): string {
    const matched = this.accounts.list(q);
    const live = this.resets.liveAccountIds();

    return accountsAdminPage({
      rows: matched.map((account) => ({
        account,
        certificates: this.certificates.forAccount(account.id).length,
        liveReset: live.has(account.id),
      })),
      query: q,
      total: matched.length,
    });
  }

  @Get(':id')
  @Header('Content-Type', 'text/html')
  show(
    @Param('id') id: string,
    @Res() res: Response,
    @Query('ok') ok?: string,
  ): void {
    const account = this.accounts.findById(id);

    if (!account) {
      res.redirect('/admin/accounts');
      return;
    }

    res.send(this.detail(account, { flash: ok ? FLASHES[ok] : undefined }));
  }

  /**
   * Rendered rather than redirected: a code that only exists once should not
   * end up in a URL, browser history or a server log on the way back.
   */
  @Post(':id/reset')
  @HttpCode(200)
  @Header('Content-Type', 'text/html')
  issue(
    @Param('id') id: string,
    @Body() body: { note?: string },
    @Res() res: Response,
  ): void {
    const account = this.accounts.findById(id);

    if (!account) {
      res.redirect('/admin/accounts');
      return;
    }

    const note = (body.note ?? '').trim();

    if (!note) {
      res.send(
        this.detail(account, {
          error: 'Say how you checked this is really them before issuing one.',
        }),
      );
      return;
    }

    const code = this.resets.issue(account.id, note);

    res.send(
      this.detail(account, { issued: { code, url: this.resetUrl(code) } }),
    );
  }

  @Post(':id/revoke')
  revoke(@Param('id') id: string, @Res() res: Response): void {
    this.resets.revoke(id);
    res.redirect(`/admin/accounts/${id}?ok=revoked`);
  }
}
