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
