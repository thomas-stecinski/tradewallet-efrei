import { Routes } from '@angular/router';
import { AdminLayoutComponent } from './components/admin-layout.component';
import { AdminOverviewPageComponent } from './components/admin-overview-page.component';
import { AdminUsersPageComponent } from './components/admin-users-page.component';
import { AdminTransactionsPageComponent } from './components/admin-transactions-page.component';

export const ADMIN_ROUTES: Routes = [
  {
    path: '',
    component: AdminLayoutComponent,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'overview' },
      { path: 'overview', component: AdminOverviewPageComponent },
      { path: 'users', component: AdminUsersPageComponent },
      { path: 'transactions', component: AdminTransactionsPageComponent },
    ],
  },
];
