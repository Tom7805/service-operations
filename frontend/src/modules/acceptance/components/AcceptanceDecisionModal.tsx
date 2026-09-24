import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { ICONS } from '../../../components/common/icons';
import ModalPortal from '../../../components/common/ModalPortal';
import { useBackdropClick } from '../../../hooks/useBackdropClick';
import { AcceptanceApiError, confirmAcceptance, rejectAcceptance } from '../api/acceptanceApi';
import { MILESTONE_STATUS_META, type AcceptanceDetailRes } from '../types/acceptanceTypes';
import {
  MINUTES_URL_MAX_LENGTH,
  REASON_MAX_LENGTH,
  SIGNER_MAX_LENGTH,
  simulatedMinutesPath,
  todayLocalIso,
  validateConfirmForm,
  validateRejectForm,
} from '../validators/acceptanceValidators';

export type AcceptanceDecisionMode = 'confirm' | 'reject';

interface Props {
  isOpen: boolean;
  mode: AcceptanceDecisionMode;
  certificate: AcceptanceDetailRes;
  onClose: () => void;
  onDone: (updated: AcceptanceDetailRes, mode: AcceptanceDecisionMode) => void;
}

function formatAmount(value: number): string {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 2 }).format(value);
}

function formatDate(iso: string): string {
  return iso ? iso.split('-').reverse().join('/') : '—';
}

/**
 * NCL-12-CN-002 — Quản lý dự án ghi nhận kết quả khách hàng đưa ra cho phiếu đang chờ xác nhận:
 * - `confirm` (TC-01): người ký, ngày ký, biên bản đã ký (tệp mô phỏng) → phiếu ĐÃ NGHIỆM THU, khoá nội
 *   dung và mốc thanh toán đã gắn được mở (QTN-25). Thao tác không hoàn tác nên có bước xác nhận.
 * - `reject` (TC-02): lý do bắt buộc → phiếu về CẦN CHỈNH SỬA, lý do được lưu.
 * Mỗi lần ghi nhận thêm một dòng lịch sử và một bản ghi Nhật ký hệ thống (TC-04).
 */
export default function AcceptanceDecisionModal({ isOpen, mode, certificate, onClose, onDone }: Props) {
  const isConfirm = mode === 'confirm';
  const [signerName, setSignerName] = useState('');
  const [signedDate, setSignedDate] = useState(todayLocalIso());
  const [minutesUrl, setMinutesUrl] = useState('');
  const [reason, setReason] = useState('');
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [step, setStep] = useState<'form' | 'review'>('form');
  const [submitting, setSubmitting] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const backdrop = useBackdropClick(onClose, submitting);

  useEffect(() => {
    if (!isOpen) return;
    setSignerName('');
    setSignedDate(todayLocalIso());
    setMinutesUrl('');
    setReason('');
    setErrors({});
    setStep('form');
    setSaveError(null);
  }, [isOpen, mode]);

  if (!isOpen) return null;

  const clearError = (field: string) => {
    setErrors((prev) => ({ ...prev, [field]: undefined }));
    setSaveError(null);
  };

  const handleFilePicked = (file: File | undefined) => {
    if (!file) return;
    setMinutesUrl(simulatedMinutesPath(certificate.certificateCode, file.name));
    clearError('minutesUrl');
  };

  const submit = async () => {
    setSubmitting(true);
    setSaveError(null);
    try {
      const updated = isConfirm
        ? await confirmAcceptance(certificate.id, {
            signerName: signerName.trim(),
            signedDate,
            minutesUrl: minutesUrl.trim(),
          })
        : await rejectAcceptance(certificate.id, {
            reason: reason.trim(),
            signerName: signerName.trim() || null,
            minutesUrl: minutesUrl.trim() || null,
          });
      onDone(updated, mode);
    } catch (err) {
      setSaveError(
        err instanceof AcceptanceApiError
          ? err.message
          : isConfirm
            ? 'Không ghi nhận được xác nhận của khách hàng. Vui lòng thử lại.'
            : 'Không ghi nhận được kết quả từ chối. Vui lòng thử lại.'
      );
      setStep('form');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    if (isConfirm) {
      const { isValid, errors: next } = validateConfirmForm({ signerName, signedDate, minutesUrl }, certificate.createdAt);
      setErrors(next);
      if (isValid) setStep('review');
    } else {
      const { isValid, errors: next } = validateRejectForm({ reason, signerName, minutesUrl });
      setErrors(next);
      if (isValid) void submit();
    }
  };

  const milestone = certificate.paymentMilestone;
  const titleId = 'acceptance-decision-modal-title';

  return (
    <ModalPortal>
      <div
        className="modal-backdrop"
        onMouseDown={backdrop.onMouseDown}
        onClick={backdrop.onClick}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="modal-card" style={{ width: 'min(100%, 600px)' }} data-testid="acceptance-decision-modal">
          <div className="modal-header">
            <div className="modal-header__title-wrap">
              <h3 id={titleId} className="modal-title">
                <span className="modal-title__icon">{isConfirm ? ICONS.checkCircle : ICONS.close}</span>
                {isConfirm
                  ? step === 'review'
                    ? 'Xác nhận ghi nhận nghiệm thu'
                    : 'Ghi nhận khách hàng xác nhận'
                  : 'Ghi nhận khách hàng từ chối'}
              </h3>
              <p className="field-hint">
                Phiếu {certificate.certificateCode} · lần nộp {certificate.revisionNo} · {formatAmount(certificate.acceptedValue)}
              </p>
            </div>
            <button type="button" className="modal-close" onClick={onClose} disabled={submitting} aria-label="Đóng">
              {ICONS.close}
            </button>
          </div>

          <div className="modal-body">
            {saveError && (
              <div className="alert-box alert-box--danger" role="alert" data-testid="acceptance-decision-error">
                <span className="alert-box__icon">{ICONS.alertTriangle}</span>
                <div className="alert-box__content">{saveError}</div>
              </div>
            )}

            {isConfirm && step === 'review' ? (
              <div data-testid="acceptance-decision-review">
                <div className="alert-box alert-box--warning">
                  <span className="alert-box__icon">{ICONS.lock}</span>
                  <div className="alert-box__content">
                    <strong>Thao tác không thể hoàn tác</strong>
                    Phiếu chuyển sang <b>Đã nghiệm thu</b> và khoá nội dung — không chỉnh sửa hay nộp lại được nữa.
                    {milestone
                      ? milestone.status === 'PENDING'
                        ? ` Mốc thanh toán "${milestone.name}" sẽ được mở sang Sẵn sàng xuất hóa đơn.`
                        : ` Mốc thanh toán "${milestone.name}" đang ở trạng thái ${MILESTONE_STATUS_META[milestone.status]?.label ?? milestone.status}.`
                      : ' Phiếu chưa gắn mốc thanh toán — mốc sẽ được mở ngay khi Kế toán gắn phiếu vào mốc.'}
                  </div>
                </div>
                <div className="detail-grid" style={{ marginBottom: '16px' }}>
                  <div className="detail-field">
                    <span className="detail-label">Người ký xác nhận</span>
                    <span className="detail-value">{signerName.trim()}</span>
                  </div>
                  <div className="detail-field">
                    <span className="detail-label">Ngày ký</span>
                    <span className="detail-value">{formatDate(signedDate)}</span>
                  </div>
                  <div className="detail-field" style={{ gridColumn: '1 / -1' }}>
                    <span className="detail-label">Biên bản đã ký</span>
                    <span className="detail-value" style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: '14px', overflowWrap: 'anywhere' }}>
                      {minutesUrl.trim()}
                    </span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setStep('form')} disabled={submitting}>
                    Quay lại sửa
                  </button>
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={() => void submit()}
                    disabled={submitting}
                    data-testid="acceptance-decision-confirm"
                  >
                    {submitting ? 'Đang ghi nhận…' : 'Xác nhận đã nghiệm thu'}
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} noValidate>
                {!isConfirm && (
                  <div className="form-field" style={{ marginBottom: '14px' }}>
                    <label className="form-label required" htmlFor="acceptance-reject-reason">Lý do khách hàng từ chối</label>
                    <textarea
                      id="acceptance-reject-reason"
                      className={`form-textarea ${errors.reason ? 'form-input--error' : ''}`}
                      rows={4}
                      maxLength={REASON_MAX_LENGTH}
                      placeholder="Ví dụ: Thiếu tài liệu hướng dẫn sử dụng"
                      value={reason}
                      onChange={(e) => {
                        setReason(e.target.value);
                        clearError('reason');
                      }}
                      disabled={submitting}
                    />
                    {errors.reason ? (
                      <span className="field-error">{errors.reason}</span>
                    ) : (
                      <span className="field-hint">
                        Lý do được lưu vào phiếu để nhóm dự án chỉnh sửa trước khi nộp lại · {reason.length}/{REASON_MAX_LENGTH}
                      </span>
                    )}
                  </div>
                )}

                <div className="form-grid">
                  <div className="form-field">
                    <label className={`form-label ${isConfirm ? 'required' : ''}`} htmlFor="acceptance-signer">
                      Người đại diện khách hàng
                    </label>
                    <input
                      id="acceptance-signer"
                      className={`form-input ${errors.signerName ? 'form-input--error' : ''}`}
                      maxLength={SIGNER_MAX_LENGTH}
                      placeholder="Ví dụ: Nguyễn Văn A"
                      value={signerName}
                      onChange={(e) => {
                        setSignerName(e.target.value);
                        clearError('signerName');
                      }}
                      disabled={submitting}
                    />
                    {errors.signerName && <span className="field-error">{errors.signerName}</span>}
                  </div>
                  {isConfirm && (
                    <div className="form-field">
                      <label className="form-label required" htmlFor="acceptance-signed-date">Ngày ký biên bản</label>
                      <input
                        id="acceptance-signed-date"
                        type="date"
                        className={`form-input ${errors.signedDate ? 'form-input--error' : ''}`}
                        value={signedDate}
                        min={certificate.createdAt.slice(0, 10)}
                        max={todayLocalIso()}
                        onChange={(e) => {
                          setSignedDate(e.target.value);
                          clearError('signedDate');
                        }}
                        disabled={submitting}
                      />
                      {errors.signedDate && <span className="field-error">{errors.signedDate}</span>}
                    </div>
                  )}
                  <div className="form-field form-field--full">
                    <label className={`form-label ${isConfirm ? 'required' : ''}`} htmlFor="acceptance-minutes-url">
                      Biên bản nghiệm thu {isConfirm ? 'đã ký' : '(nếu có)'}
                    </label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input
                        id="acceptance-minutes-url"
                        className={`form-input ${errors.minutesUrl ? 'form-input--error' : ''}`}
                        style={{ flex: 1, minWidth: 0 }}
                        maxLength={MINUTES_URL_MAX_LENGTH}
                        placeholder="/files/bien-ban-nghiem-thu.pdf"
                        value={minutesUrl}
                        onChange={(e) => {
                          setMinutesUrl(e.target.value);
                          clearError('minutesUrl');
                        }}
                        disabled={submitting}
                      />
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={submitting}
                        style={{ whiteSpace: 'nowrap' }}
                      >
                        <span className="icon-xs">{ICONS.upload}</span> Chọn tệp
                      </button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                        hidden
                        data-testid="acceptance-minutes-file"
                        onChange={(e) => {
                          handleFilePicked(e.target.files?.[0]);
                          e.target.value = '';
                        }}
                      />
                    </div>
                    {errors.minutesUrl ? (
                      <span className="field-error">{errors.minutesUrl}</span>
                    ) : (
                      <span className="field-hint">Tệp biên bản được lưu dạng đường dẫn mô phỏng.</span>
                    )}
                  </div>
                </div>

                <div style={{ marginTop: '16px', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                  <button type="button" className="btn btn-secondary" onClick={onClose} disabled={submitting}>
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className={isConfirm ? 'btn-primary' : 'btn btn-danger'}
                    disabled={submitting}
                    data-testid="acceptance-decision-submit"
                  >
                    {isConfirm ? 'Tiếp tục' : submitting ? 'Đang ghi nhận…' : 'Ghi nhận từ chối'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
