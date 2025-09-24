// src/app/features/dashboard/components/dashboard.page.ts
import { Component, Signal, computed, inject, signal } from '@angular/core';
import { CommonModule, CurrencyPipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration } from 'chart.js';
import { DashboardDeriveService, Range } from '../services/dashboard-derive.service';
import { PriceService } from '../../market/services/price.service';
import { TransactionService } from '../../transactions/services/transaction.service';
import { AuthService } from '../../auth/services/auth.service';

type AtKey = 'stock' | 'etf' | 'crypto' | 'livret';
type NonLivret = Exclude<AtKey, 'livret'>;
interface Picked {
  t: AtKey;
  s: string;
}

// utilitaire pour éviter `any` tout en restant souple sur le service prix
interface PriceLookup {
  lastPrice?: (s: string) => number | string | null | undefined;
  priceOf?: (s: string) => number | string | null | undefined;
  getPrice?: (s: string) => number | string | null | undefined;
}

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
            Filtrer par période & portefeuille. Clique une carte (Action / ETF / Crypto / Livret)
            pour l’afficher dans la courbe.
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <label class="sr-only" for="dashRange">Période</label>
          <select
            id="dashRange"
            class="border rounded-lg px-3 py-2"
            [ngModel]="range()"
            (ngModelChange)="setRange($event)"
          >
            <option value="7d">7 jours</option>
            <option value="30d">30 jours</option>
            <option value="12m">12 mois</option>
            <option value="all">All</option>
          </select>

          <label class="sr-only" for="dashPf">Portefeuille</label>
          <select
            id="dashPf"
            class="border rounded-lg px-3 py-2"
            [ngModel]="portfolioId()"
            (ngModelChange)="setPortfolio($event)"
          >
            <option value="all">Tous portefeuilles</option>
            @for (p of d.portfolios(); track p.id) {
              <option [value]="p.id">{{ p.name }}</option>
            }
          </select>

          <button class="px-3 py-2 rounded-lg border hover:bg-gray-50" (click)="reset()">
            Réinitialiser
          </button>
        </div>
      </header>

      <!-- KPIs (Total filtré en premier comme demandé) -->
      <div class="grid gap-4 md:grid-cols-4">
        <div class="kpi">
          <p class="kpi-label">Total filtré (flux)</p>
          <p class="kpi-value">{{ total() | number: '1.2-2' }} €</p>
        </div>
        <div class="kpi">
          <p class="kpi-label">Valeur actuelle</p>
          <p class="kpi-value">{{ overall().value | currency: 'EUR' }}</p>
        </div>
        <div class="kpi">
          <p class="kpi-label">Investi (coût de revient)</p>
          <p class="kpi-value">{{ overall().invested | currency: 'EUR' }}</p>
        </div>
        <div class="kpi">
          <p class="kpi-label">Gain (€)</p>
          <p class="kpi-value">
            {{ overall().pnlUnrealized + overall().pnlRealized | currency: 'EUR' }}
          </p>
        </div>
      </div>

      <!-- Menus déroulants (cartes cliquables avec KPIs) -->
      <div class="space-y-4">
        <!-- Actions -->
        @if (symbolsByType().stock.length > 0) {
          <details class="accordion" [attr.open]="true">
            <summary class="accordion-title">Actions</summary>
            <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              @for (s of symbolsByType().stock; track s) {
                <button
                  type="button"
                  class="card-kpi clickable"
                  [class.selected]="isSelected('stock', s)"
                  (click)="toggleSelection('stock', s)"
                >
                  <div class="flex items-center justify-between mb-2">
                    <h3 class="text-sm font-semibold">{{ s }}</h3>
                    <span class="hint">{{
                      isSelected('stock', s) ? 'Sélectionné' : 'Voir dans la courbe'
                    }}</span>
                  </div>
                  <div class="text-sm grid grid-cols-2 gap-y-1">
                    <span class="muted">Valeur</span>
                    <span class="text-right">{{ valueAsset('stock', s) | currency: 'EUR' }}</span>
                    <span class="muted">Investi</span>
                    <span class="text-right">{{
                      investedAsset('stock', s) | currency: 'EUR'
                    }}</span>
                    <span class="muted">Gain %</span>
                    <span class="text-right">
                      {{
                        pctAsset('stock', s) === null
                          ? '—'
                          : (pctAsset('stock', s)! | number: '1.2-2') + '%'
                      }}
                    </span>
                    <span class="muted">Gain (€)</span>
                    <span class="text-right">{{ gainAsset('stock', s) | currency: 'EUR' }}</span>
                  </div>
                </button>
              }
            </div>
          </details>
        }

        <!-- ETF -->
        @if (symbolsByType().etf.length > 0) {
          <details class="accordion">
            <summary class="accordion-title">ETF</summary>
            <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              @for (s of symbolsByType().etf; track s) {
                <button
                  type="button"
                  class="card-kpi clickable"
                  [class.selected]="isSelected('etf', s)"
                  (click)="toggleSelection('etf', s)"
                >
                  <div class="flex items-center justify-between mb-2">
                    <h3 class="text-sm font-semibold">{{ s }}</h3>
                    <span class="hint">{{
                      isSelected('etf', s) ? 'Sélectionné' : 'Voir dans la courbe'
                    }}</span>
                  </div>
                  <div class="text-sm grid grid-cols-2 gap-y-1">
                    <span class="muted">Valeur</span>
                    <span class="text-right">{{ valueAsset('etf', s) | currency: 'EUR' }}</span>
                    <span class="muted">Investi</span>
                    <span class="text-right">{{ investedAsset('etf', s) | currency: 'EUR' }}</span>
                    <span class="muted">Gain %</span>
                    <span class="text-right">
                      {{
                        pctAsset('etf', s) === null
                          ? '—'
                          : (pctAsset('etf', s)! | number: '1.2-2') + '%'
                      }}
                    </span>
                    <span class="muted">Gain (€)</span>
                    <span class="text-right">{{ gainAsset('etf', s) | currency: 'EUR' }}</span>
                  </div>
                </button>
              }
            </div>
          </details>
        }

        <!-- Crypto -->
        @if (symbolsByType().crypto.length > 0) {
          <details class="accordion">
            <summary class="accordion-title">Crypto</summary>
            <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              @for (s of symbolsByType().crypto; track s) {
                <button
                  type="button"
                  class="card-kpi clickable"
                  [class.selected]="isSelected('crypto', s)"
                  (click)="toggleSelection('crypto', s)"
                >
                  <div class="flex items-center justify-between mb-2">
                    <h3 class="text-sm font-semibold">{{ s }}</h3>
                    <span class="hint">{{
                      isSelected('crypto', s) ? 'Sélectionné' : 'Voir dans la courbe'
                    }}</span>
                  </div>
                  <div class="text-sm grid grid-cols-2 gap-y-1">
                    <span class="muted">Valeur</span>
                    <span class="text-right">{{ valueAsset('crypto', s) | currency: 'EUR' }}</span>
                    <span class="muted">Investi</span>
                    <span class="text-right">{{
                      investedAsset('crypto', s) | currency: 'EUR'
                    }}</span>
                    <span class="muted">Gain %</span>
                    <span class="text-right">
                      {{
                        pctAsset('crypto', s) === null
                          ? '—'
                          : (pctAsset('crypto', s)! | number: '1.2-2') + '%'
                      }}
                    </span>
                    <span class="muted">Gain (€)</span>
                    <span class="text-right">{{ gainAsset('crypto', s) | currency: 'EUR' }}</span>
                  </div>
                </button>
              }
            </div>
          </details>
        }

        <!-- Livrets -->
        @if (livrets().length > 0) {
          <details class="accordion">
            <summary class="accordion-title">Livrets</summary>
            <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              @for (s of livrets(); track s) {
                <button
                  type="button"
                  class="card-kpi clickable"
                  [class.selected]="isSelected('livret', s)"
                  (click)="toggleSelection('livret', s)"
                >
                  <div class="flex items-center justify-between mb-2">
                    <h3 class="text-sm font-semibold">{{ s }}</h3>
                    <span class="hint">{{
                      isSelected('livret', s) ? 'Sélectionné' : 'Voir dans la courbe'
                    }}</span>
                  </div>
                  <div class="text-sm grid grid-cols-2 gap-y-1">
                    <span class="muted">Valeur</span
                    ><span class="text-right">{{
                      investedLivret(s) + gainsLivret(s) | currency: 'EUR'
                    }}</span>
                    <span class="muted">Investi</span
                    ><span class="text-right">{{ investedLivret(s) | currency: 'EUR' }}</span>
                    <span class="muted">Gain %</span
                    ><span class="text-right">{{
                      roiLivret(s) === null ? '—' : (roiLivret(s)! | number: '1.2-2') + '%'
                    }}</span>
                    <span class="muted">Gain (€)</span
                    ><span class="text-right">{{ gainsLivret(s) | currency: 'EUR' }}</span>
                  </div>
                </button>
              }
            </div>
          </details>
        }
      </div>

      <!-- Courbe -->
      <div class="bg-white rounded-2xl shadow p-4">
        <div class="flex items-center justify-between mb-3">
          <h2 class="text-base font-semibold">Courbe (EUR)</h2>
          <div class="text-xs text-gray-500 flex items-center gap-3">
            <span *ngIf="selected().length === 0">Aucune sélection</span>
            <span *ngIf="selected().length === 1">1 sélection</span>
            <span *ngIf="selected().length > 1">{{ selected().length }} sélections</span>
            <button class="underline" (click)="clearAll()" type="button" *ngIf="selected().length">
              Effacer tout
            </button>
          </div>
        </div>
        <div class="relative h-80">
          <canvas baseChart [type]="'line'" [data]="lineData()" [options]="lineOptions"></canvas>
        </div>
      </div>
    </section>
  `,
  styles: [
    `
      .kpi {
        @apply bg-white rounded-2xl shadow p-4;
      }
      .kpi-label {
        @apply text-xs text-gray-500;
      }
      .kpi-value {
        @apply text-2xl font-semibold;
      }

      .accordion {
        @apply rounded-2xl border bg-white p-3;
      }
      .accordion-title {
        @apply cursor-pointer text-sm font-semibold;
      }

      .card-kpi {
        @apply rounded-xl border p-4 text-left bg-white shadow-sm;
      }
      .clickable {
        @apply hover:bg-gray-50 transition;
      }
      .selected {
        @apply ring-2 ring-blue-500;
      }
      .hint {
        @apply text-xs text-gray-500;
      }
      .muted {
        @apply text-gray-500;
      }
    `,
  ],
})
export class DashboardPageComponent {
  // Services
  d = inject(DashboardDeriveService);
  prices = inject(PriceService);
  txs = inject(TransactionService);
  auth = inject(AuthService);

  // Données globales
  series = this.d.series;
  total = this.d.total;
  overall = this.d.statsOverall;

  // Filtres
  range = computed(() => this.d.filters().range);
  portfolioId = computed(() => this.d.filters().portfolioId);

  // Sélections multiples (affichées et utilisées pour sync. des filtres via le 1er pick)
  private _selected = signal<Picked[]>([]);
  selected = computed(() => this._selected());

  // Libellés
  typeLabel(t: AtKey): string {
    switch (t) {
      case 'stock':
        return 'Actions';
      case 'etf':
        return 'ETF';
      case 'crypto':
        return 'Crypto';
      case 'livret':
        return 'Livrets';
    }
  }

  // Symboles par type (hors livret)
  symbolsByType = computed<Record<NonLivret, string[]>>(() => {
    const u = this.auth.currentUser();
    const pf = this.portfolioId();
    const map: Record<NonLivret, Set<string>> = {
      stock: new Set(),
      etf: new Set(),
      crypto: new Set(),
    };
    if (!u) return { stock: [], etf: [], crypto: [] };
    for (const t of this.txs.transactions()) {
      if (t.userId !== u.id) continue;
      if (pf !== 'all' && t.portfolioId !== Number(pf)) continue;
      if (t.assetType === 'stock' || t.assetType === 'etf' || t.assetType === 'crypto') {
        map[t.assetType].add(this.normalize(t.symbol));
      }
    }
    return {
      stock: Array.from(map.stock).sort((a, b) => a.localeCompare(b)),
      etf: Array.from(map.etf).sort((a, b) => a.localeCompare(b)),
      crypto: Array.from(map.crypto).sort((a, b) => a.localeCompare(b)),
    };
  });

  // Livrets
  livrets = computed<string[]>(() => {
    const u = this.auth.currentUser();
    const pf = this.portfolioId();
    const set = new Set<string>();
    if (!u) return [];
    for (const t of this.txs.transactions()) {
      if (t.userId !== u.id) continue;
      if (t.assetType !== 'livret') continue;
      if (pf !== 'all' && t.portfolioId !== Number(pf)) continue;
      set.add(this.normalize(t.symbol));
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  });

  // Livrets: Investi / Gains / ROI
  investedLivret = (sym: string): number => {
    const u = this.auth.currentUser();
    const pf = this.portfolioId();
    if (!u || !sym) return 0;
    const up = this.normalize(sym);
    let sum = 0;
    for (const t of this.txs.transactions()) {
      if (t.userId !== u.id) continue;
      if (t.assetType !== 'livret') continue;
      if (this.normalize(t.symbol) !== up) continue;
      if (pf !== 'all' && t.portfolioId !== Number(pf)) continue;
      if (t.type === 'buy') sum += Number(t.pricePerUnit) || 0;
      if (t.type === 'sell') sum -= Number(t.pricePerUnit) || 0;
    }
    return sum;
  };
  gainsLivret = (sym: string): number => this.prices.totalLivretCredits(sym);
  roiLivret = (sym: string): number | null => {
    const inv = this.investedLivret(sym);
    if (inv <= 0) return null;
    return (this.gainsLivret(sym) / inv) * 100;
  };

  // Actions/ETF/Crypto: quantité / investi / valeur / gains
  private qtyAsset(t: NonLivret, sym: string): number {
    const u = this.auth.currentUser();
    const pf = this.portfolioId();
    if (!u || !sym) return 0;
    const up = this.normalize(sym);
    let q = 0;
    for (const tx of this.txs.transactions()) {
      if (tx.userId !== u.id) continue;
      if (tx.assetType !== t) continue;
      if (this.normalize(tx.symbol) !== up) continue;
      if (pf !== 'all' && tx.portfolioId !== Number(pf)) continue;
      if (tx.type === 'buy') q += Number(tx.quantity) || 0;
      if (tx.type === 'sell') q -= Number(tx.quantity) || 0;
    }
    return q;
  }
  investedAsset(t: NonLivret, sym: string): number {
    const u = this.auth.currentUser();
    const pf = this.portfolioId();
    if (!u || !sym) return 0;
    const up = this.normalize(sym);
    let sum = 0;
    for (const tx of this.txs.transactions()) {
      if (tx.userId !== u.id) continue;
      if (tx.assetType !== t) continue;
      if (this.normalize(tx.symbol) !== up) continue;
      if (pf !== 'all' && tx.portfolioId !== Number(pf)) continue;
      const qty = Number(tx.quantity) || 0;
      const ppu = Number(tx.pricePerUnit) || 0;
      const fees = Number(tx.fees ?? 0) || 0;
      if (tx.type === 'buy') sum += qty * ppu + fees;
      if (tx.type === 'sell') sum -= qty * ppu - fees;
    }
    return sum;
  }
  private lastPrice(sym: string): number {
    // compat avec plusieurs signatures possibles du service de prix, sans `any`
    const p = this.prices as unknown as PriceLookup;
    const raw = p.lastPrice?.(sym) ?? p.priceOf?.(sym) ?? p.getPrice?.(sym) ?? 0;
    let n = 0;
    if (typeof raw === 'number') n = raw;
    else if (typeof raw === 'string') n = Number(raw);
    else n = 0;
    return Number.isFinite(n) ? n : 0;
  }
  valueAsset(t: NonLivret, sym: string): number {
    const price = this.lastPrice(sym);
    const qty = this.qtyAsset(t, sym);
    return (price || 0) * qty;
  }
  gainAsset(t: NonLivret, sym: string): number {
    const inv = this.investedAsset(t, sym);
    const val = this.valueAsset(t, sym);
    return val - inv;
  }
  pctAsset(t: NonLivret, sym: string): number | null {
    const inv = this.investedAsset(t, sym);
    if (inv <= 0) return null;
    return (this.gainAsset(t, sym) / inv) * 100;
  }

  // Sélection / filtres (multi-sélection visuelle, le 1er élément pilote les filtres/series)
  isSelected(t: AtKey, s: string) {
    const up = this.normalize(s);
    return this._selected().some((p) => p.t === t && p.s === up);
  }
  toggleSelection(t: AtKey, s: string) {
    const up = this.normalize(s);
    const cur = this._selected();
    const idx = cur.findIndex((p) => p.t === t && p.s === up);
    if (idx >= 0) {
      const next = cur.slice();
      next.splice(idx, 1);
      this._selected.set(next);
    } else {
      this._selected.set([...cur, { t, s: up }]);
    }
    this.applyFilterFromSelection();
  }
  clearAll() {
    this._selected.set([]);
    this.applyFilterFromSelection();
  }
  private applyFilterFromSelection() {
    const picks = this._selected();
    if (picks.length === 0) {
      this.d.filters.update((f) => ({ ...f, assetType: '', symbol: '' }));
      return;
    }
    const first = picks[0];
    this.d.filters.update((f) => ({ ...f, assetType: first.t, symbol: first.s }));
  }

  // Handlers filtres
  setRange(r: Range) {
    this.d.filters.update((f) => ({ ...f, range: r }));
  }
  setPortfolio(p: number | 'all' | string) {
    const val = p === 'all' || p === '' ? 'all' : Number(p);
    this.d.filters.update((f) => ({ ...f, portfolioId: val }));

    // purge les sélections non disponibles dans ce portefeuille
    const syms = this.symbolsByType();
    const livs = this.livrets();
    const keep = this._selected().filter((pick) => {
      if (pick.t === 'livret') return livs.includes(pick.s);
      const arr = syms[pick.t as NonLivret] || [];
      return arr.includes(pick.s);
    });
    if (keep.length !== this._selected().length) this._selected.set(keep);
    this.applyFilterFromSelection();
  }
  reset() {
    this.d.filters.set({ range: '12m', portfolioId: 'all', assetType: '', symbol: '' });
    this.clearAll();
  }

  // Courbe
  lineOptions: ChartConfiguration<'line'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    scales: { y: { beginAtZero: true } },
    plugins: { legend: { display: true } },
  };

  lineData: Signal<ChartConfiguration<'line'>['data']> = computed(() => {
    const labels = this.series().map((p) => p.label);
    const picks = this._selected();

    // La série renvoyée par DashboardDeriveService dépend des filtres (pilotés par applyFilterFromSelection)
    const baseData = this.series().map((p) => Number((p as { total?: number }).total ?? 0));

    let label = 'Total';
    if (picks.length >= 1) {
      const first = picks[0];
      label = `${this.typeLabel(first.t)} • ${first.s}`;
    }

    return {
      labels,
      datasets: [
        { label, data: baseData, tension: 0.3, fill: false },
        // si tu ajoutes une série "gains" côté service, plug-la ici en second dataset
      ],
    };
  });

  // Utils
  private normalize(s: string) {
    return (s || '').trim().toUpperCase();
  }
}
