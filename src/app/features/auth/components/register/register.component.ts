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
  firstName: FormControl<string>;
  email: FormControl<string>;
  password: FormControl<string>;
  confirmPassword: FormControl<string>;
  phone: FormControl<string>;
}

// Cross-field validator: password === confirmPassword
function passwordMatchValidator(): ValidatorFn {
  return (group: AbstractControl): { passwordMismatch: true } | null => {
    const password = group.get('password')?.value as string | undefined;
    const confirm = group.get('confirmPassword')?.value as string | undefined;
    if (!password || !confirm) return null;
    return password === confirm ? null : { passwordMismatch: true };
  };
}

/** FR phone validator (with or without spaces) */
function frenchPhoneValidator(): ValidatorFn {
  return (control: AbstractControl) => {
    const raw = (control.value ?? '') as string;
    const v = raw.replace(/\s+/g, '');
    return /^0\d{9}$|^\+33\d{9}$/.test(v) ? null : { invalidPhone: true };
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
              autocomplete="family-name"
              required
            />
            @if (invalid('name')) {
              <p class="text-sm text-red-600 mt-1">Nom requis</p>
            }
          </div>

          <!-- Prénom -->
          <div>
            <label for="reg-firstname" class="block text-sm text-gray-700 mb-1">Prénom</label>
            <input
              id="reg-firstname"
              type="text"
              formControlName="firstName"
              class="w-full border rounded px-3 py-2 focus:outline-none focus:ring"
              [class.border-red-500]="invalid('firstName')"
              autocomplete="given-name"
              required
            />
            @if (invalid('firstName')) {
              <p class="text-sm text-red-600 mt-1">Prénom requis</p>
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

          <!-- Téléphone -->
          <div>
            <label for="reg-phone" class="block text-sm text-gray-700 mb-1">Téléphone</label>
            <input
              id="reg-phone"
              type="tel"
              formControlName="phone"
              class="w-full border rounded px-3 py-2 focus:outline-none focus:ring"
              [class.border-red-500]="invalid('phone')"
              inputmode="numeric"
              pattern="[0-9+ ]*"
              autocomplete="tel"
              placeholder="06 12 34 56 78"
              [attr.maxlength]="maxLen"
              (keydown)="onPhoneKeyDown($event)"
              (input)="onPhoneInput($event)"
              (paste)="onPhonePaste($event)"
              required
            />
            @if (invalid('phone')) {
              <p class="text-sm text-red-600 mt-1">Numéro invalide</p>
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

  // Strongly-typed reactive form with validators
  form: FormGroup<RegisterForm> = this.fb.group(
    {
      name: this.fb.control('', {
        nonNullable: true,
        validators: [Validators.required, Validators.minLength(2)],
      }),
      firstName: this.fb.control('', {
        nonNullable: true,
        validators: [Validators.required, Validators.minLength(2)],
      }),
      email: this.fb.control('', {
        nonNullable: true,
        validators: [Validators.required, Validators.email],
      }),
      phone: this.fb.control('', {
        nonNullable: true,
        validators: [Validators.required, frenchPhoneValidator()],
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

  // UI state
  loading = signal(false);
  error = signal('');

  // Dynamic maxlength depending on +33 format
  get maxLen(): number {
    const v = (this.form.controls.phone.value ?? '').toString().trim();
    return v.startsWith('+33') ? 17 : 14;
  }

  // Helper: field is invalid and touched/dirty
  invalid<K extends keyof RegisterForm>(key: K): boolean {
    const c = this.form.get(key);
    return !!(c && c.invalid && (c.dirty || c.touched));
  }

  // Keydown guard: allow digits, control keys, and a single leading '+'
  onPhoneKeyDown(evt: KeyboardEvent) {
    const allowed = ['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight', 'Home', 'End'];
    if (allowed.includes(evt.key)) return;

    const input = evt.target as HTMLInputElement;
    const val = input.value ?? '';
    const selLen = (input.selectionEnd ?? 0) - (input.selectionStart ?? 0);
    const digitsCount = val.replace(/[^\d]/g, '').length;

    if (evt.key === '+') {
      const caretAtStart = (input.selectionStart ?? 0) === 0 && (input.selectionEnd ?? 0) === 0;
      if (!caretAtStart || val.trim().startsWith('+')) evt.preventDefault();
      return;
    }
    if (!/^\d$/.test(evt.key)) {
      evt.preventDefault();
      return;
    }

    const maxDigits = val.trim().startsWith('+33') ? 11 : 10;
    if (selLen === 0 && digitsCount >= maxDigits) evt.preventDefault();
  }

  // Input formatter: live-format FR phone (+33 or local)
  onPhoneInput(evt: Event) {
    const input = evt.target as HTMLInputElement;
    const c = this.form.controls.phone;
    const old = input.value;
    const hadPlus = old.trim().startsWith('+');
    const caretDigitsBefore = this.countDigitsBefore(old, input.selectionStart ?? old.length);

    const digits = old.replace(/[^\d]/g, '');
    let formatted = '';

    if (hadPlus && digits.startsWith('33')) {
      const local = digits.slice(2, 11);
      formatted = this.formatIntlFr(local);
    } else {
      const local = digits.slice(0, 10);
      formatted = this.formatFr(local);
    }

    c.setValue(formatted, { emitEvent: false });
    c.updateValueAndValidity({ emitEvent: false });

    // Keep caret near original digit position
    const newCaret = this.indexFromDigits(formatted, caretDigitsBefore);
    queueMicrotask(() => input.setSelectionRange(newCaret, newCaret));
  }

  // Paste handler: normalize and format pasted text
  onPhonePaste(evt: ClipboardEvent) {
    evt.preventDefault();
    const input = evt.target as HTMLInputElement;
    const txt = (evt.clipboardData?.getData('text') ?? '').trim();
    const hadPlus = txt.startsWith('+');
    const digits = txt.replace(/[^\d]/g, '');

    const formatted =
      hadPlus && digits.startsWith('33')
        ? this.formatIntlFr(digits.slice(2, 11))
        : this.formatFr(digits.slice(0, 10));

    this.form.controls.phone.setValue(formatted, { emitEvent: false });
    this.form.controls.phone.updateValueAndValidity({ emitEvent: false });

    queueMicrotask(() => {
      const end = formatted.length;
      input.setSelectionRange(end, end);
    });
  }

  // Format "0X XX XX XX XX"
  private formatFr(local: string): string {
    const p: string[] = [];
    if (local.length > 0) p.push(local.slice(0, 2));
    if (local.length > 2) p.push(local.slice(2, 4));
    if (local.length > 4) p.push(local.slice(4, 6));
    if (local.length > 6) p.push(local.slice(6, 8));
    if (local.length > 8) p.push(local.slice(8, 10));
    return p.join(' ').trim();
  }
  // Format "+33 X XX XX XX XX"
  private formatIntlFr(local: string): string {
    let out = '+33';
    if (local.length > 0) out += ' ' + local.slice(0, 1);
    if (local.length > 1) out += ' ' + local.slice(1, 3);
    if (local.length > 3) out += ' ' + local.slice(3, 5);
    if (local.length > 5) out += ' ' + local.slice(5, 7);
    if (local.length > 7) out += ' ' + local.slice(7, 9);
    return out;
  }

  // Caret helpers for digit-aware positioning
  private countDigitsBefore(text: string, index: number): number {
    let n = 0;
    for (let i = 0; i < Math.min(index, text.length); i++) if (/\d/.test(text[i])) n++;
    return n;
  }
  private indexFromDigits(text: string, digitsBefore: number): number {
    if (digitsBefore <= 0) return 0;
    let seen = 0;
    for (let i = 0; i < text.length; i++) {
      if (/\d/.test(text[i])) {
        seen++;
        if (seen === digitsBefore) return i + 1;
      }
    }
    return text.length;
  }

  // Convert to E.164 if number is FR-like
  private toE164IfFR(raw: string): string {
    if (!raw) return '';
    let v = raw.trim();
    const hasPlus = v.startsWith('+');
    v = v.replace(/[^\d]/g, '');
    if (hasPlus && !v.startsWith('0')) v = '+' + v;

    if (/^0\d{9}$/.test(v)) return '+33' + v.slice(1);
    if (/^\+33\d{9}$/.test(v)) return v;
    return v;
  }

  // Submit flow: call AuthService, navigate, handle errors
  async onSubmit() {
    if (this.form.invalid) return;

    this.loading.set(true);
    this.error.set('');

    try {
      const { name, firstName, email, password, confirmPassword, phone } = this.form.getRawValue();
      const phoneE164 = this.toE164IfFR(phone);

      await this.auth.register({
        name,
        firstName,
        email,
        phone: phoneE164,
        password,
        confirmPassword,
      });
      await this.router.navigateByUrl('/dashboard');
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Erreur lors de la création du compte');
    } finally {
      this.loading.set(false);
    }
  }
}
