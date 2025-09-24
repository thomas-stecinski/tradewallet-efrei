import { Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule, DatePipe, CurrencyPipe } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
  AbstractControl,
  ValidationErrors,
  FormControl,
} from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { TransactionService } from '../services/transaction.service';
import { PortfolioService } from '../../portfolio/services/portfolio.service';
import { AuthService } from '../../auth/services/auth.service';
import { CreateTransactionDto, Transaction } from '../../../core/models/transaction.model';
import { PriceService } from '../../market/services/price.service';

import { LivretAmountWidgetComponent } from '../../market/components/livret-amount-widget.component';

function positive(control: AbstractControl): ValidationErrors | null {
  const v = Number(control.value);
  return isNaN(v) || v <= 0 ? { positive: true } : null;
}
type AssetType = 'stock' | 'etf' | 'crypto' | 'livret';

@Component({
  standalone: true,
  selector: 'app-transactions-page',
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterLink,
    DatePipe,
    CurrencyPipe,
    LivretAmountWidgetComponent,
  ],
  template: `
    <section class="max-w-6xl mx-auto space-y-8">
      <!-- Header -->
      <header class="flex items-center justify-between">
        <h1 class="text-3xl font-bold tracking-tight">Transactions</h1>
        @if (portfolios().length === 0) {
          <a routerLink="/portfolio" class="btn-primary"> Créer un portefeuille </a>
        }
      </header>

      <!-- Message si aucun portefeuille -->
      @if (portfolios().length === 0) {
        <div class="rounded-xl border border-amber-300 bg-amber-50 p-5">
          <p class="text-amber-800">
            Aucun portefeuille trouvé. Créez-en un pour pouvoir enregistrer vos transactions.
          </p>
          <a routerLink="/portfolio" class="inline-block mt-3 btn-amber"> Créer un portefeuille </a>
        </div>
      }

      <!-- Formulaire -->
      <div class="bg-white rounded-2xl shadow-md p-6 space-y-5">
        <div class="flex items-center justify-between border-b pb-3">
          <h2 class="text-lg font-semibold">
            {{ editId() ? 'Modifier la transaction' : 'Nouvelle transaction' }}
          </h2>
          @if (editId()) {
            <button
              type="button"
              (click)="resetForm()"
              class="text-sm text-gray-500 hover:text-gray-700"
            >
              Annuler
            </button>
          }
        </div>

        <form [formGroup]="form" (ngSubmit)="onSubmit()" novalidate class="space-y-5">
          <!-- Ligne 1 -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label for="pf" class="label">Portefeuille</label>
              <select
                id="pf"
                formControlName="portfolioId"
                class="input"
                [disabled]="portfolios().length === 0"
              >
                @for (p of portfolios(); track p.id) {
                  <option [value]="p.id">{{ p.name }}</option>
                }
              </select>
            </div>

            <div>
              <label for="asset" class="label">Type d'actif</label>
              <select
                id="asset"
                formControlName="assetType"
                class="input"
                (change)="onAssetTypeSelect($any($event.target).value)"
              >
                <option value="stock">Action</option>
                <option value="etf">ETF</option>
                <option value="crypto">Crypto</option>
                <option value="livret">Livret</option>
              </select>
            </div>
            <div>
              <label for="t" class="label">Type d'ordre</label>
              <select id="t" formControlName="type" class="input">
                <option value="buy">Achat</option>
                <option value="sell">Vente</option>
              </select>
            </div>
          </div>

          <!-- Symbole -->
          <div>
            <label
              class="label"
              [attr.for]="assetTypeSel() === 'livret' ? 'symbolLivret' : 'symbol'"
            >
              Symbole
            </label>

            <!-- LIVRET = menu déroulant UNIQUEMENT (responsive) -->
            @if (assetTypeSel() === 'livret') {
              <div class="flex flex-wrap items-center gap-2">
                <select id="symbolLivret" class="input w-full md:w-72" formControlName="symbol">
                  <option value="" disabled>— Choisir un livret —</option>
                  @for (s of livretOptions(); track s) {
                    <option [value]="s">{{ s }}</option>
                  }
                </select>
              </div>

              @if (form.controls['symbol'].invalid && form.controls['symbol'].touched) {
                <p class="text-xs text-red-600 mt-1">Sélectionne un livret</p>
              }
            }

            <!-- AUTRES ACTIFS = input + petit select -->
            @else {
              <div class="grid grid-cols-12 gap-2">
                <input
                  id="symbol"
                  type="text"
                  formControlName="symbol"
                  class="input col-span-7 md:col-span-10"
                  placeholder="Ex: AAPL, BTC, CSPX"
                  list="symbolOptions"
                  (input)="ensureUpper()"
                  (focus)="ensureUpper()"
                />
                <select
                  class="input col-span-5 md:col-span-2 shrink-0"
                  [disabled]="knownSymbols().length === 0"
                  (change)="onPickExisting($any($event.target).value)"
                >
                  <option value="">
                    {{ knownSymbols().length ? '— Choisir —' : 'Aucun symbole' }}
                  </option>
                  @for (s of knownSymbols(); track s) {
                    <option [value]="s">{{ s }}</option>
                  }
                </select>
              </div>
              <datalist id="symbolOptions">
                @for (s of knownSymbols(); track s) {
                  <option [value]="s"></option>
                }
              </datalist>

              @if (form.controls['symbol'].invalid && form.controls['symbol'].touched) {
                <p class="text-xs text-red-600 mt-1">Symbole requis</p>
              }
            }
          </div>

          <!-- Champs dynamiques -->
          @if (assetTypeSel() === 'livret') {
            <div>
              <label for="ppu" class="label">Montant (EUR)</label>
              <input
                id="ppu"
                type="number"
                step="any"
                formControlName="pricePerUnit"
                class="input"
              />
              <p class="text-xs text-gray-500 mt-1">Pour les livrets : quantité = 1, frais = 0.</p>
            </div>
          } @else {
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label for="qty" class="label">Quantité</label>
                <input id="qty" type="number" step="any" formControlName="quantity" class="input" />
              </div>
              <div>
                <label for="ppu2" class="label">Prix unitaire (EUR)</label>
                <input
                  id="ppu2"
                  type="number"
                  step="any"
                  formControlName="pricePerUnit"
                  class="input"
                />
              </div>
              <div>
                <label for="fees" class="label">Frais (EUR)</label>
                <input id="fees" type="number" step="any" formControlName="fees" class="input" />
                <p class="text-xs text-gray-500 mt-1">Optionnel</p>
              </div>
            </div>
          }

          <!-- Boutons -->
          <div class="flex gap-3">
            <button
              type="submit"
              [disabled]="form.invalid || saving() || portfolios().length === 0"
              class="btn-primary"
            >
              {{ saving() ? 'Enregistrement…' : editId() ? 'Mettre à jour' : 'Ajouter' }}
            </button>
            @if (editId()) {
              <button type="button" (click)="resetForm()" class="btn-secondary">Annuler</button>
            }
          </div>
        </form>
      </div>

      <!-- Widget Livret (dépliable, replié par défaut ici) -->
      <app-livret-amount-widget [initiallyOpen]="false"></app-livret-amount-widget>

      <!-- Liste -->
      <div class="bg-white rounded-2xl shadow-md overflow-hidden">
        <table class="min-w-full text-sm">
          <thead class="bg-gray-100 text-gray-700">
            <tr>
              <th class="th">Date</th>
              <th class="th">Portefeuille</th>
              <th class="th">Actif</th>
              <th class="th">Symbole</th>
              <th class="th">Type</th>
              <th class="th text-right">Qté</th>
              <th class="th text-right">Prix (EUR)</th>
              <th class="th text-right">Frais (EUR)</th>
              <th class="th text-right"></th>
            </tr>
          </thead>
          <tbody class="divide-y">
            @for (t of mineSorted(); track t.id) {
              <tr class="hover:bg-gray-50">
                <td class="td">{{ t.createdAt | date: 'dd/MM/yyyy' }}</td>
                <td class="td">{{ portfolioNameOf(t.portfolioId) }}</td>
                <td class="td capitalize">{{ t.assetType }}</td>
                <td class="td">{{ t.symbol }}</td>
                <td class="td uppercase">{{ t.type }}</td>
                <td class="td text-right">{{ t.quantity }}</td>
                <td class="td text-right">{{ t.pricePerUnit | number: '1.2-2' }}</td>
                <td class="td text-right">{{ t.fees ?? 0 | currency: 'EUR' }}</td>
                <td class="td text-right space-x-2">
                  <button type="button" (click)="edit(t)" class="text-blue-600 hover:underline">
                    Éditer
                  </button>
                  <button
                    type="button"
                    (click)="onDelete(t.id)"
                    class="text-red-600 hover:underline"
                  >
                    Supprimer
                  </button>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </section>
  `,
  styles: [
    `
      .label {
        @apply block text-sm font-medium text-gray-700 mb-1;
      }
      .input {
        @apply w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none;
      }
      .btn-primary {
        @apply px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition disabled:opacity-50;
      }
      .btn-secondary {
        @apply px-4 py-2 rounded-lg border text-gray-700 hover:bg-gray-50 transition;
      }
      .btn-amber {
        @apply px-4 py-2 rounded-lg bg-amber-600 text-white hover:bg-amber-700 transition;
      }
      .th {
        @apply px-3 py-2 text-left font-medium;
      }
      .td {
        @apply px-3 py-2 whitespace-nowrap;
      }
    `,
  ],
})
export class TransactionsPageComponent {
  private fb = inject(FormBuilder);
  private txSrv = inject(TransactionService);
  private pfSrv = inject(PortfolioService);
  private auth = inject(AuthService);
  private prices = inject(PriceService);

  saving = signal(false);
  editId = signal<number | null>(null);

  portfolios = signal<{ id: number; name: string }[]>([]);

  form: FormGroup = this.fb.group({
    portfolioId: [null, [Validators.required]],
    assetType: ['stock', [Validators.required]],
    type: ['buy', [Validators.required]],
    symbol: ['', [Validators.required]],
    quantity: [1, [Validators.required, positive]],
    pricePerUnit: [0, [Validators.required, positive]],
    fees: [0],
  });

  private assetTypeCtrl = this.form.get('assetType') as FormControl<AssetType>;
  assetTypeSel = signal<AssetType>(this.assetTypeCtrl.value ?? 'stock');

  /** Options proposées pour les livrets (historique utilisateur + classiques) */
  livretOptions = computed(() => {
    const set = this.symbolsByType().livret;
    const existants = set ? Array.from(set) : [];
    const classiques = ['Livret A', 'LDDS', 'LEP', 'Livret Jeune'];
    return Array.from(new Set([...classiques, ...existants])).sort((a, b) => a.localeCompare(b));
  });

  constructor() {
    const u = this.auth.currentUser();
    const list = u ? this.pfSrv.listByUser(u.id) : [];
    this.portfolios.set(list);
    if (list.length > 0) this.form.patchValue({ portfolioId: list[0].id });

    this.assetTypeCtrl.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((v) => this.assetTypeSel.set((v ?? 'stock') as AssetType));

    this.onAssetTypeChange(this.assetTypeSel());
    this.assetTypeCtrl.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((t: AssetType) => this.onAssetTypeChange(t));

    // auto-switch vers le type le plus fréquent si aucun symbole saisi
    effect(() => {
      if (this.editId()) return;
      const ctrlType = this.assetTypeCtrl;
      const curType = this.assetTypeSel();
      const knownCur = this.knownSymbols();
      const prefType = this.preferredType();
      if (knownCur.length === 0 && prefType && prefType !== curType) {
        ctrlType.setValue(prefType);
      }
    });
  }

  onAssetTypeSelect(value: string) {
    const v = (value as AssetType) || 'stock';
    this.assetTypeCtrl.setValue(v);
  }
  onPickExisting(value: string) {
    if (!value) return;
    this.form.get('symbol')!.setValue(value);
  }

  // sets de symboles PAR UTILISATEUR
  symbolsByType = computed(() => {
    const u = this.auth.currentUser();
    const map: Record<AssetType, Set<string>> = {
      stock: new Set<string>(),
      etf: new Set<string>(),
      crypto: new Set<string>(),
      livret: new Set<string>(),
    };
    if (!u) return map;
    for (const t of this.txSrv.transactions()) {
      if (t.userId !== u.id) continue;
      map[t.assetType as AssetType].add(this.normalize(t.symbol));
    }
    return map;
  });

  preferredType = computed<AssetType | null>(() => {
    const m = this.symbolsByType();
    let best: AssetType | null = null;
    let max = 0;
    (['stock', 'etf', 'crypto', 'livret'] as AssetType[]).forEach((k) => {
      const n = m[k].size;
      if (n > max) {
        max = n;
        best = k;
      }
    });
    return max > 0 ? best : null;
  });

  knownSymbols = computed<string[]>(() => {
    const t = this.assetTypeSel();
    const set = this.symbolsByType()[t] as Set<string>;
    return Array.from(set)
      .map((s) => String(s))
      .sort((a, b) => a.localeCompare(b));
  });

  ensureUpper() {
    const c = this.form.get('symbol')!;
    const raw = (c.value || '') as string;
    if (this.assetTypeSel() === 'livret') return; // livret : pas de forçage de casse
    const up = this.normalize(raw);
    if (up !== raw) c.setValue(up, { emitEvent: false });
  }

  mineSorted = computed(() => {
    const u = this.auth.currentUser();
    if (!u) return [] as Transaction[];
    return this.txSrv
      .transactions()
      .filter((t) => t.userId === u.id)
      .slice()
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  });

  portfolioNameOf(id: number): string {
    return this.portfolios().find((p) => p.id === id)?.name ?? `#${id}`;
  }

  private onAssetTypeChange(t: AssetType) {
    const qty = this.form.get('quantity')!;
    const fees = this.form.get('fees')!;
    if (t === 'livret') {
      qty.setValue(1, { emitEvent: false });
      qty.disable({ emitEvent: false });
      fees.setValue(0, { emitEvent: false });
      fees.disable({ emitEvent: false });

      if (!this.form.get('symbol')?.value) this.form.get('symbol')?.markAsTouched();
    } else {
      if (qty.disabled) qty.enable({ emitEvent: false });
      if (fees.disabled) fees.enable({ emitEvent: false });
    }
  }

  resetForm() {
    const pf = this.form.get('portfolioId')!.value ?? this.portfolios()[0]?.id ?? null;
    const at = this.assetTypeSel();
    this.form.reset({
      portfolioId: pf,
      assetType: at,
      type: 'buy',
      symbol: '',
      quantity: 1,
      pricePerUnit: 0,
      fees: 0,
    });
    this.onAssetTypeChange(at);
    this.editId.set(null);
  }

  edit(t: Transaction) {
    this.editId.set(t.id);
    this.form.patchValue({
      portfolioId: t.portfolioId,
      assetType: t.assetType,
      type: t.type,
      symbol: t.symbol || '',
      quantity: t.quantity,
      pricePerUnit: t.pricePerUnit,
      fees: t.fees ?? 0,
    });
    this.onAssetTypeChange(t.assetType as AssetType);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async onDelete(id: number) {
    const ok = await this.txSrv.remove(id);
    if (!ok) alert('Suppression impossible');
    if (this.editId() === id) this.resetForm();
  }

  async onSubmit() {
    if (this.form.invalid) return;
    this.saving.set(true);

    const user = this.auth.currentUser();
    if (!user) {
      this.saving.set(false);
      alert('Utilisateur non connecté');
      return;
    }

    const v = this.form.getRawValue();
    const isLivret = v.assetType === 'livret';

    let symbol = (v.symbol || '').trim();
    if (isLivret) {
      const up = symbol.toUpperCase();
      if (!up.startsWith('LIVRET')) symbol = `Livret ${symbol}`;
    } else {
      symbol = this.normalize(symbol);
    }

    const dto: CreateTransactionDto = {
      userId: user.id,
      portfolioId: Number(v.portfolioId),
      type: v.type,
      assetType: v.assetType,
      symbol,
      quantity: isLivret ? 1 : Number(v.quantity),
      pricePerUnit: Number(v.pricePerUnit),
      fees: isLivret ? 0 : Number(v.fees ?? 0),
    };

    try {
      if (this.editId()) await this.txSrv.update(this.editId()!, dto);
      else await this.txSrv.create(dto);
      this.resetForm();
    } finally {
      this.saving.set(false);
    }
  }

  private normalize(s: string) {
    return (s ?? '').trim().toUpperCase();
  }
}
