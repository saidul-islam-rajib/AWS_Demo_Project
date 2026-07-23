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
import { AccountResetService } from './account-reset.service';
import { AccountRoutes } from './account.routes';
import { Account } from './account.model';
import type {
  NextTarget,
  RecoveryInput,
  RegisterInput,
  RotateInput,
} from './account.dto';
import { describeAccount } from './account.dto';
import {
  normaliseEmail,
  recoveryProblem,
  registrationProblem,
  resetProblem,
  rotationProblem,
} from './account.rules';
import {
  accountPage,
  recoverPage,
  recoveryCodePage,
  registerPage,
  resetPage,
  signInPage,
} from '../views/public/account.pages';
import { CertificatesService } from '../tutorials/certificates.service';
import { LoginThrottleService } from '../auth/login-throttle.service';
import { TutorialsService } from '../tutorials/tutorials.service';
import { ProgressService } from '../tutorials/progress.service';

@Controller('account')
export class AccountsController {
  constructor(
    private readonly accounts: AccountsService,
    private readonly session: AccountSessionService,
    private readonly resets: AccountResetService,
    private readonly certificates: CertificatesService,
    private readonly tutorials: TutorialsService,
    private readonly progress: ProgressService,
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
      : AccountRoutes.home.template;
  }

  private startSession(res: Response, accountId: string): void {
    res.cookie(AccountSessionService.COOKIE, this.session.issue(accountId), {
      httpOnly: true,
      sameSite: 'lax',
      secure: res.req.secure,
      maxAge: this.session.cookieMaxAge,
    });
  }

  private homePage(account: Account, error?: string): string {
    const certificates = this.certificates
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

    const courses = this.tutorials.findSubjects().flatMap((subject) => {
      const lessonIds = this.tutorials
        .lessons(subject.id)
        .map((lesson) => lesson.id);
      const done = this.progress.countOf(account.id, lessonIds);

      return done > 0 && done < lessonIds.length
        ? [
            {
              title: subject.title,
              href: `/tutorials/${subject.slug}`,
              done,
              total: lessonIds.length,
            },
          ]
        : [];
    });

    return accountPage({
      account: describeAccount(account),
      certificates,
      courses,
      recoveryIssuedAt: account.recoveryIssuedAt,
      error,
    });
  }

  @Get()
  @Header('Content-Type', 'text/html')
  home(@Req() req: Request, @Res() res: Response): void {
    const account = this.accounts.findById(this.currentId(req));

    if (!account) {
      res.redirect(AccountRoutes.signIn.template);
      return;
    }

    res.send(this.homePage(account));
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
    @Body() body: RegisterInput & NextTarget,
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

    const { account, code } = this.accounts.register(body);

    this.startSession(res, account.id);
    res.send(recoveryCodePage(code, this.safeNext(body.next), 'register'));
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

  @Get('recover')
  @Header('Content-Type', 'text/html')
  recoverForm(@Query('next') next?: string): string {
    return recoverPage({ next });
  }

  @Post('recover')
  @HttpCode(200)
  @Header('Content-Type', 'text/html')
  recover(
    @Body() body: RecoveryInput & NextTarget,
    @Req() req: Request,
    @Res() res: Response,
  ): void {
    const problem = recoveryProblem(body);

    if (problem) {
      res.send(
        recoverPage({
          error: problem,
          email: body.email,
          code: body.code,
          next: body.next,
        }),
      );
      return;
    }

    const key = this.throttleKey(req);

    if (this.throttle.retryAfter(key) > 0) {
      res.send(
        recoverPage({
          error: 'Too many attempts. Try again shortly.',
          email: body.email,
          next: body.next,
        }),
      );
      return;
    }

    const replacement = this.accounts.recover(body);

    if (!replacement) {
      this.throttle.recordFailure(key);

      res.send(
        recoverPage({
          error: 'That email and recovery code did not match.',
          email: body.email,
          next: body.next,
        }),
      );
      return;
    }

    const account = this.accounts.findByEmail(body.email);

    this.throttle.recordSuccess(key);
    if (account) this.startSession(res, account.id);

    res.send(
      recoveryCodePage(replacement, this.safeNext(body.next), 'recover'),
    );
  }

  @Post('recovery')
  @HttpCode(200)
  @Header('Content-Type', 'text/html')
  rotateRecovery(
    @Body() body: RotateInput,
    @Req() req: Request,
    @Res() res: Response,
  ): void {
    const account = this.accounts.findById(this.currentId(req));

    if (!account) {
      res.redirect(AccountRoutes.signIn.template);
      return;
    }

    const problem = rotationProblem(body);

    if (problem) {
      res.send(this.homePage(account, problem));
      return;
    }

    const key = this.throttleKey(req);

    if (this.throttle.retryAfter(key) > 0) {
      res.send(this.homePage(account, 'Too many attempts. Try again shortly.'));
      return;
    }

    const code = this.accounts.rotateRecovery(account.id, body.password);

    if (!code) {
      this.throttle.recordFailure(key);
      res.send(this.homePage(account, 'That password did not match.'));
      return;
    }

    this.throttle.recordSuccess(key);
    res.send(recoveryCodePage(code, AccountRoutes.home.template, 'rotate'));
  }

  @Get('reset')
  @Header('Content-Type', 'text/html')
  resetForm(
    @Query('code') code?: string,
    @Query('next') next?: string,
  ): string {
    return resetPage({ code, next });
  }

  @Post('reset')
  @HttpCode(200)
  @Header('Content-Type', 'text/html')
  reset(
    @Body() body: RecoveryInput & NextTarget,
    @Req() req: Request,
    @Res() res: Response,
  ): void {
    const problem = resetProblem(body);

    if (problem) {
      res.send(
        resetPage({
          error: problem,
          email: body.email,
          code: body.code,
          next: body.next,
        }),
      );
      return;
    }

    const key = this.throttleKey(req);

    if (this.throttle.retryAfter(key) > 0) {
      res.send(
        resetPage({
          error: 'Too many attempts. Try again shortly.',
          email: body.email,
          next: body.next,
        }),
      );
      return;
    }

    const account = this.accounts.findByEmail(body.email);
    const spent = account ? this.resets.consume(account.id, body.code) : false;

    if (!account || !spent) {
      this.throttle.recordFailure(key);

      res.send(
        resetPage({
          error:
            'That email and reset code did not match, or the code has expired.',
          email: body.email,
          next: body.next,
        }),
      );
      return;
    }

    const code = this.accounts.resetPassword(account.id, body.password ?? '');

    this.throttle.recordSuccess(key);
    this.startSession(res, account.id);
    res.send(recoveryCodePage(code, this.safeNext(body.next), 'recover'));
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
