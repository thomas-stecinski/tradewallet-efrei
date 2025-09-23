// src/app/features/admin/components/admin-users-page.component.ts
import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import {
  FormsModule,
  ReactiveFormsModule,
  FormBuilder,
  Validators,
  FormGroup,
} from '@angular/forms';
import { AuthService } from '../../auth/services/auth.service';
import type { User } from '../../../core/models/user.model';

type SortKey = 'name' | 'firstName' | 'email' | 'role' | 'createdAt';
type SortDir = 'asc' | 'desc';

@Component({
  standalone: true,
  selector: 'app-admin-users-page',
  imports: [CommonModule, FormsModule, ReactiveFormsModule, DatePipe],
  template: `
    <section class="max-w-7xl mx-auto px-4 space-y-6">
      <header class="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 class="text-2xl font-bold">Administration — Utilisateurs</h1>
          <p class="text-sm text-gray-600">Visualiser, créer, modifier, supprimer des comptes.</p>
        </div>

        <div class="flex items-center gap-2">
          <input
            class="border rounded-lg px-3 py-2"
            placeholder="Rechercher (nom, email, rôle)"
            [(ngModel)]="q"
          />
          <button
            class="px-3 py-2 rounded-lg border hover:bg-gray-50"
            (click)="createRawAdmin()"
            title="Créer un compte admin avec email/mot de passe générés"
          >
            Créer admin (brut)
          </button>
        </div>
      </header>

      <!-- Formulaire de création / édition -->
      <div class="bg-white rounded-2xl shadow p-5 space-y-4">
        <div class="flex items-center justify-between">
          <h2 class="text-lg font-semibold">
            {{ editId() ? 'Modifier un utilisateur' : 'Créer un utilisateur' }}
          </h2>
          @if (editId()) {
            <button class="text-sm text-gray-600 hover:underline" (click)="resetForm()">
              Annuler
            </button>
          }
        </div>

        <form
          [formGroup]="form"
          (ngSubmit)="onSubmit()"
          class="grid grid-cols-1 md:grid-cols-3 gap-4"
          novalidate
        >
          <div>
            <label for="name" class="block text-sm text-gray-700 mb-1">Nom</label>
            <input id="name" class="w-full border rounded px-3 py-2" formControlName="name" />
          </div>
          <div>
            <label for="firstName" class="block text-sm text-gray-700 mb-1">Prénom</label>
            <input
              id="firstName"
              class="w-full border rounded px-3 py-2"
              formControlName="firstName"
            />
          </div>
          <div>
            <label for="phone" class="block text-sm text-gray-700 mb-1">Téléphone</label>
            <input id="phone" class="w-full border rounded px-3 py-2" formControlName="phone" />
          </div>

          <div class="md:col-span-2">
            <label for="email" class="block text-sm text-gray-700 mb-1">Email</label>
            <input
              id="email"
              type="email"
              class="w-full border rounded px-3 py-2"
              formControlName="email"
            />
          </div>

          <div>
            <label for="role" class="block text-sm text-gray-700 mb-1">Rôle</label>
            <select id="role" class="w-full border rounded px-3 py-2" formControlName="role">
              <option value="user">user</option>
              <option value="admin">admin</option>
            </select>
          </div>

          <div>
            <label for="password" class="block text-sm text-gray-700 mb-1">Mot de passe</label>
            <input
              id="password"
              type="text"
              class="w-full border rounded px-3 py-2"
              formControlName="password"
            />
            <p class="text-xs text-gray-500 mt-1">6 caractères mini (mock localStorage).</p>
          </div>

          <div class="md:col-span-3 pt-1">
            <button
              type="submit"
              [disabled]="form.invalid || saving()"
              class="px-4 py-2.5 rounded-lg bg-blue-600 text-white disabled:opacity-50"
            >
              {{ saving() ? 'Enregistrement…' : editId() ? 'Mettre à jour' : 'Créer' }}
            </button>
          </div>
        </form>
      </div>

      <!-- Tableau -->
      <div class="overflow-auto rounded-2xl border bg-white">
        <table class="min-w-full text-sm">
          <thead class="bg-gray-50">
            <tr class="text-left">
              <th class="px-3 py-2 cursor-pointer" (click)="sortBy('name')">
                Nom
                <span class="text-gray-400" *ngIf="sortKey === 'name'">({{ sortDir }})</span>
              </th>
              <th class="px-3 py-2 cursor-pointer" (click)="sortBy('firstName')">
                Prénom
                <span class="text-gray-400" *ngIf="sortKey === 'firstName'">({{ sortDir }})</span>
              </th>
              <th class="px-3 py-2 cursor-pointer" (click)="sortBy('email')">
                Email
                <span class="text-gray-400" *ngIf="sortKey === 'email'">({{ sortDir }})</span>
              </th>
              <th class="px-3 py-2 cursor-pointer" (click)="sortBy('role')">
                Rôle
                <span class="text-gray-400" *ngIf="sortKey === 'role'">({{ sortDir }})</span>
              </th>
              <th class="px-3 py-2 cursor-pointer" (click)="sortBy('createdAt')">
                Créé le
                <span class="text-gray-400" *ngIf="sortKey === 'createdAt'">({{ sortDir }})</span>
              </th>
              <th class="px-3 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            @for (u of filteredSorted(); track u.id) {
              <tr class="border-t hover:bg-gray-50">
                <td class="px-3 py-2">{{ u.name }}</td>
                <td class="px-3 py-2">{{ u.firstName }}</td>
                <td class="px-3 py-2">{{ u.email }}</td>
                <td class="px-3 py-2 uppercase">
                  <span class="inline-flex items-center gap-2">
                    {{ u.role }}
                    <button class="text-xs px-2 py-1 rounded border" (click)="toggleRole(u)">
                      ⇄
                    </button>
                  </span>
                </td>
                <td class="px-3 py-2 whitespace-nowrap">
                  {{ u.createdAt | date: 'dd/MM/yyyy HH:mm' }}
                </td>
                <td class="px-3 py-2 text-right whitespace-nowrap">
                  <button class="text-blue-600 hover:underline mr-3" (click)="startEdit(u)">
                    Éditer
                  </button>
                  <button class="text-amber-700 hover:underline mr-3" (click)="resetPwd(u)">
                    RàZ mdp
                  </button>
                  <button class="text-red-600 hover:underline" (click)="remove(u)">
                    Supprimer
                  </button>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>

      @if (justCreatedAdmin()) {
        <div class="rounded-xl border border-emerald-300 bg-emerald-50 p-4">
          <p class="text-emerald-800">
            Admin brut créé —
            <strong>Email:</strong> {{ justCreatedAdmin()!.email }} /
            <strong>Mot de passe:</strong> {{ justCreatedAdmin()!.password }}
          </p>
        </div>
      }
    </section>
  `,
})
export class AdminUsersPageComponent {
  private auth = inject(AuthService);
  private fb = inject(FormBuilder);

  saving = signal(false);
  editId = signal<number | null>(null);
  q = '';

  justCreatedAdmin = signal<User | null>(null);

  // tri
  sortKey: SortKey = 'createdAt';
  sortDir: SortDir = 'desc';

  // form
  form: FormGroup = this.fb.group({
    name: ['', [Validators.required]],
    firstName: [''],
    email: ['', [Validators.required, Validators.email]],
    phone: [''],
    password: ['', [Validators.required, Validators.minLength(6)]],
    role: ['user', [Validators.required]],
  });

  // flux users à jour via signal du service
  users = this.auth.users;

  filteredSorted = computed(() => {
    const term = (this.q || '').toLowerCase();
    const list = this.users().filter((u) => {
      if (!term) return true;
      return (
        u.name?.toLowerCase().includes(term) ||
        u.firstName?.toLowerCase().includes(term) ||
        u.email?.toLowerCase().includes(term) ||
        u.role?.toLowerCase().includes(term)
      );
    });

    const key = this.sortKey;
    const dir = this.sortDir;
    return list.slice().sort((a, b) => {
      const av = this.valueFor(a, key);
      const bv = this.valueFor(b, key);

      let cmp = 0;
      if (av instanceof Date && bv instanceof Date) cmp = av.getTime() - bv.getTime();
      else cmp = String(av ?? '').localeCompare(String(bv ?? ''), 'fr');

      return dir === 'asc' ? cmp : -cmp;
    });
  });

  private valueFor(u: User, k: SortKey): string | Date {
    switch (k) {
      case 'name':
        return u.name ?? '';
      case 'firstName':
        return u.firstName ?? '';
      case 'email':
        return u.email ?? '';
      case 'role':
        return u.role ?? 'user';
      case 'createdAt':
        return u.createdAt instanceof Date ? u.createdAt : new Date(u.createdAt);
    }
  }

  sortBy(k: SortKey) {
    if (this.sortKey === k) {
      this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortKey = k;
      this.sortDir = 'asc';
    }
  }

  startEdit(u: User) {
    this.editId.set(u.id);
    this.form.reset({
      name: u.name,
      firstName: u.firstName,
      email: u.email,
      phone: u.phone,
      password: u.password,
      role: u.role,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  resetForm() {
    this.editId.set(null);
    this.form.reset({
      name: '',
      firstName: '',
      email: '',
      phone: '',
      password: '',
      role: 'user',
    });
  }

  async onSubmit() {
    if (this.form.invalid) return;
    this.saving.set(true);
    try {
      const v = this.form.getRawValue();
      if (this.editId()) {
        this.auth.updateUser(this.editId()!, {
          name: v.name.trim(),
          firstName: v.firstName?.trim() ?? '',
          email: v.email.trim(),
          phone: v.phone ?? '',
          password: v.password,
          role: v.role,
        });
      } else {
        this.auth.createUser({
          name: v.name.trim() || v.email.split('@')[0],
          firstName: v.firstName?.trim() ?? '',
          email: v.email.trim(),
          phone: v.phone ?? '',
          password: v.password,
          role: v.role,
        });
      }
      this.resetForm();
    } finally {
      this.saving.set(false);
    }
  }

  remove(u: User) {
    const ok = confirm(`Supprimer ${u.name} (${u.email}) ?`);
    if (!ok) return;
    this.auth.deleteUser(u.id);
    if (this.editId() === u.id) this.resetForm();
  }

  toggleRole(u: User) {
    const next: 'user' | 'admin' = u.role === 'admin' ? 'user' : 'admin';
    this.auth.setRole(u.id, next);
  }

  resetPwd(u: User) {
    const np = prompt(`Nouveau mot de passe pour ${u.email}:`, u.password);
    if (!np) return;
    if (np.length < 6) {
      alert('Mot de passe trop court (min 6 caractères).');
      return;
    }
    this.auth.resetPassword(u.id, np);
    if (this.editId() === u.id) {
      this.form.patchValue({ password: np });
    }
  }

  createRawAdmin() {
    const created = this.auth.createRawAdmin();
    this.justCreatedAdmin.set(created);
    setTimeout(() => this.justCreatedAdmin.set(null), 10000);
  }
}
