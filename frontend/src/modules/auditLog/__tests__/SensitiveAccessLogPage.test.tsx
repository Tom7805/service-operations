import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import SensitiveAccessLogPage from '../pages/SensitiveAccessLogPage';
import type { SensitiveAccessLogPage as SensitiveAccessLogPageResult } from '../types/auditLogTypes';

const mockSearchLogs = vi.fn();

vi.mock('../api/auditLogApi', () => ({
  searchSensitiveAccessLogs: (...args: unknown[]) => mockSearchLogs(...args),
  AuditLogApiError: class AuditLogApiError extends Error {
    constructor(
      public code: string,
      message: string
    ) {
      super(message);
    }
  },
}));

const samplePage: SensitiveAccessLogPageResult = {
  content: [
    {
      id: 12,
      userId: 1,
      username: 'admin',
      action: 'EXPORT',
      dataType: 'MARGIN',
      targetId: 5,
      targetRef: 'DuAn/5',
      ipAddress: '203.0.113.25',
      detail: 'Xuat bao cao bien loi nhuan',
      accessedAt: '2026-08-20T16:44:42',
    },
  ],
  page: 0,
  size: 20,
  totalElements: 1,
  totalPages: 1,
};

const emptyPage: SensitiveAccessLogPageResult = {
  content: [],
  page: 0,
  size: 20,
  totalElements: 0,
  totalPages: 0,
};

describe('SensitiveAccessLogPage — Acceptance Criteria Tests (NCL-01-CN-006)', () => {
  beforeEach(() => {
    mockSearchLogs.mockReset();
  });

  it('TC-03: Non-admin users (VT-02) receive Access Denied screen and never call the API', () => {
    render(<SensitiveAccessLogPage currentUserRoles={['VT-02']} currentUserName="Nhân viên kinh doanh" />);

    expect(screen.getByRole('heading', { name: /Bạn không có thẩm quyền/i })).toBeInTheDocument();
    expect(screen.getByText(/chỉ dành riêng cho vai trò/i)).toBeInTheDocument();
    expect(mockSearchLogs).not.toHaveBeenCalled();
  });

  it('TC-01: Admin (VT-07) sees the log list returned by the search API', async () => {
    mockSearchLogs.mockResolvedValue(samplePage);

    render(<SensitiveAccessLogPage currentUserRoles={['VT-07']} currentUserName="Quản trị viên" />);

    await waitFor(() => {
      expect(screen.getByText('@admin')).toBeInTheDocument();
    });

    expect(screen.getByText('DuAn/5')).toBeInTheDocument();
    expect(screen.getAllByText('Biên lợi nhuận').length).toBeGreaterThan(0);
    expect(screen.getByText('Xuất dữ liệu')).toBeInTheDocument();
  });

  it('TC-02: Shows an explicit empty state when no records match the filter', async () => {
    mockSearchLogs.mockResolvedValue(emptyPage);

    render(<SensitiveAccessLogPage currentUserRoles={['VT-07']} currentUserName="Quản trị viên" />);

    await waitFor(() => {
      expect(screen.getByText(/Không tìm thấy nhật ký truy cập nào/i)).toBeInTheDocument();
    });
  });

  it('TC-01: Applying the username filter re-queries the API with the typed value', async () => {
    mockSearchLogs.mockResolvedValue(emptyPage);

    render(<SensitiveAccessLogPage currentUserRoles={['VT-07']} currentUserName="Quản trị viên" />);

    await waitFor(() => expect(mockSearchLogs).toHaveBeenCalledTimes(1));

    const usernameInput = screen.getByPlaceholderText('vd: nhansu');
    fireEvent.change(usernameInput, { target: { value: 'nhansu' } });
    fireEvent.click(screen.getByRole('button', { name: /Tìm kiếm/i }));

    await waitFor(() => {
      expect(mockSearchLogs).toHaveBeenLastCalledWith(
        expect.objectContaining({ username: 'nhansu', page: 0, size: 20 })
      );
    });
  });
});
