/**
 * Hôm nay theo giờ MÁY người dùng, dạng `yyyy-MM-dd` — dùng làm giá trị mặc định cho ô `<input type="date">`.
 *
 * Đừng dùng `new Date().toISOString().slice(0, 10)`: chuỗi ISO tính theo giờ UTC, nên ở Việt Nam (UTC+7) từ 0h
 * đến 7h sáng nó ra ngày HÔM QUA (vd dự án tạo lúc 6h sáng 28/9 bị điền sẵn ngày bắt đầu 27/9).
 */
export function todayLocalIso(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
