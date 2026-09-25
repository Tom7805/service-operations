import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useServerPagedList } from '../usePagination';
import type { PageResult } from '../../types/pagination';

type Filters = { keyword: string };

function page(items: string[], pageNo = 0, totalPages = 1, total = items.length): PageResult<string, { total: number }> {
  return { content: items, page: pageNo, size: 20, totalElements: total, totalPages, summary: { total } };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => (resolve = r));
  return { promise, resolve };
}

describe('useServerPagedList', () => {
  it('tải trang đầu, chuyển trang và trả số liệu tổng hợp', async () => {
    const fetchPage = vi.fn(async (_f: Filters, p: number) => page([`item-${p}`], p, 3, 45));
    const { result } = renderHook(() => useServerPagedList({ filters: { keyword: '' }, fetchPage }));

    await waitFor(() => expect(result.current.items).toEqual(['item-0']));
    expect(result.current.summary).toEqual({ total: 45 });
    expect(result.current.totalPages).toBe(3);

    act(() => result.current.setPage(2));
    await waitFor(() => expect(result.current.items).toEqual(['item-2']));
    expect(fetchPage).toHaveBeenLastCalledWith({ keyword: '' }, 2, 20);
  });

  it('đổi bộ lọc thì về trang đầu, chỉ bắn đúng một yêu cầu', async () => {
    const fetchPage = vi.fn(async (f: Filters, p: number) => page([`${f.keyword}-${p}`], p, 3));
    const { result, rerender } = renderHook(({ filters }) => useServerPagedList({ filters, fetchPage }), {
      initialProps: { filters: { keyword: 'a' } },
    });
    await waitFor(() => expect(result.current.items).toEqual(['a-0']));
    act(() => result.current.setPage(1));
    await waitFor(() => expect(result.current.items).toEqual(['a-1']));

    fetchPage.mockClear();
    rerender({ filters: { keyword: 'b' } });

    await waitFor(() => expect(result.current.items).toEqual(['b-0']));
    expect(result.current.page).toBe(0);
    expect(fetchPage).toHaveBeenCalledTimes(1);
    expect(fetchPage).toHaveBeenCalledWith({ keyword: 'b' }, 0, 20);
  });

  it('bỏ qua phản hồi về trễ của yêu cầu cũ', async () => {
    const slow = deferred<PageResult<string, { total: number }>>();
    const fetchPage = vi.fn((f: Filters) => (f.keyword === 'cu' ? slow.promise : Promise.resolve(page(['moi']))));
    const { result, rerender } = renderHook(({ filters }) => useServerPagedList({ filters, fetchPage }), {
      initialProps: { filters: { keyword: 'cu' } },
    });

    rerender({ filters: { keyword: 'moi' } });
    await waitFor(() => expect(result.current.items).toEqual(['moi']));

    await act(async () => slow.resolve(page(['cu'])));
    expect(result.current.items).toEqual(['moi']);
  });

  it('không gọi API khi enabled = false; lỗi được trả ra và reload thử lại được', async () => {
    const fetchPage = vi.fn().mockRejectedValueOnce(new Error('mat ket noi')).mockResolvedValue(page(['ok']));
    const { result, rerender } = renderHook(
      ({ enabled }) => useServerPagedList({ filters: { keyword: '' }, fetchPage, enabled }),
      { initialProps: { enabled: false } }
    );
    expect(fetchPage).not.toHaveBeenCalled();
    expect(result.current.isLoading).toBe(false);

    rerender({ enabled: true });
    await waitFor(() => expect(result.current.error).toBeInstanceOf(Error));

    act(() => result.current.reload());
    await waitFor(() => expect(result.current.items).toEqual(['ok']));
    expect(result.current.error).toBeNull();
  });

  it('trang vượt quá số trang thật (vd vừa lọc bớt) thì lùi về trang cuối còn dữ liệu', async () => {
    const fetchPage = vi.fn(async (_f: Filters, p: number) =>
      p >= 2 ? { ...page([], p, 2, 30) } : page([`item-${p}`], p, 2, 30)
    );
    const { result } = renderHook(() => useServerPagedList({ filters: { keyword: '' }, fetchPage }));
    await waitFor(() => expect(result.current.items).toEqual(['item-0']));

    act(() => result.current.setPage(4));
    await waitFor(() => expect(result.current.items).toEqual(['item-1']));
    expect(result.current.page).toBe(1);
  });

  it('updateItems sửa tại chỗ các dòng đang hiển thị mà không gọi lại API', async () => {
    const fetchPage = vi.fn(async () => page(['a', 'b']));
    const { result } = renderHook(() => useServerPagedList({ filters: { keyword: '' }, fetchPage }));
    await waitFor(() => expect(result.current.items).toEqual(['a', 'b']));

    act(() => result.current.updateItems((items) => items.map((i) => (i === 'b' ? 'B' : i))));
    expect(result.current.items).toEqual(['a', 'B']);
    expect(fetchPage).toHaveBeenCalledTimes(1);
  });
});
