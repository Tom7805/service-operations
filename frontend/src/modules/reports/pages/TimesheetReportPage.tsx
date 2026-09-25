import { useCallback, useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { getTimesheetReport, ReportsApiError } from '../api/reportsApi';
import type { TimesheetByEmployeeRes } from '../types/reportTypes';
import { ICONS } from '../../../components/common/icons';
import { ReportErrorAlert, ReportSkeleton } from '../components/ReportStates';

interface TimesheetReportPageProps {
  currentUserRoles?: string[];
}

const hours = new Intl.NumberFormat('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function firstDayOfMonthIso(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
}

/**
 * NCL-11-CN-006 — Báo cáo giờ công theo nhân sự. Chỉ Quản lý dự án (VT-02) được xem (TC-03), chỉ thấy giờ công của
 * dự án mình quản lý (QTN-01): lưới người × dự án, tách giờ có tính phí / không tính phí (TC-01).
 */
export default function TimesheetReportPage({ currentUserRoles = [] }: TimesheetReportPageProps) {
  const isAllowed = currentUserRoles.includes('VT-02');

  const [draft, setDraft] = useState(() => ({ from: firstDayOfMonthIso(), to: todayIso() }));
  const [period, setPeriod] = useState(draft);
  const [periodError, setPeriodError] = useState<string | null>(null);
  const [data, setData] = useState<TimesheetByEmployeeRes | null>(null);
  const [loading, setLoading] = useState(isAllowed);
  const [error, setError] = useState<string | null>(null);

  /** Chỉ phản hồi của lần gọi mới nhất được ghi vào trang — đổi kỳ liên tiếp thì phản hồi cũ bị bỏ. */
  const requestIdRef = useRef(0);

  const load = useCallback(async () => {
    if (!isAllowed) return;
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError(null);
    try {
      const res = await getTimesheetReport(period.from, period.to);
      if (requestId !== requestIdRef.current) return;
      setData(res);
    } catch (err) {
      if (requestId !== requestIdRef.current) return;
      setData(null);
      setError(
        err instanceof ReportsApiError && err.code === 'FORBIDDEN'
          ? 'Bạn không có quyền xem báo cáo giờ công theo nhân sự.'
          : err instanceof Error
            ? err.message
            : 'Không tải được báo cáo.'
      );
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, [isAllowed, period]);

  useEffect(() => {
    void load();
  }, [load]);

  function applyPeriod(event: FormEvent) {
    event.preventDefault();
    if (!draft.from || !draft.to) return setPeriodError('Chọn đủ ngày bắt đầu và ngày kết thúc.');
    if (draft.from > draft.to) return setPeriodError('Ngày kết thúc không được trước ngày bắt đầu.');
    setPeriodError(null);
    setPeriod({ ...draft });
  }

  if (!isAllowed) {
    return (
      <div className="user-management-page ia-page">
        <div className="alert-box alert-box--danger" role="alert">
          <span className="icon-xs">{ICONS.lock}</span> Chỉ Quản lý dự án được xem báo cáo giờ công theo nhân sự.
        </div>
      </div>
    );
  }

  const rows = data?.rows ?? [];

  return (
    <div className="user-management-page ia-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Giờ công theo nhân sự</h1>
          <p className="page-subtitle">
            Giờ công đã duyệt của từng nhân sự trên từng dự án bạn quản lý, tách giờ có tính phí và không tính phí.
          </p>
        </div>
      </div>

      <form onSubmit={applyPeriod} noValidate className="ia-filter-form" aria-busy={loading}>
        <div>
          <label className="form-label" htmlFor="timesheet-from">Từ ngày</label>
          <input id="timesheet-from" type="date" className="form-input" value={draft.from}
            onChange={(e) => setDraft((d) => ({ ...d, from: e.target.value }))} />
        </div>
        <div>
          <label className="form-label" htmlFor="timesheet-to">Đến ngày</label>
          <input id="timesheet-to" type="date" className={`form-input ${periodError ? 'form-input--error' : ''}`}
            aria-invalid={periodError ? true : undefined}
            aria-describedby={periodError ? 'timesheet-period-error' : undefined}
            value={draft.to} onChange={(e) => setDraft((d) => ({ ...d, to: e.target.value }))} />
        </div>
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? 'Đang tải…' : 'Xem báo cáo'}
        </button>
        {periodError && <small className="field-error" id="timesheet-period-error">{periodError}</small>}
      </form>

      {error && <ReportErrorAlert message={error} onRetry={() => void load()} retryDisabled={loading} />}

      {loading && !data && <ReportSkeleton label="Đang tải báo cáo…" kpis={4} tableColumns={5} tableRows={6} />}

      {data && rows.length === 0 && !loading && (
        <div className="alert-box alert-box--info" role="status" data-testid="timesheet-empty">
          <span className="icon-xs">{ICONS.info}</span> Không có giờ công đã duyệt trong kỳ {data.from} – {data.to}.
        </div>
      )}

      {data && rows.length > 0 && (
        <>
          <div className="stats-grid">
            <div className="stat-card">
              <span className="stat-card__label">Nhân sự</span>
              <span className="stat-card__value">{data.employeeCount}</span>
            </div>
            <div className="stat-card">
              <span className="stat-card__label">Dự án</span>
              <span className="stat-card__value">{data.projectCount}</span>
            </div>
            <div className="stat-card">
              <span className="stat-card__label">Giờ có tính phí</span>
              <span className="stat-card__value" data-testid="timesheet-total-billable">
                {hours.format(data.totalBillableHours)}
              </span>
            </div>
            <div className="stat-card">
              <span className="stat-card__label">Giờ không tính phí</span>
              <span className="stat-card__value">{hours.format(data.totalNonBillableHours)}</span>
            </div>
          </div>

          <div className="user-table-card ia-table-card">
            <div className="table-responsive">
            <table className="user-data-table" data-testid="timesheet-table">
              <thead>
                <tr>
                  <th>Nhân sự</th>
                  <th>Dự án</th>
                  <th className="text-right">Giờ có tính phí</th>
                  <th className="text-right">Giờ không tính phí</th>
                  <th className="text-right">Tổng giờ</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={`${row.employeeId ?? 'x'}-${row.projectId}`}>
                    <td>{row.employeeName ?? '—'}</td>
                    <td>{row.projectCode ? `${row.projectCode} — ${row.projectName ?? ''}` : (row.projectName ?? '—')}</td>
                    <td className="ia-num">{hours.format(row.billableHours)}</td>
                    <td className="ia-num">{hours.format(row.nonBillableHours)}</td>
                    <td className="ia-num ia-strong">{hours.format(row.totalHours)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={2}>Tổng</td>
                  <td className="ia-num">{hours.format(data.totalBillableHours)}</td>
                  <td className="ia-num">{hours.format(data.totalNonBillableHours)}</td>
                  <td className="ia-num">{hours.format(data.totalHours)}</td>
                </tr>
              </tfoot>
            </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
