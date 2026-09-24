import type { TaskStatus } from '../../projects/types/taskTypes';

/**
 * Kiểu dữ liệu Epic NCL-12 — Nghiệm thu và bàn giao. Khớp các DTO backend trong
 * `modules/acceptance/dto` và mục "Epic NCL-12" của docs/04-api/api-contract.md.
 */

/** Trạng thái phiếu nghiệm thu: chờ KH xác nhận → đã nghiệm thu, hoặc bị từ chối → nộp lại. */
export type AcceptanceStatus = 'PENDING_CONFIRMATION' | 'NEEDS_REVISION' | 'ACCEPTED';

export type ConfirmationChannel = 'INTERNAL' | 'PORTAL';

export type AcceptanceDecisionType = 'ACCEPTED' | 'REJECTED';

/** Công việc còn dang dở của hạng mục (TC-02 — QTN-24). */
export interface UnfinishedTaskRes {
  taskId: number;
  taskName: string;
  status: TaskStatus;
}

/** Sản phẩm bàn giao của hạng mục; `latestVersionId` null = chưa bàn giao lần nào, không vào phiếu. */
export interface DeliverablePreviewRes {
  deliverableId: number;
  deliverableName: string;
  latestVersionId: number | null;
  latestVersionNo: string | null;
}

/** GET /projects/{projectId}/work-packages/{workPackageId}/acceptance-readiness */
export interface AcceptanceReadinessRes {
  projectId: number;
  workPackageId: number;
  workPackageName: string;
  ready: boolean;
  totalTasks: number;
  doneTasks: number;
  unfinishedTasks: UnfinishedTaskRes[];
  deliverables: DeliverablePreviewRes[];
  /** Phiếu đang chặn nhánh cây hạng mục (của chính hạng mục, hạng mục cha hoặc con). */
  activeCertificateId: number | null;
  activeCertificateCode: string | null;
  activeCertificateStatus: AcceptanceStatus | null;
}

/** POST /projects/{projectId}/acceptances */
export interface AcceptanceCreateReq {
  workPackageId: number;
  title?: string | null;
  acceptedValue: number;
  note?: string | null;
}

/** POST /acceptances/{certificateId}/confirm — QLDA ghi nhận khách hàng đã ký xác nhận (NCL-12-CN-002 TC-01). */
export interface AcceptanceConfirmReq {
  signerName: string;
  signedDate: string; // YYYY-MM-DD
  minutesUrl: string;
}

/** POST /acceptances/{certificateId}/reject — QLDA ghi nhận khách hàng từ chối kèm lý do (TC-02). */
export interface AcceptanceRejectReq {
  reason: string;
  signerName?: string | null;
  minutesUrl?: string | null;
}

/** PUT /acceptances/{certificateId} — chỉnh sửa và nộp lại phiếu sau khi bị từ chối. */
export interface AcceptanceUpdateReq {
  title?: string | null;
  acceptedValue: number;
  note?: string | null;
}

/** Dòng tóm tắt phiếu — GET /projects/{projectId}/acceptances, GET /acceptances. */
export interface AcceptanceCertificateRes {
  id: number;
  certificateCode: string;
  projectId: number;
  projectCode: string;
  projectName: string;
  contractId: number | null;
  workPackageId: number;
  workPackageName: string;
  title: string;
  acceptedValue: number;
  status: AcceptanceStatus;
  revisionNo: number;
  contractMilestoneId: number | null;
  contractMilestoneName: string | null;
  createdBy: string | null;
  createdAt: string;
  confirmedAt: string | null;
}

export interface AcceptanceTaskItemRes {
  taskId: number;
  taskName: string;
}

export interface AcceptanceDeliverableItemRes {
  deliverableId: number;
  deliverableVersionId: number;
  deliverableName: string;
  versionNo: string;
}

export interface LinkedMilestoneRes {
  id: number;
  name: string;
  amount: number;
  expectedDate: string | null;
  status: string;
}

export interface AcceptanceDecisionRes {
  id: number;
  decision: AcceptanceDecisionType;
  channel: ConfirmationChannel;
  revisionNo: number;
  signerName: string | null;
  signedDate: string | null;
  minutesUrl: string | null;
  reason: string | null;
  recordedBy: string | null;
  recordedAt: string;
}

/** Chi tiết phiếu — POST tạo phiếu và GET /acceptances/{certificateId}. */
export interface AcceptanceDetailRes {
  id: number;
  certificateCode: string;
  projectId: number;
  projectCode: string;
  projectName: string;
  contractId: number | null;
  workPackageId: number;
  workPackageName: string;
  title: string;
  acceptedValue: number;
  note: string | null;
  status: AcceptanceStatus;
  revisionNo: number;
  lastRejectionReason: string | null;
  signerName: string | null;
  signedDate: string | null;
  minutesUrl: string | null;
  confirmationChannel: ConfirmationChannel | null;
  confirmedBy: string | null;
  confirmedAt: string | null;
  paymentMilestone: LinkedMilestoneRes | null;
  linkedBy: string | null;
  linkedAt: string | null;
  tasks: AcceptanceTaskItemRes[];
  deliverables: AcceptanceDeliverableItemRes[];
  decisions: AcceptanceDecisionRes[];
  createdBy: string | null;
  createdAt: string;
  updatedAt: string | null;
}

export const ACCEPTANCE_STATUS_META: Record<AcceptanceStatus, { label: string; badge: string }> = {
  PENDING_CONFIRMATION: { label: 'Chờ khách hàng xác nhận', badge: 'badge--gold' },
  NEEDS_REVISION: { label: 'Cần chỉnh sửa', badge: 'badge--red' },
  ACCEPTED: { label: 'Đã nghiệm thu', badge: 'badge--green' },
};

export const TASK_STATUS_META: Record<TaskStatus, { label: string; badge: string }> = {
  TODO: { label: 'Chưa bắt đầu', badge: 'badge--gray' },
  IN_PROGRESS: { label: 'Đang làm', badge: 'badge--blue' },
  WAITING_APPROVAL: { label: 'Chờ duyệt', badge: 'badge--gold' },
  DONE: { label: 'Hoàn thành', badge: 'badge--green' },
};

/** Trạng thái mốc thanh toán hợp đồng đã gắn với phiếu (QTN-25: phiếu ACCEPTED thì mốc được mở). */
export const MILESTONE_STATUS_META: Record<string, { label: string; badge: string }> = {
  PENDING: { label: 'Chờ nghiệm thu', badge: 'badge--gray' },
  READY_TO_INVOICE: { label: 'Sẵn sàng xuất hóa đơn', badge: 'badge--green' },
  INVOICED: { label: 'Đã xuất hóa đơn', badge: 'badge--blue' },
};

export const CHANNEL_LABEL: Record<ConfirmationChannel, string> = {
  INTERNAL: 'QLDA ghi nhận',
  PORTAL: 'Cổng khách hàng',
};

export const DECISION_META: Record<AcceptanceDecisionType, { label: string; badge: string }> = {
  ACCEPTED: { label: 'Khách hàng xác nhận', badge: 'badge--green' },
  REJECTED: { label: 'Khách hàng từ chối', badge: 'badge--red' },
};
