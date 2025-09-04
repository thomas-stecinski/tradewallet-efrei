import { Injectable, signal, computed } from '@angular/core';
import { User, LoginRequest, RegisterRequest } from '../../../../app/core/models/user.model';

const LS_USERS_KEY = 'tw_users';
const LS_CURRENT_KEY = 'tw_current_user';
const isBrowser = typeof window !== 'undefined' && !!window.localStorage;

@Injectable({ providedIn: 'root' })
export class AuthService {
  // NB: loadUsers/loadCurrent sont SSR-safe (ne lisent pas LS côté serveur)
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
      name: payload.name ?? payload.email.split('@')[0],
      email: payload.email,
      password: payload.password, // mock uniquement
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

  // ---------- LocalStorage helpers (SSR-safe) ----------

  private loadUsers(): User[] {
    // seed par défaut (admin + user)
    const seed: User[] = [
      {
        id: 1,
        name: 'admin',
        email: 'admin@gmail.com',
        password: 'admin123',
        role: 'admin',
        createdAt: new Date(),
      },
      {
        id: 2,
        name: 'user',
        email: 'user@gmail.com',
        password: 'user123',
        role: 'user',
        createdAt: new Date(),
      },
    ];

    if (!isBrowser) {
      // Côté serveur : pas de LS → on renvoie un snapshot mémoire
      return seed;
    }

    const raw = window.localStorage.getItem(LS_USERS_KEY);
    if (!raw) {
      window.localStorage.setItem(LS_USERS_KEY, JSON.stringify(seed));
      return seed;
    }

    try {
      const parsed = JSON.parse(raw) as User[];
      // revival Dates
      parsed.forEach((u) => {
        if (typeof u.createdAt === 'string') u.createdAt = new Date(u.createdAt);
      });
      return parsed;
    } catch {
      window.localStorage.setItem(LS_USERS_KEY, JSON.stringify(seed));
      return seed;
    }
  }

  private saveUsers(users: User[]) {
    if (!isBrowser) return;
    try {
      window.localStorage.setItem(LS_USERS_KEY, JSON.stringify(users));
    } catch {
      /* ignore quota errors */
    }
  }

  private loadCurrent(): User | null {
    if (!isBrowser) return null;
    const raw = window.localStorage.getItem(LS_CURRENT_KEY);
    if (!raw) return null;
    try {
      const u = JSON.parse(raw) as User;
      if (u && typeof u.createdAt === 'string') u.createdAt = new Date(u.createdAt);
      return u;
    } catch {
      return null;
    }
  }

  private saveCurrent(user: User | null) {
    if (!isBrowser) return;
    try {
      if (user) window.localStorage.setItem(LS_CURRENT_KEY, JSON.stringify(user));
      else window.localStorage.removeItem(LS_CURRENT_KEY);
    } catch {
      /* ignore */
    }
  }
}
