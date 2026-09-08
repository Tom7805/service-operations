import { useState } from 'react';
import { ICONS } from '../../../components/common/icons';
import { t } from '../../../i18n';
import type { ContractRes } from '../types/contractTypes';
import { updateTypeAndLimit } from '../api/contractsApi';

interface Props {
  contract: ContractRes;
  isOpen: boolean;
  onClose: () => void;
  onSaved?: (c: ContractRes) => void;
  currentUserRoles?: string[];
}

const CONTRACT_TYPE_OPTIONS = [
  { value: 'TIME_AND_MATERIAL', label: 'Time & Material' },
  { value: 'FIXED_PRICE', label: 'Fixed Price' },
  { value: 'MAINTENANCE', label: 'Maintenance' },
  { value: 'MILESTONE', label: 'Milestone' },
] as const;

export default function ContractTypeLimitModal({
  contract,
  isOpen,
  onClose,
  onSaved,
  currentUserRoles = ['VT-04'],
}: Props) {
  const isAllowed = currentUserRoles.includes('VT-05');
  const [contractType, setContractType] = useState<ContractRes['contractType']>(contract.contractType);
  const [totalValue, setTotalValue] = useState<number | null>(contract.totalValue ?? null);
  const [limitValue, setLimitValue] = useState<number | null>(contract.limitValue ?? null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const validate = (): boolean => {
    const next: Record<string, string> = {};
    if (!contractType) next.contractType = 'Phải chọn loại hợp đồng';
    if (totalValue != null && totalValue < 0) next.totalValue = 'Giá trị hợp đồng không được âm';
    if (limitValue != null && limitValue < 0) next.limitValue = 'Hạn mức không được âm';
    if (limitValue != null && totalValue != null && limitValue < totalValue)
      next.limitValue = 'Hạn mức không được nhỏ hơn giá trị hợp đồng';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAllowed) return;
    if (!validate()) return;
    setSubmitting(true);
    setServerError(null);
    try {
      const payload = {
        contractType: contractType as ContractRes['contractType'],
        totalValue: totalValue ?? null,
        limitValue: limitValue ?? null,
      };
      const updated = await updateTypeAndLimit(contract.id, payload);
      if (onSaved) onSaved(updated);
      onClose();
    } catch (err: unknown) {
      setServerError(err instanceof Error ? err.message : 'Không thể cập nhật. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting) onClose();
      }}
      role="dialog"
      aria-modal="true"
    >
      <div className="modal-card contract-modal-card">
        <div className="modal-header">
          <div className="modal-header__title-wrap">
            <h3 className="modal-title">
              <span className="modal-title__icon">{ICONS.document}</span>
              {t('contract.modal.title')}
            </h3>
            <p className="field-hint">{t('contract.modal.hint', { code: contract.contractCode, name: contract.name })}</p>
          </div>
          <button type="button" className="modal-close" onClick={onClose} disabled={submitting} aria-label="Đóng">
            {ICONS.close}
          </button>
        </div>

        <div className="modal-body">
          {!isAllowed && (
            <div className="alert-box alert-box--danger">{t('contract.modal.roleForbidden')}</div>
          )}

          {serverError && <div className="alert-box alert-box--danger">{serverError}</div>}

          <form onSubmit={handleSubmit} noValidate>
            <label className="form-label">{t('contract.modal.label.type')}</label>
            <select
              className={`form-select ${errors.contractType ? 'form-input--error' : ''}`}
              value={contractType}
              onChange={(e) => setContractType(e.target.value as ContractRes['contractType'])}
              aria-label="Loại hợp đồng"
            >
              {CONTRACT_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            {errors.contractType && <small className="field-error">{errors.contractType}</small>}

            <label className="form-label" style={{ marginTop: '12px' }}>
              {t('contract.modal.label.totalValue')}
            </label>
            <input
              aria-label="Giá trị hợp đồng"
              type="number"
              className={`form-input ${errors.totalValue ? 'form-input--error' : ''}`}
              value={totalValue ?? ''}
              onChange={(e) => setTotalValue(e.target.value === '' ? null : Number(e.target.value))}
              min={0}
            />
            {errors.totalValue && <small className="field-error">{errors.totalValue}</small>}

            <label className="form-label" style={{ marginTop: '12px' }}>
              {t('contract.modal.label.limitValue')}
            </label>
            <input
              aria-label="Hạn mức"
              type="number"
              className={`form-input ${errors.limitValue ? 'form-input--error' : ''}`}
              value={limitValue ?? ''}
              onChange={(e) => setLimitValue(e.target.value === '' ? null : Number(e.target.value))}
              min={0}
            />
            {errors.limitValue && <small className="field-error">{errors.limitValue}</small>}

            <div style={{ marginTop: '16px', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button type="button" className="btn" onClick={onClose} disabled={submitting}>
                {t('contract.modal.button.cancel')}
              </button>
              <button type="submit" className="btn-primary" disabled={submitting || !isAllowed}>
                {submitting ? 'Đang lưu…' : t('contract.modal.button.save')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
