import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import App from './App';

describe('App project navigation', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem(
      'session',
      JSON.stringify({
        userId: 8,
        username: 'pm01',
        fullName: 'Nguyễn Quản Lý',
        roles: ['VT-02'],
        accessToken: 'token-123',
      })
    );
    localStorage.setItem('token', 'token-123');
  });

  it('hiển thị mục Dự án cho Quản lý dự án để mở giao việc cho nhân sự', () => {
    render(<App />);

    expect(screen.getByRole('button', { name: /Dự án/i })).toBeInTheDocument();
  });
});
