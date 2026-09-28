import { describe, expect, it } from 'vitest';
import { addDays, getMondayOf, listWeekDates, weekdayLabel } from '../utils/weekRange';

describe('weekRange utils (NCL-06-CN-001)', () => {
  it('getMondayOf trả về đúng thứ Hai của tuần cho một ngày giữa tuần', () => {
    // Thứ Năm 10/09/2026
    expect(getMondayOf(new Date(2026, 8, 10))).toBe('2026-09-07');
  });

  it('getMondayOf trả về chính nó khi ngày truyền vào đã là thứ Hai', () => {
    expect(getMondayOf(new Date(2026, 8, 7))).toBe('2026-09-07');
  });

  it('getMondayOf lùi về đúng thứ Hai khi ngày truyền vào là Chủ nhật', () => {
    // Chủ nhật 13/09/2026 vẫn thuộc tuần bắt đầu 07/09/2026
    expect(getMondayOf(new Date(2026, 8, 13))).toBe('2026-09-07');
  });

  it('addDays cộng/trừ đúng số ngày, kể cả qua tháng', () => {
    expect(addDays('2026-09-07', 6)).toBe('2026-09-13');
    expect(addDays('2026-09-07', -7)).toBe('2026-08-31');
  });

  it('listWeekDates trả về đủ 7 ngày liên tiếp bắt đầu từ weekFrom', () => {
    expect(listWeekDates('2026-09-07')).toEqual([
      '2026-09-07',
      '2026-09-08',
      '2026-09-09',
      '2026-09-10',
      '2026-09-11',
      '2026-09-12',
      '2026-09-13',
    ]);
  });

  it('weekdayLabel gán đúng nhãn thứ trong tuần', () => {
    expect(weekdayLabel('2026-09-07')).toBe('Th 2');
    expect(weekdayLabel('2026-09-13')).toBe('CN');
  });
});
