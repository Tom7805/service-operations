import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import CustomerMergePage from '../pages/CustomerMergePage';
import CustomerTable from '../components/CustomerTable';
import * as customersApi from '../api/customersApi';
import type { Customer, CustomerMergePreview } from '../types/customerTypes';

vi.mock('../api/customersApi', () => ({
  previewCustomerMerge: vi.fn(),
  mergeCustomers: vi.fn(),
  CustomerApiError: class extends Error {
    constructor(public code: string, message: string, public statusCode?: number) {
      super(message);
      this.name = 'CustomerApiError';
    }
  },
}));

describe('Gộp hai hồ sơ khách hàng trùng (NCL-02-CN-006)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const targetCustomer: Customer = {
    id: 1,
    code: 'KH-000001',
    name: 'Công ty TNHH ABC',
    taxCode: '0101234567',
    phone: '0987654321',
    industry: 'Công nghệ thông tin',
    status: 'ACTIVE',
  };

  const sourceCustomer: Customer = {
    id: 2,
    code: 'KH-000002',
    name: 'Công ty TNHH ABC (chi nhánh)',
    taxCode: '0101234567',
    phone: null,
    industry: null,
    status: 'ACTIVE',
  };

  const mockPreview: CustomerMergePreview = {
    targetCustomer,
    sourceCustomer,
    relatedRecordCount: 3,
  };

  describe('NCL-02-CN-006-TC-01: Luồng thành công (Xem trước rồi xác nhận gộp)', () => {
    it('nhập ID hai hồ sơ, xem trước rồi xác nhận -> hồ sơ giữ lại nhận dữ liệu và hồ sơ bị gộp chuyển trạng thái', async () => {
      vi.mocked(customersApi.previewCustomerMerge).mockResolvedValue(mockPreview);
      vi.mocked(customersApi.mergeCustomers).mockResolvedValue({
        ...targetCustomer,
      });

      render(<CustomerMergePage currentUserRoles={['VT-07']} currentUserName="Quản trị viên A" />);

      fireEvent.change(screen.getByLabelText(/ID hồ sơ giữ lại/i), { target: { value: '1' } });
      fireEvent.change(screen.getByLabelText(/ID hồ sơ bị gộp/i), { target: { value: '2' } });
      fireEvent.click(screen.getByTestId('btn-preview-merge'));

      await waitFor(() => {
        expect(customersApi.previewCustomerMerge).toHaveBeenCalledWith({
          targetCustomerId: 1,
          sourceCustomerId: 2,
        });
      });

      // Hiển thị đúng hai hồ sơ và số bản ghi liên quan sẽ được chuyển
      await waitFor(() => {
        expect(screen.getByTestId('merge-preview-section')).toBeInTheDocument();
      });
      expect(screen.getByTestId('merge-preview-target')).toHaveTextContent('Công ty TNHH ABC');
      expect(screen.getByTestId('merge-preview-source')).toHaveTextContent('Công ty TNHH ABC (chi nhánh)');
      expect(screen.getByTestId('merge-related-record-count')).toHaveTextContent('3');

      fireEvent.click(screen.getByTestId('btn-confirm-merge'));

      await waitFor(() => {
        expect(customersApi.mergeCustomers).toHaveBeenCalledWith({
          targetCustomerId: 1,
          sourceCustomerId: 2,
        });
      });

      await waitFor(() => {
        expect(screen.getByTestId('merge-success-result')).toBeInTheDocument();
        expect(screen.getByText(/Gộp hồ sơ khách hàng thành công/i)).toBeInTheDocument();
      });
    });

    it('bắt buộc nhập đủ và không cho hai ID trùng nhau trước khi xem trước', () => {
      render(<CustomerMergePage currentUserRoles={['VT-07']} />);

      fireEvent.click(screen.getByTestId('btn-preview-merge'));
      expect(screen.getByText(/Phải chọn ID hồ sơ giữ lại/i)).toBeInTheDocument();
      expect(screen.getByText(/Phải chọn ID hồ sơ bị gộp/i)).toBeInTheDocument();
      expect(customersApi.previewCustomerMerge).not.toHaveBeenCalled();

      fireEvent.change(screen.getByLabelText(/ID hồ sơ giữ lại/i), { target: { value: '5' } });
      fireEvent.change(screen.getByLabelText(/ID hồ sơ bị gộp/i), { target: { value: '5' } });
      fireEvent.click(screen.getByTestId('btn-preview-merge'));

      expect(screen.getByText(/không được trùng nhau/i)).toBeInTheDocument();
      expect(customersApi.previewCustomerMerge).not.toHaveBeenCalled();
    });
  });

  describe('NCL-02-CN-006-TC-02: Ngoại lệ (Vẫn gộp dù còn dữ liệu liên quan chưa xử lý xong)', () => {
    it('vẫn cho xác nhận gộp ngay cả khi hồ sơ bị gộp còn nhiều bản ghi liên quan', async () => {
      vi.mocked(customersApi.previewCustomerMerge).mockResolvedValue({
        ...mockPreview,
        relatedRecordCount: 12,
      });
      vi.mocked(customersApi.mergeCustomers).mockResolvedValue(targetCustomer);

      render(<CustomerMergePage currentUserRoles={['VT-07']} currentUserName="Quản trị viên A" />);

      fireEvent.change(screen.getByLabelText(/ID hồ sơ giữ lại/i), { target: { value: '1' } });
      fireEvent.change(screen.getByLabelText(/ID hồ sơ bị gộp/i), { target: { value: '2' } });
      fireEvent.click(screen.getByTestId('btn-preview-merge'));

      await waitFor(() => {
        expect(screen.getByTestId('merge-related-record-count')).toHaveTextContent('12');
      });

      // Nút xác nhận không bị khoá lại chỉ vì còn nhiều bản ghi liên quan
      const confirmBtn = screen.getByTestId('btn-confirm-merge');
      expect(confirmBtn).not.toBeDisabled();

      fireEvent.click(confirmBtn);

      await waitFor(() => {
        expect(customersApi.mergeCustomers).toHaveBeenCalledWith({
          targetCustomerId: 1,
          sourceCustomerId: 2,
        });
      });
    });
  });

  describe('NCL-02-CN-006-TC-03: Không có quyền truy cập', () => {
    it('từ chối truy cập chức năng gộp hồ sơ khi người dùng không phải Quản trị viên', () => {
      render(<CustomerMergePage currentUserRoles={['VT-04']} />);

      expect(screen.getByTestId('merge-access-denied')).toBeInTheDocument();
      expect(screen.getByText(/Bạn không có thẩm quyền gộp hồ sơ khách hàng/i)).toBeInTheDocument();
      expect(screen.queryByTestId('btn-preview-merge')).toBeNull();
    });

    it('cho phép Quản trị viên (VT-07) truy cập chức năng gộp hồ sơ', () => {
      render(<CustomerMergePage currentUserRoles={['VT-07']} />);

      expect(screen.queryByTestId('merge-access-denied')).toBeNull();
      expect(screen.getByTestId('btn-preview-merge')).toBeInTheDocument();
    });
  });

  describe('NCL-02-CN-006-TC-04: Lưu lịch sử (Nhật ký thao tác)', () => {
    it('khi có thao tác gộp hồ sơ -> hệ thống ghi lại người thực hiện, nội dung và thời điểm', async () => {
      vi.mocked(customersApi.previewCustomerMerge).mockResolvedValue(mockPreview);
      vi.mocked(customersApi.mergeCustomers).mockResolvedValue(targetCustomer);

      render(<CustomerMergePage currentUserRoles={['VT-07']} currentUserName="Trần Quản Trị" />);

      fireEvent.change(screen.getByLabelText(/ID hồ sơ giữ lại/i), { target: { value: '1' } });
      fireEvent.change(screen.getByLabelText(/ID hồ sơ bị gộp/i), { target: { value: '2' } });
      fireEvent.click(screen.getByTestId('btn-preview-merge'));
      await waitFor(() => expect(screen.getByTestId('merge-preview-section')).toBeInTheDocument());

      fireEvent.click(screen.getByTestId('btn-confirm-merge'));

      await waitFor(() => {
        expect(screen.getByTestId('merge-audit-card')).toBeInTheDocument();
        expect(screen.getByText(/Trần Quản Trị/i)).toBeInTheDocument();
        expect(screen.getByText(/Đã gộp hồ sơ KH-000002/i)).toBeInTheDocument();
      });
    });
  });

  describe('Xử lý lỗi từ máy chủ', () => {
    it('hiển thị lỗi khi xem trước thất bại (ví dụ hồ sơ đã bị gộp từ trước)', async () => {
      vi.mocked(customersApi.previewCustomerMerge).mockRejectedValue(
        new customersApi.CustomerApiError(
          'INVALID_STATE',
          'Ho so KH-000002 da duoc gop truoc do, khong the tiep tuc su dung',
          400
        )
      );

      render(<CustomerMergePage currentUserRoles={['VT-07']} />);

      fireEvent.change(screen.getByLabelText(/ID hồ sơ giữ lại/i), { target: { value: '1' } });
      fireEvent.change(screen.getByLabelText(/ID hồ sơ bị gộp/i), { target: { value: '2' } });
      fireEvent.click(screen.getByTestId('btn-preview-merge'));

      await waitFor(() => {
        expect(screen.getByTestId('merge-server-error')).toHaveTextContent(/da duoc gop truoc do/i);
      });
      expect(screen.queryByTestId('merge-preview-section')).toBeNull();
    });
  });

  describe('Hiển thị trạng thái "Đã gộp" trên bảng danh sách khách hàng', () => {
    it('gắn nhãn "Đã gộp" và khoá thao tác tiếp với hồ sơ có status MERGED', () => {
      const mergedCustomer: Customer = {
        id: 2,
        code: 'KH-000002',
        name: 'Công ty TNHH ABC (chi nhánh)',
        status: 'MERGED',
        mergedIntoId: 1,
      };

      render(
        <CustomerTable
          customers={[mergedCustomer]}
          canManageSegment
          onOpenSegment={vi.fn()}
          onNavigateDetail={vi.fn()}
        />
      );

      expect(screen.getByTestId('merged-badge-2')).toHaveTextContent('Đã gộp');
      expect(screen.getByTestId('btn-manage-contacts-2')).toBeDisabled();
      expect(screen.getByTestId('btn-open-segment-2')).toBeDisabled();
    });

    it('không hiển thị nhãn "Đã gộp" với hồ sơ đang hoạt động bình thường', () => {
      const activeCustomer: Customer = {
        id: 1,
        code: 'KH-000001',
        name: 'Công ty TNHH ABC',
        status: 'ACTIVE',
      };

      render(<CustomerTable customers={[activeCustomer]} canManageSegment onOpenSegment={vi.fn()} />);

      expect(screen.queryByTestId('merged-badge-1')).toBeNull();
    });
  });
});
