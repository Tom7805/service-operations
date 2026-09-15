import { useState } from 'react';
import { ICONS } from '../../../components/common/icons';
import ModalPortal from '../../../components/common/ModalPortal';
import { useBackdropClick } from '../../../hooks/useBackdropClick';
import { adjustTimeEntry, TimesheetsApiError } from '../api/timesheetsApi';
import type { AdjustmentTraceRes } from '../types/timesheetTypes';
import { validateAdjustmentForm } from '../validators/timesheetValidators';

interface AdjustmentModalProps {
  projectId: number;
  taskId: number;
  onClose: () => void;
  onAdjusted: (trace: AdjustmentTraceRes) => void;
}

/**
 * Modal tạo một điều chỉnh giờ công đã duyệt bằng bút toán đảo (NCL-06-CN-005).
 *
 * `entryId` phải do PM nhập trực tiếp: `GET /projects/{projectId}/tasks/{taskId}/adjustments`
 * chỉ trả lịch sử các lần điều chỉnh ĐÃ thực hiện, backend hiện không có endpoint liệt kê các
 * dòng giờ công APPROVED của một công việc để chọn — đúng những gì backend hiện có, không suy
 * diễn thêm một endpoint chưa tồn tại. PM xác định đúng dòng cần sửa qua trao đổi với nhân sự/
 * dấu vết đã biết từ trước (ví dụ mã dòng trong thông báo/nhật ký).
 */
export default function AdjustmentModal({ projectId, taskId, onClose, onAdjusted }: AdjustmentModalProps) {
  const [entryId, setEntryId] = useState('');
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
        <div className="modal-card modal-card--sm" onClick={(e) => e.stopPropagation()}>
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

            <div className="form-grid">
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

              <div>
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
