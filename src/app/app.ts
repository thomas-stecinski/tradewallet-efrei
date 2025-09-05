import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterOutlet, NavigationEnd } from '@angular/router';
import { NavbarComponent } from './shared/components/navbar/navbar.component';
import { filter } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NavbarComponent],
  template: `
    @if (!isAuthRoute()) {
      <app-navbar></app-navbar>
    }

    <main class="min-h-screen bg-gray-50">
      <div class="mx-auto max-w-7xl px-4 py-6">
        <router-outlet />
      </div>
    </main>
  `,
  styleUrls: ['./app.scss'],
})
export class App {
  private router = inject(Router);
  private url = signal(this.router.url);
  // true si on est sur /auth ou /auth/...
  isAuthRoute = computed(() => this.url().startsWith('/auth'));

  constructor() {
    this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe((e) => this.url.set(e.urlAfterRedirects));
  }
}
