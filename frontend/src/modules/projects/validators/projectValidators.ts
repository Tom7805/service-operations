import type { ProjectCreateFromContractReq } from '../types/projectTypes';

export interface ProjectCreateValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

/**
 * Kiểm tra hợp lệ dữ liệu tạo dự án từ hợp đồng (NCL-05-CN-001-TC-03).
 */
export function validateProjectCreateForm(
  payload: Partial<ProjectCreateFromContractReq>
): ProjectCreateValidationResult {
  const errors: Record<string, string> = {};

  const name = payload.name?.trim() ?? '';
  if (!name) {
    errors.name = 'Tên dự án không được để trống';
  } else if (name.length > 255) {
    errors.name = 'Tên dự án không được vượt quá 255 ký tự';
  }

  const startDate = payload.startDate?.trim() ?? '';
  if (!startDate) {
    errors.startDate = 'Ngày bắt đầu không được để trống';
  }

  const expectedEndDate = payload.expectedEndDate?.trim() ?? '';
  if (!expectedEndDate) {
    errors.expectedEndDate = 'Ngày kết thúc dự kiến không được để trống';
  }

  if (startDate && expectedEndDate && expectedEndDate < startDate) {
    errors.expectedEndDate = 'Ngày kết thúc dự kiến không được sớm hơn ngày bắt đầu';
  }

  const pmId = payload.projectManagerId;
  if (pmId == null || Number.isNaN(pmId) || pmId <= 0) {
    errors.projectManagerId = 'Người quản lý dự án không được để trống';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

export interface WorkPackageValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

/**
 * Kiểm tra hợp lệ biểu mẫu tạo hạng mục công việc (NCL-05-CN-002).
 */
export function validateWorkPackageForm(
  payload: { name?: string; description?: string | null; sortOrder?: number | null }
): WorkPackageValidationResult {
  const errors: Record<string, string> = {};

  const name = payload.name?.trim() ?? '';
  if (!name) {
    errors.name = 'Tên hạng mục không được để trống';
  } else if (name.length > 255) {
    errors.name = 'Tên hạng mục không được vượt quá 255 ký tự';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

export interface TaskCreateValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

/**
 * Kiểm tra hợp lệ biểu mẫu tạo công việc (NCL-05-CN-002).
 */
export function validateTaskCreateForm(
  payload: { name?: string; expectedStartDate?: string | null; expectedEndDate?: string | null }
): TaskCreateValidationResult {
  const errors: Record<string, string> = {};

  const name = payload.name?.trim() ?? '';
  if (!name) {
    errors.name = 'Tên công việc không được để trống';
  } else if (name.length > 255) {
    errors.name = 'Tên công việc không được vượt quá 255 ký tự';
  }

  const startDate = payload.expectedStartDate?.trim() ?? '';
  const endDate = payload.expectedEndDate?.trim() ?? '';

  if (startDate && endDate && endDate < startDate) {
    errors.expectedEndDate = 'Ngày kết thúc dự kiến không được sớm hơn ngày bắt đầu';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}
