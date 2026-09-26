/**
 * Kiểu dữ liệu Epic NCL-15 — Quản trị hệ thống và danh mục.
 * Backend lược trường `null` khỏi JSON (Jackson `non_null`) nên các trường tùy chọn có thể vắng mặt.
 */

/** Một mốc giá của dịch vụ (QTN-28) — mốc cũ luôn được giữ, đổi giá là thêm mốc mới. */
export interface ServicePriceRes {
  id: number;
  price: number;
  /** yyyy-MM-dd */
  effectiveFrom: string;
  /** Ngày cuối mốc này còn hiệu lực (trước mốc kế tiếp); vắng mặt = chưa có mốc sau. */
  effectiveTo?: string | null;
  /** Mốc đang áp dụng tại ngày tra cứu `asOf`. */
  current: boolean;
  note?: string | null;
  createdBy?: string | null;
  createdAt?: string | null;
}

/** Dịch vụ trong danh mục kèm giá đang hiệu lực tại `asOf` (NCL-15-CN-001). */
export interface ServiceCatalogRes {
  id: number;
  /** Mã sinh tự động `DV` + 5 chữ số — không nhập tay. */
  code: string;
  name: string;
  unit: string;
  description?: string | null;
  active: boolean;
  asOf: string;
  /** `false` khi chưa có mốc giá nào hiệu lực tại `asOf` → không chọn được khi lập báo giá / hóa đơn. */
  hasEffectivePrice: boolean;
  currentPrice?: number | null;
  currentPriceEffectiveFrom?: string | null;
  createdBy?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  /** Chỉ có ở API chi tiết và response của các API ghi; danh sách không có trường này. */
  prices?: ServicePriceRes[];
}

/** POST /service-catalog — tạo dịch vụ kèm mốc giá đầu tiên (TC-01). */
export interface ServiceCatalogCreateReq {
  name: string;
  unit: string;
  description?: string | null;
  price: number;
  effectiveFrom: string;
}

/** PUT /service-catalog/{id} — chỉ sửa mô tả, không sửa giá. */
export interface ServiceCatalogUpdateReq {
  name: string;
  unit: string;
  description?: string | null;
}

/** POST /service-catalog/{id}/prices — thêm mốc giá mới. */
export interface ServicePriceReq {
  price: number;
  effectiveFrom: string;
  note?: string | null;
}

export interface ServiceCatalogSearchParams {
  keyword?: string;
  /** `undefined` = tất cả trạng thái. */
  active?: boolean;
  /** Ngày tính giá hiện hành (yyyy-MM-dd), mặc định hôm nay ở backend. */
  asOf?: string;
}

/* ---------- NCL-15-CN-002 — Cấu hình công ty và kỳ tài chính ---------- */

export type CompanyCurrency = 'VND' | 'USD' | 'EUR';

/** Một bộ cấu hình duy nhất cho toàn hệ thống — GET/PUT /company-settings. */
export interface CompanySettingRes {
  /** `false` khi chưa cấu hình lần nào — các trường tùy chọn vắng mặt, còn lại là mặc định. */
  configured: boolean;
  companyName?: string | null;
  taxCode?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  currency: CompanyCurrency;
  /** 1–12 — tháng bắt đầu năm tài chính, quyết định cách chia kỳ báo cáo theo năm/quý (TC-01). */
  fiscalYearStartMonth: number;
  standardWorkingDaysPerMonth: number;
  updatedBy?: string | null;
  updatedAt?: string | null;
}

export interface CompanySettingReq {
  companyName: string;
  taxCode: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  currency: CompanyCurrency;
  fiscalYearStartMonth: number;
  standardWorkingDaysPerMonth: number;
}

export interface FiscalQuarter {
  quarter: number;
  startDate: string;
  endDate: string;
}

export interface FiscalMonth {
  /** Kỳ thứ 1–12 trong năm tài chính. */
  period: number;
  /** yyyy-MM */
  yearMonth: string;
  startDate: string;
  endDate: string;
}

/**
 * Năm tài chính mang số của năm dương lịch chứa ngày bắt đầu — VD bắt đầu tháng 4 thì năm tài chính
 * 2026 = 2026-04-01 … 2027-03-31. GET /fiscal-periods/{fiscalYear} · /fiscal-periods/current?date=
 */
export interface FiscalPeriodRes {
  fiscalYear: number;
  startMonth: number;
  startDate: string;
  endDate: string;
  quarters: FiscalQuarter[];
  months: FiscalMonth[];
}
