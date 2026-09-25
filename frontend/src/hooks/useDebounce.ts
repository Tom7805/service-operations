import { useEffect, useState } from 'react';

/**
 * Trả về `value` sau khi nó đứng yên `delay` ms — dùng cho ô tìm kiếm/bộ lọc gọi API,
 * để gõ phím liên tục không bắn một request cho mỗi ký tự.
 */
export function useDebounce<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

export default useDebounce;
