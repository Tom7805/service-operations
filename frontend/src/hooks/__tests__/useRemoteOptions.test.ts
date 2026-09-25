import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useRemoteOptions } from '../useRemoteOptions';

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => (resolve = r));
  return { promise, resolve };
}

describe('useRemoteOptions', () => {
  it('gọi máy chủ với từ khoá đã cắt khoảng trắng sau khi ngừng gõ', async () => {
    const fetchOptions = vi.fn(async (keyword: string) => [`${keyword}-1`]);
    const { result, rerender } = renderHook(({ keyword }) => useRemoteOptions({ keyword, fetchOptions, delay: 10 }), {
      initialProps: { keyword: '' },
    });
    await waitFor(() => expect(result.current.hasLoaded).toBe(true));
    expect(fetchOptions).toHaveBeenLastCalledWith('');

    rerender({ keyword: '  abc ' });
    await waitFor(() => expect(result.current.options).toEqual(['abc-1']));
    expect(result.current.keyword).toBe('abc');
  });

  it('bỏ qua phản hồi về trễ của từ khoá cũ', async () => {
    const slow = deferred<string[]>();
    const fetchOptions = vi.fn((keyword: string) => (keyword === 'cu' ? slow.promise : Promise.resolve(['moi'])));
    const { result, rerender } = renderHook(({ keyword }) => useRemoteOptions({ keyword, fetchOptions, delay: 0 }), {
      initialProps: { keyword: 'cu' },
    });
    await waitFor(() => expect(fetchOptions).toHaveBeenCalledWith('cu'));

    rerender({ keyword: 'moi' });
    await waitFor(() => expect(result.current.options).toEqual(['moi']));
    await act(async () => slow.resolve(['cu']));
    expect(result.current.options).toEqual(['moi']);
  });

  it('không gọi API khi chưa bật hoặc từ khoá ngắn hơn ngưỡng; lỗi được trả ra', async () => {
    const fetchOptions = vi.fn().mockRejectedValue(new Error('403'));
    const { result, rerender } = renderHook(
      ({ enabled, keyword }) => useRemoteOptions({ keyword, fetchOptions, enabled, minLength: 2, delay: 0 }),
      { initialProps: { enabled: false, keyword: 'a' } }
    );
    await act(async () => undefined);
    expect(fetchOptions).not.toHaveBeenCalled();

    // Đã bật nhưng từ khoá vẫn dưới ngưỡng 2 ký tự → chưa gọi.
    rerender({ enabled: true, keyword: 'a' });
    await act(async () => undefined);
    expect(fetchOptions).not.toHaveBeenCalled();

    rerender({ enabled: true, keyword: 'ab' });
    await waitFor(() => expect(result.current.error).toBeInstanceOf(Error));
    expect(result.current.options).toEqual([]);
  });
});
