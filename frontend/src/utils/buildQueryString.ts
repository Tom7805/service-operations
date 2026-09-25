type QueryValue = string | number | boolean | null | undefined;

/**
 * Dựng chuỗi truy vấn từ một object, bỏ qua giá trị rỗng (`undefined`, `null`, chuỗi trắng).
 * Giá trị mảng được lặp lại theo khoá (`ids=1&ids=2`) — khớp cách Spring đọc `List<...>`.
 * Trả về chuỗi có dấu `?` ở đầu, hoặc chuỗi rỗng nếu không còn tham số nào.
 */
export function buildQueryString(params: Record<string, QueryValue | QueryValue[]>): string {
  const search = new URLSearchParams();
  const append = (key: string, value: QueryValue) => {
    if (value === undefined || value === null) return;
    const text = String(value).trim();
    if (text === '') return;
    search.append(key, text);
  };
  Object.entries(params).forEach(([key, value]) => {
    if (Array.isArray(value)) value.forEach((v) => append(key, v));
    else append(key, value);
  });
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

export default buildQueryString;
