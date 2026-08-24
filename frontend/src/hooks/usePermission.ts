import { useMemo } from 'react';

/**
 * Các vai trò được phép xem dữ liệu lương/giá vốn (QTN-02).
 * Khớp với hằng số SENSITIVE_DATA_ROLES phía backend:
 * VT-01: Ban giám đốc, VT-05: Kế toán, VT-06: Nhân sự (HR)
 */
export const SENSITIVE_DATA_ROLES = ['VT-01', 'VT-05', 'VT-06'];

/**
 * Kiểm tra xem danh sách vai trò hiện tại có được phép xem dữ liệu nhạy cảm hay không.
 */
export function canViewSensitiveData(userRoles: string[] = []): boolean {
  if (!Array.isArray(userRoles) || userRoles.length === 0) return false;
  return userRoles.some((role) => SENSITIVE_DATA_ROLES.includes(role));
}

/**
 * Hook kiểm tra quyền xem dữ liệu nhạy cảm (lương/giá vốn).
 */
export function usePermission(userRoles: string[] = []) {
  return useMemo(() => {
    const allowed = canViewSensitiveData(userRoles);
    return {
      canViewSensitiveData: allowed,
      allowedRoles: SENSITIVE_DATA_ROLES,
    };
  }, [userRoles]);
}

export default usePermission;