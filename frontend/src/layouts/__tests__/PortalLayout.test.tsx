import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PortalLayout from '../PortalLayout';

function renderLayout(onLogout = vi.fn(), onChangePassword = vi.fn()) {
  const onSelectInvoices = vi.fn();
  render(
    <PortalLayout
      fullName="Nguyễn Thị Nhi"
      username="khachhang01"
      navItems={[
        { key: 'projects', label: 'Dự án', icon: <span />, active: true, onSelect: vi.fn() },
        { key: 'acceptances', label: 'Nghiệm thu', icon: <span />, active: false, badge: 2, onSelect: vi.fn() },
        { key: 'invoices', label: 'Hóa đơn', icon: <span />, active: false, onSelect: onSelectInvoices },
      ]}
      onChangePassword={onChangePassword}
      onLogout={onLogout}
    >
      <p>Nội dung trang</p>
    </PortalLayout>
  );
  return { onSelectInvoices };
}

describe('PortalLayout — cùng khung thanh bên với giao diện nội bộ', () => {
  beforeEach(() => localStorage.clear());

  it('hiện các mục cổng trên thanh bên, đánh dấu mục đang mở và số phiếu chờ', () => {
    const { onSelectInvoices } = renderLayout();

    expect(screen.getByTestId('portal-shell')).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Điều hướng cổng khách hàng' })).toBeInTheDocument();
    expect(screen.getByTestId('portal-nav-projects')).toHaveAttribute('aria-current', 'page');
    expect(screen.getByTestId('portal-nav-badge-acceptances')).toHaveTextContent('2');
    expect(screen.getByText('Nội dung trang')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('portal-nav-invoices'));
    expect(onSelectInvoices).toHaveBeenCalled();
  });

  it('thu gọn thanh bên (nút hoặc Ctrl B): ẩn nhãn, giữ số phiếu chờ, nhớ lựa chọn', () => {
    renderLayout();
    fireEvent.click(screen.getByRole('button', { name: 'Thu gọn thanh điều hướng' }));

    expect(screen.queryByText('Nghiệm thu')).not.toBeInTheDocument();
    expect(screen.getByTestId('portal-nav-acceptances')).toHaveAttribute('title', 'Nghiệm thu');
    expect(screen.getByTestId('portal-nav-badge-acceptances')).toHaveTextContent('2');
    expect(localStorage.getItem('portal.sidebarCollapsed')).toBe('1');

    fireEvent.keyDown(document, { key: 'b', ctrlKey: true });
    expect(screen.getByText('Nghiệm thu')).toBeInTheDocument();
    expect(localStorage.getItem('portal.sidebarCollapsed')).toBe('0');
  });

  it('khối tài khoản ở chân thanh bên: đổi mật khẩu và đăng xuất', () => {
    const onLogout = vi.fn();
    const onChangePassword = vi.fn();
    renderLayout(onLogout, onChangePassword);

    fireEvent.click(screen.getByTestId('portal-user-menu'));
    expect(screen.getByRole('menu')).toHaveTextContent('@khachhang01');
    fireEvent.click(screen.getByRole('menuitem', { name: /Đổi mật khẩu/ }));
    expect(onChangePassword).toHaveBeenCalled();

    fireEvent.click(screen.getByTestId('portal-user-menu'));
    fireEvent.click(screen.getByTestId('portal-logout'));
    expect(onLogout).toHaveBeenCalled();
  });
});
