import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  AbstractControl,
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

interface RegisterForm {
  name: FormControl<string>;
  email: FormControl<string>;
  password: FormControl<string>;
  confirmPassword: FormControl<string>;
}

function passwordMatchValidator(): ValidatorFn {
  return (group: AbstractControl): { passwordMismatch: true } | null => {
    const password = group.get('password')?.value as string | undefined;
    const confirm = group.get('confirmPassword')?.value as string | undefined;
    if (!password || !confirm) return null;
    return password === confirm ? null : { passwordMismatch: true };
  };
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
          <!-- Nom -->
          <div>
            <label for="reg-name" class="block text-sm text-gray-700 mb-1">Nom</label>
            <input
              id="reg-name"
              type="text"
              formControlName="name"
              class="w-full border rounded px-3 py-2 focus:outline-none focus:ring"
              [class.border-red-500]="invalid('name')"
              autocomplete="name"
              required
            />
            @if (invalid('name')) {
              <p class="text-sm text-red-600 mt-1">Nom requis</p>
            }
          </div>

          <!-- Email -->
          <div>
            <label for="reg-email" class="block text-sm text-gray-700 mb-1">Email</label>
            <input
              id="reg-email"
              type="email"
              formControlName="email"
              class="w-full border rounded px-3 py-2 focus:outline-none focus:ring"
              [class.border-red-500]="invalid('email')"
              autocomplete="email"
              required
            />
            @if (invalid('email')) {
              <p class="text-sm text-red-600 mt-1">Email invalide</p>
            }
          </div>

          <!-- Mot de passe -->
          <div>
            <label for="reg-pass" class="block text-sm text-gray-700 mb-1">Mot de passe</label>
            <input
              id="reg-pass"
              type="password"
              formControlName="password"
              class="w-full border rounded px-3 py-2 focus:outline-none focus:ring"
              [class.border-red-500]="invalid('password')"
              autocomplete="new-password"
              required
            />
            @if (invalid('password')) {
              <p class="text-sm text-red-600 mt-1">Minimum 6 caractères</p>
            }
          </div>

          <!-- Confirmation -->
          <div>
            <label for="reg-pass2" class="block text-sm text-gray-700 mb-1">Confirmer</label>
            <input
              id="reg-pass2"
              type="password"
              formControlName="confirmPassword"
              class="w-full border rounded px-3 py-2 focus:outline-none focus:ring"
              [class.border-red-500]="
                form.hasError('passwordMismatch') && form.get('confirmPassword')?.touched
              "
              autocomplete="new-password"
              required
            />
            @if (form.hasError('passwordMismatch') && form.get('confirmPassword')?.touched) {
              <p class="text-sm text-red-600 mt-1">Les mots de passe ne correspondent pas</p>
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

  form: FormGroup<RegisterForm> = this.fb.group(
    {
      name: this.fb.control('', {
        nonNullable: true,
        validators: [Validators.required, Validators.minLength(2)],
      }),
      email: this.fb.control('', {
        nonNullable: true,
        validators: [Validators.required, Validators.email],
      }),
      password: this.fb.control('', {
        nonNullable: true,
        validators: [Validators.required, Validators.minLength(6)],
      }),
      confirmPassword: this.fb.control('', {
        nonNullable: true,
        validators: [Validators.required, Validators.minLength(6)],
      }),
    },
    { validators: [passwordMatchValidator()] },
  );

  loading = signal(false);
  error = signal('');

  invalid<K extends keyof RegisterForm>(key: K): boolean {
    const c = this.form.get(key);
    return !!(c && c.invalid && (c.dirty || c.touched));
  }

  async onSubmit() {
    if (this.form.invalid) return;

    this.loading.set(true);
    this.error.set('');

    try {
      const { name, email, password, confirmPassword } = this.form.getRawValue();
      await this.auth.register({ name, email, password, confirmPassword });
      await this.router.navigateByUrl('/dashboard');
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Erreur lors de la création du compte');
    } finally {
      this.loading.set(false);
    }
  }
}
