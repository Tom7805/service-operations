import { useState } from 'react';
import { ICONS } from '../../../components/common/icons';
import ModalPortal from '../../../components/common/ModalPortal';
import { useBackdropClick } from '../../../hooks/useBackdropClick';
import { approveTimesheet, rejectTimesheet, TimesheetsApiError } from '../api/timesheetsApi';
import type { PendingTimesheetRes, TimesheetApprovalRes, TimesheetRejectRes } from '../types/timesheetTypes';
import { validateRejectReason } from '../validators/timesheetValidators';
import { useDialogA11y } from '../../projects/components/deliveryUi';

interface ApprovalActionBarProps {
  timesheet: PendingTimesheetRes;
  onApproved: (result: TimesheetApprovalRes) => void;
  onRejected: (result: TimesheetRejectRes) => void;
  onError: (message: string) => void;
}

type OpenModal = 'approve' | 'reject' | null;

/**
 * Nút "Duyệt" / "Từ chối" cho một dòng trong hàng chờ duyệt (NCL-06-CN-003/CN-004).
 *
 * Luôn duyệt/từ chối NGUYÊN BẢNG (bỏ trống `entryIds`) — cách hiển thị an toàn nhất với
 * hợp đồng API hiện có: `GET /timesheets/pending` chỉ trả tổng hợp theo bảng
 * (`pendingEntries`/`pendingHours`), không trả danh sách từng dòng để chọn duyệt riêng lẻ.
 * Backend tự giới hạn đúng phạm vi dự án của PM gọi API (TC-02) dù duyệt/từ chối nguyên bảng.
 */
export default function ApprovalActionBar({ timesheet, onApproved, onRejected, onError }: ApprovalActionBarProps) {
  const [openModal, setOpenModal] = useState<OpenModal>(null);
  const [note, setNote] = useState('');
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState<string | undefined>(undefined);
  const [submitting, setSubmitting] = useState(false);

  const closeModal = () => {
    if (submitting) return;
    setOpenModal(null);
    setNote('');
    setReason('');
    setReasonError(undefined);
  };

  const approveBackdrop = useBackdropClick(closeModal, submitting);
  const rejectBackdrop = useBackdropClick(closeModal, submitting);
  const dialogRef = useDialogA11y(openModal !== null, closeModal, submitting);

  const handleApprove = async () => {
    setSubmitting(true);
    try {
      const result = await approveTimesheet(timesheet.timesheetId, note.trim() ? { note: note.trim() } : {});
      onApproved(result);
      closeModal();
    } catch (err) {
      onError(
        err instanceof TimesheetsApiError || err instanceof Error
          ? err.message
          : 'Không thể duyệt bảng chấm công. Vui lòng thử lại.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    const error = validateRejectReason(reason);
    if (error) {
      setReasonError(error);
      return;
    }
    setSubmitting(true);
    try {
      const result = await rejectTimesheet(timesheet.timesheetId, { reason: reason.trim() });
      onRejected(result);
      closeModal();
    } catch (err) {
      onError(
        err instanceof TimesheetsApiError || err instanceof Error
          ? err.message
          : 'Không thể từ chối bảng chấm công. Vui lòng thử lại.'
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
          data-testid={`btn-approve-${timesheet.timesheetId}`}
        >
          {ICONS.checkCircle} Duyệt
        </button>
        <button
          type="button"
          className="btn-danger"
          onClick={() => setOpenModal('reject')}
          data-testid={`btn-reject-${timesheet.timesheetId}`}
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
                  <span className="modal-title__icon">{ICONS.checkCircle}</span> Duyệt bảng chấm công
                </h3>
                <button type="button" className="modal-close" aria-label="Đóng" onClick={closeModal}>
                  {ICONS.close}
                </button>
              </div>

              <div className="modal-body">
                <p style={{ margin: '0 0 12px', fontSize: '14px', lineHeight: '1.5' }}>
                  Duyệt <strong>{timesheet.pendingEntries}</strong> dòng giờ công (
                  <strong>{timesheet.pendingHours}</strong> giờ) thuộc dự án bạn quản lý trong tuần{' '}
                  <strong>
                    {timesheet.weekStartDate} → {timesheet.weekEndDate}
                  </strong>
                  ?
                </p>
                <label className="form-label" htmlFor="approve-note">
                  Ghi chú (không bắt buộc)
                </label>
                <textarea
                  id="approve-note"
                  className="form-textarea"
                  rows={3}
                  maxLength={1000}
                  placeholder="Ví dụ: Duyệt cho đợt nghiệm thu tháng 9"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  disabled={submitting}
                />
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
            <div ref={dialogRef} className="modal-card dl-modal modal-card--sm" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3 className="modal-title text-danger">
                  <span className="modal-title__icon">{ICONS.close}</span> Từ chối bảng chấm công
                </h3>
                <button type="button" className="modal-close" aria-label="Đóng" onClick={closeModal}>
                  {ICONS.close}
                </button>
              </div>

              <div className="modal-body">
                <p style={{ margin: '0 0 12px', fontSize: '14px', lineHeight: '1.5' }}>
                  Từ chối <strong>{timesheet.pendingEntries}</strong> dòng giờ công (
                  <strong>{timesheet.pendingHours}</strong> giờ) thuộc dự án bạn quản lý trong tuần{' '}
                  <strong>
                    {timesheet.weekStartDate} → {timesheet.weekEndDate}
                  </strong>
                  . Các dòng này sẽ quay về nhập (DRAFT) để nhân viên sửa và nộp lại.
                </p>
                <label className="form-label" htmlFor="reject-reason">
                  Lý do từ chối <span className="text-danger">*</span>
                </label>
                <textarea
                  id="reject-reason"
                  className={`form-textarea ${reasonError ? 'form-input--error' : ''}`}
                  rows={3}
                  maxLength={1000}
                  placeholder="Ví dụ: Ghi nhầm dự án, cần ghi lại đúng công việc"
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
