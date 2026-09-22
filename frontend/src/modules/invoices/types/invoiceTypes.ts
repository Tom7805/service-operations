/** Khớp InvoiceStatus (backend enum, Epic NCL-10). Hóa đơn lập theo mốc hợp đồng
 *  (NCL-10-CN-002) luôn ở trạng thái ISSUED ngay khi tạo. */
export type InvoiceStatus = 'DRAFT' | 'ISSUED' | 'PARTIALLY_PAID' | 'PAID' | 'CANCELLED';

/** Yêu cầu lập hóa đơn cho một mốc thanh toán — cả hai trường đều tùy chọn
 *  (POST /contracts/{contractId}/milestones/{milestoneId}/invoice, NCL-10-CN-002). */
export interface InvoiceFromMilestoneReq {
  invoiceDate?: string | null; // YYYY-MM-DD, mặc định hôm nay nếu bỏ trống
  note?: string | null;
}

/** Khớp InvoiceRes (backend) — hóa đơn vừa lập từ một mốc thanh toán.
 *  `invoicedTotal` là tổng đã xuất hóa đơn của hợp đồng SAU khi tính hóa đơn này;
 *  `contractValue - invoicedTotal` là phần còn có thể lập (QTN-19). */
export interface InvoiceRes {
  id: number;
  invoiceCode: string;
  contractId: number;
  milestoneId: number;
  milestoneName: string;
  status: InvoiceStatus;
  totalAmount: number;
  invoiceDate: string;
  note?: string | null;
  contractValue: number;
  invoicedTotal: number;
  createdBy?: string | null;
  createdAt: string;
}
