import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { SKIP_PERSONAL_TOKEN, TokenStore } from './token.store';

// Adds the personnel Bearer only to API requests that allow it. A 401 on a request that
// carried the token means it was revoked or expired, so the local session is dropped.
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const tokens = inject(TokenStore);
  const token = tokens.token();
  if (token === null || req.context.get(SKIP_PERSONAL_TOKEN) || !req.url.startsWith(environment.apiUrl)) {
    return next(req);
  }
  return next(req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        tokens.clear();
      }
      return throwError(() => error);
    }),
  );
};
