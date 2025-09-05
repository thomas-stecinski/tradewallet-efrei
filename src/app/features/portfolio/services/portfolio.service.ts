import { Injectable } from '@angular/core';
import { safeStorage } from '../../../core/utils/storage';

export interface Portfolio {
  id: number;
  userId: number;
  name: string;
  baseCurrency: 'EUR';
  createdAt: Date;
  updatedAt: Date;
}

const LS_PF = 'tw_portfolios';

function revive(list: Portfolio[]): Portfolio[] {
  return list.map((p) => ({
    ...p,
    createdAt: new Date(p.createdAt),
    updatedAt: new Date(p.updatedAt),
  }));
}

@Injectable({ providedIn: 'root' })
export class PortfolioService {
  private load(): Portfolio[] {
    const raw = safeStorage.getItem(LS_PF);
    if (!raw) {
      const seed: Portfolio[] = [
        {
          id: 101,
          userId: 1,
          name: 'Admin Wallet',
          baseCurrency: 'EUR',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 201,
          userId: 2,
          name: 'My Wallet',
          baseCurrency: 'EUR',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      safeStorage.setItem(LS_PF, JSON.stringify(seed));
      return seed;
    }
    return revive(JSON.parse(raw));
  }

  private save(list: Portfolio[]) {
    safeStorage.setItem(LS_PF, JSON.stringify(list));
  }

  listAll(): Portfolio[] {
    return this.load();
  }

  listByUser(userId: number): { id: number; name: string }[] {
    return this.load()
      .filter((p) => p.userId === userId)
      .map((p) => ({ id: p.id, name: p.name }));
  }

  listByUserFull(userId: number): Portfolio[] {
    return this.load().filter((p) => p.userId === userId);
  }

  create(userId: number, name: string): Portfolio {
    const list = this.load();
    const now = new Date();
    const pf: Portfolio = {
      id: Date.now(),
      userId,
      name: name.trim() || 'Nouveau portefeuille',
      baseCurrency: 'EUR',
      createdAt: now,
      updatedAt: now,
    };
    list.push(pf);
    this.save(list);
    return pf;
  }

  rename(id: number, name: string): Portfolio | undefined {
    const list = this.load();
    const p = list.find((x) => x.id === id);
    if (!p) return undefined;
    p.name = name.trim() || p.name;
    p.updatedAt = new Date();
    this.save(list);
    return p;
  }

  remove(id: number): boolean {
    const list = this.load();
    const next = list.filter((p) => p.id !== id);
    this.save(next);
    return next.length !== list.length;
  }
}
