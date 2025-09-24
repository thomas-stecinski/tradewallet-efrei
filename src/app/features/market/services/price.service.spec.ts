import { TestBed } from '@angular/core/testing';
import { PriceService } from './price.service';
import type { Transaction } from '../../../core/models/transaction.model';

describe('PriceService (unitaire)', () => {
  let service: PriceService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    service = TestBed.inject(PriceService);
  });

  it('ajouter/lister/totaliser les crédits de livret', () => {
    service.addLivretCredit('Livret A', 10, '2024-01-10');
    service.addLivretCredit('Livret A', 20, '2024-02-10');
    const liste = service.listLivretCredits('Livret A');

    expect(liste.length).toBe(2);
    expect(service.totalLivretCredits('Livret A')).toBe(30);
    expect(service.lastCreditDate('Livret A')).toBe('2024-02-10');
  });

  it("renvoyer l'override s'il existe, sinon le dernier prix de transaction", () => {
    const txs: Transaction[] = [
      {
        id: 1,
        userId: 1,
        portfolioId: 1,
        type: 'buy',
        assetType: 'stock',
        symbol: 'AAPL',
        quantity: 1,
        pricePerUnit: 100,
        fees: 0,
        total: 100,
        createdAt: new Date('2024-01-01'),
      },
      {
        id: 2,
        userId: 1,
        portfolioId: 1,
        type: 'buy',
        assetType: 'stock',
        symbol: 'AAPL',
        quantity: 1,
        pricePerUnit: 150,
        fees: 0,
        total: 150,
        createdAt: new Date('2024-03-02'),
      },
    ];
    expect(service.getCurrentPrice('AAPL', txs)).toBe(150);

    service.setOverride('AAPL', 999);
    expect(service.getCurrentPrice('AAPL', txs)).toBe(999);

    service.setOverride('AAPL', undefined);
    expect(service.getCurrentPrice('AAPL', txs)).toBe(150);
  });
});
