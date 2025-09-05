import { inject } from '@angular/core';
import { CanMatchFn, Router, UrlSegment } from '@angular/router';
import { AuthService } from '../../features/auth/services/auth.service';

export const publicOnlyGuard: CanMatchFn = (route, segments: UrlSegment[]) => {
  void route;
  void segments;

  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isAuthenticated()) {
    return router.createUrlTree(['/dashboard']);
  }
  return true;
};
