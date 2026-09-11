import { useState, useEffect, type FormEvent } from 'react';
import { setTaskHourBudget } from '../../api/tasksApi';
import { ICONS } from '../../../components/common/icons';

interface TaskFormModalProps {
  isOpen: boolean;
  editingTask?: { id: number; hourBudget?: number } | null;
  onClose: () => void;
  /**
   * Called after the main task create/update succeeds.
   * Implementations can ignore it if they handle everything inside this modal.
   */
  onSubmitCreate?: (payload: any) => Promise<void>;
  onSubmitUpdate?: (id: number, payload: any) => Promise<void>;
}

export default function TaskFormModal({
  isOpen,
  editingTask,
  onClose,
  onSubmitCreate,
  onSubmitUpdate,
}: TaskFormModalProps) {
  const isEdit = Boolean(editingTask);

  const [hourBudget, setHourBudget] = useState('');
  const [errors, setErrors] = useState<{ hourBudget?: string }>({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  // Initialise when modal opens
  useEffect(() => {
    if (!isOpen) return;
    if (editingTask && editingTask.hourBudget != null) {
      setHourBudget(String(editingTask.hourBudget));
    } else {
      setHourBudget('');
    }
    setErrors({});
    setServerError(null);
  }, [isOpen, editingTask]);

  if (!isOpen) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setServerError(null);

    // Basic validation – allow empty (means clear budget)
    const budgetVal = hourBudget.trim() === '' ? undefined : Number(hourBudget);
    if (budgetVal !== undefined && (isNaN(budgetVal) || budgetVal <= 0)) {
      setErrors({ hourBudget: 'Ngân sách giờ công phải lớn hơn 0' });
      return;
    }

    try {
      setSubmitting(true);
      // Call backend endpoint to set the budget
      if (isEdit && editingTask) {
        await setTaskHourBudget(editingTask.id, budgetVal);
        if (onSubmitUpdate) await onSubmitUpdate(editingTask.id, { hourBudget: budgetVal });
      } else {
        if (onSubmitCreate) {
          await onSubmitCreate({ hourBudget: budgetVal });
        }
      }
      onClose();
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Lỗi khi lưu ngân sách giờ công');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="task-budget-modal-title">
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 id="task-budget-modal-title" className="modal-title">
            {isEdit ? 'Cập nhật ngân sách giờ công' : 'Đặt ngân sách giờ công cho công việc'}
          </h2>
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
                  <strong>Lỗi</strong>
                  <p>{serverError}</p>
                </div>
              </div>
            )}
            <div className="form-field">
              <label htmlFor="task-hour-budget" className="form-label">
                Ngân sách giờ công (giờ)
                <span className="req">*</span>
              </label>
              <input
                id="task-hour-budget"
                type="number"
                step="0.01"
                min="0.01"
                className={`form-input ${errors.hourBudget ? 'form-input--error' : ''}`}
                value={hourBudget}
                onChange={e => {
                  setHourBudget(e.target.value);
                  if (errors.hourBudget) setErrors({});
                }}
                placeholder="Ví dụ: 40"
                disabled={submitting}
              />
              {errors.hourBudget && <span className="field-error">{errors.hourBudget}</span>}
              <span className="field-hint">Để trống sẽ không đặt ngân sách (sử dụng mặc định backend).</span>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={submitting}>
              Hủy bỏ
            </button>
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? 'Đang lưu…' : isEdit ? 'Cập nhật' : 'Lưu'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

