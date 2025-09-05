import { Routes } from '@angular/router';
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  standalone: true,
  selector: 'app-dashboard',
  imports: [CommonModule],
  template: `
    <section class="space-y-4">
      <h1 class="text-2xl font-bold">Dashboard</h1>
      <p class="text-gray-600">Bienvenue sur TradeWallet.</p>
    </section>
  `,
})
class DashboardPage {}

export const DASHBOARD_ROUTES: Routes = [{ path: '', component: DashboardPage }];
