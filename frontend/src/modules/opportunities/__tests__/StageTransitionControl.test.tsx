import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import StageTransitionControl from '../components/StageTransitionControl';
import * as opportunitiesApi from '../api/opportunitiesApi';
import type { Opportunity, StageHistoryItem } from '../types/opportunityTypes';

vi.mock('../api/opportunitiesApi', () => ({
  changeOpportunityStage: vi.fn(),
  fetchOpportunityStageHistory: vi.fn(),
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

const mockOpenOpportunity: Opportunity = {
  id: 1,
  name: 'Triển khai ERP cho Công ty ABC',
  customerId: 10,
  customerName: 'Công ty TNHH ABC',
  expectedValue: 500000000,
  expectedCloseDate: '2026-12-31',
  stage: 'APPROACH',
  status: 'OPEN',
  probability: 10,
  ownerId: 3,
  createdBy: 'sale01',
  createdAt: '2026-09-04T09:00:00',
};

const mockNegotiationOpportunity: Opportunity = {
  ...mockOpenOpportunity,
  stage: 'NEGOTIATION',
  probability: 70,
};

const mockClosedWonOpportunity: Opportunity = {
  ...mockOpenOpportunity,
  stage: 'WON',
  status: 'CLOSED',
  probability: 100,
};

const mockHistory: StageHistoryItem[] = [
  {
    id: 2,
    opportunityId: 1,
    fromStage: 'APPROACH',
    toStage: 'PROPOSAL',
    changedByUsername: 'sale01',
    changedAt: '2026-09-04T10:30:00',
  },
  {
    id: 1,
    opportunityId: 1,
    fromStage: null,
    toStage: 'APPROACH',
    changedByUsername: 'sale01',
    changedAt: '2026-09-04T09:00:00',
  },
];

describe('StageTransitionControl Component (NCL-03-CN-002 & FE-QA CV-05)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(opportunitiesApi.fetchOpportunityStageHistory).mockResolvedValue(mockHistory);
  });

  it('TC-01: hiển thị giai đoạn hiện tại và tỷ lệ xác suất trúng tương ứng', () => {
    render(<StageTransitionControl opportunity={mockOpenOpportunity} />);

    expect(screen.getByText(/Giai đoạn: Tiếp cận ban đầu/i)).toBeInTheDocument();
    expect(screen.getAllByText(/10% xác suất/i).length).toBeGreaterThan(0);
  });

  it('TC-02: chuyển sang giai đoạn hợp lệ kế tiếp liền kề (APPROACH -> PROPOSAL)', async () => {
    const handleUpdated = vi.fn();
    const updatedOpp: Opportunity = {
      ...mockOpenOpportunity,
      stage: 'PROPOSAL',
      probability: 40,
    };
    vi.mocked(opportunitiesApi.changeOpportunityStage).mockResolvedValue(updatedOpp);

    render(
      <StageTransitionControl
        opportunity={mockOpenOpportunity}
        onOpportunityUpdated={handleUpdated}
      />
    );

    const advanceBtn = screen.getByRole('button', { name: /Chuyển sang Đề xuất \(40%\)/i });
    expect(advanceBtn).toBeInTheDocument();

    fireEvent.click(advanceBtn);

    await waitFor(() => {
      expect(opportunitiesApi.changeOpportunityStage).toHaveBeenCalledWith(1, 'PROPOSAL');
      expect(handleUpdated).toHaveBeenCalledWith(updatedOpp);
    });
  });

  it('TC-02: khi ở giai đoạn NEGOTIATION, hiển thị lựa chọn chốt WON hoặc LOST', async () => {
    const handleUpdated = vi.fn();
    const wonOpp: Opportunity = {
      ...mockNegotiationOpportunity,
      stage: 'WON',
      status: 'CLOSED',
      probability: 100,
    };
    vi.mocked(opportunitiesApi.changeOpportunityStage).mockResolvedValue(wonOpp);

    render(
      <StageTransitionControl
        opportunity={mockNegotiationOpportunity}
        onOpportunityUpdated={handleUpdated}
      />
    );

    expect(screen.getByRole('button', { name: /Chốt Thành công \(Won\)/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Đóng Thất bại \(Lost\)/i })).toBeInTheDocument();

    // Bấm chốt WON -> mở modal xác nhận
    fireEvent.click(screen.getByRole('button', { name: /Chốt Thành công \(Won\)/i }));

    const confirmBtn = await screen.findByRole('button', { name: /Xác nhận chốt/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(opportunitiesApi.changeOpportunityStage).toHaveBeenCalledWith(1, 'WON');
      expect(handleUpdated).toHaveBeenCalledWith(wonOpp);
    });
  });

  it('TC-03: khóa hoàn toàn chức năng chuyển giai đoạn khi cơ hội đã đóng (status = CLOSED)', () => {
    render(<StageTransitionControl opportunity={mockClosedWonOpportunity} />);

    expect(screen.getByText(/Cơ hội đã đóng \(status = CLOSED\)/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Chuyển sang/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Chốt Thành công/i })).not.toBeInTheDocument();
  });

  it('TC-03: hiển thị cảnh báo phân quyền khi người dùng không mang vai trò VT-04', () => {
    render(
      <StageTransitionControl
        opportunity={mockOpenOpportunity}
        currentUserRoles={['VT-02']} // Quản lý dự án, không phải VT-04
      />
    );

    expect(screen.getByText(/Chức năng chuyển giai đoạn yêu cầu vai trò Nhân viên kinh doanh \(VT-04\)/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Chuyển sang/i })).not.toBeInTheDocument();
  });

  it('TC-02: hiển thị thông báo lỗi từ server khi chuyển giai đoạn không hợp lệ (INVALID_STATE)', async () => {
    const error = new opportunitiesApi.OpportunityApiError(
      'INVALID_STATE',
      'Quy tắc QTN-06: Chuyển giai đoạn không hợp lệ. Không thể nhảy cóc.',
      400
    );
    vi.mocked(opportunitiesApi.changeOpportunityStage).mockRejectedValue(error);

    render(<StageTransitionControl opportunity={mockOpenOpportunity} />);

    fireEvent.click(screen.getByRole('button', { name: /Chuyển sang Đề xuất/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText(/Không thể nhảy cóc/i)).toBeInTheDocument();
    });
  });

  it('TC-05: hiển thị nhật ký lịch sử chuyển giai đoạn khi bấm nút Lịch sử', async () => {
    vi.mocked(opportunitiesApi.fetchOpportunityStageHistory).mockResolvedValue(mockHistory);
    render(<StageTransitionControl opportunity={mockOpenOpportunity} />);

    const historyBtn = screen.getByRole('button', { name: /Lịch sử giai đoạn/i });
    fireEvent.click(historyBtn);

    await waitFor(() => {
      expect(opportunitiesApi.fetchOpportunityStageHistory).toHaveBeenCalledWith(1);
      expect(screen.getByText(/Nhật ký các lần chuyển giai đoạn/i)).toBeInTheDocument();
      expect(screen.getByText(/Khởi tạo ban đầu:/i)).toBeInTheDocument();
      expect(screen.getAllByText(/bởi @sale01/i).length).toBe(2);
    });
  });
});
