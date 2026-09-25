import { useEffect, useRef, useState } from 'react';
import { useDebounce } from './useDebounce';

interface RemoteOptionsConfig<T> {
  /** Từ khoá người dùng đang gõ (chưa debounce). */
  keyword: string;
  /** Gọi máy chủ lấy các lựa chọn khớp từ khoá (đã giới hạn số lượng ở phía gọi). */
  fetchOptions: (keyword: string) => Promise<T[]>;
  /** `false` = không gọi API (vd chưa đủ quyền, modal đang đóng). */
  enabled?: boolean;
  /** Số ký tự tối thiểu trước khi tìm; dưới ngưỡng này trả danh sách rỗng mà không gọi API. */
  minLength?: number;
  delay?: number;
}

export interface RemoteOptions<T> {
  options: T[];
  isLoading: boolean;
  /** Đã nhận được ít nhất một phản hồi thành công. */
  hasLoaded: boolean;
  error: unknown;
  /** Từ khoá (đã debounce) ứng với `options` hiện tại. */
  keyword: string;
}

/**
 * Lựa chọn cho ô chọn có tìm kiếm, lấy từ máy chủ theo từ khoá: chờ người dùng ngừng gõ
 * (300ms) mới gọi, bỏ qua phản hồi về trễ của từ khoá cũ. Thay cho việc nạp TOÀN BỘ danh
 * mục (khách hàng, hợp đồng, cơ hội...) về trình duyệt chỉ để lọc tại chỗ.
 */
export function useRemoteOptions<T>({
  keyword,
  fetchOptions,
  enabled = true,
  minLength = 0,
  delay = 300,
}: RemoteOptionsConfig<T>): RemoteOptions<T> {
  const debounced = useDebounce(keyword.trim(), delay);
  const [options, setOptions] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const fetchRef = useRef(fetchOptions);
  fetchRef.current = fetchOptions;
  const requestIdRef = useRef(0);

  useEffect(() => {
    const requestId = ++requestIdRef.current;
    if (!enabled || debounced.length < minLength) {
      setOptions([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    fetchRef
      .current(debounced)
      .then((next) => {
        if (requestId !== requestIdRef.current) return;
        setOptions(next);
        setHasLoaded(true);
      })
      .catch((err: unknown) => {
        if (requestId !== requestIdRef.current) return;
        setOptions([]);
        setError(err);
      })
      .finally(() => {
        if (requestId === requestIdRef.current) setIsLoading(false);
      });
  }, [debounced, enabled, minLength]);

  return { options, isLoading, hasLoaded, error, keyword: debounced };
}

export default useRemoteOptions;
