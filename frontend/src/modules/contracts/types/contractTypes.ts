export interface MilestoneRes {
  id: number;
  contractId: number;
  name: string;
  percentage?: number | null;
  amount: number;
  expectedDate?: string | null;
  acceptanceCondition?: string | null;
  status: 'PENDING' | 'INVOICED' | 'CANCELLED' | string;
}

export interface MilestoneCreatePayload {
  name: string;
  percentage?: number | null;
  amount: number;
  expectedDate?: string | null;
  acceptanceCondition?: string | null;
}

export interface MilestoneUpdatePayload extends MilestoneCreatePayload {}

export interface ContractBasic {
  id: number;
  value: number; // tổng giá trị hợp đồng
}
