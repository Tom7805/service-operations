import type { ProjectStatus, TaskStatus } from '../../projects/types/projectTypes';

/**
 * Một công việc đang được giao cho người dùng hiện tại, kèm thông tin dự án
 * để hiển thị trên màn "Công việc của tôi". Khớp MyTaskRes từ backend.
 */
export interface MyTaskRes {
  taskId: number;
  taskName: string;
  taskStatus: TaskStatus;
  expectedStartDate: string | null;
  expectedEndDate: string | null;
  projectId: number;
  projectCode: string;
  projectName: string;
  projectStatus: ProjectStatus;
  assignmentStartDate: string | null;
  assignmentEndDate: string | null;
}
