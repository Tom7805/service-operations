import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import CustomerListPage from '../pages/CustomerListPage';
import * as customersApi from '../api/customersApi';
import type { Customer } from '../types/customerTypes';
import type { CustomerPageSummary } from '../api/customersApi';

vi.mock('../api/customersApi', () => ({
  fetchCustomersPage: vi.fn(),
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

/** Một trang kết quả giả lập của GET /customers/paged. */
function pageOf(customers: Partial<Customer>[], summary: Partial<CustomerPageSummary> = {}) {
  return {
    content: customers as Customer[],
    page: 0,
    size: 20,
    totalElements: customers.length,
    totalPages: customers.length === 0 ? 0 : 1,
    summary: {
      total: customers.length,
      createdToday: 0,
      industries: [],
      companySizes: [],
      priorities: [],
      ...summary,
    },
  };
}

describe('CustomerListPage Component (NCL-02-CN-001-CV-05)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(customersApi.checkCustomerDuplicate).mockResolvedValue([]);
    vi.mocked(customersApi.fetchCustomersPage).mockResolvedValue(pageOf([]));
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

    it('tạo thành công hồ sơ khách hàng, nhận mã KH-xxxxxx, hiển thị toast và tải lại trang đầu', async () => {
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
      await waitFor(() => expect(customersApi.fetchCustomersPage).toHaveBeenCalledTimes(1));

      // Sau khi tạo, trang đầu được tải lại từ máy chủ và có hồ sơ mới ở đầu danh sách.
      vi.mocked(customersApi.fetchCustomersPage).mockResolvedValue(pageOf([mockCreated]));

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

      // Kiểm tra bảng hiển thị khách hàng mới tạo (trang đầu đã được tải lại)
      await waitFor(() => {
        expect(customersApi.fetchCustomersPage).toHaveBeenCalledTimes(2);
        expect(screen.getAllByText('Tập đoàn Công nghệ FPT').length).toBeGreaterThanOrEqual(1);
      });
      expect(vi.mocked(customersApi.fetchCustomersPage).mock.calls[1][1]).toBe(0);
    });
  });

  describe('NCL-02-CN-001 (bước D/P): Tải danh sách hồ sơ khách hàng từ Backend', () => {
    it('gọi GET /customers/paged (trang đầu) khi mount và hiển thị hồ sơ cùng số liệu tổng hợp', async () => {
      vi.mocked(customersApi.fetchCustomersPage).mockResolvedValue(
        pageOf(
          [{ id: 10, code: 'KH-000010', name: 'Công ty Đã Lưu Trước', taxCode: '0105555555', industry: 'Kiểm toán', address: 'Đà Nẵng' }],
          { total: 57 }
        )
      );

      render(<CustomerListPage currentUserRoles={['VT-04']} />);

      await waitFor(() => {
        expect(screen.getByText('Công ty Đã Lưu Trước')).toBeInTheDocument();
        expect(screen.getByText('KH-000010')).toBeInTheDocument();
      });
      expect(customersApi.fetchCustomersPage).toHaveBeenCalledTimes(1);
      expect(customersApi.fetchCustomersPage).toHaveBeenCalledWith(
        { keyword: '', industry: '', companySize: '', priority: '' },
        0,
        20
      );
      // Thẻ thống kê lấy tổng số trên toàn phạm vi từ máy chủ, không phải số dòng của trang.
      expect(screen.getByTestId('customer-total-count')).toHaveTextContent('57');
    });

    it('hiển thị trạng thái rỗng khi Backend chưa có hồ sơ khách hàng nào', async () => {
      render(<CustomerListPage currentUserRoles={['VT-02']} />);

      await waitFor(() => {
        expect(screen.getByText(/Chưa có hồ sơ khách hàng nào/i)).toBeInTheDocument();
      });
    });

    it('hiển thị trạng thái lỗi kèm nút "Thử lại" khi gọi API thất bại', async () => {
      vi.mocked(customersApi.fetchCustomersPage).mockRejectedValueOnce(
        new customersApi.CustomerApiError('NETWORK_ERROR', 'Không thể kết nối đến máy chủ Backend.', 503)
      );

      render(<CustomerListPage currentUserRoles={['VT-04']} />);

      await waitFor(() => {
        expect(screen.getByTestId('customer-load-error')).toBeInTheDocument();
        expect(screen.getByText('Không thể kết nối đến máy chủ Backend.')).toBeInTheDocument();
      });

      // Bấm "Thử lại" -> gọi lại API và tải được danh sách
      vi.mocked(customersApi.fetchCustomersPage).mockResolvedValueOnce(
        pageOf([{ id: 1, code: 'KH-000001', name: 'Công ty Phục Hồi', taxCode: null, industry: null, address: null }])
      );
      fireEvent.click(screen.getByRole('button', { name: /Thử lại/i }));

      await waitFor(() => {
        expect(screen.queryByTestId('customer-load-error')).toBeNull();
        expect(screen.getByText('Công ty Phục Hồi')).toBeInTheDocument();
      });
    });

    it('không gọi API tải danh sách khi người dùng không đủ quyền (VT-06)', () => {
      render(<CustomerListPage currentUserRoles={['VT-06']} />);

      expect(customersApi.fetchCustomersPage).not.toHaveBeenCalled();
      expect(screen.getByTestId('access-denied-view')).toBeInTheDocument();
    });
  });

  describe('Tìm kiếm, lọc & phân trang phía máy chủ', () => {
    it('gửi từ khóa tìm kiếm lên máy chủ (sau khi ngừng gõ) và hiển thị kết quả trả về', async () => {
      vi.mocked(customersApi.fetchCustomersPage).mockImplementation(async (query) =>
        query.keyword === 'Alpha'
          ? pageOf([{ id: 1, code: 'KH-000001', name: 'Công ty Alpha' }], { total: 2 })
          : pageOf(
              [
                { id: 1, code: 'KH-000001', name: 'Công ty Alpha' },
                { id: 2, code: 'KH-000002', name: 'Công ty Beta' },
              ],
              { total: 2 }
            )
      );

      render(<CustomerListPage currentUserRoles={['VT-04']} />);

      expect(await screen.findByText('Công ty Beta')).toBeInTheDocument();

      fireEvent.change(screen.getByPlaceholderText(/Tìm theo tên KH/i), { target: { value: 'Alpha' } });

      await waitFor(() => {
        expect(screen.queryByText('Công ty Beta')).toBeNull();
      });
      expect(screen.getByText('Công ty Alpha')).toBeInTheDocument();
      expect(customersApi.fetchCustomersPage).toHaveBeenLastCalledWith(
        expect.objectContaining({ keyword: 'Alpha' }),
        0,
        20
      );
    });

    it('chuyển trang gọi máy chủ lấy đúng trang được chọn', async () => {
      vi.mocked(customersApi.fetchCustomersPage).mockImplementation(async (_query, page) => ({
        ...pageOf([{ id: page + 1, code: `KH-00000${page + 1}`, name: `Khách trang ${page + 1}` }], { total: 45 }),
        page,
        totalElements: 45,
        totalPages: 3,
      }));

      render(<CustomerListPage currentUserRoles={['VT-04']} />);

      expect(await screen.findByText('Khách trang 1')).toBeInTheDocument();
      expect(screen.getByTestId('customer-pagination-summary')).toHaveTextContent('1–20 / 45');

      fireEvent.click(screen.getByTestId('customer-pagination-next'));

      expect(await screen.findByText('Khách trang 2')).toBeInTheDocument();
      expect(customersApi.fetchCustomersPage).toHaveBeenLastCalledWith(expect.anything(), 1, 20);
      expect(screen.getByTestId('customer-pagination-summary')).toHaveTextContent('21–40 / 45');
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
      vi.mocked(customersApi.fetchCustomersPage).mockResolvedValue(pageOf(initialCustomers));

      vi.mocked(customersApi.updateCustomer).mockResolvedValue({
        ...initialCustomers[0],
        name: 'Công ty Gamma (đã đổi tên)',
        taxCode: '0107777777',
      });

      render(<CustomerListPage currentUserRoles={['VT-04']} />);

      fireEvent.click(await screen.findByLabelText('Thao tác cho Công ty Gamma'));
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
      // Sửa một dòng cập nhật tại chỗ, không tải lại cả danh sách.
      expect(customersApi.fetchCustomersPage).toHaveBeenCalledTimes(1);
    });
  });
});
