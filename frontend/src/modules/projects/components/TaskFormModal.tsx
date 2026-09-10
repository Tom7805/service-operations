import { useEffect, useState } from 'react';
import { ICONS } from '../../../components/common/icons';
import type { TaskCreateReq, TaskRes } from '../types/taskTypes';
import { createTask, ProjectsApiError } from '../api/projectsApi';
import { validateTaskCreateForm } from '../validators/projectValidators';

export interface TaskFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: number;
  workPackageId: number;
  workPackageName?: string;
  parentTaskId?: number | null;
  parentTaskName?: string | null;
  onSaved?: (task: TaskRes) => void;
}

export default function TaskFormModal({
  isOpen,
  onClose,
  projectId,
  workPackageId,
  workPackageName,
  parentTaskId = null,
  parentTaskName,
  onSaved,
}: TaskFormModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [expectedStartDate, setExpectedStartDate] = useState('');
  const [expectedEndDate, setExpectedEndDate] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setName('');
      setDescription('');
      setExpectedStartDate('');
      setExpectedEndDate('');
      setErrors({});
      setServerError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const isSubTask = Boolean(parentTaskId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    const payload: TaskCreateReq = {
      parentTaskId: parentTaskId ?? null,
      name: name.trim(),
      description: description.trim() || null,
      expectedStartDate: expectedStartDate.trim() || null,
      expectedEndDate: expectedEndDate.trim() || null,
    };

    const validation = validateTaskCreateForm(payload);
    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    setSubmitting(true);
    setServerError(null);

    try {
      const res = await createTask(projectId, workPackageId, payload);
      onSaved?.(res);
      onClose();
    } catch (err: unknown) {
      if (err instanceof ProjectsApiError) {
        setServerError(err.message);
      } else if (err instanceof Error) {
        setServerError(err.message);
      } else {
        setServerError('Không thể tạo công việc. Vui lòng thử lại.');
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
      aria-labelledby="task-form-modal-title"
    >
      <div className="modal-card project-modal-card">
        <div className="modal-header">
          <div className="modal-header__title-wrap">
            <h3 id="task-form-modal-title" className="modal-title">
              <span className="modal-title__icon">{ICONS.target}</span>
              {isSubTask ? 'Thêm công việc con' : 'Thêm công việc mới'}
            </h3>
            <p className="field-hint">
              {workPackageName && (
                <>
                  Hạng mục: <strong>{workPackageName}</strong>
                </>
              )}
              {isSubTask && parentTaskName && (
                <>
                  {' · '}Thuộc việc cha: <strong>{parentTaskName}</strong>
                </>
              )}
            </p>
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
            <div className="alert-box alert-box--danger" role="alert" data-testid="task-server-error" style={{ marginBottom: '14px' }}>
              {serverError}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate data-testid="task-form">
            <div className="form-group" style={{ marginBottom: '14px' }}>
              <label className="form-label" htmlFor="task-name">
                Tên công việc <span className="field-required">*</span>
              </label>
              <input
                id="task-name"
                type="text"
                className={`form-input ${errors.name ? 'form-input--error' : ''}`}
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setErrors((prev) => ({ ...prev, name: '' }));
                  setServerError(null);
                }}
                placeholder="Nhập tên công việc..."
                disabled={submitting}
                autoFocus
              />
              {errors.name && (
                <p className="field-error" data-testid="error-task-name" style={{ color: '#DC2626', fontSize: '13px', marginTop: '4px' }}>
                  {errors.name}
                </p>
              )}
            </div>

            <div className="form-group" style={{ marginBottom: '14px' }}>
              <label className="form-label" htmlFor="task-description">
                Mô tả công việc
              </label>
              <textarea
                id="task-description"
                className="form-input"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Mô tả chi tiết nội dung, kết quả mong đợi..."
                disabled={submitting}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '18px' }}>
              <div className="form-group">
                <label className="form-label" htmlFor="task-start-date">
                  Ngày bắt đầu dự kiến
                </label>
                <input
                  id="task-start-date"
                  type="date"
                  className="form-input"
                  value={expectedStartDate}
                  onChange={(e) => {
                    setExpectedStartDate(e.target.value);
                    setErrors((prev) => ({ ...prev, expectedEndDate: '' }));
                    setServerError(null);
                  }}
                  disabled={submitting}
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="task-end-date">
                  Ngày kết thúc dự kiến
                </label>
                <input
                  id="task-end-date"
                  type="date"
                  className={`form-input ${errors.expectedEndDate ? 'form-input--error' : ''}`}
                  value={expectedEndDate}
                  onChange={(e) => {
                    setExpectedEndDate(e.target.value);
                    setErrors((prev) => ({ ...prev, expectedEndDate: '' }));
                    setServerError(null);
                  }}
                  disabled={submitting}
                />
                {errors.expectedEndDate && (
                  <p className="field-error" data-testid="error-task-end-date" style={{ color: '#DC2626', fontSize: '13px', marginTop: '4px' }}>
                    {errors.expectedEndDate}
                  </p>
                )}
              </div>
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
                data-testid="submit-task-btn"
              >
                {submitting ? 'Đang lưu…' : isSubTask ? 'Thêm việc con' : 'Thêm công việc'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
