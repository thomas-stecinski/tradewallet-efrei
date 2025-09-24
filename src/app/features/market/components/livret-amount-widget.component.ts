import { Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PriceService } from '../../market/services/price.service';
import { TransactionService } from '../../transactions/services/transaction.service';
import { AuthService } from '../../auth/services/auth.service';

@Component({
  standalone: true,
  selector: 'app-livret-amount-widget',
  imports: [CommonModule, FormsModule, CurrencyPipe, DatePipe],
  host: { class: 'block w-full' }, // ⚠️ important pour que space-y-* marche
  template: `
    <section class="bg-white rounded-2xl shadow-sm border p-6 space-y-4">
      <header class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 class="text-lg font-semibold tracking-tight">Livrets — Solde & gains</h2>
        <div class="flex items-center gap-2">
          <label class="text-sm text-gray-600" for="livretWidgetSelect">Sélection</label>
          <select
            id="livretWidgetSelect"
            class="input w-full md:w-72"
            [ngModel]="sel()"
            (ngModelChange)="onSelect($event)"
          >
            @for (s of livrets(); track s) {
              <option [value]="s">{{ s }}</option>
            }
          </select>
          <button type="button" class="btn-primary" (click)="toggle()">
            {{ expanded() ? 'Réduire' : 'Agrandir' }}
          </button>
        </div>
      </header>

      @if (sel() && expanded()) {
        <!-- KPIs -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div class="card-kpi">
            <p class="kpi-label">Investi</p>
            <p class="kpi-value">{{ invested(sel()) | currency: 'EUR' }}</p>
          </div>
          <div class="card-kpi">
            <p class="kpi-label">Gains crédités</p>
            <div class="flex items-center gap-2">
              <p class="kpi-value">{{ generated(sel()) | currency: 'EUR' }}</p>
              @if (gainRatio(sel()) !== null) {
                <span class="kpi-badge">
                  {{ gainRatio(sel())! | percent: '1.2-2' }}
                </span>
              } @else {
                <span class="kpi-badge muted">—</span>
              }
            </div>
          </div>
          <div class="card-kpi">
            <p class="kpi-label">Solde en cours</p>
            <p class="kpi-value">
              {{ invested(sel()) + generated(sel()) | currency: 'EUR' }}
            </p>
          </div>
        </div>

        <div class="flex flex-wrap items-center justify-between gap-2">
          <p class="text-xs text-gray-500">
            Dernier crédit :
            <span class="font-medium">
              {{ lastCreditDate(sel()) ? (lastCreditDate(sel())! | date: 'dd/MM/yyyy') : '—' }}
            </span>
          </p>
        </div>

        <!-- Historique des crédits -->
        <div class="rounded-2xl border p-3 space-y-3">
          <div class="flex items-center justify-between">
            <h3 class="text-sm font-medium">Historique des gains</h3>
          </div>

          <ul class="text-sm divide-y rounded-xl border">
            @for (c of credits(sel()); track c.date + c.amount) {
              <li class="flex items-center justify-between px-3 py-2">
                <span class="text-gray-600">{{ c.date | date: 'dd/MM/yyyy' }}</span>
                <span class="font-medium">{{ c.amount | currency: 'EUR' }}</span>
              </li>
            }
            @if (credits(sel()).length === 0) {
              <li class="px-3 py-2 text-gray-500">Aucun gain enregistré</li>
            }
          </ul>

          <!-- Ajout d'un crédit -->
          <div class="flex flex-wrap items-end gap-3">
            <div class="flex flex-col">
              <label class="label-xs" for="creditAmount">Montant (€)</label>
              <input
                id="creditAmount"
                type="number"
                step="any"
                class="input w-40"
                [(ngModel)]="creditAmount"
                placeholder="Ex: 12.34"
              />
            </div>
            <div class="flex flex-col">
              <label class="label-xs" for="creditDate">Date</label>
              <input id="creditDate" type="date" class="input" [(ngModel)]="creditDate" />
            </div>
            <button class="btn-primary" (click)="addCredit()" [disabled]="!canAdd()">
              + Ajouter
            </button>
          </div>
        </div>
      }
    </section>
  `,
  styles: [
    `
      .input {
        @apply border rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none;
      }
      .label-xs {
        @apply text-xs text-gray-600 mb-1;
      }
      .card-kpi {
        @apply rounded-xl border p-4;
      }
      .kpi-label {
        @apply text-xs text-gray-500;
      }
      .kpi-value {
        @apply text-2xl font-semibold;
      }
      .btn-primary {
        @apply px-3 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition disabled:opacity-50;
      }
      .kpi-badge {
        @apply inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-blue-50 text-blue-700;
      }
      .kpi-badge.muted {
        @apply bg-gray-100 text-gray-500;
      }
    `,
  ],
})
export class LivretAmountWidgetComponent {
  private prices = inject(PriceService);
  private txs = inject(TransactionService);
  private auth = inject(AuthService);

  sel = signal<string>('');
  creditAmount: number | null = null;
  creditDate: string = this.todayIso();
  expanded = signal(true);

  // Liste des livrets pour l'utilisateur connecté
  livrets = computed(() => {
    const u = this.auth.currentUser();
    if (!u) return [] as string[];
    const set = new Set<string>();
    for (const t of this.txs.transactions()) {
      if (t.userId !== u.id) continue;
      if (t.assetType === 'livret') {
        set.add((t.symbol || '').trim().toUpperCase());
      }
    }
    return Array.from(set).sort();
  });

  // Bouton "+ Ajouter" actif si: livret sélectionné, montant > 0, date AAAA-MM-JJ
  canAdd = computed(() => {
    const hasSel = !!this.sel();
    const amt = Number(this.creditAmount);
    const goodAmt = !isNaN(amt) && amt > 0;
    const goodDate = !!this.creditDate && this.creditDate.length === 10;
    return hasSel && goodAmt && goodDate;
  });

  constructor() {
    // auto-select premier livret disponible
    effect(() => {
      if (!this.sel() && this.livrets().length) {
        this.sel.set(this.livrets()[0]);
      }
    });
  }

  toggle() {
    this.expanded.set(!this.expanded());
  }
  onSelect(sym: string) {
    this.sel.set(sym);
  }

  // Investi = somme buy - somme sell
  invested = (sym: string): number => {
    const up = (sym || '').toUpperCase();
    const u = this.auth.currentUser();
    if (!u) return 0;

    let sum = 0;
    for (const t of this.txs.transactions()) {
      if (t.userId !== u.id) continue;
      if (t.assetType !== 'livret') continue;
      if ((t.symbol || '').toUpperCase() !== up) continue;
      if (t.type === 'buy') sum += Number(t.pricePerUnit) || 0;
      if (t.type === 'sell') sum -= Number(t.pricePerUnit) || 0;
    }
    return sum;
  };

  credits = (sym: string) => this.prices.listLivretCredits(sym);
  generated = (sym: string): number => this.prices.totalLivretCredits(sym);
  lastCreditDate = (sym: string) => this.prices.lastCreditDate(sym);

  /** ROI = gains / investi (null si investi <= 0) */
  gainRatio = (sym: string): number | null => {
    const inv = this.invested(sym);
    if (inv <= 0) return null;
    return this.generated(sym) / inv;
  };

  addCredit() {
    if (!this.canAdd()) return;

    const s = this.sel();
    const amt = Number(this.creditAmount);
    const dateIso =
      this.creditDate && this.creditDate.length === 10 ? this.creditDate : this.todayIso();

    this.prices.addLivretCredit(s, amt, dateIso);
    this.creditAmount = null;
    this.creditDate = this.todayIso();
  }

  private todayIso(): string {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  }
}
