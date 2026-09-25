import { useCallback, useEffect, useRef, useState } from 'react';
import { DEFAULT_PAGE_SIZE, type PageResult } from '../types/pagination';

interface ServerPagedListOptions<T, S, F> {
  /** Bộ lọc hiện tại. Đổi bộ lọc (so theo giá trị) thì tự quay về trang đầu. */
  filters: F;
  /** Gọi API lấy một trang. Có thể truyền hàm mới mỗi lần render — hook luôn dùng bản mới nhất. */
  fetchPage: (filters: F, page: number, size: number) => Promise<PageResult<T, S>>;
  pageSize?: number;
  /** `false` = không gọi API (vd người dùng không đủ quyền). */
  enabled?: boolean;
}

export interface ServerPagedList<T, S> {
  items: T[];
  summary: S | null;
  page: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
  /** Đang chờ phản hồi của trang/bộ lọc hiện tại (dữ liệu cũ vẫn giữ để bảng không nháy trắng). */
  isLoading: boolean;
  /** Đã nhận được ít nhất một phản hồi thành công. */
  hasLoaded: boolean;
  error: unknown;
  setPage: (page: number) => void;
  /** Tải lại trang hiện tại (vd sau khi tạo/sửa bản ghi, hoặc nút "Thử lại"). */
  reload: () => void;
  /** Cập nhật tại chỗ các dòng đang hiển thị (vd bản ghi vừa sửa) mà không gọi lại API. */
  updateItems: (updater: (items: T[]) => T[]) => void;
}

/**
 * Danh sách phân trang phía máy chủ: mỗi lần chỉ tải đúng một trang theo bộ lọc hiện tại.
 * Phản hồi về trễ của yêu cầu cũ (đổi bộ lọc/trang nhanh) bị bỏ qua, không đè dữ liệu mới.
 */
export function useServerPagedList<T, S = undefined, F = Record<string, unknown>>({
  filters,
  fetchPage,
  pageSize = DEFAULT_PAGE_SIZE,
  enabled = true,
}: ServerPagedListOptions<T, S, F>): ServerPagedList<T, S> {
  const filtersKey = JSON.stringify(filters);
  const [page, setPageState] = useState(0);
  const [pageFiltersKey, setPageFiltersKey] = useState(filtersKey);
  const [reloadToken, setReloadToken] = useState(0);
  const [result, setResult] = useState<PageResult<T, S> | null>(null);
  const [isLoading, setIsLoading] = useState(enabled);
  const [error, setError] = useState<unknown>(null);

  const fetchRef = useRef(fetchPage);
  fetchRef.current = fetchPage;
  const filtersRef = useRef(filters);
  filtersRef.current = filters;
  const requestIdRef = useRef(0);

  // Đổi bộ lọc → về trang đầu ngay trong lần render này (không bắn thêm một yêu cầu cho trang cũ).
  const effectivePage = pageFiltersKey === filtersKey ? page : 0;
  if (pageFiltersKey !== filtersKey) {
    setPageFiltersKey(filtersKey);
    setPageState(0);
  }

  useEffect(() => {
    if (!enabled) {
      setIsLoading(false);
      return;
    }
    const requestId = ++requestIdRef.current;
    setIsLoading(true);
    setError(null);
    fetchRef
      .current(filtersRef.current, effectivePage, pageSize)
      .then((next) => {
        if (requestId !== requestIdRef.current) return;
        // Trang đã quá số trang thật (vd vừa xoá/lọc bớt) → lùi về trang cuối còn dữ liệu.
        if (next.content.length === 0 && next.totalPages > 0 && effectivePage >= next.totalPages) {
          setPageState(next.totalPages - 1);
          return;
        }
        setResult(next);
        setIsLoading(false);
      })
      .catch((err: unknown) => {
        if (requestId !== requestIdRef.current) return;
        setError(err);
        setIsLoading(false);
      });
  }, [enabled, filtersKey, effectivePage, pageSize, reloadToken]);

  const setPage = useCallback((next: number) => setPageState(Math.max(0, next)), []);
  const reload = useCallback(() => setReloadToken((t) => t + 1), []);
  const updateItems = useCallback((updater: (items: T[]) => T[]) => {
    setResult((prev) => (prev ? { ...prev, content: updater(prev.content) } : prev));
  }, []);

  return {
    items: result?.content ?? [],
    summary: result?.summary ?? null,
    page: effectivePage,
    pageSize,
    totalElements: result?.totalElements ?? 0,
    totalPages: result?.totalPages ?? 0,
    isLoading,
    hasLoaded: result !== null,
    error,
    setPage,
    reload,
    updateItems,
  };
}

export default useServerPagedList;
