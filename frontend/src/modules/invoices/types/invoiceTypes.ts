/** Khớp InvoiceStatus (backend enum, Epic NCL-10). */
export type InvoiceStatus = 'DRAFT' | 'ISSUED' | 'PARTIALLY_PAID' | 'PAID' | 'CANCELLED';

/** GET /invoices, GET /invoices/{id} — InvoiceDetailRes (backend). Dùng chung cho danh
 *  sách và chi tiết, để Kế toán chọn hóa đơn cần ghi nhận thanh toán (NCL-10-CN-003). */
export interface InvoiceDetailRes {
  id: number;
  invoiceCode: string;
  contractId: number;
  contractCode?: string | null;
  customerId: number;
  customerName?: string | null;
  status: InvoiceStatus;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  invoiceDate: string;
  note?: string | null;
  createdBy?: string | null;
  createdAt?: string;
}

/** POST /invoices/{invoiceId}/payments — body (NCL-10-CN-003). */
export type PaymentMethod = 'BANK_TRANSFER' | 'CASH' | 'OTHER';

export interface PaymentCreateReq {
  amount: number;
  paymentDate: string;
  method: PaymentMethod;
  note?: string | null;
}

/** Response của POST .../payments — kèm tình hình công nợ mới của hóa đơn ngay
 *  trong response nên không cần gọi lại getInvoice sau khi lưu. */
export interface PaymentRes {
  id: number;
  invoiceId: number;
  invoiceCode?: string | null;
  amount: number;
  paymentDate: string;
  method: PaymentMethod;
  note?: string | null;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  invoiceStatus: InvoiceStatus;
  createdBy?: string | null;
  createdAt?: string;
}

/** GET /invoices/{invoiceId}/payments — lịch sử thanh toán (chỉ đọc), mới nhất trước. */
export interface PaymentItemRes {
  id: number;
  amount: number;
  paymentDate: string;
  method: PaymentMethod;
  note?: string | null;
  createdBy?: string | null;
  createdAt?: string;
}
