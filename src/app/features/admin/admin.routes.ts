import { Routes } from '@angular/router';
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  standalone: true,
  selector: 'app-admin',
  imports: [CommonModule],
  template: `
    <h1 class="text-2xl font-bold">Admin</h1>
    <p class="text-gray-600 text-sm">Accès réservé aux administrateurs.</p>
  `,
})
class AdminPage {}

export const ADMIN_ROUTES: Routes = [{ path: '', component: AdminPage }];
