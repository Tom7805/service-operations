/** Khớp InvoiceStatus (backend enum, Epic NCL-10). */
export type InvoiceStatus = 'DRAFT' | 'ISSUED' | 'PARTIALLY_PAID' | 'PAID' | 'CANCELLED';

/** GET /receivables/overdue — nhóm tuổi nợ (NCL-10-CN-004). */
export type AgingBucket = 'DAYS_1_30' | 'DAYS_31_60' | 'DAYS_61_90' | 'OVER_90';

/** Một hóa đơn quá hạn trong một nhóm tuổi nợ. */
export interface ReceivableAgingItemRes {
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
  dueDate: string;
  daysOverdue: number;
}

/** Backend luôn trả đủ 4 nhóm kể cả rỗng — UI không cần tự suy ra nhóm nào thiếu. */
export interface ReceivableAgingBucketRes {
  bucket: AgingBucket;
  label: string;
  fromDays: number;
  toDays?: number | null;
  invoiceCount: number;
  remainingAmount: number;
  invoices: ReceivableAgingItemRes[];
}

/** GET /receivables/overdue — công nợ quá hạn tại `asOfDate`, phân nhóm theo số ngày quá hạn. */
export interface ReceivableAgingRes {
  asOfDate: string;
  totalInvoiceCount: number;
  totalRemainingAmount: number;
  buckets: ReceivableAgingBucketRes[];
}
