export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'WAITING_APPROVAL' | 'DONE';

/**
 * Thông tin chi tiết một công việc (Task).
 * Khớp TaskRes từ backend (NCL-05-CN-002).
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
