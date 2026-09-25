import { ICONS } from '../../../components/common/icons';
import ModalPortal from '../../../components/common/ModalPortal';
import { useBackdropClick } from '../../../hooks/useBackdropClick';
import { useDialogA11y } from '../../projects/components/deliveryUi';

interface SubmitWeekConfirmModalProps {
  isOpen: boolean;
  weekFromLabel: string;
  weekToLabel: string;
  draftCount: number;
  totalHours: number;
  submitting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * NCL-06-CN-002 — Thay cho `window.confirm` mặc định của trình duyệt (không đồng bộ giao
 * diện, không hiện được số liệu có định dạng, chặn cả tab nên không thể huỷ bằng cách bấm
 * ra ngoài). Tóm tắt đúng những gì `window.confirm` cũ đang hỏi: tuần nào, bao nhiêu dòng,
 * tổng bao nhiêu giờ, và cảnh báo khoá sửa/xoá sau khi nộp — chỉ khác là trình bày có cấu
 * trúc thay vì một chuỗi văn bản nối bằng `\n\n`.
 */
export default function SubmitWeekConfirmModal({
  isOpen,
  weekFromLabel,
  weekToLabel,
  draftCount,
  totalHours,
  submitting,
  onConfirm,
  onCancel,
}: SubmitWeekConfirmModalProps) {
  const backdrop = useBackdropClick(onCancel, submitting);

  const dialogRef = useDialogA11y(isOpen, onCancel, submitting);

  if (!isOpen) return null;

  return (
    <ModalPortal>
      <div
        className="modal-backdrop"
        onMouseDown={backdrop.onMouseDown}
        onClick={backdrop.onClick}
        role="dialog"
        aria-modal="true"
        aria-labelledby="submit-week-modal-title"
        data-testid="submit-week-confirm-modal"
      >
        <div ref={dialogRef} className="modal-card dl-modal modal-card--sm" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h3 id="submit-week-modal-title" className="modal-title">
              <span className="modal-title__icon">{ICONS.check}</span> Xác nhận nộp bảng chấm công
            </h3>
            <button type="button" className="modal-close" aria-label="Đóng" onClick={onCancel} disabled={submitting}>
              {ICONS.close}
            </button>
          </div>

          <div className="modal-body">
            <p style={{ margin: '0 0 14px', fontSize: '14px', lineHeight: '1.5' }}>
              Bạn sắp nộp bảng chấm công tuần{' '}
              <strong>
                {weekFromLabel} → {weekToLabel}
              </strong>
              . Quản lý dự án sẽ nhận được thông báo để duyệt.
            </p>

            <div className="confirm-summary-list">
              <div className="confirm-summary-row">
                <span className="confirm-summary-row__label">Số dòng giờ công</span>
                <span className="confirm-summary-row__value">{draftCount}</span>
              </div>
              <div className="confirm-summary-row">
                <span className="confirm-summary-row__label">Tổng số giờ</span>
                <span className="confirm-summary-row__value">{totalHours} giờ</span>
              </div>
            </div>

            <div className="confirm-note-box">
              <span className="confirm-note-box__icon">{ICONS.alertTriangle}</span>
              <span>
                Sau khi nộp, bạn sẽ <strong>không sửa hoặc xóa</strong> được các dòng giờ công của tuần này cho đến
                khi được duyệt hoặc bị từ chối.
              </span>
            </div>
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="btn-secondary"
              onClick={onCancel}
              disabled={submitting}
              data-testid="btn-cancel-submit-week"
            >
              Hủy bỏ
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={onConfirm}
              disabled={submitting}
              data-testid="btn-confirm-submit-week"
            >
              {submitting ? (
                <>
                  <span className="spinner-sm" />
                  <span>Đang nộp...</span>
                </>
              ) : (
                <>
                  <span className="icon-sm">{ICONS.check}</span>
                  <span>Xác nhận nộp bảng</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
