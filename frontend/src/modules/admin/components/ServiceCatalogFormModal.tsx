import { useEffect, useState } from 'react';
import { ICONS } from '../../../components/common/icons';
import ModalPortal from '../../../components/common/ModalPortal';
import {
  AdminApiError,
  createServiceCatalogItem,
  updateServiceCatalogItem,
} from '../api/serviceCatalogApi';
import type { ServiceCatalogRes } from '../types/adminTypes';
import {
  formatVnd,
  mapFieldErrors,
  MAX_DESCRIPTION,
  MAX_NAME,
  MAX_UNIT,
  normalizeServiceName,
  parsePriceInput,
  todayIso,
  UNIT_SUGGESTIONS,
  validateDate,
  validatePrice,
  validateServiceInfo,
  type FieldErrors,
} from '../utils/serviceCatalogUtils';

export const DUPLICATE_NAME_MESSAGE =
  'Đã có dịch vụ cùng tên trong danh mục (không phân biệt hoa thường, khoảng trắng). Hãy đặt tên khác — dịch vụ chưa được tạo.';

export interface ServiceCatalogFormModalProps {
  isOpen: boolean;
  /** Có `initial` = sửa thông tin dịch vụ; không có = tạo mới kèm mốc giá đầu tiên. */
  initial?: ServiceCatalogRes | null;
  /** Các dịch vụ đang hiển thị — báo trùng tên sớm ngay trên form (máy chủ vẫn là nơi kiểm tra cuối). */
  existing?: ServiceCatalogRes[];
  onClose: () => void;
  onSaved: (saved: ServiceCatalogRes, mode: 'create' | 'edit') => void;
}

/**
 * Tạo dịch vụ mới (NCL-15-CN-001 TC-01) hoặc sửa tên/đơn vị/mô tả. Giá KHÔNG sửa ở đây — đổi giá
 * là thêm mốc giá mới để giữ lại các mốc cũ (QTN-28).
 */
export default function ServiceCatalogFormModal({ isOpen, initial, existing = [], onClose, onSaved }: ServiceCatalogFormModalProps) {
  const isEdit = !!initial;
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [effectiveFrom, setEffectiveFrom] = useState(todayIso());
  const [errors, setErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setName(initial?.name ?? '');
    setUnit(initial?.unit ?? '');
    setDescription(initial?.description ?? '');
    setPrice('');
    setEffectiveFrom(todayIso());
    setErrors({});
    setServerError(null);
  }, [isOpen, initial]);

  if (!isOpen) return null;

  const clearError = (field: string) => {
    setErrors((prev) => ({ ...prev, [field]: '' }));
    setServerError(null);
  };

  const parsedPrice = parsePriceInput(price);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    const next = validateServiceInfo({ name, unit, description });
    if (!isEdit) {
      const priceErr = validatePrice(price);
      if (priceErr) next.price = priceErr;
      const dateErr = validateDate(effectiveFrom);
      if (dateErr) next.effectiveFrom = dateErr;
    }
    if (!next.name) {
      const key = normalizeServiceName(name);
      const clash = existing.find((s) => s.id !== initial?.id && normalizeServiceName(s.name) === key);
      if (clash) next.name = `${DUPLICATE_NAME_MESSAGE} (${clash.code})`;
    }
    if (Object.values(next).some(Boolean)) {
      setErrors(next);
      return;
    }

    setSubmitting(true);
    setServerError(null);
    try {
      const info = { name: name.trim(), unit: unit.trim(), description: description.trim() || null };
      const saved = isEdit
        ? await updateServiceCatalogItem(initial!.id, info)
        : await createServiceCatalogItem({ ...info, price: parsedPrice!, effectiveFrom });
      onSaved(saved, isEdit ? 'edit' : 'create');
    } catch (err) {
      if (err instanceof AdminApiError && err.statusCode === 409) {
        setErrors({ name: DUPLICATE_NAME_MESSAGE });
      } else if (err instanceof AdminApiError && err.fieldErrors.length > 0) {
        setErrors(mapFieldErrors(err.fieldErrors));
      } else {
        setServerError(err instanceof Error ? err.message : 'Không thể lưu dịch vụ. Vui lòng thử lại.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const fieldError = (field: string) =>
    errors[field] ? (
      <p className="field-error" id={`svc-${field}-error`} data-testid={`svc-error-${field}`} role="alert">
        {errors[field]}
      </p>
    ) : null;

  return (
    <ModalPortal>
      <div
        className="modal-backdrop"
        onClick={(e) => {
          if (e.target === e.currentTarget && !submitting) onClose();
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="svc-form-title"
      >
        <div className="modal-card modal-card--md">
          <div className="modal-header">
            <div className="modal-header__title-wrap">
              <h3 id="svc-form-title" className="modal-title">
                <span className="modal-title__icon">{isEdit ? ICONS.edit : ICONS.plus}</span>
                {isEdit ? 'Sửa thông tin dịch vụ' : 'Thêm dịch vụ vào danh mục'}
              </h3>
              <p className="field-hint">
                {isEdit ? (
                  <>
                    <strong>{initial!.code}</strong> — muốn đổi giá, dùng “Thêm mốc giá” để giữ lại giá cũ.
                  </>
                ) : (
                  'Mã dịch vụ (DVxxxxx) được sinh tự động sau khi lưu.'
                )}
              </p>
            </div>
            <button type="button" className="modal-close" onClick={onClose} disabled={submitting} aria-label="Đóng">
              {ICONS.close}
            </button>
          </div>

          <form onSubmit={handleSubmit} noValidate data-testid="svc-form">
            <div className="modal-body svc-form">
              {serverError && (
                <div className="alert-box alert-box--danger" role="alert" data-testid="svc-server-error">
                  {serverError}
                </div>
              )}

              <div className="form-group">
                <label className="form-label" htmlFor="svc-name">
                  Tên dịch vụ <span className="field-required">*</span>
                </label>
                <input
                  id="svc-name"
                  className={`form-input ${errors.name ? 'form-input--error' : ''}`}
                  value={name}
                  maxLength={MAX_NAME}
                  onChange={(e) => {
                    setName(e.target.value);
                    clearError('name');
                  }}
                  placeholder="Ví dụ: Tư vấn triển khai"
                  aria-invalid={!!errors.name}
                  aria-describedby={errors.name ? 'svc-name-error' : undefined}
                  disabled={submitting}
                  autoFocus
                  data-testid="svc-input-name"
                />
                {fieldError('name')}
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="svc-unit">
                  Đơn vị tính <span className="field-required">*</span>
                </label>
                <input
                  id="svc-unit"
                  className={`form-input svc-form__unit ${errors.unit ? 'form-input--error' : ''}`}
                  value={unit}
                  maxLength={MAX_UNIT}
                  onChange={(e) => {
                    setUnit(e.target.value);
                    clearError('unit');
                  }}
                  list="svc-unit-suggestions"
                  placeholder="giờ, ngày công, gói…"
                  aria-invalid={!!errors.unit}
                  aria-describedby={errors.unit ? 'svc-unit-error' : undefined}
                  disabled={submitting}
                  data-testid="svc-input-unit"
                />
                <datalist id="svc-unit-suggestions">
                  {UNIT_SUGGESTIONS.map((u) => (
                    <option key={u} value={u} />
                  ))}
                </datalist>
                {fieldError('unit')}
              </div>

              {!isEdit && (
                <div className="svc-form__row">
                  <div className="form-group">
                    <label className="form-label" htmlFor="svc-price">
                      Giá (VND) <span className="field-required">*</span>
                    </label>
                    <input
                      id="svc-price"
                      inputMode="decimal"
                      className={`form-input ${errors.price ? 'form-input--error' : ''}`}
                      value={price}
                      onChange={(e) => {
                        setPrice(e.target.value);
                        clearError('price');
                      }}
                      placeholder="450000"
                      aria-invalid={!!errors.price}
                      aria-describedby={errors.price ? 'svc-price-error' : 'svc-price-preview'}
                      disabled={submitting}
                      data-testid="svc-input-price"
                    />
                    {errors.price ? (
                      fieldError('price')
                    ) : (
                      <p className="field-hint" id="svc-price-preview" data-testid="svc-price-preview">
                        {parsedPrice && parsedPrice > 0 ? `= ${formatVnd(parsedPrice)}` : 'Giá của mốc giá đầu tiên.'}
                      </p>
                    )}
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="svc-effective">
                      Hiệu lực từ ngày <span className="field-required">*</span>
                    </label>
                    <input
                      id="svc-effective"
                      type="date"
                      className={`form-input ${errors.effectiveFrom ? 'form-input--error' : ''}`}
                      value={effectiveFrom}
                      onChange={(e) => {
                        setEffectiveFrom(e.target.value);
                        clearError('effectiveFrom');
                      }}
                      aria-invalid={!!errors.effectiveFrom}
                      disabled={submitting}
                      data-testid="svc-input-effective"
                    />
                    {errors.effectiveFrom ? (
                      fieldError('effectiveFrom')
                    ) : effectiveFrom > todayIso() ? (
                      <p className="field-hint svc-form__future" data-testid="svc-future-hint">
                        Trước ngày này dịch vụ chưa có giá hiệu lực nên chưa chọn được khi lập báo giá / hóa đơn.
                      </p>
                    ) : null}
                  </div>
                </div>
              )}

              <div className="form-group">
                <label className="form-label" htmlFor="svc-desc">
                  Mô tả
                </label>
                <textarea
                  id="svc-desc"
                  className={`form-input ${errors.description ? 'form-input--error' : ''}`}
                  rows={3}
                  value={description}
                  maxLength={MAX_DESCRIPTION}
                  onChange={(e) => {
                    setDescription(e.target.value);
                    clearError('description');
                  }}
                  placeholder="Nội dung dịch vụ, phạm vi, điều kiện áp dụng…"
                  disabled={submitting}
                  data-testid="svc-input-description"
                />
                <p className="field-hint svc-form__counter">
                  {description.length}/{MAX_DESCRIPTION}
                </p>
                {fieldError('description')}
              </div>
            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={onClose} disabled={submitting}>
                Hủy
              </button>
              <button type="submit" className="btn btn-primary" disabled={submitting} data-testid="svc-submit">
                {ICONS.save} {submitting ? 'Đang lưu…' : isEdit ? 'Lưu thay đổi' : 'Tạo dịch vụ'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </ModalPortal>
  );
}
