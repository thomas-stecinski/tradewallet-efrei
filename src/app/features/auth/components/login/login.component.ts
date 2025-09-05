// src/app/features/auth/components/login/login.component.ts
import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <section class="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div class="w-full max-w-md bg-white p-8 rounded-2xl shadow">
        <h1 class="text-2xl font-bold text-gray-900 text-center">Connexion</h1>

        <form [formGroup]="form" (ngSubmit)="onSubmit()" class="mt-6 space-y-4" novalidate>
          <!-- Email -->
          <div>
            <label for="login-email" class="block text-sm text-gray-700 mb-1">Email</label>
            <input
              id="login-email"
              type="email"
              formControlName="email"
              class="w-full border rounded px-3 py-2 focus:outline-none focus:ring"
              [class.border-red-500]="invalid('email')"
              autocomplete="email"
              required
              [attr.aria-invalid]="invalid('email')"
              [attr.aria-describedby]="invalid('email') ? 'login-email-error' : null"
            />
            @if (invalid('email')) {
              <p id="login-email-error" class="text-sm text-red-600 mt-1">{{ errorOf('email') }}</p>
            }
          </div>

          <!-- Password -->
          <div>
            <label for="login-password" class="block text-sm text-gray-700 mb-1"
              >Mot de passe</label
            >
            <input
              id="login-password"
              type="password"
              formControlName="password"
              class="w-full border rounded px-3 py-2 focus:outline-none focus:ring"
              [class.border-red-500]="invalid('password')"
              autocomplete="current-password"
              required
              [attr.aria-invalid]="invalid('password')"
              [attr.aria-describedby]="invalid('password') ? 'login-password-error' : null"
            />
            @if (invalid('password')) {
              <p id="login-password-error" class="text-sm text-red-600 mt-1">
                {{ errorOf('password') }}
              </p>
            }
          </div>

          <button
            type="submit"
            [disabled]="form.invalid || loading()"
            class="w-full py-2.5 rounded bg-blue-600 text-white disabled:opacity-50"
          >
            @if (loading()) {
              Connexion...
            } @else {
              Se connecter
            }
          </button>

          @if (error()) {
            <p class="text-sm text-red-600 text-center mt-2">{{ error() }}</p>
          }

          <p class="text-center text-sm text-gray-600 mt-4">
            Pas de compte ?
            <a routerLink="/auth/register" class="text-blue-600 hover:underline">Créer un compte</a>
          </p>
        </form>
      </div>
    </section>
  `,
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  form: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  loading = signal(false);
  error = signal<string>('');

  async onSubmit() {
    if (this.form.invalid) return;

    this.loading.set(true);
    this.error.set('');

    const creds = this.form.value as { email: string; password: string };

    try {
      await this.auth.login(creds); // <- Promise<User>
      this.loading.set(false);

      // défaut: /dashboard ; si on venait d’un guard, on respecte returnUrl
      const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') || '/dashboard';
      await this.router.navigate([returnUrl]);
    } catch (err: unknown) {
      this.loading.set(false);
      this.error.set(err instanceof Error ? err.message : 'Erreur de connexion');
    }
  }

  invalid(ctrl: keyof typeof this.form.value): boolean {
    const c = this.form.get(ctrl as string);
    return !!(c && c.invalid && (c.dirty || c.touched));
  }

  errorOf(ctrl: keyof typeof this.form.value): string {
    const c = this.form.get(ctrl as string);
    if (!c?.errors) return '';
    if (c.errors['required']) return 'Ce champ est requis';
    if (c.errors['email']) return "Format d'email invalide";
    if (c.errors['minlength']) return `Minimum ${c.errors['minlength'].requiredLength} caractères`;
    return 'Champ invalide';
  }
}
