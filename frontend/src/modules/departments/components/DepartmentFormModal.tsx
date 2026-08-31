import React, { useEffect, useState } from 'react';
import type {
  CreateDepartmentPayload,
  Department,
  DepartmentUnitType,
  ManagerUserOption,
  UpdateDepartmentPayload,
} from '../types/departmentTypes';
import { DepartmentApiError } from '../api/departmentsApi';
import { ICONS } from '../../../components/common/icons';
import {
  DEPARTMENT_UNIT_TYPE_META,
  DEPARTMENT_UNIT_TYPE_OPTIONS,
  getUnitTypeRank,
} from '../constants/departmentUnitTypes';

interface DepartmentFormModalProps {
  isOpen: boolean;
  editingDepartment: Department | null;
  defaultParentId?: number | null;
  departmentsList: Department[];
  managersList: ManagerUserOption[];
  onClose: () => void;
  onSubmitCreate: (payload: CreateDepartmentPayload) => Promise<void>;
  onSubmitUpdate: (id: number, payload: UpdateDepartmentPayload) => Promise<void>;
}

export const DepartmentFormModal: React.FC<DepartmentFormModalProps> = ({
  isOpen,
  editingDepartment,
  defaultParentId = null,
  departmentsList,
  managersList,
  onClose,
  onSubmitCreate,
  onSubmitUpdate,
}) => {
  const [name, setName] = useState('');
  const [parentId, setParentId] = useState<number | null>(null);
  const [managerId, setManagerId] = useState<number | ''>('');
  const [unitType, setUnitType] = useState<DepartmentUnitType>('PHONG');

  const [fieldErrors, setFieldErrors] = useState<{ name?: string; managerId?: string }>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (editingDepartment) {
        setName(editingDepartment.name);
        setParentId(editingDepartment.parentId);
        setManagerId(editingDepartment.managerId ?? '');
        setUnitType(editingDepartment.unitType);
      } else {
        setName('');
        setParentId(defaultParentId);
        setManagerId(managersList.length > 0 ? managersList[0].id : '');
        setUnitType('PHONG');
      }
      setFieldErrors({});
      setServerError(null);
      setSubmitting(false);
    }
  }, [isOpen, editingDepartment, defaultParentId, managersList]);

  if (!isOpen) return null;

  // Filter valid parent options: avoid self and (when editing) any department currently under editing target
  const getDisabledParentIds = (targetId: number): Set<number> => {
    const disabled = new Set<number>();
    disabled.add(targetId);

    // Recursively collect children
    const findChildren = (pid: number) => {
      departmentsList.forEach((dept) => {
        if (dept.parentId === pid && !disabled.has(dept.id)) {
          disabled.add(dept.id);
          findChildren(dept.id);
        }
      });
    };
    findChildren(targetId);
    return disabled;
  };

  const disabledParents = editingDepartment ? getDisabledParentIds(editingDepartment.id) : new Set<number>();

  // Cấp bậc: một đơn vị không được trực thuộc đơn vị có cấp thấp hơn mình
  // (vd: Ban không thể là con của Phòng) — chặn ngay từ UI, khớp với validate ở backend.
  const isHierarchyInvalidParent = (parentDept: Department): boolean =>
    getUnitTypeRank(unitType) < getUnitTypeRank(parentDept.unitType);

  const validateForm = (): boolean => {
    const errors: { name?: string; managerId?: string } = {};

    if (!name.trim()) {
      errors.name = 'Tên bộ phận không được để trống';
    } else if (name.trim().length > 255) {
      errors.name = 'Tên bộ phận không được vượt quá 255 ký tự';
    }

    if (managerId === '' || managerId === null || Number.isNaN(Number(managerId))) {
      errors.managerId = 'Phải chọn người quản lý cho bộ phận';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    if (!validateForm()) return;

    setSubmitting(true);
    try {
      if (editingDepartment) {
        const payload: UpdateDepartmentPayload = {
          name: name.trim(),
          parentId: parentId ? Number(parentId) : null,
          managerId: Number(managerId),
          unitType,
        };
        await onSubmitUpdate(editingDepartment.id, payload);
      } else {
        const payload: CreateDepartmentPayload = {
          name: name.trim(),
          parentId: parentId ? Number(parentId) : null,
          managerId: Number(managerId),
          unitType,
        };
        await onSubmitCreate(payload);
      }
      onClose();
    } catch (err) {
      if (err instanceof DepartmentApiError) {
        if (err.code === 'DUPLICATE_DATA') {
          setServerError('Tên bộ phận đã tồn tại trong cùng cấp tổ chức. Vui lòng đặt tên khác.');
        } else if (err.code === 'INVALID_STATE') {
          setServerError('Không thể tạo vòng lặp trong cây tổ chức (Bộ phận cha không hợp lệ).');
        } else if (err.code === 'HIERARCHY_VIOLATION') {
          setServerError('Loại đơn vị này không thể trực thuộc bộ phận cấp thấp hơn đã chọn. Vui lòng chọn lại bộ phận cha hoặc loại đơn vị phù hợp.');
        } else {
          setServerError(err.message);
        }
      } else {
        setServerError(err instanceof Error ? err.message : 'Không thể lưu thông tin bộ phận.');
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
            <span className="modal-eyebrow">
              {editingDepartment ? 'Chỉnh sửa khai báo' : 'Khai báo mới'}
            </span>
            <h3 className="modal-title">
              {editingDepartment ? `Cập nhật: ${editingDepartment.name}` : 'Thêm bộ phận / Đơn vị mới'}
            </h3>
          </div>
          <button type="button" className="modal-close" onClick={onClose} title="Đóng modal">
            {ICONS.close}
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {serverError && (
              <div className="alert alert--error" role="alert">
                <span className="alert__icon">{ICONS.alertTriangle}</span>
                <span>{serverError}</span>
              </div>
            )}

            <div className="form-grid">
              {/* Department Name */}
              <div className="form-field--full">
                <label className="form-label" htmlFor="dept-name-input">
                  Tên bộ phận / Đơn vị <span className="req">*</span>
                </label>
                <input
                  id="dept-name-input"
                  type="text"
                  className={`form-input ${fieldErrors.name ? 'form-input--error' : ''}`}
                  placeholder="Ví dụ: Trung tâm Công nghệ & Giải pháp"
                  value={name}
                  maxLength={255}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (fieldErrors.name) setFieldErrors((prev) => ({ ...prev, name: undefined }));
                  }}
                  autoFocus
                />
                {fieldErrors.name && <span className="field-error">{fieldErrors.name}</span>}
                <span className="field-hint">Nhập tên chính thức của bộ phận trong sơ đồ cây tổ chức (Tối đa 255 ký tự).</span>
              </div>

              {/* Unit Type */}
              <div className="form-field--full">
                <label className="form-label" htmlFor="dept-unit-type-select">
                  Loại đơn vị <span className="req">*</span>
                </label>
                <select
                  id="dept-unit-type-select"
                  className="form-select"
                  value={unitType}
                  onChange={(e) => {
                    const nextType = e.target.value as DepartmentUnitType;
                    setUnitType(nextType);
                    const currentParent = departmentsList.find((d) => d.id === parentId);
                    if (currentParent && getUnitTypeRank(nextType) < getUnitTypeRank(currentParent.unitType)) {
                      setParentId(null);
                    }
                  }}
                >
                  {DEPARTMENT_UNIT_TYPE_OPTIONS.map((type) => (
                    <option key={type} value={type}>
                      {DEPARTMENT_UNIT_TYPE_META[type].label}
                    </option>
                  ))}
                </select>
                <span className="field-hint">Quyết định cấp bậc trong cây tổ chức: Trung tâm/Ban là cấp cao nhất, rồi đến Phòng, rồi Tổ/Nhóm.</span>
              </div>

              {/* Parent Department */}
              <div className="form-field--full">
                <label className="form-label" htmlFor="parent-dept-select">
                  Bộ phận cấp trên (Trực thuộc)
                </label>
                <select
                  id="parent-dept-select"
                  className="form-select"
                  value={parentId ?? ''}
                  onChange={(e) => setParentId(e.target.value ? Number(e.target.value) : null)}
                >
                  <option value="">-- Bộ phận cấp gốc (Root / Ban giám đốc) --</option>
                  {departmentsList.map((dept) => {
                    const isDisabled = disabledParents.has(dept.id) || isHierarchyInvalidParent(dept);
                    return (
                      <option key={dept.id} value={dept.id} disabled={isDisabled}>
                        {dept.name} {disabledParents.has(dept.id) ? '(Không hợp lệ / Vòng lặp)' : isHierarchyInvalidParent(dept) ? '(Cấp thấp hơn, không hợp lệ)' : ''}
                      </option>
                    );
                  })}
                </select>
                <span className="field-hint">Chọn bộ phận cha để sắp xếp thứ bậc cây tổ chức. Để trống nếu là cấp cao nhất.</span>
              </div>

              {/* Manager Selection */}
              <div className="form-field--full">
                <label className="form-label" htmlFor="manager-select">
                  Người quản lý (Trưởng bộ phận) <span className="req">*</span>
                </label>
                <select
                  id="manager-select"
                  className={`form-select ${fieldErrors.managerId ? 'form-input--error' : ''}`}
                  value={managerId}
                  onChange={(e) => {
                    setManagerId(e.target.value ? Number(e.target.value) : '');
                    if (fieldErrors.managerId) setFieldErrors((prev) => ({ ...prev, managerId: undefined }));
                  }}
                >
                  <option value="" disabled>-- Chọn nhân sự quản lý --</option>
                  {managersList.map((mgr) => (
                    <option key={mgr.id} value={mgr.id}>
                      {mgr.fullName} (@{mgr.username})
                    </option>
                  ))}
                </select>
                {fieldErrors.managerId && <span className="field-error">{fieldErrors.managerId}</span>}
                <span className="field-hint">Mỗi bộ phận yêu cầu phải được gán 1 người quản lý chịu trách nhiệm chính.</span>
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={submitting}>
              Hủy bỏ
            </button>
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? (
                <>
                  <span className="loader mr-2" /> Đang lưu...
                </>
              ) : editingDepartment ? (
                'Cập nhật bộ phận'
              ) : (
                'Tạo bộ phận mới'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DepartmentFormModal;
