import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { adminGuard } from './core/guards/admin.guard';
import { publicOnlyGuard } from './core/guards/public-only.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'auth/login' },

  {
    path: 'auth',
    canMatch: [publicOnlyGuard],
    loadChildren: () => import('./features/auth/auth.routes').then((m) => m.AUTH_ROUTES),
  },

  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadChildren: () =>
      import('./features/dashboard/dashboard.routes').then((m) => m.DASHBOARD_ROUTES),
  },

  {
    path: 'portfolio',
    canActivate: [authGuard],
    loadChildren: () =>
      import('./features/portfolio/portfolio.routes').then((m) => m.PORTFOLIO_ROUTES),
  },

  {
    path: 'transactions',
    canActivate: [authGuard],
    loadChildren: () =>
      import('./features/transactions/transactions.routes').then((m) => m.TRANSACTIONS_ROUTES),
  },

  {
    path: 'admin',
    canActivate: [authGuard, adminGuard],
    loadChildren: () => import('./features/admin/admin.routes').then((m) => m.ADMIN_ROUTES),
  },

  { path: '**', redirectTo: 'dashboard' },
];
