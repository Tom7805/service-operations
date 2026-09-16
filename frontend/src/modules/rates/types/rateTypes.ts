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
