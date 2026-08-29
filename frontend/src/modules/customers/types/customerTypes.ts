/**
 * Định nghĩa các kiểu dữ liệu cho mô-đun Khách hàng (Customer Profile Module)
 * Tuân thủ Backend API Contract NCL-02-CN-001 & NCL-02-CN-002
 */

export interface Customer {
  id: number;
  code: string; // Tự sinh duy nhất dạng KH-xxxxxx
  name: string;
  taxCode?: string | null;
  phone?: string | null;
  industry?: string | null;
  address?: string | null;
  createdAt?: string;
  updatedAt?: string;
  // NCL-02-CN-005: nhãn phân nhóm khách hàng — quy mô công ty và mức độ ưu tiên chăm sóc.
  companySize?: string | null;
  priority?: string | null;
  // NCL-02-CN-006: trạng thái hồ sơ — 'MERGED' khi hồ sơ đã bị gộp vào hồ sơ khác (mergedIntoId).
  status?: 'ACTIVE' | 'INACTIVE' | 'MERGED' | string | null;
  mergedIntoId?: number | null;
}

export interface CustomerCreatePayload {
  name: string;
  taxCode?: string;
  phone?: string;
  industry?: string;
  address?: string;
}

export interface CustomerCreateResponse {
  success: boolean;
  message: string;
  data: Customer;
}

export interface CustomerFormErrors {
  name?: string;
  taxCode?: string;
  phone?: string;
  industry?: string;
  address?: string;
  general?: string;
}

/**
 * Hồ sơ khách hàng nghi trùng trả về từ POST /customers/check-duplicate (NCL-02-CN-002)
 */
export interface DuplicateCandidate {
  id: number;
  code: string;
  name: string;
  taxCode?: string | null;
  phone?: string | null;
  similarity: number; // 0.0 -> 1.0 (1.0 là trùng tuyệt đối, >= 0.90 bị chặn tự động)
  matchedFields: string[]; // 'ten' | 'maSoThue' | 'soDienThoai'
}

/**
 * Yêu cầu xác nhận tạo mới bỏ qua cảnh báo trùng (NCL-02-CN-002, TC-02)
 */
export interface DuplicateOverridePayload {
  reason: string; // Lý do bắt buộc, tối đa 1000 ký tự
}

export interface CustomerCreateWithOverridePayload {
  customer: CustomerCreatePayload;
  override: DuplicateOverridePayload;
}

export type CustomerSortField = 'code' | 'name' | 'taxCode' | 'phone' | 'industry' | 'createdAt';
export type SortOrder = 'asc' | 'desc';

/**
 * Định nghĩa kiểu dữ liệu người liên hệ khách hàng (NCL-02-CN-003)
 */
export interface CustomerContact {
  id: number;
  customerId: number;
  fullName: string;
  title?: string | null;
  email?: string | null;
  phone?: string | null;
  isPrimary: boolean;
  createdAt?: string;
}

export interface CustomerContactPayload {
  fullName: string;
  title?: string;
  email?: string;
  phone?: string;
  isPrimary?: boolean;
}

export interface CustomerContactFormErrors {
  fullName?: string;
  title?: string;
  email?: string;
  phone?: string;
  general?: string;
}

export interface ContactAuditItem {
  id: string;
  action: string;
  actor: string;
  timestamp: string;
  detail: string;
}

/**
 * NCL-02-CN-004 — Xem hồ sơ tổng hợp của khách hàng.
 * Một dòng trong bức tranh toàn cảnh (cơ hội / hợp đồng / dự án / hóa đơn / công nợ).
 * Khớp `CustomerOverviewItemRes` phía Backend.
 */
export interface CustomerOverviewItem {
  id: number;
  code: string | null;
  name: string | null;
  status: string | null;
  amount: number | null;
  date: string | null; // ISO date (yyyy-MM-dd)
}

/**
 * NCL-02-CN-004 — Toàn bộ dữ liệu liên quan tới một khách hàng, đã được Backend
 * sắp theo thứ tự thời gian (TC-01). Khớp `CustomerOverviewRes`.
 * GET /customers/{id}/overview — chỉ vai trò VT-04 hoặc VT-02, mỗi lần gọi Backend ghi Audit Log (TC-03).
 */
export interface CustomerOverview {
  customer: Customer;
  opportunities: CustomerOverviewItem[];
  contracts: CustomerOverviewItem[];
  projects: CustomerOverviewItem[];
  invoices: CustomerOverviewItem[];
  receivables: CustomerOverviewItem[];
}

export type CustomerOverviewSectionKey =
  | 'opportunities'
  | 'contracts'
  | 'projects'
  | 'invoices'
  | 'receivables';

/**
 * NCL-02-CN-005 — Phân nhóm khách hàng theo ngành và quy mô.
 * Payload gửi PATCH /customers/{id}/segment (khớp `CustomerSegmentReq` phía Backend).
 * Bắt buộc vai trò VT-04 hoặc VT-02; Backend ghi Audit Log hành động `SEGMENT_UPDATE` (TC-04).
 */
export interface CustomerSegmentPayload {
  industry: string;
  companySize: string;
  priority: string;
}

export interface CustomerSegmentFormErrors {
  industry?: string;
  companySize?: string;
  priority?: string;
  general?: string;
}

/** Quy mô công ty gợi ý để phân nhóm — vẫn nhận giá trị khác nếu khách hàng đã có sẵn. */
export const COMPANY_SIZE_OPTIONS = ['Nhỏ', 'Vừa', 'Lớn'] as const;

/** Mức độ ưu tiên chăm sóc gợi ý để phân nhóm khách hàng. */
export const CUSTOMER_PRIORITY_OPTIONS = ['Thấp', 'Trung bình', 'Cao'] as const;

/**
 * NCL-02-CN-006 — Gộp hai hồ sơ khách hàng trùng.
 * Payload gửi POST /customers/merge/preview và POST /customers/merge (khớp `CustomerMergeReq`).
 * Bắt buộc vai trò VT-07 (Quản trị viên); Backend ghi Audit Log hành động `MERGE` (TC-04).
 */
export interface CustomerMergePayload {
  /** Hồ sơ "giữ lại" — nhận toàn bộ dữ liệu liên quan. */
  targetCustomerId: number;
  /** Hồ sơ "bị gộp" — chuyển sang trạng thái đã gộp sau khi gộp thật. */
  sourceCustomerId: number;
}

/**
 * Xem trước ảnh hưởng trước khi gộp thật (TC-01) — khớp `MergePreviewRes` phía Backend.
 */
export interface CustomerMergePreview {
  targetCustomer: Customer;
  sourceCustomer: Customer;
  relatedRecordCount: number;
}

export interface CustomerMergeFormErrors {
  targetCustomerId?: string;
  sourceCustomerId?: string;
  general?: string;
}

