import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../features/auth/services/auth.service';

@Component({
  standalone: true,
  selector: 'app-navbar',
  imports: [CommonModule, RouterLink, RouterLinkActive],
  template: `
    <nav class="sticky top-0 z-40 w-full border-b bg-white/90 backdrop-blur">
      <div class="mx-auto max-w-7xl px-4">
        <div class="flex h-14 items-center justify-between">
          <!-- Brand -->
          <a routerLink="/dashboard" class="font-semibold tracking-tight">TradeWallet</a>

          <!-- Desktop menu -->
          <ul class="hidden md:flex items-center gap-4 text-sm">
            <li>
              <a
                routerLink="/dashboard"
                routerLinkActive="text-blue-600 font-medium"
                class="hover:text-blue-600"
                >Dashboard</a
              >
            </li>
            <li>
              <a
                routerLink="/transactions"
                routerLinkActive="text-blue-600 font-medium"
                class="hover:text-blue-600"
                >Transactions</a
              >
            </li>
            <li>
              <a
                routerLink="/portfolio"
                routerLinkActive="text-blue-600 font-medium"
                class="hover:text-blue-600"
                >Portefeuilles</a
              >
            </li>
            @if (isAdmin()) {
              <li>
                <a
                  routerLink="/admin"
                  routerLinkActive="text-blue-600 font-medium"
                  class="hover:text-blue-600"
                  >Admin</a
                >
              </li>
            }
          </ul>

          <!-- Right side (desktop) -->
          <div class="hidden md:flex items-center gap-3">
            @if (user()) {
              <div class="hidden sm:flex flex-col items-end leading-tight">
                <span class="text-sm font-medium">{{ user()!.firstName || user()!.name }}</span>
              </div>
              <button
                (click)="logout()"
                class="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50"
                aria-label="Se déconnecter"
              >
                Déconnexion
              </button>
            } @else {
              <a
                routerLink="/auth/login"
                class="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50"
                >Se connecter</a
              >
            }
          </div>

          <!-- Burger (mobile) -->
          <button
            type="button"
            class="md:hidden inline-flex items-center justify-center rounded-lg p-2 hover:bg-gray-100"
            [attr.aria-expanded]="menuOpen()"
            aria-controls="mobile-menu"
            aria-label="Ouvrir le menu"
            (click)="toggleMenu()"
          >
            @if (!menuOpen()) {
              <!-- Icon burger -->
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="2"
                aria-hidden="true"
              >
                <path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            } @else {
              <!-- Icon close -->
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="2"
                aria-hidden="true"
              >
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            }
          </button>
        </div>
      </div>

      <!-- Mobile menu panel -->
      @if (menuOpen()) {
        <div id="mobile-menu" class="md:hidden border-t bg-white">
          <div class="mx-auto max-w-7xl px-4 py-3 space-y-3">
            <ul class="flex flex-col gap-2 text-sm">
              <li>
                <a
                  routerLink="/dashboard"
                  routerLinkActive="text-blue-600 font-medium"
                  class="block rounded px-2 py-2 hover:bg-gray-50"
                  (click)="closeMenu()"
                  >Dashboard</a
                >
              </li>
              <li>
                <a
                  routerLink="/transactions"
                  routerLinkActive="text-blue-600 font-medium"
                  class="block rounded px-2 py-2 hover:bg-gray-50"
                  (click)="closeMenu()"
                  >Transactions</a
                >
              </li>
              <li>
                <a
                  routerLink="/portfolio"
                  routerLinkActive="text-blue-600 font-medium"
                  class="block rounded px-2 py-2 hover:bg-gray-50"
                  (click)="closeMenu()"
                  >Portefeuilles</a
                >
              </li>
              @if (isAdmin()) {
                <li>
                  <a
                    routerLink="/admin"
                    routerLinkActive="text-blue-600 font-medium"
                    class="block rounded px-2 py-2 hover:bg-gray-50"
                    (click)="closeMenu()"
                    >Admin</a
                  >
                </li>
              }
            </ul>

            <div class="pt-2 border-t flex items-center justify-between">
              @if (user()) {
                <div class="flex flex-col">
                  <span class="text-sm font-medium">{{ user()!.firstName || user()!.name }}</span>
                </div>
                <button
                  (click)="logout(); closeMenu()"
                  class="mt-2 rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50"
                  aria-label="Se déconnecter"
                >
                  Déconnexion
                </button>
              } @else {
                <a
                  routerLink="/auth/login"
                  class="mt-2 rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50"
                  (click)="closeMenu()"
                  >Se connecter</a
                >
              }
            </div>
          </div>
        </div>
      }
    </nav>
  `,
})
export class NavbarComponent {
  private auth = inject(AuthService);
  private router = inject(Router);

  user = this.auth.currentUser;
  isAdmin = this.auth.isAdmin;

  menuOpen = signal(false);
  toggleMenu() {
    this.menuOpen.update((v) => !v);
  }
  closeMenu() {
    this.menuOpen.set(false);
  }

  async logout() {
    await this.auth.logout();
    this.router.navigateByUrl('/auth/login');
  }
}
