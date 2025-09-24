import { Injectable } from '@angular/core';
import { safeStorage } from '../../../core/utils/storage';
import type { Transaction } from '../../../core/models/transaction.model';

const LS_PRICES = 'tw_prices';
const LS_LIVRETS = 'tw_livrets_state';
const LS_CREDITS = 'tw_livrets_credits'; // crédits d’intérêts/gains

export interface LivretState {
  currentAmount?: number;
  yearTarget?: number;
  ratePct?: number;
  lastUpdated?: string;
}

interface Credit {
  date: string;
  amount: number;
  note?: string;
}

function revivePrices(map: Record<string, number> | null): Record<string, number> {
  if (!map) return {};
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(map)) {
    const n = Number(v);
    if (!isNaN(n) && n > 0) out[k.toUpperCase()] = n;
  }
  return out;
}

function reviveLivrets(map: Record<string, LivretState> | null): Record<string, LivretState> {
  if (!map) return {};
  const out: Record<string, LivretState> = {};
  for (const [k, v] of Object.entries(map)) {
    const up = (k || '').toUpperCase();
    out[up] = {
      currentAmount: typeof v.currentAmount === 'number' ? v.currentAmount : undefined,
      yearTarget: typeof v.yearTarget === 'number' ? v.yearTarget : undefined,
      ratePct: typeof v.ratePct === 'number' ? v.ratePct : undefined,
      lastUpdated: v.lastUpdated ? String(v.lastUpdated) : undefined,
    };
  }
  return out;
}

function reviveCredits(map: Record<string, Credit[]> | null): Record<string, Credit[]> {
  if (!map) return {};
  const out: Record<string, Credit[]> = {};
  for (const [k, arr] of Object.entries(map)) {
    const up = (k || '').toUpperCase();
    const list = Array.isArray(arr) ? arr : [];
    out[up] = list
      .map((c) => ({
        date: String(c.date),
        amount: Number(c.amount),
        note: c.note ? String(c.note) : undefined,
      }))
      .filter((c) => !!c.date && !isNaN(c.amount) && c.amount > 0)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }
  return out;
}

@Injectable({ providedIn: 'root' })
export class PriceService {
  // ---------- Overrides prix (actions/etf/crypto)
  private loadOverrides(): Record<string, number> {
    const raw = safeStorage.getItem(LS_PRICES);
    if (!raw) return {};
    try {
      return revivePrices(JSON.parse(raw));
    } catch {
      return {};
    }
  }
  private saveOverrides(map: Record<string, number>) {
    safeStorage.setItem(LS_PRICES, JSON.stringify(map));
  }
  setOverride(symbol: string, price?: number) {
    const up = (symbol || '').trim().toUpperCase();
    if (!up) return;
    const map = this.loadOverrides();
    if (price && price > 0) map[up] = price;
    else delete map[up];
    this.saveOverrides(map);
  }
  getCurrentPrice(symbol: string, allTx: Transaction[]): number {
    const up = (symbol || '').trim().toUpperCase();
    if (!up) return 0;
    const ov = this.loadOverrides();
    if (ov[up]) return ov[up];
    let last = 0,
      ts = 0;
    for (const t of allTx) {
      if ((t.symbol || '').toUpperCase() !== up) continue;
      const curTs = new Date(t.createdAt).getTime();
      if (curTs >= ts) {
        ts = curTs;
        last = Number(t.pricePerUnit) || 0;
      }
    }
    return last || 0;
  }

  // ---------- État livrets
  private loadLivrets(): Record<string, LivretState> {
    const raw = safeStorage.getItem(LS_LIVRETS);
    if (!raw) return {};
    try {
      return reviveLivrets(JSON.parse(raw));
    } catch {
      return {};
    }
  }
  private saveLivrets(map: Record<string, LivretState>) {
    safeStorage.setItem(LS_LIVRETS, JSON.stringify(map));
  }
  getLivretState(symbol: string): LivretState {
    const up = (symbol || '').trim().toUpperCase();
    if (!up) return {};
    const map = this.loadLivrets();
    return map[up] ?? {};
  }
  setLivretCurrent(symbol: string, amount?: number) {
    const up = (symbol || '').trim().toUpperCase();
    if (!up) return;
    const map = this.loadLivrets();
    const cur = map[up] ?? {};
    if (typeof amount === 'number') cur.currentAmount = amount;
    else delete cur.currentAmount;
    cur.lastUpdated = new Date().toISOString();
    map[up] = cur;
    this.saveLivrets(map);
  }
  setLivretTarget(symbol: string, target?: number) {
    const up = (symbol || '').trim().toUpperCase();
    if (!up) return;
    const map = this.loadLivrets();
    const cur = map[up] ?? {};
    if (typeof target === 'number') cur.yearTarget = target;
    else delete cur.yearTarget;
    cur.lastUpdated = new Date().toISOString();
    map[up] = cur;
    this.saveLivrets(map);
  }
  setLivretRate(symbol: string, ratePct?: number) {
    const up = (symbol || '').trim().toUpperCase();
    if (!up) return;
    const map = this.loadLivrets();
    const cur = map[up] ?? {};
    if (typeof ratePct === 'number') cur.ratePct = ratePct;
    else delete cur.ratePct;
    cur.lastUpdated = new Date().toISOString();
    map[up] = cur;
    this.saveLivrets(map);
  }

  // ---------- Crédits (gains / intérêts)
  private loadCredits(): Record<string, Credit[]> {
    const raw = safeStorage.getItem(LS_CREDITS);
    if (!raw) return {};
    try {
      return reviveCredits(JSON.parse(raw));
    } catch {
      return {};
    }
  }
  private saveCredits(map: Record<string, Credit[]>) {
    safeStorage.setItem(LS_CREDITS, JSON.stringify(map));
  }

  listLivretCredits(symbol: string): Credit[] {
    const up = (symbol || '').trim().toUpperCase();
    if (!up) return [];
    const all = this.loadCredits();
    return (all[up] ?? []).slice();
  }

  addLivretCredit(symbol: string, amount: number, dateIso?: string, note?: string) {
    const up = (symbol || '').trim().toUpperCase();
    if (!up || !amount || amount <= 0) return;
    const all = this.loadCredits();
    const list = (all[up] ?? []).slice();
    const d = dateIso ? new Date(dateIso) : new Date();
    const iso = d.toISOString().slice(0, 10);
    list.push({ date: iso, amount, note: note?.trim() || undefined });
    list.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    all[up] = list;
    this.saveCredits(all);
  }

  removeLivretCredit(symbol: string, dateIso: string, amount: number) {
    const up = (symbol || '').trim().toUpperCase();
    if (!up) return;
    const all = this.loadCredits();
    const list = (all[up] ?? []).filter((c) => !(c.date === dateIso && c.amount === amount));
    all[up] = list;
    this.saveCredits(all);
  }

  totalLivretCredits(symbol: string): number {
    return this.listLivretCredits(symbol).reduce((acc, c) => acc + (Number(c.amount) || 0), 0);
  }

  lastCreditDate(symbol: string): string | null {
    const list = this.listLivretCredits(symbol);
    return list.length ? list[list.length - 1].date : null;
  }
}
