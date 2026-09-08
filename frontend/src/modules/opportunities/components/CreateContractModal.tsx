import { useState } from 'react';
import { ICONS } from '../../../components/common/icons';
import type { Opportunity } from '../types/opportunityTypes';
import type { ContractCreateFromOpportunityReq, ContractRes } from '../../contracts/types/contractTypes';
import { createContractFromOpportunity } from '../api/opportunitiesApi';

interface Props {
  opportunity: Opportunity;
  isOpen: boolean;
  onClose: () => void;
  onCreated?: (c: ContractRes) => void;
  currentUserRoles?: string[];
}

const CONTRACT_TYPE_OPTIONS: { value: ContractCreateFromOpportunityReq['contractType']; label: string }[] = [
  { value: 'TIME_AND_MATERIAL', label: 'Time & Material' },
  { value: 'FIXED_PRICE', label: 'Fixed Price' },
  { value: 'MAINTENANCE', label: 'Maintenance' },
];

export default function CreateContractModal({
  opportunity,
  isOpen,
  onClose,
  onCreated,
  currentUserRoles = ['VT-04'],
}: Props) {
  const isAllowed = currentUserRoles.includes('VT-04');
  const isWon = opportunity.stage === 'WON';

  const [form, setForm] = useState<ContractCreateFromOpportunityReq>({
    name: opportunity.name,
    contractType: 'TIME_AND_MATERIAL',
    totalValue: null,
    startDate: undefined,
    endDate: undefined,
    notes: undefined,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleChange = (k: keyof ContractCreateFromOpportunityReq, v: unknown) => {
    setForm((p) => ({ ...p, [k]: v as ContractCreateFromOpportunityReq[typeof k] }));
    setErrors((e) => ({ ...e, [k]: undefined }));
    setServerError(null);
  };

  const validate = (): boolean => {
    const next: Record<string, string> = {};
    if (!form.contractType) next.contractType = 'Phải chọn loại hợp đồng';
    if (form.name && form.name.length > 255) next.name = 'Tên hợp đồng không quá 255 ký tự';
    if (form.notes && form.notes.length > 1000) next.notes = 'Ghi chú không quá 1000 ký tự';
    if (form.startDate && form.endDate && form.endDate < form.startDate)
      next.endDate = 'Ngày kết thúc không được sớm hơn ngày bắt đầu';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAllowed || !isWon) return;
    if (!validate()) return;
    setSubmitting(true);
    setServerError(null);
    try {
      const created = await createContractFromOpportunity(opportunity.id, form);
      if (onCreated) onCreated(created);
      onClose();
    } catch (err: unknown) {
      if (err instanceof Error) setServerError(err.message);
      else setServerError('Không thể tạo hợp đồng. Vui lòng thử lại.');
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
              Tạo hợp đồng từ cơ hội
            </h3>
            <p className="field-hint">Hệ thống sẽ dùng thông tin khách hàng và báo giá mặc định từ cơ hội.</p>
          </div>
          <button type="button" className="modal-close" onClick={onClose} disabled={submitting} aria-label="Đóng">
            {ICONS.close}
          </button>
        </div>

        <div className="modal-body">
          {!isWon && (
            <div className="alert-box alert-box--warning">Cơ hội phải ở trạng thái WON để tạo hợp đồng.</div>
          )}
          {!isAllowed && (
            <div className="alert-box alert-box--danger">Chức năng yêu cầu vai trò Nhân viên kinh doanh.</div>
          )}

          {serverError && (
            <div className="alert-box alert-box--danger">{serverError}</div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <label className="form-label">Tên hợp đồng (không bắt buộc)</label>
            <input
              aria-label="Tên hợp đồng"
              className={`form-input ${errors.name ? 'form-input--error' : ''}`}
              value={form.name ?? ''}
              onChange={(e) => handleChange('name', e.target.value)}
              maxLength={255}
            />
            {errors.name && <small className="field-error">{errors.name}</small>}

            <label className="form-label" style={{ marginTop: '12px' }}>
              Loại hợp đồng
            </label>
            <select
              aria-label="Loại hợp đồng"
              className={`form-select ${errors.contractType ? 'form-input--error' : ''}`}
              value={form.contractType}
              onChange={(e) => handleChange('contractType', e.target.value as ContractCreateFromOpportunityReq['contractType'])}
            >
              {CONTRACT_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            {errors.contractType && <small className="field-error">{errors.contractType}</small>}

            <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
              <label className="form-label" style={{ flex: 1 }}>
                Ngày bắt đầu
                <input
                  type="date"
                  className={`form-input ${errors.startDate ? 'form-input--error' : ''}`}
                  value={form.startDate ?? ''}
                  onChange={(e) => handleChange('startDate', e.target.value || undefined)}
                />
              </label>
              <label className="form-label" style={{ flex: 1 }}>
                Ngày kết thúc
                <input
                  type="date"
                  className={`form-input ${errors.endDate ? 'form-input--error' : ''}`}
                  value={form.endDate ?? ''}
                  onChange={(e) => handleChange('endDate', e.target.value || undefined)}
                />
                {errors.endDate && <small className="field-error">{errors.endDate}</small>}
              </label>
            </div>

            <label className="form-label" style={{ marginTop: '12px' }}>
              Giá trị hợp đồng (VNĐ)
            </label>
            <input
              aria-label="Giá trị hợp đồng"
              type="number"
              className="form-input"
              value={form.totalValue ?? ''}
              onChange={(e) => handleChange('totalValue', e.target.value === '' ? null : Number(e.target.value))}
              min={0}
            />

            <label className="form-label" style={{ marginTop: '12px' }}>
              Ghi chú (tuỳ chọn)
            </label>
            <textarea
              aria-label="Ghi chú"
              className={`form-textarea ${errors.notes ? 'form-input--error' : ''}`}
              value={form.notes ?? ''}
              onChange={(e) => handleChange('notes', e.target.value)}
              rows={4}
              maxLength={1000}
            />
            {errors.notes && <small className="field-error">{errors.notes}</small>}

            <div style={{ marginTop: '16px', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button type="button" className="btn" onClick={onClose} disabled={submitting}>
                Hủy
              </button>
              <button type="submit" className="btn-primary" disabled={submitting || !isAllowed || !isWon}>
                {submitting ? 'Đang tạo…' : 'Tạo hợp đồng'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
