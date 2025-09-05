import { Component, inject } from '@angular/core';
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
          <a routerLink="/dashboard" class="font-semibold tracking-tight">TradeWallet</a>

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

          <div class="flex items-center gap-3">
            @if (user()) {
              <div class="hidden sm:flex flex-col items-end leading-tight">
                <span class="text-sm font-medium">{{ user()!.name }}</span>
                <span class="text-xs text-gray-500 uppercase">{{ user()!.role }}</span>
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
        </div>
      </div>
    </nav>
  `,
})
export class NavbarComponent {
  private auth = inject(AuthService);
  private router = inject(Router);

  user = this.auth.currentUser;
  isAdmin = this.auth.isAdmin;

  async logout() {
    await this.auth.logout();
    this.router.navigateByUrl('/auth/login');
  }
}
