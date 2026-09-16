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
