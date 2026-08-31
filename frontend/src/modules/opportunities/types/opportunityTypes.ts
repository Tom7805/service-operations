export type OpportunityStage = 'NEW' | 'CONTACTED' | 'PROPOSAL' | 'NEGOTIATION' | 'WON' | 'LOST';

export interface Opportunity {
  id: number;
  name: string;
  customerId: number;
  customerName: string | null;
  ownerUserId: number | null;
  ownerFullName: string | null;
  stage: OpportunityStage;
  amount: number | null;
  expectedCloseDate: string | null;
  note: string | null;
  createdAt: string;
}

export interface PipelineStage {
  stage: OpportunityStage;
  stageLabel: string;
  count: number;
  totalAmount: number;
  opportunities: Opportunity[];
}

export interface OpportunityCreatePayload {
  name: string;
  customerId: number;
  ownerUserId?: number | null;
  amount?: number | null;
  expectedCloseDate?: string | null;
  note?: string | null;
}
