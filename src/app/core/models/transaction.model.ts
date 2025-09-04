export interface Transaction {
  id: number;
  userId: number;
  portfolioId: number;
  type: 'buy' | 'sell';
  assetType: 'stock' | 'etf' | 'crypto';
  symbol: string;
  quantity: number;
  pricePerUnit: number;
  fees?: number;
  total: number;
  createdAt: Date;
}

export type CreateTransactionDto = Omit<Transaction, 'id' | 'createdAt' | 'total'>;