import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { getTimesheetReport, ReportsApiError } from '../api/reportsApi';
import type { TimesheetByEmployeeRes } from '../types/reportTypes';
import { ICONS } from '../../../components/common/icons';

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

  const load = useCallback(async () => {
    if (!isAllowed) return;
    setLoading(true);
    setError(null);
    try {
      setData(await getTimesheetReport(period.from, period.to));
    } catch (err) {
      setData(null);
      setError(
        err instanceof ReportsApiError && err.code === 'FORBIDDEN'
          ? 'Bạn không có quyền xem báo cáo giờ công theo nhân sự.'
          : err instanceof Error
            ? err.message
            : 'Không tải được báo cáo.'
      );
    } finally {
      setLoading(false);
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
      <div className="user-management-page">
        <div className="alert-box alert-box--danger" role="alert">
          <span className="icon-xs">{ICONS.lock}</span> Chỉ Quản lý dự án được xem báo cáo giờ công theo nhân sự.
        </div>
      </div>
    );
  }

  const rows = data?.rows ?? [];

  return (
    <div className="user-management-page">
      <div className="page-header">
        <div>
          <div className="page-header__kicker">
            <span className="page-header__tag">{ICONS.chart} BÁO CÁO</span>
            <span className="page-header__dot" />
            <span className="page-header__meta">GIỜ CÔNG</span>
          </div>
          <h1 className="page-title">Giờ công theo nhân sự</h1>
          <p className="page-subtitle">
            Giờ công đã duyệt của từng nhân sự trên từng dự án bạn quản lý, tách giờ có tính phí và không tính phí.
          </p>
        </div>
      </div>

      <form onSubmit={applyPeriod} noValidate
        style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'flex-end', marginBottom: '16px' }}>
        <div>
          <label className="form-label" htmlFor="timesheet-from">Từ ngày</label>
          <input id="timesheet-from" type="date" className="form-input" value={draft.from}
            onChange={(e) => setDraft((d) => ({ ...d, from: e.target.value }))} />
        </div>
        <div>
          <label className="form-label" htmlFor="timesheet-to">Đến ngày</label>
          <input id="timesheet-to" type="date" className={`form-input ${periodError ? 'form-input--error' : ''}`}
            value={draft.to} onChange={(e) => setDraft((d) => ({ ...d, to: e.target.value }))} />
        </div>
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? 'Đang tải…' : 'Xem báo cáo'}
        </button>
        {periodError && <small className="field-error" style={{ flexBasis: '100%' }}>{periodError}</small>}
      </form>

      {error && (
        <div className="alert-box alert-box--danger" role="alert">
          <span className="icon-xs">{ICONS.alertTriangle}</span> {error}
        </div>
      )}

      {loading && !data && <p className="field-hint">Đang tải báo cáo…</p>}

      {data && rows.length === 0 && !loading && (
        <div className="alert-box alert-box--info" role="status" data-testid="timesheet-empty">
          <span className="icon-xs">{ICONS.info}</span> Không có giờ công đã duyệt trong kỳ {data.from} – {data.to}.
        </div>
      )}

      {data && rows.length > 0 && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px',
            marginBottom: '16px' }}>
            <div className="user-table-card" style={{ padding: '14px 16px' }}>
              <div className="field-hint">Nhân sự</div>
              <div style={{ fontSize: '24px', fontWeight: 600 }}>{data.employeeCount}</div>
            </div>
            <div className="user-table-card" style={{ padding: '14px 16px' }}>
              <div className="field-hint">Dự án</div>
              <div style={{ fontSize: '24px', fontWeight: 600 }}>{data.projectCount}</div>
            </div>
            <div className="user-table-card" style={{ padding: '14px 16px' }}>
              <div className="field-hint">Giờ có tính phí</div>
              <div style={{ fontSize: '24px', fontWeight: 600 }} data-testid="timesheet-total-billable">
                {hours.format(data.totalBillableHours)}
              </div>
            </div>
            <div className="user-table-card" style={{ padding: '14px 16px' }}>
              <div className="field-hint">Giờ không tính phí</div>
              <div style={{ fontSize: '24px', fontWeight: 600 }}>{hours.format(data.totalNonBillableHours)}</div>
            </div>
          </div>

          <div className="user-table-card" style={{ overflowX: 'auto' }}>
            <table className="user-data-table" data-testid="timesheet-table">
              <thead>
                <tr>
                  <th>Nhân sự</th>
                  <th>Dự án</th>
                  <th style={{ textAlign: 'right' }}>Giờ có tính phí</th>
                  <th style={{ textAlign: 'right' }}>Giờ không tính phí</th>
                  <th style={{ textAlign: 'right' }}>Tổng giờ</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={`${row.employeeId ?? 'x'}-${row.projectId}`}>
                    <td>{row.employeeName ?? '—'}</td>
                    <td>{row.projectCode ? `${row.projectCode} — ${row.projectName ?? ''}` : (row.projectName ?? '—')}</td>
                    <td style={{ textAlign: 'right' }}>{hours.format(row.billableHours)}</td>
                    <td style={{ textAlign: 'right' }}>{hours.format(row.nonBillableHours)}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>{hours.format(row.totalHours)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={2} style={{ fontWeight: 600 }}>Tổng</td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>{hours.format(data.totalBillableHours)}</td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>{hours.format(data.totalNonBillableHours)}</td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>{hours.format(data.totalHours)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
