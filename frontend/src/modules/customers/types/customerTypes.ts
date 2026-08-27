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

