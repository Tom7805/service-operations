import { useEffect, useState } from 'react';
import { ICONS } from '../../../components/common/icons';
import type { ProjectMilestoneRes } from '../types/projectTypes';
import { completeMilestone, ProjectsApiError } from '../api/projectsApi';
import { validateMilestoneCompleteForm } from '../validators/projectValidators';

export interface MilestoneCompleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: number;
  milestone: ProjectMilestoneRes | null;
  onSaved?: (milestone: ProjectMilestoneRes) => void;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function MilestoneCompleteModal({
  isOpen,
  onClose,
  projectId,
  milestone,
  onSaved,
}: MilestoneCompleteModalProps) {
  const [actualDate, setActualDate] = useState(today());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setActualDate(today());
      setErrors({});
      setServerError(null);
    }
  }, [isOpen]);

  if (!isOpen || !milestone) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    const validation = validateMilestoneCompleteForm({ actualDate });
    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    setSubmitting(true);
    setServerError(null);
    try {
      const res = await completeMilestone(projectId, milestone.id, { actualDate });
      onSaved?.(res);
      onClose();
    } catch (err: unknown) {
      if (err instanceof ProjectsApiError) {
        setServerError(err.message);
      } else if (err instanceof Error) {
        setServerError(err.message);
      } else {
        setServerError('Không thể ghi nhận ngày thực tế. Vui lòng thử lại.');
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
      aria-labelledby="milestone-complete-modal-title"
    >
      <div className="modal-card" style={{ width: 'min(100%, 420px)' }}>
        <div className="modal-header">
          <div className="modal-header__title-wrap">
            <h3 id="milestone-complete-modal-title" className="modal-title">
              <span className="modal-title__icon">{ICONS.checkCircle}</span>
              Ghi nhận ngày hoàn thành
            </h3>
            <p className="field-hint">
              Mốc: <strong>{milestone.name}</strong>
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

        <div className="modal-body">
          {serverError && (
            <div
              className="alert-box alert-box--danger"
              role="alert"
              data-testid="milestone-complete-server-error"
              style={{ marginBottom: '14px' }}
            >
              {serverError}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate data-testid="milestone-complete-form">
            <div className="form-group" style={{ marginBottom: '18px' }}>
              <label className="form-label" htmlFor="milestone-actual-date">
                Ngày thực tế hoàn thành <span className="field-required">*</span>
              </label>
              <input
                id="milestone-actual-date"
                type="date"
                className={`form-input ${errors.actualDate ? 'form-input--error' : ''}`}
                value={actualDate}
                onChange={(e) => {
                  setActualDate(e.target.value);
                  setErrors((prev) => ({ ...prev, actualDate: '' }));
                  setServerError(null);
                }}
                disabled={submitting}
                autoFocus
              />
              {errors.actualDate && (
                <p
                  className="field-error"
                  data-testid="error-milestone-actual-date"
                  style={{ color: '#DC2626', fontSize: '13px', marginTop: '4px' }}
                >
                  {errors.actualDate}
                </p>
              )}
            </div>

            <div
              className="modal-footer"
              style={{ padding: '16px 0 0', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}
            >
              <button type="button" className="btn btn-secondary" onClick={onClose} disabled={submitting}>
                Hủy bỏ
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={submitting}
                data-testid="submit-milestone-complete-btn"
              >
                {submitting ? 'Đang lưu…' : 'Xác nhận hoàn thành'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
