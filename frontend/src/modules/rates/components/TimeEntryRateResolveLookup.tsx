import { useState } from 'react';
import type { FormEvent } from 'react';
import { ICONS } from '../../../components/common/icons';
import { resolveTimeEntryBillRate, RatesApiError } from '../api/ratesApi';
import type { ResolvedTimeEntryRateRes } from '../types/rateTypes';
import { WORK_TYPE_LABELS } from '../types/rateTypes';
import {
  validateTimeEntryRateLookupForm,
  type TimeEntryRateLookupFormValues,
} from '../validators/rateValidators';

const EMPTY_FORM: TimeEntryRateLookupFormValues = {
  entryId: '',
  level: '',
};

function formatMoney(value: number): string {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 2 }).format(
    value
  );
}

function formatDate(value: string): string {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString('vi-VN');
}

/**
 * NCL-07-CN-005 — Tra cứu đơn giá áp dụng cho một dòng giờ công. Endpoint
 * tổng hợp: chỉ cần nhập `entryId` (ID dòng giờ công) và `level` (cấp bậc,
 * không tự suy ra được từ hồ sơ nhân sự) — không cần tự tra vai trò/hợp đồng
 * rồi gọi tiếp endpoint khác. Hiển thị `appliedDailyRate` (đơn giá CUỐI CÙNG,
 * đã nhân hệ số loại hình công việc — NCL-07-CN-006) làm trọng tâm, `dailyRate`
 * chỉ để đối chiếu.
 */
export default function TimeEntryRateResolveLookup() {
  const [values, setValues] = useState<TimeEntryRateLookupFormValues>(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ResolvedTimeEntryRateRes | null>(null);
  const [notFoundMessage, setNotFoundMessage] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (loading) return;

    const nextErrors = validateTimeEntryRateLookupForm(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setLoading(true);
    setServerError(null);
    setNotFoundMessage(null);
    setResult(null);
    try {
      const resolved = await resolveTimeEntryBillRate(Number(values.entryId), values.level.trim());
      setResult(resolved);
    } catch (err) {
      if (err instanceof RatesApiError && err.statusCode === 404) {
        // 404 không phải lỗi hệ thống — có thể dòng giờ công không tồn tại, người
        // thực hiện chưa có hồ sơ nhân sự đầy đủ, hoặc chưa có đơn giá/hệ số hợp lệ.
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
    <div className="user-table-card" style={{ marginTop: '16px', padding: '20px' }} data-testid="time-entry-rate-resolve-lookup">
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
        <span className="icon-xs">{ICONS.clock}</span>
        <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>Tra đơn giá áp dụng cho một dòng giờ công</h2>
      </div>
      <p className="field-hint" style={{ marginBottom: '14px' }}>
        Chỉ cần ID dòng giờ công và cấp bậc của người thực hiện — hệ thống tự suy ra vai trò, hợp đồng và
        ngày phát sinh để tra đúng đơn giá đang dùng để tính doanh thu cho dòng đó. Lấy "ID dòng giờ công" ở
        trang "Điều chỉnh giờ công đã duyệt" — mỗi dòng có ghi ID ngay dưới ngày công. "Cấp bậc" là cấp bậc
        đã khai báo cho vai trò của người đó trong bảng đơn giá (ví dụ: Cao cấp), không phải chức danh trong hồ sơ nhân sự.
      </p>

      {serverError && (
        <div className="alert-box alert-box--danger" role="alert">
          {serverError}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'flex-end' }}>
        <div style={{ minWidth: '160px' }}>
          <label className="form-label" htmlFor="time-entry-resolve-id">
            ID dòng giờ công
          </label>
          <input
            id="time-entry-resolve-id"
            type="number"
            min={1}
            className={`form-input ${errors.entryId ? 'form-input--error' : ''}`}
            placeholder="Ví dụ: 100"
            value={values.entryId}
            onChange={(e) => setValues((v) => ({ ...v, entryId: e.target.value }))}
          />
          {errors.entryId && <small className="field-error">{errors.entryId}</small>}
        </div>

        <div style={{ minWidth: '160px' }}>
          <label className="form-label" htmlFor="time-entry-resolve-level">
            Cấp bậc
          </label>
          <input
            id="time-entry-resolve-level"
            type="text"
            className={`form-input ${errors.level ? 'form-input--error' : ''}`}
            placeholder="Ví dụ: Cao cấp"
            value={values.level}
            onChange={(e) => setValues((v) => ({ ...v, level: e.target.value }))}
          />
          {errors.level && <small className="field-error">{errors.level}</small>}
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
          data-testid="time-entry-rate-resolve-not-found"
        >
          <span className="icon-xs">{ICONS.info}</span> {notFoundMessage}
        </div>
      )}

      {result && (
        <div
          className="alert-box alert-box--success"
          role="status"
          style={{ marginTop: '14px', display: 'block' }}
          data-testid="time-entry-rate-resolve-result"
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
            <strong style={{ fontSize: '16px' }}>{formatMoney(result.appliedDailyRate)} / ngày công</strong>
            <span className={`badge ${result.isContractSpecific ? 'badge--blue' : 'badge--gray'}`}>
              {result.isContractSpecific ? 'Đơn giá riêng hợp đồng' : 'Đơn giá chung công ty'}
            </span>
            <span className="badge badge--gold">{WORK_TYPE_LABELS[result.workType]}</span>
          </div>

          <div className="table-responsive">
            <table className="user-data-table">
              <tbody>
                <tr>
                  <td className="cell-muted">Dòng giờ công</td>
                  <td>
                    #{result.timeEntryId} · {result.professionalRole} ({result.level})
                  </td>
                </tr>
                <tr>
                  <td className="cell-muted">Ngày công / số giờ</td>
                  <td>
                    {formatDate(result.workDate)} · {result.hours} giờ
                  </td>
                </tr>
                <tr>
                  <td className="cell-muted">Đơn giá theo vai trò/cấp bậc</td>
                  <td>
                    {formatMoney(result.dailyRate)} (hiệu lực từ {formatDate(result.effectiveFrom)})
                  </td>
                </tr>
                <tr>
                  <td className="cell-muted">Hệ số loại hình công việc</td>
                  <td>× {result.rateFactor}</td>
                </tr>
                <tr>
                  <td className="cell-muted">
                    <strong>Đơn giá cuối cùng</strong>
                  </td>
                  <td>
                    <strong>{formatMoney(result.appliedDailyRate)}</strong>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
