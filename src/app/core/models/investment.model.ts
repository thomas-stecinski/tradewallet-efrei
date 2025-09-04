export type InvestmentType = 'livret' | 'action' | 'etf' | 'crypto';

export interface Investment {
  id: number;
  portfolioId: number;     
  type: InvestmentType;
  name: string;             
  investedAmount: number;     
  interestRate?: number;     
  entryPrice?: number;     
  quantity?: number;          
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateInvestmentRequest {
  portfolioId: number;
  type: InvestmentType;
  name: string;
  investedAmount: number;
  interestRate?: number;
  entryPrice?: number;
  quantity?: number;
}