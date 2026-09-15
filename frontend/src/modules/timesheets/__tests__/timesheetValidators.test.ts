import { describe, expect, it } from 'vitest';
import {
  canSubmitWeek,
  countDraftEntries,
  isWeekEmpty,
  validateTimeEntryCreateForm,
  validateTimeEntryUpdateForm,
} from '../validators/timesheetValidators';
import type { TimesheetSummaryRes } from '../types/timesheetTypes';

const TODAY = '2026-09-10';

describe('timesheetValidators (NCL-06-CN-001)', () => {
  describe('validateTimeEntryCreateForm', () => {
    it('returns error when workDate is empty', () => {
      const res = validateTimeEntryCreateForm({ workDate: '', hours: 3, note: 'Ghi chú' }, TODAY);
      expect(res.isValid).toBe(false);
      expect(res.errors.workDate).toContain('Ngày làm việc không được để trống');
    });

    it('returns error when workDate is in the future', () => {
      const res = validateTimeEntryCreateForm(
        { workDate: '2026-09-11', hours: 3, note: 'Ghi chú' },
        TODAY
      );
      expect(res.isValid).toBe(false);
      expect(res.errors.workDate).toContain('Ngày làm việc không được ở tương lai');
    });

    it('passes when workDate is today', () => {
      const res = validateTimeEntryCreateForm({ workDate: TODAY, hours: 3, note: 'Ghi chú' }, TODAY);
      expect(res.errors.workDate).toBeUndefined();
    });

    it('returns error when hours is missing, NaN or not greater than 0', () => {
      const resMissing = validateTimeEntryCreateForm({ workDate: TODAY, note: 'Ghi chú' }, TODAY);
      expect(resMissing.isValid).toBe(false);
      expect(resMissing.errors.hours).toContain('Số giờ công không được để trống');

      const resZero = validateTimeEntryCreateForm({ workDate: TODAY, hours: 0, note: 'Ghi chú' }, TODAY);
      expect(resZero.isValid).toBe(false);
      expect(resZero.errors.hours).toContain('Số giờ công phải lớn hơn 0');

      const resNegative = validateTimeEntryCreateForm({ workDate: TODAY, hours: -2, note: 'Ghi chú' }, TODAY);
      expect(resNegative.isValid).toBe(false);
      expect(resNegative.errors.hours).toContain('Số giờ công phải lớn hơn 0');
    });

    it('returns error when note is empty or exceeds 1000 characters', () => {
      const resEmpty = validateTimeEntryCreateForm({ workDate: TODAY, hours: 3, note: '   ' }, TODAY);
      expect(resEmpty.isValid).toBe(false);
      expect(resEmpty.errors.note).toContain('Ghi chú không được để trống');

      const resTooLong = validateTimeEntryCreateForm(
        { workDate: TODAY, hours: 3, note: 'a'.repeat(1001) },
        TODAY
      );
      expect(resTooLong.isValid).toBe(false);
      expect(resTooLong.errors.note).toContain('không được vượt 1000 ký tự');
    });

    it('returns no errors for a valid payload', () => {
      const res = validateTimeEntryCreateForm(
        { workDate: TODAY, hours: 3.5, note: 'Phân tích quy trình hiện tại', billable: true },
        TODAY
      );
      expect(res.isValid).toBe(true);
      expect(Object.keys(res.errors)).toHaveLength(0);
    });
  });

  describe('validateTimeEntryUpdateForm', () => {
    it('returns error when hours is missing or not greater than 0', () => {
      const resMissing = validateTimeEntryUpdateForm({ note: 'Ghi chú' });
      expect(resMissing.isValid).toBe(false);
      expect(resMissing.errors.hours).toContain('Số giờ công không được để trống');

      const resZero = validateTimeEntryUpdateForm({ hours: 0, note: 'Ghi chú' });
      expect(resZero.isValid).toBe(false);
      expect(resZero.errors.hours).toContain('Số giờ công phải lớn hơn 0');
    });

    it('returns error when note is empty or exceeds 1000 characters', () => {
      const resEmpty = validateTimeEntryUpdateForm({ hours: 4, note: '' });
      expect(resEmpty.isValid).toBe(false);
      expect(resEmpty.errors.note).toContain('Ghi chú không được để trống');

      const resTooLong = validateTimeEntryUpdateForm({ hours: 4, note: 'a'.repeat(1001) });
      expect(resTooLong.isValid).toBe(false);
      expect(resTooLong.errors.note).toContain('không được vượt 1000 ký tự');
    });

    it('returns no errors for a valid payload', () => {
      const res = validateTimeEntryUpdateForm({ hours: 4, note: 'Đã chỉnh sửa sau khi soát lại', billable: false });
      expect(res.isValid).toBe(true);
      expect(Object.keys(res.errors)).toHaveLength(0);
    });
  });
});

function summaryWith(entries: TimesheetSummaryRes['entries']): TimesheetSummaryRes {
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

function entry(
  status: TimesheetSummaryRes['entries'][number]['status'],
  hours = 4
): TimesheetSummaryRes['entries'][number] {
  return {
    id: Math.random(),
    taskId: 1,
    userId: 7,
    workDate: '2026-09-09',
    hours,
    status,
    note: null,
    billable: true,
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
