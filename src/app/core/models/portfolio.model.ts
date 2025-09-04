export type TransactionType = 'deposit' | 'withdrawal' | 'buy' | 'sell';

export interface Transaction {
  id: number;
  portfolioId: number;
  investmentId?: number;   
  type: TransactionType;
  amount: number;        
  pricePerUnit?: number;  
  quantity?: number;       
  date: Date;
}

export interface CreateTransactionRequest {
  portfolioId: number;
  investmentId?: number;
  type: TransactionType;
  amount: number;
  pricePerUnit?: number;
  quantity?: number;
}