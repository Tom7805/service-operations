import React, { useState } from 'react';
import type { Department } from '../types/departmentTypes';
import { DepartmentApiError } from '../api/departmentsApi';

interface DepartmentDeleteModalProps {
  isOpen: boolean;
  department: Department | null;
  hasChildren: boolean;
  onClose: () => void;
  onConfirmDelete: (id: number) => Promise<void>;
}

export const DepartmentDeleteModal: React.FC<DepartmentDeleteModalProps> = ({
  isOpen,
  department,
  hasChildren,
  onClose,
  onConfirmDelete,
}) => {
  const [serverError, setServerError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  if (!isOpen || !department) return null;

  const handleDelete = async () => {
    setServerError(null);

    if (hasChildren) {
      setServerError('Không thể xóa bộ phận đang có các bộ phận con. Vui lòng di chuyển hoặc xóa các bộ phận con trước.');
      return;
    }

    setDeleting(true);
    try {
      await onConfirmDelete(department.id);
      onClose();
    } catch (err) {
      if (err instanceof DepartmentApiError) {
        if (err.code === 'INVALID_STATE') {
          if (err.message.includes('bo phan con') || err.message.includes('bộ phận con')) {
            setServerError('Không thể xóa bộ phận này vì vẫn còn bộ phận con phụ thuộc.');
          } else if (err.message.includes('duoc su dung') || err.message.includes('được sử dụng')) {
            setServerError('Không thể xóa bộ phận này vì đang có nhân sự/tài khoản thuộc bộ phận.');
          } else {
            setServerError(err.message);
          }
        } else {
          setServerError(err.message);
        }
      } else {
        setServerError(err instanceof Error ? err.message : 'Không thể xóa bộ phận.');
      }
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-card modal-card--sm" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title text-danger">🗑️ Xác nhận xóa bộ phận</h3>
          <button type="button" className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="modal-body">
          {serverError && (
            <div className="alert alert--error mb-4" role="alert">
              <span>⚠️ {serverError}</span>
            </div>
          )}

          <p style={{ margin: '0 0 12px', fontSize: '14px', lineHeight: '1.5' }}>
            Bạn có chắc chắn muốn xóa bộ phận <strong>{department.name}</strong> không?
          </p>

          {hasChildren && (
            <div className="alert alert--error mb-3" style={{ fontSize: '12.5px' }}>
              <span>⚠️ <strong>Cảnh báo:</strong> Bộ phận này hiện có bộ phận con trực thuộc. Hệ thống sẽ từ chối thao tác xóa cho đến khi các bộ phận con được di chuyển hoặc xóa.</span>
            </div>
          )}

          <div className="confirm-note-box">
            <span>ℹ️ Thao tác xóa sẽ được lưu vào nhật ký hệ thống. Không thể hoàn tác sau khi đã thực hiện.</span>
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={deleting}>
            Hủy bỏ
          </button>
          <button type="button" className="btn-primary btn-danger" onClick={handleDelete} disabled={deleting}>
            {deleting ? 'Đang xóa...' : 'Xác nhận xóa bộ phận'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DepartmentDeleteModal;
