import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PortfolioService, Portfolio } from '../services/portfolio.service';
import { AuthService } from '../../auth/services/auth.service';

@Component({
  standalone: true,
  selector: 'app-portfolio-page',
  imports: [CommonModule, FormsModule],
  template: `
    <section class="space-y-6">
      <header class="flex items-center justify-between">
        <h1 class="text-2xl font-bold">Mes portefeuilles</h1>
      </header>

      <!-- Create -->
      <div class="bg-white rounded-2xl shadow p-4 flex items-end gap-3">
        <div class="flex-1">
          <label for="newname" class="block text-sm font-medium text-gray-700 mb-1"
            >Nom du portefeuille</label
          >
          <input
            id="newname"
            [(ngModel)]="newName"
            class="w-full border rounded-lg px-3 py-2"
            placeholder="Ex: CTO, PEA, Crypto..."
          />
        </div>
        <button
          (click)="create()"
          class="px-4 py-2.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
        >
          Créer
        </button>
      </div>

      <!-- List -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        @for (p of list(); track p.id) {
          <article class="bg-white rounded-2xl shadow p-4">
            <div class="flex items-start justify-between gap-3">
              <div class="flex-1">
                @if (editId() === p.id) {
                  <input [(ngModel)]="editName" class="w-full border rounded-lg px-3 py-2" />
                } @else {
                  <h2 class="font-semibold">{{ p.name }}</h2>
                }
                <p class="text-xs text-gray-500 mt-1">#{{ p.id }} — {{ p.baseCurrency }}</p>
              </div>
              <div class="flex items-center gap-2">
                @if (editId() === p.id) {
                  <button (click)="saveRename(p.id)" class="text-blue-700 hover:underline text-sm">
                    Enregistrer
                  </button>
                  <button (click)="cancelRename()" class="text-gray-600 hover:underline text-sm">
                    Annuler
                  </button>
                } @else {
                  <button (click)="startRename(p)" class="text-blue-700 hover:underline text-sm">
                    Renommer
                  </button>
                  <button (click)="remove(p.id)" class="text-red-600 hover:underline text-sm">
                    Supprimer
                  </button>
                }
              </div>
            </div>
          </article>
        }
        @if (list().length === 0) {
          <p class="text-gray-500">Aucun portefeuille encore. Crée-en un pour commencer.</p>
        }
      </div>
    </section>
  `,
})
export class PortfolioPage {
  private pf = inject(PortfolioService);
  private auth = inject(AuthService);

  list = signal<Portfolio[]>([]);
  newName = '';
  editId = signal<number | null>(null);
  editName = '';

  constructor() {
    const u = this.auth.currentUser();
    this.list.set(u ? this.pf.listByUserFull(u.id) : []);
  }

  private refresh() {
    const u = this.auth.currentUser();
    this.list.set(u ? this.pf.listByUserFull(u.id) : []);
  }

  create() {
    const u = this.auth.currentUser();
    if (!u) return;
    this.pf.create(u.id, this.newName.trim());
    this.newName = '';
    this.refresh();
  }

  remove(id: number) {
    this.pf.remove(id);
    this.refresh();
  }

  startRename(p: Portfolio) {
    this.editId.set(p.id);
    this.editName = p.name;
  }

  saveRename(id: number) {
    this.pf.rename(id, this.editName.trim());
    this.editId.set(null);
    this.editName = '';
    this.refresh();
  }

  cancelRename() {
    this.editId.set(null);
    this.editName = '';
  }
}
