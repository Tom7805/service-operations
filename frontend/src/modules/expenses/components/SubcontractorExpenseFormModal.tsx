import { useEffect, useState } from 'react';
import { ICONS } from '../../../components/common/icons';
import ModalPortal from '../../../components/common/ModalPortal';
import { createSubcontractorExpense, ExpensesApiError } from '../api/expensesApi';
import type { SubcontractorExpenseRes } from '../types/expenseTypes';
import {
  validateSubcontractorExpenseForm,
  type SubcontractorExpenseFormErrors,
} from '../validators/expenseValidators';
import { useDialogA11y } from '../../projects/components/deliveryUi';

export interface SubcontractorExpenseFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: number;
  onSaved?: (expense: SubcontractorExpenseRes) => void;
}

function todayIso(): string {
  // Ngày theo lịch địa phương (YYYY-MM-DD) — khớp cách validator so sánh "tương lai" và
  // tránh lệch ngày do `toISOString()` quy đổi sang UTC.
  return new Date().toLocaleDateString('en-CA');
}

/**
 * Form ghi nhận chi phí thuê ngoài (NCL-08-CN-004). Chỉ Quản lý dự án (VT-02) và dự án phải
 * đang `RUNNING` — nếu không, backend trả `400 INVALID_STATE` và lỗi được hiển thị nguyên
 * văn (`serverError`) vì đây là điều kiện chỉ backend biết chắc tại thời điểm submit.
 * Phiếu tạo mới luôn ở trạng thái `SUBMITTED`, chờ Kế toán duyệt (nằm ngoài phạm vi màn này).
 */
export default function SubcontractorExpenseFormModal({
  isOpen,
  onClose,
  projectId,
  onSaved,
}: SubcontractorExpenseFormModalProps) {
  const [contractorName, setContractorName] = useState('');
  const [workScope, setWorkScope] = useState('');
  const [amount, setAmount] = useState('');
  const [incurredPeriod, setIncurredPeriod] = useState(todayIso());
  const [errors, setErrors] = useState<SubcontractorExpenseFormErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setContractorName('');
    setWorkScope('');
    setAmount('');
    setIncurredPeriod(todayIso());
    setErrors({});
    setServerError(null);
  }, [isOpen]);

  const dialogRef = useDialogA11y(isOpen, onClose, submitting);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    const validation = validateSubcontractorExpenseForm({ contractorName, workScope, amount, incurredPeriod });
    if (Object.keys(validation).length > 0) {
      setErrors(validation);
      return;
    }

    setSubmitting(true);
    setServerError(null);
    try {
      const res = await createSubcontractorExpense(projectId, {
        contractorName: contractorName.trim(),
        workScope: workScope.trim(),
        amount: Number(amount),
        incurredPeriod,
      });
      onSaved?.(res);
      onClose();
    } catch (err: unknown) {
      const message =
        err instanceof ExpensesApiError || err instanceof Error
          ? err.message
          : 'Không thể ghi nhận chi phí thuê ngoài. Vui lòng thử lại.';
      setServerError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ModalPortal>
      <div
        className="modal-backdrop"
        onClick={(e) => {
          if (e.target === e.currentTarget && !submitting) onClose();
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="subcontractor-expense-form-title"
      >
        <div ref={dialogRef} className="modal-card dl-modal project-modal-card">
          <div className="modal-header">
            <div className="modal-header__title-wrap">
              <h3 id="subcontractor-expense-form-title" className="modal-title">
                <span className="modal-title__icon">{ICONS.briefcase}</span>
                Ghi nhận chi phí thuê ngoài
              </h3>
            </div>
            <button type="button" className="modal-close" onClick={onClose} disabled={submitting} aria-label="Đóng">
              {ICONS.close}
            </button>
          </div>

          <div className="modal-body" style={{ overflowY: 'auto' }}>
            {serverError && (
              <div
                className="alert-box alert-box--danger"
                role="alert"
                data-testid="subcontractor-expense-server-error"
                style={{ marginBottom: '14px' }}
              >
                {serverError}
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate data-testid="subcontractor-expense-form">
              <div className="form-group" style={{ marginBottom: '14px' }}>
                <label className="form-label" htmlFor="subcontractor-name">
                  Nhà thầu <span className="field-required">*</span>
                </label>
                <input
                  id="subcontractor-name"
                  type="text"
                  className={`form-input ${errors.contractorName ? 'form-input--error' : ''}`}
                  value={contractorName}
                  onChange={(e) => {
                    setContractorName(e.target.value);
                    setErrors((prev) => ({ ...prev, contractorName: undefined }));
                    setServerError(null);
                  }}
                  placeholder="Ví dụ: Công ty TNHH Xây dựng ABC"
                  maxLength={200}
                  disabled={submitting}
                  autoFocus
                />
                {errors.contractorName && (
                  <p className="field-error" data-testid="error-contractor-name" style={{ color: 'var(--pale-red-fg)', fontSize: '13px', marginTop: '4px' }}>
                    {errors.contractorName}
                  </p>
                )}
              </div>

              <div className="form-group" style={{ marginBottom: '14px' }}>
                <label className="form-label" htmlFor="subcontractor-work-scope">
                  Phạm vi công việc <span className="field-required">*</span>
                </label>
                <textarea
                  id="subcontractor-work-scope"
                  className={`form-input ${errors.workScope ? 'form-input--error' : ''}`}
                  rows={3}
                  value={workScope}
                  onChange={(e) => {
                    setWorkScope(e.target.value);
                    setErrors((prev) => ({ ...prev, workScope: undefined }));
                    setServerError(null);
                  }}
                  placeholder="Mô tả công việc nhà thầu phụ thực hiện..."
                  maxLength={1000}
                  disabled={submitting}
                />
                {errors.workScope && (
                  <p className="field-error" data-testid="error-work-scope" style={{ color: 'var(--pale-red-fg)', fontSize: '13px', marginTop: '4px' }}>
                    {errors.workScope}
                  </p>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '18px' }}>
                <div className="form-group">
                  <label className="form-label" htmlFor="subcontractor-amount">
                    Số tiền (đ) <span className="field-required">*</span>
                  </label>
                  <input
                    id="subcontractor-amount"
                    type="number"
                    min="0.01"
                    step="0.01"
                    className={`form-input ${errors.amount ? 'form-input--error' : ''}`}
                    value={amount}
                    onChange={(e) => {
                      setAmount(e.target.value);
                      setErrors((prev) => ({ ...prev, amount: undefined }));
                      setServerError(null);
                    }}
                    placeholder="0"
                    disabled={submitting}
                  />
                  {errors.amount && (
                    <p className="field-error" data-testid="error-amount" style={{ color: 'var(--pale-red-fg)', fontSize: '13px', marginTop: '4px' }}>
                      {errors.amount}
                    </p>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="subcontractor-period">
                    Kỳ phát sinh <span className="field-required">*</span>
                  </label>
                  <input
                    id="subcontractor-period"
                    type="date"
                    max={todayIso()}
                    className={`form-input ${errors.incurredPeriod ? 'form-input--error' : ''}`}
                    value={incurredPeriod}
                    onChange={(e) => {
                      setIncurredPeriod(e.target.value);
                      setErrors((prev) => ({ ...prev, incurredPeriod: undefined }));
                      setServerError(null);
                    }}
                    disabled={submitting}
                  />
                  {errors.incurredPeriod && (
                    <p className="field-error" data-testid="error-incurred-period" style={{ color: 'var(--pale-red-fg)', fontSize: '13px', marginTop: '4px' }}>
                      {errors.incurredPeriod}
                    </p>
                  )}
                </div>
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
                  data-testid="submit-subcontractor-expense-btn"
                >
                  {submitting ? 'Đang lưu…' : 'Ghi nhận chi phí'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
