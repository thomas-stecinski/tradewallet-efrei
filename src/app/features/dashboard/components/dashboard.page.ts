import { Component, Signal, computed, inject, signal } from '@angular/core';
import { CommonModule, CurrencyPipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration } from 'chart.js';
import { DashboardDeriveService, Range } from '../services/dashboard-derive.service';

@Component({
  standalone: true,
  selector: 'app-dashboard-page',
  imports: [CommonModule, FormsModule, BaseChartDirective, CurrencyPipe, DecimalPipe],
  template: `
    <section class="max-w-7xl mx-auto p-6 space-y-6">
      <header class="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 class="text-2xl font-bold">Évolution globale</h1>
          <p class="text-sm text-gray-600">
            Filtrer par période, portefeuille, type d'actif, symbole.
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <select
            class="border rounded-lg px-3 py-2"
            [ngModel]="range()"
            (ngModelChange)="setRange($event)"
          >
            <option value="7d">7 jours</option>
            <option value="30d">30 jours</option>
            <option value="12m">12 mois</option>
            <option value="all">All</option>
          </select>

          <select
            class="border rounded-lg px-3 py-2"
            [ngModel]="portfolioId()"
            (ngModelChange)="setPortfolio($event)"
          >
            <option value="all">Tous portefeuilles</option>
            @for (p of d.portfolios(); track p.id) {
              <option [value]="p.id">{{ p.name }}</option>
            }
          </select>

          <select
            class="border rounded-lg px-3 py-2"
            [ngModel]="assetType()"
            (ngModelChange)="setAssetType($event)"
          >
            <option value="">Tous actifs</option>
            <option value="stock">Action</option>
            <option value="etf">ETF</option>
            <option value="crypto">Crypto</option>
            <option value="livret">Livret</option>
          </select>

          <div class="flex items-center gap-2">
            <div class="relative">
              <input
                id="symbolInput"
                class="border rounded-lg px-3 py-2 w-48"
                [ngModel]="symbolInput()"
                (ngModelChange)="onSymbolInput($event)"
                placeholder="Symbole (AAPL)"
                list="dashboardSymbolOptions"
                autocomplete="off"
                (keydown.escape)="clearSymbol()"
              />
              <datalist id="dashboardSymbolOptions">
                @for (s of limitedSymbols(); track s) {
                  <option [value]="s"></option>
                }
              </datalist>
            </div>

            <select
              class="border rounded-lg px-2 py-2"
              [disabled]="allSymbols().length === 0"
              (change)="pickFromSelect($any($event.target).value)"
            >
              <option value="">
                {{ allSymbols().length ? '— Choisir un symbole —' : 'Aucun symbole' }}
              </option>
              @for (s of allSymbols(); track s) {
                <option [value]="s">{{ s }}</option>
              }
            </select>

            <button
              type="button"
              class="px-2 py-2 border rounded-lg text-sm"
              [disabled]="!symbolInput()"
              (click)="clearSymbol()"
              aria-label="Effacer le symbole"
              title="Effacer le symbole"
            >
              ×
            </button>
          </div>

          <button class="px-3 py-2 rounded-lg border hover:bg-gray-50" (click)="reset()">
            Réinitialiser
          </button>
        </div>
      </header>

      <!-- KPIs Performance -->
      <div class="grid gap-4 md:grid-cols-4">
        <div class="bg-white rounded-2xl shadow p-4">
          <p class="text-xs text-gray-500">Valeur actuelle</p>
          <p class="text-2xl font-semibold">{{ overall().value | currency: 'EUR' }}</p>
        </div>
        <div class="bg-white rounded-2xl shadow p-4">
          <p class="text-xs text-gray-500">Investi (coût de revient)</p>
          <p class="text-2xl font-semibold">{{ overall().invested | currency: 'EUR' }}</p>
        </div>
        <div class="bg-white rounded-2xl shadow p-4">
          <p class="text-xs text-gray-500">P&L latent</p>
          <p class="text-2xl font-semibold">
            {{ overall().pnlUnrealized | currency: 'EUR' }}
            <span class="text-sm ml-2">({{ overall().pnlPct | number: '1.0-2' }}%)</span>
          </p>
        </div>
        <div class="bg-white rounded-2xl shadow p-4">
          <p class="text-xs text-gray-500">P&L réalisé cumulé</p>
          <p class="text-2xl font-semibold">{{ overall().pnlRealized | currency: 'EUR' }}</p>
        </div>
      </div>

      <!-- Breakdown par type -->
      <div class="grid gap-4 md:grid-cols-3">
        <div class="bg-white rounded-2xl shadow p-4">
          <h3 class="text-sm font-semibold mb-2">Actions</h3>
          <div class="text-sm grid grid-cols-2 gap-y-1">
            <span class="text-gray-500">Valeur</span
            ><span class="text-right">{{ byType().stock.value | currency: 'EUR' }}</span>
            <span class="text-gray-500">Investi</span
            ><span class="text-right">{{ byType().stock.invested | currency: 'EUR' }}</span>
            <span class="text-gray-500">P&L latent</span>
            <span class="text-right">
              {{ byType().stock.pnlUnrealized | currency: 'EUR' }}
              ({{ byType().stock.pnlPct | number: '1.0-2' }}%)
            </span>
            <span class="text-gray-500">P&L réalisé</span
            ><span class="text-right">{{ byType().stock.pnlRealized | currency: 'EUR' }}</span>
          </div>
        </div>
        <div class="bg-white rounded-2xl shadow p-4">
          <h3 class="text-sm font-semibold mb-2">ETF</h3>
          <div class="text-sm grid grid-cols-2 gap-y-1">
            <span class="text-gray-500">Valeur</span
            ><span class="text-right">{{ byType().etf.value | currency: 'EUR' }}</span>
            <span class="text-gray-500">Investi</span
            ><span class="text-right">{{ byType().etf.invested | currency: 'EUR' }}</span>
            <span class="text-gray-500">P&L latent</span>
            <span class="text-right">
              {{ byType().etf.pnlUnrealized | currency: 'EUR' }}
              ({{ byType().etf.pnlPct | number: '1.0-2' }}%)
            </span>
            <span class="text-gray-500">P&L réalisé</span
            ><span class="text-right">{{ byType().etf.pnlRealized | currency: 'EUR' }}</span>
          </div>
        </div>
        <div class="bg-white rounded-2xl shadow p-4">
          <h3 class="text-sm font-semibold mb-2">Crypto</h3>
          <div class="text-sm grid grid-cols-2 gap-y-1">
            <span class="text-gray-500">Valeur</span
            ><span class="text-right">{{ byType().crypto.value | currency: 'EUR' }}</span>
            <span class="text-gray-500">Investi</span
            ><span class="text-right">{{ byType().crypto.invested | currency: 'EUR' }}</span>
            <span class="text-gray-500">P&L latent</span>
            <span class="text-right">
              {{ byType().crypto.pnlUnrealized | currency: 'EUR' }}
              ({{ byType().crypto.pnlPct | number: '1.0-2' }}%)
            </span>
            <span class="text-gray-500">P&L réalisé</span
            ><span class="text-right">{{ byType().crypto.pnlRealized | currency: 'EUR' }}</span>
          </div>
        </div>
      </div>

      <!-- Bloc existant: flux par période -->
      <div class="grid gap-4 md:grid-cols-4">
        <div class="bg-white rounded-2xl shadow p-4">
          <p class="text-xs text-gray-500">Total filtré (flux)</p>
          <p class="text-2xl font-semibold">{{ total() | number: '1.2-2' }} €</p>
        </div>
        <div class="bg-white rounded-2xl shadow p-4 md:col-span-3">
          <p class="text-xs text-gray-500">Période</p>
          <p class="text-sm">
            @switch (range()) {
              @case ('7d') {
                7 derniers jours
              }
              @case ('30d') {
                30 derniers jours
              }
              @case ('12m') {
                12 derniers mois
              }
              @case ('all') {
                Tout l'historique
              }
            }
          </p>
        </div>
      </div>

      <div class="bg-white rounded-2xl shadow p-4">
        <div class="flex items-center justify-between mb-3">
          <h2 class="text-base font-semibold">Courbe (EUR)</h2>
        </div>
        <div class="relative h-80">
          <canvas baseChart [type]="'line'" [data]="lineData()" [options]="lineOptions"></canvas>
        </div>
      </div>
    </section>
  `,
})
export class DashboardPageComponent {
  d = inject(DashboardDeriveService);

  // Flux (existant)
  series = this.d.series;
  total = this.d.total;

  // Nouvelles stats
  overall = this.d.statsOverall;
  byType = this.d.statsByType;

  range = computed(() => this.d.filters().range);
  portfolioId = computed(() => this.d.filters().portfolioId);
  assetType = computed(() => this.d.filters().assetType);
  symbol = computed(() => this.d.filters().symbol);

  symbolInput = signal<string>('');

  allSymbols = computed<string[]>(() => (this.d.symbols?.() ?? []).map((s) => this.normalize(s)));
  limitedSymbols = computed<string[]>(() => this.allSymbols().slice(0, 200));

  setRange(r: Range) {
    this.d.filters.update((f) => ({ ...f, range: r }));
  }
  setPortfolio(p: number | 'all' | string) {
    const val = p === 'all' || p === '' ? 'all' : Number(p);
    this.d.filters.update((f) => ({ ...f, portfolioId: val }));
  }
  setAssetType(a: '' | 'stock' | 'etf' | 'crypto' | 'livret') {
    this.d.filters.update((f) => ({ ...f, assetType: a }));
  }

  onSymbolInput(v: string) {
    const up = this.normalize(v);
    this.symbolInput.set(up);
    if (!up) {
      this.d.filters.update((f) => ({ ...f, symbol: '' }));
      return;
    }
    if (this.allSymbols().includes(up)) this.d.filters.update((f) => ({ ...f, symbol: up }));
    else this.d.filters.update((f) => ({ ...f, symbol: '' }));
  }
  pickFromSelect(symbol: string) {
    const up = this.normalize(symbol);
    this.symbolInput.set(up);
    this.d.filters.update((f) => ({ ...f, symbol: up }));
  }
  clearSymbol() {
    this.symbolInput.set('');
    this.d.filters.update((f) => ({ ...f, symbol: '' }));
  }
  reset() {
    this.d.filters.set({ range: '12m', portfolioId: 'all', assetType: '', symbol: '' });
    this.symbolInput.set('');
  }

  lineOptions: ChartConfiguration<'line'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    scales: { y: { beginAtZero: true } },
    plugins: { legend: { display: false } },
  };
  lineData: Signal<ChartConfiguration<'line'>['data']> = computed(() => ({
    labels: this.series().map((p) => p.label),
    datasets: [
      { label: 'Total', data: this.series().map((p) => p.total), tension: 0.3, fill: false },
    ],
  }));

  private normalize(s: string) {
    return (s || '').trim().toUpperCase();
  }
}
