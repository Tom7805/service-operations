import { ICONS } from '../../../components/common/icons';
import TableSkeleton from '../../../components/common/TableSkeleton';
import type { TimeEntryStatus, TimesheetSummary } from '../types/timesheetTypes';
import { formatDayLabel, formatIsoDate } from '../utils/weekRange';

interface WeeklyTimesheetGridProps {
  summaries: TimesheetSummary[];
  /** 7 ngày liên tiếp của tuần đang xem, thứ Hai → Chủ Nhật. */
  days: Date[];
  loading: boolean;
}

const ENTRY_STATUS_META: Record<TimeEntryStatus, { label: string; badge: string }> = {
  DRAFT: { label: 'Đang nhập', badge: 'badge--gray' },
  SUBMITTED: { label: 'Đã nộp, chờ duyệt', badge: 'badge--blue' },
  APPROVED: { label: 'Đã duyệt', badge: 'badge--green' },
  REJECTED: { label: 'Bị từ chối', badge: 'badge--red' },
};

/** Bỏ số 0 thừa: 8 giờ hiện "8", 7.5 giờ hiện "7.5". */
function formatHours(hours: number): string {
  return Number(hours.toFixed(2)).toString();
}

export default function WeeklyTimesheetGrid({ summaries, days, loading }: WeeklyTimesheetGridProps) {
  const columnCount = days.length + 2; // Công việc + 7 ngày + Tổng/ngân sách

  const entryByDay = (summary: TimesheetSummary, day: Date) => {
    const iso = formatIsoDate(day);
    return summary.entries.find((entry) => entry.workDate === iso) ?? null;
  };

  const dailyTotals = days.map((day) => {
    const iso = formatIsoDate(day);
    return summaries.reduce((sum, summary) => {
      const entry = summary.entries.find((e) => e.workDate === iso);
      return sum + (entry ? entry.hours : 0);
    }, 0);
  });

  const grandTotal = summaries.reduce((sum, s) => sum + s.totalHours, 0);
  const isEmpty = summaries.length === 0 || summaries.every((s) => s.entries.length === 0);

  return (
    <div className="user-table-card">
      <div className="table-responsive">
        <table className="user-data-table timesheet-grid">
          <thead>
            <tr>
              <th>Công việc</th>
              {days.map((day) => (
                <th key={day.toISOString()} className="timesheet-grid__day-head">
                  {formatDayLabel(day)}
                </th>
              ))}
              <th className="timesheet-grid__total-head">Tổng / Ngân sách</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <TableSkeleton columns={columnCount} rows={3} />
            ) : isEmpty ? (
              <tr>
                <td colSpan={columnCount}>
                  <div className="table-empty-state">
                    <span className="empty-icon">{ICONS.calendar}</span>
                    <h3>Chưa có giờ công nào trong tuần này</h3>
                    <p>Hãy ghi giờ công cho các công việc được giao trước khi nộp bảng chấm công tuần.</p>
                  </div>
                </td>
              </tr>
            ) : (
              summaries.map((summary) => (
                <tr key={summary.taskId}>
                  <td>
                    <span className="timesheet-grid__task-name" title={summary.taskName}>
                      {summary.taskName}
                    </span>
                  </td>
                  {days.map((day) => {
                    const entry = entryByDay(summary, day);
                    if (!entry) {
                      return (
                        <td key={day.toISOString()} className="timesheet-grid__cell timesheet-grid__cell--empty">
                          –
                        </td>
                      );
                    }
                    const meta = ENTRY_STATUS_META[entry.status];
                    const title = entry.note ? `${meta.label} — ${entry.note}` : meta.label;
                    return (
                      <td key={day.toISOString()} className="timesheet-grid__cell" title={title}>
                        <span className="timesheet-grid__hours">{formatHours(entry.hours)}</span>
                        <span className={`timesheet-grid__dot timesheet-grid__dot--${entry.status.toLowerCase()}`} aria-hidden="true" />
                      </td>
                    );
                  })}
                  <td className="timesheet-grid__total-cell">
                    <strong className="timesheet-grid__hours">{formatHours(summary.totalHours)} giờ</strong>
                    {summary.budgetHours != null && (
                      <div className="timesheet-grid__budget">
                        <span>
                          Ngân sách {formatHours(summary.approvedHours ?? 0)}/{formatHours(summary.budgetHours)} giờ
                        </span>
                        {summary.overBudgetWarning && (
                          <span className="user-tag badge--gold" title="Đã dùng từ 80% ngân sách công việc trở lên (QTN-20)">
                            {ICONS.alertTriangle} Sắp/đã vượt ngân sách
                          </span>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
          {!isEmpty && !loading && (
            <tfoot>
              <tr className="timesheet-grid__footer-row">
                <td>Tổng cộng theo ngày</td>
                {dailyTotals.map((total, index) => (
                  <td key={days[index].toISOString()} className="timesheet-grid__cell">
                    <strong className="timesheet-grid__hours">{total > 0 ? formatHours(total) : '–'}</strong>
                  </td>
                ))}
                <td className="timesheet-grid__total-cell">
                  <strong className="timesheet-grid__hours">{formatHours(grandTotal)} giờ</strong>
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
