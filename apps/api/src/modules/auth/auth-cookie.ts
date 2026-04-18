import { AUTH_COOKIE_NAME } from '@cobrazap/domain';
import type { Request, Response } from 'express';

export const SESSION_COOKIE_MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000;

function cookieName() {
  return process.env.SESSION_COOKIE_NAME || AUTH_COOKIE_NAME;
}

export function readSessionCookie(request: Request) {
  const header = request.headers.cookie;

  if (!header) {
    return null;
  }

  const match = header
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${cookieName()}=`));

  if (!match) {
    return null;
  }

  return decodeURIComponent(match.slice(cookieName().length + 1));
}

export function setSessionCookie(response: Response, token: string) {
  response.cookie(cookieName(), token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_COOKIE_MAX_AGE_MS,
  });
}

export function clearSessionCookie(response: Response) {
  response.cookie(cookieName(), '', {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    expires: new Date(0),
  });
}
