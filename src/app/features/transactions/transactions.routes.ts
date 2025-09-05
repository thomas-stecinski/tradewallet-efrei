import { Routes } from '@angular/router';
import { TransactionListComponent } from './components/transaction-list.component';
import { TransactionFormComponent } from './components/transaction-form.component';

export const TRANSACTIONS_ROUTES: Routes = [
  { path: '', component: TransactionListComponent },
  { path: 'new', component: TransactionFormComponent },
  { path: ':id/edit', component: TransactionFormComponent },
];
