/** Khớp ràng buộc của `BillRateCreateReq` phía backend (NCL-07-CN-001, TC-02). */
export interface BillRateFormValues {
  professionalRole: string;
  level: string;
  dailyRate: number | null;
  /** `yyyy-MM-dd`, có thể rỗng khi chưa nhập */
  effectiveFrom: string;
}

export type BillRateFormErrors = Partial<Record<keyof BillRateFormValues, string>>;

export function validateBillRateForm(values: BillRateFormValues): BillRateFormErrors {
  const errors: BillRateFormErrors = {};

  if (!values.professionalRole.trim()) {
    errors.professionalRole = 'Vai trò chuyên môn không được để trống';
  }

  if (!values.level.trim()) {
    errors.level = 'Cấp bậc không được để trống';
  }

  if (values.dailyRate == null || Number.isNaN(values.dailyRate)) {
    errors.dailyRate = 'Đơn giá theo ngày công không được để trống';
  } else if (values.dailyRate < 0) {
    errors.dailyRate = 'Đơn giá theo ngày công không được âm';
  }

  if (!values.effectiveFrom) {
    errors.effectiveFrom = 'Ngày hiệu lực không được để trống';
  }

  return errors;
}
