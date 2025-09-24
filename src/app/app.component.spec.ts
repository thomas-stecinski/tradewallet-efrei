import { TestBed } from '@angular/core/testing';
import { Component } from '@angular/core';
import { provideRouter, withEnabledBlockingInitialNavigation } from '@angular/router';
import { provideLocationMocks } from '@angular/common/testing';
import { RouterOutlet } from '@angular/router';
import { App } from './app';

@Component({
  standalone: true,
  selector: 'app-navbar',
  template: `<nav data-testid="stub-navbar"></nav>`,
})
class StubNavbar {}

@Component({
  standalone: true,
  template: `<p>stub</p>`,
})
class StubCmp {}

describe('App (intégration légère)', () => {
  beforeEach(async () => {
    localStorage.clear();

    const tb = TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter(
          [
            { path: '', component: StubCmp },
            { path: 'auth', children: [{ path: 'login', component: StubCmp }] },
            { path: 'dashboard', component: StubCmp },
            { path: 'portfolio', component: StubCmp },
            { path: 'transactions', component: StubCmp },
            { path: 'admin', component: StubCmp },
            { path: '**', component: StubCmp },
          ],
          withEnabledBlockingInitialNavigation(),
        ),
        provideLocationMocks(),
      ],
    });

    tb.overrideComponent(App, { set: { imports: [RouterOutlet, StubNavbar] } });

    await tb.compileComponents();
  });

  it('instancier App et afficher la navbar factice', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    expect(fixture.componentInstance).toBeTruthy();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('[data-testid="stub-navbar"]')).toBeTruthy();
  });
});
