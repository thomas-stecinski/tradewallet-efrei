export type AssetType = 'stock' | 'etf' | 'crypto' | 'livret';
export type OrderType = 'buy' | 'sell';

export interface Transaction {
  id: number;
  userId: number;
  portfolioId: number;
  type: OrderType; // buy | sell
  assetType: AssetType; // inclut 'livret'
  symbol: string; // ex: "Livret A", "LIVRET JEUNE", "AAPL", "BTC" (ESPACES AUTORISÉS)
  quantity: number; // pour 'livret': 1
  pricePerUnit: number; // pour 'livret': montant du dépôt/retrait
  fees?: number; // frais éventuels
  total: number; // signé (buy positif, sell négatif) + frais
  createdAt: Date;
}

export type CreateTransactionDto = Omit<Transaction, 'id' | 'createdAt' | 'total'>;
