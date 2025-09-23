// src/app/features/admin/components/admin-transactions-page.component.ts
import { Component, computed, inject } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TransactionService } from '../../transactions/services/transaction.service';
import type { Transaction } from '../../../core/models/transaction.model';

type SortKey = 'createdAt' | 'userId' | 'portfolioId' | 'assetType' | 'symbol' | 'type' | 'total';
type SortDir = 'asc' | 'desc';

@Component({
  standalone: true,
  selector: 'app-admin-transactions-page',
  imports: [CommonModule, FormsModule, DatePipe, CurrencyPipe],
  template: `
    <section class="max-w-7xl mx-auto px-4 space-y-6">
      <header class="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 class="text-2xl font-bold">Transactions — Global</h1>
          <p class="text-sm text-gray-600">Toutes les transactions de l’application</p>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <input
            class="border rounded-lg px-3 py-2"
            placeholder="Rechercher (symbole, type, userId…)"
            [(ngModel)]="q"
          />
          <select class="border rounded-lg px-3 py-2" [(ngModel)]="assetFilter">
            <option value="">Tous actifs</option>
            <option value="stock">Action</option>
            <option value="etf">ETF</option>
            <option value="crypto">Crypto</option>
            <option value="livret">Livret</option>
          </select>
          <select class="border rounded-lg px-3 py-2" [(ngModel)]="typeFilter">
            <option value="">Tous types</option>
            <option value="buy">Achat</option>
            <option value="sell">Vente</option>
          </select>
        </div>
      </header>

      <!-- KPIs simples -->
      <div class="grid gap-4 md:grid-cols-3">
        <div class="bg-white rounded-2xl shadow p-4">
          <p class="text-xs text-gray-500">Nombre</p>
          <p class="text-2xl font-semibold">{{ filtered().length }}</p>
        </div>
        <div class="bg-white rounded-2xl shadow p-4">
          <p class="text-xs text-gray-500">Somme des totaux</p>
          <p class="text-2xl font-semibold">{{ sumTotal() | currency: 'EUR' }}</p>
        </div>
        <div class="bg-white rounded-2xl shadow p-4">
          <p class="text-xs text-gray-500">Dernière activité</p>
          <p class="text-sm">
            {{ latestDate() ? (latestDate()! | date: 'dd/MM/yyyy HH:mm') : '—' }}
          </p>
        </div>
      </div>

      <!-- Tableau -->
      <div class="overflow-auto rounded-2xl border bg-white">
        <table class="min-w-full text-sm">
          <thead class="bg-gray-50 text-left">
            <tr>
              <th class="px-3 py-2 cursor-pointer" (click)="sortBy('createdAt')">
                Date
                <span class="text-gray-400" *ngIf="sortKey === 'createdAt'">({{ sortDir }})</span>
              </th>
              <th class="px-3 py-2 cursor-pointer" (click)="sortBy('userId')">
                UserId
                <span class="text-gray-400" *ngIf="sortKey === 'userId'">({{ sortDir }})</span>
              </th>
              <th class="px-3 py-2">Portefeuille</th>
              <th class="px-3 py-2 cursor-pointer" (click)="sortBy('assetType')">
                Actif
                <span class="text-gray-400" *ngIf="sortKey === 'assetType'">({{ sortDir }})</span>
              </th>
              <th class="px-3 py-2 cursor-pointer" (click)="sortBy('symbol')">
                Symbole
                <span class="text-gray-400" *ngIf="sortKey === 'symbol'">({{ sortDir }})</span>
              </th>
              <th class="px-3 py-2 cursor-pointer" (click)="sortBy('type')">
                Type <span class="text-gray-400" *ngIf="sortKey === 'type'">({{ sortDir }})</span>
              </th>
              <th class="px-3 py-2 text-right cursor-pointer" (click)="sortBy('total')">
                Total (EUR)
                <span class="text-gray-400" *ngIf="sortKey === 'total'">({{ sortDir }})</span>
              </th>
            </tr>
          </thead>
          <tbody>
            @for (t of sorted(); track t.id) {
              <tr class="border-t hover:bg-gray-50">
                <td class="px-3 py-2 whitespace-nowrap">
                  {{ t.createdAt | date: 'dd/MM/yyyy HH:mm' }}
                </td>
                <td class="px-3 py-2">#{{ t.userId }}</td>
                <td class="px-3 py-2">#{{ t.portfolioId }}</td>
                <td class="px-3 py-2 capitalize">{{ t.assetType }}</td>
                <td class="px-3 py-2">{{ t.symbol }}</td>
                <td class="px-3 py-2 uppercase">{{ t.type }}</td>
                <td class="px-3 py-2 text-right">{{ t.total | number: '1.2-2' }}</td>
              </tr>
            }
            @if (sorted().length === 0) {
              <tr>
                <td class="px-3 py-6 text-gray-500" colspan="7">Aucune transaction.</td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </section>
  `,
})
export class AdminTransactionsPageComponent {
  private txSrv = inject(TransactionService);

  q = '';
  assetFilter = '';
  typeFilter = '';

  // Source: toutes les transactions (non filtrées par user)
  all = this.txSrv.transactions;

  filtered = computed<Transaction[]>(() => {
    const term = (this.q || '').toLowerCase();
    const asset = (this.assetFilter || '').toLowerCase();
    const type = (this.typeFilter || '').toLowerCase();

    return this.all().filter((t) => {
      if (asset && t.assetType.toLowerCase() !== asset) return false;
      if (type && t.type.toLowerCase() !== type) return false;

      if (!term) return true;

      return (
        String(t.userId).includes(term) ||
        String(t.portfolioId).includes(term) ||
        t.assetType.toLowerCase().includes(term) ||
        t.symbol.toLowerCase().includes(term) ||
        t.type.toLowerCase().includes(term)
      );
    });
  });

  // tri
  sortKey: SortKey = 'createdAt';
  sortDir: SortDir = 'desc';

  sorted = computed<Transaction[]>(() => {
    const key = this.sortKey;
    const dir = this.sortDir;
    return this.filtered()
      .slice()
      .sort((a, b) => {
        const av = this.valueFor(a, key);
        const bv = this.valueFor(b, key);

        let cmp = 0;
        if (av instanceof Date && bv instanceof Date) cmp = av.getTime() - bv.getTime();
        else if (typeof av === 'number' && typeof bv === 'number') cmp = av - bv;
        else cmp = String(av ?? '').localeCompare(String(bv ?? ''), 'fr');

        return dir === 'asc' ? cmp : -cmp;
      });
  });

  sortBy(k: SortKey) {
    if (this.sortKey === k) this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
    else {
      this.sortKey = k;
      this.sortDir = 'asc';
    }
  }

  sumTotal = computed(() => this.filtered().reduce((s, t) => s + (t.total ?? 0), 0));

  latestDate = computed<Date | null>(() => {
    const mx = this.filtered().reduce<number>((m, t) => Math.max(m, +new Date(t.createdAt)), 0);
    return mx ? new Date(mx) : null;
    // (ici on n'utilise latestDate que pour affichage, ok si Date|null)
  });

  private valueFor(t: Transaction, k: SortKey): string | number | Date {
    switch (k) {
      case 'createdAt':
        return t.createdAt instanceof Date ? t.createdAt : new Date(t.createdAt);
      case 'userId':
        return t.userId;
      case 'portfolioId':
        return t.portfolioId;
      case 'assetType':
        return t.assetType;
      case 'symbol':
        return t.symbol;
      case 'type':
        return t.type;
      case 'total':
        return t.total ?? 0;
    }
  }
}
