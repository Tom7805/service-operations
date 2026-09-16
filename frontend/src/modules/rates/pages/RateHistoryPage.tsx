import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { ICONS } from '../../../components/common/icons';
import { roleLabels } from '../../../utils/roleLabel';
import { fetchBillRateHistory, fetchCurrentBillRates, RatesApiError } from '../api/ratesApi';
import type { BillRateHistoryRes } from '../types/rateTypes';
import { validateRateHistoryQuery, type RateHistoryQueryFormValues } from '../validators/rateValidators';
import RateEffectiveTimeline from '../components/RateEffectiveTimeline';

interface RateHistoryPageProps {
  currentUserRoles?: string[];
  currentUserName?: string;
}

const EMPTY_FORM: RateHistoryQueryFormValues = {
  professionalRole: '',
  level: '',
};

/**
 * NCL-07-CN-007 — "Lịch sử thay đổi đơn giá": Kế toán (VT-05) hoặc Quản trị
 * viên (VT-07) tra toàn bộ các mốc đơn giá đã từng khai báo cho một cặp
 * (vai trò, cấp bậc), để giải trình vì sao doanh thu giữa hai kỳ khác nhau
 * (ví dụ do công ty tăng giá giữa chừng — NCL-07-CN-002).
 */
export default function RateHistoryPage({
  currentUserRoles = [],
  currentUserName = 'Người dùng',
}: RateHistoryPageProps) {
  const isAllowed = currentUserRoles.includes('VT-05') || currentUserRoles.includes('VT-07');

  const [values, setValues] = useState<RateHistoryQueryFormValues>(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<BillRateHistoryRes | null>(null);
  const [notFoundMessage, setNotFoundMessage] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [billRates, setBillRates] = useState<{ professionalRole: string; level: string }[]>([]);

  useEffect(() => {
    if (!isAllowed) return;
    fetchCurrentBillRates()
      .then(setBillRates)
      .catch(() => setBillRates([]));
  }, [isAllowed]);

  const roleOptions = useMemo(
    () => Array.from(new Set(billRates.map((r) => r.professionalRole))).sort((a, b) => a.localeCompare(b)),
    [billRates]
  );
  const levelsByRole = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const r of billRates) {
      const list = map[r.professionalRole] ?? (map[r.professionalRole] = []);
      if (!list.includes(r.level)) list.push(r.level);
    }
    Object.values(map).forEach((list) => list.sort((a, b) => a.localeCompare(b)));
    return map;
  }, [billRates]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!isAllowed || loading) return;

    const nextErrors = validateRateHistoryQuery(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setLoading(true);
    setServerError(null);
    setNotFoundMessage(null);
    setHistory(null);
    setHasSearched(true);
    try {
      const data = await fetchBillRateHistory(values.professionalRole.trim(), values.level.trim());
      setHistory(data);
    } catch (err) {
      if (err instanceof RatesApiError && err.statusCode === 404) {
        // 404 không phải lỗi hệ thống — vai trò/cấp bậc đó chưa từng có đơn giá nào.
        setNotFoundMessage(err.message);
      } else {
        setServerError(
          err instanceof RatesApiError ? err.message : 'Không tra được lịch sử đơn giá. Vui lòng thử lại.'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  // NCL-07-CN-007 (TC-03): từ chối quyền cho vai trò khác Kế toán/Quản trị viên.
  if (!isAllowed) {
    return (
      <div className="access-denied-container" data-testid="rate-history-access-denied">
        <div className="access-denied-card">
          <div className="access-denied-icon">{ICONS.shieldOff}</div>
          <h2>Bạn không có thẩm quyền xem lịch sử đơn giá</h2>
          <p>
            Chỉ <strong>Kế toán</strong> (VT-05) hoặc <strong>Quản trị viên</strong> (VT-07) được xem lịch sử
            thay đổi đơn giá. Hệ thống đã ghi lại lần từ chối truy cập này vào Nhật ký hệ thống.
          </p>
          <div className="security-log-badge">
            <span className="security-log-badge__item">
              {ICONS.shield} Thời điểm ghi nhận: {new Date().toLocaleString('vi-VN')}
            </span>
            <span className="security-log-badge__item">Tài khoản: {currentUserName}</span>
            <span className="security-log-badge__item">
              Vai trò tài khoản: {roleLabels(currentUserRoles) || '(không xác định)'}
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="user-management-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Lịch sử thay đổi đơn giá</h1>
          <p className="page-subtitle">
            Tra toàn bộ các mốc đơn giá đã từng khai báo cho một vai trò chuyên môn + cấp bậc — dùng để giải
            trình chênh lệch doanh thu giữa hai kỳ.
          </p>
        </div>
      </div>

      <div className="user-table-card" style={{ padding: '20px' }}>
        {serverError && (
          <div className="alert-box alert-box--danger" role="alert">
            {serverError}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          noValidate
          style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'flex-end' }}
        >
          <div style={{ minWidth: '200px', flex: '1 1 200px' }}>
            <label className="form-label" htmlFor="rate-history-role">
              Vai trò chuyên môn
            </label>
            <select
              id="rate-history-role"
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
            <label className="form-label" htmlFor="rate-history-level">
              Cấp bậc
            </label>
            <select
              id="rate-history-level"
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

          <div>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Đang tra…' : 'Xem lịch sử'}
            </button>
          </div>
        </form>

        {notFoundMessage && (
          <div
            className="alert-box alert-box--info"
            role="status"
            style={{ marginTop: '14px' }}
            data-testid="rate-history-not-found"
          >
            <span className="icon-xs">{ICONS.info}</span> {notFoundMessage}
          </div>
        )}

        {loading && (
          <div className="table-loading-state">
            <div className="spinner-lg" />
            <p>Đang tải lịch sử đơn giá...</p>
          </div>
        )}

        {!loading && history && (
          <div style={{ marginTop: '18px' }}>
            <RateEffectiveTimeline history={history} />
          </div>
        )}

        {!loading && !history && !notFoundMessage && !serverError && !hasSearched && (
          <p className="field-hint" style={{ marginTop: '14px' }}>
            Chọn vai trò chuyên môn và cấp bậc rồi bấm "Xem lịch sử" để tra cứu.
          </p>
        )}
      </div>
    </div>
  );
}
