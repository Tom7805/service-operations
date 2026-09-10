import type { TaskRes, WorkBreakdownRes, TaskStatus } from './taskTypes';

export type { TaskRes, WorkBreakdownRes, TaskStatus };

export type ProjectStatus = 'RUNNING' | 'COMPLETED' | 'SUSPENDED' | 'CANCELLED';

/**
 * Thông tin một mẫu dự án trả về từ backend (NCL-05-CN-007).
 * Khớp ProjectTemplateRes.
 */
export interface ProjectTemplateRes {
  id: number;
  code: string;
  name: string;
  description: string | null;
  projectType: string;
  active: boolean;
  createdBy: string | null;
  createdAt: string;
}

/**
 * Payload tạo dự án từ mẫu có sẵn (NCL-05-CN-007).
 * POST /contracts/{contractId}/projects/from-template
 */
export interface ProjectCreateFromTemplateReq {
  templateId: number;
  name: string;
  startDate: string; // YYYY-MM-DD
  expectedEndDate: string; // YYYY-MM-DD
  projectManagerId: number;
}

/**
 * Thông tin dự án trả về từ backend (NCL-05-CN-001, NCL-05-CN-007).
 * Khớp ProjectRes.
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
 * Thông tin tối thiểu của hợp đồng để mở modal/màn hình tạo dự án từ mẫu.
 */
export interface ContractTargetForProject {
  id: number;
  contractCode: string;
  name: string;
  customerId?: number;
  customerName?: string;
  contractType?: string;
  limitValue?: number | null;
  status: string;
  startDate?: string | null;
  endDate?: string | null;
}
