import { useState, useEffect, useRef, type FormEvent, type ChangeEvent } from 'react';
import type { CustomerCreatePayload, DuplicateCandidate } from '../types/customerTypes';
import {
  CUSTOMER_VALIDATION_LIMITS,
  validateDuplicateOverrideReason,
} from '../validators/customerValidators';
import { ICONS } from '../../../components/common/icons';

interface DuplicateWarningModalProps {
  isOpen: boolean;
  currentPayload: CustomerCreatePayload;
  candidates: DuplicateCandidate[];
  onBackToEdit: () => void;
  onConfirmOverride: (reason: string) => Promise<void>;
  isLoading?: boolean;
}

export default function DuplicateWarningModal({
  isOpen,
  currentPayload,
  candidates,
  onBackToEdit,
  onConfirmOverride,
  isLoading = false,
}: DuplicateWarningModalProps) {
  const [showOverrideForm, setShowOverrideForm] = useState(false);
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  const reasonInputRef = useRef<HTMLTextAreaElement>(null);

  // Reset state khi mở modal
  useEffect(() => {
    if (isOpen) {
      setShowOverrideForm(false);
      setReason('');
      setReasonError(null);
      setServerError(null);
    }
  }, [isOpen]);

  // Focus ô nhập lý do khi mở form override
  useEffect(() => {
    if (showOverrideForm) {
      const timer = setTimeout(() => {
        reasonInputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [showOverrideForm]);

  // Xử lý phím Escape để quay lại chỉnh sửa
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isLoading) {
        onBackToEdit();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isLoading, onBackToEdit]);

  if (!isOpen) return null;

  const handleReasonChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setReason(val);
    if (reasonError) {
      const err = validateDuplicateOverrideReason(val);
      setReasonError(err);
    }
  };

  const handleOverrideSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setServerError(null);

    const err = validateDuplicateOverrideReason(reason);
    if (err) {
      setReasonError(err);
      return;
    }

    try {
      await onConfirmOverride(reason);
    } catch (apiErr: unknown) {
      if (apiErr instanceof Error) {
        setServerError(apiErr.message);
      } else {
        setServerError('Không thể tạo hồ sơ khách hàng. Vui lòng thử lại.');
      }
    }
  };

  const hasHighSimilarity = candidates.some((c) => c.similarity >= 0.9);

  return (
    <div
      className="modal-backdrop duplicate-modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isLoading) {
          onBackToEdit();
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="duplicate-modal-title"
    >
      <div className="modal-card duplicate-modal-card">
        {/* Header cảnh báo */}
        <div className="modal-header duplicate-modal-header">
          <div className="modal-header__title-wrap">
            <div className="duplicate-warning-icon-badge" aria-hidden="true">
              {ICONS.alertTriangle}
            </div>
            <div>
              <div className="duplicate-header-badge">
                <span>CẢNH BÁO TRÙNG LẶP HỒ SƠ</span>
                <span className="duplicate-count-pill">{candidates.length} hồ sơ nghi trùng</span>
              </div>
              <h3 id="duplicate-modal-title" className="modal-title duplicate-title">
                Phát hiện hồ sơ khách hàng tương tự trong hệ thống
              </h3>
              <p className="modal-subtitle">
                Hệ thống phát hiện thông tin bạn vừa nhập có mức độ tương đồng cao với dữ liệu hiện có.
                Vui lòng đối chiếu kỹ trước khi quyết định tạo mới.
              </p>
            </div>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onBackToEdit}
            disabled={isLoading}
            aria-label="Đóng cửa sổ và quay lại chỉnh sửa"
          >
            {ICONS.close}
          </button>
        </div>

        <div className="modal-body duplicate-modal-body">
          {serverError && (
            <div className="alert-box alert-box--danger" role="alert">
              <span className="alert-box__icon">{ICONS.alertTriangle}</span>
              <div className="alert-box__content">
                <strong>Đã xảy ra lỗi:</strong>
                <p>{serverError}</p>
              </div>
            </div>
          )}

          {hasHighSimilarity && (
            <div className="duplicate-high-alert-banner" role="alert">
              <span className="duplicate-high-alert-icon">{ICONS.alertTriangle}</span>
              <div className="duplicate-high-alert-text">
                <strong>Cảnh báo mức độ nghiêm trọng:</strong>
                <p>
                  Có hồ sơ trùng khớp từ <strong>90% trở lên</strong>. Hệ thống sẽ{' '}
                  <span className="text-danger-strong">chặn lưu thông thường</span>. Nếu đây thực sự
                  là hai khách hàng khác nhau, bạn bắt buộc phải nhập lý do giải trình.
                </p>
              </div>
            </div>
          )}

          {/* Khối tóm tắt hồ sơ đang tạo */}
          <div className="current-candidate-summary">
            <div className="current-candidate-header">
              <span className="current-candidate-label"><span className="icon-sm">{ICONS.clipboardList}</span> Hồ sơ bạn đang dự định tạo:</span>
            </div>
            <div className="current-candidate-grid">
              <div className="current-field">
                <span className="current-field__name">Tên khách hàng:</span>
                <strong className="current-field__val">{currentPayload.name}</strong>
              </div>
              <div className="current-field">
                <span className="current-field__name">Mã số thuế:</span>
                <span className="current-field__val">{currentPayload.taxCode || '—'}</span>
              </div>
              <div className="current-field">
                <span className="current-field__name">Số điện thoại:</span>
                <span className="current-field__val">{currentPayload.phone || '—'}</span>
              </div>
              <div className="current-field">
                <span className="current-field__name">Ngành nghề:</span>
                <span className="current-field__val">{currentPayload.industry || '—'}</span>
              </div>
            </div>
          </div>

          {/* Danh sách các ứng viên nghi trùng */}
          <div className="duplicate-candidates-section">
            <h4 className="duplicate-section-title">
              {ICONS.search} Danh sách hồ sơ đã tồn tại trùng khớp ({candidates.length})
            </h4>

            <div className="duplicate-candidates-list">
              {candidates.map((cand, idx) => {
                const percent = Math.round(cand.similarity * 100);
                const isHigh = cand.similarity >= 0.9;
                const matchesName = cand.matchedFields.includes('ten');
                const matchesTaxCode = cand.matchedFields.includes('maSoThue');
                const matchesPhone = cand.matchedFields.includes('soDienThoai');

                return (
                  <div
                    key={cand.id || cand.code || idx}
                    className={`candidate-card ${isHigh ? 'candidate-card--high' : 'candidate-card--medium'}`}
                  >
                    <div className="candidate-card__header">
                      <div className="candidate-card__identity">
                        <span className="candidate-code-pill">{cand.code}</span>
                        <h5 className="candidate-name">{cand.name}</h5>
                      </div>
                      <div className="candidate-similarity-wrap">
                        <div
                          className={`similarity-badge ${
                            isHigh ? 'similarity-badge--high' : 'similarity-badge--medium'
                          }`}
                        >
                          <span className="similarity-badge__dot" />
                          <span className="similarity-badge__text">
                            {isHigh ? ICONS.alertTriangle : ICONS.info} {isHigh ? 'Trùng khớp cao' : 'Nghi ngờ trùng'} {percent}%
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Matched fields tags */}
                    <div className="candidate-matched-tags">
                      <span className="matched-tags-label">Trường dữ liệu trùng khớp:</span>
                      {matchesName && (
                        <span className="matched-tag matched-tag--name">
                          {ICONS.building} Tên công ty tương tự
                        </span>
                      )}
                      {matchesTaxCode && (
                        <span className="matched-tag matched-tag--tax">
                          {ICONS.hash} Trùng Mã số thuế
                        </span>
                      )}
                      {matchesPhone && (
                        <span className="matched-tag matched-tag--phone">
                          {ICONS.phone} Trùng Số điện thoại
                        </span>
                      )}
                    </div>

                    {/* Comparison details */}
                    <div className="candidate-comparison-table">
                      <div className={`comp-row ${matchesName ? 'comp-row--matched' : ''}`}>
                        <span className="comp-label">Tên đầy đủ:</span>
                        <span className="comp-value">{cand.name}</span>
                        {matchesName && <span className="comp-match-indicator">Trùng khớp</span>}
                      </div>

                      <div className={`comp-row ${matchesTaxCode ? 'comp-row--matched' : ''}`}>
                        <span className="comp-label">Mã số thuế:</span>
                        <span className="comp-value">{cand.taxCode || '—'}</span>
                        {matchesTaxCode && <span className="comp-match-indicator">Trùng khớp</span>}
                      </div>

                      <div className={`comp-row ${matchesPhone ? 'comp-row--matched' : ''}`}>
                        <span className="comp-label">Số điện thoại:</span>
                        <span className="comp-value">{cand.phone || '—'}</span>
                        {matchesPhone && <span className="comp-match-indicator">Trùng khớp</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Form nhập lý do bỏ qua cảnh báo */}
          {showOverrideForm && (
            <form
              id="override-reason-form"
              onSubmit={handleOverrideSubmit}
              noValidate
              className="override-reason-box"
            >
              <div className="override-reason-header">
                <span className="override-icon">{ICONS.edit}</span>
                <div>
                  <h5 className="override-title">Xác nhận bỏ qua cảnh báo & Tạo hồ sơ mới</h5>
                  <p className="override-desc">
                    Vui lòng cung cấp lý do cụ thể vì sao đây là hai khách hàng khác nhau. Dữ liệu này
                    sẽ được lưu vào <strong>Nhật ký kiểm toán (Audit Log)</strong> để phục vụ hậu kiểm.
                  </p>
                </div>
              </div>

              <div className="form-group">
                <div className="form-label-row">
                  <label htmlFor="override-reason-input" className="form-label required">
                    Lý do xác nhận tạo mới
                  </label>
                  <span
                    className={`char-counter ${
                      reason.length > CUSTOMER_VALIDATION_LIMITS.OVERRIDE_REASON_MAX_LENGTH
                        ? 'char-counter--overflow'
                        : ''
                    }`}
                  >
                    {reason.length}/{CUSTOMER_VALIDATION_LIMITS.OVERRIDE_REASON_MAX_LENGTH}
                  </span>
                </div>
                <textarea
                  ref={reasonInputRef}
                  id="override-reason-input"
                  name="reason"
                  rows={3}
                  className={`form-textarea ${reasonError ? 'form-input--error' : ''}`}
                  placeholder="Ví dụ: Hai pháp nhân độc lập thuộc cùng tập đoàn / Trùng tên viết tắt nhưng khác MST và đại diện pháp luật..."
                  value={reason}
                  onChange={handleReasonChange}
                  disabled={isLoading}
                  maxLength={CUSTOMER_VALIDATION_LIMITS.OVERRIDE_REASON_MAX_LENGTH + 20}
                  aria-invalid={Boolean(reasonError)}
                  aria-describedby={reasonError ? 'override-reason-error' : undefined}
                />
                {reasonError && (
                  <p id="override-reason-error" className="field-error-text" role="alert">
                    {reasonError}
                  </p>
                )}
              </div>

              <div className="override-quick-suggestions">
                <span className="suggestion-label">Gợi ý nhanh:</span>
                <button
                  type="button"
                  className="btn-suggestion"
                  onClick={() => {
                    setReason('Hai pháp nhân khác nhau, cùng tập đoàn mẹ');
                    setReasonError(null);
                  }}
                  disabled={isLoading}
                >
                  Cùng tập đoàn mẹ
                </button>
                <button
                  type="button"
                  className="btn-suggestion"
                  onClick={() => {
                    setReason('Trùng tên giao dịch viết tắt nhưng khác mã số thuế và đại diện pháp luật');
                    setReasonError(null);
                  }}
                  disabled={isLoading}
                >
                  Khác MST / Pháp nhân
                </button>
                <button
                  type="button"
                  className="btn-suggestion"
                  onClick={() => {
                    setReason('Khách hàng mở thêm chi nhánh mới tại địa bàn khác');
                    setReasonError(null);
                  }}
                  disabled={isLoading}
                >
                  Chi nhánh độc lập
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer hành động */}
        <div className="modal-footer duplicate-modal-footer">
          <div className="duplicate-footer-left">
            <button
              type="button"
              className="btn btn-secondary btn-back-to-edit"
              onClick={onBackToEdit}
              disabled={isLoading}
            >
              <span>←</span>
              <span>Quay lại chỉnh sửa thông tin</span>
            </button>
          </div>

          <div className="duplicate-footer-right">
            {!showOverrideForm ? (
              <button
                type="button"
                className="btn btn-warning-action"
                onClick={() => setShowOverrideForm(true)}
                disabled={isLoading}
              >
                <span className="icon-sm">{ICONS.alertTriangle}</span>
                <span>Vẫn tạo mới (Bỏ qua cảnh báo)</span>
              </button>
            ) : (
              <button
                type="submit"
                form="override-reason-form"
                className="btn btn-warning-action btn-confirm-override"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <span className="spinner-sm" aria-hidden="true" />
                    <span>Đang lưu hồ sơ và ghi log...</span>
                  </>
                ) : (
                  <>
                    <span className="icon-sm">{ICONS.shield}</span>
                    <span>Xác nhận tạo mới (Ghi nhật ký)</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

