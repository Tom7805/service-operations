import { describe, it, expect } from 'vitest';
import { formatWeekRangeLabel, isCurrentWeek, shiftWeek, weekRangeOf } from '../weekRange';

describe('weekRangeOf (NCL-06-CN-001/CN-002)', () => {
  it('trả về đúng thứ Hai -> Chủ Nhật khi chọn ngày giữa tuần', () => {
    // Thứ Tư 09/09/2026.
    const range = weekRangeOf(new Date(2026, 8, 9));
    expect(range.weekFrom).toBe('2026-09-07');
    expect(range.weekTo).toBe('2026-09-13');
    expect(range.days).toHaveLength(7);
  });

  it('Chủ Nhật vẫn thuộc tuần bắt đầu từ thứ Hai trước đó (không lệch sang tuần sau)', () => {
    // Chủ Nhật 13/09/2026.
    const range = weekRangeOf(new Date(2026, 8, 13));
    expect(range.weekFrom).toBe('2026-09-07');
    expect(range.weekTo).toBe('2026-09-13');
  });

  it('chọn đúng thứ Hai thì tuần giữ nguyên', () => {
    const range = weekRangeOf(new Date(2026, 8, 7));
    expect(range.weekFrom).toBe('2026-09-07');
  });
});

describe('shiftWeek', () => {
  it('lùi một tuần thì trừ đúng 7 ngày', () => {
    const previous = shiftWeek(new Date(2026, 8, 9), -1);
    expect(weekRangeOf(previous).weekFrom).toBe('2026-08-31');
  });

  it('tiến một tuần thì cộng đúng 7 ngày', () => {
    const next = shiftWeek(new Date(2026, 8, 9), 1);
    expect(weekRangeOf(next).weekFrom).toBe('2026-09-14');
  });
});

describe('formatWeekRangeLabel', () => {
  it('định dạng dd/mm/yyyy cho cả hai đầu tuần', () => {
    expect(formatWeekRangeLabel('2026-09-07', '2026-09-13')).toBe('07/09/2026 – 13/09/2026');
  });
});

describe('isCurrentWeek', () => {
  it('nhận diện đúng tuần chứa ngày hôm nay', () => {
    expect(isCurrentWeek(weekRangeOf(new Date()).weekFrom)).toBe(true);
  });

  it('trả về false với một tuần trong quá khứ', () => {
    expect(isCurrentWeek('2000-01-03')).toBe(false);
  });
});
