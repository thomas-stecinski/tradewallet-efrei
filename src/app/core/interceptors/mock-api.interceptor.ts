// src/app/core/interceptors/mock-api.interceptor.ts
import { HttpEvent, HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { delay, Observable, of, throwError } from 'rxjs';

const LS_CURRENT = 'tw_current_user';
const DELAY = 300;

const ok = <T>(body: T) => of(new HttpResponse<T>({ status: 200, body })).pipe(delay(DELAY));
const unauthorized = () =>
  throwError(() => ({ status: 401, message: 'Unauthorized' })).pipe(delay(DELAY));

function isApi(url: string) {
  return url.startsWith('/api/');
}

function getCurrentFromLS<T>(): T | null {
  try {
    const raw = localStorage.getItem(LS_CURRENT);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export const mockApiInterceptor: HttpInterceptorFn = (
  req,
  next,
): Observable<HttpEvent<unknown>> => {
  if (!isApi(req.url)) return next(req);

  if (req.method === 'GET' && req.url === '/api/health') {
    return ok({ status: 'ok' });
  }

  if (req.method === 'GET' && req.url === '/api/users/me') {
    const me = getCurrentFromLS<unknown>();
    if (!me) return unauthorized();
    return ok(me);
  }

  return next(req);
};
