/**
 * NCL-07-CN-001 — Khai báo bảng đơn giá theo vai trò.
 * Khớp `BillRateRes`/`BillRateCreateReq` phía backend (module `rate`).
 */

/** Một dòng đơn giá: (vai trò chuyên môn, cấp bậc) -> đơn giá theo NGÀY công. */
export interface BillRateRes {
  professionalRole: string;
  level: string;
  dailyRate: number;
  /** `yyyy-MM-dd` */
  effectiveFrom: string;
}

export interface BillRateCreatePayload {
  professionalRole: string;
  level: string;
  dailyRate: number;
  /** `yyyy-MM-dd` */
  effectiveFrom: string;
}

/**
 * NCL-07-CN-002 — Đặt hiệu lực theo thời điểm cho đơn giá.
 * Tham số truy vấn `GET /bill-rates/resolve`: trả về dòng đơn giá có hiệu lực
 * tại một ngày phát sinh cụ thể (`asOf`), dùng khi tính lại doanh thu cho giờ
 * công đã ghi nhận trong quá khứ — không bị ảnh hưởng bởi lần tăng giá sau đó.
 */
export interface ResolveBillRateQuery {
  professionalRole: string;
  level: string;
  /** `yyyy-MM-dd` — ngày phát sinh cần tra giá */
  asOf: string;
}

/**
 * NCL-07-CN-003 — Khai báo đơn giá riêng theo hợp đồng.
 * Khớp `ContractBillRateRes`/`ContractBillRateCreateReq` phía backend — mức giá
 * đàm phán riêng cho một hợp đồng cụ thể (`contract_bill_rates`), ưu tiên hơn
 * bảng đơn giá chung công ty khi tính doanh thu (QTN-16).
 */
export interface ContractBillRateRes {
  contractId: number;
  professionalRole: string;
  level: string;
  dailyRate: number;
  /** `yyyy-MM-dd` */
  effectiveFrom: string;
}

export interface ContractBillRateCreatePayload {
  professionalRole: string;
  level: string;
  dailyRate: number;
  /** `yyyy-MM-dd` */
  effectiveFrom: string;
}

export interface ResolveContractBillRateQuery {
  professionalRole: string;
  level: string;
  /** `yyyy-MM-dd` — ngày phát sinh cần tính doanh thu */
  asOf: string;
}

/**
 * Kết quả tra cứu `GET /contracts/{contractId}/bill-rates/resolve` — đã áp
 * dụng quy tắc ưu tiên QTN-16 (đơn giá riêng hợp đồng, nếu không có thì rơi
 * về đơn giá chung công ty). `isContractSpecific` phân biệt hai trường hợp đó
 * (TC-01/TC-02).
 */
export interface ResolvedContractBillRateRes {
  dailyRate: number;
  /** `yyyy-MM-dd` — ngày hiệu lực của mốc đơn giá được áp dụng */
  effectiveFrom: string;
  isContractSpecific: boolean;
}

/** NCL-07-CN-006: loại hình công việc của một dòng giờ công. */
export type WorkType = 'NORMAL' | 'OVERTIME' | 'WEEKEND' | 'HOLIDAY';

export const WORK_TYPE_LABELS: Record<WorkType, string> = {
  NORMAL: 'Giờ hành chính',
  OVERTIME: 'Ngoài giờ hành chính',
  WEEKEND: 'Cuối tuần',
  HOLIDAY: 'Lễ / Tết',
};

/**
 * NCL-07-CN-005 — Tra cứu đơn giá áp dụng cho một dòng giờ công
 * (`GET /timesheet-entries/{entryId}/bill-rate/resolve`). Endpoint tổng hợp:
 * backend tự suy ra `professionalRole` (hồ sơ nhân sự), `contractId` (dòng →
 * công việc → dự án → hợp đồng) và `asOf` (chính là `workDate`), rồi áp đúng
 * quy tắc ưu tiên QTN-16 và nhân hệ số theo `workType` (NCL-07-CN-006) để ra
 * `appliedDailyRate` — mức đơn giá CUỐI CÙNG dùng để tính doanh thu, khác với
 * `dailyRate` (đơn giá trước khi nhân hệ số).
 */
export interface ResolvedTimeEntryRateRes {
  timeEntryId: number;
  taskId: number;
  projectId: number;
  contractId: number;
  professionalRole: string;
  level: string;
  /** `yyyy-MM-dd` — ngày công của dòng giờ công, cũng là mốc `asOf` dùng tra giá */
  workDate: string;
  hours: number;
  workType: WorkType;
  /** Đơn giá theo vai trò/cấp bậc TRƯỚC khi nhân hệ số loại hình công việc */
  dailyRate: number;
  /** `yyyy-MM-dd` — ngày hiệu lực của mốc đơn giá được áp dụng (có thể khác `workDate`) */
  effectiveFrom: string;
  isContractSpecific: boolean;
  rateFactor: number;
  /** Đơn giá CUỐI CÙNG = `dailyRate * rateFactor` — dùng số này để tính doanh thu */
  appliedDailyRate: number;
}

/**
 * NCL-07-CN-006 — Đơn giá theo loại hình công việc. Hệ số nhân áp lên đơn giá
 * theo vai trò/cấp bậc để ra đơn giá cuối cùng cho một dòng giờ công
 * (`NCL-07-CN-005`). `POST /work-type-rates` luôn GHI ĐÈ hệ số cũ (không giữ
 * lịch sử theo ngày hiệu lực như `BillRate`, vì đây là hệ số nghiệp vụ ít
 * thay đổi chứ không phải mức giá đàm phán).
 */
export interface WorkTypeRateFactorRes {
  workType: WorkType;
  factor: number;
}

export interface WorkTypeRateFactorPayload {
  workType: WorkType;
  factor: number;
}
