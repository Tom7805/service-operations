import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import Pagination, { visiblePages } from '../Pagination';

describe('Pagination', () => {
  it('rút gọn số trang: trang đầu, trang cuối, hai trang kề trang hiện tại và dấu "…"', () => {
    expect(visiblePages(0, 1)).toEqual([0]);
    expect(visiblePages(0, 3)).toEqual([0, 1, 2]);
    expect(visiblePages(5, 10)).toEqual([0, null, 4, 5, 6, null, 9]);
    expect(visiblePages(9, 10)).toEqual([0, null, 8, 9]);
  });

  it('hiển thị khoảng bản ghi đang xem và chuyển trang', () => {
    const onPageChange = vi.fn();
    render(
      <Pagination page={1} totalPages={3} totalElements={45} pageSize={20} itemLabel="hợp đồng" onPageChange={onPageChange} />
    );

    expect(screen.getByTestId('pagination-summary')).toHaveTextContent('Hiển thị 21–40 / 45 hợp đồng');
    expect(screen.getByRole('button', { name: 'Trang 2' })).toHaveAttribute('aria-current', 'page');

    fireEvent.click(screen.getByTestId('pagination-next'));
    expect(onPageChange).toHaveBeenLastCalledWith(2);
    fireEvent.click(screen.getByTestId('pagination-prev'));
    expect(onPageChange).toHaveBeenLastCalledWith(0);
    fireEvent.click(screen.getByTestId('pagination-page-3'));
    expect(onPageChange).toHaveBeenLastCalledWith(2);
  });

  it('khoá nút ở trang biên và khi đang tải; ẩn điều hướng khi chỉ có một trang', () => {
    const { rerender } = render(
      <Pagination page={0} totalPages={2} totalElements={30} pageSize={20} itemLabel="hóa đơn" onPageChange={vi.fn()} />
    );
    expect(screen.getByTestId('pagination-prev')).toBeDisabled();
    expect(screen.getByTestId('pagination-next')).toBeEnabled();

    rerender(
      <Pagination page={0} totalPages={2} totalElements={30} pageSize={20} itemLabel="hóa đơn" loading onPageChange={vi.fn()} />
    );
    expect(screen.getByTestId('pagination-next')).toBeDisabled();

    rerender(
      <Pagination page={0} totalPages={1} totalElements={5} pageSize={20} itemLabel="hóa đơn" onPageChange={vi.fn()} />
    );
    expect(screen.queryByTestId('pagination-next')).toBeNull();
    expect(screen.getByTestId('pagination-summary')).toHaveTextContent('1–5 / 5');
  });

  it('báo không có bản ghi khi danh sách rỗng', () => {
    render(<Pagination page={0} totalPages={0} totalElements={0} pageSize={20} itemLabel="dự án" onPageChange={vi.fn()} />);
    expect(screen.getByTestId('pagination-summary')).toHaveTextContent('Không có dự án nào');
  });
});
