import { Injectable, computed, inject, signal } from '@angular/core';
import { TransactionService } from '../../transactions/services/transaction.service';
import { PortfolioService } from '../../portfolio/services/portfolio.service';
import { AuthService } from '../../auth/services/auth.service';
import { PriceService } from '../../market/services/price.service';
import type { Transaction } from '../../../core/models/transaction.model';

export type Range = '7d' | '30d' | '12m' | 'all';
type Bucket = 'day' | 'month';
export type AssetType = 'stock' | 'etf' | 'crypto' | 'livret';

export interface DashboardFilters {
  range: Range;
  portfolioId: number | 'all';
  assetType: '' | AssetType;
  symbol: string;
}

/* ---------- Dates utils ---------- */
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
function dayLabel(k: string) {
  const [, m, d] = k.split('-');
  return `${d}/${m}`;
}
function monthLabel(k: string) {
  const [y, m] = k.split('-');
  return `${m}/${y}`;
}
function lastNDaysKeys(n: number) {
  const t = floorDay(new Date());
  return Array.from({ length: n }, (_, i) => dayKey(new Date(+t - (n - 1 - i) * MS_DAY)));
}
function lastNMonthsKeys(n: number) {
  const now = new Date();
  return Array.from({ length: n }, (_, i) =>
    monthKey(new Date(now.getFullYear(), now.getMonth() - (n - 1 - i), 1)),
  );
}
function monthSpanKeys(minDate: Date, maxDate: Date) {
  const s = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
  const e = new Date(maxDate.getFullYear(), maxDate.getMonth(), 1);
  const keys: string[] = [];
  const c = new Date(s);
  while (c <= e) {
    keys.push(monthKey(c));
    c.setMonth(c.getMonth() + 1);
  }
  return keys;
}
function upcase(s: string) {
  return (s || '').trim().toUpperCase();
}

export interface StatSlice {
  invested: number;
  value: number;
  pnlUnrealized: number;
  pnlRealized: number;
  pnlPct: number;
}
export interface StatsByType {
  stock: StatSlice;
  etf: StatSlice;
  crypto: StatSlice;
  livret: StatSlice;
}
function emptySlice(): StatSlice {
  return { invested: 0, value: 0, pnlUnrealized: 0, pnlRealized: 0, pnlPct: 0 };
}

@Injectable({ providedIn: 'root' })
export class DashboardDeriveService {
  private txSrv = inject(TransactionService);
  private pfSrv = inject(PortfolioService);
  private auth = inject(AuthService);
  private prices = inject(PriceService);

  filters = signal<DashboardFilters>({
    range: '12m',
    portfolioId: 'all',
    assetType: '',
    symbol: '',
  });

  private mine = computed<Transaction[]>(() => {
    const u = this.auth.currentUser();
    if (!u) return [];
    return this.txSrv.transactions().filter((t) => t.userId === u.id);
  });

  readonly symbols = computed(() => {
    const s = new Set<string>();
    for (const t of this.mine()) s.add(upcase(t.symbol));
    return Array.from(s).sort();
  });
  readonly portfolios = computed(() => {
    const u = this.auth.currentUser();
    return u ? this.pfSrv.listByUser(u.id) : [];
  });

  readonly series = computed(() => {
    const { range, portfolioId, assetType, symbol } = this.filters();
    const sym = upcase(symbol);
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
      if (assetType && t.assetType !== assetType) continue;
      if (sym && upcase(t.symbol) !== sym) continue;
      const k = bucket === 'day' ? dayKey(t.createdAt) : monthKey(t.createdAt);
      if (acc.has(k)) acc.set(k, (acc.get(k) ?? 0) + t.total);
    }
    return keys.map((k) => ({
      label: bucket === 'day' ? dayLabel(k) : monthLabel(k),
      total: acc.get(k) ?? 0,
    }));
  });
  readonly total = computed(() => this.series().reduce((s, p) => s + p.total, 0));

  private filteredTxAllHistory = computed<Transaction[]>(() => {
    const { portfolioId, assetType, symbol } = this.filters();
    const sym = upcase(symbol);
    return this.mine().filter((t) => {
      if (portfolioId !== 'all' && t.portfolioId !== portfolioId) return false;
      if (assetType && t.assetType !== assetType) return false;
      if (sym && upcase(t.symbol) !== sym) return false;
      return true;
    });
  });

  private jan1(date = new Date()): Date {
    return new Date(date.getFullYear(), 0, 1, 0, 0, 0, 0);
  }

  private buildSlice(txs: Transaction[], type: AssetType): StatSlice {
    if (type === 'livret') {
      const bySym = new Map<string, Transaction[]>();
      for (const t of txs) {
        const s = upcase(t.symbol);
        if (!bySym.has(s)) bySym.set(s, []);
        bySym.get(s)!.push(t);
      }

      let investedYTD = 0;
      let value = 0;

      for (const [sym, list] of bySym) {
        const y0 = this.jan1();
        const depYTD = list
          .filter((t) => t.type === 'buy' && new Date(t.createdAt) >= y0)
          .reduce((acc, t) => acc + (Number(t.pricePerUnit) || 0), 0);
        investedYTD += depYTD;

        const state = this.prices.getLivretState(sym);
        const current =
          typeof state.currentAmount === 'number'
            ? state.currentAmount
            : list.reduce(
                (acc, t) => acc + (t.type === 'buy' ? Number(t.pricePerUnit) || 0 : 0),
                0,
              );

        value += current;
      }

      const pnlUnrealized = value - investedYTD;
      const pnlPct = investedYTD > 0 ? (pnlUnrealized / investedYTD) * 100 : 0;
      return { invested: investedYTD, value, pnlUnrealized, pnlRealized: 0, pnlPct };
    }

    interface Pos {
      qty: number;
      cost: number;
      realized: number;
      currentPrice: number;
    }
    const pos = new Map<string, Pos>();
    const ordered = txs.slice().sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt));

    for (const t of ordered) {
      const sym = upcase(t.symbol);
      if (!pos.has(sym)) pos.set(sym, { qty: 0, cost: 0, realized: 0, currentPrice: 0 });
      const p = pos.get(sym)!;

      p.currentPrice = this.prices.getCurrentPrice(sym, ordered);
      const qty = Number(t.quantity) || 0;
      const price = Number(t.pricePerUnit) || 0;
      const fees = Number(t.fees ?? 0) || 0;

      if (t.type === 'buy') {
        p.cost += qty * price + fees;
        p.qty += qty;
      } else {
        const q = Math.min(p.qty, qty);
        if (q > 0) {
          const avg = p.qty > 0 ? p.cost / p.qty : 0;
          const proceeds = q * price - fees;
          const costSold = q * avg;
          p.realized += proceeds - costSold;
          p.qty -= q;
          p.cost -= costSold;
        }
      }
    }

    let invested = 0,
      value = 0,
      unrealized = 0,
      realized = 0;
    for (const p of pos.values()) {
      if (p.qty > 0 && p.currentPrice > 0) {
        const v = p.qty * p.currentPrice;
        value += v;
        invested += p.cost;
        unrealized += v - p.cost;
      }
      realized += p.realized;
    }
    const pnlPct = invested > 0 ? (unrealized / invested) * 100 : 0;
    return { invested, value, pnlUnrealized: unrealized, pnlRealized: realized, pnlPct };
  }

  readonly statsByType = computed<StatsByType>(() => {
    const base: StatsByType = {
      stock: emptySlice(),
      etf: emptySlice(),
      crypto: emptySlice(),
      livret: emptySlice(),
    };
    const tx = this.filteredTxAllHistory();

    const map: Record<AssetType, Transaction[]> = { stock: [], etf: [], crypto: [], livret: [] };
    for (const t of tx) map[t.assetType as AssetType].push(t);

    base.stock = this.buildSlice(map.stock, 'stock');
    base.etf = this.buildSlice(map.etf, 'etf');
    base.crypto = this.buildSlice(map.crypto, 'crypto');
    base.livret = this.buildSlice(map.livret, 'livret');

    return base;
  });

  readonly statsOverall = computed<StatSlice>(() => {
    const s = this.statsByType();
    const invested = s.stock.invested + s.etf.invested + s.crypto.invested + s.livret.invested;
    const value = s.stock.value + s.etf.value + s.crypto.value + s.livret.value;
    const pnlUnrealized =
      s.stock.pnlUnrealized + s.etf.pnlUnrealized + s.crypto.pnlUnrealized + s.livret.pnlUnrealized;
    const pnlRealized =
      s.stock.pnlRealized + s.etf.pnlRealized + s.crypto.pnlRealized + s.livret.pnlRealized;
    const pnlPct = invested > 0 ? (pnlUnrealized / invested) * 100 : 0;
    return { invested, value, pnlUnrealized, pnlRealized, pnlPct };
  });
}
