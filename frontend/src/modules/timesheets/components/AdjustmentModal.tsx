import { useState } from 'react';
import { ICONS } from '../../../components/common/icons';
import ModalPortal from '../../../components/common/ModalPortal';
import { useBackdropClick } from '../../../hooks/useBackdropClick';
import { adjustTimeEntry, TimesheetsApiError } from '../api/timesheetsApi';
import type { AdjustableEntryRes, AdjustmentTraceRes } from '../types/timesheetTypes';
import { validateAdjustmentForm } from '../validators/timesheetValidators';
import { useDialogA11y } from '../../projects/components/deliveryUi';

interface AdjustmentModalProps {
  projectId: number;
  taskId: number;
  onClose: () => void;
  onAdjusted: (trace: AdjustmentTraceRes) => void;
  /**
   * Dòng giờ công đã chọn sẵn từ bảng "Dòng giờ công có thể điều chỉnh"
   * (`GET /timesheets/adjustable-entries`) — khi có, mã dòng (Entry ID) được điền sẵn và khóa
   * lại (không gõ tay), kèm thông tin nhân sự/ngày/số giờ hiện tại để PM đối chiếu đúng dòng.
   */
  presetEntry?: AdjustableEntryRes;
  /** Họ tên nhân sự của `presetEntry.userId` — hiện thay cho "Nhân sự #id" khi có sẵn. */
  employeeName?: string;
}

function formatHours(hours: number | undefined): string {
  if (hours == null) return '—';
  return Number(hours.toFixed(2)).toString();
}

/**
 * Modal tạo một điều chỉnh giờ công đã duyệt bằng bút toán đảo (NCL-06-CN-005).
 *
 * Khi mở từ bảng chọn (`presetEntry`), Entry ID được điền sẵn và khóa lại — PM không cần tự
 * biết trước mã dòng. Vẫn giữ ô nhập tay làm lối vào dự phòng khi mở trực tiếp không qua bảng
 * chọn (ví dụ PM đã biết sẵn mã dòng từ nhật ký/thông báo).
 */
export default function AdjustmentModal({
  projectId,
  taskId,
  onClose,
  onAdjusted,
  presetEntry,
  employeeName,
}: AdjustmentModalProps) {
  const [entryId, setEntryId] = useState(presetEntry ? String(presetEntry.entryId) : '');
  const [correctedHours, setCorrectedHours] = useState('');
  const [reason, setReason] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const closeModal = () => {
    if (submitting) return;
    onClose();
  };

  const backdrop = useBackdropClick(closeModal, submitting);
  const dialogRef = useDialogA11y(true, closeModal, submitting);

  const handleSubmit = async () => {
    const entryIdNum = Number(entryId);
    const correctedHoursNum = Number(correctedHours);
    const fieldErrors: Record<string, string> = {};

    if (!entryId.trim() || !Number.isInteger(entryIdNum) || entryIdNum <= 0) {
      fieldErrors.entryId = 'Mã dòng giờ công phải là một số nguyên dương';
    }

    const validation = validateAdjustmentForm({
      correctedHours: correctedHours.trim() ? correctedHoursNum : undefined,
      reason,
    });
    Object.assign(fieldErrors, validation.errors);

    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      return;
    }

    setErrors({});
    setServerError(null);
    setSubmitting(true);
    try {
      const trace = await adjustTimeEntry(projectId, taskId, entryIdNum, {
        correctedHours: correctedHoursNum,
        reason: reason.trim(),
      });
      onAdjusted(trace);
    } catch (err) {
      setServerError(
        err instanceof TimesheetsApiError || err instanceof Error
          ? err.message
          : 'Không thể điều chỉnh giờ công. Vui lòng thử lại.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ModalPortal>
      <div
        className="modal-backdrop"
        onMouseDown={backdrop.onMouseDown}
        onClick={backdrop.onClick}
        role="dialog"
        aria-modal="true"
      >
        <div ref={dialogRef} className="modal-card dl-modal modal-card--sm" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h3 className="modal-title">
              <span className="modal-title__icon">{ICONS.edit}</span> Điều chỉnh giờ công đã duyệt
            </h3>
            <button type="button" className="modal-close" aria-label="Đóng" onClick={closeModal}>
              {ICONS.close}
            </button>
          </div>

          <div className="modal-body">
            {serverError && (
              <div className="alert alert--error mb-4" role="alert">
                <span className="alert__icon">{ICONS.alertTriangle}</span>
                <span>{serverError}</span>
              </div>
            )}

            <p style={{ margin: '0 0 12px', fontSize: '14px', lineHeight: '1.5' }}>
              Hệ thống sẽ tự sinh một dòng <strong>đảo</strong> (số giờ âm, bù trừ đúng dòng gốc) và một dòng{' '}
              <strong>sửa</strong> (số giờ đúng) — dòng gốc được giữ nguyên, cả ba dòng đều tra cứu lại được.
            </p>

            {presetEntry && (
              <div
                className="alert alert--info mb-4"
                role="note"
                style={{ marginBottom: '16px' }}
                title={`Mã dòng #${presetEntry.entryId}`}
              >
                <span className="alert__icon">{ICONS.info}</span>
                <span>
                  {employeeName ?? `Nhân sự #${presetEntry.userId}`} · ngày{' '}
                  {new Date(presetEntry.workDate).toLocaleDateString('vi-VN')} · hiện đang ghi{' '}
                  <strong>{formatHours(presetEntry.hours)} giờ</strong>
                  {presetEntry.note ? ` · ghi chú: "${presetEntry.note}"` : ''}
                </span>
              </div>
            )}

            <div className="form-grid">
              {/* Đã có sẵn dòng được chọn từ bảng "Dòng giờ công có thể điều chỉnh" (presetEntry,
                  hiện rõ trong banner xanh ở trên) thì không cần lặp lại ô Entry ID nữa — giá trị
                  vẫn được giữ trong state `entryId` để gửi API, chỉ ẩn khỏi giao diện cho gọn.
                  Ô này chỉ hiện lại khi modal được mở trực tiếp không qua bảng chọn (lối vào dự
                  phòng, hiện chưa có nơi nào trong ứng dụng gọi theo cách đó). */}
              {!presetEntry && (
                <div>
                  <label className="form-label" htmlFor="entry-id">
                    Mã dòng giờ công (Entry ID) <span className="text-danger">*</span>
                  </label>
                  <input
                    id="entry-id"
                    type="number"
                    min={1}
                    step={1}
                    className={`form-input ${errors.entryId ? 'form-input--error' : ''}`}
                    placeholder="Ví dụ: 30"
                    value={entryId}
                    onChange={(e) => setEntryId(e.target.value)}
                    disabled={submitting}
                  />
                  {errors.entryId && <p className="field-error">{errors.entryId}</p>}
                  <p className="field-hint">Dòng phải đang ở trạng thái Đã duyệt và là dòng gốc (chưa từng điều chỉnh).</p>
                </div>
              )}

              <div className={presetEntry ? 'form-field--full' : undefined}>
                <label className="form-label" htmlFor="corrected-hours">
                  Số giờ đúng <span className="text-danger">*</span>
                </label>
                <input
                  id="corrected-hours"
                  type="number"
                  min={0.01}
                  step={0.01}
                  className={`form-input ${errors.correctedHours ? 'form-input--error' : ''}`}
                  placeholder="Ví dụ: 6"
                  value={correctedHours}
                  onChange={(e) => setCorrectedHours(e.target.value)}
                  disabled={submitting}
                  style={presetEntry ? { maxWidth: '200px' } : undefined}
                />
                {errors.correctedHours && <p className="field-error">{errors.correctedHours}</p>}
              </div>

              <div className="form-field--full">
                <label className="form-label" htmlFor="adjustment-reason">
                  Lý do điều chỉnh <span className="text-danger">*</span>
                </label>
                <textarea
                  id="adjustment-reason"
                  className={`form-textarea ${errors.reason ? 'form-input--error' : ''}`}
                  rows={3}
                  maxLength={1000}
                  placeholder="Ví dụ: Ghi nhầm 8 giờ, thực tế làm 6 giờ"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  disabled={submitting}
                />
                {errors.reason && <p className="field-error">{errors.reason}</p>}
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={closeModal} disabled={submitting}>
              Hủy bỏ
            </button>
            <button type="button" className="btn-primary" onClick={handleSubmit} disabled={submitting}>
              {submitting ? 'Đang điều chỉnh…' : 'Xác nhận điều chỉnh'}
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
