import { useState } from 'react';
import { ICONS } from '../../../components/common/icons';
import ModalPortal from '../../../components/common/ModalPortal';
import { useBackdropClick } from '../../../hooks/useBackdropClick';
import { approveSubcontractorExpense, rejectSubcontractorExpense, ExpensesApiError } from '../api/expensesApi';
import type { SubcontractorExpenseRes } from '../types/expenseTypes';
import { validateExpenseRejectReason } from '../validators/expenseValidators';
import { useDialogA11y } from '../../projects/components/deliveryUi';

interface SubcontractorExpenseApprovalActionBarProps {
  expense: SubcontractorExpenseRes;
  onApproved: (result: SubcontractorExpenseRes) => void;
  onRejected: (result: SubcontractorExpenseRes) => void;
  onError: (message: string) => void;
}

type OpenModal = 'approve' | 'reject' | null;

function formatAmount(amount: number): string {
  return new Intl.NumberFormat('vi-VN').format(amount) + ' đ';
}

/**
 * Nút "Duyệt" / "Từ chối" cho một dòng trong hàng chờ duyệt chi phí thuê ngoài (NCL-08-CN-002
 * — CN-004 "Ghi nhận chi phí thuê ngoài" phụ thuộc trực tiếp vào story này để phiếu được tính
 * vào giá vốn dự án). Cùng quy tắc với chi phí nội bộ: duyệt không cần xác nhận thêm dữ liệu,
 * từ chối bắt buộc nhập lý do.
 */
export default function SubcontractorExpenseApprovalActionBar({
  expense,
  onApproved,
  onRejected,
  onError,
}: SubcontractorExpenseApprovalActionBarProps) {
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
  const dialogRef = useDialogA11y(openModal !== null, closeModal, submitting);

  const handleApprove = async () => {
    setSubmitting(true);
    try {
      const result = await approveSubcontractorExpense(expense.id);
      onApproved(result);
      closeModal();
    } catch (err) {
      onError(
        err instanceof ExpensesApiError || err instanceof Error
          ? err.message
          : 'Không thể duyệt phiếu chi phí thuê ngoài. Vui lòng thử lại.'
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
      const result = await rejectSubcontractorExpense(expense.id, { reason: reason.trim() });
      onRejected(result);
      closeModal();
    } catch (err) {
      onError(
        err instanceof ExpensesApiError || err instanceof Error
          ? err.message
          : 'Không thể từ chối phiếu chi phí thuê ngoài. Vui lòng thử lại.'
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
          data-testid={`btn-approve-subcontractor-${expense.id}`}
        >
          {ICONS.checkCircle} Duyệt
        </button>
        <button
          type="button"
          className="btn-danger"
          onClick={() => setOpenModal('reject')}
          data-testid={`btn-reject-subcontractor-${expense.id}`}
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
            <div ref={dialogRef} className="modal-card dl-modal modal-card--sm" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3 className="modal-title">
                  <span className="modal-title__icon">{ICONS.checkCircle}</span> Duyệt phiếu chi phí thuê ngoài
                </h3>
                <button type="button" className="modal-close" aria-label="Đóng" onClick={closeModal}>
                  {ICONS.close}
                </button>
              </div>

              <div className="modal-body">
                <p style={{ margin: 0, fontSize: '14px', lineHeight: '1.5' }}>
                  Duyệt phiếu chi phí thuê ngoài của nhà thầu <strong>{expense.contractorName}</strong> số tiền{' '}
                  <strong>{formatAmount(expense.amount)}</strong> kỳ phát sinh{' '}
                  <strong>{expense.incurredPeriod}</strong>? Phiếu sẽ được tính vào giá vốn dự án sau khi duyệt.
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
                  data-testid="btn-confirm-approve-subcontractor"
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
            <div ref={dialogRef} className="modal-card dl-modal modal-card--sm" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3 className="modal-title text-danger">
                  <span className="modal-title__icon">{ICONS.close}</span> Từ chối phiếu chi phí thuê ngoài
                </h3>
                <button type="button" className="modal-close" aria-label="Đóng" onClick={closeModal}>
                  {ICONS.close}
                </button>
              </div>

              <div className="modal-body">
                <p style={{ margin: '0 0 12px', fontSize: '14px', lineHeight: '1.5' }}>
                  Từ chối phiếu chi phí thuê ngoài của nhà thầu <strong>{expense.contractorName}</strong> số tiền{' '}
                  <strong>{formatAmount(expense.amount)}</strong> kỳ phát sinh{' '}
                  <strong>{expense.incurredPeriod}</strong>.
                </p>
                <label className="form-label" htmlFor={`reject-reason-subcontractor-${expense.id}`}>
                  Lý do từ chối <span className="text-danger">*</span>
                </label>
                <textarea
                  id={`reject-reason-subcontractor-${expense.id}`}
                  className={`form-textarea ${reasonError ? 'form-input--error' : ''}`}
                  rows={3}
                  maxLength={1000}
                  placeholder="Ví dụ: Thiếu hợp đồng thuê ngoài, cần bổ sung chứng từ"
                  value={reason}
                  onChange={(e) => {
                    setReason(e.target.value);
                    if (reasonError) setReasonError(undefined);
                  }}
                  disabled={submitting}
                  data-testid="reject-reason-subcontractor-input"
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
                  data-testid="btn-confirm-reject-subcontractor"
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
