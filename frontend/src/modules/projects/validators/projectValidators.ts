import type {
  ProjectCreateFromContractReq,
  ProjectCreateFromTemplateReq,
  ProjectMilestoneReq,
  ProjectRiskReq,
} from '../types/projectTypes';

export interface ProjectCreateValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

export interface ProjectCreateFromTemplateValidationResult {
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

/**
 * Kiểm tra hợp lệ dữ liệu tạo dự án từ mẫu (NCL-05-CN-007).
 */
export function validateProjectCreateFromTemplateForm(
  payload: Partial<ProjectCreateFromTemplateReq>
): ProjectCreateFromTemplateValidationResult {
  const errors: Record<string, string> = {};

  const templateId = payload.templateId;
  if (templateId == null || Number.isNaN(templateId) || templateId <= 0) {
    errors.templateId = 'Vui lòng chọn mẫu dự án';
  }

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

export interface MilestoneValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

/**
 * Kiểm tra hợp lệ biểu mẫu tạo/cập nhật mốc tiến độ (NCL-05-CN-008 / TC-01).
 * Khớp ràng buộc backend: tên và ngày kế hoạch không được để trống, phải chọn
 * ít nhất một hạng mục phải hoàn thành.
 */
export function validateMilestoneForm(payload: Partial<ProjectMilestoneReq>): MilestoneValidationResult {
  const errors: Record<string, string> = {};

  const name = payload.name?.trim() ?? '';
  if (!name) {
    errors.name = 'Tên mốc tiến độ không được để trống';
  } else if (name.length > 255) {
    errors.name = 'Tên mốc tiến độ không được vượt quá 255 ký tự';
  }

  const plannedDate = payload.plannedDate?.trim() ?? '';
  if (!plannedDate) {
    errors.plannedDate = 'Ngày kế hoạch không được để trống';
  }

  if (!payload.taskIds || payload.taskIds.length === 0) {
    errors.taskIds = 'Phải chọn ít nhất một hạng mục phải hoàn thành';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

export interface MilestoneCompleteValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

/**
 * Kiểm tra hợp lệ ngày thực tế hoàn thành mốc (NCL-05-CN-008): bắt buộc và
 * không được ở tương lai (khớp quy tắc backend `INVALID_STATE`).
 */
export function validateMilestoneCompleteForm(
  payload: { actualDate?: string | null },
  today: string = new Date().toISOString().slice(0, 10)
): MilestoneCompleteValidationResult {
  const errors: Record<string, string> = {};

  const actualDate = payload.actualDate?.trim() ?? '';
  if (!actualDate) {
    errors.actualDate = 'Ngày thực tế không được để trống';
  } else if (actualDate > today) {
    errors.actualDate = 'Ngày thực tế không được ở tương lai';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

export interface RiskValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

/**
 * Kiểm tra hợp lệ biểu mẫu ghi nhận/cập nhật rủi ro (NCL-05-CN-009 / TC-01).
 * Khớp ràng buộc backend: mô tả, mức tác động, khả năng xảy ra và người theo dõi
 * không được để trống — biện pháp giảm thiểu là tùy chọn.
 */
export function validateRiskForm(payload: Partial<ProjectRiskReq>): RiskValidationResult {
  const errors: Record<string, string> = {};

  const description = payload.description?.trim() ?? '';
  if (!description) {
    errors.description = 'Mô tả rủi ro không được để trống';
  }

  if (!payload.impact) {
    errors.impact = 'Mức tác động không được để trống';
  }

  if (!payload.likelihood) {
    errors.likelihood = 'Khả năng xảy ra không được để trống';
  }

  const watcherId = payload.watcherId;
  if (watcherId == null || Number.isNaN(watcherId) || watcherId <= 0) {
    errors.watcherId = 'Người theo dõi không được để trống';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}
