export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'WAITING_APPROVAL' | 'DONE';

/**
 * Thông tin chi tiết một công việc (Task).
 * Khớp TaskRes từ backend (NCL-05-CN-002, NCL-05-CN-007).
 */
export interface TaskRes {
  id: number;
  projectId: number;
  workPackageId: number;
  parentTaskId: number | null;
  name: string;
  description: string | null;
  expectedStartDate: string | null;
  expectedEndDate: string | null;
  status: TaskStatus;
  /** Ngân sách giờ công của task, dùng khi tạo dự án từ mẫu (NCL-05-CN-007). */
  budgetHours?: number | null;
}

/**
 * Payload đặt ngân sách giờ công cho công việc (NCL-05-CN-005).
 * PUT /projects/{projectId}/tasks/{taskId}/budget
 */
export interface TaskBudgetReq {
  budgetHours: number;
}

/**
 * Kết quả sau khi đặt ngân sách giờ công (NCL-05-CN-005).
 * approvedHours luôn là 0 cho tới khi Epic NCL-06 (Bảng chấm công) triển khai xong.
 * overBudgetWarning = true khi usageRatio >= 0.80 (QTN-20).
 */
export interface TaskBudgetStatusRes {
  taskId: number;
  projectId: number;
  budgetHours: number;
  approvedHours: number;
  usageRatio: number;
  overBudgetWarning: boolean;
}

/**
 * Payload tạo công việc mới (NCL-05-CN-002).
 * POST /projects/{projectId}/work-packages/{workPackageId}/tasks
 */
export interface TaskCreateReq {
  parentTaskId?: number | null;
  name: string;
  description?: string | null;
  expectedStartDate?: string | null;
  expectedEndDate?: string | null;
}

/**
 * Payload tạo hạng mục công việc (NCL-05-CN-002).
 * POST /projects/{projectId}/work-packages
 */
export interface WorkPackageReq {
  parentId?: number | null;
  name: string;
  description?: string | null;
  sortOrder?: number | null;
}

/**
 * Node cây cơ cấu công việc (WBS - Work Breakdown Structure).
 * Khớp WorkBreakdownRes từ backend (NCL-05-CN-002).
 */
export interface WorkBreakdownRes {
  id: number;
  parentId: number | null;
  name: string;
  description: string | null;
  tasks: TaskRes[];
  children: WorkBreakdownRes[];
}

/**
 * Payload phân công nhân sự cho công việc (NCL-05-CN-003).
 * Danh sách userIds gửi lên sẽ THAY THẾ toàn bộ danh sách phân công cũ, không cộng dồn.
 * PUT /projects/{projectId}/tasks/{taskId}/assignments
 */
export interface TaskAssignmentReq {
  userIds: number[];
  expectedStartDate: string;
  expectedEndDate: string;
}

/**
 * Một bản ghi phân công nhân sự cho công việc (NCL-05-CN-003).
 * Khớp TaskAssignmentRes từ backend.
 */
export interface TaskAssignmentRes {
  id: number;
  taskId: number;
  userId: number;
  username: string;
  fullName: string;
  expectedStartDate: string;
  expectedEndDate: string;
}

/**
 * Payload cập nhật tiến độ công việc (NCL-05-CN-004).
 * Chỉ người có tên trong danh sách phân công của chính công việc đó mới gọi được,
 * không phân biệt vai trò — xem TaskServiceImpl.updateProgress ở backend.
 * PATCH /projects/{projectId}/tasks/{taskId}/progress
 */
export interface TaskProgressReq {
  status: TaskStatus;
}
