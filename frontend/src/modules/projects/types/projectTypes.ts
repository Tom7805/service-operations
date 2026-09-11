import type { TaskStatus } from './taskTypes';

/** Khớp enum ProjectStatus phía backend — dự án chỉ có hai trạng thái. */
export type ProjectStatus = 'RUNNING' | 'CLOSED';

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

/** Khớp enum MilestoneProgressStatus phía backend — tính động khi đọc, không lưu DB (NCL-05-CN-008). */
export type MilestoneProgressStatus = 'DONE' | 'ON_TRACK' | 'LATE';

/** Hạng mục phải hoàn thành của một mốc — liên kết tới công việc (Task) trong cây công việc. */
export interface ProjectMilestoneItemRes {
  taskId: number;
  taskName: string | null;
  taskStatus: TaskStatus | null;
}

/**
 * Mốc tiến độ dự án trả về từ backend (NCL-05-CN-008).
 * Khớp ProjectMilestoneRes — `status`/`daysLate` do backend tính động tại thời điểm gọi.
 */
export interface ProjectMilestoneRes {
  id: number;
  projectId: number;
  name: string;
  description: string | null;
  plannedDate: string; // YYYY-MM-DD
  actualDate: string | null;
  status: MilestoneProgressStatus;
  daysLate: number | null;
  items: ProjectMilestoneItemRes[];
}

/**
 * Payload tạo/cập nhật mốc tiến độ (NCL-05-CN-008).
 * POST/PUT /projects/{projectId}/milestones[/{milestoneId}]
 */
export interface ProjectMilestoneReq {
  name: string;
  description?: string | null;
  plannedDate: string; // YYYY-MM-DD
  taskIds: number[];
}

/**
 * Payload ghi nhận ngày thực tế hoàn thành mốc (NCL-05-CN-008).
 * POST /projects/{projectId}/milestones/{milestoneId}/complete
 */
export interface ProjectMilestoneCompleteReq {
  actualDate: string; // YYYY-MM-DD
}

/**
 * Khớp enum RiskLevel phía backend — dùng chung cho mức tác động (impact), khả năng
 * xảy ra (likelihood) và mức độ rủi ro suy ra (severity) (NCL-05-CN-009).
 */
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';

/** Khớp enum RiskStatus phía backend — vòng đời xử lý rủi ro, lưu DB (NCL-05-CN-009). */
export type RiskStatus = 'OPEN' | 'MITIGATING' | 'CLOSED';

/**
 * Rủi ro dự án trả về từ backend (NCL-05-CN-009).
 * Khớp ProjectRiskRes — `score`/`severity` do backend tính động từ impact x likelihood
 * tại thời điểm đọc, không lưu DB.
 */
export interface ProjectRiskRes {
  id: number;
  projectId: number;
  description: string;
  impact: RiskLevel;
  likelihood: RiskLevel;
  score: number;
  severity: RiskLevel;
  status: RiskStatus;
  mitigation: string | null;
  watcherId: number;
  watcherName: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Payload tạo/cập nhật rủi ro (NCL-05-CN-009).
 * POST/PUT /projects/{projectId}/risks[/{riskId}]
 */
export interface ProjectRiskReq {
  description: string;
  impact: RiskLevel;
  likelihood: RiskLevel;
  mitigation?: string | null;
  watcherId: number;
}

/**
 * Payload cập nhật trạng thái xử lý rủi ro (NCL-05-CN-009).
 * PUT /projects/{projectId}/risks/{riskId}/status
 */
export interface ProjectRiskStatusReq {
  status: RiskStatus;
}

export type {
  TaskStatus,
  TaskRes,
  TaskCreateReq,
  TaskBudgetReq,
  TaskBudgetStatusRes,
  WorkPackageReq,
  WorkBreakdownRes,
} from './taskTypes';
