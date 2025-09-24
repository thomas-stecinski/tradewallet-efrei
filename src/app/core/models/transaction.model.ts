export type AssetType = 'stock' | 'etf' | 'crypto' | 'livret';
export type OrderType = 'buy' | 'sell';

export interface Transaction {
  id: number;
  userId: number;
  portfolioId: number;
  type: OrderType;
  assetType: AssetType;
  symbol: string;
  quantity: number;
  pricePerUnit: number;
  fees?: number;
  total: number;
  createdAt: Date;
}

export type CreateTransactionDto = Omit<Transaction, 'id' | 'createdAt' | 'total'>;
