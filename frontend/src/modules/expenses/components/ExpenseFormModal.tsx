import { useEffect, useState } from 'react';
import { ICONS } from '../../../components/common/icons';
import ModalPortal from '../../../components/common/ModalPortal';
import { createExpense, updateRejectedExpense, ExpensesApiError } from '../api/expensesApi';
import type { ExpenseRes, ExpenseType } from '../types/expenseTypes';
import { EXPENSE_TYPE_LABELS } from '../types/expenseTypes';
import { validateExpenseForm, type ExpenseFormErrors } from '../validators/expenseValidators';

export interface ExpenseFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: number;
  /** Truyền vào khi sửa & nộp lại phiếu bị từ chối; để trống/null khi ghi nhận mới. */
  expense?: ExpenseRes | null;
  onSaved?: (expense: ExpenseRes) => void;
}

const EXPENSE_TYPE_OPTIONS: ExpenseType[] = ['TRAVEL', 'TOOLS', 'OTHER'];

function todayIso(): string {
  return new Date().toLocaleDateString('en-CA');
}

// Số tiền gõ liền không dấu tách rất dễ đọc nhầm/đếm nhầm số 0 (1000000 vs 10000000) —
// hiển thị có dấu chấm ngăn cách hàng nghìn kiểu vi-VN khi gõ, vẫn lưu chuỗi chỉ-số vào
// state (khớp validator hiện có) và gửi lên server dạng number thường.
function formatVnAmount(rawDigits: string): string {
  if (!rawDigits) return '';
  return Number(rawDigits).toLocaleString('vi-VN');
}

/**
 * Form ghi nhận chi phí phát sinh của dự án (NCL-08-CN-001). Dùng chung cho hai luồng:
 * - Ghi nhận mới (`expense` để trống): `POST /projects/{projectId}/expenses`.
 * - Sửa & nộp lại phiếu bị từ chối (`expense` có giá trị, luôn ở trạng thái `REJECTED`):
 *   `PUT /expenses/{expenseId}`, phiếu chuyển lại về `SUBMITTED` và xóa lý do từ chối cũ.
 *
 * Chỉ Nhân viên chuyên môn (VT-03) và dự án phải đang `RUNNING` — nếu không, backend trả
 * `400 INVALID_STATE`, hiển thị nguyên văn qua `serverError`. Không có trường "tính cho
 * khách hàng" — đó là thao tác riêng của Quản lý dự án (NCL-08-CN-003).
 */
export default function ExpenseFormModal({ isOpen, onClose, projectId, expense = null, onSaved }: ExpenseFormModalProps) {
  const isEdit = Boolean(expense);
  const [type, setType] = useState<ExpenseType | ''>('');
  const [amount, setAmount] = useState('');
  const [expenseDate, setExpenseDate] = useState(todayIso());
  const [description, setDescription] = useState('');
  const [receiptUrl, setReceiptUrl] = useState('');
  const [errors, setErrors] = useState<ExpenseFormErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setType(expense?.type ?? '');
    setAmount(expense ? String(expense.amount) : '');
    setExpenseDate(expense?.expenseDate ?? todayIso());
    setDescription(expense?.description ?? '');
    setReceiptUrl(expense?.receiptUrl ?? '');
    setErrors({});
    setServerError(null);
  }, [isOpen, expense]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    const validation = validateExpenseForm({ type, amount, expenseDate, description, receiptUrl });
    if (Object.keys(validation).length > 0) {
      setErrors(validation);
      return;
    }

    const payload = {
      type: type as ExpenseType,
      amount: Number(amount),
      expenseDate,
      description: description.trim(),
      receiptUrl: receiptUrl.trim() || null,
    };

    setSubmitting(true);
    setServerError(null);
    try {
      const res = isEdit && expense ? await updateRejectedExpense(expense.id, payload) : await createExpense(projectId, payload);
      onSaved?.(res);
      onClose();
    } catch (err: unknown) {
      const message =
        err instanceof ExpensesApiError || err instanceof Error
          ? err.message
          : 'Không thể lưu phiếu chi phí. Vui lòng thử lại.';
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
        aria-labelledby="expense-form-modal-title"
      >
        <div className="modal-card project-modal-card">
          <div className="modal-header">
            <div className="modal-header__title-wrap">
              <h3 id="expense-form-modal-title" className="modal-title">
                <span className="modal-title__icon">{ICONS.receipt}</span>
                {isEdit ? 'Sửa & nộp lại phiếu chi phí' : 'Ghi nhận chi phí'}
              </h3>
            </div>
            <button type="button" className="modal-close" onClick={onClose} disabled={submitting} aria-label="Đóng">
              {ICONS.close}
            </button>
          </div>

          <div className="modal-body" style={{ overflowY: 'auto' }}>
            {isEdit && expense?.rejectReason && (
              <div className="alert-box alert-box--warning" role="note" style={{ marginBottom: '14px' }} data-testid="expense-form-reject-reason">
                Lý do bị từ chối trước đó: {expense.rejectReason}
              </div>
            )}

            {serverError && (
              <div
                className="alert-box alert-box--danger"
                role="alert"
                data-testid="expense-form-server-error"
                style={{ marginBottom: '14px' }}
              >
                {serverError}
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate data-testid="expense-form">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                <div className="form-group">
                  <label className="form-label" htmlFor="expense-type">
                    Loại chi phí <span className="field-required">*</span>
                  </label>
                  <select
                    id="expense-type"
                    className={`form-select ${errors.type ? 'form-input--error' : ''}`}
                    value={type}
                    onChange={(e) => {
                      setType(e.target.value as ExpenseType);
                      setErrors((prev) => ({ ...prev, type: undefined }));
                      setServerError(null);
                    }}
                    disabled={submitting}
                    autoFocus
                  >
                    <option value="">-- Chọn loại chi phí --</option>
                    {EXPENSE_TYPE_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {EXPENSE_TYPE_LABELS[opt]}
                      </option>
                    ))}
                  </select>
                  {errors.type && (
                    <p className="field-error" data-testid="error-expense-type" style={{ color: 'var(--pale-red-fg)', fontSize: '13px', marginTop: '4px' }}>
                      {errors.type}
                    </p>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="expense-amount">
                    Số tiền (đ) <span className="field-required">*</span>
                  </label>
                  <input
                    id="expense-amount"
                    type="text"
                    inputMode="numeric"
                    className={`form-input ${errors.amount ? 'form-input--error' : ''}`}
                    value={formatVnAmount(amount)}
                    onChange={(e) => {
                      setAmount(e.target.value.replace(/\D/g, ''));
                      setErrors((prev) => ({ ...prev, amount: undefined }));
                      setServerError(null);
                    }}
                    placeholder="0"
                    disabled={submitting}
                  />
                  {errors.amount && (
                    <p className="field-error" data-testid="error-expense-amount" style={{ color: 'var(--pale-red-fg)', fontSize: '13px', marginTop: '4px' }}>
                      {errors.amount}
                    </p>
                  )}
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '14px' }}>
                <label className="form-label" htmlFor="expense-date">
                  Ngày phát sinh <span className="field-required">*</span>
                </label>
                <input
                  id="expense-date"
                  type="date"
                  max={todayIso()}
                  className={`form-input ${errors.expenseDate ? 'form-input--error' : ''}`}
                  value={expenseDate}
                  onChange={(e) => {
                    setExpenseDate(e.target.value);
                    setErrors((prev) => ({ ...prev, expenseDate: undefined }));
                    setServerError(null);
                  }}
                  disabled={submitting}
                />
                {errors.expenseDate && (
                  <p className="field-error" data-testid="error-expense-date" style={{ color: 'var(--pale-red-fg)', fontSize: '13px', marginTop: '4px' }}>
                    {errors.expenseDate}
                  </p>
                )}
              </div>

              <div className="form-group" style={{ marginBottom: '14px' }}>
                <label className="form-label" htmlFor="expense-description">
                  Mô tả <span className="field-required">*</span>
                </label>
                <textarea
                  id="expense-description"
                  className={`form-input ${errors.description ? 'form-input--error' : ''}`}
                  rows={3}
                  value={description}
                  onChange={(e) => {
                    setDescription(e.target.value);
                    setErrors((prev) => ({ ...prev, description: undefined }));
                    setServerError(null);
                  }}
                  placeholder="Mô tả chi phí phát sinh..."
                  maxLength={1000}
                  disabled={submitting}
                />
                {errors.description && (
                  <p className="field-error" data-testid="error-expense-description" style={{ color: 'var(--pale-red-fg)', fontSize: '13px', marginTop: '4px' }}>
                    {errors.description}
                  </p>
                )}
              </div>

              <div className="form-group" style={{ marginBottom: '18px' }}>
                <label className="form-label" htmlFor="expense-receipt-url">
                  Đường dẫn chứng từ
                </label>
                <input
                  id="expense-receipt-url"
                  type="text"
                  className={`form-input ${errors.receiptUrl ? 'form-input--error' : ''}`}
                  value={receiptUrl}
                  onChange={(e) => {
                    setReceiptUrl(e.target.value);
                    setErrors((prev) => ({ ...prev, receiptUrl: undefined }));
                    setServerError(null);
                  }}
                  placeholder="Đường dẫn tới ảnh/PDF hóa đơn, biên lai... (không bắt buộc)"
                  maxLength={500}
                  disabled={submitting}
                />
                {errors.receiptUrl && (
                  <p className="field-error" data-testid="error-expense-receipt-url" style={{ color: 'var(--pale-red-fg)', fontSize: '13px', marginTop: '4px' }}>
                    {errors.receiptUrl}
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
                <button type="submit" className="btn btn-primary" disabled={submitting} data-testid="submit-expense-btn">
                  {submitting ? 'Đang lưu…' : isEdit ? 'Nộp lại' : 'Ghi nhận chi phí'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
