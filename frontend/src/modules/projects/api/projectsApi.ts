import type {
  ProjectCreateFromTemplateReq,
  ProjectRes,
  ProjectTemplateRes,
  WorkBreakdownRes,
} from '../types/projectTypes';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api/v1';

export class ProjectsApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode?: number,
    public readonly fieldErrors?: Array<{ field: string; message: string }>
  ) {
    super(message);
    this.name = 'ProjectsApiError';
  }
}

async function requestBackend<T>(url: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };

  if (token) headers['Authorization'] = `Bearer ${token}`;

  let response: Response;
  try {
    response = await fetch(url, { ...options, headers });
  } catch {
    throw new ProjectsApiError('NETWORK_ERROR', `Không thể kết nối đến máy chủ Backend (${API_BASE_URL}).`, 503);
  }

  const payload = await response.json().catch(() => ({}));

  if (!response.ok || payload.success === false) {
    const code = payload.errorCode || payload.code || (response.status === 403 ? 'FORBIDDEN' : 'UNKNOWN_ERROR');
    let message = payload.message || 'Đã có lỗi xảy ra khi gọi dịch vụ máy chủ Backend.';
    if (response.status === 403) message = 'Bạn không có quyền thực hiện thao tác này (yêu cầu vai trò Quản lý dự án VT-02).';
    throw new ProjectsApiError(code, message, response.status, payload.fieldErrors);
  }

  return payload.data as T;
}

/**
 * Lấy danh sách mẫu dự án đang hoạt động để chọn khi tạo dự án (NCL-05-CN-007).
 * GET /contracts/{contractId}/projects/from-template
 */
export async function fetchProjectTemplates(contractId: number): Promise<ProjectTemplateRes[]> {
  return requestBackend<ProjectTemplateRes[]>(
    `${API_BASE_URL}/contracts/${contractId}/projects/from-template`
  );
}

/**
 * Tạo dự án từ mẫu có sẵn cây công việc và ngân sách giờ (NCL-05-CN-007).
 * POST /contracts/{contractId}/projects/from-template
 */
export async function createProjectFromTemplate(
  contractId: number,
  payload: ProjectCreateFromTemplateReq
): Promise<ProjectRes> {
  return requestBackend<ProjectRes>(
    `${API_BASE_URL}/contracts/${contractId}/projects/from-template`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    }
  );
}

/**
 * Lấy cây phân rã công việc WBS của dự án (NCL-05-CN-002, NCL-05-CN-007).
 * GET /projects/{projectId}/work-breakdown
 */
export async function getWorkBreakdown(projectId: number): Promise<WorkBreakdownRes[]> {
  return requestBackend<WorkBreakdownRes[]>(
    `${API_BASE_URL}/projects/${projectId}/work-breakdown`
  );
}

/**
 * Xóa hạng mục của dự án (NCL-05-CN-007 / TC-02).
 * DELETE /projects/{projectId}/work-packages/{workPackageId}
 */
export async function deleteWorkPackage(projectId: number, workPackageId: number): Promise<void> {
  await requestBackend<void>(
    `${API_BASE_URL}/projects/${projectId}/work-packages/${workPackageId}`,
    {
      method: 'DELETE',
    }
  );
}
