import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import ClosedProjectNotice from '../components/ClosedProjectNotice';

describe('ClosedProjectNotice (NCL-06-CN-007)', () => {
  it('hiển thị đúng mã dự án, tên dự án và trạng thái', () => {
    render(
      <ClosedProjectNotice
        project={{ projectCode: 'PRJ-2026-001', name: 'Triển khai CRM cho Khách hàng Alpha', status: 'CLOSED' }}
      />
    );

    const notice = screen.getByTestId('time-entry-project-closed-alert');
    expect(notice).toHaveTextContent('PRJ-2026-001');
    expect(notice).toHaveTextContent('Triển khai CRM cho Khách hàng Alpha');
    expect(notice).toHaveTextContent('CLOSED');
    expect(notice).toHaveTextContent('không thể ghi giờ công');
  });

  it('gắn role="alert" để trình đọc màn hình thông báo ngay', () => {
    render(<ClosedProjectNotice project={{ projectCode: 'PRJ-1', name: 'Dự án 1', status: 'CLOSED' }} />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });
});
