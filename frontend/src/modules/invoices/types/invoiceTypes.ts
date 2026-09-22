/** Khớp InvoiceStatus (backend enum) — NCL-10-CN-001..006. */
export type InvoiceStatus = 'DRAFT' | 'ISSUED' | 'PARTIALLY_PAID' | 'PAID' | 'CANCELLED';

/** GET /invoices, GET /invoices/{id} — InvoiceDetailRes (backend). */
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
  dueDate: string;
  note?: string | null;
  createdBy?: string | null;
  createdAt?: string;
}

/**
 * POST /contracts/{contractId}/milestones/{milestoneId}/invoice — body (NCL-10-CN-002).
 * Cả ba trường đều tuỳ chọn: invoiceDate mặc định hôm nay, dueDate mặc định
 * invoiceDate + 30 ngày, note để trống được.
 */
export interface InvoiceFromMilestoneReq {
  invoiceDate?: string | null;
  note?: string | null;
  dueDate?: string | null;
}

/** Response của POST .../invoice — InvoiceRes (backend). */
export interface InvoiceRes {
  id: number;
  invoiceCode: string;
  contractId: number;
  milestoneId: number;
  milestoneName?: string | null;
  status: InvoiceStatus;
  totalAmount: number;
  invoiceDate: string;
  dueDate: string;
  note?: string | null;
  contractValue: number;
  invoicedTotal: number;
  createdBy?: string | null;
  createdAt?: string;
}

/** POST /projects/{projectId}/invoice-proposals — body (NCL-10-CN-001). */
export interface InvoiceProposalCreateReq {
  periodFrom: string;
  periodTo: string;
  note?: string | null;
}

export type ProposalStatus = 'PENDING' | 'INVOICED' | 'CANCELLED';
export type ProposalLineType = 'LABOR' | 'EXPENSE';

export interface InvoiceProposalLineRes {
  id: number;
  lineType: ProposalLineType;
  timeEntryId?: number | null;
  projectExpenseId?: number | null;
  lineDate: string;
  userId?: number | null;
  hours?: number | null;
  unitRate?: number | null;
  description?: string | null;
  amount: number;
}

export interface InvoiceProposalSkippedRes {
  notApprovedCount: number;
  nonBillableCount: number;
  alreadyProposedCount: number;
  missingRateCount: number;
}

export interface InvoiceProposalRes {
  id: number;
  proposalCode: string;
  projectId: number;
  contractId: number;
  customerId: number;
  periodFrom: string;
  periodTo: string;
  status: ProposalStatus;
  laborAmount: number;
  expenseAmount: number;
  totalAmount: number;
  note?: string | null;
  laborLines: InvoiceProposalLineRes[];
  expenseLines: InvoiceProposalLineRes[];
  skipped: InvoiceProposalSkippedRes;
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

/** GET /invoices/{invoiceId}/payments — lịch sử thanh toán (chỉ đọc). */
export interface PaymentItemRes {
  id: number;
  amount: number;
  paymentDate: string;
  method: PaymentMethod;
  note?: string | null;
  createdBy?: string | null;
  createdAt?: string;
}

/** GET/POST/PUT /contracts/{contractId}/recurring-invoice-schedule — NCL-10-CN-005. */
export interface RecurringScheduleReq {
  billingDayOfMonth: number;
  amount: number;
  notes?: string | null;
  active?: boolean;
}

export interface RecurringScheduleRes {
  id: number;
  contractId: number;
  billingDayOfMonth: number;
  amount: number;
  active: boolean;
  lastGeneratedPeriod?: string | null;
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface RecurringInvoiceRunReq {
  asOf?: string | null;
}

export interface RecurringInvoiceRes {
  id: number;
  invoiceCode: string;
  contractId: number;
  customerId: number;
  periodStart: string;
  periodEnd: string;
  invoiceDate: string;
  amount: number;
  status: InvoiceStatus;
}

export interface RecurringInvoiceSkipRes {
  contractId: number;
  reason: string;
}

export interface RecurringInvoiceRunRes {
  asOf: string;
  created: RecurringInvoiceRes[];
  skipped: RecurringInvoiceSkipRes[];
}

/** POST /dunning/run, GET /invoices/{invoiceId}/dunning-logs — NCL-10-CN-006. */
export type DunningStage = 'UPCOMING_3_DAYS' | 'DUE_TODAY' | 'OVERDUE';

export interface DunningLogRes {
  id: number;
  invoiceId: number;
  stage: DunningStage;
  referenceDate: string;
  daysOverdue: number;
  remainingAmount: number;
  recipientIds: number[];
  sentAt: string;
}

export interface DunningRunReq {
  asOf?: string | null;
}

export interface DunningRunRes {
  asOf: string;
  sent: DunningLogRes[];
  skippedAlreadySentCount: number;
}

/** GET /receivables/overdue — NCL-10-CN-004. */
export type AgingBucket = 'DAYS_1_30' | 'DAYS_31_60' | 'DAYS_61_90' | 'OVER_90';

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

export interface ReceivableAgingBucketRes {
  bucket: AgingBucket;
  label: string;
  fromDays: number;
  toDays?: number | null;
  invoiceCount: number;
  remainingAmount: number;
  invoices: ReceivableAgingItemRes[];
}

export interface ReceivableAgingRes {
  asOfDate: string;
  totalInvoiceCount: number;
  totalRemainingAmount: number;
  buckets: ReceivableAgingBucketRes[];
}
