import type {
  ProjectCreateFromContractReq,
  ProjectRes,
  TaskCreateReq,
  TaskRes,
  WorkBreakdownRes,
  WorkPackageReq,
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
    if (response.status === 403) message = 'Bạn không có quyền thực hiện thao tác này.';
    if (response.status === 401) message = 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
    if (payload.fieldErrors && payload.fieldErrors.length > 0) {
      const first = payload.fieldErrors[0];
      message = `${first.message} (${first.field})`;
    }
    throw new ProjectsApiError(code, message, response.status, payload.fieldErrors);
  }

  return payload.data as T;
}

/**
 * NCL-05-CN-001: Tạo dự án từ hợp đồng đang còn hiệu lực (ACTIVE).
 * Yêu cầu token của Quản lý dự án (VT-02).
 * POST /contracts/{contractId}/projects
 */
export async function createProjectFromContract(
  contractId: number,
  payload: ProjectCreateFromContractReq
): Promise<ProjectRes> {
  return requestBackend<ProjectRes>(`${API_BASE_URL}/contracts/${contractId}/projects`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/**
 * Đọc thông tin chi tiết dự án.
 * Cho phép VT-01, VT-02, VT-03.
 * GET /projects/{projectId}
 */
export async function getProject(projectId: number): Promise<ProjectRes> {
  return requestBackend<ProjectRes>(`${API_BASE_URL}/projects/${projectId}`, {
    method: 'GET',
  });
}

/**
 * NCL-05-CN-002: Đọc cây cơ cấu hạng mục và công việc (WBS).
 * Cho phép Quản lý dự án (VT-02), Nhân viên chuyên môn (VT-03), Ban giám đốc (VT-01).
 * GET /projects/{projectId}/work-breakdown
 */
export async function getWorkBreakdown(projectId: number): Promise<WorkBreakdownRes[]> {
  return requestBackend<WorkBreakdownRes[]>(`${API_BASE_URL}/projects/${projectId}/work-breakdown`, {
    method: 'GET',
  });
}

/**
 * NCL-05-CN-002: Tạo hạng mục công việc (Work Package).
 * Yêu cầu vai trò Quản lý dự án (VT-02).
 * POST /projects/{projectId}/work-packages
 */
export async function createWorkPackage(
  projectId: number,
  payload: WorkPackageReq
): Promise<WorkBreakdownRes> {
  return requestBackend<WorkBreakdownRes>(`${API_BASE_URL}/projects/${projectId}/work-packages`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/**
 * NCL-05-CN-002: Tạo công việc thuộc hạng mục.
 * Yêu cầu vai trò Quản lý dự án (VT-02).
 * POST /projects/{projectId}/work-packages/{workPackageId}/tasks
 */
export async function createTask(
  projectId: number,
  workPackageId: number,
  payload: TaskCreateReq
): Promise<TaskRes> {
  return requestBackend<TaskRes>(
    `${API_BASE_URL}/projects/${projectId}/work-packages/${workPackageId}/tasks`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    }
  );
}

/**
 * Xóa hạng mục không còn cần thiết.
 * Yêu cầu vai trò Quản lý dự án (VT-02).
 * DELETE /projects/{projectId}/work-packages/{workPackageId}
 */
export async function deleteWorkPackage(projectId: number, workPackageId: number): Promise<void> {
  await requestBackend<null>(`${API_BASE_URL}/projects/${projectId}/work-packages/${workPackageId}`, {
    method: 'DELETE',
  });
}
