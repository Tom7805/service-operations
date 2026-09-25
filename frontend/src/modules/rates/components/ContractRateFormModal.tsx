import { useState } from 'react';
import type { FormEvent } from 'react';
import { ICONS } from '../../../components/common/icons';
import ModalPortal from '../../../components/common/ModalPortal';
import { useBackdropClick } from '../../../hooks/useBackdropClick';
import { createContractBillRate, RatesApiError } from '../api/ratesApi';
import type { ContractBillRateRes } from '../types/rateTypes';
import { validateBillRateForm, type BillRateFormValues } from '../validators/rateValidators';
import { useDialogA11y } from '../../projects/components/deliveryUi';

interface Props {
  contractId: number;
  isOpen: boolean;
  onClose: () => void;
  onSaved: (created: ContractBillRateRes) => void;
  currentUserRoles?: string[];
}

const EMPTY_FORM: BillRateFormValues = {
  professionalRole: '',
  level: '',
  dailyRate: null,
  effectiveFrom: '',
};

function formatVnNumber(value: number | null): string {
  if (value == null || Number.isNaN(value)) return '';
  return value.toLocaleString('vi-VN');
}

function parseVnNumber(raw: string): number | null {
  const digits = raw.replace(/\D/g, '');
  return digits === '' ? null : Number(digits);
}

/**
 * NCL-07-CN-003 — Modal khai báo đơn giá RIÊNG cho một hợp đồng cụ thể (mức
 * giá đàm phán), khác với `RateFormModal` (đơn giá CHUNG công ty). Khi tính
 * doanh thu, dòng riêng theo hợp đồng luôn được ưu tiên hơn (QTN-16).
 */
export default function ContractRateFormModal({ contractId, isOpen, onClose, onSaved, currentUserRoles = [] }: Props) {
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
      const created = await createContractBillRate(contractId, {
        professionalRole: values.professionalRole.trim(),
        level: values.level.trim(),
        dailyRate: values.dailyRate as number,
        effectiveFrom: values.effectiveFrom,
      });
      onSaved(created);
      resetAndClose();
    } catch (err) {
      setServerError(
        err instanceof RatesApiError ? err.message : 'Không thể khai báo đơn giá riêng. Vui lòng thử lại.'
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
                <span className="modal-title__icon">{ICONS.receipt}</span>
                Khai báo đơn giá riêng cho hợp đồng #{contractId}
              </h3>
              <p className="field-hint">
                Mức giá đàm phán riêng cho hợp đồng này — được ưu tiên hơn đơn giá chung công ty khi tính
                doanh thu.
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
                Chỉ Kế toán hoặc Quản trị viên mới được khai báo đơn giá riêng theo hợp đồng.
              </div>
            )}

            {serverError && (
              <div className="alert-box alert-box--danger" role="alert">
                {serverError}
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate>
              <label className="form-label" htmlFor="contract-rate-role">
                Vai trò chuyên môn
              </label>
              <input
                id="contract-rate-role"
                type="text"
                className={`form-input ${errors.professionalRole ? 'form-input--error' : ''}`}
                placeholder="Ví dụ: Lập trình viên"
                value={values.professionalRole}
                onChange={(e) => setValues((v) => ({ ...v, professionalRole: e.target.value }))}
                disabled={!isAllowed}
              />
              {errors.professionalRole && <small className="field-error">{errors.professionalRole}</small>}

              <label className="form-label" style={{ marginTop: '12px' }} htmlFor="contract-rate-level">
                Cấp bậc
              </label>
              <input
                id="contract-rate-level"
                type="text"
                className={`form-input ${errors.level ? 'form-input--error' : ''}`}
                placeholder="Ví dụ: Cao cấp"
                value={values.level}
                onChange={(e) => setValues((v) => ({ ...v, level: e.target.value }))}
                disabled={!isAllowed}
              />
              {errors.level && <small className="field-error">{errors.level}</small>}

              <label className="form-label" style={{ marginTop: '12px' }} htmlFor="contract-rate-daily-rate">
                Đơn giá theo ngày công (VNĐ)
              </label>
              <input
                id="contract-rate-daily-rate"
                type="text"
                inputMode="numeric"
                aria-label="Đơn giá theo ngày công"
                className={`form-input ${errors.dailyRate ? 'form-input--error' : ''}`}
                value={formatVnNumber(values.dailyRate)}
                onChange={(e) => setValues((v) => ({ ...v, dailyRate: parseVnNumber(e.target.value) }))}
                disabled={!isAllowed}
              />
              {errors.dailyRate && <small className="field-error">{errors.dailyRate}</small>}

              <label className="form-label" style={{ marginTop: '12px' }} htmlFor="contract-rate-effective-from">
                Ngày hiệu lực
              </label>
              <input
                id="contract-rate-effective-from"
                type="date"
                className={`form-input ${errors.effectiveFrom ? 'form-input--error' : ''}`}
                value={values.effectiveFrom}
                onChange={(e) => setValues((v) => ({ ...v, effectiveFrom: e.target.value }))}
                disabled={!isAllowed}
              />
              {errors.effectiveFrom && <small className="field-error">{errors.effectiveFrom}</small>}
              <p className="field-hint" style={{ marginTop: '6px' }}>
                Cùng vai trò + cấp bậc không được khai báo hai lần cho cùng một ngày hiệu lực trong hợp đồng
                này.
              </p>

              <div style={{ marginTop: '16px', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button type="button" className="btn" onClick={resetAndClose} disabled={submitting}>
                  Hủy
                </button>
                <button type="submit" className="btn-primary" disabled={submitting || !isAllowed}>
                  {submitting ? 'Đang lưu…' : 'Lưu đơn giá riêng'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
