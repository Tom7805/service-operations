import type {
  ProjectCreateFromContractReq,
  ProjectCreateFromTemplateReq,
  ProjectMilestoneCompleteReq,
  ProjectMilestoneReq,
  ProjectMilestoneRes,
  ProjectRes,
  ProjectRiskReq,
  ProjectRiskRes,
  ProjectRiskStatusReq,
  ProjectTemplateRes,
  TaskBudgetReq,
  TaskBudgetStatusRes,
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
 * NCL-05-CN-005: Đặt (hoặc đổi — ghi đè, không cộng dồn) ngân sách giờ công cho một công việc.
 * Yêu cầu vai trò Quản lý dự án (VT-02); dự án phải đang RUNNING.
 * PUT /projects/{projectId}/tasks/{taskId}/budget
 */
export async function setTaskBudget(
  projectId: number,
  taskId: number,
  payload: TaskBudgetReq
): Promise<TaskBudgetStatusRes> {
  return requestBackend<TaskBudgetStatusRes>(
    `${API_BASE_URL}/projects/${projectId}/tasks/${taskId}/budget`,
    {
      method: 'PUT',
      body: JSON.stringify(payload),
    }
  );
}

/**
 * NCL-05-CN-007: Lấy danh sách mẫu dự án đang hoạt động để chọn khi tạo dự án.
 * GET /contracts/{contractId}/projects/from-template
 */
export async function fetchProjectTemplates(contractId: number): Promise<ProjectTemplateRes[]> {
  return requestBackend<ProjectTemplateRes[]>(
    `${API_BASE_URL}/contracts/${contractId}/projects/from-template`,
    {
      method: 'GET',
    }
  );
}

/**
 * NCL-05-CN-007: Tạo dự án từ mẫu có sẵn cây công việc và ngân sách giờ.
 * Yêu cầu vai trò Quản lý dự án (VT-02).
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
 * Xóa hạng mục không còn cần thiết.
 * Yêu cầu vai trò Quản lý dự án (VT-02).
 * DELETE /projects/{projectId}/work-packages/{workPackageId}
 */
export async function deleteWorkPackage(projectId: number, workPackageId: number): Promise<void> {
  await requestBackend<null>(`${API_BASE_URL}/projects/${projectId}/work-packages/${workPackageId}`, {
    method: 'DELETE',
  });
}

/**
 * NCL-05-CN-006: Đóng dự án. Chỉ đóng được khi dự án đang RUNNING và không còn công việc
 * ở trạng thái WAITING_APPROVAL (đại diện phần việc/bảng chấm công còn treo chưa duyệt) —
 * nếu còn, backend trả 400 INVALID_STATE kèm danh sách công việc còn treo trong `message`.
 * Yêu cầu vai trò Quản lý dự án (VT-02).
 * POST /projects/{projectId}/close
 */
export async function closeProject(projectId: number): Promise<ProjectRes> {
  return requestBackend<ProjectRes>(`${API_BASE_URL}/projects/${projectId}/close`, {
    method: 'POST',
  });
}

/**
 * NCL-05-CN-008 / TC-02: bảng theo dõi tiến độ — danh sách mốc sắp theo ngày kế hoạch,
 * kèm trạng thái (DONE/ON_TRACK/LATE) và số ngày trễ do backend tính động tại thời điểm gọi.
 * Cho phép Quản lý dự án (VT-02).
 * GET /projects/{projectId}/milestones
 */
export async function getMilestones(projectId: number): Promise<ProjectMilestoneRes[]> {
  return requestBackend<ProjectMilestoneRes[]>(`${API_BASE_URL}/projects/${projectId}/milestones`, {
    method: 'GET',
  });
}

/**
 * NCL-05-CN-008 / TC-01: tạo mốc tiến độ (tên, ngày kế hoạch, hạng mục phải hoàn thành).
 * Yêu cầu vai trò Quản lý dự án (VT-02); dự án phải đang RUNNING và đã có cây công việc.
 * POST /projects/{projectId}/milestones
 */
export async function createMilestone(
  projectId: number,
  payload: ProjectMilestoneReq
): Promise<ProjectMilestoneRes> {
  return requestBackend<ProjectMilestoneRes>(`${API_BASE_URL}/projects/${projectId}/milestones`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/**
 * NCL-05-CN-008: cập nhật tên, mô tả, ngày kế hoạch và danh sách hạng mục của mốc.
 * Yêu cầu vai trò Quản lý dự án (VT-02).
 * PUT /projects/{projectId}/milestones/{milestoneId}
 */
export async function updateMilestone(
  projectId: number,
  milestoneId: number,
  payload: ProjectMilestoneReq
): Promise<ProjectMilestoneRes> {
  return requestBackend<ProjectMilestoneRes>(
    `${API_BASE_URL}/projects/${projectId}/milestones/${milestoneId}`,
    {
      method: 'PUT',
      body: JSON.stringify(payload),
    }
  );
}

/**
 * NCL-05-CN-008: ghi nhận ngày thực tế hoàn thành của mốc (không được ở tương lai).
 * Yêu cầu vai trò Quản lý dự án (VT-02).
 * POST /projects/{projectId}/milestones/{milestoneId}/complete
 */
export async function completeMilestone(
  projectId: number,
  milestoneId: number,
  payload: ProjectMilestoneCompleteReq
): Promise<ProjectMilestoneRes> {
  return requestBackend<ProjectMilestoneRes>(
    `${API_BASE_URL}/projects/${projectId}/milestones/${milestoneId}/complete`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    }
  );
}

/**
 * NCL-05-CN-008: xóa mốc tiến độ (không xóa công việc trong cây công việc).
 * Yêu cầu vai trò Quản lý dự án (VT-02).
 * DELETE /projects/{projectId}/milestones/{milestoneId}
 */
export async function deleteMilestone(projectId: number, milestoneId: number): Promise<void> {
  await requestBackend<null>(`${API_BASE_URL}/projects/${projectId}/milestones/${milestoneId}`, {
    method: 'DELETE',
  });
}

/**
 * NCL-05-CN-009 / TC-02: bảng theo dõi rủi ro — danh sách sắp theo điểm rủi ro (`score`)
 * giảm dần, kèm `score`/`severity` do backend tính động tại thời điểm gọi.
 * Cho phép Quản lý dự án (VT-02).
 * GET /projects/{projectId}/risks
 */
export async function getRisks(projectId: number): Promise<ProjectRiskRes[]> {
  return requestBackend<ProjectRiskRes[]>(`${API_BASE_URL}/projects/${projectId}/risks`, {
    method: 'GET',
  });
}

/**
 * NCL-05-CN-009 / TC-01: ghi nhận rủi ro (mô tả, tác động, khả năng xảy ra, biện pháp,
 * người theo dõi). Yêu cầu vai trò Quản lý dự án (VT-02); dự án phải đang RUNNING.
 * POST /projects/{projectId}/risks
 */
export async function createRisk(projectId: number, payload: ProjectRiskReq): Promise<ProjectRiskRes> {
  return requestBackend<ProjectRiskRes>(`${API_BASE_URL}/projects/${projectId}/risks`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/**
 * NCL-05-CN-009: cập nhật nội dung rủi ro.
 * Yêu cầu vai trò Quản lý dự án (VT-02).
 * PUT /projects/{projectId}/risks/{riskId}
 */
export async function updateRisk(
  projectId: number,
  riskId: number,
  payload: ProjectRiskReq
): Promise<ProjectRiskRes> {
  return requestBackend<ProjectRiskRes>(`${API_BASE_URL}/projects/${projectId}/risks/${riskId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

/**
 * NCL-05-CN-009: cập nhật trạng thái xử lý rủi ro (OPEN/MITIGATING/CLOSED).
 * Yêu cầu vai trò Quản lý dự án (VT-02).
 * PUT /projects/{projectId}/risks/{riskId}/status
 */
export async function changeRiskStatus(
  projectId: number,
  riskId: number,
  payload: ProjectRiskStatusReq
): Promise<ProjectRiskRes> {
  return requestBackend<ProjectRiskRes>(`${API_BASE_URL}/projects/${projectId}/risks/${riskId}/status`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

/**
 * NCL-05-CN-009: xóa rủi ro khỏi dự án.
 * Yêu cầu vai trò Quản lý dự án (VT-02).
 * DELETE /projects/{projectId}/risks/{riskId}
 */
export async function deleteRisk(projectId: number, riskId: number): Promise<void> {
  await requestBackend<null>(`${API_BASE_URL}/projects/${projectId}/risks/${riskId}`, {
    method: 'DELETE',
  });
}
