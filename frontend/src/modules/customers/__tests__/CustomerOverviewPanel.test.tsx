import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import CustomerOverviewPanel from '../components/CustomerOverviewPanel';
import * as customersApi from '../api/customersApi';
import type { CustomerOverview } from '../types/customerTypes';

vi.mock('../api/customersApi', () => ({
  fetchCustomerOverview: vi.fn(),
  CustomerApiError: class extends Error {
    constructor(public code: string, message: string, public statusCode?: number) {
      super(message);
      this.name = 'CustomerApiError';
    }
  },
}));

const baseCustomer = {
  id: 10,
  code: 'KH-000010',
  name: 'Công ty Cổ phần Alpha',
  taxCode: '0101234567',
  phone: '0987654321',
  industry: 'Phần mềm',
  address: 'Hà Nội',
  createdAt: '2026-01-01T08:00:00',
};

const fullOverview: CustomerOverview = {
  customer: baseCustomer,
  opportunities: [
    { id: 1, code: 'CH-001', name: 'Cơ hội triển khai ERP', status: 'WON', amount: 500_000_000, date: '2026-02-10' },
  ],
  contracts: [
    { id: 2, code: 'HD-001', name: 'Hợp đồng triển khai ERP', status: 'ACTIVE', amount: 480_000_000, date: '2026-03-01' },
  ],
  projects: [
    { id: 3, code: 'DA-001', name: 'Dự án ERP giai đoạn 1', status: 'RUNNING', amount: null, date: '2026-03-15' },
  ],
  invoices: [
    { id: 4, code: 'HDon-001', name: 'Hóa đơn đợt 1', status: 'PAID', amount: 200_000_000, date: '2026-04-05' },
  ],
  receivables: [
    { id: 5, code: 'HDon-002', name: 'Hóa đơn đợt 2', status: 'OVERDUE', amount: 120_000_000, date: '2026-05-20' },
  ],
};

const emptyOverview: CustomerOverview = {
  customer: baseCustomer,
  opportunities: [],
  contracts: [],
  projects: [],
  invoices: [],
  receivables: [],
};

describe('CustomerOverviewPanel (NCL-02-CN-004)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('TC-01: hiển thị đủ cơ hội, hợp đồng, dự án, hóa đơn, công nợ và dòng thời gian theo thứ tự ngày', async () => {
    vi.mocked(customersApi.fetchCustomerOverview).mockResolvedValue(fullOverview);

    render(<CustomerOverviewPanel customerId={10} customerName="Công ty Cổ phần Alpha" currentUserRoles={['VT-02']} />);

    expect(customersApi.fetchCustomerOverview).toHaveBeenCalledWith(10);

    await waitFor(() => {
      expect(screen.getByTestId('customer-summary-panel')).toBeInTheDocument();
    });

    // Đủ 5 nhóm chi tiết, mỗi nhóm có đúng bản ghi của nó
    for (const key of ['opportunities', 'contracts', 'projects', 'invoices', 'receivables']) {
      expect(screen.getByTestId(`customer-summary-section-${key}`)).toBeInTheDocument();
    }
    expect(
      within(screen.getByTestId('customer-summary-section-opportunities')).getByText('Cơ hội triển khai ERP')
    ).toBeInTheDocument();
    expect(
      within(screen.getByTestId('customer-summary-section-contracts')).getByText('Hợp đồng triển khai ERP')
    ).toBeInTheDocument();
    expect(
      within(screen.getByTestId('customer-summary-section-projects')).getByText('Dự án ERP giai đoạn 1')
    ).toBeInTheDocument();

    // Dòng thời gian hợp nhất: 5 mục, sắp tăng dần theo ngày (02/2026 -> 05/2026)
    const timeline = screen.getByTestId('customer-summary-timeline');
    const rows = within(timeline).getAllByRole('listitem');
    expect(rows).toHaveLength(5);
    expect(rows[0]).toHaveTextContent('10/02/2026');
    expect(rows[0]).toHaveTextContent('Cơ hội triển khai ERP');
    expect(rows[4]).toHaveTextContent('20/05/2026');
  });

  it('TC-03: gọi onLoaded để trang cha ghi vào nhật ký sau khi tải xong', async () => {
    vi.mocked(customersApi.fetchCustomerOverview).mockResolvedValue(fullOverview);
    const onLoaded = vi.fn();

    render(
      <CustomerOverviewPanel customerId={10} customerName="Công ty Cổ phần Alpha" onLoaded={onLoaded} />
    );

    await waitFor(() => expect(onLoaded).toHaveBeenCalledTimes(1));
    expect(onLoaded.mock.calls[0][0]).toMatchObject({ itemCount: 5 });
    expect(typeof onLoaded.mock.calls[0][0].at).toBe('string');
  });

  it('TC-02: hiển thị thông báo giới hạn phạm vi khi Backend trả 403', async () => {
    vi.mocked(customersApi.fetchCustomerOverview).mockRejectedValue(
      new customersApi.CustomerApiError('FORBIDDEN', 'Bạn không có quyền thực hiện thao tác này.', 403)
    );

    render(<CustomerOverviewPanel customerId={10} customerName="Công ty Cổ phần Alpha" currentUserRoles={['VT-05']} />);

    await waitFor(() => {
      expect(screen.getByTestId('customer-summary-forbidden')).toBeInTheDocument();
    });
    expect(screen.getByText(/không có quyền xem hồ sơ tổng hợp/i)).toBeInTheDocument();
    expect(screen.getByText(/QTN-01/)).toBeInTheDocument();
  });

  it('hiển thị trạng thái "không tìm thấy" khi Backend trả 404', async () => {
    vi.mocked(customersApi.fetchCustomerOverview).mockRejectedValue(
      new customersApi.CustomerApiError('RESOURCE_NOT_FOUND', 'Khong tim thay ho so khach hang', 404)
    );

    render(<CustomerOverviewPanel customerId={999} customerName="Không tồn tại" />);

    await waitFor(() => {
      expect(screen.getByTestId('customer-summary-notfound')).toBeInTheDocument();
    });
  });

  it('hiển thị trạng thái rỗng khi khách hàng chưa phát sinh nghiệp vụ nào', async () => {
    vi.mocked(customersApi.fetchCustomerOverview).mockResolvedValue(emptyOverview);

    render(<CustomerOverviewPanel customerId={10} customerName="Công ty Cổ phần Alpha" />);

    await waitFor(() => {
      expect(screen.getByTestId('customer-summary-empty')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('customer-summary-timeline')).toBeNull();
  });

  it('hiển thị lỗi kèm nút "Thử lại" khi lỗi mạng, bấm lại thì tải được', async () => {
    vi.mocked(customersApi.fetchCustomerOverview).mockRejectedValueOnce(
      new customersApi.CustomerApiError('NETWORK_ERROR', 'Không thể kết nối đến máy chủ Backend.', 503)
    );

    render(<CustomerOverviewPanel customerId={10} customerName="Công ty Cổ phần Alpha" />);

    await waitFor(() => {
      expect(screen.getByTestId('customer-summary-error')).toBeInTheDocument();
      expect(screen.getByText('Không thể kết nối đến máy chủ Backend.')).toBeInTheDocument();
    });

    vi.mocked(customersApi.fetchCustomerOverview).mockResolvedValueOnce(fullOverview);
    fireEvent.click(screen.getByRole('button', { name: /Thử lại/i }));

    await waitFor(() => {
      expect(screen.getByTestId('customer-summary-panel')).toBeInTheDocument();
    });
    expect(customersApi.fetchCustomerOverview).toHaveBeenCalledTimes(2);
  });
});
