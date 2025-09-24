import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RegisterComponent } from './register.component';
import { RouterTestingModule } from '@angular/router/testing';
import { ReactiveFormsModule } from '@angular/forms';

describe('RegisterComponent (formulaire unitaire)', () => {
  let fixture: ComponentFixture<RegisterComponent>;
  let component: RegisterComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RegisterComponent, RouterTestingModule, ReactiveFormsModule],
    }).compileComponents();

    fixture = TestBed.createComponent(RegisterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('démarrer avec un formulaire invalide', () => {
    expect(component.form.valid).toBeFalse();
  });

  it('poser une erreur passwordMismatch quand les mots de passe diffèrent', () => {
    component.form.setValue({
      name: 'Doe',
      firstName: 'John',
      email: 'john@doe.com',
      phone: '06 12 34 56 78',
      password: '123456',
      confirmPassword: '654321',
    });
    expect(component.form.hasError('passwordMismatch')).toBeTrue();
  });

  it('valider un numéro FR (ex: "06 12 34 56 78" et "+33 6 12 34 56 78")', () => {
    const phone = component.form.controls.phone;

    phone.setValue('06 12 34 56 78');
    expect(phone.valid).toBeTrue();

    phone.setValue('+33 6 12 34 56 78');
    expect(phone.valid).toBeTrue();
  });
});
