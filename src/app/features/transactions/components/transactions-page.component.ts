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

function positive(control: AbstractControl): ValidationErrors | null {
  const v = Number(control.value);
  return isNaN(v) || v <= 0 ? { positive: true } : null;
}
type AssetType = 'stock' | 'etf' | 'crypto' | 'livret';

@Component({
  standalone: true,
  selector: 'app-transactions-page',
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterLink, DatePipe, CurrencyPipe],
  template: `
    <section class="max-w-5xl mx-auto space-y-6">
      <header class="flex items-center justify-between">
        <h1 class="text-2xl font-bold">Transactions</h1>
        @if (portfolios().length === 0) {
          <a routerLink="/portfolio" class="px-3 py-2 rounded-lg border hover:bg-gray-50">
            Créer un portefeuille
          </a>
        }
      </header>

      @if (portfolios().length === 0) {
        <div class="rounded-xl border border-amber-300 bg-amber-50 p-4">
          <p class="text-amber-800">
            Aucun portefeuille trouvé. Crée-en un pour pouvoir enregistrer des transactions.
          </p>
          <a
            routerLink="/portfolio"
            class="inline-flex items-center mt-3 px-3 py-2 rounded-lg bg-amber-600 text-white hover:bg-amber-700"
            >Créer un portefeuille</a
          >
        </div>
      }

      <!-- Formulaire -->
      <div class="bg-white rounded-2xl shadow p-6 space-y-5">
        <div class="flex items-center justify-between">
          <h2 class="text-lg font-semibold">
            {{ editId() ? 'Modifier la transaction' : 'Ajouter une transaction' }}
          </h2>
          @if (editId()) {
            <button
              type="button"
              (click)="resetForm()"
              class="text-sm text-gray-600 hover:underline"
            >
              Annuler l’édition
            </button>
          }
        </div>

        <form [formGroup]="form" (ngSubmit)="onSubmit()" novalidate class="space-y-4">
          <!-- Ligne 1 -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label for="pf" class="block text-sm font-medium text-gray-700 mb-1"
                >Portefeuille</label
              >
              <select
                id="pf"
                formControlName="portfolioId"
                class="w-full border rounded-lg px-3 py-2"
                [disabled]="portfolios().length === 0"
              >
                @for (p of portfolios(); track p.id) {
                  <option [value]="p.id">{{ p.name }}</option>
                }
              </select>
            </div>

            <div>
              <label for="asset" class="block text-sm font-medium text-gray-700 mb-1"
                >Type d'actif</label
              >
              <select
                id="asset"
                formControlName="assetType"
                class="w-full border rounded-lg px-3 py-2"
              >
                <option value="stock">Action</option>
                <option value="etf">ETF</option>
                <option value="crypto">Crypto</option>
                <option value="livret">Livret</option>
              </select>
            </div>

            <div>
              <label for="t" class="block text-sm font-medium text-gray-700 mb-1"
                >Type d'ordre</label
              >
              <select id="t" formControlName="type" class="w-full border rounded-lg px-3 py-2">
                <option value="buy">Achat</option>
                <option value="sell">Vente</option>
              </select>
            </div>
          </div>

          <!-- Symbole (input + datalist + select) -->
          <div>
            <label for="symbol" class="block text-sm font-medium text-gray-700 mb-1">Symbole</label>
            <div class="flex gap-2 items-center">
              <input
                id="symbol"
                type="text"
                formControlName="symbol"
                class="w-full border rounded-lg px-3 py-2"
                placeholder="Ex: AAPL, BTC, CSPX"
                list="symbolOptions"
                (input)="ensureUpper()"
                (focus)="ensureUpper()"
              />
              <select
                class="min-w-[14rem] border rounded-lg px-2 py-2"
                [disabled]="knownSymbols().length === 0"
                (change)="onPickExisting($any($event.target).value)"
              >
                <option value="">
                  {{
                    knownSymbols().length
                      ? '— Sélectionner (' + knownSymbols().length + ') —'
                      : 'Aucun symbole'
                  }}
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
            @if (form.controls['symbol']?.invalid && form.controls['symbol']?.touched) {
              <p class="text-xs text-red-600 mt-1">Symbole requis</p>
            }
          </div>

          <!-- Champs dynamiques -->
          @if (assetTypeSel() === 'livret') {
            <div class="grid grid-cols-1 gap-4">
              <div>
                <label for="ppu" class="block text-sm font-medium text-gray-700 mb-1"
                  >Montant (EUR)</label
                >
                <input
                  id="ppu"
                  type="number"
                  step="any"
                  formControlName="pricePerUnit"
                  class="w-full border rounded-lg px-3 py-2"
                />
                <p class="text-xs text-gray-500 mt-1">
                  Pour les livrets : quantité = 1, frais = 0.
                </p>
              </div>
            </div>
          } @else {
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label for="qty" class="block text-sm font-medium text-gray-700 mb-1"
                  >Quantité</label
                >
                <input
                  id="qty"
                  type="number"
                  step="any"
                  formControlName="quantity"
                  class="w-full border rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label for="ppu" class="block text-sm font-medium text-gray-700 mb-1"
                  >Prix unitaire (EUR)</label
                >
                <input
                  id="ppu"
                  type="number"
                  step="any"
                  formControlName="pricePerUnit"
                  class="w-full border rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label for="fees" class="block text-sm font-medium text-gray-700 mb-1"
                  >Frais (EUR)</label
                >
                <input
                  id="fees"
                  type="number"
                  step="any"
                  formControlName="fees"
                  class="w-full border rounded-lg px-3 py-2"
                />
                <p class="text-xs text-gray-500 mt-1">Optionnel</p>
              </div>
            </div>
          }

          <div class="pt-2">
            <button
              type="submit"
              [disabled]="form.invalid || saving() || portfolios().length === 0"
              class="px-4 py-2.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {{ saving() ? 'Enregistrement…' : editId() ? 'Mettre à jour' : 'Ajouter' }}
            </button>
            @if (editId()) {
              <button
                type="button"
                (click)="resetForm()"
                class="ml-2 px-4 py-2.5 rounded-lg border hover:bg-gray-50"
              >
                Annuler
              </button>
            }
          </div>
        </form>
      </div>

      <!-- Liste -->
      <div class="overflow-auto rounded-2xl border bg-white">
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
              <th class="px-3 py-2 text-right"></th>
            </tr>
          </thead>
          <tbody>
            @for (t of mineSorted(); track t.id) {
              <tr class="border-t hover:bg-gray-50">
                <td class="px-3 py-2 whitespace-nowrap">{{ t.createdAt | date: 'dd/MM/yyyy' }}</td>
                <td class="px-3 py-2">{{ portfolioNameOf(t.portfolioId) }}</td>
                <td class="px-3 py-2 capitalize">{{ t.assetType }}</td>
                <td class="px-3 py-2">{{ t.symbol }}</td>
                <td class="px-3 py-2 uppercase">{{ t.type }}</td>
                <td class="px-3 py-2 text-right">{{ t.quantity }}</td>
                <td class="px-3 py-2 text-right">{{ t.pricePerUnit | number: '1.2-2' }}</td>
                <td class="px-3 py-2 text-right">{{ t.fees ?? 0 | currency: 'EUR' }}</td>
                <td class="px-3 py-2 text-right">
                  <button (click)="edit(t)" class="text-blue-600 hover:underline mr-3">
                    Éditer
                  </button>
                  <button (click)="onDelete(t.id)" class="text-red-600 hover:underline">
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
})
export class TransactionsPageComponent {
  private fb = inject(FormBuilder);
  private txSrv = inject(TransactionService);
  private pfSrv = inject(PortfolioService);
  private auth = inject(AuthService);

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

  // ---- BRIDGE FORM CONTROL -> SIGNAL (sans toSignal)
  private assetTypeCtrl = this.form.get('assetType') as FormControl<AssetType>;
  assetTypeSel = signal<AssetType>(this.assetTypeCtrl.value ?? 'stock');

  constructor() {
    const u = this.auth.currentUser();
    const list = u ? this.pfSrv.listByUser(u.id) : [];
    this.portfolios.set(list);
    if (list.length > 0) this.form.patchValue({ portfolioId: list[0].id });

    // sync control -> signal
    this.assetTypeCtrl.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((v) => this.assetTypeSel.set((v ?? 'stock') as AssetType));

    // livret: champs dynamiques
    this.onAssetTypeChange(this.assetTypeSel());
    this.assetTypeCtrl.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((t: AssetType) => this.onAssetTypeChange(t));

    // auto-bascule de type si aucun symbole pour le type sélectionné
    effect(() => {
      if (this.editId()) return;
      const ctrlType = this.assetTypeCtrl;

      const curType = this.assetTypeSel();
      const knownCur = this.knownSymbols();
      const prefType = this.preferredType();

      if (knownCur.length === 0 && prefType && prefType !== curType) {
        ctrlType.setValue(prefType);
        return;
      }
    });
  }

  // symboles existants par type
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

  // type avec le plus de symboles
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

  // symboles connus pour type courant
  knownSymbols = computed<string[]>(() => {
    const t = this.assetTypeSel();
    const set = this.symbolsByType()[t] as Set<string>;
    return Array.from(set)
      .map((s) => String(s))
      .sort((a, b) => a.localeCompare(b));
  });

  onPickExisting(symbol: string) {
    if (!symbol) return;
    this.form.get('symbol')!.setValue(symbol);
  }

  ensureUpper() {
    const c = this.form.get('symbol')!;
    const up = this.normalize(c.value || '');
    if (up !== c.value) c.setValue(up, { emitEvent: false });
  }

  // Liste triée
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
    } else {
      if (qty.disabled) qty.enable({ emitEvent: false });
      if (fees.disabled) fees.enable({ emitEvent: false });
    }
  }

  resetForm() {
    const pf = this.form.get('portfolioId')!.value ?? this.portfolios()[0]?.id ?? null;
    const at = this.assetTypeSel(); // garde le type courant
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
      symbol: this.normalize(t.symbol),
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

    const dto: CreateTransactionDto = {
      userId: user.id,
      portfolioId: Number(v.portfolioId),
      type: v.type,
      assetType: v.assetType,
      symbol: this.normalize(v.symbol),
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
