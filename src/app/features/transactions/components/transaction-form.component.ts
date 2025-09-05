import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TransactionService } from '../services/transaction.service';
import { CreateTransactionDto } from '../../../core/models/transaction.model';
import { AuthService } from '../../auth/services/auth.service';
import { PortfolioService } from '../../portfolio/services/portfolio.service';

function positive(control: AbstractControl): ValidationErrors | null {
  const v = Number(control.value);
  return isNaN(v) || v <= 0 ? { positive: true } : null;
}

@Component({
  standalone: true,
  selector: 'app-transaction-form',
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <section class="max-w-2xl mx-auto space-y-6">
      <header class="space-y-1">
        <h1 class="text-2xl font-bold text-gray-900">
          {{ isEdit() ? 'Modifier' : 'Nouvelle' }} transaction
        </h1>
        <p class="text-sm text-gray-600">
          Renseigne le symbole (AAPL, BTC, CSPX…), la quantité et le prix en EUR.
        </p>
      </header>

      <form
        [formGroup]="form"
        (ngSubmit)="onSubmit()"
        class="bg-white rounded-2xl shadow p-6 space-y-5"
        novalidate
      >
        <!-- Ligne 1 : Portefeuille + Type d'actif + Type d'ordre -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label for="pf" class="block text-sm font-medium text-gray-700 mb-1"
              >Portefeuille</label
            >
            <select
              id="pf"
              formControlName="portfolioId"
              class="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring focus:ring-blue-200"
            >
              @for (p of portfolios(); track p.id) {
                <option [value]="p.id">{{ p.name }}</option>
              }
            </select>
            @if (portfolios().length === 0) {
              <p class="text-xs text-amber-700 mt-1">
                Aucun portefeuille trouvé pour cet utilisateur.
              </p>
            }
          </div>

          <div>
            <label for="asset" class="block text-sm font-medium text-gray-700 mb-1"
              >Type d'actif</label
            >
            <select
              id="asset"
              formControlName="assetType"
              class="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring focus:ring-blue-200"
            >
              <option value="stock">Action</option>
              <option value="etf">ETF</option>
              <option value="crypto">Crypto</option>
            </select>
          </div>

          <div>
            <label for="t" class="block text-sm font-medium text-gray-700 mb-1">Type d'ordre</label>
            <select
              id="t"
              formControlName="type"
              class="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring focus:ring-blue-200"
            >
              <option value="buy">Achat</option>
              <option value="sell">Vente</option>
            </select>
          </div>
        </div>

        <!-- Ligne 2 : Symbole -->
        <div>
          <label for="symbol" class="block text-sm font-medium text-gray-700 mb-1">Symbole</label>
          <input
            id="symbol"
            type="text"
            formControlName="symbol"
            class="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring focus:ring-blue-200"
            placeholder="Ex: AAPL, BTC, CSPX"
            [attr.aria-invalid]="form.controls['symbol']?.invalid || null"
            [attr.aria-describedby]="form.controls['symbol']?.invalid ? 'symbol-error' : null"
          />
          @if (form.controls['symbol']?.invalid && form.controls['symbol']?.touched) {
            <p id="symbol-error" class="text-xs text-red-600 mt-1">Symbole requis</p>
          }
        </div>

        <!-- Ligne 3 : Qté / Prix / Frais -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label for="qty" class="block text-sm font-medium text-gray-700 mb-1">Quantité</label>
            <input
              id="qty"
              type="number"
              step="any"
              formControlName="quantity"
              class="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring focus:ring-blue-200"
              [attr.aria-invalid]="form.controls['quantity']?.invalid || null"
              [attr.aria-describedby]="form.controls['quantity']?.invalid ? 'qty-error' : null"
            />
            @if (form.controls['quantity']?.invalid && form.controls['quantity']?.touched) {
              <p id="qty-error" class="text-xs text-red-600 mt-1">Quantité &gt; 0</p>
            }
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
              class="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring focus:ring-blue-200"
              [attr.aria-invalid]="form.controls['pricePerUnit']?.invalid || null"
              [attr.aria-describedby]="form.controls['pricePerUnit']?.invalid ? 'ppu-error' : null"
            />
            @if (form.controls['pricePerUnit']?.invalid && form.controls['pricePerUnit']?.touched) {
              <p id="ppu-error" class="text-xs text-red-600 mt-1">Prix &gt; 0</p>
            }
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
              class="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring focus:ring-blue-200"
            />
            <p class="text-xs text-gray-500 mt-1">Optionnel, par défaut 0</p>
          </div>
        </div>

        <div class="flex items-center gap-3 pt-2">
          <button
            type="submit"
            [disabled]="form.invalid || saving() || portfolios().length === 0"
            class="px-4 py-2.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {{ saving() ? 'Enregistrement...' : isEdit() ? 'Mettre à jour' : 'Créer' }}
          </button>
          <a routerLink="/transactions" class="px-4 py-2.5 rounded-lg border hover:bg-gray-50"
            >Annuler</a
          >
        </div>
      </form>
    </section>
  `,
})
export class TransactionFormComponent {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private txSrv = inject(TransactionService);
  private auth = inject(AuthService);
  private portfolioSrv = inject(PortfolioService);

  saving = signal(false);
  isEdit = signal(false);
  currentId: number | null = null;

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

  constructor() {
    // Précharger les portefeuilles de l’utilisateur
    const u = this.auth.currentUser();
    const list = u ? this.portfolioSrv.listByUser(u.id) : [];
    this.portfolios.set(list);

    if (list.length > 0) {
      this.form.patchValue({ portfolioId: list[0].id });
    }

    // Edition ?
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEdit.set(true);
      this.currentId = Number(id);
      this.loadExisting(this.currentId);
    }
  }

  private async loadExisting(id: number) {
    const t = await this.txSrv.getById(id);
    if (!t) {
      alert('Transaction introuvable');
      this.router.navigate(['/transactions']);
      return;
    }
    this.form.patchValue({
      portfolioId: t.portfolioId,
      assetType: t.assetType,
      type: t.type,
      symbol: t.symbol,
      quantity: t.quantity,
      pricePerUnit: t.pricePerUnit,
      fees: t.fees ?? 0,
    });
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
    const dto: CreateTransactionDto = {
      userId: user.id, // <- pris depuis l’auth
      portfolioId: Number(v.portfolioId),
      type: v.type,
      assetType: v.assetType,
      symbol: v.symbol.trim(),
      quantity: Number(v.quantity),
      pricePerUnit: Number(v.pricePerUnit),
      fees: Number(v.fees ?? 0),
    };

    try {
      if (this.isEdit() && this.currentId) {
        await this.txSrv.update(this.currentId, dto);
      } else {
        await this.txSrv.create(dto);
      }
      this.router.navigate(['/transactions']);
    } finally {
      this.saving.set(false);
    }
  }
}
