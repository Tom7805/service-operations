import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import CustomerListPage from '../pages/CustomerListPage';
import * as customersApi from '../api/customersApi';

vi.mock('../api/customersApi', () => ({
  fetchCustomers: vi.fn().mockResolvedValue([]),
  createCustomer: vi.fn(),
  checkCustomerDuplicate: vi.fn().mockResolvedValue([]),
  createCustomerWithOverride: vi.fn(),
  updateCustomer: vi.fn(),
  updateCustomerWithOverride: vi.fn(),
  CustomerApiError: class extends Error {
    constructor(public code: string, message: string, public statusCode?: number) {
      super(message);
      this.name = 'CustomerApiError';
    }
  },
}));

describe('CustomerListPage Component (NCL-02-CN-001-CV-05)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(customersApi.checkCustomerDuplicate).mockResolvedValue([]);
    vi.mocked(customersApi.fetchCustomers).mockResolvedValue([]);
  });

  describe('Kiểm tra phân quyền vai trò (TC-03)', () => {
    it('cho phép Nhân viên kinh doanh (VT-04) truy cập màn hình quản lý khách hàng', () => {
      render(
        <CustomerListPage currentUserRoles={['VT-04']} currentUserName="Nguyễn Văn Sales" />
      );

      expect(screen.getByRole('heading', { level: 1, name: 'Hồ sơ khách hàng' })).toBeInTheDocument();
      expect(screen.getByTestId('btn-open-create-customer')).toBeInTheDocument();
      expect(screen.queryByTestId('access-denied-view')).toBeNull();
    });

    it('cho phép Quản lý dự án (VT-02) truy cập màn hình quản lý khách hàng', () => {
      render(
        <CustomerListPage currentUserRoles={['VT-02']} currentUserName="Trần Quản Lý" />
      );

      expect(screen.getByRole('heading', { level: 1, name: 'Hồ sơ khách hàng' })).toBeInTheDocument();
      expect(screen.getByTestId('btn-open-create-customer')).toBeInTheDocument();
      expect(screen.queryByTestId('access-denied-view')).toBeNull();
    });

    it('từ chối truy cập (403 Access Denied) khi người dùng có vai trò khác như Nhân sự (VT-06)', () => {
      render(
        <CustomerListPage currentUserRoles={['VT-06']} currentUserName="Lê Thị HR" />
      );

      expect(screen.getByTestId('access-denied-view')).toBeInTheDocument();
      expect(screen.getByText(/Bạn không có thẩm quyền tạo & quản lý hồ sơ khách hàng/i)).toBeInTheDocument();
      expect(screen.queryByTestId('btn-open-create-customer')).toBeNull();
    });

    it('từ chối truy cập khi người dùng là Nhân viên chuyên môn (VT-03)', () => {
      render(
        <CustomerListPage currentUserRoles={['VT-03']} currentUserName="Phạm Dev" />
      );

      expect(screen.getByTestId('access-denied-view')).toBeInTheDocument();
    });
  });

  describe('Luồng tạo hồ sơ khách hàng và kết nối Backend', () => {
    it('mở modal khi bấm nút "+ Tạo hồ sơ khách hàng"', () => {
      render(
        <CustomerListPage currentUserRoles={['VT-04']} />
      );

      fireEvent.click(screen.getByTestId('btn-open-create-customer'));
      expect(screen.getByRole('heading', { name: /Tạo hồ sơ khách hàng mới/i })).toBeInTheDocument();
    });

    it('tạo thành công hồ sơ khách hàng, nhận mã KH-xxxxxx và hiển thị toast thông báo', async () => {
      const mockCreated = {
        id: 101,
        code: 'KH-987654',
        name: 'Tập đoàn Công nghệ FPT',
        taxCode: '0100123456',
        industry: 'Viễn thông',
        address: 'Hà Nội',
        createdAt: '2026-08-26T10:00:00',
      };

      vi.mocked(customersApi.createCustomer).mockResolvedValue(mockCreated);

      render(
        <CustomerListPage currentUserRoles={['VT-04']} />
      );

      // Mở modal
      fireEvent.click(screen.getByTestId('btn-open-create-customer'));

      // Nhập liệu
      const nameInput = screen.getByLabelText(/Tên khách hàng/i);
      fireEvent.change(nameInput, { target: { value: 'Tập đoàn Công nghệ FPT' } });

      // Submit form
      const submitBtn = screen.getByRole('button', { name: /Lưu hồ sơ khách hàng/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(customersApi.createCustomer).toHaveBeenCalledWith({
          name: 'Tập đoàn Công nghệ FPT',
          taxCode: undefined,
          phone: undefined,
          industry: undefined,
          address: undefined,
        });
      });

      // Kiểm tra toast hiển thị mã tự sinh KH-987654 và bảng cập nhật
      await waitFor(() => {
        expect(screen.getByText(/thành công/i)).toBeInTheDocument();
        expect(screen.getAllByText('KH-987654').length).toBeGreaterThanOrEqual(1);
      });

      // Kiểm tra bảng hiển thị khách hàng mới tạo
      expect(screen.getAllByText('Tập đoàn Công nghệ FPT').length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('NCL-02-CN-001 (bước D/P): Tải danh sách hồ sơ khách hàng từ Backend', () => {
    it('gọi GET /customers khi mount và hiển thị các hồ sơ đã lưu trong hệ thống', async () => {
      vi.mocked(customersApi.fetchCustomers).mockResolvedValue([
        { id: 10, code: 'KH-000010', name: 'Công ty Đã Lưu Trước', taxCode: '0105555555', industry: 'Kiểm toán', address: 'Đà Nẵng' },
      ]);

      render(<CustomerListPage currentUserRoles={['VT-04']} />);

      expect(customersApi.fetchCustomers).toHaveBeenCalledTimes(1);
      await waitFor(() => {
        expect(screen.getByText('Công ty Đã Lưu Trước')).toBeInTheDocument();
        expect(screen.getByText('KH-000010')).toBeInTheDocument();
      });
    });

    it('hiển thị trạng thái rỗng khi Backend chưa có hồ sơ khách hàng nào', async () => {
      vi.mocked(customersApi.fetchCustomers).mockResolvedValue([]);

      render(<CustomerListPage currentUserRoles={['VT-02']} />);

      await waitFor(() => {
        expect(screen.getByText(/Chưa có hồ sơ khách hàng nào/i)).toBeInTheDocument();
      });
    });

    it('hiển thị trạng thái lỗi kèm nút "Thử lại" khi gọi API thất bại', async () => {
      vi.mocked(customersApi.fetchCustomers).mockRejectedValueOnce(
        new customersApi.CustomerApiError('NETWORK_ERROR', 'Không thể kết nối đến máy chủ Backend.', 503)
      );

      render(<CustomerListPage currentUserRoles={['VT-04']} />);

      await waitFor(() => {
        expect(screen.getByTestId('customer-load-error')).toBeInTheDocument();
        expect(screen.getByText('Không thể kết nối đến máy chủ Backend.')).toBeInTheDocument();
      });

      // Bấm "Thử lại" -> gọi lại API và tải được danh sách
      vi.mocked(customersApi.fetchCustomers).mockResolvedValueOnce([
        { id: 1, code: 'KH-000001', name: 'Công ty Phục Hồi', taxCode: null, industry: null, address: null },
      ]);
      fireEvent.click(screen.getByRole('button', { name: /Thử lại/i }));

      await waitFor(() => {
        expect(screen.queryByTestId('customer-load-error')).toBeNull();
        expect(screen.getByText('Công ty Phục Hồi')).toBeInTheDocument();
      });
    });

    it('không gọi API tải danh sách khi người dùng không đủ quyền (VT-06)', () => {
      render(<CustomerListPage currentUserRoles={['VT-06']} />);

      expect(customersApi.fetchCustomers).not.toHaveBeenCalled();
      expect(screen.getByTestId('access-denied-view')).toBeInTheDocument();
    });
  });

  describe('Tìm kiếm & Lọc danh sách khách hàng', () => {
    it('lọc khách hàng theo từ khóa tìm kiếm', () => {
      const initialCustomers = [
        {
          id: 1,
          code: 'KH-000001',
          name: 'Công ty Alpha',
          taxCode: '0101111111',
          industry: 'Phần mềm',
          address: 'Hà Nội',
        },
        {
          id: 2,
          code: 'KH-000002',
          name: 'Công ty Beta',
          taxCode: '0102222222',
          industry: 'Tài chính',
          address: 'TP.HCM',
        },
      ];

      render(
        <CustomerListPage currentUserRoles={['VT-04']} initialCustomers={initialCustomers} />
      );

      expect(screen.getByText('Công ty Alpha')).toBeInTheDocument();
      expect(screen.getByText('Công ty Beta')).toBeInTheDocument();

      // Tìm kiếm "Alpha"
      const searchInput = screen.getByPlaceholderText(/Tìm theo tên KH/i);
      fireEvent.change(searchInput, { target: { value: 'Alpha' } });

      expect(screen.getByText('Công ty Alpha')).toBeInTheDocument();
      expect(screen.queryByText('Công ty Beta')).toBeNull();
    });
  });

  describe('Chỉnh sửa hồ sơ khách hàng', () => {
    it('mở menu → "Chỉnh sửa hồ sơ" → lưu thành công cập nhật ngay dòng trong bảng', async () => {
      const initialCustomers = [
        {
          id: 7,
          code: 'KH-000007',
          name: 'Công ty Gamma',
          taxCode: '0107777777',
          phone: '0912345678',
          industry: 'Logistics',
          address: 'Đà Nẵng',
        },
      ];

      vi.mocked(customersApi.updateCustomer).mockResolvedValue({
        ...initialCustomers[0],
        name: 'Công ty Gamma (đã đổi tên)',
        taxCode: '0107777777',
      });

      render(
        <CustomerListPage currentUserRoles={['VT-04']} initialCustomers={initialCustomers} />
      );

      fireEvent.click(screen.getByLabelText('Thao tác cho Công ty Gamma'));
      fireEvent.click(screen.getByTestId('btn-edit-7'));

      const nameInput = await screen.findByLabelText(/Tên khách hàng/i);
      expect(nameInput).toHaveValue('Công ty Gamma');

      fireEvent.change(nameInput, { target: { value: 'Công ty Gamma (đã đổi tên)' } });
      fireEvent.click(screen.getByRole('button', { name: /Lưu thay đổi/i }));

      await waitFor(() => {
        expect(customersApi.updateCustomer).toHaveBeenCalledWith(
          7,
          expect.objectContaining({ name: 'Công ty Gamma (đã đổi tên)' })
        );
        expect(screen.getByText('Công ty Gamma (đã đổi tên)')).toBeInTheDocument();
      });
    });
  });
});

