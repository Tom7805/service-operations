import React, { useEffect, useState } from 'react';
import type { Department, MoveDepartmentPayload } from '../types/departmentTypes';
import { DepartmentApiError } from '../api/departmentsApi';
import { getUnitTypeRank } from '../constants/departmentUnitTypes';
import { ICONS } from '../../../components/common/icons';

interface DepartmentMoveModalProps {
  isOpen: boolean;
  department: Department | null;
  departmentsList: Department[];
  onClose: () => void;
  onConfirmMove: (id: number, payload: MoveDepartmentPayload) => Promise<void>;
}

export const DepartmentMoveModal: React.FC<DepartmentMoveModalProps> = ({
  isOpen,
  department,
  departmentsList,
  onClose,
  onConfirmMove,
}) => {
  const [newParentId, setNewParentId] = useState<number | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && department) {
      setNewParentId(department.parentId);
      setServerError(null);
      setSubmitting(false);
    }
  }, [isOpen, department]);

  if (!isOpen || !department) return null;

  // Filter out invalid parent selections (self and direct/indirect descendants)
  const getDisabledParentIds = (targetId: number): Set<number> => {
    const disabled = new Set<number>();
    disabled.add(targetId);

    const findChildren = (pid: number) => {
      departmentsList.forEach((d) => {
        if (d.parentId === pid && !disabled.has(d.id)) {
          disabled.add(d.id);
          findChildren(d.id);
        }
      });
    };
    findChildren(targetId);
    return disabled;
  };

  const disabledParents = getDisabledParentIds(department.id);

  // Cấp bậc: không cho di chuyển một đơn vị vào làm con của đơn vị cấp thấp hơn
  // (vd: Ban không thể trực thuộc Phòng) — chặn ngay từ UI, khớp với validate ở backend.
  const isHierarchyInvalidParent = (parentDept: Department): boolean =>
    getUnitTypeRank(department.unitType) < getUnitTypeRank(parentDept.unitType);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    if (newParentId === department.parentId) {
      onClose();
      return;
    }

    setSubmitting(true);
    try {
      await onConfirmMove(department.id, { parentId: newParentId });
      onClose();
    } catch (err) {
      if (err instanceof DepartmentApiError) {
        if (err.code === 'INVALID_STATE') {
          setServerError('Không thể di chuyển: Hành động này tạo vòng lặp trong cây tổ chức.');
        } else if (err.code === 'DUPLICATE_DATA') {
          setServerError('Tên bộ phận này đã tồn tại tại vị trí bộ phận cha được chọn.');
        } else if (err.code === 'HIERARCHY_VIOLATION') {
          setServerError(`Không thể di chuyển: "${department.name}" không thể trực thuộc một bộ phận có cấp thấp hơn.`);
        } else {
          setServerError(err.message);
        }
      } else {
        setServerError(err instanceof Error ? err.message : 'Không thể di chuyển vị trí bộ phận.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const currentParentName = departmentsList.find((d) => d.id === department.parentId)?.name || 'Ban Giám Đốc (Cấp gốc)';

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-card modal-card--sm" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3 className="modal-title">Thay đổi vị trí bộ phận</h3>
          </div>
          <button type="button" className="modal-close" onClick={onClose}>
            <span className="icon-sm">{ICONS.close}</span>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {serverError && (
              <div className="alert alert--error mb-4" role="alert">
                <span className="alert__icon">{ICONS.alertTriangle}</span>
                <span>{serverError}</span>
              </div>
            )}

            <p style={{ margin: '0 0 14px', fontSize: '13.5px', lineHeight: '1.5' }}>
              Bạn đang thực hiện di chuyển bộ phận <strong>{department.name}</strong> sang nhánh mới trong cây tổ chức.
            </p>

            <div className="move-location-preview mb-4">
              <div className="location-box">
                <span className="location-label">Vị trí hiện tại:</span>
                <strong className="location-value">{currentParentName}</strong>
              </div>
              <div className="arrow-down">{ICONS.arrowDown}</div>
              <div className="location-box location-box--active">
                <span className="location-label">Vị trí mới mong muốn:</span>
                <select
                  className="form-select mt-1"
                  value={newParentId ?? ''}
                  onChange={(e) => setNewParentId(e.target.value ? Number(e.target.value) : null)}
                >
                  <option value="">-- Chuyển thành bộ phận cấp gốc (Root Level) --</option>
                  {departmentsList.map((dept) => {
                    const isDisabled = disabledParents.has(dept.id) || isHierarchyInvalidParent(dept);
                    return (
                      <option key={dept.id} value={dept.id} disabled={isDisabled}>
                        {dept.name} {disabledParents.has(dept.id) ? '(Vòng lặp / Không hợp lệ)' : isHierarchyInvalidParent(dept) ? '(Cấp thấp hơn, không hợp lệ)' : ''}
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>

            <div className="confirm-note-box">
              <span className="confirm-note-box__icon">{ICONS.info}</span>
              <span>Việc di chuyển bộ phận sẽ kéo theo toàn bộ các bộ phận con trực thuộc sang nhánh quản lý mới.</span>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={submitting}>
              Hủy bỏ
            </button>
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? 'Đang di chuyển...' : 'Xác nhận di chuyển'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DepartmentMoveModal;
