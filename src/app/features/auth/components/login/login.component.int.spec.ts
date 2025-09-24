import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { AuthService } from '../../services/auth.service';
import { ReactiveFormsModule } from '@angular/forms';
import { LoginComponent } from './login.component';

@Component({
  standalone: true,
  template: `<p>dash</p>`,
})
class DashboardStub {}

describe('LoginComponent (intégration)', () => {
  let fixture: ComponentFixture<LoginComponent>;
  let component: LoginComponent;
  let authSpy: jasmine.SpyObj<AuthService>;

  type LoginReturn = ReturnType<AuthService['login']>;
  type User = Awaited<LoginReturn>;

  beforeEach(async () => {
    authSpy = jasmine.createSpyObj('AuthService', ['login']);

    await TestBed.configureTestingModule({
      imports: [
        LoginComponent,
        ReactiveFormsModule,
        RouterTestingModule.withRoutes([
          { path: 'dashboard', component: DashboardStub },
          { path: 'auth/register', component: DashboardStub },
        ]),
      ],
      providers: [{ provide: AuthService, useValue: authSpy }],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("afficher un message d'erreur si l'authentification échoue", async () => {
    authSpy.login.and.returnValue(Promise.reject(new Error('Email ou mot de passe incorrect')));

    component.form.setValue({ email: 'wrong@test.com', password: 'badpass' });

    await component.onSubmit();
    fixture.detectChanges();

    expect(authSpy.login).toHaveBeenCalled();
    expect(component.error()).toBe('Email ou mot de passe incorrect');

    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent || '').toContain('Email ou mot de passe incorrect');
  });

  it("naviguer vers /dashboard quand l'authentification réussit", async () => {
    const userStub: User = {} as unknown as User;

    authSpy.login.and.returnValue(Promise.resolve(userStub));

    component.form.setValue({ email: 'user@gmail.com', password: 'user123' });

    await component.onSubmit();
    fixture.detectChanges();

    expect(authSpy.login).toHaveBeenCalled();
    expect(component.error()).toBe('');
  });
});
