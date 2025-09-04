import { Routes } from '@angular/router';
// import { authGuard } from './core/guards/auth.guard';
// import { adminGuard } from './core/guards/admin.guard';

export const routes: Routes = [
  { path: '', redirectTo: '/auth/login', pathMatch: 'full' },

  {
    path: 'auth',
    loadChildren: () => import('./features/auth/auth.routes').then((m) => m.AUTH_ROUTES),
  },

  // {
  //   path: 'portfolio',
  //   canActivate: [authGuard],
  //   loadChildren: () => import('./features/portfolio/portfolio.routes').then(m => m.PORTFOLIO_ROUTES),
  // },

  { path: '**', redirectTo: '/auth/login' },
];
