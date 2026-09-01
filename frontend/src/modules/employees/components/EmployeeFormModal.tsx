import { useEffect, useState, type FormEvent } from 'react';
import { getDepartmentsList, getUsers } from '../../users/api/usersApi';
import type { DepartmentInfo, User } from '../../users/types/userTypes';
import type { Employee, EmployeeCreatePayload, EmployeeUpdatePayload } from '../types/employeeTypes';
import { DEFAULT_STANDARD_HOURS_PER_WEEK } from '../types/employeeTypes';
import { validateCreateEmployee, validateUpdateEmployee, type FormErrors } from '../validators/employeeValidators';
import { ICONS } from '../../../components/common/icons';

interface EmployeeFormModalProps {
  isOpen: boolean;
  editingEmployee: Employee | null;
  onClose: () => void;
  onSubmitCreate: (payload: EmployeeCreatePayload) => Promise<void>;
  onSubmitUpdate: (id: number, payload: EmployeeUpdatePayload) => Promise<void>;
}

export default function EmployeeFormModal({
  isOpen,
  editingEmployee,
  onClose,
  onSubmitCreate,
  onSubmitUpdate,
}: EmployeeFormModalProps) {
  const isEdit = Boolean(editingEmployee);

  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<DepartmentInfo[]>([]);

  const [userId, setUserId] = useState<number | ''>('');
  const [departmentId, setDepartmentId] = useState<number | ''>('');
  const [professionalRole, setProfessionalRole] = useState('');
  const [hireDate, setHireDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [standardHoursPerWeek, setStandardHoursPerWeek] = useState('');

  const [errors, setErrors] = useState<FormErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    getUsers().then(setUsers).catch(() => setUsers([]));
    getDepartmentsList().then(setDepartments).catch(() => setDepartments([]));
  }, [isOpen]);

  useEffect(() => {
    if (editingEmployee) {
      setUserId(editingEmployee.userId);
      setDepartmentId(editingEmployee.departmentId ?? '');
      setProfessionalRole(editingEmployee.professionalRole ?? '');
      setHireDate(editingEmployee.hireDate);
      setEndDate(editingEmployee.endDate ?? '');
      setStandardHoursPerWeek(String(editingEmployee.standardHoursPerWeek ?? ''));
    } else {
      setUserId('');
      setDepartmentId('');
      setProfessionalRole('');
      setHireDate('');
      setEndDate('');
      setStandardHoursPerWeek('');
    }
    setErrors({});
    setServerError(null);
  }, [editingEmployee, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setServerError(null);

    const deptVal = departmentId === '' ? undefined : Number(departmentId);
    const hoursVal = standardHoursPerWeek.trim() === '' ? undefined : Number(standardHoursPerWeek);

    if (!isEdit) {
      const payload: EmployeeCreatePayload = {
        userId: userId === '' ? (undefined as unknown as number) : Number(userId),
        departmentId: deptVal,
        professionalRole: professionalRole.trim() || undefined,
        hireDate,
        endDate: endDate || undefined,
        standardHoursPerWeek: hoursVal,
      };
      const validationErrors = validateCreateEmployee(payload);
      if (Object.keys(validationErrors).length > 0) {
        setErrors(validationErrors);
        return;
      }
      setSubmitting(true);
      try {
        await onSubmitCreate(payload);
        onClose();
      } catch (err) {
        setServerError(err instanceof Error ? err.message : 'Không thể tạo hồ sơ nhân sự.');
      } finally {
        setSubmitting(false);
      }
    } else {
      const payload: EmployeeUpdatePayload = {
        departmentId: deptVal,
        professionalRole: professionalRole.trim() || undefined,
        hireDate,
        endDate: endDate || undefined,
        standardHoursPerWeek: hoursVal,
      };
      const validationErrors = validateUpdateEmployee(payload);
      if (Object.keys(validationErrors).length > 0) {
        setErrors(validationErrors);
        return;
      }
      setSubmitting(true);
      try {
        await onSubmitUpdate(editingEmployee!.id, payload);
        onClose();
      } catch (err) {
        setServerError(err instanceof Error ? err.message : 'Không thể cập nhật hồ sơ nhân sự.');
      } finally {
        setSubmitting(false);
      }
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="employee-modal-title">
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2 id="employee-modal-title" className="modal-title">
              {isEdit ? `Chỉnh sửa: ${editingEmployee?.fullName}` : 'Thêm hồ sơ nhân sự mới'}
            </h2>
          </div>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Đóng dialog">
            <span className="icon-sm">{ICONS.close}</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="modal-body">
            {serverError && (
              <div className="alert alert--error" role="alert">
                <span className="alert__icon">{ICONS.alertTriangle}</span>
                <div className="alert__content">
                  <strong>Thao tác thất bại</strong>
                  <p>{serverError}</p>
                </div>
              </div>
            )}

            <div className="form-grid">
              {/* Tài khoản gắn với hồ sơ — không đổi được khi sửa */}
              <div className="form-field form-field--full">
                <label htmlFor="employee-user-input" className="form-label">
                  Tài khoản nhân viên <span className="req">*</span>
                </label>
                {isEdit ? (
                  <input
                    id="employee-user-input"
                    type="text"
                    className="form-input"
                    value={`@${editingEmployee?.username} — ${editingEmployee?.fullName}`}
                    disabled
                  />
                ) : (
                  <select
                    id="employee-user-input"
                    className={`form-select ${errors.userId ? 'form-input--error' : ''}`}
                    value={userId}
                    onChange={(e) => {
                      setUserId(e.target.value ? Number(e.target.value) : '');
                      if (errors.userId) setErrors({ ...errors, userId: undefined });
                    }}
                    disabled={submitting}
                  >
                    <option value="">-- Chọn tài khoản --</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        @{u.username} — {u.fullName}
                      </option>
                    ))}
                  </select>
                )}
                {errors.userId && <span className="field-error">{errors.userId}</span>}
                {isEdit && <span className="field-hint">Tài khoản gắn với hồ sơ không thể thay đổi.</span>}
              </div>

              {/* Phòng ban */}
              <div className="form-field">
                <label htmlFor="employee-department-input" className="form-label">Phòng ban / Bộ phận</label>
                <select
                  id="employee-department-input"
                  className="form-select"
                  value={departmentId}
                  onChange={(e) => setDepartmentId(e.target.value ? Number(e.target.value) : '')}
                  disabled={submitting}
                >
                  <option value="">-- Chưa gán phòng ban --</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Vai trò chuyên môn */}
              <div className="form-field">
                <label htmlFor="employee-role-input" className="form-label">Vai trò chuyên môn</label>
                <input
                  id="employee-role-input"
                  type="text"
                  className={`form-input ${errors.professionalRole ? 'form-input--error' : ''}`}
                  value={professionalRole}
                  onChange={(e) => {
                    setProfessionalRole(e.target.value);
                    if (errors.professionalRole) setErrors({ ...errors, professionalRole: undefined });
                  }}
                  placeholder="Ví dụ: Kỹ sư phần mềm"
                  disabled={submitting}
                />
                {errors.professionalRole && <span className="field-error">{errors.professionalRole}</span>}
              </div>

              {/* Ngày vào làm */}
              <div className="form-field">
                <label htmlFor="employee-hiredate-input" className="form-label">
                  Ngày vào làm <span className="req">*</span>
                </label>
                <input
                  id="employee-hiredate-input"
                  type="date"
                  className={`form-input ${errors.hireDate ? 'form-input--error' : ''}`}
                  value={hireDate}
                  onChange={(e) => {
                    setHireDate(e.target.value);
                    if (errors.hireDate) setErrors({ ...errors, hireDate: undefined });
                  }}
                  disabled={submitting}
                />
                {errors.hireDate && <span className="field-error">{errors.hireDate}</span>}
              </div>

              {/* Ngày kết thúc */}
              <div className="form-field">
                <label htmlFor="employee-enddate-input" className="form-label">Ngày kết thúc</label>
                <input
                  id="employee-enddate-input"
                  type="date"
                  className={`form-input ${errors.endDate ? 'form-input--error' : ''}`}
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    if (errors.endDate) setErrors({ ...errors, endDate: undefined });
                  }}
                  disabled={submitting}
                />
                {errors.endDate && <span className="field-error">{errors.endDate}</span>}
                <span className="field-hint">Không được sớm hơn ngày vào làm (TC-03).</span>
              </div>

              {/* Giờ làm việc chuẩn */}
              <div className="form-field">
                <label htmlFor="employee-hours-input" className="form-label">Giờ làm việc chuẩn / tuần</label>
                <input
                  id="employee-hours-input"
                  type="number"
                  step="0.01"
                  min="0.01"
                  className={`form-input ${errors.standardHoursPerWeek ? 'form-input--error' : ''}`}
                  value={standardHoursPerWeek}
                  onChange={(e) => {
                    setStandardHoursPerWeek(e.target.value);
                    if (errors.standardHoursPerWeek) setErrors({ ...errors, standardHoursPerWeek: undefined });
                  }}
                  placeholder={`Để trống thì lấy mặc định ${DEFAULT_STANDARD_HOURS_PER_WEEK}`}
                  disabled={submitting}
                />
                {errors.standardHoursPerWeek && <span className="field-error">{errors.standardHoursPerWeek}</span>}
                <span className="field-hint">
                  Là mẫu số của tỷ lệ giờ tính phí. Để trống sẽ mặc định {DEFAULT_STANDARD_HOURS_PER_WEEK}; nếu
                  nhập giá trị khác (ví dụ 20 cho bán thời gian) hệ thống lưu đúng giá trị đó, không tự làm tròn
                  (TC-01, TC-02).
                </span>
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={submitting}>
              Hủy bỏ
            </button>
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? 'Đang lưu...' : isEdit ? 'Cập nhật thay đổi' : 'Tạo hồ sơ nhân sự'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
