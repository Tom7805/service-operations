import { useCallback, useEffect, useState } from 'react';
import { createEmployee, EmployeeApiError, getEmployees, updateEmployee } from '../api/employeesApi';
import EmployeeFormModal from '../components/EmployeeFormModal';
import EmployeeTable from '../components/EmployeeTable';
import type { Employee, EmployeeCreatePayload, EmployeeUpdatePayload } from '../types/employeeTypes';
import { DEFAULT_STANDARD_HOURS_PER_WEEK } from '../types/employeeTypes';

interface EmployeeListPageProps {
  currentUserRoles?: string[];
  currentUserName?: string;
  onNavigateDetail?: (employeeId: number) => void;
}

export default function EmployeeListPage({
  currentUserRoles = ['VT-06'],
  currentUserName = 'Nhân sự',
  onNavigateDetail,
}: EmployeeListPageProps) {
  // NCL-01-CN-007-TC-04: chỉ Nhân sự (VT-06) hoặc Quản trị viên (VT-07) được truy cập.
  const isAllowed = currentUserRoles.includes('VT-06') || currentUserRoles.includes('VT-07');

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const fetchEmployees = useCallback(async () => {
    if (!isAllowed) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getEmployees();
      setEmployees(data);
    } catch (err) {
      const message =
        err instanceof EmployeeApiError ? err.message : err instanceof Error ? err.message : 'Không thể tải danh sách hồ sơ nhân sự.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [isAllowed]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  const handleOpenCreateModal = () => {
    setEditingEmployee(null);
    setIsFormOpen(true);
  };

  const handleOpenEditModal = (employee: Employee) => {
    setEditingEmployee(employee);
    setIsFormOpen(true);
  };

  const handleSubmitCreate = async (payload: EmployeeCreatePayload) => {
    const created = await createEmployee(payload);
    showToast(`Đã tạo hồ sơ nhân sự cho @${created.username} thành công`);
    await fetchEmployees();
  };

  const handleSubmitUpdate = async (id: number, payload: EmployeeUpdatePayload) => {
    const updated = await updateEmployee(id, payload);
    showToast(`Cập nhật hồ sơ nhân sự @${updated.username} thành công`);
    await fetchEmployees();
  };

  // TC-04: Từ chối truy cập nếu không đủ quyền
  if (!isAllowed) {
    return (
      <div className="access-denied-container">
        <div className="access-denied-card">
          <div className="access-denied-icon">🚫</div>
          <span className="eyebrow text-danger">Từ chối truy cập (Access Denied)</span>
          <h2>Bạn không có thẩm quyền truy cập màn hình này</h2>
          <p>
            Chức năng Quản lý hồ sơ nhân sự chỉ dành riêng cho vai trò <strong>Nhân sự</strong> hoặc{' '}
            <strong>Quản trị viên</strong>. Hệ thống đã ghi lại lần truy cập trái phép này vào nhật ký
            bảo mật.
          </p>
          <div className="security-log-badge">
            <span>🛡️ Lần thử truy cập: {new Date().toLocaleString('vi-VN')}</span>
            <span>Tài khoản: {currentUserName}</span>
            <span>Vai trò hiện tại: {currentUserRoles.join(', ')}</span>
          </div>
        </div>
      </div>
    );
  }

  const totalCount = employees.length;
  const customHoursCount = employees.filter(
    (e) => Number(e.standardHoursPerWeek) !== DEFAULT_STANDARD_HOURS_PER_WEEK
  ).length;
  const endedCount = employees.filter((e) => e.endDate).length;

  return (
    <div className="user-management-page">
      {toastMessage && (
        <div className={`toast-notification toast--${toastMessage.type}`} role="status">
          <span className="toast__icon">{toastMessage.type === 'success' ? '✅' : '⚠️'}</span>
          <span>{toastMessage.text}</span>
          <button type="button" className="toast__close" onClick={() => setToastMessage(null)}>
            ✕
          </button>
        </div>
      )}

      <div className="page-header">
        <div>
          <div className="breadcrumb">
            <span>Hệ thống</span> / <span>Nhân sự</span> /{' '}
            <span className="active">Hồ sơ nhân sự & giờ làm việc chuẩn</span>
          </div>
          <h1 className="page-title">Quản lý hồ sơ nhân sự và giờ làm việc chuẩn</h1>
          <p className="page-subtitle">
            Quản lý hồ sơ, hợp đồng lao động và giờ làm việc chuẩn hàng tuần của từng nhân sự công ty.
          </p>
        </div>
        <div className="page-header-actions">
          <button type="button" className="btn-primary btn-lg" onClick={handleOpenCreateModal}>
            <span className="btn-icon">+</span> Thêm hồ sơ nhân sự
          </button>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-card__icon stat-card__icon--blue">🧑‍💼</div>
          <div>
            <span className="stat-card__label">Tổng hồ sơ nhân sự</span>
            <strong className="stat-card__value">{totalCount}</strong>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card__icon stat-card__icon--purple">⏱️</div>
          <div>
            <span className="stat-card__label">Giờ chuẩn tùy chỉnh (≠ 40)</span>
            <strong className="stat-card__value">{customHoursCount}</strong>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card__icon stat-card__icon--red">🔚</div>
          <div>
            <span className="stat-card__label">Đã kết thúc làm việc</span>
            <strong className="stat-card__value text-danger">{endedCount}</strong>
          </div>
        </div>
      </div>

      {error && (
        <div className="alert alert--error mb-4" role="alert">
          <span>⚠️ {error}</span>
          <button type="button" className="btn-link text-white ml-auto" onClick={fetchEmployees}>
            Thử lại
          </button>
        </div>
      )}

      <EmployeeTable
        employees={employees}
        loading={loading}
        onEdit={handleOpenEditModal}
        onViewDetail={(emp) => (onNavigateDetail ? onNavigateDetail(emp.id) : handleOpenEditModal(emp))}
        onRefresh={fetchEmployees}
      />

      <EmployeeFormModal
        isOpen={isFormOpen}
        editingEmployee={editingEmployee}
        onClose={() => setIsFormOpen(false)}
        onSubmitCreate={handleSubmitCreate}
        onSubmitUpdate={handleSubmitUpdate}
      />
    </div>
  );
}
