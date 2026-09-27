import { useEffect, useState } from 'react';
import { getDepartmentsList } from '../api/usersApi';
import type { DepartmentInfo } from '../types/userTypes';

/**
 * Danh sách bộ phận THẬT từ cây tổ chức (GET /departments) cho ô chọn và cột "Bộ phận" của màn
 * Tài khoản. Trước đây các màn này dùng mảng cố định SYSTEM_DEPARTMENTS nên bộ phận quản trị viên
 * vừa tạo ở NCL-01-CN-003 không bao giờ xuất hiện để gán cho tài khoản.
 */
export function useDepartmentOptions(): { departments: DepartmentInfo[]; loaded: boolean } {
  const [departments, setDepartments] = useState<DepartmentInfo[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getDepartmentsList()
      .then((data) => {
        if (!cancelled) setDepartments([...data].sort((a, b) => a.name.localeCompare(b.name, 'vi')));
      })
      .catch(() => {
        if (!cancelled) setDepartments([]);
      })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { departments, loaded };
}

/** Tên bộ phận để hiển thị; id không còn trong danh sách (đã xóa / ngoài phạm vi) vẫn hiện được. */
export function departmentName(departments: DepartmentInfo[], departmentId: number | null | undefined): string {
  if (!departmentId) return 'Chưa gán bộ phận';
  return departments.find((d) => d.id === departmentId)?.name ?? `Bộ phận #${departmentId}`;
}
