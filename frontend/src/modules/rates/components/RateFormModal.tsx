import { useState } from 'react';
import type { FormEvent } from 'react';
import { ICONS } from '../../../components/common/icons';
import ModalPortal from '../../../components/common/ModalPortal';
import { useBackdropClick } from '../../../hooks/useBackdropClick';
import { createBillRate, RatesApiError } from '../api/ratesApi';
import type { BillRateRes } from '../types/rateTypes';
import { validateBillRateForm, type BillRateFormValues } from '../validators/rateValidators';
import { useDialogA11y } from '../../projects/components/deliveryUi';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (created: BillRateRes) => void;
  currentUserRoles?: string[];
}

const EMPTY_FORM: BillRateFormValues = {
  professionalRole: '',
  level: '',
  dailyRate: null,
  effectiveFrom: '',
};

// Số tiền gõ liền không dấu tách rất dễ đọc nhầm số 0 — hiển thị có dấu chấm
// ngăn cách hàng nghìn kiểu vi-VN khi gõ, vẫn lưu về number thường khi gửi lên.
function formatVnNumber(value: number | null): string {
  if (value == null || Number.isNaN(value)) return '';
  return value.toLocaleString('vi-VN');
}

function parseVnNumber(raw: string): number | null {
  const digits = raw.replace(/\D/g, '');
  return digits === '' ? null : Number(digits);
}

/**
 * NCL-07-CN-001 — Modal khai báo một dòng đơn giá theo (vai trò chuyên môn, cấp
 * bậc), hiệu lực từ một ngày cụ thể. Đơn vị tiền là theo NGÀY công (không phải
 * giờ) để khớp cách `NCL-03-CN-003` tính `amount = workDays * dailyRate`.
 */
export default function RateFormModal({ isOpen, onClose, onSaved, currentUserRoles = [] }: Props) {
  const isAllowed = currentUserRoles.includes('VT-05') || currentUserRoles.includes('VT-07');

  const [values, setValues] = useState<BillRateFormValues>(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const backdrop = useBackdropClick(onClose, submitting);

  const dialogRef = useDialogA11y(isOpen, onClose, submitting);

  if (!isOpen) return null;

  const resetAndClose = () => {
    setValues(EMPTY_FORM);
    setErrors({});
    setServerError(null);
    onClose();
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!isAllowed || submitting) return;

    const nextErrors = validateBillRateForm(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    setServerError(null);
    try {
      const created = await createBillRate({
        professionalRole: values.professionalRole.trim(),
        level: values.level.trim(),
        dailyRate: values.dailyRate as number,
        effectiveFrom: values.effectiveFrom,
      });
      onSaved(created);
      resetAndClose();
    } catch (err) {
      setServerError(
        err instanceof RatesApiError ? err.message : 'Không thể khai báo đơn giá. Vui lòng thử lại.'
      );
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
      >
        <div ref={dialogRef} className="modal-card dl-modal">
          <div className="modal-header">
            <div className="modal-header__title-wrap">
              <h3 className="modal-title">
                <span className="modal-title__icon">{ICONS.money}</span>
                Khai báo đơn giá theo vai trò
              </h3>
              <p className="field-hint">
                Mỗi dòng gồm vai trò chuyên môn, cấp bậc và đơn giá theo ngày công.
              </p>
            </div>
            <button
              type="button"
              className="modal-close"
              onClick={resetAndClose}
              disabled={submitting}
              aria-label="Đóng"
            >
              {ICONS.close}
            </button>
          </div>

          <div className="modal-body">
            {!isAllowed && (
              <div className="alert-box alert-box--danger">
                Chỉ Kế toán hoặc Quản trị viên mới được khai báo đơn giá.
              </div>
            )}

            {serverError && (
              <div className="alert-box alert-box--danger" role="alert">
                {serverError}
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate>
              <label className="form-label" htmlFor="bill-rate-role">
                Vai trò chuyên môn
              </label>
              <input
                id="bill-rate-role"
                type="text"
                className={`form-input ${errors.professionalRole ? 'form-input--error' : ''}`}
                placeholder="Ví dụ: Lập trình viên"
                value={values.professionalRole}
                onChange={(e) => setValues((v) => ({ ...v, professionalRole: e.target.value }))}
                disabled={!isAllowed}
              />
              {errors.professionalRole && <small className="field-error">{errors.professionalRole}</small>}

              <label className="form-label" style={{ marginTop: '12px' }} htmlFor="bill-rate-level">
                Cấp bậc
              </label>
              <input
                id="bill-rate-level"
                type="text"
                list="bill-rate-level-options"
                className={`form-input ${errors.level ? 'form-input--error' : ''}`}
                placeholder="Ví dụ: Trung cấp, Cao cấp, Quản lý"
                value={values.level}
                onChange={(e) => setValues((v) => ({ ...v, level: e.target.value }))}
                disabled={!isAllowed}
              />
              <datalist id="bill-rate-level-options">
                <option value="Trung cấp" />
                <option value="Cao cấp" />
                <option value="Quản lý" />
              </datalist>
              {errors.level && <small className="field-error">{errors.level}</small>}

              <label className="form-label" style={{ marginTop: '12px' }} htmlFor="bill-rate-daily-rate">
                Đơn giá theo ngày công (VNĐ)
              </label>
              <input
                id="bill-rate-daily-rate"
                type="text"
                inputMode="numeric"
                aria-label="Đơn giá theo ngày công"
                className={`form-input ${errors.dailyRate ? 'form-input--error' : ''}`}
                value={formatVnNumber(values.dailyRate)}
                onChange={(e) => setValues((v) => ({ ...v, dailyRate: parseVnNumber(e.target.value) }))}
                disabled={!isAllowed}
              />
              {errors.dailyRate && <small className="field-error">{errors.dailyRate}</small>}

              <label className="form-label" style={{ marginTop: '12px' }} htmlFor="bill-rate-effective-from">
                Ngày hiệu lực
              </label>
              <input
                id="bill-rate-effective-from"
                type="date"
                className={`form-input ${errors.effectiveFrom ? 'form-input--error' : ''}`}
                value={values.effectiveFrom}
                onChange={(e) => setValues((v) => ({ ...v, effectiveFrom: e.target.value }))}
                disabled={!isAllowed}
              />
              {errors.effectiveFrom && <small className="field-error">{errors.effectiveFrom}</small>}
              <p className="field-hint" style={{ marginTop: '6px' }}>
                Cùng vai trò + cấp bậc không được khai báo hai lần cho cùng một ngày hiệu lực. Đơn giá
                hiệu lực trong tương lai chưa xuất hiện ở màn hình lập báo giá cho tới đúng ngày này.
              </p>

              <div style={{ marginTop: '16px', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button type="button" className="btn" onClick={resetAndClose} disabled={submitting}>
                  Hủy
                </button>
                <button type="submit" className="btn-primary" disabled={submitting || !isAllowed}>
                  {submitting ? 'Đang lưu…' : 'Lưu đơn giá'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
