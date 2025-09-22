import { Component, Signal, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration } from 'chart.js';
import { DashboardDeriveService, Range } from '../services/dashboard-derive.service';

@Component({
  standalone: true,
  selector: 'app-dashboard-page',
  imports: [CommonModule, FormsModule, BaseChartDirective],
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
          <!-- Range -->
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

          <!-- Portfolio -->
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

          <!-- AssetType (avec Livret) -->
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

          <!-- Symbol combo robuste -->
          <div class="flex items-center gap-2">
            <!-- Input + datalist -->
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

            <!-- Select natif (le plus fiable pour dérouler vite) -->
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

            <!-- Effacer -->
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

      <!-- KPIs -->
      <div class="grid gap-4 md:grid-cols-4">
        <div class="bg-white rounded-2xl shadow p-4">
          <p class="text-xs text-gray-500">Total filtré</p>
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

      <!-- Line chart -->
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

  // Bindings rapides
  series = this.d.series;
  total = this.d.total;

  range = computed(() => this.d.filters().range);
  portfolioId = computed(() => this.d.filters().portfolioId);
  assetType = computed(() => this.d.filters().assetType);
  symbol = computed(() => this.d.filters().symbol);

  // --- Symbol combo state ---
  symbolInput = signal<string>(''); // ce que tape l’utilisateur

  // Liste complète (normalisée) depuis le service
  allSymbols = computed<string[]>(() => (this.d.symbols?.() ?? []).map((s) => this.normalize(s)));
  // Datalist limitée (perfs)
  limitedSymbols = computed<string[]>(() => this.allSymbols().slice(0, 200));

  /* Handlers filtres */
  setRange(r: Range) {
    this.d.filters.update((f) => ({ ...f, range: r }));
  }

  setPortfolio(p: number | 'all' | string) {
    const val = p === 'all' || p === '' ? 'all' : Number(p);
    this.d.filters.update((f) => ({ ...f, portfolioId: val }));
  }

  // ⚠️ nécessite que DashboardDeriveService accepte bien 'livret'
  setAssetType(a: '' | 'stock' | 'etf' | 'crypto' | 'livret') {
    this.d.filters.update((f) => ({ ...f, assetType: a }));
    // Si tu veux effacer le symbole à chaque changement d’actif :
    // this.clearSymbol();
  }

  // --- Symbol UX
  onSymbolInput(v: string) {
    const up = this.normalize(v);
    this.symbolInput.set(up);

    if (!up) {
      this.d.filters.update((f) => ({ ...f, symbol: '' }));
      return;
    }
    // Applique le filtre uniquement si le symbole existe (évite les faux-positifs)
    if (this.allSymbols().includes(up)) {
      this.d.filters.update((f) => ({ ...f, symbol: up }));
    } else {
      this.d.filters.update((f) => ({ ...f, symbol: '' }));
    }
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

  // Chart config
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

  // Utils
  private normalize(s: string) {
    return (s || '').trim().toUpperCase();
  }
}
