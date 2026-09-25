import { useMemo, useEffect, useState } from 'react';
import { ICONS } from '../../../components/common/icons';
import ModalPortal from '../../../components/common/ModalPortal';
import { useBackdropClick } from '../../../hooks/useBackdropClick';
import { useDialogA11y } from '../../projects/components/deliveryUi';
import type { TimeEntryRes } from '../types/timesheetTypes';
import { createTimeEntry, TimesheetsApiError, updateTimeEntry } from '../api/timesheetsApi';
import { validateTimeEntryCreateForm, validateTimeEntryUpdateForm } from '../validators/timesheetValidators';

export interface TimeEntryFormProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: number;
  taskId: number;
  taskName?: string;
  /** Truyền vào khi sửa bản ghi đã có; để trống/null khi ghi giờ công mới. */
  entry?: TimeEntryRes | null;
  /**
   * Các bản ghi đang hiển thị trên màn hình (cùng công việc, trong khoảng ngày đang xem) —
   * dùng để phát hiện trùng ngày ngay trên FE và mời chuyển sang sửa bản ghi có sẵn, đúng
   * gợi ý của lỗi `409 DUPLICATE_DATA` ("Lưu ý cho Frontend" của NCL-06-CN-001), thay vì
   * đợi round-trip API mới báo lỗi.
   */
  existingEntries?: TimeEntryRes[];
  /**
   * Tổng giờ đã ghi theo từng ngày (yyyy-MM-dd), gộp mọi công việc trong tuần — dùng để cảnh
   * báo trước khi chọn ngày, vì trần "không quá 12 giờ/ngày" tính trên toàn bộ công việc chứ
   * không chỉ riêng công việc đang ghi (NCL-06-CN-001).
   */
  dailyHoursMap?: Record<string, number>;
  onSaved?: (entry: TimeEntryRes) => void;
  /**
   * Thứ Hai/Chủ nhật của tuần đang xem trên bảng lưới phía sau modal — dùng để chọn sẵn một
   * ngày làm việc hợp lý thuộc đúng tuần đó khi ghi giờ công mới (thay vì luôn mặc định hôm
   * nay, khiến bản ghi lạc sang tuần khác khi người dùng quên tự đổi ngày). Không ảnh hưởng
   * khi sửa bản ghi có sẵn (ngày làm việc giữ nguyên theo `entry.workDate`).
   */
  weekFrom?: string;
  weekTo?: string;
}

/** Ngày hôm nay theo múi giờ cục bộ — khớp `todayIso()` của `timesheetValidators.ts`. */
function todayIso(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Ngày làm việc mặc định khi mở form ghi giờ công mới: hôm nay nếu hôm nay nằm trong tuần
 * đang xem; nếu tuần đang xem đã qua hẳn thì lấy ngày cuối tuần đó (luôn hợp lệ vì < hôm nay);
 * nếu tuần đang xem là tương lai thì đành lấy hôm nay (mọi ngày trong tuần đó đều bị khoá vì
 * vượt quá `max`, không có lựa chọn nào hợp lệ để mặc định sẵn).
 */
function pickDefaultWorkDate(weekFrom?: string, weekTo?: string): string {
  const today = todayIso();
  if (!weekFrom || !weekTo) return today;
  if (today >= weekFrom && today <= weekTo) return today;
  if (weekTo < today) return weekTo;
  return today;
}

function extractErrorMessage(err: unknown): string {
  if (err instanceof TimesheetsApiError || err instanceof Error) return err.message;
  return 'Không thể lưu bản ghi giờ công. Vui lòng thử lại.';
}

export default function TimeEntryForm({
  isOpen,
  onClose,
  projectId,
  taskId,
  taskName,
  entry = null,
  existingEntries = [],
  dailyHoursMap = {},
  onSaved,
  weekFrom,
  weekTo,
}: TimeEntryFormProps) {
  // Bản ghi đang thao tác — có thể đổi từ null (tạo mới) sang một bản ghi có sẵn khi phát
  // hiện trùng ngày ngay trên form, nên tách khỏi prop `entry` gốc.
  const [activeEntry, setActiveEntry] = useState<TimeEntryRes | null>(entry);
  const isEdit = Boolean(activeEntry);

  const [workDate, setWorkDate] = useState('');
  const [hours, setHours] = useState('');
  const [note, setNote] = useState('');
  const [billable, setBillable] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [duplicateEntry, setDuplicateEntry] = useState<TimeEntryRes | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setActiveEntry(entry);
    setWorkDate(entry?.workDate ?? pickDefaultWorkDate(weekFrom, weekTo));
    setHours(entry ? String(entry.hours) : '');
    setNote(entry?.note ?? '');
    setBillable(entry?.billable ?? true);
    setErrors({});
    setServerError(null);
    setDuplicateEntry(null);
  }, [isOpen, entry, weekFrom, weekTo]);

  const backdrop = useBackdropClick(onClose, submitting);
  const cardRef = useDialogA11y(isOpen, onClose, submitting);

  // Danh sách "ngày đã có giờ công" chỉ tính lại khi dữ liệu tuần đổi, không phải mỗi phím gõ.
  const loggedDaysText = useMemo(
    () =>
      Object.entries(dailyHoursMap)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, hrs]) => `${date} (${hrs}h)`)
        .join(', '),
    [dailyHoursMap]
  );

  if (!isOpen) return null;

  const dayHours = workDate ? dailyHoursMap[workDate] ?? 0 : 0;

  const switchToEditEntry = (existing: TimeEntryRes) => {
    setActiveEntry(existing);
    setWorkDate(existing.workDate);
    setHours(String(existing.hours));
    setNote(existing.note ?? '');
    setBillable(existing.billable ?? true);
    setDuplicateEntry(null);
    setErrors({});
    setServerError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setDuplicateEntry(null);
    setServerError(null);

    const hoursNumber = Number(hours);

    if (isEdit && activeEntry) {
      const payload = { hours: hoursNumber, note: note.trim(), billable };
      const validation = validateTimeEntryUpdateForm(payload);
      if (!validation.isValid) {
        setErrors(validation.errors);
        return;
      }
      setSubmitting(true);
      try {
        const res = await updateTimeEntry(projectId, taskId, activeEntry.id, payload);
        onSaved?.(res);
        onClose();
      } catch (err: unknown) {
        setServerError(extractErrorMessage(err));
      } finally {
        setSubmitting(false);
      }
      return;
    }

    const payload = { workDate, hours: hoursNumber, note: note.trim(), billable };
    const validation = validateTimeEntryCreateForm(payload);
    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    const clash = existingEntries.find((item) => item.workDate === workDate);
    if (clash) {
      setDuplicateEntry(clash);
      return;
    }

    setSubmitting(true);
    try {
      const res = await createTimeEntry(projectId, taskId, payload);
      onSaved?.(res);
      onClose();
    } catch (err: unknown) {
      setServerError(extractErrorMessage(err));
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
      aria-labelledby="time-entry-form-modal-title"
    >
      <div className="modal-card project-modal-card dl-modal" ref={cardRef}>
        <div className="modal-header">
          <div className="modal-header__title-wrap">
            <h3 id="time-entry-form-modal-title" className="modal-title">
              <span className="modal-title__icon">{ICONS.clock}</span>
              {isEdit ? 'Sửa giờ công' : 'Ghi giờ công'}
              {taskName ? ` — ${taskName}` : ''}
            </h3>
          </div>
          <button type="button" className="modal-close" onClick={onClose} disabled={submitting} aria-label="Đóng">
            {ICONS.close}
          </button>
        </div>

        <div className="modal-body">
          {serverError && (
            <div
              className="alert-box alert-box--danger"
              role="alert"
              data-testid="time-entry-server-error"
            >
              {serverError}
            </div>
          )}

          {duplicateEntry && (
            <div
              className="alert-box alert-box--warning dl-dup-alert"
              role="alert"
              data-testid="time-entry-duplicate-alert"
            >
              <p className="dl-alert-note">
                Đã có bản ghi giờ công cho công việc này trong ngày {duplicateEntry.workDate} ({duplicateEntry.hours}{' '}
                giờ). Hãy sửa bản ghi có sẵn thay vì tạo mới.
              </p>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => switchToEditEntry(duplicateEntry)}
                data-testid="btn-switch-to-edit-duplicate"
              >
                Sửa bản ghi ngày {duplicateEntry.workDate}
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate data-testid="time-entry-form">
            <div className="form-group dl-form-group">
              <label className="form-label" htmlFor="time-entry-workdate">
                Ngày làm việc <span className="field-required">*</span>
              </label>
              <input
                id="time-entry-workdate"
                type="date"
                className={`form-input ${errors.workDate ? 'form-input--error' : ''}`}
                aria-invalid={Boolean(errors.workDate) || undefined}
                aria-describedby={errors.workDate ? 'error-time-entry-workdate' : undefined}
                aria-required="true"
                value={workDate}
                max={todayIso()}
                onChange={(e) => {
                  setWorkDate(e.target.value);
                  setErrors((prev) => ({ ...prev, workDate: '' }));
                  setServerError(null);
                }}
                disabled={submitting || isEdit}
                autoFocus
              />
              {isEdit && (
                <p className="dl-field-hint">
                  Không đổi được ngày làm việc của bản ghi đã có — muốn đổi ngày thì xoá bản ghi này rồi ghi bản
                  ghi mới.
                </p>
              )}
              {!isEdit && workDate && dayHours > 0 && (
                <p
                  className={`dl-field-hint${dayHours >= 12 ? ' dl-field-hint--danger' : ''}`}
                  data-testid="time-entry-day-hours-hint"
                >
                  Ngày {workDate} đã ghi {dailyHoursMap[workDate]} giờ (mọi công việc) — còn tối đa{' '}
                  {Math.max(0, 12 - (dailyHoursMap[workDate] ?? 0))} giờ để ghi thêm.
                </p>
              )}
              {!isEdit && Object.keys(dailyHoursMap).length > 0 && (
                <p className="dl-field-hint">
                  Các ngày trong tuần đã có giờ công: {loggedDaysText}
                </p>
              )}
              {errors.workDate && (
                <p className="dl-field-error" id="error-time-entry-workdate" data-testid="error-time-entry-workdate" role="alert">
                  {errors.workDate}
                </p>
              )}
            </div>

            <div className="form-group dl-form-group">
              <label className="form-label" htmlFor="time-entry-hours">
                Số giờ công <span className="field-required">*</span>
              </label>
              <input
                id="time-entry-hours"
                type="number"
                inputMode="decimal"
                step="0.25"
                min="0.01"
                className={`form-input dl-input-narrow ${errors.hours ? 'form-input--error' : ''}`}
                aria-invalid={Boolean(errors.hours) || undefined}
                aria-describedby={errors.hours ? 'error-time-entry-hours' : undefined}
                aria-required="true"
                value={hours}
                onChange={(e) => {
                  setHours(e.target.value);
                  setErrors((prev) => ({ ...prev, hours: '' }));
                  setServerError(null);
                }}
                placeholder="Ví dụ: 3.5"
                disabled={submitting}
              />
              {errors.hours && (
                <p className="dl-field-error" id="error-time-entry-hours" data-testid="error-time-entry-hours" role="alert">
                  {errors.hours}
                </p>
              )}
            </div>

            <div className="form-group dl-form-group">
              <label className="form-label" htmlFor="time-entry-note">
                Ghi chú <span className="field-required">*</span>
              </label>
              <textarea
                id="time-entry-note"
                className={`form-input ${errors.note ? 'form-input--error' : ''}`}
                aria-invalid={Boolean(errors.note) || undefined}
                aria-describedby={errors.note ? 'error-time-entry-note' : undefined}
                aria-required="true"
                rows={3}
                value={note}
                onChange={(e) => {
                  setNote(e.target.value);
                  setErrors((prev) => ({ ...prev, note: '' }));
                  setServerError(null);
                }}
                placeholder="Mô tả công việc đã thực hiện trong khoảng thời gian ghi..."
                disabled={submitting}
              />
              {errors.note && (
                <p className="dl-field-error" id="error-time-entry-note" data-testid="error-time-entry-note" role="alert">
                  {errors.note}
                </p>
              )}
            </div>

            <div className="form-group dl-form-group--last">
              <label className="form-check dl-check">
                <input
                  id="time-entry-billable"
                  type="checkbox"
                  checked={billable}
                  onChange={(e) => setBillable(e.target.checked)}
                  disabled={submitting}
                />
                Có tính phí (billable)
              </label>
            </div>

            <div className="dl-modal-actions">
              <button type="button" className="btn btn-secondary" onClick={onClose} disabled={submitting}>
                Hủy bỏ
              </button>
              <button type="submit" className="btn btn-primary" disabled={submitting} data-testid="submit-time-entry-btn" aria-busy={submitting || undefined}>
                {submitting ? 'Đang lưu…' : isEdit ? 'Lưu thay đổi' : 'Ghi giờ công'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
    </ModalPortal>
  );
}
