import React, { useState, useEffect } from 'react';
import type { ScopeType, User } from '../types/userTypes';
import { SYSTEM_ROLES } from '../types/userTypes';
import { ICONS } from './icons';

interface RoleAssignModalProps {
  isOpen: boolean;
  user: User | null;
  onClose: () => void;
  onSave: (userId: number, roleCodes: string[], scopeType: ScopeType) => Promise<void>;
}

export const RoleAssignModal: React.FC<RoleAssignModalProps> = ({
  isOpen,
  user,
  onClose,
  onSave,
}) => {
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [scopeType, setScopeType] = useState<ScopeType>('COMPANY');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setSelectedRoles(user.roleCodes || []);
      setScopeType('COMPANY');
      setError(null);
    }
  }, [user, isOpen]);

  if (!isOpen || !user) return null;

  const handleToggle = (code: string) => {
    if (selectedRoles.includes(code)) {
      if (selectedRoles.length === 1) {
        setError('Tài khoản phải duy trì ít nhất một vai trò trong hệ thống.');
        return;
      }
      setError(null);
      setSelectedRoles(selectedRoles.filter((r) => r !== code));
    } else {
      setError(null);
      setSelectedRoles([...selectedRoles, code]);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedRoles.length === 0) {
      setError('Vui lòng chọn ít nhất 01 vai trò.');
      return;
    }
    setSubmitting(true);
    try {
      await onSave(user.id, selectedRoles, scopeType);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể cập nhật quyền tài khoản.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-card modal-card--md" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <span className="modal-eyebrow">Phân quyền & Vai trò</span>
            <h2 className="modal-title">Cấu hình tài khoản: {user.fullName}</h2>
          </div>
          <button type="button" className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <form onSubmit={handleFormSubmit}>
          <div className="modal-body">
            {error && (
              <div className="alert alert--error" role="alert">
                <span className="alert__icon">{ICONS.alertTriangle}</span>
                <p>{error}</p>
              </div>
            )}

            <div className="user-assign-summary">
              <div className="avatar-circle avatar-circle--lg">{user.fullName.charAt(0).toUpperCase()}</div>
              <div>
                <strong className="d-block">{user.fullName}</strong>
                <span className="text-muted font-sm">@{user.username} • {user.email || 'Chưa có email'}</span>
              </div>
            </div>

            <div className="form-field mt-4">
              <label className="form-label">Phạm vi truy cập dữ liệu (Data Scope)</label>
              <div className="scope-options">
                <label className={`scope-radio ${scopeType === 'COMPANY' ? 'scope-radio--active' : ''}`}>
                  <input
                    type="radio"
                    name="scopeType"
                    value="COMPANY"
                    checked={scopeType === 'COMPANY'}
                    onChange={() => setScopeType('COMPANY')}
                  />
                  <div>
                    <strong>Toàn công ty (Company-wide)</strong>
                    <p>Truy cập dữ liệu trên toàn hệ thống công ty.</p>
                  </div>
                </label>
                <label className={`scope-radio ${scopeType === 'DEPARTMENT' ? 'scope-radio--active' : ''}`}>
                  <input
                    type="radio"
                    name="scopeType"
                    value="DEPARTMENT"
                    checked={scopeType === 'DEPARTMENT'}
                    onChange={() => setScopeType('DEPARTMENT')}
                  />
                  <div>
                    <strong>Trong bộ phận (Department-level)</strong>
                    <p>Chỉ truy cập dữ liệu thuộc nhánh phòng ban của mình.</p>
                  </div>
                </label>
                <label className={`scope-radio ${scopeType === 'PERSONAL' ? 'scope-radio--active' : ''}`}>
                  <input
                    type="radio"
                    name="scopeType"
                    value="PERSONAL"
                    checked={scopeType === 'PERSONAL'}
                    onChange={() => setScopeType('PERSONAL')}
                  />
                  <div>
                    <strong>Cá nhân (Self-only)</strong>
                    <p>Chỉ xem và thao tác dữ liệu được giao cho chính mình.</p>
                  </div>
                </label>
              </div>
            </div>

            <div className="form-field mt-4">
              <label className="form-label">Chọn các vai trò áp dụng</label>
              <div className="roles-checklist">
                {SYSTEM_ROLES.map((role) => {
                  const isChecked = selectedRoles.includes(role.code);
                  return (
                    <div
                      key={role.code}
                      className={`checklist-item ${isChecked ? 'checklist-item--checked' : ''}`}
                      onClick={() => handleToggle(role.code)}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}}
                      />
                      <div className="checklist-info">
                        <strong>{role.name}</strong>
                        <p>{role.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={submitting}>
              Hủy
            </button>
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? 'Đang lưu...' : 'Lưu cấu hình phân quyền'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RoleAssignModal;
