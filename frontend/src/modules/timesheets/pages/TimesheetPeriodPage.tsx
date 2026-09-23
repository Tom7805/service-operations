import { useCallback, useEffect, useState } from 'react';
import { ICONS } from '../../../components/common/icons';
import { roleLabels } from '../../../utils/roleLabel';
import { getTimesheetPeriods, lockTimesheetPeriod, TimesheetsApiError, unlockTimesheetPeriod } from '../api/timesheetsApi';
import type { TimesheetPeriodRes } from '../types/timesheetTypes';

export interface TimesheetPeriodPageProps {
  currentUserRoles?: string[];
  currentUserName?: string;
}

const MONTH_LABELS = [
  'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
  'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12',
];

function periodLabel(periodStart: string): string {
  const [year, month] = periodStart.split('-').map(Number);
  return `${MONTH_LABELS[month - 1]}/${year}`;
}

function parsePeriodStart(periodStart: string): { year: number; month: number } {
  const [year, month] = periodStart.split('-').map(Number);
  return { year, month };
}

/**
 * Màn "Khóa kỳ chấm công" của Kế toán (NCL-06-CN-006). Kỳ tính theo tháng — khóa/mở đồng
 * loạt cả tháng, không khóa theo tuần lẻ. Khi kỳ đã LOCKED, mọi thao tác ghi/sửa/điều chỉnh
 * giờ công rơi vào kỳ đó đều bị chặn (QTN-12) ở các màn hình khác.
 */
export default function TimesheetPeriodPage({
  currentUserRoles = [],
  currentUserName = 'Kế toán',
}: TimesheetPeriodPageProps) {
  // NCL-06-CN-006 TC-03: chỉ Kế toán (VT-05) được khóa/mở kỳ chấm công.
  const isAllowed = currentUserRoles.includes('VT-05');

  const now = new Date();
  const [year, setYear] = useState(String(now.getFullYear()));
  const [month, setMonth] = useState(String(now.getMonth() + 1));

  const [periods, setPeriods] = useState<TimesheetPeriodRes[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submittingId, setSubmittingId] = useState<'new' | number | null>(null);
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 6000);
  };

  const fetchPeriods = useCallback(async () => {
    if (!isAllowed) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getTimesheetPeriods();
      setPeriods(data);
    } catch (err) {
      const message =
        err instanceof TimesheetsApiError || err instanceof Error ? err.message : 'Không thể tải danh sách kỳ chấm công.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [isAllowed]);

  useEffect(() => {
    void fetchPeriods();
  }, [fetchPeriods]);

  const upsertPeriod = (updated: TimesheetPeriodRes) => {
    setPeriods((prev) => {
      const exists = prev.some((p) => p.id === updated.id);
      const next = exists ? prev.map((p) => (p.id === updated.id ? updated : p)) : [updated, ...prev];
      return next.sort((a, b) => (a.periodStart < b.periodStart ? 1 : -1));
    });
  };

  const handleLockNew = async () => {
    const yearNum = Number(year);
    const monthNum = Number(month);
    if (!Number.isInteger(yearNum) || yearNum < 2000 || !Number.isInteger(monthNum) || monthNum < 1 || monthNum > 12) {
      showToast('Vui lòng chọn năm và tháng hợp lệ.', 'error');
      return;
    }
    const confirmed = window.confirm(
      `Khóa kỳ chấm công ${MONTH_LABELS[monthNum - 1]}/${yearNum}? Sau khi khóa, mọi thao tác ghi/sửa/điều chỉnh giờ công trong kỳ này sẽ bị chặn cho đến khi mở lại.`
    );
    if (!confirmed) return;

    setSubmittingId('new');
    try {
      const result = await lockTimesheetPeriod({ year: yearNum, month: monthNum });
      upsertPeriod(result);
      showToast(`Đã khóa kỳ chấm công ${periodLabel(result.periodStart)} thành công.`, 'success');
    } catch (err) {
      const message =
        err instanceof TimesheetsApiError || err instanceof Error ? err.message : 'Không thể khóa kỳ chấm công.';
      showToast(message, 'error');
    } finally {
      setSubmittingId(null);
    }
  };

  const handleLockExisting = async (period: TimesheetPeriodRes) => {
    const { year: y, month: m } = parsePeriodStart(period.periodStart);
    const confirmed = window.confirm(
      `Khóa kỳ chấm công ${periodLabel(period.periodStart)}? Sau khi khóa, mọi thao tác ghi/sửa/điều chỉnh giờ công trong kỳ này sẽ bị chặn cho đến khi mở lại.`
    );
    if (!confirmed) return;

    setSubmittingId(period.id);
    try {
      const result = await lockTimesheetPeriod({ year: y, month: m });
      upsertPeriod(result);
      showToast(`Đã khóa kỳ chấm công ${periodLabel(result.periodStart)} thành công.`, 'success');
    } catch (err) {
      const message =
        err instanceof TimesheetsApiError || err instanceof Error ? err.message : 'Không thể khóa kỳ chấm công.';
      showToast(message, 'error');
    } finally {
      setSubmittingId(null);
    }
  };

  const handleUnlock = async (period: TimesheetPeriodRes) => {
    const confirmed = window.confirm(
      `Mở lại kỳ chấm công ${periodLabel(period.periodStart)}? Nhân viên/PM sẽ ghi/sửa/điều chỉnh giờ công trong kỳ này được trở lại.`
    );
    if (!confirmed) return;

    setSubmittingId(period.id);
    try {
      const result = await unlockTimesheetPeriod(period.id);
      upsertPeriod(result);
      showToast(`Đã mở lại kỳ chấm công ${periodLabel(result.periodStart)} thành công.`, 'success');
    } catch (err) {
      const message =
        err instanceof TimesheetsApiError || err instanceof Error ? err.message : 'Không thể mở lại kỳ chấm công.';
      showToast(message, 'error');
    } finally {
      setSubmittingId(null);
    }
  };

  if (!isAllowed) {
    return (
      <div className="access-denied-container">
        <div className="access-denied-card">
          <div className="access-denied-icon">{ICONS.shieldOff}</div>
          <h2>Bạn không có thẩm quyền truy cập màn hình này</h2>
          <p>
            Chức năng Khóa kỳ chấm công chỉ dành riêng cho vai trò <strong>Kế toán</strong>. Hệ thống đã ghi
            lại lần truy cập bị từ chối này vào nhật ký bảo mật.
          </p>
          <div className="security-log-badge">
            <span className="security-log-badge__item">{ICONS.shield} Thời điểm: {new Date().toLocaleString('vi-VN')}</span>
            <span className="security-log-badge__item">Tài khoản: {currentUserName}</span>
            <span className="security-log-badge__item">Vai trò hiện tại: {roleLabels(currentUserRoles)}</span>
          </div>
        </div>
      </div>
    );
  }

  const lockedCount = periods.filter((p) => p.status === 'LOCKED').length;

  return (
    <div className="user-management-page" data-testid="timesheet-period-page">
      {toast && (
        <div className={`toast-banner toast-banner--${toast.type}`} role="status">
          <span className="toast-banner__icon">{toast.type === 'success' ? ICONS.checkCircle : ICONS.alertTriangle}</span>
          <span>{toast.text}</span>
          <button type="button" className="toast-banner__close" aria-label="Đóng thông báo" onClick={() => setToast(null)}>
            {ICONS.close}
          </button>
        </div>
      )}

      <div className="page-header">
        <div>
          <h1 className="page-title">Khóa kỳ chấm công</h1>
          <p className="page-subtitle">
            Kỳ tính theo tháng — khóa/mở đồng loạt cả tháng. Khi đã khóa, mọi thao tác ghi/sửa/điều chỉnh
            giờ công có ngày làm việc rơi vào kỳ đó đều bị chặn.
          </p>
        </div>
        <div className="page-header__actions">
          <button type="button" className="btn-icon-refresh" onClick={fetchPeriods} title="Tải lại" aria-label="Tải lại" disabled={loading}>
            {ICONS.refresh}
          </button>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-card__icon stat-card__icon--purple">{ICONS.calendar}</div>
          <div>
            <span className="stat-card__label">Tổng số kỳ</span>
            <strong className="stat-card__value">{periods.length}</strong>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card__icon stat-card__icon--red">{ICONS.lock}</div>
          <div>
            <span className="stat-card__label">Kỳ đang khóa</span>
            <strong className="stat-card__value">{lockedCount}</strong>
          </div>
        </div>
      </div>

      <div className="user-table-card" style={{ padding: '20px', marginBottom: '16px' }}>
        <h3 style={{ margin: '0 0 12px', fontSize: '16px', fontWeight: 700 }}>Khóa kỳ theo tháng</h3>
        <div className="form-grid">
          <div>
            <label className="form-label" htmlFor="lock-year">
              Năm
            </label>
            <input
              id="lock-year"
              type="number"
              min={2000}
              className="form-input"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              data-testid="lock-year-input"
            />
          </div>
          <div>
            <label className="form-label" htmlFor="lock-month">
              Tháng
            </label>
            <select
              id="lock-month"
              className="form-select"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              data-testid="lock-month-select"
            >
              {MONTH_LABELS.map((label, index) => (
                <option key={label} value={index + 1}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div style={{ marginTop: '12px' }}>
          <button
            type="button"
            className="btn-primary"
            onClick={handleLockNew}
            disabled={submittingId === 'new'}
            data-testid="btn-lock-new-period"
          >
            {ICONS.lock} {submittingId === 'new' ? 'Đang khóa…' : 'Khóa kỳ'}
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert--error mb-4" role="alert">
          <span className="alert__icon">{ICONS.alertTriangle}</span>
          <span>{error}</span>
          <button type="button" className="btn-link text-white ml-auto" onClick={fetchPeriods}>
            Thử lại
          </button>
        </div>
      )}

      <div className="user-table-card">
        <div className="table-responsive">
          <table className="user-data-table">
            <thead>
              <tr>
                <th>Kỳ chấm công</th>
                <th>Trạng thái</th>
                <th>Người khóa gần nhất</th>
                <th>Thời điểm khóa</th>
                <th style={{ width: '160px' }}></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '40px' }}>
                    Đang tải danh sách kỳ chấm công…
                  </td>
                </tr>
              ) : periods.length === 0 ? (
                <tr>
                  <td colSpan={5}>
                    <div className="table-empty-state">
                      <span className="empty-icon">{ICONS.calendar}</span>
                      <h3>Chưa có kỳ chấm công nào được khóa</h3>
                      <p>Dùng biểu mẫu "Khóa kỳ theo tháng" phía trên để khóa kỳ đầu tiên.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                periods.map((p) => (
                  <tr key={p.id} data-testid={`period-row-${p.id}`}>
                    <td>
                      <strong>{periodLabel(p.periodStart)}</strong>
                    </td>
                    <td>
                      <span className={`status-pill status-pill--${p.status === 'LOCKED' ? 'rejected' : 'approved'}`}>
                        <span className="status-pill__dot" />
                        {p.status === 'LOCKED' ? 'Đã khóa' : 'Đang mở'}
                      </span>
                    </td>
                    <td>{p.lockedBy ?? '—'}</td>
                    <td>{p.lockedAt ? new Date(p.lockedAt).toLocaleString('vi-VN') : '—'}</td>
                    <td style={{ textAlign: 'right' }}>
                      {p.status === 'LOCKED' ? (
                        <button
                          type="button"
                          className="btn-secondary"
                          onClick={() => handleUnlock(p)}
                          disabled={submittingId === p.id}
                          data-testid={`btn-unlock-${p.id}`}
                        >
                          {ICONS.unlock} {submittingId === p.id ? 'Đang mở…' : 'Mở khóa'}
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="btn-danger"
                          onClick={() => handleLockExisting(p)}
                          disabled={submittingId === p.id}
                          data-testid={`btn-lock-${p.id}`}
                        >
                          {ICONS.lock} {submittingId === p.id ? 'Đang khóa…' : 'Khóa'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="table-footer">
          Hiển thị <strong>{periods.length}</strong> kỳ chấm công
        </div>
      </div>
    </div>
  );
}
