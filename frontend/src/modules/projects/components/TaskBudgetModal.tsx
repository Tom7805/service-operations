import { useEffect, useState } from 'react';
import { ICONS } from '../../../components/common/icons';
import type { TaskBudgetReq, TaskBudgetStatusRes } from '../types/taskTypes';
import { setTaskBudget, ProjectsApiError } from '../api/projectsApi';
import { validateTaskBudgetForm } from '../validators/projectValidators';

export interface TaskBudgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: number;
  taskId: number;
  taskName?: string;
  /** Ngân sách hiện tại (nếu đã đặt trước đó) — hiển thị sẵn để sửa. */
  currentBudgetHours?: number | null;
  onSaved?: (status: TaskBudgetStatusRes) => void;
}

/**
 * NCL-05-CN-005: Đặt (hoặc đổi) ngân sách giờ công cho một công việc.
 * Gọi lại nhiều lần sẽ GHI ĐÈ ngân sách hiện tại, không cộng dồn.
 */
export default function TaskBudgetModal({
  isOpen,
  onClose,
  projectId,
  taskId,
  taskName,
  currentBudgetHours,
  onSaved,
}: TaskBudgetModalProps) {
  const [budgetHours, setBudgetHours] = useState<string>('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setBudgetHours(currentBudgetHours != null ? String(currentBudgetHours) : '');
      setErrors({});
      setServerError(null);
    }
  }, [isOpen, currentBudgetHours]);

  if (!isOpen) return null;

  const isEditing = currentBudgetHours != null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    const parsed = budgetHours.trim() === '' ? NaN : Number(budgetHours);
    const payload: TaskBudgetReq = { budgetHours: parsed };

    const validation = validateTaskBudgetForm(payload);
    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    setSubmitting(true);
    setServerError(null);

    try {
      const status = await setTaskBudget(projectId, taskId, payload);
      onSaved?.(status);
      onClose();
    } catch (err: unknown) {
      if (err instanceof ProjectsApiError) {
        setServerError(err.message);
      } else if (err instanceof Error) {
        setServerError(err.message);
      } else {
        setServerError('Không thể đặt ngân sách giờ công. Vui lòng thử lại.');
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
      aria-labelledby="task-budget-modal-title"
    >
      <div className="modal-card">
        <div className="modal-header">
          <div className="modal-header__title-wrap">
            <h3 id="task-budget-modal-title" className="modal-title">
              <span className="modal-title__icon">{ICONS.clock}</span>
              {isEditing ? 'Đổi ngân sách giờ công' : 'Đặt ngân sách giờ công'}
            </h3>
            {taskName && (
              <p className="field-hint">
                Công việc: <strong>{taskName}</strong>
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
            <div className="alert-box alert-box--danger" role="alert" data-testid="task-budget-server-error" style={{ marginBottom: '14px' }}>
              {serverError}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate data-testid="task-budget-form">
            <div className="form-group" style={{ marginBottom: '14px' }}>
              <label className="form-label" htmlFor="task-budget-hours">
                Ngân sách giờ công <span className="field-required">*</span>
              </label>
              <input
                id="task-budget-hours"
                type="number"
                min="0.01"
                step="0.5"
                className={`form-input ${errors.budgetHours ? 'form-input--error' : ''}`}
                value={budgetHours}
                onChange={(e) => {
                  setBudgetHours(e.target.value);
                  setErrors((prev) => ({ ...prev, budgetHours: '' }));
                  setServerError(null);
                }}
                placeholder="Ví dụ: 40"
                disabled={submitting}
                autoFocus
                style={{ maxWidth: '160px' }}
              />
              {errors.budgetHours && (
                <p className="field-error" data-testid="error-task-budget-hours" style={{ color: '#DC2626', fontSize: '13px', marginTop: '4px' }}>
                  {errors.budgetHours}
                </p>
              )}
              {isEditing && (
                <p className="field-hint" style={{ fontSize: '12px', marginTop: '4px', color: '#64748B' }}>
                  Gọi lại sẽ ghi đè ngân sách hiện tại ({currentBudgetHours} giờ), không cộng dồn.
                </p>
              )}
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
                data-testid="submit-task-budget-btn"
              >
                {submitting ? 'Đang lưu…' : isEditing ? 'Cập nhật ngân sách' : 'Đặt ngân sách'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
