import type { DepartmentUnitType } from '../types/departmentTypes';

interface UnitTypeMeta {
  label: string;
  monogram: string;
  rank: number;
}

// rank: cấp bậc trong cây (số càng nhỏ càng cao), đúng 4 tầng phân cấp:
// Trung tâm > Ban > Phòng > Tổ/Nhóm. Một đơn vị không được trực thuộc đơn vị
// có rank lớn hơn mình (vd: Ban không thể là con của Phòng, Trung tâm không
// thể là con của Ban). Phải khớp với DepartmentType.java (backend).
export const DEPARTMENT_UNIT_TYPE_META: Record<DepartmentUnitType, UnitTypeMeta> = {
  TRUNG_TAM: { label: 'Trung tâm', monogram: 'TT', rank: 0 },
  BAN: { label: 'Ban', monogram: 'B', rank: 1 },
  PHONG: { label: 'Phòng', monogram: 'P', rank: 2 },
  TO: { label: 'Tổ / Nhóm', monogram: 'N', rank: 3 },
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
