export type EmploymentTypeCode = 'FULL_TIME' | 'PART_TIME';

export interface Employee {
  id: number;
  userId: number;
  username: string;
  fullName: string;
  departmentId: number | null;
  departmentName: string | null;
  professionalRole: string | null;
  standardHoursPerWeek: number;
  hireDate: string;
  endDate: string | null;
}

export interface EmploymentContract {
  id: number;
  employeeId: number;
  contractType: EmploymentTypeCode;
  startDate: string;
  endDate: string | null;
  createdAt: string;
}

export interface EmployeeDetail extends Employee {
  createdAt: string;
  updatedAt: string;
  contracts: EmploymentContract[];
}

export interface EmployeeCreatePayload {
  userId: number;
  departmentId?: number | null;
  professionalRole?: string | null;
  hireDate: string;
  endDate?: string | null;
  standardHoursPerWeek?: number | null;
}

export interface EmployeeUpdatePayload {
  departmentId?: number | null;
  professionalRole?: string | null;
  hireDate: string;
  endDate?: string | null;
  standardHoursPerWeek?: number | null;
}

export interface EmploymentContractCreatePayload {
  contractType: EmploymentTypeCode;
  startDate: string;
  endDate?: string | null;
}

export const EMPLOYMENT_TYPE_LABELS: Record<EmploymentTypeCode, string> = {
  FULL_TIME: 'Toàn thời gian',
  PART_TIME: 'Bán thời gian',
};

/** NCL-01-CN-007-TC-01/TC-02: mặc định của backend khi không truyền standardHoursPerWeek. */
export const DEFAULT_STANDARD_HOURS_PER_WEEK = 40;
