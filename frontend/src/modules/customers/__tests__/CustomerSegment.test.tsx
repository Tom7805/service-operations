import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import CustomerSegmentPanel from '../components/CustomerSegmentPanel';
import CustomerDetailPage from '../pages/CustomerDetailPage';
import CustomerListPage from '../pages/CustomerListPage';
import * as customersApi from '../api/customersApi';
import type { Customer } from '../types/customerTypes';

vi.mock('../api/customersApi', () => ({
  fetchCustomers: vi.fn().mockResolvedValue([]),
  createCustomer: vi.fn(),
  checkCustomerDuplicate: vi.fn().mockResolvedValue([]),
  createCustomerWithOverride: vi.fn(),
  fetchCustomerContacts: vi.fn().mockResolvedValue([]),
  addCustomerContact: vi.fn(),
  setPrimaryCustomerContact: vi.fn(),
  fetchCustomerOverview: vi.fn().mockResolvedValue({
    customer: {},
    opportunities: [],
    contracts: [],
    projects: [],
    invoices: [],
    receivables: [],
  }),
  updateCustomerSegment: vi.fn(),
  updateCustomer: vi.fn(),
  updateCustomerWithOverride: vi.fn(),
  CustomerApiError: class extends Error {
    constructor(public code: string, message: string, public statusCode?: number) {
      super(message);
      this.name = 'CustomerApiError';
    }
  },
}));

describe('Phân nhóm khách hàng theo ngành và quy mô (NCL-02-CN-005)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockCustomer: Customer = {
    id: 20,
    code: 'KH-000020',
    name: 'Công ty Cổ phần Beta Solutions',
    taxCode: '0109888888',
    phone: '0977 888 999',
    industry: 'Công nghệ thông tin',
    address: 'TP. Hồ Chí Minh',
    createdAt: '2026-08-28T08:00:00',
    companySize: null,
    priority: null,
  };

  describe('NCL-02-CN-005-TC-01: Luồng thành công (Gán phân nhóm & lọc theo nhãn)', () => {
    it('gán ngành nghề, quy mô và mức độ ưu tiên rồi lưu -> khách hàng hiển thị đúng nhãn', async () => {
      const updatedMock: Customer = {
        ...mockCustomer,
        industry: 'Công nghệ thông tin',
        companySize: 'Vừa',
        priority: 'Cao',
      };
      vi.mocked(customersApi.updateCustomerSegment).mockResolvedValue(updatedMock);

      render(
        <CustomerSegmentPanel
          customer={mockCustomer}
          currentUserRoles={['VT-04']}
          currentUserName="Nguyễn Sales"
        />
      );

      // Trạng thái ban đầu: chưa gán nhãn quy mô / ưu tiên
      expect(screen.getByTestId('segment-size-value')).toHaveTextContent('Chưa gán');
      expect(screen.getByTestId('segment-priority-value')).toHaveTextContent('Chưa gán');

      fireEvent.click(screen.getByTestId('btn-open-segment-modal'));

      fireEvent.change(screen.getByLabelText(/Quy mô công ty/i), { target: { value: 'Vừa' } });
      fireEvent.change(screen.getByLabelText(/Mức độ ưu tiên/i), { target: { value: 'Cao' } });
      fireEvent.click(screen.getByTestId('btn-submit-segment'));

      await waitFor(() => {
        expect(customersApi.updateCustomerSegment).toHaveBeenCalledWith(20, {
          industry: 'Công nghệ thông tin',
          companySize: 'Vừa',
          priority: 'Cao',
        });
      });

      // Nhãn phân nhóm mới hiển thị đúng trên màn hình
      await waitFor(() => {
        expect(screen.getByTestId('segment-size-value')).toHaveTextContent('Vừa');
        expect(screen.getByTestId('segment-priority-value')).toHaveTextContent('Cao');
        expect(screen.getByText(/Cập nhật phân nhóm khách hàng thành công/i)).toBeInTheDocument();
      });
    });

    it('bắt buộc chọn đủ ngành nghề, quy mô và mức độ ưu tiên trước khi lưu', async () => {
      render(<CustomerSegmentPanel customer={mockCustomer} currentUserRoles={['VT-04']} />);

      fireEvent.click(screen.getByTestId('btn-open-segment-modal'));
      fireEvent.change(screen.getByLabelText(/Ngành nghề/i), { target: { value: '' } });
      fireEvent.click(screen.getByTestId('btn-submit-segment'));

      expect(await screen.findByText(/Ngành nghề không được để trống/i)).toBeInTheDocument();
      expect(screen.getByText(/Quy mô công ty không được để trống/i)).toBeInTheDocument();
      expect(screen.getByText(/Mức độ ưu tiên không được để trống/i)).toBeInTheDocument();
      expect(customersApi.updateCustomerSegment).not.toHaveBeenCalled();
    });

    it('lọc danh sách khách hàng theo quy mô và mức độ ưu tiên đã gán', () => {
      const initialCustomers: Customer[] = [
        {
          id: 1,
          code: 'KH-000001',
          name: 'Công ty Alpha',
          industry: 'Phần mềm',
          companySize: 'Nhỏ',
          priority: 'Thấp',
        },
        {
          id: 2,
          code: 'KH-000002',
          name: 'Công ty Beta',
          industry: 'Tài chính',
          companySize: 'Lớn',
          priority: 'Cao',
        },
      ];

      render(
        <CustomerListPage currentUserRoles={['VT-04']} initialCustomers={initialCustomers} />
      );

      expect(screen.getByText('Công ty Alpha')).toBeInTheDocument();
      expect(screen.getByText('Công ty Beta')).toBeInTheDocument();

      // Lọc theo quy mô "Lớn" -> chỉ còn Công ty Beta
      fireEvent.change(screen.getByLabelText(/Quy mô:/i), { target: { value: 'Lớn' } });
      expect(screen.getByText('Công ty Beta')).toBeInTheDocument();
      expect(screen.queryByText('Công ty Alpha')).toBeNull();

      // Đổi sang lọc theo mức ưu tiên "Thấp" -> chỉ còn Công ty Alpha
      fireEvent.change(screen.getByLabelText(/Quy mô:/i), { target: { value: '' } });
      fireEvent.change(screen.getByLabelText(/Ưu tiên:/i), { target: { value: 'Thấp' } });
      expect(screen.getByText('Công ty Alpha')).toBeInTheDocument();
      expect(screen.queryByText('Công ty Beta')).toBeNull();
    });
  });

  describe('NCL-02-CN-005-TC-02: Dữ liệu rỗng (Không có khách hàng thuộc nhóm được lọc)', () => {
    it('lọc theo nhóm không tồn tại -> hệ thống báo không có kết quả phù hợp', () => {
      const initialCustomers: Customer[] = [
        {
          id: 1,
          code: 'KH-000001',
          name: 'Công ty Alpha',
          industry: 'Phần mềm',
          companySize: 'Nhỏ',
          priority: 'Thấp',
        },
      ];

      render(
        <CustomerListPage currentUserRoles={['VT-04']} initialCustomers={initialCustomers} />
      );

      fireEvent.change(screen.getByLabelText(/Quy mô:/i), { target: { value: 'Nhỏ' } });
      fireEvent.change(screen.getByLabelText(/Ưu tiên:/i), { target: { value: 'Thấp' } });

      // Đổi tiếp sang ngành nghề không khớp với khách hàng hiện có -> rỗng
      fireEvent.change(screen.getByLabelText(/Ngành nghề:/i), { target: { value: 'Phần mềm' } });
      // (Vẫn còn khớp — thử tìm kiếm từ khóa không tồn tại để chắc chắn rỗng)
      fireEvent.change(screen.getByPlaceholderText(/Tìm theo tên KH/i), {
        target: { value: 'Không tồn tại XYZ' },
      });

      expect(screen.getByTestId('segment-filter-empty-state')).toBeInTheDocument();
      expect(screen.getByText(/Không có kết quả phù hợp/i)).toBeInTheDocument();
      expect(screen.queryByText('Công ty Alpha')).toBeNull();

      // Bấm "Xóa toàn bộ bộ lọc" -> khách hàng hiển thị trở lại
      fireEvent.click(screen.getByTestId('btn-clear-segment-filters'));
      expect(screen.getByText('Công ty Alpha')).toBeInTheDocument();
      expect(screen.queryByTestId('segment-filter-empty-state')).toBeNull();
    });
  });

  describe('NCL-02-CN-005-TC-03: Không có quyền truy cập', () => {
    it('từ chối truy cập chức năng phân nhóm khi người dùng không phải Sales/PM', () => {
      render(<CustomerSegmentPanel customer={mockCustomer} currentUserRoles={['VT-05']} />);

      expect(screen.getByTestId('segment-access-denied')).toBeInTheDocument();
      expect(screen.getByText(/Không có quyền phân nhóm khách hàng/i)).toBeInTheDocument();
      expect(screen.queryByTestId('btn-open-segment-modal')).toBeNull();
    });

    it('cho phép Quản lý dự án (VT-02) truy cập chức năng phân nhóm', () => {
      render(<CustomerSegmentPanel customer={mockCustomer} currentUserRoles={['VT-02']} />);

      expect(screen.queryByTestId('segment-access-denied')).toBeNull();
      expect(screen.getByTestId('btn-open-segment-modal')).toBeInTheDocument();
    });
  });

  describe('NCL-02-CN-005-TC-04: Lưu lịch sử (Nhật ký thao tác)', () => {
    it('khi có thay đổi phân nhóm -> gọi API cập nhật (backend ghi vào Nhật ký hệ thống)', async () => {
      const updatedMock: Customer = {
        ...mockCustomer,
        companySize: 'Lớn',
        priority: 'Trung bình',
      };
      vi.mocked(customersApi.updateCustomerSegment).mockResolvedValue(updatedMock);

      render(
        <CustomerSegmentPanel
          customer={mockCustomer}
          currentUserRoles={['VT-04']}
          currentUserName="Nguyễn Sales"
        />
      );

      fireEvent.click(screen.getByTestId('btn-open-segment-modal'));
      fireEvent.change(screen.getByLabelText(/Quy mô công ty/i), { target: { value: 'Lớn' } });
      fireEvent.change(screen.getByLabelText(/Mức độ ưu tiên/i), { target: { value: 'Trung bình' } });
      fireEvent.click(screen.getByTestId('btn-submit-segment'));

      await waitFor(() => {
        expect(customersApi.updateCustomerSegment).toHaveBeenCalledWith(
          mockCustomer.id,
          expect.any(Object)
        );
      });

      // Không còn thẻ "nhật ký trong phiên" trên màn hình phân nhóm.
      expect(screen.queryByTestId('segment-audit-card')).not.toBeInTheDocument();
    });
  });

  describe('Tích hợp trang CustomerDetailPage', () => {
    it('chuyển sang tab "Phân nhóm" hiển thị được CustomerSegmentPanel', () => {
      render(
        <CustomerDetailPage
          customer={mockCustomer}
          currentUserRoles={['VT-04']}
          onBack={vi.fn()}
        />
      );

      fireEvent.click(screen.getByTestId('tab-btn-segment'));
      expect(screen.getByTestId('segment-manager-section')).toBeInTheDocument();
    });

    it('mở thẳng tab "Phân nhóm" khi truyền initialTab="SEGMENT"', () => {
      render(
        <CustomerDetailPage
          customer={mockCustomer}
          currentUserRoles={['VT-04']}
          onBack={vi.fn()}
          initialTab="SEGMENT"
        />
      );

      expect(screen.getByTestId('segment-manager-section')).toBeInTheDocument();
    });
  });

  describe('Tích hợp trang CustomerListPage', () => {
    it('bấm nút "Phân nhóm" trên bảng danh sách -> mở trang chi tiết ngay tại tab Phân nhóm', () => {
      const initialCustomers: Customer[] = [mockCustomer];

      render(
        <CustomerListPage currentUserRoles={['VT-04']} initialCustomers={initialCustomers} />
      );

      // Thao tác nằm trong menu kebab (⋮) — mở menu của dòng rồi bấm "Phân nhóm".
      fireEvent.click(screen.getByLabelText(`Thao tác cho ${mockCustomer.name}`));
      fireEvent.click(screen.getByTestId(`btn-open-segment-${mockCustomer.id}`));

      expect(screen.getByTestId('customer-detail-page')).toBeInTheDocument();
      expect(screen.getByTestId('segment-manager-section')).toBeInTheDocument();
    });
  });
});
