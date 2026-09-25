import { describe, expect, it } from 'vitest';
import { buildQueryString } from '../buildQueryString';

describe('buildQueryString', () => {
  it('bỏ qua giá trị rỗng và trả chuỗi rỗng khi không còn tham số', () => {
    expect(buildQueryString({ keyword: '  ', stage: undefined, id: null })).toBe('');
    expect(buildQueryString({})).toBe('');
  });

  it('giữ số 0 và false, cắt khoảng trắng, mã hoá ký tự đặc biệt', () => {
    expect(buildQueryString({ page: 0, includeSummary: false, keyword: ' Công ty & Co ' })).toBe(
      '?page=0&includeSummary=false&keyword=C%C3%B4ng+ty+%26+Co'
    );
  });

  it('lặp lại khoá cho giá trị mảng (khớp List<...> của Spring)', () => {
    expect(buildQueryString({ ids: [7, 9], size: 2 })).toBe('?ids=7&ids=9&size=2');
    expect(buildQueryString({ ids: [] })).toBe('');
  });
});
