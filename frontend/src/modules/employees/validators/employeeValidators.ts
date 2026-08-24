import type { EmployeeCreatePayload, EmployeeUpdatePayload, EmploymentContractCreatePayload } from '../types/employeeTypes';

export interface FormErrors {
  userId?: string;
  professionalRole?: string;
  hireDate?: string;
  endDate?: string;
  standardHoursPerWeek?: string;
}

export interface ContractFormErrors {
  contractType?: string;
  startDate?: string;
  endDate?: string;
}

function validateCommonFields(
  payload: Partial<EmployeeCreatePayload | EmployeeUpdatePayload>,
  errors: FormErrors
): void {
  if (payload.professionalRole && payload.professionalRole.trim().length > 255) {
    errors.professionalRole = 'Vai trò chuyên môn không vượt quá 255 ký tự';
  }

  if (!payload.hireDate) {
    errors.hireDate = 'Ngày vào làm không được để trống';
  }

  // NCL-01-CN-007-TC-03: ngày kết thúc không được sớm hơn ngày vào làm.
  if (payload.hireDate && payload.endDate && payload.endDate < payload.hireDate) {
    errors.endDate = 'Ngày kết thúc không được sớm hơn ngày vào làm';
  }

  // NCL-01-CN-007-TC-01/TC-02: nếu nhập, giờ làm việc chuẩn phải > 0 (để trống sẽ mặc định 40).
  if (
    payload.standardHoursPerWeek != null &&
    (Number.isNaN(payload.standardHoursPerWeek) || payload.standardHoursPerWeek <= 0)
  ) {
    errors.standardHoursPerWeek = 'Giờ làm việc chuẩn phải lớn hơn 0';
  }
}

export function validateCreateEmployee(payload: Partial<EmployeeCreatePayload>): FormErrors {
  const errors: FormErrors = {};

  if (!payload.userId) {
    errors.userId = 'Phải chọn tài khoản nhân viên';
  }

  validateCommonFields(payload, errors);

  return errors;
}

export function validateUpdateEmployee(payload: Partial<EmployeeUpdatePayload>): FormErrors {
  const errors: FormErrors = {};

  validateCommonFields(payload, errors);

  return errors;
}

export function validateContractForm(payload: Partial<EmploymentContractCreatePayload>): ContractFormErrors {
  const errors: ContractFormErrors = {};

  if (!payload.contractType) {
    errors.contractType = 'Phải chọn loại hợp đồng lao động';
  }

  if (!payload.startDate) {
    errors.startDate = 'Ngày bắt đầu hợp đồng không được để trống';
  }

  // NCL-01-CN-007-TC-03: ngày kết thúc hợp đồng không được sớm hơn ngày bắt đầu.
  if (payload.startDate && payload.endDate && payload.endDate < payload.startDate) {
    errors.endDate = 'Ngày kết thúc không được sớm hơn ngày bắt đầu';
  }

  return errors;
}
