import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service';

describe('AuthService (unitaire)', () => {
  let service: AuthService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    service = TestBed.inject(AuthService);
  });

  it('login() réussir avec le compte seedé (admin@gmail.com/admin123)', async () => {
    const user = await service.login({ email: 'admin@gmail.com', password: 'admin123' });
    expect(user).toBeTruthy();
    expect(user.email).toBe('admin@gmail.com');
    expect(service.isAuthenticated()).toBeTrue();
    expect(service.currentUser()?.email).toBe('admin@gmail.com');
  });

  it('login() échouer avec des identifiants incorrects', async () => {
    await expectAsync(
      service.login({ email: 'admin@gmail.com', password: 'wrong' }),
    ).toBeRejectedWithError('Email ou mot de passe incorrect');

    expect(service.isAuthenticated()).toBeFalse();
    expect(service.currentUser()).toBeNull();
  });

  it('register() créer un nouvel utilisateur, le connecter et le persister (LS)', async () => {
    const created = await service.register({
      name: 'Doe',
      firstName: 'John',
      email: 'john@doe.com',
      phone: '+33123456789',
      password: 'secret1',
      confirmPassword: 'secret1',
    });

    expect(created).toBeTruthy();
    expect(created.email).toBe('john@doe.com');
    expect(service.isAuthenticated()).toBeTrue();
    expect(service.currentUser()?.email).toBe('john@doe.com');

    const again = TestBed.inject(AuthService);
    expect(again.currentUser()?.email).toBe('john@doe.com');
  });
});
