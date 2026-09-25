import { FormEvent, useEffect, useState } from 'react';
import { ICONS } from '../../../components/common/icons';
import ModalPortal from '../../../components/common/ModalPortal';
import { useBackdropClick } from '../../../hooks/useBackdropClick';
import { confirmPortalAcceptance, PortalApiError, rejectPortalAcceptance } from '../api/portalApi';
import { PORTAL_REJECT_REASON_MAX, type PortalAcceptanceDetail } from '../types/portalTypes';
import { formatPortalMoney } from '../utils/portalFormat';

export type PortalDecisionMode = 'confirm' | 'reject';

interface Props {
  mode: PortalDecisionMode;
  certificate: PortalAcceptanceDetail;
  signerName: string;
  onClose: () => void;
  onDone: (updated: PortalAcceptanceDetail, mode: PortalDecisionMode) => void;
  /** Phiếu không còn chờ xác nhận (INVALID_STATE) — trang nạp lại phiếu. */
  onStale: () => void;
}

export function validateRejectReason(reason: string): string | undefined {
  const trimmed = reason.trim();
  if (!trimmed) return 'Vui lòng nhập lý do từ chối để quản lý dự án biết cần chỉnh sửa gì';
  if (trimmed.length > PORTAL_REJECT_REASON_MAX) return `Lý do tối đa ${PORTAL_REJECT_REASON_MAX} ký tự`;
  return undefined;
}

/**
 * NCL-13-CN-003 — khách hàng xác nhận (TC-01) hoặc từ chối kèm lý do bắt buộc (TC-02) một phiếu nghiệm thu. Xác nhận
 * không hoàn tác được: người ký là người liên hệ đang đăng nhập, ngày ký là hôm nay; phiếu bị khoá nội dung.
 */
export default function PortalAcceptanceDecisionModal({ mode, certificate, signerName, onClose, onDone, onStale }: Props) {
  const confirming = mode === 'confirm';
  const [agreed, setAgreed] = useState(false);
  const [reason, setReason] = useState('');
  const [fieldError, setFieldError] = useState<string | undefined>();
  const [saveError, setSaveError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setAgreed(false);
    setReason('');
    setFieldError(undefined);
    setSaveError(null);
  }, [mode, certificate.id]);

  const handleClose = () => {
    if (!submitting) onClose();
  };
  const backdrop = useBackdropClick(handleClose);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSaveError(null);
    if (confirming && !agreed) {
      setFieldError('Vui lòng tích xác nhận đã xem nội dung phiếu trước khi nghiệm thu');
      return;
    }
    if (!confirming) {
      const err = validateRejectReason(reason);
      setFieldError(err);
      if (err) return;
    }
    setSubmitting(true);
    try {
      const updated = confirming
        ? await confirmPortalAcceptance(certificate.id)
        : await rejectPortalAcceptance(certificate.id, reason.trim());
      onDone(updated, mode);
    } catch (err) {
      if (err instanceof PortalApiError && err.code === 'INVALID_STATE') {
        setSaveError('Phiếu không còn ở trạng thái chờ bạn xác nhận (có thể đã được xử lý). Nội dung phiếu đã được tải lại.');
        onStale();
      } else if (err instanceof PortalApiError && err.code === 'VALIDATION_ERROR') {
        setFieldError('Lý do từ chối không hợp lệ — vui lòng nhập lý do (tối đa 1000 ký tự)');
      } else {
        setSaveError(err instanceof Error && err.message ? err.message : 'Không gửi được quyết định. Vui lòng thử lại.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const today = new Date().toLocaleDateString('vi-VN');

  return (
    <ModalPortal>
      <div
        className="modal-backdrop"
        onMouseDown={backdrop.onMouseDown}
        onClick={backdrop.onClick}
        role="dialog"
        aria-modal="true"
        aria-labelledby="portal-decision-title"
      >
        <div
          className="modal-card"
          style={{ width: 'min(100%, 560px)' }}
          onClick={(e) => e.stopPropagation()}
          data-testid="portal-decision-modal"
        >
          <div className="modal-header">
            <div className="portal-modal-heading">
              <h3 id="portal-decision-title" className={`modal-title ${confirming ? '' : 'text-warning'}`}>
                <span className="modal-title__icon">{confirming ? ICONS.checkCircle : ICONS.close}</span>
                {confirming ? 'Xác nhận nghiệm thu' : 'Từ chối nghiệm thu'}
              </h3>
              <p className="field-hint">
                {certificate.certificateCode} · {certificate.title}
              </p>
            </div>
            <button type="button" className="modal-close" onClick={handleClose} disabled={submitting} aria-label="Đóng">
              {ICONS.close}
            </button>
          </div>
          <form className="modal-body" onSubmit={(e) => void handleSubmit(e)} noValidate>
            {saveError && (
              <div className="alert-box alert-box--danger" role="alert" data-testid="portal-decision-error">
                <span className="alert-box__icon">{ICONS.alertTriangle}</span>
                <div className="alert-box__content">{saveError}</div>
              </div>
            )}

            {confirming ? (
              <>
                <dl className="portal-credential-list" style={{ marginTop: 0 }}>
                  <div className="portal-credential-row">
                    <dt>Hạng mục</dt>
                    <dd>{certificate.workPackageName ?? '—'}</dd>
                  </div>
                  <div className="portal-credential-row">
                    <dt>Giá trị nghiệm thu</dt>
                    <dd>{formatPortalMoney(certificate.acceptedValue)}</dd>
                  </div>
                  <div className="portal-credential-row">
                    <dt>Người ký</dt>
                    <dd>{signerName}</dd>
                  </div>
                  <div className="portal-credential-row">
                    <dt>Ngày ký</dt>
                    <dd>{today}</dd>
                  </div>
                </dl>
                <label className="portal-agree" data-testid="portal-decision-agree">
                  <input
                    type="checkbox"
                    checked={agreed}
                    onChange={(e) => {
                      setAgreed(e.target.checked);
                      setFieldError(undefined);
                    }}
                    disabled={submitting}
                  />
                  <span>
                    Tôi đã xem nội dung, công việc và sản phẩm bàn giao của phiếu và đồng ý nghiệm thu thay mặt công ty.
                  </span>
                </label>
                {fieldError && <span className="field-error">{fieldError}</span>}
                <div className="confirm-note-box">
                  <span className="confirm-note-box__icon">{ICONS.info}</span>
                  <span>
                    Xác nhận không hoàn tác được: phiếu chuyển sang <strong>Đã nghiệm thu</strong>, nội dung bị khoá và mốc
                    thanh toán gắn với phiếu (nếu có) được mở để xuất hóa đơn.
                  </span>
                </div>
              </>
            ) : (
              <div className="form-field form-field--full">
                <label className="form-label required" htmlFor="portal-reject-reason">
                  Lý do từ chối
                </label>
                <textarea
                  id="portal-reject-reason"
                  className={`form-textarea ${fieldError ? 'form-input--error' : ''}`}
                  rows={5}
                  maxLength={PORTAL_REJECT_REASON_MAX}
                  placeholder="Ví dụ: Thiếu tài liệu hướng dẫn sử dụng; chức năng báo cáo chưa đúng mẫu..."
                  value={reason}
                  onChange={(e) => {
                    setReason(e.target.value);
                    setFieldError(undefined);
                  }}
                  disabled={submitting}
                  data-testid="portal-reject-reason"
                />
                {fieldError ? (
                  <span className="field-error" data-testid="portal-reject-reason-error">{fieldError}</span>
                ) : (
                  <span className="field-hint">
                    Bắt buộc, tối đa {PORTAL_REJECT_REASON_MAX} ký tự ({reason.trim().length}/{PORTAL_REJECT_REASON_MAX}). Phiếu
                    chuyển sang <strong>Đang chỉnh sửa</strong> và quản lý dự án được thông báo để sửa rồi gửi lại.
                  </span>
                )}
              </div>
            )}

            <div className="modal-footer" style={{ padding: '16px 0 0' }}>
              <button type="button" className="btn-secondary" onClick={handleClose} disabled={submitting}>
                Hủy
              </button>
              <button
                type="submit"
                className={`btn-primary ${confirming ? 'btn-success' : 'btn-danger'}`}
                disabled={submitting}
                data-testid="portal-decision-submit"
              >
                {submitting ? 'Đang gửi…' : confirming ? 'Xác nhận nghiệm thu' : 'Gửi từ chối'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </ModalPortal>
  );
}
