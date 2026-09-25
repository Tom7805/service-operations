import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { ICONS } from '../../../components/common/icons';
import ModalPortal from '../../../components/common/ModalPortal';
import { useBackdropClick } from '../../../hooks/useBackdropClick';
import { AcceptanceApiError, createDeliverableVersion } from '../api/acceptanceApi';
import type { DeliverableRes, DeliverableVersionRes } from '../types/acceptanceTypes';
import {
  FILE_URL_MAX_LENGTH,
  NOTE_MAX_LENGTH,
  RECEIVER_MAX_LENGTH,
  VERSION_NO_MAX_LENGTH,
  simulatedDeliverablePath,
  suggestNextVersionNo,
  todayLocalIso,
  validateVersionForm,
  type VersionFormErrors,
} from '../validators/acceptanceValidators';
import { useDialogA11y } from '../../projects/components/deliveryUi';

interface Props {
  isOpen: boolean;
  deliverable: DeliverableRes;
  onClose: () => void;
  onCreated: (version: DeliverableVersionRes) => void;
}

/**
 * NCL-12-CN-004 — Bàn giao một phiên bản mới của sản phẩm (TC-01): lưu phiên bản mới, các phiên bản cũ giữ
 * nguyên. Số phiên bản trùng với bản đã có (không phân biệt hoa thường, bỏ khoảng trắng) bị báo ngay trên ô
 * nhập và yêu cầu đặt số khác (TC-02) — backend cũng chặn bằng 409 nếu có người vừa lưu cùng số.
 */
export default function DeliverableVersionModal({ isOpen, deliverable, onClose, onCreated }: Props) {
  const existingNos = deliverable.versions.map((v) => v.versionNo);
  const [versionNo, setVersionNo] = useState('');
  const [deliveredDate, setDeliveredDate] = useState(todayLocalIso());
  const [receiverName, setReceiverName] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState<VersionFormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const backdrop = useBackdropClick(onClose, submitting);

  useEffect(() => {
    if (!isOpen) return;
    setVersionNo(suggestNextVersionNo(deliverable.latestVersion?.versionNo, deliverable.versions.map((v) => v.versionNo)));
    setDeliveredDate(todayLocalIso());
    setReceiverName(deliverable.latestVersion?.receiverName ?? '');
    setFileUrl('');
    setNote('');
    setErrors({});
    setSaveError(null);
  }, [isOpen, deliverable]);

  const dialogRef = useDialogA11y(isOpen, onClose, submitting);

  if (!isOpen) return null;

  const clear = (field: keyof VersionFormErrors) => {
    setErrors((prev) => ({ ...prev, [field]: undefined }));
    setSaveError(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    const { isValid, errors: next } = validateVersionForm(
      { versionNo, deliveredDate, receiverName, fileUrl, note },
      existingNos
    );
    setErrors(next);
    if (!isValid) return;
    setSubmitting(true);
    try {
      const created = await createDeliverableVersion(deliverable.id, {
        versionNo: versionNo.trim(),
        deliveredDate,
        receiverName: receiverName.trim(),
        fileUrl: fileUrl.trim() || null,
        note: note.trim() || null,
      });
      onCreated(created);
    } catch (err) {
      if (err instanceof AcceptanceApiError && err.code === 'DUPLICATE_DATA') {
        setErrors((prev) => ({
          ...prev,
          versionNo: `Phiên bản "${versionNo.trim()}" đã tồn tại — vui lòng đặt số phiên bản khác`,
        }));
      } else {
        setSaveError(err instanceof AcceptanceApiError ? err.message : 'Không lưu được phiên bản bàn giao.');
      }
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
        aria-labelledby="deliverable-version-title"
      >
        <div ref={dialogRef} className="modal-card dl-modal" style={{ width: 'min(100%, 600px)' }} data-testid="deliverable-version-modal">
          <div className="modal-header">
            <div className="modal-header__title-wrap">
              <h3 id="deliverable-version-title" className="modal-title">
                <span className="modal-title__icon">{ICONS.upload}</span>
                Bàn giao phiên bản mới
              </h3>
              <p className="field-hint">
                {deliverable.name} · {deliverable.workPackageName} ·{' '}
                {deliverable.latestVersion ? `mới nhất: ${deliverable.latestVersion.versionNo}` : 'chưa bàn giao lần nào'}
              </p>
            </div>
            <button type="button" className="modal-close" onClick={onClose} disabled={submitting} aria-label="Đóng">
              {ICONS.close}
            </button>
          </div>
          <div className="modal-body">
            {saveError && (
              <div className="alert-box alert-box--danger" role="alert" data-testid="deliverable-version-error">
                <span className="alert-box__icon">{ICONS.alertTriangle}</span>
                <div className="alert-box__content">{saveError}</div>
              </div>
            )}
            {deliverable.versions.length > 0 && (
              <div className="alert-box alert-box--info">
                <span className="alert-box__icon">{ICONS.info}</span>
                <div className="alert-box__content">
                  Các phiên bản đã bàn giao ({existingNos.join(', ')}) được giữ nguyên — lần bàn giao này tạo một phiên bản mới.
                </div>
              </div>
            )}
            <form onSubmit={(e) => void handleSubmit(e)} noValidate>
              <div className="form-grid">
                <div className="form-field">
                  <label className="form-label required" htmlFor="version-no">Số phiên bản</label>
                  <input
                    id="version-no"
                    className={`form-input ${errors.versionNo ? 'form-input--error' : ''}`}
                    maxLength={VERSION_NO_MAX_LENGTH}
                    placeholder="Ví dụ: 1.1"
                    value={versionNo}
                    onChange={(e) => {
                      setVersionNo(e.target.value);
                      clear('versionNo');
                    }}
                    disabled={submitting}
                  />
                  {errors.versionNo && (
                    <span className="field-error" data-testid="version-no-error">{errors.versionNo}</span>
                  )}
                </div>
                <div className="form-field">
                  <label className="form-label required" htmlFor="version-date">Ngày bàn giao</label>
                  <input
                    id="version-date"
                    type="date"
                    className={`form-input ${errors.deliveredDate ? 'form-input--error' : ''}`}
                    max={todayLocalIso()}
                    value={deliveredDate}
                    onChange={(e) => {
                      setDeliveredDate(e.target.value);
                      clear('deliveredDate');
                    }}
                    disabled={submitting}
                  />
                  {errors.deliveredDate && <span className="field-error">{errors.deliveredDate}</span>}
                </div>
                <div className="form-field form-field--full">
                  <label className="form-label required" htmlFor="version-receiver">Người nhận (phía khách hàng)</label>
                  <input
                    id="version-receiver"
                    className={`form-input ${errors.receiverName ? 'form-input--error' : ''}`}
                    maxLength={RECEIVER_MAX_LENGTH}
                    placeholder="Ví dụ: Lê Văn C"
                    value={receiverName}
                    onChange={(e) => {
                      setReceiverName(e.target.value);
                      clear('receiverName');
                    }}
                    disabled={submitting}
                  />
                  {errors.receiverName && <span className="field-error">{errors.receiverName}</span>}
                </div>
                <div className="form-field form-field--full">
                  <label className="form-label" htmlFor="version-file">Tệp bàn giao</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      id="version-file"
                      className={`form-input ${errors.fileUrl ? 'form-input--error' : ''}`}
                      style={{ flex: 1, minWidth: 0 }}
                      maxLength={FILE_URL_MAX_LENGTH}
                      placeholder="/files/tai-lieu-thiet-ke-1.1.pdf (không bắt buộc)"
                      value={fileUrl}
                      onChange={(e) => {
                        setFileUrl(e.target.value);
                        clear('fileUrl');
                      }}
                      disabled={submitting}
                    />
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ whiteSpace: 'nowrap' }}
                      onClick={() => fileInputRef.current?.click()}
                      disabled={submitting}
                    >
                      <span className="icon-xs">{ICONS.upload}</span> Chọn tệp
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      hidden
                      data-testid="version-file-input"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) {
                          setFileUrl(simulatedDeliverablePath(deliverable.id, versionNo, f.name));
                          clear('fileUrl');
                        }
                        e.target.value = '';
                      }}
                    />
                  </div>
                  {errors.fileUrl ? (
                    <span className="field-error">{errors.fileUrl}</span>
                  ) : (
                    <span className="field-hint">Tệp được lưu dạng đường dẫn mô phỏng.</span>
                  )}
                </div>
                <div className="form-field form-field--full">
                  <label className="form-label" htmlFor="version-note">Ghi chú</label>
                  <textarea
                    id="version-note"
                    className={`form-textarea ${errors.note ? 'form-input--error' : ''}`}
                    rows={2}
                    maxLength={NOTE_MAX_LENGTH}
                    placeholder="Ví dụ: Bổ sung chương 4"
                    value={note}
                    onChange={(e) => {
                      setNote(e.target.value);
                      clear('note');
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
                <button type="submit" className="btn-primary" disabled={submitting} data-testid="deliverable-version-submit">
                  {submitting ? 'Đang lưu…' : 'Lưu phiên bản'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
