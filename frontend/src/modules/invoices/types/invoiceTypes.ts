/** GET/POST/PUT /contracts/{contractId}/recurring-invoice-schedule — điều khoản lập hóa
 *  đơn định kỳ cho hợp đồng duy trì (NCL-10-CN-005). */
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
