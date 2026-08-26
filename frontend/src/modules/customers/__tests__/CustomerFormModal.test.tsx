import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import CustomerFormModal from '../components/CustomerFormModal';
import { CustomerApiError } from '../api/customersApi';

describe('CustomerFormModal Component (NCL-02-CN-001-CV-05)', () => {
  it('không render khi isOpen = false', () => {
    const { container } = render(
      <CustomerFormModal isOpen={false} onClose={vi.fn()} onSubmit={vi.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('render đầy đủ các trường nhập liệu khi isOpen = true', () => {
    render(
      <CustomerFormModal isOpen={true} onClose={vi.fn()} onSubmit={vi.fn()} />
    );

    expect(screen.getByRole('heading', { name: /Tạo hồ sơ khách hàng mới/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Tên khách hàng/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Mã số thuế/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Lĩnh vực \/ Ngành nghề/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Địa chỉ trụ sở/i)).toBeInTheDocument();
  });

  it('tuân thủ nghiệp vụ: không có ô nhập mã khách hàng (code do hệ thống tự sinh)', () => {
    render(
      <CustomerFormModal isOpen={true} onClose={vi.fn()} onSubmit={vi.fn()} />
    );

    // Không tồn tại ô input nào cho phép người dùng tự nhập mã khách hàng
    expect(screen.queryByLabelText(/Mã khách hàng/i)).toBeNull();
    expect(screen.queryByPlaceholderText(/KH-/i)).toBeNull();
  });

  it('hiển thị lỗi validation khi submit form mà để trống tên khách hàng', async () => {
    const onSubmit = vi.fn();
    render(
      <CustomerFormModal isOpen={true} onClose={vi.fn()} onSubmit={onSubmit} />
    );

    const submitBtn = screen.getByRole('button', { name: /Lưu hồ sơ khách hàng/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText('Tên khách hàng không được để trống')).toBeInTheDocument();
    });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('gọi hàm onSubmit khi nhập thông tin hợp lệ', async () => {
    const onSubmit = vi.fn().mockResolvedValue({
      id: 1,
      code: 'KH-123456',
      name: 'Công ty Cổ phần Misa',
      taxCode: '0101234567',
      industry: 'Công nghệ',
      address: 'Hà Nội',
    });
    const onClose = vi.fn();

    render(
      <CustomerFormModal isOpen={true} onClose={onClose} onSubmit={onSubmit} />
    );

    const nameInput = screen.getByLabelText(/Tên khách hàng/i);
    const taxCodeInput = screen.getByLabelText(/Mã số thuế/i);
    const industryInput = screen.getByLabelText(/Lĩnh vực/i);
    const addressInput = screen.getByLabelText(/Địa chỉ/i);

    fireEvent.change(nameInput, { target: { value: 'Công ty Cổ phần Misa' } });
    fireEvent.change(taxCodeInput, { target: { value: '0101234567' } });
    fireEvent.change(industryInput, { target: { value: 'Công nghệ' } });
    fireEvent.change(addressInput, { target: { value: 'Hà Nội' } });

    const submitBtn = screen.getByRole('button', { name: /Lưu hồ sơ khách hàng/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        name: 'Công ty Cổ phần Misa',
        taxCode: '0101234567',
        industry: 'Công nghệ',
        address: 'Hà Nội',
      });
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('hiển thị thông báo lỗi từ server khi onSubmit ném lỗi', async () => {
    const errorMsg = 'Bạn không có quyền tạo hồ sơ khách hàng (403 FORBIDDEN)';
    const onSubmit = vi.fn().mockRejectedValue(
      new CustomerApiError('FORBIDDEN', errorMsg, 403)
    );

    render(
      <CustomerFormModal isOpen={true} onClose={vi.fn()} onSubmit={onSubmit} />
    );

    const nameInput = screen.getByLabelText(/Tên khách hàng/i);
    fireEvent.change(nameInput, { target: { value: 'Doanh nghiệp ABC' } });

    const submitBtn = screen.getByRole('button', { name: /Lưu hồ sơ khách hàng/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(errorMsg)).toBeInTheDocument();
    });
  });

  it('đóng modal khi nhấn phím Escape', () => {
    const onClose = vi.fn();
    render(
      <CustomerFormModal isOpen={true} onClose={onClose} onSubmit={vi.fn()} />
    );

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });
});
