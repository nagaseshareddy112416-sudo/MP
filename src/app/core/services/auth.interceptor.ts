import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from './auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.getToken();
  const activeWs = authService.activeWorkspace();

  let headers = req.headers;

  if (token) {
    headers = headers.set('Authorization', `Bearer ${token}`);
  }

  if (activeWs) {
    headers = headers.set('X-Workspace-Id', activeWs.id);
  }

  const authReq = req.clone({ headers });
  return next(authReq);
};

