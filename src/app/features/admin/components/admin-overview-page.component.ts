// src/app/features/admin/components/admin-overview-page.component.ts
import { Component, computed, inject } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { AuthService } from '../../auth/services/auth.service';
import { TransactionService } from '../../transactions/services/transaction.service';

@Component({
  standalone: true,
  selector: 'app-admin-overview-page',
  imports: [CommonModule, CurrencyPipe],
  template: `
    <section class="max-w-7xl mx-auto px-4 space-y-10">
      <header>
        <h1 class="text-3xl font-bold">Vue d’ensemble admin</h1>
        <p class="text-gray-600">Statistiques globales de l’application</p>
      </header>

      <!-- KPIs -->
      <div class="grid gap-6 md:grid-cols-4">
        <div class="bg-white rounded-2xl shadow p-6 text-center">
          <p class="text-sm text-gray-500 mb-2">Utilisateurs</p>
          <p class="text-4xl font-extrabold">{{ totalUsers() }}</p>
        </div>
        <div class="bg-white rounded-2xl shadow p-6 text-center">
          <p class="text-sm text-gray-500 mb-2">Admins</p>
          <p class="text-4xl font-extrabold">{{ totalAdmins() }}</p>
        </div>
        <div class="bg-white rounded-2xl shadow p-6 text-center">
          <p class="text-sm text-gray-500 mb-2">Transactions</p>
          <p class="text-4xl font-extrabold">{{ totalTx() }}</p>
        </div>
        <div class="bg-white rounded-2xl shadow p-6 text-center">
          <p class="text-sm text-gray-500 mb-2">Total cumulé</p>
          <p class="text-4xl font-extrabold">{{ sumTotal() | currency: 'EUR' }}</p>
        </div>
      </div>
    </section>
  `,
})
export class AdminOverviewPageComponent {
  private auth = inject(AuthService);
  private tx = inject(TransactionService);

  usersSig = this.auth.users;
  txSig = this.tx.transactions;

  totalUsers = computed(() => this.usersSig().length);
  totalAdmins = computed(() => this.usersSig().filter((u) => u.role === 'admin').length);
  totalTx = computed(() => this.txSig().length);
  sumTotal = computed(() => this.txSig().reduce((s, t) => s + (t.total ?? 0), 0));
}
