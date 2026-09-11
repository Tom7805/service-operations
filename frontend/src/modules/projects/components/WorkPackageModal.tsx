import { useEffect, useState } from 'react';
import { ICONS } from '../../../components/common/icons';
import type { WorkBreakdownRes, WorkPackageReq } from '../types/taskTypes';
import { createWorkPackage, ProjectsApiError } from '../api/projectsApi';
import { validateWorkPackageForm } from '../validators/projectValidators';

export interface WorkPackageModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: number;
  parentId?: number | null;
  parentName?: string | null;
  onSaved?: (wp: WorkBreakdownRes) => void;
}

export default function WorkPackageModal({
  isOpen,
  onClose,
  projectId,
  parentId = null,
  parentName,
  onSaved,
}: WorkPackageModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [sortOrder, setSortOrder] = useState<string>('0');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setName('');
      setDescription('');
      setSortOrder('0');
      setErrors({});
      setServerError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const isSubPackage = Boolean(parentId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    const sortOrderNum = sortOrder.trim() === '' ? 0 : Number(sortOrder);
    const payload: WorkPackageReq = {
      parentId: parentId ?? null,
      name: name.trim(),
      description: description.trim() || null,
      sortOrder: Number.isNaN(sortOrderNum) ? 0 : sortOrderNum,
    };

    const validation = validateWorkPackageForm(payload);
    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    setSubmitting(true);
    setServerError(null);

    try {
      const res = await createWorkPackage(projectId, payload);
      onSaved?.(res);
      onClose();
    } catch (err: unknown) {
      if (err instanceof ProjectsApiError) {
        setServerError(err.message);
      } else if (err instanceof Error) {
        setServerError(err.message);
      } else {
        setServerError('Không thể tạo hạng mục. Vui lòng thử lại.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="work-package-modal-title"
    >
      <div className="modal-card project-modal-card">
        <div className="modal-header">
          <div className="modal-header__title-wrap">
            <h3 id="work-package-modal-title" className="modal-title">
              <span className="modal-title__icon">{ICONS.folder}</span>
              {isSubPackage ? 'Thêm hạng mục con' : 'Thêm hạng mục gốc'}
            </h3>
            {isSubPackage && parentName && (
              <p className="field-hint">
                Thuộc hạng mục cha: <strong>{parentName}</strong>
              </p>
            )}
          </div>
          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            disabled={submitting}
            aria-label="Đóng"
          >
            {ICONS.close}
          </button>
        </div>

        <div className="modal-body" style={{ overflowY: 'auto' }}>
          {serverError && (
            <div className="alert-box alert-box--danger" role="alert" data-testid="wp-server-error" style={{ marginBottom: '14px' }}>
              {serverError}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate data-testid="work-package-form">
            <div className="form-group" style={{ marginBottom: '14px' }}>
              <label className="form-label" htmlFor="wp-name">
                Tên hạng mục <span className="field-required">*</span>
              </label>
              <input
                id="wp-name"
                type="text"
                className={`form-input ${errors.name ? 'form-input--error' : ''}`}
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setErrors((prev) => ({ ...prev, name: '' }));
                  setServerError(null);
                }}
                placeholder="Nhập tên hạng mục (ví dụ: Phân tích yêu cầu, Thiết kế hệ thống...)"
                disabled={submitting}
                autoFocus
              />
              {errors.name && (
                <p className="field-error" data-testid="error-wp-name" style={{ color: '#DC2626', fontSize: '13px', marginTop: '4px' }}>
                  {errors.name}
                </p>
              )}
            </div>

            <div className="form-group" style={{ marginBottom: '14px' }}>
              <label className="form-label" htmlFor="wp-description">
                Mô tả hạng mục
              </label>
              <textarea
                id="wp-description"
                className="form-input"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Mô tả phạm vi hoặc mục tiêu của hạng mục..."
                disabled={submitting}
              />
            </div>

            <div className="form-group" style={{ marginBottom: '18px' }}>
              <label className="form-label" htmlFor="wp-sort-order">
                Thứ tự sắp xếp
              </label>
              <input
                id="wp-sort-order"
                type="number"
                className="form-input"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                placeholder="0"
                disabled={submitting}
                style={{ maxWidth: '140px' }}
              />
              <p className="field-hint" style={{ fontSize: '12px', marginTop: '4px', color: '#64748B' }}>
                Số nhỏ hơn sẽ hiển thị trước trên cây cơ cấu công việc.
              </p>
            </div>

            <div className="modal-footer" style={{ padding: '16px 0 0', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onClose}
                disabled={submitting}
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={submitting}
                data-testid="submit-wp-btn"
              >
                {submitting ? 'Đang lưu…' : isSubPackage ? 'Thêm hạng mục con' : 'Thêm hạng mục'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
