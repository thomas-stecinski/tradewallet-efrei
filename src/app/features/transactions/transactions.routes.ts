import { Routes } from '@angular/router';
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  standalone: true,
  selector: 'app-transactions',
  imports: [CommonModule],
  template: `
    <h1 class="text-2xl font-bold">Transactions</h1>
    <p class="text-gray-600 text-sm">Stub – contenu à venir.</p>
  `,
})
class TransactionsPage {}

export const TRANSACTIONS_ROUTES: Routes = [{ path: '', component: TransactionsPage }];
