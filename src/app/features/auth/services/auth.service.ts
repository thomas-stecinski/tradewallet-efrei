import { Injectable, signal, computed } from '@angular/core';
import { User, LoginRequest, RegisterRequest } from '../../../../app/core/models/user.model';

const LS_USERS_KEY = 'tw_users';
const LS_CURRENT_KEY = 'tw_current_user';
const isBrowser = typeof window !== 'undefined' && !!window.localStorage;

@Injectable({ providedIn: 'root' })
export class AuthService {
  private usersSig = signal<User[]>(this.loadUsers());
  private currentUserSig = signal<User | null>(this.loadCurrent());

  users = computed(() => this.usersSig());
  currentUser = computed(() => this.currentUserSig());
  isAuthenticated = computed(() => this.currentUserSig() !== null);
  isAdmin = computed(() => this.currentUserSig()?.role === 'admin');

  private delay(ms = 350) {
    return new Promise((res) => setTimeout(res, ms));
  }

  async login(payload: LoginRequest): Promise<User> {
    await this.delay();
    const found = this.usersSig().find(
      (u) => u.email === payload.email && u.password === payload.password,
    );
    if (!found) throw new Error('Email ou mot de passe incorrect');
    this.currentUserSig.set(found);
    this.saveCurrent(found);
    return found;
  }

  async register(payload: RegisterRequest): Promise<User> {
    await this.delay();

    if (this.usersSig().some((u) => u.email === payload.email)) {
      throw new Error('Cet email est déjà utilisé');
    }
    if (payload.password !== payload.confirmPassword) {
      throw new Error('Les mots de passe ne correspondent pas');
    }

    const newUser: User = {
      id: Date.now(),
      name: payload.name?.trim() || payload.email.split('@')[0],
      firstName: payload.firstName?.trim() || '',
      email: payload.email.trim(),
      phone: payload.phone,
      password: payload.password, // (mock)
      role: 'user',
      createdAt: new Date(),
    };

    const next = [...this.usersSig(), newUser];
    this.usersSig.set(next);
    this.saveUsers(next);

    this.currentUserSig.set(newUser);
    this.saveCurrent(newUser);

    return newUser;
  }

  async logout(): Promise<void> {
    await this.delay(200);
    this.currentUserSig.set(null);
    if (isBrowser) window.localStorage.removeItem(LS_CURRENT_KEY);
  }

  // ---------- Helpers (pas de `any`, ok avec noPropertyAccessFromIndexSignature) ----------

  private getString(r: Record<string, unknown>, key: string): string {
    const v = r[key];
    return typeof v === 'string' ? v : '';
  }
  private getNumber(r: Record<string, unknown>, key: string, fallback: number): number {
    const v = r[key];
    return typeof v === 'number' ? v : fallback;
  }
  private getRole(r: Record<string, unknown>, key: string): 'user' | 'admin' {
    const v = r[key];
    return v === 'admin' ? 'admin' : 'user';
  }
  private getDate(r: Record<string, unknown>, key: string): Date {
    const v = r[key];
    if (typeof v === 'string') {
      const d = new Date(v);
      return isNaN(d.getTime()) ? new Date() : d;
    }
    if (v instanceof Date) return v;
    return new Date();
  }

  /** Convertit un objet inconnu (depuis LS) en User valide ou null */
  private normalizeUser(raw: unknown): User | null {
    if (typeof raw !== 'object' || raw === null) return null;
    const r = raw as Record<string, unknown>;

    const id = this.getNumber(r, 'id', Date.now());
    const name = this.getString(r, 'name');
    const firstName = this.getString(r, 'firstName');
    const email = this.getString(r, 'email');
    const phone = this.getString(r, 'phone');
    const password = this.getString(r, 'password');
    const role = this.getRole(r, 'role');
    const createdAt = this.getDate(r, 'createdAt');

    if (!email) return null;

    return { id, name, firstName, email, phone, password, role, createdAt };
  }

  // ---------- LocalStorage helpers ----------

  private loadUsers(): User[] {
    const seed: User[] = [
      {
        id: 1,
        name: 'Admin',
        firstName: 'Super',
        email: 'admin@gmail.com',
        phone: '+33100000001',
        password: 'admin123',
        role: 'admin',
        createdAt: new Date(),
      },
      {
        id: 2,
        name: 'User',
        firstName: 'Test',
        email: 'user@gmail.com',
        phone: '+33100000002',
        password: 'user123',
        role: 'user',
        createdAt: new Date(),
      },
    ];

    if (!isBrowser) return seed;

    const raw = window.localStorage.getItem(LS_USERS_KEY);
    if (!raw) {
      window.localStorage.setItem(LS_USERS_KEY, JSON.stringify(seed));
      return seed;
    }

    try {
      const parsedUnknown = JSON.parse(raw) as unknown;
      const arr = Array.isArray(parsedUnknown) ? parsedUnknown : [];
      const normalized = arr.map((x) => this.normalizeUser(x)).filter((x): x is User => x !== null);

      return normalized.length ? normalized : seed;
    } catch (err) {
      console.warn('loadUsers(): JSON parse/localStorage failed, using seed.', err);
      window.localStorage.setItem(LS_USERS_KEY, JSON.stringify(seed));
      return seed;
    }
  }

  private saveUsers(users: User[]) {
    if (!isBrowser) return;
    try {
      window.localStorage.setItem(LS_USERS_KEY, JSON.stringify(users));
    } catch (err) {
      console.warn('saveUsers(): localStorage setItem failed.', err);
    }
  }

  private loadCurrent(): User | null {
    if (!isBrowser) return null;
    const raw = window.localStorage.getItem(LS_CURRENT_KEY);
    if (!raw) return null;

    try {
      const parsedUnknown = JSON.parse(raw) as unknown;
      const user = this.normalizeUser(parsedUnknown);
      return user;
    } catch (err) {
      console.warn('loadCurrent(): JSON parse/localStorage failed.', err);
      return null;
    }
  }

  private saveCurrent(user: User | null) {
    if (!isBrowser) return;
    try {
      if (user) window.localStorage.setItem(LS_CURRENT_KEY, JSON.stringify(user));
      else window.localStorage.removeItem(LS_CURRENT_KEY);
    } catch (err) {
      console.warn('saveCurrent(): localStorage write/remove failed.', err);
    }
  }
}
