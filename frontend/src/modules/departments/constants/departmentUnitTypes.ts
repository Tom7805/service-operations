import type { DepartmentUnitType } from '../types/departmentTypes';

interface UnitTypeMeta {
  label: string;
  monogram: string;
  rank: number;
}

// rank: cấp bậc trong cây (số càng nhỏ càng cao). Một đơn vị không được
// trực thuộc đơn vị có rank lớn hơn mình (vd: Ban không thể là con của Phòng).
// Phải khớp với DepartmentType.java (backend).
export const DEPARTMENT_UNIT_TYPE_META: Record<DepartmentUnitType, UnitTypeMeta> = {
  TRUNG_TAM: { label: 'Trung tâm', monogram: 'TT', rank: 0 },
  BAN: { label: 'Ban', monogram: 'B', rank: 0 },
  PHONG: { label: 'Phòng', monogram: 'P', rank: 1 },
  TO: { label: 'Tổ / Nhóm', monogram: 'N', rank: 2 },
};

export const DEPARTMENT_UNIT_TYPE_OPTIONS: DepartmentUnitType[] = ['TRUNG_TAM', 'BAN', 'PHONG', 'TO'];

export function getUnitTypeLabel(type: DepartmentUnitType | undefined | null): string {
  return type ? DEPARTMENT_UNIT_TYPE_META[type].label : 'Không xác định';
}

export function getUnitTypeMonogram(type: DepartmentUnitType | undefined | null): string {
  return type ? DEPARTMENT_UNIT_TYPE_META[type].monogram : '?';
}

export function getUnitTypeRank(type: DepartmentUnitType | undefined | null): number {
  return type ? DEPARTMENT_UNIT_TYPE_META[type].rank : 1;
}
