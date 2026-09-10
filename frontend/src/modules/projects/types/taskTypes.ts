export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'WAITING_APPROVAL' | 'DONE';

export interface Task {
  id: number;
  projectId: number;
  workPackageId: number;
  parentTaskId?: number | null;
  name: string;
  description?: string | null;
  expectedStartDate?: string | null;
  expectedEndDate?: string | null;
  status: TaskStatus;
}

export interface WorkBreakdownNode {
  id: number;
  parentId?: number | null;
  name: string;
  description?: string | null;
  tasks: Task[];
  children: WorkBreakdownNode[];
}

export interface TaskAssignment {
  id: number;
  taskId: number;
  userId: number;
  username: string;
  fullName: string;
  expectedStartDate?: string | null;
  expectedEndDate?: string | null;
}

export interface TaskAssignmentPayload {
  userIds: number[];
  expectedStartDate?: string | null;
  expectedEndDate?: string | null;
}

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  TODO: 'Mới',
  IN_PROGRESS: 'Đang làm',
  WAITING_APPROVAL: 'Chờ duyệt',
  DONE: 'Hoàn thành',
};
