import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import ContactList from '../components/ContactList';
import CustomerDetailPage from '../pages/CustomerDetailPage';
import * as customersApi from '../api/customersApi';
import type { CustomerContact } from '../types/customerTypes';

vi.mock('../api/customersApi', () => ({
  fetchCustomerContacts: vi.fn(),
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
  CustomerApiError: class extends Error {
    constructor(public code: string, message: string, public statusCode?: number) {
      super(message);
      this.name = 'CustomerApiError';
    }
  },
}));

describe('Customer Contact Management Frontend (NCL-02-CN-003)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockCustomer = {
    id: 10,
    code: 'KH-123456',
    name: 'Công ty Cổ phần Alpha Tech',
    taxCode: '0109999999',
    phone: '0988 888 888',
    industry: 'Phần mềm',
    address: 'Hà Nội',
    createdAt: '2026-08-27T08:00:00',
  };

  const initialMockContacts: CustomerContact[] = [
    {
      id: 1,
      customerId: 10,
      fullName: 'Nguyễn Văn Đầu Mối Cũ',
      title: 'Trưởng phòng IT',
      email: 'cu.nguyen@alphatech.vn',
      phone: '0912 111 222',
      isPrimary: true,
      createdAt: '2026-08-27T08:30:00',
    },
    {
      id: 2,
      customerId: 10,
      fullName: 'Trần Thị Phụ',
      title: 'Chuyên viên kỹ thuật',
      email: 'phu.tran@alphatech.vn',
      phone: '0912 333 444',
      isPrimary: false,
      createdAt: '2026-08-27T08:35:00',
    },
  ];

  describe('NCL-02-CN-003-TC-01: Luồng thành công (Thêm người liên hệ & đánh dấu đầu mối chính)', () => {
    it('thêm người liên hệ và đánh dấu là đầu mối chính -> người liên hệ được lưu và hiển thị đầu danh sách', async () => {
      const newContactMock: CustomerContact = {
        id: 3,
        customerId: 10,
        fullName: 'Lê Văn Mới',
        title: 'Giám đốc Mua hàng',
        email: 'moi.le@alphatech.vn',
        phone: '0988 777 666',
        isPrimary: true,
        createdAt: '2026-08-27T09:00:00',
      };

      vi.mocked(customersApi.addCustomerContact).mockResolvedValue(newContactMock);

      render(
        <ContactList
          customerId={10}
          customerName="Công ty Cổ phần Alpha Tech"
          currentUserRoles={['VT-04']}
          currentUserName="Nguyễn Sales"
          initialContacts={initialMockContacts}
        />
      );

      // 1. Mở modal thêm người liên hệ
      const addBtn = screen.getByTestId('btn-open-add-contact');
      fireEvent.click(addBtn);
      expect(screen.getByTestId('contact-form-modal')).toBeInTheDocument();

      // 2. Nhập họ tên, chức danh, email, phone
      const nameInput = screen.getByLabelText(/Họ và tên người liên hệ/i);
      const titleInput = screen.getByLabelText(/Chức danh \/ Vị trí/i);
      const emailInput = screen.getByLabelText(/Thư điện tử \(Email\)/i);
      const phoneInput = screen.getByLabelText(/Số điện thoại liên lạc/i);
      const primaryCheckbox = screen.getByLabelText(/Đặt làm Người liên hệ đầu mối chính/i);

      fireEvent.change(nameInput, { target: { value: 'Lê Văn Mới' } });
      fireEvent.change(titleInput, { target: { value: 'Giám đốc Mua hàng' } });
      fireEvent.change(emailInput, { target: { value: 'moi.le@alphatech.vn' } });
      fireEvent.change(phoneInput, { target: { value: '0988 777 666' } });
      fireEvent.click(primaryCheckbox);

      // 3. Submit form
      const submitBtn = screen.getByTestId('btn-submit-contact');
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(customersApi.addCustomerContact).toHaveBeenCalledWith(10, {
          fullName: 'Lê Văn Mới',
          title: 'Giám đốc Mua hàng',
          email: 'moi.le@alphatech.vn',
          phone: '0988 777 666',
          isPrimary: true,
        });
      });

      // 4. Kiểm tra người liên hệ mới xuất hiện ở đầu danh sách và có huy hiệu đầu mối chính
      await waitFor(() => {
        expect(screen.getByTestId('contact-name-3')).toHaveTextContent('Lê Văn Mới');
        expect(screen.getByTestId('badge-primary-3')).toBeInTheDocument();
        expect(screen.getByTestId('stat-primary-name')).toHaveTextContent('Lê Văn Mới');
      });
    });

    it('báo lỗi validation nếu họ tên để trống hoặc email không đúng định dạng', async () => {
      render(
        <ContactList
          customerId={10}
          currentUserRoles={['VT-04']}
          initialContacts={[]}
        />
      );

      fireEvent.click(screen.getByTestId('btn-open-add-contact'));

      // Submit khi form trống
      const submitBtn = screen.getByTestId('btn-submit-contact');
      fireEvent.click(submitBtn);

      expect(screen.getByText('Họ tên người liên hệ không được để trống')).toBeInTheDocument();
      expect(customersApi.addCustomerContact).not.toHaveBeenCalled();

      // Nhập email sai định dạng
      const emailInput = screen.getByLabelText(/Thư điện tử \(Email\)/i);
      fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
      fireEvent.click(submitBtn);

      expect(screen.getByText('Thư điện tử không hợp lệ')).toBeInTheDocument();
    });
  });

  describe('NCL-02-CN-003-TC-02: Dữ liệu trùng lặp / Đổi đầu mối chính', () => {
    it('đánh dấu người thứ hai là đầu mối chính -> hệ thống chuyển người cũ thành đầu mối phụ và giữ duy nhất một đầu mối chính', async () => {
      const updatedPrimaryMock: CustomerContact = {
        id: 2,
        customerId: 10,
        fullName: 'Trần Thị Phụ',
        title: 'Chuyên viên kỹ thuật',
        email: 'phu.tran@alphatech.vn',
        phone: '0912 333 444',
        isPrimary: true,
      };

      vi.mocked(customersApi.setPrimaryCustomerContact).mockResolvedValue(updatedPrimaryMock);

      render(
        <ContactList
          customerId={10}
          currentUserRoles={['VT-04']}
          initialContacts={initialMockContacts}
        />
      );

      // Ban đầu: ID 1 là chính, ID 2 là phụ
      expect(screen.getByTestId('badge-primary-1')).toBeInTheDocument();
      expect(screen.getByTestId('badge-secondary-2')).toBeInTheDocument();

      // Bấm nút "Đặt làm đầu mối chính" trên người thứ hai (ID 2)
      const setPrimaryBtn = screen.getByTestId('btn-set-primary-2');
      fireEvent.click(setPrimaryBtn);

      await waitFor(() => {
        expect(customersApi.setPrimaryCustomerContact).toHaveBeenCalledWith(10, 2);
      });

      // Sau khi cập nhật: ID 2 là chính, ID 1 trở thành phụ
      await waitFor(() => {
        expect(screen.getByTestId('badge-primary-2')).toBeInTheDocument();
        expect(screen.getByTestId('badge-secondary-1')).toBeInTheDocument();
        expect(screen.getByTestId('stat-primary-name')).toHaveTextContent('Trần Thị Phụ');
      });
    });
  });

  describe('NCL-02-CN-003-TC-03: Không có quyền (Phân quyền bảo mật)', () => {
    it('người dùng không có vai trò Nhân viên kinh doanh (VT-04) bị từ chối truy cập và ghi nhận nhật ký', () => {
      render(
        <ContactList
          customerId={10}
          currentUserRoles={['VT-06']} // Vai trò Nhân sự
          currentUserName="Trần Nhân Sự"
          initialContacts={initialMockContacts}
        />
      );

      // Hiển thị giao diện 403 Forbidden Access Denied
      expect(screen.getByTestId('contact-access-denied')).toBeInTheDocument();
      expect(screen.getByText(/Không có quyền quản lý người liên hệ/i)).toBeInTheDocument();
      expect(screen.getByText(/Trần Nhân Sự/i)).toBeInTheDocument();
      expect(screen.queryByTestId('btn-open-add-contact')).toBeNull();
      expect(screen.queryByTestId('contact-table')).toBeNull();
    });

    it('từ chối truy cập đối với vai trò Kế toán (VT-05)', () => {
      render(
        <ContactList
          customerId={10}
          currentUserRoles={['VT-05']}
          initialContacts={initialMockContacts}
        />
      );

      expect(screen.getByTestId('contact-access-denied')).toBeInTheDocument();
    });
  });

  describe('NCL-02-CN-003-TC-04: Lưu lịch sử (Nhật ký thao tác)', () => {
    it('khi thêm người liên hệ -> gọi API tạo (backend ghi vào Nhật ký hệ thống) và cập nhật danh sách', async () => {
      const newContactMock: CustomerContact = {
        id: 4,
        customerId: 10,
        fullName: 'Phạm Nhật Ký',
        isPrimary: false,
      };

      vi.mocked(customersApi.addCustomerContact).mockResolvedValue(newContactMock);

      render(
        <ContactList
          customerId={10}
          customerName="Công ty Cổ phần Alpha Tech"
          currentUserRoles={['VT-04']}
          currentUserName="Nguyễn Sales"
          initialContacts={initialMockContacts}
        />
      );

      // Thêm người liên hệ
      fireEvent.click(screen.getByTestId('btn-open-add-contact'));
      fireEvent.change(screen.getByLabelText(/Họ và tên người liên hệ/i), {
        target: { value: 'Phạm Nhật Ký' },
      });
      fireEvent.click(screen.getByTestId('btn-submit-contact'));

      // Việc ghi nhật ký (người thực hiện / nội dung / thời điểm) do backend đảm nhiệm khi API được gọi.
      await waitFor(() => {
        expect(customersApi.addCustomerContact).toHaveBeenCalledWith(
          10,
          expect.objectContaining({ fullName: 'Phạm Nhật Ký' })
        );
        expect(screen.getByText('Phạm Nhật Ký')).toBeInTheDocument();
      });

      // Không còn thẻ "nhật ký trong phiên" ở màn hình nghiệp vụ.
      expect(screen.queryByTestId('contact-audit-card')).not.toBeInTheDocument();
    });
  });

  describe('Tích hợp trang CustomerDetailPage', () => {
    it('hiển thị đầy đủ thông tin khách hàng và danh sách người liên hệ', () => {
      const onBackMock = vi.fn();
      render(
        <CustomerDetailPage
          customer={mockCustomer}
          currentUserRoles={['VT-04']}
          currentUserName="Nguyễn Sales"
          onBack={onBackMock}
          initialContacts={initialMockContacts}
        />
      );

      expect(screen.getAllByText('Công ty Cổ phần Alpha Tech').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('KH-123456').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByTestId('contact-manager-section')).toBeInTheDocument();

      // Bấm nút quay lại
      fireEvent.click(screen.getByTestId('btn-back-to-customers'));
      expect(onBackMock).toHaveBeenCalledTimes(1);
    });

    it('chuyển đổi qua lại giữa các tab Hồ sơ chi tiết và Người liên hệ', () => {
      render(
        <CustomerDetailPage
          customer={mockCustomer}
          currentUserRoles={['VT-04']}
          initialContacts={initialMockContacts}
          onBack={vi.fn()}
        />
      );

      // Tab Người liên hệ ban đầu
      expect(screen.getByTestId('contact-manager-section')).toBeInTheDocument();

      // Chuyển sang Tab Hồ sơ chi tiết
      fireEvent.click(screen.getByTestId('tab-btn-overview'));
      expect(screen.getByText('Thông tin hành chính doanh nghiệp')).toBeInTheDocument();

      // Không còn tab "Nhật ký kiểm toán" nhúng trong trang (chuyển sang trang /audit-logs riêng).
      expect(screen.queryByTestId('tab-btn-audit')).not.toBeInTheDocument();
    });

    it('NCL-02-CN-004: mở tab "Hồ sơ tổng hợp" gọi API overview (backend ghi nhật ký xem)', async () => {
      render(
        <CustomerDetailPage
          customer={mockCustomer}
          currentUserRoles={['VT-02']}
          currentUserName="Trần Quản Lý"
          initialContacts={initialMockContacts}
          onBack={vi.fn()}
        />
      );

      fireEvent.click(screen.getByTestId('tab-btn-summary'));

      await waitFor(() => {
        expect(customersApi.fetchCustomerOverview).toHaveBeenCalledWith(10);
        expect(screen.getByTestId('customer-summary-empty')).toBeInTheDocument();
      });
    });
  });
});
