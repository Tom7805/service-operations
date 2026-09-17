import { useState } from 'react';
import { ICONS } from '../../../components/common/icons';
import ModalPortal from '../../../components/common/ModalPortal';
import { useBackdropClick } from '../../../hooks/useBackdropClick';
import { approveExpense, rejectExpense, ExpensesApiError } from '../api/expensesApi';
import type { ExpenseRes } from '../types/expenseTypes';
import { EXPENSE_TYPE_LABELS } from '../types/expenseTypes';
import { validateExpenseRejectReason } from '../validators/expenseValidators';

interface ExpenseApprovalActionBarProps {
  expense: ExpenseRes;
  onApproved: (result: ExpenseRes) => void;
  onRejected: (result: ExpenseRes) => void;
  onError: (message: string) => void;
}

type OpenModal = 'approve' | 'reject' | null;

function formatAmount(amount: number): string {
  return new Intl.NumberFormat('vi-VN').format(amount) + ' đ';
}

/**
 * Nút "Duyệt" / "Từ chối" cho một dòng trong hàng chờ duyệt chi phí (NCL-08-CN-002).
 *
 * Duyệt không cần xác nhận thêm dữ liệu (`POST /expenses/{id}/approve` không nhận body).
 * Từ chối bắt buộc nhập lý do (`reason`) — phiếu giữ nguyên dữ liệu gốc, người tạo sửa và
 * nộp lại qua `PUT /expenses/{id}` (NCL-08-CN-001, ngoài phạm vi màn hình này).
 */
export default function ExpenseApprovalActionBar({
  expense,
  onApproved,
  onRejected,
  onError,
}: ExpenseApprovalActionBarProps) {
  const [openModal, setOpenModal] = useState<OpenModal>(null);
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState<string | undefined>(undefined);
  const [submitting, setSubmitting] = useState(false);

  const closeModal = () => {
    if (submitting) return;
    setOpenModal(null);
    setReason('');
    setReasonError(undefined);
  };

  const approveBackdrop = useBackdropClick(closeModal, submitting);
  const rejectBackdrop = useBackdropClick(closeModal, submitting);

  const handleApprove = async () => {
    setSubmitting(true);
    try {
      const result = await approveExpense(expense.id);
      onApproved(result);
      closeModal();
    } catch (err) {
      onError(
        err instanceof ExpensesApiError || err instanceof Error
          ? err.message
          : 'Không thể duyệt phiếu chi phí. Vui lòng thử lại.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    const error = validateExpenseRejectReason(reason);
    if (error) {
      setReasonError(error);
      return;
    }
    setSubmitting(true);
    try {
      const result = await rejectExpense(expense.id, { reason: reason.trim() });
      onRejected(result);
      closeModal();
    } catch (err) {
      onError(
        err instanceof ExpensesApiError || err instanceof Error
          ? err.message
          : 'Không thể từ chối phiếu chi phí. Vui lòng thử lại.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
        <button
          type="button"
          className="btn-primary"
          onClick={() => setOpenModal('approve')}
          data-testid={`btn-approve-${expense.id}`}
        >
          {ICONS.checkCircle} Duyệt
        </button>
        <button
          type="button"
          className="btn-danger"
          onClick={() => setOpenModal('reject')}
          data-testid={`btn-reject-${expense.id}`}
        >
          {ICONS.close} Từ chối
        </button>
      </div>

      {openModal === 'approve' && (
        <ModalPortal>
          <div
            className="modal-backdrop"
            onMouseDown={approveBackdrop.onMouseDown}
            onClick={approveBackdrop.onClick}
            role="dialog"
            aria-modal="true"
          >
            <div className="modal-card modal-card--sm" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3 className="modal-title">
                  <span className="modal-title__icon">{ICONS.checkCircle}</span> Duyệt phiếu chi phí
                </h3>
                <button type="button" className="modal-close" aria-label="Đóng" onClick={closeModal}>
                  {ICONS.close}
                </button>
              </div>

              <div className="modal-body">
                <p style={{ margin: 0, fontSize: '14px', lineHeight: '1.5' }}>
                  Duyệt phiếu chi phí <strong>{EXPENSE_TYPE_LABELS[expense.type]}</strong> số tiền{' '}
                  <strong>{formatAmount(expense.amount)}</strong> phát sinh ngày{' '}
                  <strong>{expense.expenseDate}</strong>? Phiếu sẽ được tính vào giá vốn dự án sau khi duyệt.
                </p>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={closeModal} disabled={submitting}>
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={handleApprove}
                  disabled={submitting}
                  data-testid="btn-confirm-approve"
                >
                  {submitting ? 'Đang duyệt…' : 'Xác nhận duyệt'}
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {openModal === 'reject' && (
        <ModalPortal>
          <div
            className="modal-backdrop"
            onMouseDown={rejectBackdrop.onMouseDown}
            onClick={rejectBackdrop.onClick}
            role="dialog"
            aria-modal="true"
          >
            <div className="modal-card modal-card--sm" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3 className="modal-title text-danger">
                  <span className="modal-title__icon">{ICONS.close}</span> Từ chối phiếu chi phí
                </h3>
                <button type="button" className="modal-close" aria-label="Đóng" onClick={closeModal}>
                  {ICONS.close}
                </button>
              </div>

              <div className="modal-body">
                <p style={{ margin: '0 0 12px', fontSize: '14px', lineHeight: '1.5' }}>
                  Từ chối phiếu chi phí <strong>{EXPENSE_TYPE_LABELS[expense.type]}</strong> số tiền{' '}
                  <strong>{formatAmount(expense.amount)}</strong> phát sinh ngày{' '}
                  <strong>{expense.expenseDate}</strong>. Phiếu giữ nguyên dữ liệu gốc để người tạo sửa và nộp
                  lại.
                </p>
                <label className="form-label" htmlFor={`reject-reason-${expense.id}`}>
                  Lý do từ chối <span className="text-danger">*</span>
                </label>
                <textarea
                  id={`reject-reason-${expense.id}`}
                  className={`form-textarea ${reasonError ? 'form-input--error' : ''}`}
                  rows={3}
                  maxLength={1000}
                  placeholder="Ví dụ: Thiếu chứng từ hợp lệ, cần bổ sung hóa đơn"
                  value={reason}
                  onChange={(e) => {
                    setReason(e.target.value);
                    if (reasonError) setReasonError(undefined);
                  }}
                  disabled={submitting}
                  data-testid="reject-reason-input"
                />
                {reasonError && <p className="field-error">{reasonError}</p>}
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={closeModal} disabled={submitting}>
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  className="btn-primary btn-danger"
                  onClick={handleReject}
                  disabled={submitting}
                  data-testid="btn-confirm-reject"
                >
                  {submitting ? 'Đang từ chối…' : 'Xác nhận từ chối'}
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </>
  );
}
