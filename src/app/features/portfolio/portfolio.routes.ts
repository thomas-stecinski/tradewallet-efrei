import { Routes } from '@angular/router';
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  standalone: true,
  selector: 'app-portfolio',
  imports: [CommonModule],
  template: `
    <h1 class="text-2xl font-bold">Portfolio</h1>
    <p class="text-gray-600 text-sm">Stub – contenu à venir.</p>
  `,
})
class PortfolioPage {}

export const PORTFOLIO_ROUTES: Routes = [{ path: '', component: PortfolioPage }];
