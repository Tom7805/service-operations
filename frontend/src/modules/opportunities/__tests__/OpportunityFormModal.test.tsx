import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import OpportunityFormModal from '../components/OpportunityFormModal';
import * as opportunitiesApi from '../api/opportunitiesApi';
import type { CustomerOption, Opportunity } from '../types/opportunityTypes';

vi.mock('../api/opportunitiesApi', () => ({
  createOpportunity: vi.fn(),
  fetchCustomersForSelect: vi.fn(),
  OpportunityApiError: class extends Error {
    constructor(
      public code: string,
      message: string,
      public statusCode?: number,
      public fieldErrors?: Array<{ field: string; message: string }>
    ) {
      super(message);
      this.name = 'OpportunityApiError';
    }
  },
}));

const mockCustomers: CustomerOption[] = [
  { id: 1, code: 'KH-000001', name: 'Công ty TNHH Giải Pháp Công Nghệ ABC' },
  { id: 2, code: 'KH-000002', name: 'Tập đoàn Sản xuất & Phân phối Toàn Cầu XYZ' },
];

const mockCreatedOpportunity: Opportunity = {
  id: 101,
  name: 'Triển khai hệ thống ERP',
  customerId: 1,
  customerName: 'Công ty TNHH Giải Pháp Công Nghệ ABC',
  expectedValue: 500000000,
  expectedCloseDate: '2026-12-31',
  stage: 'APPROACH',
  status: 'OPEN',
  ownerId: 3,
  createdBy: 'sale01',
  createdAt: '2026-09-04T09:00:00',
};

describe('OpportunityFormModal Component (NCL-03-CN-001 & FE-QA CV-05)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(opportunitiesApi.fetchCustomersForSelect).mockResolvedValue(mockCustomers);
  });

  it('không hiển thị giao diện khi isOpen = false', () => {
    render(<OpportunityFormModal isOpen={false} onClose={vi.fn()} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('hiển thị đầy đủ các trường và nhãn quy định khi isOpen = true', async () => {
    render(<OpportunityFormModal isOpen={true} onClose={vi.fn()} initialCustomerList={mockCustomers} />);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Tạo cơ hội bán hàng/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Tên cơ hội/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Khách hàng/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Giá trị dự kiến/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Ngày dự kiến chốt/i)).toBeInTheDocument();

    // Hiển thị badge giai đoạn tiếp cận và trạng thái đang xử lý mặc định
    expect(screen.getByText(/Tiếp cận \(APPROACH\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Đang xử lý \(OPEN\)/i)).toBeInTheDocument();
  });

  it('tự động tải danh sách khách hàng có sẵn vào dropdown (TC-01)', async () => {
    render(<OpportunityFormModal isOpen={true} onClose={vi.fn()} />);

    await waitFor(() => {
      expect(opportunitiesApi.fetchCustomersForSelect).toHaveBeenCalledTimes(1);
    });

    const select = screen.getByLabelText(/Khách hàng/i) as HTMLSelectElement;
    await waitFor(() => {
      expect(select.options.length).toBeGreaterThan(1);
    });
    expect(screen.getByText('[KH-000001] Công ty TNHH Giải Pháp Công Nghệ ABC')).toBeInTheDocument();
  });

  it('hiển thị lỗi tải danh sách khách hàng (không nuốt lỗi) thay vì thông báo "chưa có khách hàng"', async () => {
    vi.mocked(opportunitiesApi.fetchCustomersForSelect).mockRejectedValueOnce(
      new opportunitiesApi.OpportunityApiError('FORBIDDEN', 'Bạn không đủ quyền xem danh sách khách hàng.', 403)
    );

    render(<OpportunityFormModal isOpen={true} onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Bạn không đủ quyền xem danh sách khách hàng.')).toBeInTheDocument();
    });
    expect(screen.queryByText(/Chưa tìm thấy khách hàng nào/i)).not.toBeInTheDocument();
  });

  it('báo lỗi validation khi để trống các trường bắt buộc và bấm submit', async () => {
    render(<OpportunityFormModal isOpen={true} onClose={vi.fn()} initialCustomerList={mockCustomers} />);

    const submitBtn = screen.getByRole('button', { name: /Tạo cơ hội bán hàng/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText('Tên cơ hội không được để trống')).toBeInTheDocument();
      expect(screen.getByText('Vui lòng chọn khách hàng cho cơ hội bán hàng')).toBeInTheDocument();
      expect(screen.getByText('Giá trị dự kiến không được để trống')).toBeInTheDocument();
    });

    expect(opportunitiesApi.createOpportunity).not.toHaveBeenCalled();
  });

  it('tự động format số tiền phân cách hàng nghìn và hiển thị chữ diễn giải VNĐ', async () => {
    render(<OpportunityFormModal isOpen={true} onClose={vi.fn()} initialCustomerList={mockCustomers} />);

    const valueInput = screen.getByLabelText(/Giá trị dự kiến/i);
    fireEvent.change(valueInput, { target: { value: '500000000' } });

    expect((valueInput as HTMLInputElement).value).toBe('500.000.000');
    expect(screen.getByText(/Bằng chữ: Năm trăm triệu đồng/i)).toBeInTheDocument();
  });

  it('luồng thành công: gửi payload chính xác, gọi callback onSuccess và đóng modal', async () => {
    const handleClose = vi.fn();
    const handleSuccess = vi.fn();
    vi.mocked(opportunitiesApi.createOpportunity).mockResolvedValue(mockCreatedOpportunity);

    render(
      <OpportunityFormModal
        isOpen={true}
        onClose={handleClose}
        onSuccess={handleSuccess}
        initialCustomerList={mockCustomers}
      />
    );

    // Điền form
    fireEvent.change(screen.getByLabelText(/Tên cơ hội/i), {
      target: { value: 'Triển khai hệ thống ERP' },
    });
    fireEvent.change(screen.getByLabelText(/Khách hàng/i), {
      target: { value: '1' },
    });
    fireEvent.change(screen.getByLabelText(/Giá trị dự kiến/i), {
      target: { value: '500000000' },
    });
    fireEvent.change(screen.getByLabelText(/Ngày dự kiến chốt/i), {
      target: { value: '2026-12-31' },
    });

    const submitBtn = screen.getByRole('button', { name: /Tạo cơ hội bán hàng/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(opportunitiesApi.createOpportunity).toHaveBeenCalledWith({
        name: 'Triển khai hệ thống ERP',
        customerId: 1,
        expectedValue: 500000000,
        expectedCloseDate: '2026-12-31',
        ownerId: null,
      });
      expect(handleSuccess).toHaveBeenCalledWith(mockCreatedOpportunity);
      expect(handleClose).toHaveBeenCalled();
    });
  });

  it('xử lý ngoại lệ 403 FORBIDDEN (TC-03): hiển thị cảnh báo phân quyền khi không phải VT-04', async () => {
    const forbiddenError = new opportunitiesApi.OpportunityApiError(
      'FORBIDDEN',
      'Bạn không có quyền thực hiện thao tác này. Chức năng tạo cơ hội bán hàng yêu cầu vai trò Nhân viên kinh doanh (VT-04).',
      403
    );
    vi.mocked(opportunitiesApi.createOpportunity).mockRejectedValue(forbiddenError);

    render(<OpportunityFormModal isOpen={true} onClose={vi.fn()} initialCustomerList={mockCustomers} />);

    fireEvent.change(screen.getByLabelText(/Tên cơ hội/i), {
      target: { value: 'Thử nghiệm tạo cơ hội' },
    });
    fireEvent.change(screen.getByLabelText(/Khách hàng/i), {
      target: { value: '1' },
    });
    fireEvent.change(screen.getByLabelText(/Giá trị dự kiến/i), {
      target: { value: '100000000' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Tạo cơ hội bán hàng/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText(/yêu cầu vai trò Nhân viên kinh doanh \(VT-04\)/i)).toBeInTheDocument();
    });
  });

  it('xử lý ngoại lệ 404 RESOURCE_NOT_FOUND (TC-01): hiển thị thông báo hồ sơ khách hàng không tồn tại', async () => {
    const notFoundError = new opportunitiesApi.OpportunityApiError(
      'RESOURCE_NOT_FOUND',
      'Không tìm thấy hồ sơ khách hàng trong hệ thống (TC-01).',
      404
    );
    vi.mocked(opportunitiesApi.createOpportunity).mockRejectedValue(notFoundError);

    render(<OpportunityFormModal isOpen={true} onClose={vi.fn()} initialCustomerList={mockCustomers} />);

    fireEvent.change(screen.getByLabelText(/Tên cơ hội/i), {
      target: { value: 'Thử nghiệm cơ hội' },
    });
    fireEvent.change(screen.getByLabelText(/Khách hàng/i), {
      target: { value: '1' },
    });
    fireEvent.change(screen.getByLabelText(/Giá trị dự kiến/i), {
      target: { value: '100000000' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Tạo cơ hội bán hàng/i }));

    await waitFor(() => {
      expect(screen.getByText(/Không tìm thấy hồ sơ khách hàng trong hệ thống/i)).toBeInTheDocument();
    });
  });

  it('đóng modal khi người dùng bấm nút Hủy bỏ hoặc nút Đóng (X)', () => {
    const handleClose = vi.fn();
    render(<OpportunityFormModal isOpen={true} onClose={handleClose} initialCustomerList={mockCustomers} />);

    const cancelBtn = screen.getByRole('button', { name: /Hủy bỏ/i });
    fireEvent.click(cancelBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);

    const closeIconBtn = screen.getByLabelText(/Đóng cửa sổ/i);
    fireEvent.click(closeIconBtn);
    expect(handleClose).toHaveBeenCalledTimes(2);
  });
});
