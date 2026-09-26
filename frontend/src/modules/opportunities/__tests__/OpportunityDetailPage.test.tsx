import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import OpportunityDetailPage from '../pages/OpportunityDetailPage';
import * as opportunitiesApi from '../api/opportunitiesApi';

vi.mock('../api/opportunitiesApi', () => ({
  fetchOpportunity: vi.fn(),
  fetchOpportunityActivities: vi.fn(),
  createOpportunityActivity: vi.fn(),
  OpportunityApiError: class extends Error {
    constructor(public code: string, message: string, public statusCode?: number) {
      super(message);
      this.name = 'OpportunityApiError';
    }
  },
}));

describe('Opportunity care activity frontend', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(opportunitiesApi.fetchOpportunity).mockResolvedValue({
      id: 15,
      name: 'Cơ hội triển khai ERP',
      customerId: 10,
      customerName: 'Công ty ABC',
      expectedValue: 500000000,
      stage: 'SURVEY',
      status: 'OPEN',
      probability: 25,
    });
  });

  it('loads activity timeline and allows sales user to add a new activity', async () => {
    vi.mocked(opportunitiesApi.fetchOpportunityActivities).mockResolvedValue([
      {
        id: 7,
        opportunityId: 15,
        activityType: 'CALL',
        occurredAt: '2026-01-14T09:00:00',
        participants: 'Nguyễn Huy',
        content: 'Khách hàng xác nhận cần demo tiếp theo.',
        createdBy: 'sales01',
        createdAt: '2026-01-14T09:15:00',
      },
    ]);

    vi.mocked(opportunitiesApi.createOpportunityActivity).mockResolvedValue({
      id: 9,
      opportunityId: 15,
      activityType: 'MEETING',
      occurredAt: '2026-01-15T15:00:00',
      participants: 'Nguyễn Huy, Anh Lan',
      content: 'Đã thống nhất lịch họp demo ERP.',
      createdBy: 'sales01',
      createdAt: '2026-01-15T15:01:00',
    });

    render(
      <OpportunityDetailPage
        opportunityId={15}
        opportunityName="Cơ hội triển khai ERP"
        opportunityStatus="OPEN"
        currentUserRoles={['VT-04']}
        currentUserName="sales01"
      />
    );

    expect(await screen.findByText(/Khách hàng xác nhận cần demo tiếp theo/i)).toBeInTheDocument();
    // Trạng thái, giai đoạn và khách hàng lấy trực tiếp từ GET /opportunities/{id}.
    expect(opportunitiesApi.fetchOpportunity).toHaveBeenCalledWith(15);
    expect(screen.getByTestId('opportunity-summary-line')).toHaveTextContent(/Khảo sát nhu cầu/);
    expect(screen.getByText('Công ty ABC')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Loại hoạt động/i), { target: { value: 'MEETING' } });
    fireEvent.change(screen.getByLabelText(/Thời điểm/i), { target: { value: '2026-01-15T15:00' } });
    fireEvent.change(screen.getByLabelText(/Người tham gia/i), { target: { value: 'Nguyễn Huy, Anh Lan' } });
    fireEvent.change(screen.getByLabelText(/Nội dung trao đổi/i), { target: { value: 'Đã thống nhất lịch họp demo ERP.' } });
    fireEvent.click(screen.getByRole('button', { name: /Lưu hoạt động/i }));

    await waitFor(() => {
      expect(opportunitiesApi.createOpportunityActivity).toHaveBeenCalledWith(15, {
        activityType: 'MEETING',
        occurredAt: '2026-01-15T15:00',
        participants: 'Nguyễn Huy, Anh Lan',
        content: 'Đã thống nhất lịch họp demo ERP.',
      });
    });

    expect(await screen.findByText(/Đã thống nhất lịch họp demo ERP/i)).toBeInTheDocument();
  });

  it('keeps historical activity visible and blocks add action when opportunity is closed', async () => {
    // Máy chủ báo cơ hội đã đóng dù màn hình được mở với trạng thái mặc định khác.
    vi.mocked(opportunitiesApi.fetchOpportunity).mockResolvedValue({
      id: 21,
      name: 'Cơ hội đã đóng',
      customerId: 10,
      expectedValue: 100000000,
      stage: 'LOST',
      status: 'CLOSED',
      probability: 0,
    });
    vi.mocked(opportunitiesApi.fetchOpportunityActivities).mockResolvedValue([
      {
        id: 3,
        opportunityId: 21,
        activityType: 'EMAIL',
        occurredAt: '2026-02-01T11:30:00',
        participants: 'Kế toán',
        content: 'Gửi email xác nhận tiến độ.',
        createdBy: 'sales01',
        createdAt: '2026-02-01T11:35:00',
      },
    ]);

    render(
      <OpportunityDetailPage
        opportunityId={21}
        opportunityName="Cơ hội đã đóng"
        opportunityStatus="OPEN"
        currentUserRoles={['VT-04']}
      />
    );

    expect(await screen.findByText(/Gửi email xác nhận tiến độ/i)).toBeInTheDocument();
    expect(screen.getByTestId('activity-readonly-banner')).toHaveTextContent(/đã đóng/i);
    expect(screen.queryByRole('button', { name: /Lưu hoạt động/i })).not.toBeInTheDocument();
    expect(opportunitiesApi.createOpportunityActivity).not.toHaveBeenCalled();
  });

  it('blocks creation when the user does not have VT-04 role', async () => {
    vi.mocked(opportunitiesApi.fetchOpportunityActivities).mockResolvedValue([]);

    render(
      <OpportunityDetailPage
        opportunityId={30}
        opportunityName="Cơ hội demo"
        opportunityStatus="OPEN"
        currentUserRoles={['VT-02']}
      />
    );

    expect(await screen.findByTestId('activity-access-denied')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Lưu hoạt động/i })).not.toBeInTheDocument();
    // TC-03: vẫn gửi request thật để máy chủ từ chối và ghi nhật ký lần từ chối.
    expect(opportunitiesApi.fetchOpportunityActivities).toHaveBeenCalledWith(30);
    expect(opportunitiesApi.createOpportunityActivity).not.toHaveBeenCalled();
  });
});
