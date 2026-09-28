import type { CompanySettingReq, CompanySettingRes, FiscalPeriodRes } from '../types/adminTypes';
import { API_BASE_URL, requestBackend } from './adminHttp';

export { AdminApiError } from './adminHttp';

/**
 * Cấu hình công ty (NCL-15-CN-002). Chỉ VT-07 — vai trò khác nhận `403` và backend ghi "Từ chối truy
 * cập" vào Nhật ký hệ thống (TC-03), nên màn hình luôn gọi API thật thay vì tự chặn.
 * GET /company-settings
 */
export async function getCompanySettings(): Promise<CompanySettingRes> {
  return requestBackend<CompanySettingRes>(`${API_BASE_URL}/company-settings`, { method: 'GET' });
}

/**
 * Lưu cấu hình công ty. Đổi tháng bắt đầu năm tài chính áp dụng ngay cho lần chia kỳ kế tiếp (TC-01).
 * `400 VALIDATION_ERROR` nếu thiếu tên công ty (TC-02) hoặc sai ràng buộc. Backend ghi nhật ký các
 * trường đã đổi (TC-04).
 * PUT /company-settings
 */
export async function updateCompanySettings(payload: CompanySettingReq): Promise<CompanySettingRes> {
  return requestBackend<CompanySettingRes>(`${API_BASE_URL}/company-settings`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

/** Chia một năm tài chính (2000–2100) thành quý và tháng. VT-07, VT-01, VT-02, VT-05. */
export async function getFiscalPeriod(fiscalYear: number): Promise<FiscalPeriodRes> {
  return requestBackend<FiscalPeriodRes>(`${API_BASE_URL}/fiscal-periods/${fiscalYear}`, { method: 'GET' });
}

/** Năm tài chính chứa `date` (yyyy-MM-dd, mặc định hôm nay ở máy chủ). */
export async function getCurrentFiscalPeriod(date?: string): Promise<FiscalPeriodRes> {
  const qs = date ? `?date=${encodeURIComponent(date)}` : '';
  return requestBackend<FiscalPeriodRes>(`${API_BASE_URL}/fiscal-periods/current${qs}`, { method: 'GET' });
}
