import React, { useEffect, useState } from 'react';
import type { DepartmentInfo, ScopeType, User } from '../types/userTypes';
import { SYSTEM_ROLES } from '../types/userTypes';
import { UserApiError } from '../api/usersApi';
import { ICONS } from './icons';

interface RoleScopeModalProps {
  isOpen: boolean;
  user: User | null;
  departmentsList: DepartmentInfo[];
  onClose: () => void;
  onSave: (userId: number, roleCodes: string[], scopeType: ScopeType, scopeDepartmentId?: number | null) => Promise<void>;
}

export const RoleScopeModal: React.FC<RoleScopeModalProps> = ({
  isOpen,
  user,
  departmentsList,
  onClose,
  onSave,
}) => {
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [scopeType, setScopeType] = useState<ScopeType>('COMPANY');
  const [scopeDepartmentId, setScopeDepartmentId] = useState<number | null>(null);

  const [fieldErrors, setFieldErrors] = useState<{ roles?: string; scopeDept?: string }>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user && isOpen) {
      setSelectedRoles(user.roleCodes && user.roleCodes.length > 0 ? user.roleCodes : ['VT-03']);
      const currentScope = user.scopeType === 'SELF' || user.scopeType === 'PERSONAL'
        ? 'SELF'
        : user.scopeType === 'DEPARTMENT'
        ? 'DEPARTMENT'
        : 'COMPANY';
      setScopeType(currentScope);
      setScopeDepartmentId(user.scopeDepartmentId ?? user.departmentId ?? (departmentsList.length > 0 ? departmentsList[0].id : null));
      setFieldErrors({});
      setServerError(null);
      setSubmitting(false);
    }
  }, [user, isOpen, departmentsList]);

  if (!isOpen || !user) return null;

  const handleToggleRole = (code: string) => {
    setFieldErrors((prev) => ({ ...prev, roles: undefined }));
    if (selectedRoles.includes(code)) {
      if (selectedRoles.length === 1) {
        setFieldErrors((prev) => ({ ...prev, roles: 'Tài khoản phải duy trì ít nhất một vai trò trong hệ thống.' }));
        return;
      }
      setSelectedRoles(selectedRoles.filter((r) => r !== code));
    } else {
      setSelectedRoles([...selectedRoles, code]);
    }
  };

  const validate = (): boolean => {
    const errors: { roles?: string; scopeDept?: string } = {};

    if (selectedRoles.length === 0) {
      errors.roles = 'Vui lòng chọn ít nhất 01 vai trò cho tài khoản.';
    }

    if (scopeType === 'DEPARTMENT') {
      if (!scopeDepartmentId || Number.isNaN(Number(scopeDepartmentId))) {
        errors.scopeDept = 'Phải chọn bộ phận khi phạm vi là một nhánh tổ chức.';
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    if (!validate()) return;

    setSubmitting(true);
    try {
      await onSave(
        user.id,
        selectedRoles,
        scopeType,
        scopeType === 'DEPARTMENT' ? Number(scopeDepartmentId) : null
      );
      onClose();
    } catch (err) {
      if (err instanceof UserApiError) {
        if (err.code === 'VALIDATION_ERROR') {
          setServerError(err.message || 'Dữ liệu phân quyền hoặc phạm vi không hợp lệ.');
        } else if (err.code === 'RESOURCE_NOT_FOUND') {
          setServerError(err.message || 'Không tìm thấy thông tin bộ phận hoặc vai trò tương ứng.');
        } else {
          setServerError(err.message);
        }
      } else {
        setServerError(err instanceof Error ? err.message : 'Đã có lỗi xảy ra khi cập nhật phân quyền.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-card modal-card--md" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2 className="modal-title">Phân quyền & phạm vi dữ liệu: {user.fullName}</h2>
          </div>
          <button type="button" className="modal-close" onClick={onClose} title="Đóng modal">
            <span className="icon-sm">{ICONS.close}</span>
          </button>
        </div>

        <form onSubmit={handleFormSubmit}>
          <div className="modal-body">
            {serverError && (
              <div className="alert alert--error mb-4" role="alert">
                <span className="alert__icon">{ICONS.alertTriangle}</span>
                <span>{serverError}</span>
              </div>
            )}

            {/* User Profile Summary Card */}
            <div className="user-assign-summary">
              <div className="avatar-circle avatar-circle--lg">{user.fullName.charAt(0).toUpperCase()}</div>
              <div className="user-profile-meta">
                <strong style={{ fontSize: '15px', color: '#111111' }}>{user.fullName}</strong>
                <span className="user-profile-username">@{user.username} • {user.email || 'Chưa có email'}</span>
              </div>
            </div>

            {/* Section 1: Data Scope Selection */}
            <div className="form-field mt-4">
              <label className="form-label">
                1. Phạm vi truy cập dữ liệu (Data Scope) <span className="req">*</span>
              </label>
              <div className="scope-options">
                <div
                  className={`scope-radio ${scopeType === 'COMPANY' ? 'scope-radio--active' : ''}`}
                  onClick={() => {
                    setScopeType('COMPANY');
                    if (fieldErrors.scopeDept) setFieldErrors((prev) => ({ ...prev, scopeDept: undefined }));
                  }}
                >
                  <input
                    type="radio"
                    id="scope-type-company"
                    name="scopeType"
                    value="COMPANY"
                    checked={scopeType === 'COMPANY'}
                    onChange={() => {}}
                  />
                  <div>
                    <label htmlFor="scope-type-company" style={{ cursor: 'pointer' }}>
                      <strong><span className="icon-sm">{ICONS.globe}</span> Toàn công ty (Company-wide)</strong>
                    </label>
                    <p>Truy cập và xem dữ liệu trên toàn hệ thống công ty, không giới hạn phòng ban.</p>
                  </div>
                </div>

                <div
                  className={`scope-radio ${scopeType === 'DEPARTMENT' ? 'scope-radio--active' : ''}`}
                  onClick={(e) => {
                    if ((e.target as HTMLElement).tagName !== 'SELECT' && (e.target as HTMLElement).tagName !== 'OPTION') {
                      setScopeType('DEPARTMENT');
                    }
                  }}
                >
                  <input
                    type="radio"
                    id="scope-type-department"
                    name="scopeType"
                    value="DEPARTMENT"
                    checked={scopeType === 'DEPARTMENT'}
                    onChange={() => {}}
                  />
                  <div style={{ flex: 1 }}>
                    <label htmlFor="scope-type-department" style={{ cursor: 'pointer' }}>
                      <strong><span className="icon-sm">{ICONS.building}</span> Một nhánh tổ chức (Department-level & Children)</strong>
                    </label>
                    <p>Giới hạn trong phạm vi bộ phận được chọn và toàn bộ các bộ phận con cháu trực thuộc.</p>

                    {/* Department Dropdown if DEPARTMENT selected */}
                    {scopeType === 'DEPARTMENT' && (
                      <div className="mt-2" style={{ padding: '8px 0 2px' }}>
                        <label className="form-label" style={{ fontSize: '11.5px', marginBottom: '4px' }} htmlFor="scope-dept-select">
                          Chọn bộ phận áp dụng phạm vi: <span className="req">*</span>
                        </label>
                        <select
                          id="scope-dept-select"
                          className={`form-select ${fieldErrors.scopeDept ? 'form-input--error' : ''}`}
                          value={scopeDepartmentId ?? ''}
                          onChange={(e) => {
                            setScopeDepartmentId(e.target.value ? Number(e.target.value) : null);
                            if (fieldErrors.scopeDept) setFieldErrors((prev) => ({ ...prev, scopeDept: undefined }));
                          }}
                        >
                          <option value="" disabled>-- Chọn bộ phận trong cây tổ chức --</option>
                          {departmentsList.map((dept) => (
                            <option key={dept.id} value={dept.id}>
                              {dept.name}
                            </option>
                          ))}
                        </select>
                        {fieldErrors.scopeDept && <span className="field-error">{fieldErrors.scopeDept}</span>}
                      </div>
                    )}
                  </div>
                </div>

                <div
                  className={`scope-radio ${scopeType === 'SELF' ? 'scope-radio--active' : ''}`}
                  onClick={() => {
                    setScopeType('SELF');
                    if (fieldErrors.scopeDept) setFieldErrors((prev) => ({ ...prev, scopeDept: undefined }));
                  }}
                >
                  <input
                    type="radio"
                    id="scope-type-self"
                    name="scopeType"
                    value="SELF"
                    checked={scopeType === 'SELF'}
                    onChange={() => {}}
                  />
                  <div>
                    <label htmlFor="scope-type-self" style={{ cursor: 'pointer' }}>
                      <strong><span className="icon-sm">{ICONS.user}</span> Chỉ cá nhân (Self-only)</strong>
                    </label>
                    <p>Chỉ xem và thao tác dữ liệu do chính tài khoản tạo ra hoặc được trực tiếp phân công.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 2: Roles Selection */}
            <div className="form-field mt-4">
              <label className="form-label">
                2. Gán các vai trò chức năng hệ thống <span className="req">*</span>
              </label>
              {fieldErrors.roles && <span className="field-error mb-2">{fieldErrors.roles}</span>}

              <div className="roles-checklist">
                {SYSTEM_ROLES.map((role) => {
                  const isChecked = selectedRoles.includes(role.code);
                  return (
                    <div
                      key={role.code}
                      className={`checklist-item ${isChecked ? 'checklist-item--checked' : ''}`}
                      onClick={() => handleToggleRole(role.code)}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}}
                      />
                      <div className="checklist-info">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <strong>{role.name}</strong>
                          {isChecked && <span className="badge-level badge-level--root" style={{ fontSize: '9.5px', padding: '1px 6px' }}>Đã chọn</span>}
                        </div>
                        <p>{role.description}</p>
                        {role.capabilities && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '6px' }}>
                            {role.capabilities.map((cap, i) => (
                              <span key={i} className="user-tag badge--gray" style={{ fontSize: '10px', padding: '1px 5px' }}>
                                <span className="icon-xs">{ICONS.check}</span> {cap}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="confirm-note-box mt-3">
              <span className="confirm-note-box__icon">{ICONS.info}</span>
              <span>Lưu ý: Quyền hạn mới sẽ có hiệu lực ngay lập tức sau khi lưu. Mọi thao tác đều được ghi vào Audit Log hệ thống.</span>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={submitting}>
              Hủy bỏ
            </button>
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? 'Đang lưu cấu hình...' : 'Lưu phân quyền & phạm vi'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RoleScopeModal;
