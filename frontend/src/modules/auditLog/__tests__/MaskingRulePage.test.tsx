import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import MaskingRulePage from '../pages/MaskingRulePage';

const mockGetMaskingRules = vi.fn();

vi.mock('../api/auditLogApi', () => ({
  getMaskingRules: () => mockGetMaskingRules(),
  AuditLogApiError: class AuditLogApiError extends Error {
    constructor(public code: string, message: string, public statusCode?: number) {
      super(message);
    }
  },
}));

describe('MaskingRulePage (NCL-01-CN-005)', () => {
  beforeEach(() => {
    mockGetMaskingRules.mockReset();
  });

  it('hiện vai trò được xem số liệu thật cho từng loại dữ liệu nhạy cảm', async () => {
    mockGetMaskingRules.mockResolvedValue([
      { level: 'COST', levelLabel: 'Giá vốn', allowedRoles: ['VT-01', 'VT-05', 'VT-06'] },
    ]);

    render(<MaskingRulePage currentUserRoles={['VT-05']} />);

    expect(await screen.findByText('Giá vốn')).toBeInTheDocument();
    expect(screen.getByText('Kế toán')).toBeInTheDocument();
    // Quản lý dự án không nằm trong nhóm được xem nên phải thuộc cột "Bị che".
    expect(screen.getByText(/Quản lý dự án/)).toBeInTheDocument();
  });

  it('TC-04: vai trò không đủ thẩm quyền nhận màn hình từ chối (backend đã ghi nhật ký lần gọi 403)', async () => {
    const { AuditLogApiError } = await import('../api/auditLogApi');
    mockGetMaskingRules.mockRejectedValue(new AuditLogApiError('FORBIDDEN', 'Khong co quyen', 403));

    render(<MaskingRulePage currentUserRoles={['VT-02']} />);

    expect(await screen.findByText(/không có thẩm quyền/i)).toBeInTheDocument();
    expect(mockGetMaskingRules).toHaveBeenCalledTimes(1);
  });
});
