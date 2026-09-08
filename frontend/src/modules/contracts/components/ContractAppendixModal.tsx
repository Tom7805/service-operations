import { useState } from 'react';
import { ICONS } from '../../../components/common/icons';
import type { ContractRes } from '../types/contractTypes';
import { createAppendix, ContractsApiError } from '../api/contractsApi';

interface Props {
  contract: ContractRes;
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
  currentUserRoles?: string[];
}

export default function ContractAppendixModal({
  contract,
  isOpen,
  onClose,
  onSaved,
  currentUserRoles = ['VT-04'],
}: Props) {
  const isAllowed = currentUserRoles.includes('VT-04');
  const [content, setContent] = useState('');
  const [adjustmentValue, setAdjustmentValue] = useState<number | string>('');
  const [effectiveDate, setEffectiveDate] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const validate = () => {
    const next: Record<string, string> = {};
    const trimmed = content.trim();
    if (!trimmed) next.content = 'Nội dung điều chỉnh không được để trống';
    if (trimmed.length > 1000) next.content = 'Nội dung phụ lục tối đa 1000 ký tự';
    if (adjustmentValue === '' || Number(adjustmentValue) === 0) next.adjustmentValue = 'Giá trị điều chỉnh phải khác 0';
    if (!effectiveDate) next.effectiveDate = 'Ngày hiệu lực không được để trống';
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
      await createAppendix(contract.id, {
        content: content.trim(),
        adjustmentValue: Number(adjustmentValue),
        effectiveDate,
      });
      onSaved?.();
      onClose();
    } catch (err) {
      setServerError(err instanceof ContractsApiError ? err.message : 'Không thể lưu phụ lục điều chỉnh hợp đồng.');
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
      aria-labelledby="appendix-modal-title"
    >
      <div className="modal-card contract-modal-card">
        <div className="modal-header">
          <div className="modal-header__title-wrap">
            <h3 id="appendix-modal-title" className="modal-title">
              <span className="modal-title__icon">{ICONS.document}</span>
              Lập phụ lục điều chỉnh hợp đồng
            </h3>
            <p className="field-hint">
              {contract.contractCode} · {contract.name} · Giá trị hiện tại: {contract.totalValue.toLocaleString('vi-VN')}
            </p>
          </div>
          <button type="button" className="modal-close" onClick={onClose} disabled={submitting} aria-label="Đóng">
            {ICONS.close}
          </button>
        </div>

        <div className="modal-body">
          {!isAllowed && (
            <div className="alert-box alert-box--danger">Yêu cầu vai trò Nhân viên kinh doanh (VT-04).</div>
          )}

          {serverError && <div className="alert-box alert-box--danger">{serverError}</div>}

          <form onSubmit={handleSubmit} noValidate>
            <label className="form-label" htmlFor="appendix-content">
              Nội dung điều chỉnh
            </label>
            <textarea
              id="appendix-content"
              className={`form-input ${errors.content ? 'form-input--error' : ''}`}
              aria-label="Nội dung điều chỉnh"
              rows={4}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Mô tả thay đổi theo phụ lục, phạm vi, đơn giá hoặc mốc hiệu lực mới..."
            />
            {errors.content && <small className="field-error">{errors.content}</small>}

            <label className="form-label" htmlFor="appendix-adjustment" style={{ marginTop: '12px' }}>
              Giá trị điều chỉnh (VNĐ)
            </label>
            <input
              id="appendix-adjustment"
              className={`form-input ${errors.adjustmentValue ? 'form-input--error' : ''}`}
              aria-label="Giá trị điều chỉnh"
              type="number"
              value={adjustmentValue}
              onChange={(e) => setAdjustmentValue(e.target.value)}
              placeholder="200000000"
            />
            {errors.adjustmentValue && <small className="field-error">{errors.adjustmentValue}</small>}

            <label className="form-label" htmlFor="appendix-effective-date" style={{ marginTop: '12px' }}>
              Ngày hiệu lực
            </label>
            <input
              id="appendix-effective-date"
              className={`form-input ${errors.effectiveDate ? 'form-input--error' : ''}`}
              aria-label="Ngày hiệu lực"
              type="date"
              value={effectiveDate}
              onChange={(e) => setEffectiveDate(e.target.value)}
            />
            {errors.effectiveDate && <small className="field-error">{errors.effectiveDate}</small>}

            <div style={{ marginTop: '16px', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button type="button" className="btn" onClick={onClose} disabled={submitting}>
                Hủy
              </button>
              <button type="submit" className="btn-primary" disabled={submitting || !isAllowed}>
                {submitting ? 'Đang lưu…' : 'Lưu phụ lục'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
