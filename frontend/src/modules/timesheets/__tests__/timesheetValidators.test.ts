import { describe, it, expect } from 'vitest';
import { canSubmitWeek, countDraftEntries, isWeekEmpty } from '../validators/timesheetValidators';
import type { TimesheetSummary } from '../types/timesheetTypes';

function summaryWith(entries: TimesheetSummary['entries']): TimesheetSummary {
  return {
    taskId: 1,
    taskName: 'Công việc mẫu',
    weekFrom: '2026-09-07',
    weekTo: '2026-09-13',
    entries,
    totalHours: entries.reduce((sum, e) => sum + e.hours, 0),
    budgetHours: null,
    approvedHours: null,
    usageRatio: null,
    overBudgetWarning: false,
  };
}

function entry(status: TimesheetSummary['entries'][number]['status'], hours = 4): TimesheetSummary['entries'][number] {
  return {
    id: Math.random(),
    taskId: 1,
    userId: 7,
    workDate: '2026-09-09',
    hours,
    status,
    note: null,
    createdAt: '2026-09-09T00:00:00',
  };
}

describe('canSubmitWeek (NCL-06-CN-002)', () => {
  it('tuần trống thì không bật nút nộp', () => {
    expect(canSubmitWeek([summaryWith([])])).toBe(false);
  });

  it('có ít nhất một dòng DRAFT thì bật nút nộp', () => {
    expect(canSubmitWeek([summaryWith([entry('DRAFT')])])).toBe(true);
  });

  it('toàn bộ dòng đã SUBMITTED thì không bật nút nộp (tránh gọi rồi mới nhận lỗi)', () => {
    expect(canSubmitWeek([summaryWith([entry('SUBMITTED')])])).toBe(false);
  });

  it('toàn bộ dòng đã APPROVED thì không bật nút nộp', () => {
    expect(canSubmitWeek([summaryWith([entry('APPROVED')])])).toBe(false);
  });

  it('nhiều công việc, chỉ cần một công việc có dòng DRAFT là đủ', () => {
    const summaries = [summaryWith([entry('SUBMITTED')]), summaryWith([entry('DRAFT')])];
    expect(canSubmitWeek(summaries)).toBe(true);
  });
});

describe('countDraftEntries', () => {
  it('đếm đúng số dòng DRAFT trên nhiều công việc', () => {
    const summaries = [
      summaryWith([entry('DRAFT'), entry('SUBMITTED')]),
      summaryWith([entry('DRAFT'), entry('DRAFT')]),
    ];
    expect(countDraftEntries(summaries)).toBe(3);
  });

  it('trả về 0 khi không có dòng nào', () => {
    expect(countDraftEntries([summaryWith([])])).toBe(0);
  });
});

describe('isWeekEmpty', () => {
  it('true khi mọi công việc đều chưa có dòng giờ công nào', () => {
    expect(isWeekEmpty([summaryWith([]), summaryWith([])])).toBe(true);
  });

  it('false khi có ít nhất một dòng giờ công', () => {
    expect(isWeekEmpty([summaryWith([]), summaryWith([entry('DRAFT')])])).toBe(false);
  });

  it('true khi không có công việc nào trong tuần', () => {
    expect(isWeekEmpty([])).toBe(true);
  });
});
