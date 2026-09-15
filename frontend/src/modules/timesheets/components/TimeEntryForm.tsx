import { useEffect, useState } from 'react';
import { ICONS } from '../../../components/common/icons';
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
  onSaved?: (entry: TimeEntryRes) => void;
}

/** Ngày hôm nay theo múi giờ cục bộ — khớp `todayIso()` của `timesheetValidators.ts`. */
function todayIso(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
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
  onSaved,
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
    setWorkDate(entry?.workDate ?? todayIso());
    setHours(entry ? String(entry.hours) : '');
    setNote(entry?.note ?? '');
    setBillable(entry?.billable ?? true);
    setErrors({});
    setServerError(null);
    setDuplicateEntry(null);
  }, [isOpen, entry]);

  if (!isOpen) return null;

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
    <div
      className="modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="time-entry-form-modal-title"
    >
      <div className="modal-card project-modal-card">
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

        <div className="modal-body" style={{ overflowY: 'auto' }}>
          {serverError && (
            <div
              className="alert-box alert-box--danger"
              role="alert"
              data-testid="time-entry-server-error"
              style={{ marginBottom: '14px' }}
            >
              {serverError}
            </div>
          )}

          {duplicateEntry && (
            <div
              className="alert-box alert-box--warning"
              role="alert"
              data-testid="time-entry-duplicate-alert"
              style={{ marginBottom: '14px' }}
            >
              <p style={{ margin: '0 0 8px' }}>
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
            <div className="form-group" style={{ marginBottom: '14px' }}>
              <label className="form-label" htmlFor="time-entry-workdate">
                Ngày làm việc <span className="field-required">*</span>
              </label>
              <input
                id="time-entry-workdate"
                type="date"
                className={`form-input ${errors.workDate ? 'form-input--error' : ''}`}
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
                <p className="field-hint" style={{ fontSize: '12px', marginTop: '4px' }}>
                  Không đổi được ngày làm việc của bản ghi đã có — muốn đổi ngày thì xoá bản ghi này rồi ghi bản
                  ghi mới.
                </p>
              )}
              {errors.workDate && (
                <p className="field-error" data-testid="error-time-entry-workdate" style={{ color: '#DC2626', fontSize: '13px', marginTop: '4px' }}>
                  {errors.workDate}
                </p>
              )}
            </div>

            <div className="form-group" style={{ marginBottom: '14px' }}>
              <label className="form-label" htmlFor="time-entry-hours">
                Số giờ công <span className="field-required">*</span>
              </label>
              <input
                id="time-entry-hours"
                type="number"
                step="0.25"
                min="0.01"
                className={`form-input ${errors.hours ? 'form-input--error' : ''}`}
                value={hours}
                onChange={(e) => {
                  setHours(e.target.value);
                  setErrors((prev) => ({ ...prev, hours: '' }));
                  setServerError(null);
                }}
                placeholder="Ví dụ: 3.5"
                disabled={submitting}
                style={{ maxWidth: '160px' }}
              />
              {errors.hours && (
                <p className="field-error" data-testid="error-time-entry-hours" style={{ color: '#DC2626', fontSize: '13px', marginTop: '4px' }}>
                  {errors.hours}
                </p>
              )}
            </div>

            <div className="form-group" style={{ marginBottom: '14px' }}>
              <label className="form-label" htmlFor="time-entry-note">
                Ghi chú <span className="field-required">*</span>
              </label>
              <textarea
                id="time-entry-note"
                className={`form-input ${errors.note ? 'form-input--error' : ''}`}
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
                <p className="field-error" data-testid="error-time-entry-note" style={{ color: '#DC2626', fontSize: '13px', marginTop: '4px' }}>
                  {errors.note}
                </p>
              )}
            </div>

            <div className="form-group" style={{ marginBottom: '18px' }}>
              <label className="form-check" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
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

            <div className="modal-footer" style={{ padding: '16px 0 0', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button type="button" className="btn btn-secondary" onClick={onClose} disabled={submitting}>
                Hủy bỏ
              </button>
              <button type="submit" className="btn btn-primary" disabled={submitting} data-testid="submit-time-entry-btn">
                {submitting ? 'Đang lưu…' : isEdit ? 'Lưu thay đổi' : 'Ghi giờ công'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
