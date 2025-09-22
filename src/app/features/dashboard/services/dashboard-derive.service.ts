import { Injectable, computed, inject, signal } from '@angular/core';
import { TransactionService } from '../../transactions/services/transaction.service';
import { PortfolioService } from '../../portfolio/services/portfolio.service';
import { AuthService } from '../../auth/services/auth.service';
import type { Transaction } from '../../../core/models/transaction.model';

export type Range = '7d' | '30d' | '12m' | 'all';
type Bucket = 'day' | 'month';

// ✅ AJOUT de 'livret' partout où il faut
export type AssetType = 'stock' | 'etf' | 'crypto' | 'livret';

export interface DashboardFilters {
  range: Range;
  portfolioId: number | 'all';
  assetType: '' | AssetType; // ✅ accepte '' et livret
  symbol: string; // symbole exact (MAJ), vide => tous
}

/* ---------- Utils dates ---------- */
const MS_DAY = 24 * 60 * 60 * 1000;

function floorDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function dayKey(d: Date): string {
  const x = floorDay(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
}
function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
function dayLabel(key: string): string {
  const [, m, d] = key.split('-');
  return `${d}/${m}`;
}
function monthLabel(key: string): string {
  const [y, m] = key.split('-');
  return `${m}/${y}`;
}

function lastNDaysKeys(n: number): string[] {
  const today = floorDay(new Date());
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(+today - (n - 1 - i) * MS_DAY);
    return dayKey(d);
  });
}

function lastNMonthsKeys(n: number): string[] {
  const now = new Date();
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (n - 1 - i), 1);
    return monthKey(d);
  });
}

function monthSpanKeys(minDate: Date, maxDate: Date): string[] {
  const start = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
  const end = new Date(maxDate.getFullYear(), maxDate.getMonth(), 1);
  const keys: string[] = [];
  const cur = new Date(start);
  while (cur <= end) {
    keys.push(monthKey(cur));
    cur.setMonth(cur.getMonth() + 1);
  }
  return keys;
}

@Injectable({ providedIn: 'root' })
export class DashboardDeriveService {
  private txSrv = inject(TransactionService);
  private pfSrv = inject(PortfolioService);
  private auth = inject(AuthService);

  filters = signal<DashboardFilters>({
    range: '12m',
    portfolioId: 'all',
    assetType: '', // ✅ par défaut: tous actifs
    symbol: '',
  });

  /* -------- Sources -------- */
  private mine = computed<Transaction[]>(() => {
    const u = this.auth.currentUser();
    if (!u) return [];
    return this.txSrv.transactions().filter((t) => t.userId === u.id);
  });

  /* -------- Options pour les menus -------- */
  // Liste de symboles (normalisés en MAJ). Tu peux la filtrer par assetType si tu veux.
  readonly symbols = computed(() => {
    const s = new Set<string>();
    for (const t of this.mine()) s.add(t.symbol.toUpperCase());
    return Array.from(s).sort();
  });

  readonly portfolios = computed(() => {
    const u = this.auth.currentUser();
    return u ? this.pfSrv.listByUser(u.id) : [];
  });

  /* -------- Série agrégée selon la plage -------- */
  readonly series = computed(() => {
    const { range, portfolioId, assetType, symbol } = this.filters();
    const sym = symbol.trim().toUpperCase();

    const bucket: Bucket = range === '7d' || range === '30d' ? 'day' : 'month';

    let keys: string[] = [];
    if (range === '7d') keys = lastNDaysKeys(7);
    else if (range === '30d') keys = lastNDaysKeys(30);
    else if (range === '12m') keys = lastNMonthsKeys(12);
    else {
      const list = this.mine();
      if (list.length === 0) keys = lastNMonthsKeys(1);
      else {
        const min = list.reduce((a, b) => (a.createdAt < b.createdAt ? a : b)).createdAt;
        const max = list.reduce((a, b) => (a.createdAt > b.createdAt ? a : b)).createdAt;
        keys = monthSpanKeys(min, max);
      }
    }

    const acc = new Map<string, number>(keys.map((k) => [k, 0]));

    for (const t of this.mine()) {
      if (portfolioId !== 'all' && t.portfolioId !== portfolioId) continue;
      if (assetType && t.assetType !== assetType) continue; // ✅ “livret” accepté ici
      if (sym && t.symbol.toUpperCase() !== sym) continue;

      const k = bucket === 'day' ? dayKey(t.createdAt) : monthKey(t.createdAt);
      if (acc.has(k)) acc.set(k, (acc.get(k) ?? 0) + t.total);
    }

    return keys.map((k) => ({
      label: bucket === 'day' ? dayLabel(k) : monthLabel(k),
      total: acc.get(k) ?? 0,
    }));
  });

  readonly total = computed(() => this.series().reduce((s, p) => s + p.total, 0));
}
