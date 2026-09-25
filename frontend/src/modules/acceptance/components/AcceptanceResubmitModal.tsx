import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { ICONS } from '../../../components/common/icons';
import ModalPortal from '../../../components/common/ModalPortal';
import { useBackdropClick } from '../../../hooks/useBackdropClick';
import { AcceptanceApiError, resubmitAcceptance } from '../api/acceptanceApi';
import type { AcceptanceDetailRes } from '../types/acceptanceTypes';
import {
  NOTE_MAX_LENGTH,
  TITLE_MAX_LENGTH,
  parseMoneyInput,
  validateAcceptanceForm,
  type AcceptanceFormErrors,
} from '../validators/acceptanceValidators';
import { useDialogA11y } from '../../projects/components/deliveryUi';

interface Props {
  isOpen: boolean;
  certificate: AcceptanceDetailRes;
  onClose: () => void;
  onResubmitted: (updated: AcceptanceDetailRes) => void;
}

function formatAmount(value: number): string {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 2 }).format(value);
}

/**
 * NCL-12-CN-002 — Chỉnh sửa và nộp lại phiếu sau khi khách hàng từ chối. Backend kiểm tra lại QTN-24,
 * chụp lại danh sách công việc/phiên bản sản phẩm mới nhất, tăng lần nộp và đưa phiếu về chờ xác nhận.
 */
export default function AcceptanceResubmitModal({ isOpen, certificate, onClose, onResubmitted }: Props) {
  const [title, setTitle] = useState('');
  const [acceptedValue, setAcceptedValue] = useState('');
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState<AcceptanceFormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const backdrop = useBackdropClick(onClose, submitting);

  useEffect(() => {
    if (!isOpen) return;
    setTitle(certificate.title ?? '');
    setAcceptedValue(String(certificate.acceptedValue ?? ''));
    setNote(certificate.note ?? '');
    setErrors({});
    setSaveError(null);
  }, [isOpen, certificate]);

  const dialogRef = useDialogA11y(isOpen, onClose, submitting);

  if (!isOpen) return null;

  const parsedValue = parseMoneyInput(acceptedValue);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    const { isValid, errors: next } = validateAcceptanceForm({
      workPackageId: certificate.workPackageId,
      title,
      acceptedValue,
      note,
    });
    setErrors(next);
    if (!isValid) return;
    setSubmitting(true);
    setSaveError(null);
    try {
      const updated = await resubmitAcceptance(certificate.id, {
        title: title.trim() || null,
        acceptedValue: parsedValue,
        note: note.trim() || null,
      });
      onResubmitted(updated);
    } catch (err) {
      setSaveError(err instanceof AcceptanceApiError ? err.message : 'Không nộp lại được phiếu. Vui lòng thử lại.');
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
        aria-labelledby="acceptance-resubmit-title"
      >
        <div ref={dialogRef} className="modal-card dl-modal" style={{ width: 'min(100%, 600px)' }} data-testid="acceptance-resubmit-modal">
          <div className="modal-header">
            <div className="modal-header__title-wrap">
              <h3 id="acceptance-resubmit-title" className="modal-title">
                <span className="modal-title__icon">{ICONS.edit}</span>
                Chỉnh sửa và nộp lại phiếu
              </h3>
              <p className="field-hint">
                Phiếu {certificate.certificateCode} · sẽ nộp lần {certificate.revisionNo + 1}
              </p>
            </div>
            <button type="button" className="modal-close" onClick={onClose} disabled={submitting} aria-label="Đóng">
              {ICONS.close}
            </button>
          </div>

          <div className="modal-body">
            {certificate.lastRejectionReason && (
              <div className="alert-box alert-box--warning">
                <span className="alert-box__icon">{ICONS.alertTriangle}</span>
                <div className="alert-box__content">
                  <strong>Khách hàng đã từ chối với lý do</strong>
                  {certificate.lastRejectionReason}
                </div>
              </div>
            )}
            {saveError && (
              <div className="alert-box alert-box--danger" role="alert" data-testid="acceptance-resubmit-error">
                <span className="alert-box__icon">{ICONS.alertTriangle}</span>
                <div className="alert-box__content">{saveError}</div>
              </div>
            )}
            <p className="field-hint" style={{ marginTop: 0 }}>
              Khi nộp lại, hệ thống kiểm tra lại toàn bộ công việc của hạng mục và chụp lại danh sách công việc cùng
              phiên bản sản phẩm bàn giao mới nhất.
            </p>

            <form onSubmit={(e) => void handleSubmit(e)} noValidate>
              <div className="form-grid">
                <div className="form-field">
                  <label className="form-label required" htmlFor="acceptance-resubmit-value">Giá trị nghiệm thu (VND)</label>
                  <input
                    id="acceptance-resubmit-value"
                    type="text"
                    inputMode="decimal"
                    className={`form-input ${errors.acceptedValue ? 'form-input--error' : ''}`}
                    value={acceptedValue}
                    onChange={(e) => {
                      setAcceptedValue(e.target.value);
                      setErrors((prev) => ({ ...prev, acceptedValue: undefined }));
                    }}
                    disabled={submitting}
                  />
                  {errors.acceptedValue ? (
                    <span className="field-error">{errors.acceptedValue}</span>
                  ) : (
                    !Number.isNaN(parsedValue) && parsedValue >= 0 && (
                      <span className="field-hint">= {formatAmount(parsedValue)}</span>
                    )
                  )}
                </div>
                <div className="form-field">
                  <label className="form-label" htmlFor="acceptance-resubmit-title-input">Tiêu đề phiếu</label>
                  <input
                    id="acceptance-resubmit-title-input"
                    className={`form-input ${errors.title ? 'form-input--error' : ''}`}
                    maxLength={TITLE_MAX_LENGTH}
                    value={title}
                    onChange={(e) => {
                      setTitle(e.target.value);
                      setErrors((prev) => ({ ...prev, title: undefined }));
                    }}
                    disabled={submitting}
                  />
                  {errors.title && <span className="field-error">{errors.title}</span>}
                </div>
                <div className="form-field form-field--full">
                  <label className="form-label" htmlFor="acceptance-resubmit-note">Ghi chú</label>
                  <textarea
                    id="acceptance-resubmit-note"
                    className={`form-textarea ${errors.note ? 'form-input--error' : ''}`}
                    rows={3}
                    maxLength={NOTE_MAX_LENGTH}
                    placeholder="Ví dụ: Đã bổ sung tài liệu hướng dẫn sử dụng"
                    value={note}
                    onChange={(e) => {
                      setNote(e.target.value);
                      setErrors((prev) => ({ ...prev, note: undefined }));
                    }}
                    disabled={submitting}
                  />
                  {errors.note && <span className="field-error">{errors.note}</span>}
                </div>
              </div>

              <div style={{ marginTop: '16px', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={onClose} disabled={submitting}>
                  Hủy
                </button>
                <button type="submit" className="btn-primary" disabled={submitting} data-testid="acceptance-resubmit-submit">
                  {submitting ? 'Đang nộp lại…' : 'Nộp lại phiếu'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
