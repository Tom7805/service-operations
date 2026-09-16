import { useState } from 'react';
import type { FormEvent } from 'react';
import { ICONS } from '../../../components/common/icons';
import { resolveContractBillRate, RatesApiError } from '../api/ratesApi';
import type { ResolvedContractBillRateRes } from '../types/rateTypes';
import { validateResolveBillRateForm, type ResolveBillRateFormValues } from '../validators/rateValidators';

interface Props {
  contractId: number;
}

const EMPTY_FORM: ResolveBillRateFormValues = {
  professionalRole: '',
  level: '',
  asOf: '',
};

function formatDailyRate(value: number): string {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(
    value
  );
}

function formatDate(value: string): string {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString('vi-VN');
}

/**
 * NCL-07-CN-003 — Tra đơn giá ÁP DỤNG cho một hợp đồng tại ngày phát sinh cụ
 * thể (`GET /contracts/{contractId}/bill-rates/resolve`), đã áp quy tắc ưu
 * tiên QTN-16: ưu tiên đơn giá riêng hợp đồng (TC-01), không có thì tự rơi về
 * đơn giá chung công ty (TC-02) — `isContractSpecific` phân biệt rõ hai
 * trường hợp này cho Kế toán.
 */
export default function ContractRateResolveLookup({ contractId }: Props) {
  const [values, setValues] = useState<ResolveBillRateFormValues>(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ResolvedContractBillRateRes | null>(null);
  const [notFoundMessage, setNotFoundMessage] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (loading) return;

    const nextErrors = validateResolveBillRateForm(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setLoading(true);
    setServerError(null);
    setNotFoundMessage(null);
    setResult(null);
    try {
      const resolved = await resolveContractBillRate(contractId, {
        professionalRole: values.professionalRole.trim(),
        level: values.level.trim(),
        asOf: values.asOf,
      });
      setResult(resolved);
    } catch (err) {
      if (err instanceof RatesApiError && err.statusCode === 404) {
        // 404 không phải lỗi hệ thống — hợp đồng không tồn tại, hoặc chưa có đơn
        // giá hợp lệ (chung lẫn riêng) tại thời điểm này.
        setNotFoundMessage(err.message);
      } else {
        setServerError(
          err instanceof RatesApiError ? err.message : 'Không tra được đơn giá áp dụng. Vui lòng thử lại.'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ marginTop: '16px' }} data-testid="contract-rate-resolve-lookup">
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
        <span className="icon-xs">{ICONS.history}</span>
        <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600 }}>Tra đơn giá áp dụng cho hợp đồng này</h3>
      </div>
      <p className="field-hint" style={{ marginBottom: '14px' }}>
        Tự động ưu tiên đơn giá riêng của hợp đồng; nếu chưa khai báo riêng, hệ thống rơi về đơn giá chung
        công ty (QTN-16).
      </p>

      {serverError && (
        <div className="alert-box alert-box--danger" role="alert">
          {serverError}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'flex-end' }}>
        <div style={{ minWidth: '200px', flex: '1 1 200px' }}>
          <label className="form-label" htmlFor="contract-resolve-role">
            Vai trò chuyên môn
          </label>
          <input
            id="contract-resolve-role"
            type="text"
            className={`form-input ${errors.professionalRole ? 'form-input--error' : ''}`}
            placeholder="Ví dụ: Lập trình viên"
            value={values.professionalRole}
            onChange={(e) => setValues((v) => ({ ...v, professionalRole: e.target.value }))}
          />
          {errors.professionalRole && <small className="field-error">{errors.professionalRole}</small>}
        </div>

        <div style={{ minWidth: '160px', flex: '1 1 160px' }}>
          <label className="form-label" htmlFor="contract-resolve-level">
            Cấp bậc
          </label>
          <input
            id="contract-resolve-level"
            type="text"
            className={`form-input ${errors.level ? 'form-input--error' : ''}`}
            placeholder="Ví dụ: Cao cấp"
            value={values.level}
            onChange={(e) => setValues((v) => ({ ...v, level: e.target.value }))}
          />
          {errors.level && <small className="field-error">{errors.level}</small>}
        </div>

        <div style={{ minWidth: '160px', flex: '1 1 160px' }}>
          <label className="form-label" htmlFor="contract-resolve-as-of">
            Ngày phát sinh
          </label>
          <input
            id="contract-resolve-as-of"
            type="date"
            className={`form-input ${errors.asOf ? 'form-input--error' : ''}`}
            value={values.asOf}
            onChange={(e) => setValues((v) => ({ ...v, asOf: e.target.value }))}
          />
          {errors.asOf && <small className="field-error">{errors.asOf}</small>}
        </div>

        <div>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Đang tra…' : 'Tra đơn giá'}
          </button>
        </div>
      </form>

      {notFoundMessage && (
        <div
          className="alert-box alert-box--info"
          role="status"
          style={{ marginTop: '14px' }}
          data-testid="contract-rate-resolve-not-found"
        >
          <span className="icon-xs">{ICONS.info}</span> {notFoundMessage}
        </div>
      )}

      {result && (
        <div
          className="alert-box alert-box--success"
          role="status"
          style={{ marginTop: '14px' }}
          data-testid="contract-rate-resolve-result"
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <strong>{formatDailyRate(result.dailyRate)} / ngày công</strong>
            <span className={`badge ${result.isContractSpecific ? 'badge--blue' : 'badge--gray'}`}>
              {result.isContractSpecific ? 'Đơn giá riêng hợp đồng' : 'Đơn giá chung công ty'}
            </span>
          </div>
          <div className="field-hint" style={{ marginTop: '4px' }}>
            Dòng áp dụng có hiệu lực từ {formatDate(result.effectiveFrom)}.
          </div>
        </div>
      )}
    </div>
  );
}
