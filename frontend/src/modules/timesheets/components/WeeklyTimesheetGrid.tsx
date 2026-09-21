import { ICONS } from '../../../components/common/icons';
import type { TimesheetSummaryRes } from '../types/timesheetTypes';
import { listWeekDates, weekdayLabel } from '../utils/weekRange';

export interface WeeklyTimesheetGridProps {
  weekFrom: string;
  weekTo: string;
  summaries: TimesheetSummaryRes[];
}

/**
 * Lưới giờ công tuần của chính mình, nhóm theo công việc (NCL-06-CN-001).
 * Thuần hiển thị dữ liệu từ `GET /me/time-entries` — không gọi API, không có thao tác
 * sửa/xoá (những thao tác đó cần biết `projectId` của công việc, thứ mà endpoint tổng hợp
 * tuần không trả về; xem chi tiết/sửa/xoá ở đúng công việc trong dự án tương ứng).
 */
export default function WeeklyTimesheetGrid({ weekFrom, weekTo, summaries }: WeeklyTimesheetGridProps) {
  const days = listWeekDates(weekFrom);

  if (summaries.length === 0) {
    return (
      <div className="table-empty-state" data-testid="weekly-grid-empty" style={{ padding: '36px 20px', textAlign: 'center' }}>
        <div className="table-empty-state__icon" style={{ fontSize: '36px', color: 'var(--ink-faint)', marginBottom: '8px' }}>
          {ICONS.clock}
        </div>
        <h4 style={{ margin: '0 0 6px', fontSize: '15px', color: 'var(--ink-strong)' }}>Chưa ghi giờ công nào trong tuần này</h4>
        <p style={{ margin: 0, color: 'var(--ink-muted)', fontSize: '13.5px' }}>
          Từ {weekFrom} đến {weekTo} — mở một công việc được giao trong dự án để bắt đầu ghi giờ công.
        </p>
      </div>
    );
  }

  return (
    <div className="table-responsive" data-testid="weekly-grid">
      <table className="user-data-table">
        <thead>
          <tr>
            <th>Công việc</th>
            {days.map((day) => (
              <th key={day} style={{ width: '70px', textAlign: 'center' }}>
                {weekdayLabel(day)}
                <br />
                <span style={{ fontWeight: 400, fontSize: '11px' }}>{day.slice(5)}</span>
              </th>
            ))}
            <th style={{ width: '90px', textAlign: 'center' }}>Tổng</th>
            <th style={{ width: '150px' }}>Ngân sách</th>
          </tr>
        </thead>
        <tbody>
          {summaries.map((s) => {
            const hoursByDate = new Map(s.entries.map((e) => [e.workDate, e]));
            const usagePercent = s.usageRatio != null ? Math.min(s.usageRatio * 100, 999) : null;
            return (
              <tr key={s.taskId} data-testid={`weekly-grid-row-${s.taskId}`}>
                <td>
                  <strong>{s.taskName || `Công việc #${s.taskId}`}</strong>
                </td>
                {days.map((day) => {
                  const entry = hoursByDate.get(day);
                  // Sau khi cho phép nộp bổ sung vào tuần đã duyệt, một ô có thể mang giờ
                  // công CHƯA được duyệt (SUBMITTED) nằm cạnh các ô khác đã APPROVED —
                  // đánh dấu riêng để không nhìn nhầm cả tuần đã xong hết.
                  const pending = entry != null && entry.status !== 'APPROVED';
                  return (
                    <td
                      key={day}
                      style={{ textAlign: 'center', color: pending ? '#1F6C9F' : undefined }}
                      data-testid={`weekly-grid-cell-${s.taskId}-${day}`}
                      title={
                        entry
                          ? [entry.note, pending ? 'Đang chờ Quản lý dự án duyệt' : null].filter(Boolean).join(' — ')
                          : undefined
                      }
                    >
                      {entry ? entry.hours : '—'}
                      {pending && <span title="Đang chờ duyệt">*</span>}
                    </td>
                  );
                })}
                <td style={{ textAlign: 'center', fontWeight: 600 }} data-testid={`weekly-grid-total-${s.taskId}`}>
                  {s.totalHours}
                </td>
                <td>
                  {s.budgetHours != null ? (
                    <div>
                      <div
                        style={{
                          height: '6px',
                          borderRadius: '3px',
                          background: 'var(--line)',
                          overflow: 'hidden',
                          marginBottom: '4px',
                        }}
                      >
                        <div
                          style={{
                            height: '100%',
                            width: `${Math.min(usagePercent ?? 0, 100)}%`,
                            background: s.overBudgetWarning ? 'var(--pale-red-fg)' : 'var(--pale-blue-fg)',
                          }}
                        />
                      </div>
                      <span
                        className={`badge ${s.overBudgetWarning ? 'badge--pink' : 'badge--green'}`}
                        data-testid={`weekly-grid-warning-${s.taskId}`}
                        style={{ fontSize: '11px' }}
                      >
                        {usagePercent?.toFixed(0)}% / {s.budgetHours} giờ
                        {s.overBudgetWarning ? ' ⚠' : ''}
                      </span>
                    </div>
                  ) : (
                    <span className="field-hint">Chưa đặt ngân sách</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
