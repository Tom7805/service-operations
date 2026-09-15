/**
 * Tiện ích tính tuần chấm công (thứ Hai → Chủ nhật) dùng chung cho `TimeEntryPage` và
 * `MyTimesheetPage` (NCL-06-CN-001) — khớp khoảng `weekFrom`/`weekTo` 7 ngày liên tiếp mà
 * `GET /me/time-entries` và `POST /me/timesheets/{weekStartDate}/submit` (NCL-06-CN-002)
 * cùng dùng.
 */

function toIsoDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseIsoDate(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, (month ?? 1) - 1, day ?? 1);
}

/** Ngày thứ Hai của tuần chứa `date` (mặc định hôm nay). */
export function getMondayOf(date: Date = new Date()): string {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = d.getDay(); // 0 = Chủ nhật, 1 = Thứ Hai, ...
  const diffToMonday = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diffToMonday);
  return toIsoDate(d);
}

/** Cộng thêm `days` ngày vào một ngày dạng `YYYY-MM-DD`. */
export function addDays(isoDate: string, days: number): string {
  const d = parseIsoDate(isoDate);
  d.setDate(d.getDate() + days);
  return toIsoDate(d);
}

/** Danh sách 7 ngày (dạng `YYYY-MM-DD`) từ `weekFrom` đến `weekFrom + 6`. */
export function listWeekDates(weekFrom: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDays(weekFrom, i));
}

const WEEKDAY_LABELS = ['CN', 'Th 2', 'Th 3', 'Th 4', 'Th 5', 'Th 6', 'Th 7'];

/** Nhãn ngắn thứ trong tuần (Th 2 … Th 7, CN) cho một ngày `YYYY-MM-DD`. */
export function weekdayLabel(isoDate: string): string {
  return WEEKDAY_LABELS[parseIsoDate(isoDate).getDay()];
}

/** Định dạng ngày `YYYY-MM-DD` sang `dd/MM/yyyy` để hiển thị. */
export function formatIsoDate(isoDate: string): string {
  const d = parseIsoDate(isoDate);
  if (Number.isNaN(d.getTime())) return isoDate;
  return d.toLocaleDateString('vi-VN');
}
