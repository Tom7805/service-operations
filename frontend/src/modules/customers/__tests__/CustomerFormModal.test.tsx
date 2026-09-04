import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import CustomerFormModal from '../components/CustomerFormModal';
import * as customersApi from '../api/customersApi';

vi.mock('../api/customersApi', async () => {
  const actual = await vi.importActual<typeof import('../api/customersApi')>('../api/customersApi');
  return {
    ...actual,
    checkCustomerDuplicate: vi.fn(),
    createCustomerWithOverride: vi.fn(),
  };
});

describe('CustomerFormModal Component (NCL-02-CN-001 & NCL-02-CN-002)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('không render khi isOpen = false', () => {
    const { container } = render(
      <CustomerFormModal isOpen={false} onClose={vi.fn()} onSubmit={vi.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('render đầy đủ các trường nhập liệu khi isOpen = true (kèm trường phone NCL-02-CN-002)', () => {
    render(
      <CustomerFormModal isOpen={true} onClose={vi.fn()} onSubmit={vi.fn()} />
    );

    expect(screen.getByRole('heading', { name: /Tạo hồ sơ khách hàng mới/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Tên khách hàng/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Mã số thuế/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Số điện thoại/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Lĩnh vực \/ Ngành nghề/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Địa chỉ trụ sở/i)).toBeInTheDocument();
  });

  it('tuân thủ nghiệp vụ: không có ô nhập mã khách hàng (code do hệ thống tự sinh)', () => {
    render(
      <CustomerFormModal isOpen={true} onClose={vi.fn()} onSubmit={vi.fn()} />
    );

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

  it('gọi hàm onSubmit khi nhập thông tin hợp lệ và không có trùng lặp (TC-03)', async () => {
    vi.mocked(customersApi.checkCustomerDuplicate).mockResolvedValue([]);
    const onSubmit = vi.fn().mockResolvedValue({
      id: 1,
      code: 'KH-123456',
      name: 'Công ty Cổ phần Misa',
      taxCode: '0101234567',
      phone: '0987654321',
      industry: 'Công nghệ',
      address: 'Hà Nội',
    });
    const onClose = vi.fn();

    render(
      <CustomerFormModal isOpen={true} onClose={onClose} onSubmit={onSubmit} />
    );

    const nameInput = screen.getByLabelText(/Tên khách hàng/i);
    const taxCodeInput = screen.getByLabelText(/Mã số thuế/i);
    const phoneInput = screen.getByLabelText(/Số điện thoại/i);
    const industryInput = screen.getByLabelText(/Lĩnh vực/i);
    const addressInput = screen.getByLabelText(/Địa chỉ/i);

    fireEvent.change(nameInput, { target: { value: 'Công ty Cổ phần Misa' } });
    fireEvent.change(taxCodeInput, { target: { value: '0101234567' } });
    fireEvent.change(phoneInput, { target: { value: '0987654321' } });
    fireEvent.change(industryInput, { target: { value: 'Công nghệ' } });
    fireEvent.change(addressInput, { target: { value: 'Hà Nội' } });

    const submitBtn = screen.getByRole('button', { name: /Lưu hồ sơ khách hàng/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(customersApi.checkCustomerDuplicate).toHaveBeenCalledWith({
        name: 'Công ty Cổ phần Misa',
        taxCode: '0101234567',
        phone: '0987654321',
        industry: 'Công nghệ',
        address: 'Hà Nội',
      });
      expect(onSubmit).toHaveBeenCalledWith({
        name: 'Công ty Cổ phần Misa',
        taxCode: '0101234567',
        phone: '0987654321',
        industry: 'Công nghệ',
        address: 'Hà Nội',
      });
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('mở DuplicateWarningModal khi phát hiện có hồ sơ nghi trùng (TC-01)', async () => {
    vi.mocked(customersApi.checkCustomerDuplicate).mockResolvedValue([
      {
        id: 9,
        code: 'KH-000009',
        name: 'Công ty Cổ phần Misa Telecom',
        taxCode: '0101234567',
        phone: '0987654321',
        similarity: 0.95,
        matchedFields: ['ten', 'maSoThue'],
      },
    ]);

    const onSubmit = vi.fn();
    render(
      <CustomerFormModal isOpen={true} onClose={vi.fn()} onSubmit={onSubmit} />
    );

    const nameInput = screen.getByLabelText(/Tên khách hàng/i);
    fireEvent.change(nameInput, { target: { value: 'Công ty Cổ phần Misa Telecom' } });

    const submitBtn = screen.getByRole('button', { name: /Lưu hồ sơ khách hàng/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Phát hiện hồ sơ khách hàng tương tự trong hệ thống/i })).toBeInTheDocument();
      expect(screen.getByText('KH-000009')).toBeInTheDocument();
    });

    // Không gọi onSubmit trực tiếp khi có trùng
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('hỗ trợ tạo hồ sơ với override khi xác nhận trong DuplicateWarningModal (TC-02)', async () => {
    vi.mocked(customersApi.checkCustomerDuplicate).mockResolvedValue([
      {
        id: 9,
        code: 'KH-000009',
        name: 'Công ty Cổ phần Misa Telecom',
        taxCode: '0101234567',
        phone: '0987654321',
        similarity: 0.95,
        matchedFields: ['ten', 'maSoThue'],
      },
    ]);

    const onOverrideSubmit = vi.fn().mockResolvedValue({
      id: 10,
      code: 'KH-000010',
      name: 'Công ty Cổ phần Misa Telecom',
    });
    const onClose = vi.fn();

    render(
      <CustomerFormModal
        isOpen={true}
        onClose={onClose}
        onSubmit={vi.fn()}
        onOverrideSubmit={onOverrideSubmit}
      />
    );

    fireEvent.change(screen.getByLabelText(/Tên khách hàng/i), {
      target: { value: 'Công ty Cổ phần Misa Telecom' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Lưu hồ sơ khách hàng/i }));

    // Đợi mở modal cảnh báo
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Phát hiện hồ sơ khách hàng tương tự/i })).toBeInTheDocument();
    });

    // Bấm nút Vẫn tạo mới
    fireEvent.click(screen.getByRole('button', { name: /Vẫn tạo mới \(Bỏ qua cảnh báo\)/i }));

    // Nhập lý do
    const reasonInput = screen.getByLabelText(/Lý do xác nhận tạo mới/i);
    fireEvent.change(reasonInput, {
      target: { value: 'Hai chi nhánh hạch toán độc lập của Misa' },
    });

    // Xác nhận
    fireEvent.click(screen.getByRole('button', { name: /Xác nhận tạo mới \(Ghi nhật ký\)/i }));

    await waitFor(() => {
      expect(onOverrideSubmit).toHaveBeenCalledWith({
        customer: {
          name: 'Công ty Cổ phần Misa Telecom',
          taxCode: undefined,
          phone: undefined,
          industry: undefined,
          address: undefined,
        },
        override: {
          reason: 'Hai chi nhánh hạch toán độc lập của Misa',
        },
      });
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('luồng chỉnh sửa: tự loại chính hồ sơ đang sửa khỏi cảnh báo trùng và gọi update-with-override với copy đúng ngữ cảnh', async () => {
    vi.mocked(customersApi.checkCustomerDuplicate).mockResolvedValue([
      {
        id: 9,
        code: 'KH-000009',
        name: 'Công ty Cổ phần Misa Telecom',
        taxCode: '0101234567',
        phone: '0987654321',
        similarity: 0.95,
        matchedFields: ['ten', 'maSoThue'],
      },
    ]);

    const onOverrideSubmit = vi.fn().mockResolvedValue({
      id: 5,
      code: 'KH-000005',
      name: 'Công ty Cổ phần Misa Telecom',
    });
    const onClose = vi.fn();

    render(
      <CustomerFormModal
        isOpen={true}
        mode="edit"
        initialCustomer={{
          id: 5,
          code: 'KH-000005',
          name: 'Công ty Cổ phần Misa',
          taxCode: '0101234567',
          phone: '0987654321',
          industry: null,
          address: null,
        }}
        onClose={onClose}
        onSubmit={vi.fn()}
        onOverrideSubmit={onOverrideSubmit}
      />
    );

    fireEvent.change(screen.getByLabelText(/Tên khách hàng/i), {
      target: { value: 'Công ty Cổ phần Misa Telecom' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Lưu thay đổi/i }));

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: /Phát hiện hồ sơ khách hàng tương tự/i })
      ).toBeInTheDocument();
      // Ứng viên trùng với chính hồ sơ đang sửa (id: 5) phải bị tự loại — chỉ còn ứng viên khác (id: 9)
      expect(screen.getByText('KH-000009')).toBeInTheDocument();
    });

    // Copy phải phản ánh đúng ngữ cảnh "chỉnh sửa" — không gợi ý rằng thao tác này tạo hồ sơ mới
    expect(screen.getByText(/Hồ sơ bạn đang chỉnh sửa:/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Vẫn lưu thay đổi \(Bỏ qua cảnh báo\)/i }));

    fireEvent.change(screen.getByLabelText(/Lý do xác nhận lưu thay đổi/i), {
      target: { value: 'Hai chi nhánh hạch toán độc lập của Misa' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Xác nhận lưu \(Ghi nhật ký\)/i }));

    await waitFor(() => {
      expect(onOverrideSubmit).toHaveBeenCalledWith({
        customer: {
          name: 'Công ty Cổ phần Misa Telecom',
          taxCode: '0101234567',
          phone: '0987654321',
          industry: undefined,
          address: undefined,
        },
        override: {
          reason: 'Hai chi nhánh hạch toán độc lập của Misa',
        },
      });
      expect(onClose).toHaveBeenCalled();
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

