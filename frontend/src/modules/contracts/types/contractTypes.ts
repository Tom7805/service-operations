export type ContractType = 'TIME_AND_MATERIAL' | 'FIXED_PRICE' | 'MAINTENANCE';

export interface ContractCreateFromOpportunityReq {
  name?: string | null;
  contractType: ContractType;
  totalValue?: number | null;
  startDate?: string | null; // YYYY-MM-DD
  endDate?: string | null; // YYYY-MM-DD
  notes?: string | null;
}

export interface ContractRes {
  id: number;
  code?: string;
  name: string;
  contractType: ContractType;
  totalValue?: number | null;
  startDate?: string | null;
  endDate?: string | null;
  customerId?: number;
  customerName?: string;
  createdBy?: string;
  createdAt?: string;
}
