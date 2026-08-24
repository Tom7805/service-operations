export type MaskingLevelCode = 'SALARY' | 'COST';

export interface MaskingRule {
  level: MaskingLevelCode;
  levelLabel: string;
  allowedRoles: string[];
}

export interface MaskingAuditLog {
  id: string;
  timestamp: string;
  action: string;
  performedBy: string;
  details: string;
}