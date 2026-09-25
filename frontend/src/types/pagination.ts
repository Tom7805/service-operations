/**
 * Một trang kết quả của danh sách phân trang phía máy chủ (khớp `PageRes<T, S>` ở backend).
 * `summary` là số liệu tổng hợp trên TOÀN BỘ phạm vi dữ liệu của người xem — không phụ thuộc
 * trang hay bộ lọc (thẻ thống kê, giá trị cho các ô lọc); `null`/không có nếu API không trả.
 */
export interface PageResult<T, S = undefined> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  summary?: S | null;
}

/** Số dòng mặc định mỗi trang của các danh sách nghiệp vụ. */
export const DEFAULT_PAGE_SIZE = 20;
