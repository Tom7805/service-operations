export interface Department {
  id: number;
  name: string;
  parentId: number | null;
  managerId: number | null;
  managerName: string | null;
}

export interface DepartmentTreeNode {
  id: number;
  name: string;
  managerId: number | null;
  managerName: string | null;
  children: DepartmentTreeNode[];
}

export interface CreateDepartmentPayload {
  name: string;
  parentId?: number | null;
  managerId: number;
}

export interface UpdateDepartmentPayload {
  name: string;
  parentId?: number | null;
  managerId: number;
}

export interface MoveDepartmentPayload {
  parentId?: number | null;
}

export interface DepartmentAuditLog {
  id: string;
  timestamp: string;
  action: string;
  performedBy: string;
  targetDepartment: string;
  details: string;
}

export interface ManagerUserOption {
  id: number;
  fullName: string;
  username: string;
  departmentId?: number | null;
}
