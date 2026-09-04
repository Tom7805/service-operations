/**
 * Định nghĩa kiểu dữ liệu cho mô-đun Cơ hội bán hàng (Sales Opportunity Module)
 * Tuân thủ Backend API Contract NCL-03-CN-001
 */

export type OpportunityStage =
  | 'APPROACH' // Giai đoạn tiếp cận (mặc định khởi tạo theo QTN-06)
  | 'DISCOVERY'
  | 'PROPOSAL'
  | 'NEGOTIATION'
  | 'WON'
  | 'LOST';

export type OpportunityStatus =
  | 'OPEN' // Đang xử lý (mặc định khởi tạo theo QTN-06)
  | 'WON'
  | 'LOST'
  | 'ABANDONED';

export interface Opportunity {
  id: number;
  name: string;
  customerId: number;
  customerName?: string;
  expectedValue: number;
  expectedCloseDate?: string | null;
  stage: OpportunityStage | string;
  status: OpportunityStatus | string;
  ownerId?: number | null;
  createdBy?: string;
  createdAt?: string;
}

export interface OpportunityCreatePayload {
  name: string;
  customerId: number;
  expectedValue: number;
  expectedCloseDate?: string | null;
  ownerId?: number | null;
}

export interface OpportunityCreateResponse {
  success: boolean;
  message: string;
  data: Opportunity;
}

export interface OpportunityFormErrors {
  name?: string;
  customerId?: string;
  expectedValue?: string;
  expectedCloseDate?: string;
  general?: string;
}

export interface CustomerOption {
  id: number;
  code: string;
  name: string;
  status?: string | null;
}
