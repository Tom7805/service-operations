import { useState } from 'react';
import type { FormEvent } from 'react';
import { ICONS } from '../../../components/common/icons';
import { resolveContractBillRate, RatesApiError } from '../api/ratesApi';
import type { ResolvedContractBillRateRes } from '../types/rateTypes';
import RateResultCard, { formatRateDate } from './RateResultCard';
import { validateResolveBillRateForm, type ResolveBillRateFormValues } from '../validators/rateValidators';

interface Props {
  contractId: number;
  /** Danh sách vai trò chuyên môn đã từng khai báo, để chọn theo tên thay vì gõ tay. */
  roleOptions: string[];
  /** Cấp bậc đã khai báo cho từng vai trò — dùng để lọc lựa chọn cấp bậc theo vai trò đã chọn. */
  levelsByRole: Record<string, string[]>;
}

const EMPTY_FORM: ResolveBillRateFormValues = {
  professionalRole: '',
  level: '',
  asOf: '',
};

/**
 * NCL-07-CN-003 — Tra đơn giá ÁP DỤNG cho một hợp đồng tại ngày phát sinh cụ
 * thể (`GET /contracts/{contractId}/bill-rates/resolve`), đã áp quy tắc ưu
 * tiên QTN-16: ưu tiên đơn giá riêng hợp đồng (TC-01), không có thì tự rơi về
 * đơn giá chung công ty (TC-02) — `isContractSpecific` phân biệt rõ hai
 * trường hợp này cho Kế toán.
 */
export default function ContractRateResolveLookup({ contractId, roleOptions, levelsByRole }: Props) {
  const [values, setValues] = useState<ResolveBillRateFormValues>(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ResolvedContractBillRateRes | null>(null);
  const [queried, setQueried] = useState<ResolveBillRateFormValues>(EMPTY_FORM);
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
      setQueried({ ...values });
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
          <select
            id="contract-resolve-role"
            className={`form-input ${errors.professionalRole ? 'form-input--error' : ''}`}
            value={values.professionalRole}
            onChange={(e) => setValues((v) => ({ ...v, professionalRole: e.target.value, level: '' }))}
          >
            <option value="">-- Chọn vai trò --</option>
            {roleOptions.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
          {errors.professionalRole && <small className="field-error">{errors.professionalRole}</small>}
        </div>

        <div style={{ minWidth: '160px', flex: '1 1 160px' }}>
          <label className="form-label" htmlFor="contract-resolve-level">
            Cấp bậc
          </label>
          <select
            id="contract-resolve-level"
            className={`form-input ${errors.level ? 'form-input--error' : ''}`}
            value={values.level}
            disabled={!values.professionalRole}
            onChange={(e) => setValues((v) => ({ ...v, level: e.target.value }))}
          >
            <option value="">-- Chọn cấp bậc --</option>
            {(levelsByRole[values.professionalRole] ?? []).map((level) => (
              <option key={level} value={level}>
                {level}
              </option>
            ))}
          </select>
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
        <RateResultCard
          testId="contract-rate-resolve-result"
          eyebrow="Đơn giá áp dụng cho hợp đồng"
          title={queried.professionalRole}
          level={queried.level}
          badges={[
            result.isContractSpecific
              ? { label: 'Đơn giá riêng hợp đồng', tone: 'blue' }
              : { label: 'Đơn giá chung công ty', tone: 'gray' },
          ]}
          dailyRate={result.dailyRate}
          facts={[
            { label: 'Ngày phát sinh tra cứu', value: formatRateDate(queried.asOf) },
            { label: 'Hiệu lực từ', value: formatRateDate(result.effectiveFrom) },
            {
              label: 'Nguồn đơn giá',
              value: result.isContractSpecific ? 'Khai báo riêng cho hợp đồng này' : 'Bảng đơn giá chung công ty',
            },
          ]}
          footnote="Ưu tiên đơn giá riêng của hợp đồng; nếu chưa khai báo riêng, hệ thống rơi về đơn giá chung công ty (QTN-16)."
        />
      )}
    </div>
  );
}
