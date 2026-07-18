import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';

/** Redirects unauthenticated visitors to the login page rather than throwing a 401. */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly auth: AuthService) {}

  canActivate(context: ExecutionContext): boolean {
    const http = context.switchToHttp();
    const req = http.getRequest<Request>();
    const res = http.getResponse<Response>();

    const token = req.cookies?.[AuthService.COOKIE] as string | undefined;

    if (this.auth.verifyToken(token)) return true;

    res.redirect('/login');
    return false;
  }
}
