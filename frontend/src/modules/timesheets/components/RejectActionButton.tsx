import { useState } from 'react';
import { ICONS } from '../../../components/common/icons';
import ModalPortal from '../../../components/common/ModalPortal';
import { useBackdropClick } from '../../../hooks/useBackdropClick';
import { rejectTimesheet, TimesheetsApiError } from '../api/timesheetsApi';
import type { PendingTimesheetRes, TimesheetRejectRes } from '../types/timesheetTypes';
import { validateRejectReason } from '../validators/timesheetValidators';

interface RejectActionButtonProps {
  timesheet: PendingTimesheetRes;
  onRejected: (result: TimesheetRejectRes) => void;
  onError: (message: string) => void;
}

/**
 * Nút "Từ chối" độc lập cho một dòng trong hàng chờ duyệt (NCL-06-CN-004), tách riêng khỏi
 * `ApprovalActionBar` (nơi gộp cả duyệt lẫn từ chối) theo yêu cầu có một màn hình từ chối
 * riêng biệt cho story này.
 *
 * Luôn từ chối NGUYÊN BẢNG (bỏ trống `entryIds`): `GET /timesheets/pending` chỉ trả tổng
 * hợp theo bảng (`pendingEntries`/`pendingHours`), không có danh sách từng dòng để chọn từ
 * chối riêng lẻ — đúng những gì backend hiện có. Backend tự giới hạn đúng phạm vi dự án của
 * PM gọi API (TC-02) dù từ chối nguyên bảng.
 */
export default function RejectActionButton({ timesheet, onRejected, onError }: RejectActionButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState<string | undefined>(undefined);
  const [submitting, setSubmitting] = useState(false);

  const closeModal = () => {
    if (submitting) return;
    setIsOpen(false);
    setReason('');
    setReasonError(undefined);
  };

  const backdrop = useBackdropClick(closeModal, submitting);

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
      <button
        type="button"
        className="btn-danger"
        onClick={() => setIsOpen(true)}
        data-testid={`btn-reject-${timesheet.timesheetId}`}
      >
        {ICONS.close} Từ chối
      </button>

      {isOpen && (
        <ModalPortal>
          <div
            className="modal-backdrop"
            onMouseDown={backdrop.onMouseDown}
            onClick={backdrop.onClick}
            role="dialog"
            aria-modal="true"
          >
            <div className="modal-card modal-card--sm" onClick={(e) => e.stopPropagation()}>
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
                  <strong>{timesheet.pendingHours}</strong> giờ) của <strong>Nhân sự #{timesheet.userId}</strong>{' '}
                  thuộc dự án bạn quản lý, tuần{' '}
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
