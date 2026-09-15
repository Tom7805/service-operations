import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import WeeklyTimesheetGrid from '../components/WeeklyTimesheetGrid';
import type { TimesheetSummary } from '../types/timesheetTypes';

// Thứ Hai 07/09/2026 -> Chủ Nhật 13/09/2026.
const DAYS = Array.from({ length: 7 }, (_, i) => new Date(2026, 8, 7 + i));

const SUMMARY: TimesheetSummary = {
  taskId: 20,
  taskName: 'Phỏng vấn người dùng',
  weekFrom: '2026-09-07',
  weekTo: '2026-09-13',
  entries: [
    {
      id: 30,
      taskId: 20,
      userId: 7,
      workDate: '2026-09-09',
      hours: 5,
      status: 'DRAFT',
      note: null,
      createdAt: '2026-09-09T17:00:00',
    },
    {
      id: 31,
      taskId: 20,
      userId: 7,
      workDate: '2026-09-10',
      hours: 3,
      status: 'DRAFT',
      note: 'Phỏng vấn nhóm B',
      createdAt: '2026-09-10T17:00:00',
    },
  ],
  totalHours: 8,
  budgetHours: 8,
  approvedHours: 0,
  usageRatio: 1,
  overBudgetWarning: true,
};

describe('WeeklyTimesheetGrid (NCL-06-CN-001/CN-002)', () => {
  it('hiển thị khung xương khi đang tải', () => {
    render(<WeeklyTimesheetGrid summaries={[]} days={DAYS} loading />);
    expect(screen.getByText(/Đang tải dữ liệu/i)).toBeInTheDocument();
  });

  it('hiển thị trạng thái trống khi tuần chưa có giờ công', () => {
    render(<WeeklyTimesheetGrid summaries={[]} days={DAYS} loading={false} />);
    expect(screen.getByText(/Chưa có giờ công nào trong tuần này/i)).toBeInTheDocument();
  });

  it('hiển thị đúng tên công việc, giờ theo ngày, tổng giờ và cảnh báo ngân sách', () => {
    render(<WeeklyTimesheetGrid summaries={[SUMMARY]} days={DAYS} loading={false} />);

    expect(screen.getByText('Phỏng vấn người dùng')).toBeInTheDocument();
    expect(screen.getAllByText('5').length).toBeGreaterThan(0);
    expect(screen.getAllByText('3').length).toBeGreaterThan(0);
    expect(screen.getAllByText('8 giờ').length).toBeGreaterThan(0);
    expect(screen.getByText(/Sắp\/đã vượt ngân sách/i)).toBeInTheDocument();
  });

  it('tính đúng tổng cộng theo ngày ở hàng chân bảng khi có nhiều công việc', () => {
    const secondTask: TimesheetSummary = {
      ...SUMMARY,
      taskId: 21,
      taskName: 'Viết tài liệu',
      budgetHours: null,
      overBudgetWarning: false,
      entries: [
        { ...SUMMARY.entries[0], id: 40, taskId: 21, workDate: '2026-09-09', hours: 2 },
      ],
      totalHours: 2,
    };

    render(<WeeklyTimesheetGrid summaries={[SUMMARY, secondTask]} days={DAYS} loading={false} />);

    // Ngày 09/09: 5 (task 20) + 2 (task 21) = 7 giờ tổng cộng.
    expect(screen.getByText('Tổng cộng theo ngày')).toBeInTheDocument();
    expect(screen.getByText('7')).toBeInTheDocument();
  });
});
