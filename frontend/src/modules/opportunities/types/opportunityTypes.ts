/**
 * Opportunity module type contracts for the frontend.
 * Matches the backend response contract for opportunity and activity APIs.
 */

export type OpportunityStatus = 'OPEN' | 'CLOSED';

export type ActivityType = 'CALL' | 'MEETING' | 'EMAIL' | 'NOTE';

export interface OpportunityActivity {
  id: number;
  opportunityId: number;
  activityType: ActivityType;
  occurredAt: string;
  participants?: string | null;
  content: string;
  createdBy?: string | null;
  createdAt?: string | null;
}

export interface OpportunityActivityCreatePayload {
  activityType: ActivityType;
  occurredAt: string;
  participants?: string;
  content: string;
}

export interface OpportunityActivityFormErrors {
  activityType?: string;
  occurredAt?: string;
  participants?: string;
  content?: string;
  general?: string;
}

export interface OpportunitySummary {
  id: number;
  name: string;
  customerId?: number | null;
  customerName?: string | null;
  status: OpportunityStatus;
  stage?: string | null;
  expectedCloseDate?: string | null;
}
