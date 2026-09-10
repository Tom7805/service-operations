export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'WAITING_APPROVAL' | 'DONE';

export interface TaskRes {
  id: number;
  projectId: number;
  workPackageId: number;
  parentTaskId: number | null;
  name: string;
  description: string | null;
  expectedStartDate?: string | null;
  expectedEndDate?: string | null;
  status: TaskStatus;
}

export interface TaskProgressPayload {
  status: TaskStatus;
}

export interface WorkPackageNode {
  id: number;
  parentId: number | null;
  name: string;
  description: string | null;
  tasks: TaskRes[];
  children: WorkPackageNode[];
}
