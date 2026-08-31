import React, { FormEvent, useEffect, useState } from 'react';
import type { CreateUserPayload, UpdateUserPayload, User } from '../types/userTypes';
import { SYSTEM_DEPARTMENTS, SYSTEM_ROLES } from '../types/userTypes';
import { validateCreateUser, validateUpdateUser, FormErrors } from '../validators/userValidators';
import { ICONS } from './icons';

interface UserFormModalProps {
  isOpen: boolean;
  editingUser: User | null;
  onClose: () => void;
  onSubmitCreate: (payload: CreateUserPayload) => Promise<void>;
  onSubmitUpdate: (id: number, payload: UpdateUserPayload) => Promise<void>;
}

export const UserFormModal: React.FC<UserFormModalProps> = ({
  isOpen,
  editingUser,
  onClose,
  onSubmitCreate,
  onSubmitUpdate,
}) => {
  const isEdit = Boolean(editingUser);

  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [departmentId, setDepartmentId] = useState<number | ''>('');
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [showPassword, setShowPassword] = useState(false);

  const [errors, setErrors] = useState<FormErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (editingUser) {
      setUsername(editingUser.username);
      setFullName(editingUser.fullName);
      setEmail(editingUser.email || '');
      setPassword('');
      setDepartmentId(editingUser.departmentId || '');
      setSelectedRoles(editingUser.roleCodes || []);
    } else {
      setUsername('');
      setFullName('');
      setEmail('');
      setPassword('');
      setDepartmentId('');
      setSelectedRoles([]);
    }
    setErrors({});
    setServerError(null);
  }, [editingUser, isOpen]);

  if (!isOpen) return null;

  const handleRoleToggle = (code: string) => {
    if (selectedRoles.includes(code)) {
      setSelectedRoles(selectedRoles.filter((r) => r !== code));
    } else {
      setSelectedRoles([...selectedRoles, code]);
    }
    if (errors.roleCodes) {
      setErrors((prev) => ({ ...prev, roleCodes: undefined }));
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setServerError(null);

    const deptVal = departmentId === '' ? undefined : Number(departmentId);

    if (!isEdit) {
      const payload: CreateUserPayload = {
        username,
        fullName,
        email,
        password,
        departmentId: deptVal,
        roleCodes: selectedRoles,
      };
      const validationErrors = validateCreateUser(payload);
      if (Object.keys(validationErrors).length > 0) {
        setErrors(validationErrors);
        return;
      }
      setSubmitting(true);
      try {
        await onSubmitCreate(payload);
        onClose();
      } catch (err) {
        setServerError(err instanceof Error ? err.message : 'Không thể tạo tài khoản người dùng.');
      } finally {
        setSubmitting(false);
      }
    } else {
      const payload: UpdateUserPayload = {
        fullName,
        email,
        departmentId: deptVal,
        roleCodes: selectedRoles,
        ...(password ? { password } : {}),
      };
      const validationErrors = validateUpdateUser(payload);
      if (Object.keys(validationErrors).length > 0) {
        setErrors(validationErrors);
        return;
      }
      setSubmitting(true);
      try {
        await onSubmitUpdate(editingUser!.id, payload);
        onClose();
      } catch (err) {
        setServerError(err instanceof Error ? err.message : 'Không thể cập nhật thông tin người dùng.');
      } finally {
        setSubmitting(false);
      }
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <span className="modal-eyebrow">{isEdit ? 'Cập nhật tài khoản' : 'Khởi tạo tài khoản'}</span>
            <h2 id="modal-title" className="modal-title">
              {isEdit ? `Chỉnh sửa: @${editingUser?.username}` : 'Thêm tài khoản người dùng mới'}
            </h2>
          </div>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Đóng dialog">
            ✕
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
              {/* Username */}
              <div className="form-field">
                <label htmlFor="username-input" className="form-label">
                  Tên tài khoản (Username) <span className="req">*</span>
                </label>
                <input
                  id="username-input"
                  type="text"
                  className={`form-input ${errors.username ? 'form-input--error' : ''}`}
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    if (errors.username) setErrors({ ...errors, username: undefined });
                  }}
                  placeholder="Ví dụ: hoang.nguyen"
                  disabled={isEdit || submitting}
                />
                {errors.username && <span className="field-error">{errors.username}</span>}
                {isEdit && <span className="field-hint">Tên tài khoản cố định và không thể chỉnh sửa.</span>}
              </div>

              {/* Full Name */}
              <div className="form-field">
                <label htmlFor="fullname-input" className="form-label">
                  Họ và tên nhân sự <span className="req">*</span>
                </label>
                <input
                  id="fullname-input"
                  type="text"
                  className={`form-input ${errors.fullName ? 'form-input--error' : ''}`}
                  value={fullName}
                  onChange={(e) => {
                    setFullName(e.target.value);
                    if (errors.fullName) setErrors({ ...errors, fullName: undefined });
                  }}
                  placeholder="Ví dụ: Nguyễn Văn Hoàng"
                  disabled={submitting}
                />
                {errors.fullName && <span className="field-error">{errors.fullName}</span>}
              </div>

              {/* Email */}
              <div className="form-field">
                <label htmlFor="email-input" className="form-label">Địa chỉ Email liên hệ</label>
                <input
                  id="email-input"
                  type="email"
                  className={`form-input ${errors.email ? 'form-input--error' : ''}`}
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errors.email) setErrors({ ...errors, email: undefined });
                  }}
                  placeholder="hoang.nguyen@company.com"
                  disabled={submitting}
                />
                {errors.email && <span className="field-error">{errors.email}</span>}
              </div>

              {/* Department */}
              <div className="form-field">
                <label htmlFor="department-input" className="form-label">Phòng ban / Bộ phận</label>
                <select
                  id="department-input"
                  className="form-select"
                  value={departmentId}
                  onChange={(e) => setDepartmentId(e.target.value ? Number(e.target.value) : '')}
                  disabled={submitting}
                >
                  <option value="">-- Chưa gán phòng ban --</option>
                  {SYSTEM_DEPARTMENTS.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      [{dept.code}] {dept.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Password */}
              <div className="form-field form-field--full">
                <label htmlFor="password-input" className="form-label">
                  Mật khẩu đăng nhập {!isEdit && <span className="req">*</span>}
                </label>
                <div className="password-input-wrap">
                  <input
                    id="password-input"
                    type={showPassword ? 'text' : 'password'}
                    className={`form-input ${errors.password ? 'form-input--error' : ''}`}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (errors.password) setErrors({ ...errors, password: undefined });
                    }}
                    placeholder={isEdit ? 'Để trống nếu không muốn thay đổi mật khẩu' : 'Nhập ít nhất 8 ký tự...'}
                    disabled={submitting}
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                  >
                    {showPassword ? ICONS.eyeOff : ICONS.eye}
                  </button>
                </div>
                {errors.password && <span className="field-error">{errors.password}</span>}
              </div>

              {/* Roles selection */}
              <div className="form-field form-field--full">
                <label className="form-label">
                  Phân vai trò truy cập <span className="req">*</span>
                </label>
                {errors.roleCodes && <span className="field-error mb-2">{errors.roleCodes}</span>}
                <div className="roles-grid">
                  {SYSTEM_ROLES.map((role) => {
                    const checked = selectedRoles.includes(role.code);
                    return (
                      <label
                        key={role.code}
                        className={`role-choice-card ${checked ? 'role-choice-card--selected' : ''}`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => handleRoleToggle(role.code)}
                          disabled={submitting}
                        />
                        <div className="role-choice-info">
                          <div className="role-choice-header">
                            <span className="role-name">{role.name}</span>
                          </div>
                          <p className="role-desc">{role.description}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={submitting}>
              Hủy bỏ
            </button>
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? 'Đang lưu...' : isEdit ? 'Cập nhật thay đổi' : 'Tạo tài khoản'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserFormModal;
