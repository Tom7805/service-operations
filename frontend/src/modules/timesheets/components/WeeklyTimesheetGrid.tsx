import { memo, useMemo } from 'react';
import { ICONS } from '../../../components/common/icons';
import type { TimesheetSummaryRes } from '../types/timesheetTypes';
import { listWeekDates, weekdayLabel } from '../utils/weekRange';

export interface WeeklyTimesheetGridProps {
  weekFrom: string;
  weekTo: string;
  summaries: TimesheetSummaryRes[];
}

interface GridRowProps {
  summary: TimesheetSummaryRes;
  days: string[];
}

/** Một hàng công việc của lưới — memo để chỉ vẽ lại khi dữ liệu của chính công việc đó đổi. */
const GridRow = memo(function GridRow({ summary: s, days }: GridRowProps) {
  const hoursByDate = useMemo(() => new Map(s.entries.map((e) => [e.workDate, e])), [s.entries]);
  const usagePercent = s.usageRatio != null ? Math.min(s.usageRatio * 100, 999) : null;
  const taskLabel = s.taskName || `Công việc #${s.taskId}`;
  return (
    <tr data-testid={`weekly-grid-row-${s.taskId}`}>
      <th scope="row" className="dl-grid-task">
        <span className="timesheet-grid__task-name" title={taskLabel}>
          {taskLabel}
        </span>
      </th>
      {days.map((day) => {
        const entry = hoursByDate.get(day);
        // Sau khi cho phép nộp bổ sung vào tuần đã duyệt, một ô có thể mang giờ
        // công CHƯA được duyệt (SUBMITTED) nằm cạnh các ô khác đã APPROVED —
        // đánh dấu riêng để không nhìn nhầm cả tuần đã xong hết.
        const pending = entry != null && entry.status !== 'APPROVED';
        return (
          <td
            key={day}
            className={`dl-grid-day${entry ? '' : ' dl-grid-cell--empty'}${pending ? ' dl-grid-cell--pending' : ''}`}
            data-testid={`weekly-grid-cell-${s.taskId}-${day}`}
            title={
              entry
                ? [entry.note, pending ? 'Đang chờ Quản lý dự án duyệt' : null].filter(Boolean).join(' — ')
                : undefined
            }
          >
            {entry ? entry.hours : '—'}
            {pending && (
              <span className="dl-grid-pending-mark" title="Đang chờ duyệt">
                *
              </span>
            )}
          </td>
        );
      })}
      <td className="dl-grid-total" data-testid={`weekly-grid-total-${s.taskId}`}>
        {s.totalHours}
      </td>
      <td>
        {s.budgetHours != null ? (
          <div>
            <div
              className="dl-budget-track"
              role="meter"
              aria-label={`Mức dùng ngân sách giờ của ${taskLabel}`}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(Math.min(usagePercent ?? 0, 100))}
            >
              <div
                className={`dl-budget-fill${s.overBudgetWarning ? ' dl-budget-fill--over' : ''}`}
                style={{ width: `${Math.min(usagePercent ?? 0, 100)}%` }}
              />
            </div>
            <span
              className={`badge dl-budget-badge ${s.overBudgetWarning ? 'badge--pink' : 'badge--green'}`}
              data-testid={`weekly-grid-warning-${s.taskId}`}
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
});

/**
 * Lưới giờ công tuần của chính mình, nhóm theo công việc (NCL-06-CN-001).
 * Thuần hiển thị dữ liệu từ `GET /me/time-entries` — không gọi API, không có thao tác
 * sửa/xoá (những thao tác đó cần biết `projectId` của công việc, thứ mà endpoint tổng hợp
 * tuần không trả về; xem chi tiết/sửa/xoá ở đúng công việc trong dự án tương ứng).
 */
function WeeklyTimesheetGrid({ weekFrom, weekTo, summaries }: WeeklyTimesheetGridProps) {
  const days = useMemo(() => listWeekDates(weekFrom), [weekFrom]);
  const hasPending = useMemo(
    () => summaries.some((s) => s.entries.some((e) => e.status !== 'APPROVED')),
    [summaries]
  );

  if (summaries.length === 0) {
    return (
      <div className="table-empty-state dl-empty-compact" data-testid="weekly-grid-empty">
        <div className="table-empty-state__icon" aria-hidden="true">
          {ICONS.clock}
        </div>
        <h4 className="dl-empty-title">Chưa ghi giờ công nào trong tuần này</h4>
        <p className="dl-empty-text">
          Từ {weekFrom} đến {weekTo} — mở một công việc được giao trong dự án để bắt đầu ghi giờ công.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="table-responsive dl-grid-scroll" data-testid="weekly-grid">
        <table className="user-data-table dl-grid-table">
          <thead>
            <tr>
              <th className="dl-grid-task">Công việc</th>
              {days.map((day) => (
                <th key={day} className="dl-grid-day">
                  {weekdayLabel(day)}
                  <span className="dl-grid-day__date">{day.slice(5)}</span>
                </th>
              ))}
              <th className="dl-grid-total">Tổng</th>
              <th className="dl-grid-budget">Ngân sách</th>
            </tr>
          </thead>
          <tbody>
            {summaries.map((s) => (
              <GridRow key={s.taskId} summary={s} days={days} />
            ))}
          </tbody>
        </table>
      </div>
      {hasPending && (
        <p className="dl-grid-legend">
          <strong>*</strong> Giờ công chưa được Quản lý dự án duyệt.
        </p>
      )}
    </>
  );
}

export default memo(WeeklyTimesheetGrid);
