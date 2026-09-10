export type ProjectStatus = 'RUNNING' | 'COMPLETED' | 'SUSPENDED' | 'CANCELLED';

/**
 * Payload tạo dự án từ hợp đồng (NCL-05-CN-001).
 * POST /contracts/{contractId}/projects
 */
export interface ProjectCreateFromContractReq {
  name: string;
  startDate: string; // YYYY-MM-DD
  expectedEndDate: string; // YYYY-MM-DD
  projectManagerId: number;
}

/**
 * Thông tin dự án trả về từ backend (NCL-05-CN-001).
 */
export interface ProjectRes {
  id: number;
  projectCode: string;
  name: string;
  contractId: number;
  customerId: number;
  projectType: string;
  limitValue: number | null;
  startDate: string;
  expectedEndDate: string;
  projectManagerId: number;
  status: ProjectStatus | string;
  createdBy?: string | null;
  createdAt: string;
}

/**
 * Thông tin tối thiểu của hợp đồng để mở modal tạo dự án.
 */
export interface ContractTargetForProject {
  id: number;
  contractCode: string;
  name: string;
  status: string;
  customerId?: number;
  customerName?: string;
  contractType?: string;
  limitValue?: number | null;
  totalValue?: number | null;
  startDate?: string | null;
  endDate?: string | null;
}

export type {
  TaskStatus,
  TaskRes,
  TaskCreateReq,
  WorkPackageReq,
  WorkBreakdownRes,
} from './taskTypes';
