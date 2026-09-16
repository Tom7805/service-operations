import { useState } from 'react';
import type { FormEvent } from 'react';
import { ICONS } from '../../../components/common/icons';
import { resolveBillRate, RatesApiError } from '../api/ratesApi';
import type { BillRateRes } from '../types/rateTypes';
import { validateResolveBillRateForm, type ResolveBillRateFormValues } from '../validators/rateValidators';

const EMPTY_FORM: ResolveBillRateFormValues = {
  professionalRole: '',
  level: '',
  asOf: '',
};

interface Props {
  /** Danh sách vai trò chuyên môn đã từng khai báo, để chọn theo tên thay vì gõ tay. */
  roleOptions: string[];
  /** Cấp bậc đã khai báo cho từng vai trò — dùng để lọc lựa chọn cấp bậc theo vai trò đã chọn. */
  levelsByRole: Record<string, string[]>;
}

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
 * NCL-07-CN-002 — Tra đơn giá hiệu lực tại một ngày phát sinh cụ thể
 * (`GET /bill-rates/resolve`), dùng khi tính lại doanh thu cho giờ công đã ghi
 * nhận trong quá khứ: dòng đó phải áp đúng giá đang hiệu lực TẠI NGÀY nó phát
 * sinh, không bị ảnh hưởng bởi lần tăng giá sau đó (TC-02, QTN-15).
 *
 * Không mở modal riêng — đặt ngay dưới bảng đơn giá vì cùng nhóm quyền
 * (VT-05/VT-07) và người dùng cần đối chiếu qua lại với các dòng đã khai báo.
 */
export default function RateResolveLookup({ roleOptions, levelsByRole }: Props) {
  const [values, setValues] = useState<ResolveBillRateFormValues>(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BillRateRes | null>(null);
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
      const resolved = await resolveBillRate({
        professionalRole: values.professionalRole.trim(),
        level: values.level.trim(),
        asOf: values.asOf,
      });
      setResult(resolved);
    } catch (err) {
      if (err instanceof RatesApiError && err.statusCode === 404) {
        // 404 không phải lỗi hệ thống — chỉ là chưa từng có đơn giá tại thời điểm này.
        setNotFoundMessage(err.message);
      } else {
        setServerError(
          err instanceof RatesApiError ? err.message : 'Không tra được đơn giá. Vui lòng thử lại.'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="user-table-card" style={{ marginTop: '16px', padding: '20px' }} data-testid="rate-resolve-lookup">
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
        <span className="icon-xs">{ICONS.history}</span>
        <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>Tra đơn giá tại một thời điểm</h2>
      </div>
      <p className="field-hint" style={{ marginBottom: '14px' }}>
        Dùng khi tính lại doanh thu cho giờ công đã ghi nhận trong quá khứ — hệ thống trả về dòng đơn giá có
        hiệu lực gần nhất nhưng không vượt quá ngày phát sinh bạn nhập, kể cả khi đã có đơn giá mới hơn.
      </p>

      {serverError && (
        <div className="alert-box alert-box--danger" role="alert">
          {serverError}
        </div>
      )}

      {roleOptions.length === 0 && (
        <p className="field-hint" style={{ marginBottom: '14px' }}>
          Chưa có đơn giá nào được khai báo ở bảng trên — hãy khai báo ít nhất một dòng trước khi tra cứu.
        </p>
      )}

      <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'flex-end' }}>
        <div style={{ minWidth: '200px', flex: '1 1 200px' }}>
          <label className="form-label" htmlFor="resolve-role">
            Vai trò chuyên môn
          </label>
          <select
            id="resolve-role"
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
          <label className="form-label" htmlFor="resolve-level">
            Cấp bậc
          </label>
          <select
            id="resolve-level"
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
          <label className="form-label" htmlFor="resolve-as-of">
            Ngày phát sinh
          </label>
          <input
            id="resolve-as-of"
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
        <div className="alert-box alert-box--info" role="status" style={{ marginTop: '14px' }} data-testid="rate-resolve-not-found">
          <span className="icon-xs">{ICONS.info}</span> {notFoundMessage}
        </div>
      )}

      {result && (
        <div className="alert-box alert-box--success" role="status" style={{ marginTop: '14px' }} data-testid="rate-resolve-result">
          <div>
            <strong>
              {result.professionalRole} ({result.level})
            </strong>{' '}
            — {formatDailyRate(result.dailyRate)} / ngày công
          </div>
          <div className="field-hint" style={{ marginTop: '4px' }}>
            Dòng áp dụng có hiệu lực từ {formatDate(result.effectiveFrom)}
            {result.effectiveFrom !== values.asOf ? ' (khác ngày phát sinh bạn đã nhập, đây là dòng gần nhất trước đó)' : ''}.
          </div>
        </div>
      )}
    </div>
  );
}
