import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import WeeklyTimesheetGrid from '../components/WeeklyTimesheetGrid';
import type { TimeEntryRes, TimesheetSummaryRes } from '../types/timesheetTypes';

const WEEK_FROM = '2026-09-07';
const WEEK_TO = '2026-09-13';

function makeEntry(overrides: Partial<TimeEntryRes>): TimeEntryRes {
  return {
    id: 1,
    taskId: 20,
    userId: 7,
    workDate: '2026-09-09',
    hours: 5,
    status: 'DRAFT',
    note: null,
    billable: true,
    createdAt: '2026-09-09T17:00:00',
    ...overrides,
  };
}

describe('WeeklyTimesheetGrid (NCL-06-CN-001)', () => {
  it('hiển thị trạng thái rỗng khi chưa có bản ghi nào trong tuần', () => {
    render(<WeeklyTimesheetGrid weekFrom={WEEK_FROM} weekTo={WEEK_TO} summaries={[]} />);
    expect(screen.getByTestId('weekly-grid-empty')).toBeInTheDocument();
  });

  it('nhóm giờ công theo công việc, hiển thị đúng ngày và tổng giờ', () => {
    const summary: TimesheetSummaryRes = {
      taskId: 20,
      taskName: 'Phỏng vấn người dùng',
      weekFrom: WEEK_FROM,
      weekTo: WEEK_TO,
      entries: [makeEntry({ id: 30, workDate: '2026-09-09', hours: 5 })],
      totalHours: 8,
      budgetHours: 8,
      approvedHours: 0,
      usageRatio: 1.0,
      overBudgetWarning: true,
    };

    render(<WeeklyTimesheetGrid weekFrom={WEEK_FROM} weekTo={WEEK_TO} summaries={[summary]} />);

    expect(screen.getByTestId('weekly-grid')).toBeInTheDocument();
    expect(screen.getByText('Phỏng vấn người dùng')).toBeInTheDocument();
    expect(screen.getByTestId('weekly-grid-cell-20-2026-09-09')).toHaveTextContent('5');
    expect(screen.getByTestId('weekly-grid-cell-20-2026-09-08')).toHaveTextContent('—');
    expect(screen.getByTestId('weekly-grid-total-20')).toHaveTextContent('8');
  });

  it('cảnh báo vượt ngân sách khi overBudgetWarning = true (QTN-20)', () => {
    const summary: TimesheetSummaryRes = {
      taskId: 20,
      taskName: 'Phỏng vấn người dùng',
      weekFrom: WEEK_FROM,
      weekTo: WEEK_TO,
      entries: [],
      totalHours: 8,
      budgetHours: 8,
      approvedHours: 0,
      usageRatio: 1.0,
      overBudgetWarning: true,
    };

    render(<WeeklyTimesheetGrid weekFrom={WEEK_FROM} weekTo={WEEK_TO} summaries={[summary]} />);

    expect(screen.getByTestId('weekly-grid-warning-20')).toHaveTextContent('100% / 8 giờ');
    expect(screen.getByTestId('weekly-grid-warning-20')).toHaveTextContent('⚠');
  });

  it('hiển thị "Chưa đặt ngân sách" khi công việc chưa có budgetHours', () => {
    const summary: TimesheetSummaryRes = {
      taskId: 21,
      taskName: 'Việc không có ngân sách',
      weekFrom: WEEK_FROM,
      weekTo: WEEK_TO,
      entries: [],
      totalHours: 2,
      budgetHours: null,
      approvedHours: null,
      usageRatio: null,
      overBudgetWarning: false,
    };

    render(<WeeklyTimesheetGrid weekFrom={WEEK_FROM} weekTo={WEEK_TO} summaries={[summary]} />);

    expect(screen.getByText('Chưa đặt ngân sách')).toBeInTheDocument();
    expect(screen.queryByTestId('weekly-grid-warning-21')).not.toBeInTheDocument();
  });
});
