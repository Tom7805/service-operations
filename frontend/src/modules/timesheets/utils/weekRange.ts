/**
 * Tính khoảng tuần chấm công (thứ Hai → Chủ Nhật) — quy ước dùng chung cho lưới
 * `GET /me/time-entries` và path `{weekStartDate}` của `POST /me/timesheets/.../submit`
 * (NCL-06-CN-001/CN-002). Toàn bộ tính theo giờ địa phương của trình duyệt.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseIsoDate(iso: string): Date {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/** Ngày thứ Hai của tuần chứa `date` (Chủ Nhật tính là ngày cuối tuần trước đó). */
export function startOfWeek(date: Date): Date {
  const day = date.getDay(); // 0 = Chủ Nhật, 1 = Thứ Hai, ...
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate() + diffToMonday);
  return monday;
}

export interface WeekRange {
  /** Thứ Hai, ISO `yyyy-MM-dd`. */
  weekFrom: string;
  /** Chủ Nhật, ISO `yyyy-MM-dd`. */
  weekTo: string;
  /** 7 ngày liên tiếp trong tuần, thứ Hai → Chủ Nhật. */
  days: Date[];
}

export function weekRangeOf(date: Date): WeekRange {
  const monday = startOfWeek(date);
  const days = Array.from({ length: 7 }, (_, i) => new Date(monday.getTime() + i * DAY_MS));
  return {
    weekFrom: toIsoDate(monday),
    weekTo: toIsoDate(days[6]),
    days,
  };
}

/** Tuần liền trước/sau tuần đang chứa `date` (dời đúng 7 ngày). */
export function shiftWeek(date: Date, weeks: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + weeks * 7);
}

export function formatIsoDate(date: Date): string {
  return toIsoDate(date);
}

export function parseIso(iso: string): Date {
  return parseIsoDate(iso);
}

/** Hiển thị ngắn gọn kiểu "Th 2, 07/09". */
export function formatDayLabel(date: Date): string {
  const weekdays = ['CN', 'Th 2', 'Th 3', 'Th 4', 'Th 5', 'Th 6', 'Th 7'];
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${weekdays[date.getDay()]}, ${day}/${month}`;
}

/** Hiển thị khoảng tuần kiểu "07/09/2026 – 13/09/2026". */
export function formatWeekRangeLabel(weekFrom: string, weekTo: string): string {
  const format = (iso: string) => {
    const d = parseIsoDate(iso);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${day}/${month}/${d.getFullYear()}`;
  };
  return `${format(weekFrom)} – ${format(weekTo)}`;
}

/** So sánh xem tuần chứa `date` có phải tuần hiện tại (theo máy người dùng) hay không. */
export function isCurrentWeek(weekFrom: string): boolean {
  return weekFrom === weekRangeOf(new Date()).weekFrom;
}
