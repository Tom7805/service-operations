import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
vi.mock('../../modules/notifications/api/notificationsApi', () => ({
  getNotifications: vi.fn().mockResolvedValue([]), getUnreadCount: vi.fn().mockResolvedValue(0), markNotificationsRead: vi.fn(),
}));
vi.mock('../../modules/projects/api/projectsApi', () => ({ getAllProjects: vi.fn().mockResolvedValue([]) }));
vi.mock('../../modules/auth/api/authApi', async (orig) => ({ ...(await orig<object>()), fetchCurrentUser: vi.fn().mockResolvedValue({ userId: 1, username: 'a', fullName: 'Nguyen Van A', roles: ['VT-01'] }) }));
import App from '../../App';

describe('Khung ứng dụng — ngăn kéo điều hướng trên màn hẹp', () => {
  it('mở, giữ focus bên trong, Esc đóng và trả focus, điều hướng thì đóng', async () => {
    window.matchMedia = ((q: string) => ({ matches: true, media: q, addEventListener() {}, removeEventListener() {} })) as never;
    localStorage.setItem('session', JSON.stringify({ accessToken: 't', tokenType: 'Bearer', userId: 1, username: 'a', fullName: 'Nguyen Van A', roles: ['VT-01'] }));
    render(<App />);
    const btn = screen.getByRole('button', { name: 'Mở menu điều hướng' });
    fireEvent.click(btn);
    const dialog = screen.getByRole('dialog', { name: 'Điều hướng' });
    expect(dialog.contains(document.activeElement)).toBe(true);
    expect(document.documentElement.classList.contains('shell-nav-locked')).toBe(true);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog', { name: 'Điều hướng' })).toBeNull();
    expect(document.activeElement).toBe(btn);
    expect(document.documentElement.classList.contains('shell-nav-locked')).toBe(false);
    fireEvent.click(btn);
    const items = screen.getByRole('dialog').querySelectorAll('.side-nav__item');
    fireEvent.click(items[items.length - 1]);
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Điều hướng' })).toBeNull());
  });
});
