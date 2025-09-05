import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TransactionService } from '../services/transaction.service';
import { AuthService } from '../../auth/services/auth.service';
import { PortfolioService } from '../../portfolio/services/portfolio.service';
import { Transaction } from '../../../core/models/transaction.model';

@Component({
  standalone: true,
  selector: 'app-transaction-list',
  imports: [CommonModule, FormsModule, RouterLink, DatePipe, CurrencyPipe],
  template: `
    <section class="space-y-6">
      <div class="flex items-center justify-between">
        <h1 class="text-2xl font-bold">Transactions</h1>
        <a routerLink="new" class="px-3 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700">
          Nouvelle transaction
        </a>
      </div>

      <div class="flex flex-wrap items-center gap-3">
        <label for="type" class="text-sm text-gray-600">Type d'actif</label>
        <select id="type" [(ngModel)]="assetFilter" class="border rounded-lg px-2 py-1">
          <option value="">Tous</option>
          <option value="stock">Action</option>
          <option value="etf">ETF</option>
          <option value="crypto">Crypto</option>
        </select>

        <label for="pf" class="text-sm text-gray-600 ml-4">Portefeuille</label>
        <select id="pf" [(ngModel)]="portfolioFilter" class="border rounded-lg px-2 py-1">
          <option value="">Tous</option>
          @for (p of portfolios(); track p.id) {
            <option [value]="p.id">{{ p.name }}</option>
          }
        </select>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div class="bg-white rounded-xl shadow p-3">
          <p class="text-xs text-gray-500">Total</p>
          <p class="text-xl font-semibold">{{ totalFiltered() | currency: 'EUR' }}</p>
        </div>
        <div class="bg-white rounded-xl shadow p-3">
          <p class="text-xs text-gray-500">Actions</p>
          <p class="text-lg">{{ totalByTypeFiltered('stock') | currency: 'EUR' }}</p>
        </div>
        <div class="bg-white rounded-xl shadow p-3">
          <p class="text-xs text-gray-500">ETF</p>
          <p class="text-lg">{{ totalByTypeFiltered('etf') | currency: 'EUR' }}</p>
        </div>
        <div class="bg-white rounded-xl shadow p-3">
          <p class="text-xs text-gray-500">Crypto</p>
          <p class="text-lg">{{ totalByTypeFiltered('crypto') | currency: 'EUR' }}</p>
        </div>
      </div>

      <div class="overflow-auto rounded-xl border bg-white">
        <table class="min-w-full text-sm">
          <thead class="bg-gray-50 text-left">
            <tr>
              <th class="px-3 py-2">Date</th>
              <th class="px-3 py-2">Portefeuille</th>
              <th class="px-3 py-2">Actif</th>
              <th class="px-3 py-2">Symbole</th>
              <th class="px-3 py-2">Type</th>
              <th class="px-3 py-2 text-right">Qté</th>
              <th class="px-3 py-2 text-right">Prix (EUR)</th>
              <th class="px-3 py-2 text-right">Frais (EUR)</th>
              <th class="px-3 py-2 text-right">Total (EUR)</th>
              <th class="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            @for (t of filtered(); track t.id) {
              <tr class="border-t hover:bg-gray-50">
                <td class="px-3 py-2 whitespace-nowrap">{{ t.createdAt | date: 'dd/MM/yyyy' }}</td>
                <td class="px-3 py-2">{{ portfolioNameOf(t.portfolioId) }}</td>
                <td class="px-3 py-2 capitalize">{{ t.assetType }}</td>
                <td class="px-3 py-2">{{ t.symbol }}</td>
                <td class="px-3 py-2 uppercase">{{ t.type }}</td>
                <td class="px-3 py-2 text-right">{{ t.quantity }}</td>
                <td class="px-3 py-2 text-right">{{ t.pricePerUnit | number: '1.2-2' }}</td>
                <td class="px-3 py-2 text-right">{{ t.fees ?? 0 | currency: 'EUR' }}</td>
                <td class="px-3 py-2 text-right">{{ t.total | currency: 'EUR' }}</td>
                <td class="px-3 py-2 text-right">
                  <a [routerLink]="[t.id, 'edit']" class="text-blue-600 hover:underline mr-3"
                    >Éditer</a
                  >
                  <button (click)="onDelete(t.id)" class="text-red-600 hover:underline">
                    Supprimer
                  </button>
                </td>
              </tr>
            }
            @if (filtered().length === 0) {
              <tr>
                <td colspan="10" class="px-3 py-8 text-center text-gray-500">Aucune transaction</td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </section>
  `,
})
export class TransactionListComponent {
  txSrv = inject(TransactionService);
  auth = inject(AuthService);
  portfolioSrv = inject(PortfolioService);

  assetFilter = '';
  portfolioFilter: string | number = '';

  // portefeuilles de l'utilisateur
  portfolios = signal<{ id: number; name: string }[]>([]);

  constructor() {
    const u = this.auth.currentUser();
    this.portfolios.set(u ? this.portfolioSrv.listByUser(u.id) : []);
  }

  private mine = computed(() => {
    const u = this.auth.currentUser();
    if (!u) return [] as Transaction[];
    return this.txSrv.transactions().filter((t) => t.userId === u.id);
  });

  filtered = computed(() => {
    const asset = this.assetFilter as '' | 'stock' | 'etf' | 'crypto';
    const pfId = this.portfolioFilter ? Number(this.portfolioFilter) : null;

    return this.mine().filter(
      (t) => (!asset || t.assetType === asset) && (!pfId || t.portfolioId === pfId),
    );
  });

  totalFiltered = computed(() => this.filtered().reduce((a, t) => a + t.total, 0));
  totalByTypeFiltered(type: 'stock' | 'etf' | 'crypto') {
    return this.filtered()
      .filter((t) => t.assetType === type)
      .reduce((a, t) => a + t.total, 0);
  }

  portfolioNameOf(id: number): string {
    return this.portfolios().find((p) => p.id === id)?.name ?? `#${id}`;
  }

  async onDelete(id: number) {
    const ok = await this.txSrv.remove(id);
    if (!ok) alert('Suppression impossible');
  }
}
