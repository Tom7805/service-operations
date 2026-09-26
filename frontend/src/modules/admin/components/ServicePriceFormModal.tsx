import { useEffect, useState } from 'react';
import { ICONS } from '../../../components/common/icons';
import ModalPortal from '../../../components/common/ModalPortal';
import { addServicePrice, AdminApiError } from '../api/serviceCatalogApi';
import type { ServiceCatalogRes } from '../types/adminTypes';
import {
  formatDate,
  formatVnd,
  mapFieldErrors,
  MAX_NOTE,
  parsePriceInput,
  todayIso,
  validateDate,
  validatePrice,
  type FieldErrors,
} from '../utils/serviceCatalogUtils';

export const DUPLICATE_PRICE_DATE_MESSAGE = 'Dịch vụ đã có mốc giá cùng ngày hiệu lực này. Hãy chọn ngày khác.';

export interface ServicePriceFormModalProps {
  isOpen: boolean;
  service: ServiceCatalogRes;
  onClose: () => void;
  onSaved: (updated: ServiceCatalogRes) => void;
}

/**
 * Thêm mốc giá mới cho dịch vụ (QTN-28). Mốc cũ không bị sửa — báo giá / hóa đơn đã lập vẫn giải
 * thích được theo giá tại ngày lập. Giá áp dụng cho một ngày = mốc gần nhất trước hoặc bằng ngày đó.
 */
export default function ServicePriceFormModal({ isOpen, service, onClose, onSaved }: ServicePriceFormModalProps) {
  const [price, setPrice] = useState('');
  const [effectiveFrom, setEffectiveFrom] = useState(todayIso());
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setPrice('');
    setEffectiveFrom(todayIso());
    setNote('');
    setErrors({});
    setServerError(null);
  }, [isOpen]);

  if (!isOpen) return null;

  const parsed = parsePriceInput(price);
  const existingDates = new Set((service.prices ?? []).map((p) => p.effectiveFrom));
  const isPast = effectiveFrom && effectiveFrom < todayIso();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    const next: FieldErrors = {};
    const priceErr = validatePrice(price);
    if (priceErr) next.price = priceErr;
    const dateErr = validateDate(effectiveFrom);
    if (dateErr) next.effectiveFrom = dateErr;
    else if (existingDates.has(effectiveFrom)) next.effectiveFrom = DUPLICATE_PRICE_DATE_MESSAGE;
    if (note.length > MAX_NOTE) next.note = `Ghi chú tối đa ${MAX_NOTE} ký tự.`;
    if (Object.keys(next).length > 0) {
      setErrors(next);
      return;
    }

    setSubmitting(true);
    setServerError(null);
    try {
      const updated = await addServicePrice(service.id, { price: parsed!, effectiveFrom, note: note.trim() || null });
      onSaved(updated);
    } catch (err) {
      if (err instanceof AdminApiError && err.statusCode === 409) {
        setErrors({ effectiveFrom: DUPLICATE_PRICE_DATE_MESSAGE });
      } else if (err instanceof AdminApiError && err.fieldErrors.length > 0) {
        setErrors(mapFieldErrors(err.fieldErrors));
      } else {
        setServerError(err instanceof Error ? err.message : 'Không thể thêm mốc giá. Vui lòng thử lại.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ModalPortal>
      <div
        className="modal-backdrop"
        onClick={(e) => {
          if (e.target === e.currentTarget && !submitting) onClose();
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="svc-price-title"
      >
        <div className="modal-card modal-card--sm">
          <div className="modal-header">
            <div className="modal-header__title-wrap">
              <h3 id="svc-price-title" className="modal-title">
                <span className="modal-title__icon">{ICONS.money}</span>
                Thêm mốc giá
              </h3>
              <p className="field-hint">
                <strong>{service.code}</strong> · {service.name} — giá hiện hành{' '}
                {service.hasEffectivePrice ? `${formatVnd(service.currentPrice)} / ${service.unit}` : 'chưa có'}
              </p>
            </div>
            <button type="button" className="modal-close" onClick={onClose} disabled={submitting} aria-label="Đóng">
              {ICONS.close}
            </button>
          </div>

          <form onSubmit={handleSubmit} noValidate data-testid="svc-price-form">
            <div className="modal-body svc-form">
              {serverError && (
                <div className="alert-box alert-box--danger" role="alert" data-testid="svc-price-server-error">
                  {serverError}
                </div>
              )}
              <div className="form-group">
                <label className="form-label" htmlFor="svc-new-price">
                  Giá mới (VND / {service.unit}) <span className="field-required">*</span>
                </label>
                <input
                  id="svc-new-price"
                  inputMode="decimal"
                  className={`form-input ${errors.price ? 'form-input--error' : ''}`}
                  value={price}
                  onChange={(e) => {
                    setPrice(e.target.value);
                    setErrors((p) => ({ ...p, price: '' }));
                  }}
                  placeholder="480000"
                  aria-invalid={!!errors.price}
                  disabled={submitting}
                  autoFocus
                  data-testid="svc-price-input"
                />
                {errors.price ? (
                  <p className="field-error" role="alert" data-testid="svc-price-error-price">
                    {errors.price}
                  </p>
                ) : (
                  <p className="field-hint">{parsed && parsed > 0 ? `= ${formatVnd(parsed)}` : ' '}</p>
                )}
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="svc-new-effective">
                  Hiệu lực từ ngày <span className="field-required">*</span>
                </label>
                <input
                  id="svc-new-effective"
                  type="date"
                  className={`form-input ${errors.effectiveFrom ? 'form-input--error' : ''}`}
                  value={effectiveFrom}
                  onChange={(e) => {
                    setEffectiveFrom(e.target.value);
                    setErrors((p) => ({ ...p, effectiveFrom: '' }));
                  }}
                  aria-invalid={!!errors.effectiveFrom}
                  disabled={submitting}
                  data-testid="svc-price-effective"
                />
                {errors.effectiveFrom ? (
                  <p className="field-error" role="alert" data-testid="svc-price-error-effectiveFrom">
                    {errors.effectiveFrom}
                  </p>
                ) : isPast ? (
                  <p className="field-hint svc-form__future" data-testid="svc-price-past-hint">
                    Ngày ở quá khứ: giá áp dụng cho các ngày từ {formatDate(effectiveFrom)} sẽ theo mốc mới này.
                  </p>
                ) : null}
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="svc-new-note">
                  Ghi chú
                </label>
                <input
                  id="svc-new-note"
                  className={`form-input ${errors.note ? 'form-input--error' : ''}`}
                  value={note}
                  maxLength={MAX_NOTE}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Ví dụ: Tăng giá đầu năm"
                  disabled={submitting}
                  data-testid="svc-price-note"
                />
                {errors.note && <p className="field-error">{errors.note}</p>}
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={onClose} disabled={submitting}>
                Hủy
              </button>
              <button type="submit" className="btn btn-primary" disabled={submitting} data-testid="svc-price-submit">
                {ICONS.save} {submitting ? 'Đang lưu…' : 'Thêm mốc giá'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </ModalPortal>
  );
}
