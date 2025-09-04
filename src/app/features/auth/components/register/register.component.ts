import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

function passwordMatchValidator(group: AbstractControl): ValidationErrors | null {
  const p = group.get('password')?.value;
  const c = group.get('confirmPassword')?.value;
  return p && c && p !== c ? { passwordMismatch: true } : null;
}

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <section class="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div class="w-full max-w-md bg-white p-8 rounded-2xl shadow">
        <h1 class="text-2xl font-bold text-gray-900 text-center">Créer un compte</h1>

        <form [formGroup]="form" (ngSubmit)="onSubmit()" class="mt-6 space-y-4" novalidate>
          <!-- Name -->
          <div>
            <label for="register-name" class="block text-sm text-gray-700 mb-1">Nom</label>
            <input
              id="register-name"
              type="text"
              formControlName="name"
              class="w-full border rounded px-3 py-2 focus:outline-none focus:ring"
              [class.border-red-500]="invalid('name')"
              autocomplete="name"
              required
              [attr.aria-invalid]="invalid('name')"
              [attr.aria-describedby]="invalid('name') ? 'register-name-error' : null"
            />
            @if (invalid('name')) {
              <p id="register-name-error" class="text-sm text-red-600 mt-1">
                {{ errorOf('name') }}
              </p>
            }
          </div>

          <!-- Email -->
          <div>
            <label for="register-email" class="block text-sm text-gray-700 mb-1">Email</label>
            <input
              id="register-email"
              type="email"
              formControlName="email"
              class="w-full border rounded px-3 py-2 focus:outline-none focus:ring"
              [class.border-red-500]="invalid('email')"
              autocomplete="email"
              required
              [attr.aria-invalid]="invalid('email')"
              [attr.aria-describedby]="invalid('email') ? 'register-email-error' : null"
            />
            @if (invalid('email')) {
              <p id="register-email-error" class="text-sm text-red-600 mt-1">
                {{ errorOf('email') }}
              </p>
            }
          </div>

          <!-- Password -->
          <div>
            <label for="register-password" class="block text-sm text-gray-700 mb-1"
              >Mot de passe</label
            >
            <input
              id="register-password"
              type="password"
              formControlName="password"
              class="w-full border rounded px-3 py-2 focus:outline-none focus:ring"
              [class.border-red-500]="invalid('password')"
              autocomplete="new-password"
              required
              [attr.aria-invalid]="invalid('password')"
              [attr.aria-describedby]="invalid('password') ? 'register-password-error' : null"
            />
            @if (invalid('password')) {
              <p id="register-password-error" class="text-sm text-red-600 mt-1">
                {{ errorOf('password') }}
              </p>
            }
          </div>

          <!-- Confirm -->
          <div>
            <label for="register-confirm" class="block text-sm text-gray-700 mb-1">
              Confirmer le mot de passe
            </label>
            <input
              id="register-confirm"
              type="password"
              formControlName="confirmPassword"
              class="w-full border rounded px-3 py-2 focus:outline-none focus:ring"
              [class.border-red-500]="
                invalid('confirmPassword') || form.errors?.['passwordMismatch']
              "
              autocomplete="new-password"
              required
              [attr.aria-invalid]="
                invalid('confirmPassword') || !!form.errors?.['passwordMismatch']
              "
              [attr.aria-describedby]="
                invalid('confirmPassword') || form.errors?.['passwordMismatch']
                  ? 'register-confirm-error'
                  : null
              "
            />
            @if (invalid('confirmPassword') || form.errors?.['passwordMismatch']) {
              <p id="register-confirm-error" class="text-sm text-red-600 mt-1">
                {{
                  form.errors?.['passwordMismatch']
                    ? 'Les mots de passe ne correspondent pas'
                    : errorOf('confirmPassword')
                }}
              </p>
            }
          </div>

          <button
            type="submit"
            [disabled]="form.invalid || loading()"
            class="w-full py-2.5 rounded bg-blue-600 text-white disabled:opacity-50"
          >
            @if (loading()) {
              Création...
            } @else {
              Créer le compte
            }
          </button>

          @if (error()) {
            <p class="text-sm text-red-600 text-center mt-2">{{ error() }}</p>
          }

          <p class="text-center text-sm text-gray-600 mt-4">
            Déjà un compte ?
            <a routerLink="/auth/login" class="text-blue-600 hover:underline">Se connecter</a>
          </p>
        </form>
      </div>
    </section>
  `,
})
export class RegisterComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);

  form: FormGroup = this.fb.group(
    {
      name: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]],
    },
    { validators: passwordMatchValidator },
  );

  loading = signal(false);
  error = signal<string>('');

  async onSubmit() {
    if (this.form.invalid) return;

    this.loading.set(true);
    this.error.set('');

    const payload = this.form.getRawValue();

    try {
      await this.auth.register(payload); // <- Promise<User>
      this.loading.set(false);
      this.router.navigate(['/']);
    } catch (err: unknown) {
      this.loading.set(false);
      this.error.set(err instanceof Error ? err.message : 'Erreur lors de la création du compte');
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
