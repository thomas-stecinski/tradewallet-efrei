// src/app/features/admin/components/admin-layout.component.ts
import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../auth/services/auth.service';

@Component({
  standalone: true,
  selector: 'app-admin-layout',
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <!-- Sous-navbar Admin (affichée sous la navbar principale de l'app) -->
    <nav class="w-full border-b bg-white">
      <div class="mx-auto max-w-7xl px-4">
        <ul class="flex gap-4 h-12 items-center text-sm">
          <li>
            <a
              routerLink="/admin/overview"
              routerLinkActive="text-blue-600 font-medium border-b-2 border-blue-600"
              class="h-12 inline-flex items-center border-b-2 border-transparent hover:text-blue-600"
              >Vue d’ensemble</a
            >
          </li>
          <li>
            <a
              routerLink="/admin/users"
              routerLinkActive="text-blue-600 font-medium border-b-2 border-blue-600"
              class="h-12 inline-flex items-center border-b-2 border-transparent hover:text-blue-600"
              >Comptes</a
            >
          </li>
          <li>
            <a
              routerLink="/admin/transactions"
              routerLinkActive="text-blue-600 font-medium border-b-2 border-blue-600"
              class="h-12 inline-flex items-center border-b-2 border-transparent hover:text-blue-600"
              >Transactions</a
            >
          </li>
        </ul>
      </div>
    </nav>

    <!-- Contenu des pages admin -->
    <main class="py-6">
      <router-outlet />
    </main>
  `,
})
export class AdminLayoutComponent {
  private auth = inject(AuthService);
  userName = computed(() => this.auth.currentUser()?.name ?? '—');
  role = computed(() => this.auth.currentUser()?.role ?? 'user');
}
