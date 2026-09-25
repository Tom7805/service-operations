/**
 * Dựng chuỗi truy vấn từ một object, bỏ qua giá trị rỗng (`undefined`, `null`, chuỗi trắng).
 * Trả về chuỗi có dấu `?` ở đầu, hoặc chuỗi rỗng nếu không còn tham số nào.
 */
export function buildQueryString(params: Record<string, string | number | boolean | null | undefined>): string {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    const text = String(value).trim();
    if (text === '') return;
    search.append(key, text);
  });
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

export default buildQueryString;
