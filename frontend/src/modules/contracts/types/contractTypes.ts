export type ContractType = 'TIME_AND_MATERIAL' | 'FIXED_PRICE' | 'MAINTENANCE';

export interface ContractCreateFromOpportunityReq {
  name?: string | null;
  contractType: ContractType;
  totalValue?: number | null;
  startDate?: string | null; // YYYY-MM-DD
  endDate?: string | null; // YYYY-MM-DD
  notes?: string | null;
}

export type ContractStatus = 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'TERMINATED';

/** Khớp đúng field name của backend (OpportunityRes) — trước đây dùng `code`
 *  trong khi API trả về `contractCode`, khiến mã hợp đồng luôn là undefined
 *  ở phía Frontend dù server đã trả về đầy đủ. */
export interface ContractRes {
  id: number;
  contractCode: string;
  name: string;
  opportunityId: number | null;
  customerId: number;
  customerName?: string | null;
  quoteId: number | null;
  contractType: ContractType;
  totalValue: number;
  startDate?: string | null;
  endDate?: string | null;
  status: ContractStatus;
  notes?: string | null;
  createdBy?: string;
  createdAt?: string;
}
