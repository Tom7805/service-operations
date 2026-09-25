import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
vi.mock('../../modules/notifications/api/notificationsApi', () => ({
  getNotifications: vi.fn().mockResolvedValue([]), getUnreadCount: vi.fn().mockResolvedValue(3), markNotificationsRead: vi.fn(),
}));
vi.mock('../../modules/projects/api/projectsApi', () => ({ getAllProjects: vi.fn().mockResolvedValue([]) }));
vi.mock('../../modules/auth/api/authApi', async (orig) => ({ ...(await orig<object>()), fetchCurrentUser: vi.fn().mockResolvedValue({ userId: 1, username: 'a', fullName: 'Nguyen Van A', roles: ['VT-01'] }) }));
import App from '../../App';

describe('Khung ứng dụng — bàn phím & tiêu đề', () => {
  it('menu tài khoản, chuông, bảng lệnh dùng được bằng bàn phím; tiêu đề theo trang', async () => {
    localStorage.setItem('session', JSON.stringify({ accessToken: 't', tokenType: 'Bearer', userId: 1, username: 'a', fullName: 'Nguyen Van A', roles: ['VT-01'] }));
    render(<App />);
    await waitFor(() => expect(screen.getByTestId('notif-unread-badge').textContent).toBe('3'));
    expect(document.title).toContain('Vận hành dịch vụ');
    const trigger = screen.getByRole('button', { name: /Tài khoản: Nguyen/ });
    fireEvent.click(trigger);
    const items = screen.getAllByRole('menuitem');
    expect(document.activeElement).toBe(items[0]);
    fireEvent.keyDown(items[0], { key: 'ArrowDown' });
    expect(document.activeElement).toBe(items[1]);
    fireEvent.keyDown(document.activeElement!, { key: 'Escape' });
    expect(screen.queryByRole('menu')).toBeNull();
    expect(document.activeElement).toBe(trigger);
    const bell = screen.getByTestId('btn-notif-bell');
    fireEvent.click(bell);
    expect(screen.getByTestId('notif-panel')).toBeTruthy();
    fireEvent.keyDown(document.activeElement!, { key: 'Escape' });
    expect(screen.queryByTestId('notif-panel')).toBeNull();
    expect(document.activeElement).toBe(bell);
    // palette
    act(() => { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true })); });
    const input = screen.getByRole('combobox');
    fireEvent.change(input, { target: { value: 'doi mat khau' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    await waitFor(() => expect(document.title).toBe('Đổi mật khẩu · Vận hành dịch vụ'));
    await waitFor(() => expect(document.activeElement?.tagName).toMatch(/H1|H2|MAIN/), { timeout: 5000 });
  });
});
