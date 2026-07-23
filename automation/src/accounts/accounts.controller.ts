import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AccountsService } from './accounts.service';
import { AccountSessionService } from './account-session.service';
import {
  RegisterInput,
  describeAccount,
  normaliseEmail,
  registrationProblem,
} from './account.model';
import {
  ACCOUNT_PATHS,
  accountPage,
  registerPage,
  signInPage,
} from '../views/public/account.pages';
import { CertificatesService } from '../tutorials/certificates.service';
import { LoginThrottleService } from '../auth/login-throttle.service';
import { TutorialsService } from '../tutorials/tutorials.service';

@Controller('account')
export class AccountsController {
  constructor(
    private readonly accounts: AccountsService,
    private readonly session: AccountSessionService,
    private readonly certificates: CertificatesService,
    private readonly tutorials: TutorialsService,
    private readonly throttle: LoginThrottleService,
  ) {}

  private throttleKey(req: Request): string {
    return `account:${req.ip ?? req.socket?.remoteAddress ?? 'unknown'}`;
  }

  private currentId(req: Request): string {
    const cookies = (req.cookies ?? {}) as Record<string, string>;

    return this.session.read(cookies[AccountSessionService.COOKIE]);
  }

  private safeNext(next?: string): string {
    return next && next.startsWith('/') && !next.startsWith('//')
      ? next
      : ACCOUNT_PATHS.home;
  }

  private startSession(res: Response, accountId: string): void {
    res.cookie(AccountSessionService.COOKIE, this.session.issue(accountId), {
      httpOnly: true,
      sameSite: 'lax',
      secure: res.req.secure,
      maxAge: this.session.cookieMaxAge,
    });
  }

  @Get()
  @Header('Content-Type', 'text/html')
  home(@Req() req: Request, @Res() res: Response): void {
    const account = this.accounts.findById(this.currentId(req));

    if (!account) {
      res.redirect(ACCOUNT_PATHS.signIn);
      return;
    }

    const issued = this.certificates
      .forAccount(account.id)
      .flatMap((record) => {
        const subject = this.tutorials
          .findSubjects()
          .find((candidate) => candidate.id === record.subjectId);

        return subject
          ? [
              {
                course: subject.title,
                href: `/tutorials/${subject.slug}/certificate`,
                issued: new Date(record.issuedAt).toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                }),
              },
            ]
          : [];
      });

    res.send(accountPage(describeAccount(account), issued));
  }

  @Get('register')
  @Header('Content-Type', 'text/html')
  registerForm(@Query('next') next?: string): string {
    return registerPage({ next });
  }

  @Post('register')
  @HttpCode(200)
  @Header('Content-Type', 'text/html')
  register(
    @Body() body: RegisterInput & { next?: string },
    @Res() res: Response,
  ): void {
    const problem = registrationProblem(body);

    if (problem) {
      res.send(
        registerPage({
          error: problem,
          name: body.name,
          email: body.email,
          next: body.next,
        }),
      );
      return;
    }

    if (this.accounts.taken(body.email)) {
      res.send(
        registerPage({
          error: 'That email already has an account. Sign in instead.',
          name: body.name,
          email: body.email,
          next: body.next,
        }),
      );
      return;
    }

    const account = this.accounts.register(body);

    this.startSession(res, account.id);
    res.redirect(this.safeNext(body.next));
  }

  @Get('sign-in')
  @Header('Content-Type', 'text/html')
  signInForm(@Query('next') next?: string): string {
    return signInPage({ next });
  }

  @Post('sign-in')
  @HttpCode(200)
  @Header('Content-Type', 'text/html')
  signIn(
    @Body() body: { email?: string; password?: string; next?: string },
    @Req() req: Request,
    @Res() res: Response,
  ): void {
    const key = this.throttleKey(req);
    const waitMs = this.throttle.retryAfter(key);

    if (waitMs > 0) {
      const minutes = Math.max(1, Math.ceil(waitMs / 60000));

      res.send(
        signInPage({
          error: `Too many attempts. Try again in ${minutes} minute${minutes === 1 ? '' : 's'}.`,
          email: normaliseEmail(body.email),
          next: body.next,
        }),
      );
      return;
    }

    const account = this.accounts.authenticate(body);

    if (!account) {
      this.throttle.recordFailure(key);

      res.send(
        signInPage({
          error: 'That email and password did not match.',
          email: normaliseEmail(body.email),
          next: body.next,
        }),
      );
      return;
    }

    this.throttle.recordSuccess(key);
    this.startSession(res, account.id);
    res.redirect(this.safeNext(body.next));
  }

  @Post('sign-out')
  signOut(@Res() res: Response): void {
    res.clearCookie(AccountSessionService.COOKIE, {
      httpOnly: true,
      sameSite: 'lax',
      secure: res.req.secure,
    });

    res.redirect('/tutorials');
  }
}
