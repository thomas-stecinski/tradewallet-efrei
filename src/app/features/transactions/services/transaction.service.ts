import { Injectable, computed, signal } from '@angular/core';
import { safeStorage } from '../../../core/utils/storage';
import { CreateTransactionDto, Transaction } from '../../../core/models/transaction.model';

const LS_TX_KEY = 'tw_transactions';

function revive(txs: Transaction[]): Transaction[] {
  return txs.map((t) => ({ ...t, createdAt: new Date(t.createdAt) }));
}

@Injectable({ providedIn: 'root' })
export class TransactionService {
  private txSig = signal<Transaction[]>(this.load());
  transactions = computed(() => this.txSig());

  // agrégats utiles (inclut 'livret')
  totalByAssetType = computed(() => {
    const map: Record<'stock' | 'etf' | 'crypto' | 'livret', number> = {
      stock: 0,
      etf: 0,
      crypto: 0,
      livret: 0,
    };
    for (const t of this.txSig()) {
      const k = (t.assetType as 'stock' | 'etf' | 'crypto' | 'livret') || 'stock';
      map[k] += t.total;
    }
    return map;
  });
  totalAll = computed(() => this.txSig().reduce((acc, t) => acc + t.total, 0));

  private delay(ms = 200) {
    return new Promise((r) => setTimeout(r, ms));
  }

  async list(): Promise<Transaction[]> {
    await this.delay(100);
    return this.txSig();
  }

  async getById(id: number): Promise<Transaction | undefined> {
    await this.delay(80);
    return this.txSig().find((t) => t.id === id);
  }

  async create(payload: CreateTransactionDto): Promise<Transaction> {
    await this.delay(150);

    const signed = payload.type === 'buy' ? 1 : -1;
    const total = signed * (payload.quantity * payload.pricePerUnit) + (payload.fees ?? 0);

    const tx: Transaction = {
      id: Date.now(),
      userId: payload.userId,
      portfolioId: payload.portfolioId,
      type: payload.type,
      assetType: payload.assetType,
      symbol: payload.symbol,
      quantity: payload.quantity,
      pricePerUnit: payload.pricePerUnit,
      fees: payload.fees ?? 0,
      total,
      createdAt: new Date(),
    };

    const next = [...this.txSig(), tx];
    this.txSig.set(next);
    this.save(next);
    return tx;
  }

  async update(id: number, patch: Partial<CreateTransactionDto>): Promise<Transaction | undefined> {
    await this.delay(150);

    let updated: Transaction | undefined;
    const next = this.txSig().map((t) => {
      if (t.id !== id) return t;

      const merged = { ...t, ...patch } as Transaction;

      const signed = merged.type === 'buy' ? 1 : -1;
      const quantity = merged.quantity;
      const pricePerUnit = merged.pricePerUnit;
      const fees = merged.fees ?? 0;

      merged.total = signed * (quantity * pricePerUnit) + fees;
      updated = merged;
      return merged;
    });

    this.txSig.set(next);
    this.save(next);
    return updated;
  }

  async remove(id: number): Promise<boolean> {
    await this.delay(120);
    const before = this.txSig().length;
    const next = this.txSig().filter((t) => t.id !== id);
    this.txSig.set(next);
    this.save(next);
    return next.length < before;
  }

  // storage
  private load(): Transaction[] {
    const raw = safeStorage.getItem(LS_TX_KEY);
    if (!raw) return [];
    return revive(JSON.parse(raw));
  }
  private save(data: Transaction[]) {
    safeStorage.setItem(LS_TX_KEY, JSON.stringify(data));
  }
}
