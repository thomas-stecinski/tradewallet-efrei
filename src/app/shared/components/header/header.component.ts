import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { AuthService } from '../../../features/auth/services/auth.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  template: `
    <header class="bg-white border-b">
      <div class="container mx-auto px-4 py-3 flex items-center justify-between">
        <!-- Brand -->
        <a
          [routerLink]="isAuth() ? '/dashboard' : '/auth/login'"
          class="text-xl font-semibold tracking-tight"
        >
          TradeWallet
        </a>

        <!-- Nav -->
        <nav class="flex items-center gap-4">
          @if (!isAuth()) {
            <a
              routerLink="/auth/login"
              routerLinkActive="text-blue-600"
              class="text-sm hover:text-blue-600"
              aria-label="Aller à la page de connexion"
            >
              Login
            </a>
            <a
              routerLink="/auth/register"
              routerLinkActive="text-blue-600"
              class="text-sm hover:text-blue-600"
              aria-label="Aller à la page d'inscription"
            >
              Register
            </a>
          } @else {
            <a
              routerLink="/dashboard"
              routerLinkActive="text-blue-600"
              class="text-sm hover:text-blue-600"
              aria-label="Aller au tableau de bord"
            >
              Dashboard
            </a>

            <!-- Ces liens pointeront vers des features qu’on ajoutera après -->
            <!--
            <a routerLink="/portfolio" routerLinkActive="text-blue-600" class="text-sm hover:text-blue-600">Portefeuille</a>
            <a routerLink="/transactions" routerLinkActive="text-blue-600" class="text-sm hover:text-blue-600">Transactions</a>
            -->

            @if (isAdmin()) {
              <a
                routerLink="/admin"
                routerLinkActive="text-blue-600"
                class="text-sm hover:text-blue-600"
                aria-label="Espace administrateur"
              >
                Admin
              </a>
            }

            <button
              type="button"
              class="text-sm text-red-600 hover:text-red-700"
              (click)="logout()"
              aria-label="Se déconnecter"
            >
              Logout
            </button>
          }
        </nav>
      </div>
    </header>
  `,
})
export class HeaderComponent {
  private auth = inject(AuthService);
  private router = inject(Router);

  isAuth = computed(() => this.auth.isAuthenticated());
  isAdmin = computed(() => this.auth.isAdmin());

  async logout() {
    await this.auth.logout();
    this.router.navigateByUrl('/auth/login');
  }
}
