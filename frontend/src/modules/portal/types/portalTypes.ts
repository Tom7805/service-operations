/**
 * Kiểu dữ liệu phía cổng khách hàng (`/portal/**`, chỉ VT-09). Chỉ gồm đúng các trường backend trả cho khách
 * hàng — cổng KHÔNG có mô tả/ghi chú nội bộ, giờ công, ngân sách, giá vốn, rủi ro hay hạn mức hợp đồng (QTN-26).
 */

export type PortalProjectStatus = 'RUNNING' | 'CLOSED';
export type PortalMilestoneStatus = 'DONE' | 'ON_TRACK' | 'LATE';
export type PortalAcceptanceStatus = 'PENDING_CONFIRMATION' | 'ACCEPTED' | 'NEEDS_REVISION';
export type PortalDeliverableType = 'DOCUMENT' | 'SOURCE_CODE' | 'SOFTWARE_BUILD' | 'DESIGN' | 'REPORT' | 'OTHER';

/** NCL-13-CN-002 — một dự án của khách hàng ở mức tổng quan (`GET /portal/projects`). */
export interface PortalProjectRes {
  id: number;
  projectCode: string;
  name: string;
  status: PortalProjectStatus | string;
  startDate?: string | null;
  expectedEndDate?: string | null;
  contractCode?: string | null;
  projectManagerName?: string | null;
  totalTasks: number;
  doneTasks: number;
  progressPercent: number;
  totalMilestones: number;
  doneMilestones: number;
  lateMilestones: number;
  nextMilestoneName?: string | null;
  nextMilestoneDate?: string | null;
}

export interface PortalWorkPackageProgress {
  id: number;
  parentId?: number | null;
  name: string;
  totalTasks: number;
  doneTasks: number;
  progressPercent: number;
  acceptanceStatus?: PortalAcceptanceStatus | string | null;
}

export interface PortalMilestoneProgress {
  id: number;
  name: string;
  plannedDate?: string | null;
  actualDate?: string | null;
  status: PortalMilestoneStatus | string;
  daysLate?: number | null;
}

export interface PortalDeliveredItem {
  deliverableId: number;
  workPackageId?: number | null;
  workPackageName?: string | null;
  name: string;
  deliverableType?: PortalDeliverableType | string | null;
  latestVersionNo?: string | null;
  latestDeliveredDate?: string | null;
  latestFileUrl?: string | null;
  versionCount: number;
}

/** NCL-13-CN-002 — tiến độ chi tiết một dự án (`GET /portal/projects/{projectId}`). */
export interface PortalProjectProgressRes {
  project: PortalProjectRes;
  workPackages: PortalWorkPackageProgress[];
  milestones: PortalMilestoneProgress[];
  deliverables: PortalDeliveredItem[];
}

export const PORTAL_PROJECT_STATUS_LABEL: Record<PortalProjectStatus, string> = {
  RUNNING: 'Đang thực hiện',
  CLOSED: 'Đã kết thúc',
};

export const PORTAL_MILESTONE_STATUS_LABEL: Record<PortalMilestoneStatus, string> = {
  DONE: 'Đã hoàn thành',
  ON_TRACK: 'Đúng tiến độ',
  LATE: 'Đang trễ',
};

export const PORTAL_ACCEPTANCE_STATUS_LABEL: Record<PortalAcceptanceStatus, string> = {
  PENDING_CONFIRMATION: 'Chờ bạn xác nhận nghiệm thu',
  ACCEPTED: 'Đã nghiệm thu',
  NEEDS_REVISION: 'Đang chỉnh sửa theo góp ý',
};

export const PORTAL_DELIVERABLE_TYPE_LABEL: Record<PortalDeliverableType, string> = {
  DOCUMENT: 'Tài liệu',
  SOURCE_CODE: 'Mã nguồn',
  SOFTWARE_BUILD: 'Bản cài đặt phần mềm',
  DESIGN: 'Thiết kế',
  REPORT: 'Báo cáo',
  OTHER: 'Khác',
};

/* ===== NCL-13-CN-003 — Khách hàng duyệt phiếu nghiệm thu trên cổng ===== */

export type PortalDecisionType = 'ACCEPTED' | 'REJECTED';
export type PortalConfirmationChannel = 'PORTAL' | 'INTERNAL';

/** Phần tử danh sách `GET /portal/acceptances` (tóm tắt). */
export interface PortalAcceptanceSummary {
  id: number;
  certificateCode: string;
  projectId: number;
  projectCode: string;
  projectName: string;
  workPackageName?: string | null;
  title: string;
  acceptedValue?: number | null;
  status: PortalAcceptanceStatus | string;
  revisionNo: number;
  /** true khi phiếu đang chờ chính khách hàng quyết định (PENDING_CONFIRMATION). */
  awaitingDecision: boolean;
  createdAt?: string | null;
  updatedAt?: string | null;
  confirmedAt?: string | null;
}

export interface PortalAcceptanceDecision {
  decision: PortalDecisionType | string;
  channel?: PortalConfirmationChannel | string | null;
  revisionNo?: number | null;
  signerName?: string | null;
  signedDate?: string | null;
  reason?: string | null;
  recordedAt?: string | null;
}

/** Chi tiết phiếu — dùng chung cho `GET /portal/acceptances/{id}`, `confirm`, `reject`. */
export interface PortalAcceptanceDetail extends PortalAcceptanceSummary {
  note?: string | null;
  lastRejectionReason?: string | null;
  signerName?: string | null;
  signedDate?: string | null;
  confirmationChannel?: PortalConfirmationChannel | string | null;
  tasks: string[];
  deliverables: Array<{ deliverableName: string; versionNo?: string | null }>;
  decisions: PortalAcceptanceDecision[];
}

export const PORTAL_ACCEPTANCE_LIST_STATUS_LABEL: Record<PortalAcceptanceStatus, string> = {
  PENDING_CONFIRMATION: 'Chờ bạn xác nhận',
  ACCEPTED: 'Đã nghiệm thu',
  NEEDS_REVISION: 'Đang chỉnh sửa',
};

export const PORTAL_DECISION_LABEL: Record<PortalDecisionType, string> = {
  ACCEPTED: 'Xác nhận nghiệm thu',
  REJECTED: 'Từ chối nghiệm thu',
};

export const PORTAL_CHANNEL_LABEL: Record<PortalConfirmationChannel, string> = {
  PORTAL: 'Trên cổng khách hàng',
  INTERNAL: 'Ghi nhận bởi quản lý dự án',
};

export const PORTAL_REJECT_REASON_MAX = 1000;
