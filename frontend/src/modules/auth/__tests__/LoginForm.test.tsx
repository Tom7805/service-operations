import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import LoginForm from '../components/LoginForm';

const mockLogin = vi.fn();

vi.mock('../api/authApi', () => ({
  login: (...args: unknown[]) => mockLogin(...args),
  LoginRequestError: class LoginRequestError extends Error {
    constructor(
      public details: unknown,
      fallback: string
    ) {
      super(fallback);
    }
  },
}));

describe('LoginForm (NCL-01-CN-001, NCL-01-CN-008)', () => {
  beforeEach(() => {
    mockLogin.mockReset();
  });

  it('gọi onAuthenticated khi đăng nhập thành công', async () => {
    const session = { accessToken: 'tok', tokenType: 'Bearer', userId: 1, username: 'admin', fullName: 'Admin', roles: ['VT-07'] };
    mockLogin.mockResolvedValue(session);
    const onAuthenticated = vi.fn();

    render(<LoginForm onAuthenticated={onAuthenticated} />);

    fireEvent.change(screen.getByPlaceholderText('Nhập tên tài khoản'), { target: { value: 'admin' } });
    fireEvent.change(screen.getByPlaceholderText('Nhập mật khẩu'), { target: { value: 'Password@123' } });
    fireEvent.click(screen.getByRole('button', { name: /Đăng nhập/i }));

    await waitFor(() => expect(onAuthenticated).toHaveBeenCalledWith(session));
  });

  it('hiển thị thông báo lỗi khi thiếu tài khoản hoặc mật khẩu', () => {
    render(<LoginForm onAuthenticated={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /Đăng nhập/i }));
    expect(screen.getByRole('alert')).toHaveTextContent(/Vui lòng nhập đầy đủ/i);
    expect(mockLogin).not.toHaveBeenCalled();
  });

  it('gọi onForgotPassword khi bấm liên kết "Quên mật khẩu?"', () => {
    const onForgotPassword = vi.fn();
    render(<LoginForm onAuthenticated={vi.fn()} onForgotPassword={onForgotPassword} />);

    fireEvent.click(screen.getByText('Quên mật khẩu?'));

    expect(onForgotPassword).toHaveBeenCalledTimes(1);
  });
});
