import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { ICONS } from '../../../components/common/icons';
import ModalPortal from '../../../components/common/ModalPortal';
import { useBackdropClick } from '../../../hooks/useBackdropClick';
import { RatesApiError } from '../api/ratesApi';
import type { RateUpdatePayload } from '../types/rateTypes';
import {
  formatIsoDate,
  formatVnd,
  formatVnNumber,
  parseVnNumber,
  rateEditMode,
  todayIso,
  type RateEditMode,
} from '../utils/rateFormat';

export interface EditableRate {
  id: number;
  professionalRole: string;
  level: string;
  dailyRate: number;
  /** `yyyy-MM-dd` */
  effectiveFrom: string;
}

interface Props {
  /** `null` = đóng. */
  rate: EditableRate | null;
  /** Bảng giá chung hay hợp đồng nào — hiện dưới tên vai trò để khỏi sửa nhầm chỗ. */
  scopeLabel: string;
  /** Mức cũ xem lại ở đâu sau khi ghi mức mới. */
  historyHint: string;
  onClose: () => void;
  /** Gọi API theo `mode`; ném lỗi để hộp thoại hiện thông báo của máy chủ. */
  onSubmit: (mode: RateEditMode, payload: RateUpdatePayload) => Promise<void>;
}

export default function RateEditModal({ rate, scopeLabel, historyHint, onClose, onSubmit }: Props) {
  const [dailyRate, setDailyRate] = useState<number | null>(null);
  const [effectiveFrom, setEffectiveFrom] = useState('');
  const [errors, setErrors] = useState<{ dailyRate?: string; effectiveFrom?: string }>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const backdrop = useBackdropClick(onClose, submitting);

  const mode = rate ? rateEditMode(rate.effectiveFrom) : 'edit';
  const today = todayIso();

  useEffect(() => {
    if (!rate) return;
    setDailyRate(rate.dailyRate);
    setEffectiveFrom(rateEditMode(rate.effectiveFrom) === 'edit' ? rate.effectiveFrom : todayIso());
    setErrors({});
    setServerError(null);
  }, [rate]);

  useEffect(() => {
    if (!rate) return undefined;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !submitting) onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [rate, submitting, onClose]);

  if (!rate) return null;

  const unchanged =
    dailyRate === rate.dailyRate && (mode === 'newVersion' || effectiveFrom === rate.effectiveFrom);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const next: typeof errors = {};
    if (dailyRate == null) next.dailyRate = 'Nhập đơn giá theo ngày công.';
    if (!effectiveFrom) next.effectiveFrom = 'Chọn ngày hiệu lực.';
    else if (effectiveFrom < today) next.effectiveFrom = `Không được trước hôm nay (${formatIsoDate(today)}).`;
    setErrors(next);
    if (Object.keys(next).length > 0 || dailyRate == null) return;

    setSubmitting(true);
    setServerError(null);
    try {
      await onSubmit(mode, { dailyRate, effectiveFrom });
      onClose();
    } catch (err) {
      setServerError(err instanceof RatesApiError ? err.message : 'Không lưu được đơn giá. Vui lòng thử lại.');
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
        aria-labelledby="rate-edit-title"
        data-testid="rate-edit-modal"
      >
        <div className="modal-card">
          <div className="modal-header">
            <div className="modal-header__title-wrap">
              <h3 className="modal-title" id="rate-edit-title">
                <span className="modal-title__icon">{ICONS.edit}</span>
                Sửa đơn giá
              </h3>
            </div>
            <button type="button" className="modal-close" onClick={onClose} disabled={submitting} aria-label="Đóng">
              {ICONS.close}
            </button>
          </div>

          <form onSubmit={handleSubmit} noValidate>
            <div className="modal-body">
              <div className="rate-edit__who">
                <strong>{rate.professionalRole}</strong>
                <span>
                  {rate.level} · {scopeLabel}
                </span>
              </div>

              <p className="rate-edit__note" data-testid="rate-edit-note">
                {mode === 'edit' ? (
                  <>Mức này chưa áp dụng cho ngày nào trước hôm nay nên sửa thẳng được.</>
                ) : (
                  <>
                    Mức hiện tại <strong>{formatVnd(rate.dailyRate)}/ngày</strong> đã áp dụng từ{' '}
                    {formatIsoDate(rate.effectiveFrom)}. Để doanh thu và hóa đơn các kỳ trước không bị đổi, mức mới chỉ áp
                    dụng từ ngày bạn chọn; mức cũ vẫn giữ cho giai đoạn trước ({historyHint}).
                  </>
                )}
              </p>

              {serverError && (
                <div className="alert-box alert-box--danger" role="alert">
                  {serverError}
                </div>
              )}

              <div className="form-group">
                <label className="form-label" htmlFor="rate-edit-daily">
                  {mode === 'edit' ? 'Đơn giá / ngày công (VND)' : 'Đơn giá mới / ngày công (VND)'}
                </label>
                <input
                  id="rate-edit-daily"
                  type="text"
                  inputMode="numeric"
                  className={`form-input ${errors.dailyRate ? 'form-input--error' : ''}`}
                  value={formatVnNumber(dailyRate)}
                  onChange={(e) => {
                    setDailyRate(parseVnNumber(e.target.value));
                    setErrors((prev) => ({ ...prev, dailyRate: undefined }));
                  }}
                  disabled={submitting}
                  data-testid="rate-edit-daily"
                  autoFocus
                />
                {errors.dailyRate ? (
                  <small className="field-error">{errors.dailyRate}</small>
                ) : (
                  dailyRate != null && (
                    <small className="field-hint">≈ {formatVnd(Math.round(dailyRate / 8))} / giờ (÷ 8 giờ)</small>
                  )
                )}
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="rate-edit-from">
                  {mode === 'edit' ? 'Hiệu lực từ' : 'Áp dụng từ ngày'}
                </label>
                <input
                  id="rate-edit-from"
                  type="date"
                  min={today}
                  className={`form-input ${errors.effectiveFrom ? 'form-input--error' : ''}`}
                  value={effectiveFrom}
                  onChange={(e) => {
                    setEffectiveFrom(e.target.value);
                    setErrors((prev) => ({ ...prev, effectiveFrom: undefined }));
                  }}
                  disabled={submitting}
                  data-testid="rate-edit-from"
                />
                {errors.effectiveFrom && <small className="field-error">{errors.effectiveFrom}</small>}
              </div>
            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={onClose} disabled={submitting}>
                Hủy
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={submitting || unchanged}
                title={unchanged ? 'Chưa có thay đổi nào' : undefined}
                data-testid="rate-edit-submit"
              >
                {submitting ? 'Đang lưu…' : mode === 'edit' ? 'Lưu thay đổi' : 'Lưu mức mới'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </ModalPortal>
  );
}
