import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PlannedVsActualPage from '../pages/PlannedVsActualPage';
import * as profitabilityApi from '../api/profitabilityApi';
import * as projectsApi from '../../projects/api/projectsApi';
import type { ProjectRes } from '../../projects/types/projectTypes';
import type { PlannedVsActualMarginRes } from '../types/profitabilityTypes';

vi.mock('../api/profitabilityApi', () => {
  class MockProfitabilityApiError extends Error {
    constructor(
      public readonly code: string,
      message: string,
      public readonly statusCode?: number
    ) {
      super(message);
      this.name = 'ProfitabilityApiError';
    }
  }

  return {
    getPlannedVsActualMargin: vi.fn(),
    ProfitabilityApiError: MockProfitabilityApiError,
  };
});

vi.mock('../../projects/api/projectsApi', () => {
  class MockProjectsApiError extends Error {
    constructor(
      public readonly code: string,
      message: string,
      public readonly statusCode?: number
    ) {
      super(message);
      this.name = 'ProjectsApiError';
    }
  }

  return {
    getProject: vi.fn(),
    ProjectsApiError: MockProjectsApiError,
  };
});

const RUNNING_PROJECT: ProjectRes = {
  id: 1,
  projectCode: 'PRJ-2026-001',
  name: 'Triển khai CRM cho Khách hàng Alpha',
  contractId: 10,
  customerId: 100,
  projectType: 'STANDARD',
  limitValue: null,
  startDate: '2026-05-01',
  expectedEndDate: '2026-12-31',
  projectManagerId: 5,
  status: 'RUNNING',
  createdAt: '2026-05-01T08:00:00',
};

// Dữ liệu đúng theo TC-01 của backend: dự án dự kiến lãi 30%, thực tế 18% → chênh lệch -12 điểm %.
const MARGIN_DATA: PlannedVsActualMarginRes = {
  projectId: 42,
  quoteId: 7,
  quoteVersion: 2,
  plannedWorkDays: 20.0,
  plannedRevenue: 100000000.0,
  plannedCost: 70000000.0,
  plannedMargin: 30000000.0,
  plannedMarginPercent: 30.0,
  actualHours: 178.0,
  actualRevenue: 100000000.0,
  actualCost: 82000000.0,
  actualMargin: 18000000.0,
  actualMarginPercent: 18.0,
  marginGapPercentPoints: -12.0,
  hoursVarianceVsPlanned: 18.0,
  gapReasons: [
    'Giờ công thực tế vượt kế hoạch 18.00 giờ (tương đương 2,25 ngày công).',
    'Chi phí giờ công thực tế trung bình (460674,16/giờ) cao hơn dự kiến (437500,00/giờ).',
  ],
  missingPlannedCostItemCount: 0,
  missingActualCostEntryCount: 0,
  missingActualRevenueEntryCount: 0,
};

describe('PlannedVsActualPage (NCL-09-CN-006 — So sánh biên lợi nhuận dự kiến với thực tế)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // TC-03: người dùng không thuộc vai trò Quản lý dự án (VT-02) bị từ chối. Backend trả 403 FORBIDDEN.
  it.each(['VT-01', 'VT-03', 'VT-04', 'VT-05', 'VT-06', 'VT-07'])(
    'từ chối truy cập cho vai trò %s (chỉ VT-02 được xem)',
    (role) => {
      render(<PlannedVsActualPage projectId={42} currentUserRoles={[role]} />);
      expect(screen.getByTestId('planned-vs-actual-forbidden')).toBeInTheDocument();
      expect(profitabilityApi.getPlannedVsActualMargin).not.toHaveBeenCalled();
    }
  );

  // TC-01: PM xem được so sánh biên dự kiến vs thực tế.
  it('VT-02 tải và hiển thị so sánh biên dự kiến (30%) với thực tế (18%), chênh lệch -12 điểm %', async () => {
    vi.mocked(projectsApi.getProject).mockResolvedValue(RUNNING_PROJECT);
    vi.mocked(profitabilityApi.getPlannedVsActualMargin).mockResolvedValue(MARGIN_DATA);

    render(<PlannedVsActualPage projectId={42} currentUserRoles={['VT-02']} />);

    expect(await screen.findByTestId('planned-vs-actual-page')).toBeInTheDocument();

    // Thông tin báo giá nguồn dữ liệu
    const quoteSource = screen.getByTestId('quote-source');
    expect(quoteSource).toHaveTextContent('#7');
    expect(quoteSource).toHaveTextContent('2');

    // Biên lợi nhuận dự kiến vs thực tế
    const percentCard = screen.getByTestId('kpi-margin-percent');
    expect(percentCard).toHaveTextContent('30,00 %');
    expect(percentCard).toHaveTextContent('18,00 %');

    // Chênh lệch âm → đỏ
    const gap = screen.getByTestId('margin-gap');
    expect(gap).toHaveTextContent('-12,00 %');

    // Doanh thu / chi phí / lợi nhuận dự kiến vs thực tế
    expect(screen.getByTestId('kpi-revenue')).toHaveTextContent('100.000.000 ₫');
    expect(screen.getByTestId('kpi-cost')).toHaveTextContent('70.000.000 ₫');
    expect(screen.getByTestId('kpi-cost')).toHaveTextContent('82.000.000 ₫');
    expect(screen.getByTestId('kpi-margin')).toHaveTextContent('30.000.000 ₫');

    // Nguyên nhân chênh lệch
    expect(screen.getByTestId('gap-reason-0')).toHaveTextContent('Giờ công thực tế vượt kế hoạch');
    expect(screen.getByTestId('gap-reason-1')).toHaveTextContent('Chi phí giờ công thực tế');

    // Chênh lệch giờ công: 20 ngày × 8 = 160 giờ dự kiến, 178 giờ thực tế, +18 giờ
    expect(screen.getByTestId('planned-hours')).toHaveTextContent('160,00');
    expect(screen.getByTestId('actual-hours')).toHaveTextContent('178,00');
    expect(screen.getByTestId('hours-variance')).toHaveTextContent('+18,00');
  });

  // TC-02: dự án chưa gán báo giá nào (qua hợp đồng) → backend 404 RESOURCE_NOT_FOUND.
  it('khi dự án chưa có báo giá gắn (404 RESOURCE_NOT_FOUND) hiển thị trạng thái chưa có báo giá', async () => {
    vi.mocked(profitabilityApi.getPlannedVsActualMargin).mockRejectedValue(
      new profitabilityApi.ProfitabilityApiError(
        'RESOURCE_NOT_FOUND',
        'Dự án chưa có báo giá nào gắn kèm để so sánh biên lợi nhuận dự kiến với thực tế.',
        404
      )
    );

    render(<PlannedVsActualPage projectId={42} currentUserRoles={['VT-02']} />);

    expect(await screen.findByTestId('planned-vs-actual-not-found')).toBeInTheDocument();
    expect(screen.queryByTestId('planned-vs-actual-error')).not.toBeInTheDocument();
    expect(screen.queryByTestId('quote-source')).not.toBeInTheDocument();
  });

  // TC-03 (frontend): VT-05 (Kế toán) — vai trò này được backend từ chối 403.
  it('VT-05 (Kế toán) bị từ chối ở frontend (chỉ VT-02 được phe duyệt)', () => {
    render(<PlannedVsActualPage projectId={42} currentUserRoles={['VT-05']} />);
    expect(screen.getByTestId('planned-vs-actual-forbidden')).toBeInTheDocument();
    expect(profitabilityApi.getPlannedVsActualMargin).not.toHaveBeenCalled();
  });

  it('nếu backend trả 403 FORBIDDEN thì hiển thị thông báo lỗi', async () => {
    vi.mocked(profitabilityApi.getPlannedVsActualMargin).mockRejectedValue(
      new profitabilityApi.ProfitabilityApiError('FORBIDDEN', 'Bạn không có quyền thực hiện thao tác này.', 403)
    );

    render(<PlannedVsActualPage projectId={42} currentUserRoles={['VT-02']} />);

    expect(await screen.findByTestId('planned-vs-actual-error')).toHaveTextContent(
      'Bạn không có quyền thực hiện thao tác này.'
    );
  });

  it('hiển thị trạng thái loading trong khi tải dữ liệu', () => {
    vi.mocked(projectsApi.getProject).mockResolvedValue(RUNNING_PROJECT);
    vi.mocked(profitabilityApi.getPlannedVsActualMargin).mockImplementation(() => new Promise(() => {}));

    render(<PlannedVsActualPage projectId={42} currentUserRoles={['VT-02']} />);

    expect(screen.getByTestId('planned-vs-actual-loading')).toBeInTheDocument();
  });

  it('nút Tải lại gọi lại API', async () => {
    vi.mocked(projectsApi.getProject).mockResolvedValue(RUNNING_PROJECT);
    vi.mocked(profitabilityApi.getPlannedVsActualMargin).mockResolvedValue(MARGIN_DATA);

    render(<PlannedVsActualPage projectId={42} currentUserRoles={['VT-02']} />);

    await screen.findByTestId('planned-vs-actual-page');
    fireEvent.click(screen.getByTestId('btn-reload-planned-vs-actual'));

    await waitFor(() => expect(profitabilityApi.getPlannedVsActualMargin).toHaveBeenCalledTimes(2));
  });

  it('nút Quay lại gọi onBack', async () => {
    vi.mocked(projectsApi.getProject).mockResolvedValue(RUNNING_PROJECT);
    vi.mocked(profitabilityApi.getPlannedVsActualMargin).mockResolvedValue(MARGIN_DATA);
    const onBack = vi.fn();

    render(<PlannedVsActualPage projectId={42} currentUserRoles={['VT-02']} onBack={onBack} />);

    await screen.findByTestId('planned-vs-actual-page');
    fireEvent.click(screen.getByTestId('btn-back-planned-vs-actual'));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('hiển thị cảnh báo khi có dòng báo giá chưa ước tính chi phí dự kiến', async () => {
    vi.mocked(projectsApi.getProject).mockResolvedValue(RUNNING_PROJECT);
    vi.mocked(profitabilityApi.getPlannedVsActualMargin).mockResolvedValue({
      ...MARGIN_DATA,
      missingPlannedCostItemCount: 1,
    });

    render(<PlannedVsActualPage projectId={42} currentUserRoles={['VT-02']} />);

    await screen.findByTestId('planned-vs-actual-page');
    expect(screen.getByTestId('missing-planned-cost-alert')).toHaveTextContent('1 dòng');
  });

  it('hiển thị cảnh báo khi có dòng giờ công chưa có chi phí/giờ thực tế', async () => {
    vi.mocked(projectsApi.getProject).mockResolvedValue(RUNNING_PROJECT);
    vi.mocked(profitabilityApi.getPlannedVsActualMargin).mockResolvedValue({
      ...MARGIN_DATA,
      missingActualCostEntryCount: 2,
      missingActualRevenueEntryCount: 1,
    });

    render(<PlannedVsActualPage projectId={42} currentUserRoles={['VT-02']} />);

    await screen.findByTestId('planned-vs-actual-page');
    expect(screen.getByTestId('missing-actual-cost-alert')).toHaveTextContent('2 dòng');
    expect(screen.getByTestId('missing-actual-revenue-alert')).toHaveTextContent('1 dòng');
  });

  // Dòng báo giá/hoạt động chưa sinh doanh thu (revenue = 0) → backend trả marginPercent = null.
  it('xử lý biên lợi nhuận null khi doanh thu bằng 0 (không chia cho 0)', async () => {
    vi.mocked(projectsApi.getProject).mockResolvedValue(RUNNING_PROJECT);
    vi.mocked(profitabilityApi.getPlannedVsActualMargin).mockResolvedValue({
      ...MARGIN_DATA,
      plannedRevenue: 0,
      actualRevenue: 0,
      plannedMargin: 0,
      actualMargin: 0,
      plannedMarginPercent: null,
      actualMarginPercent: null,
      marginGapPercentPoints: null,
      gapReasons: [],
    });

    render(<PlannedVsActualPage projectId={42} currentUserRoles={['VT-02']} />);

    await screen.findByTestId('planned-vs-actual-page');
    const percentCard = screen.getByTestId('kpi-margin-percent');
    expect(percentCard).toHaveTextContent('—');
    expect(screen.getByTestId('margin-gap')).toHaveTextContent('—');
    expect(screen.queryByTestId('gap-reasons')).not.toBeInTheDocument();
  });

  it('hiển thị mã dự án khi không lấy được thông tin dự án', async () => {
    vi.mocked(projectsApi.getProject).mockRejectedValue(new Error('not found'));
    vi.mocked(profitabilityApi.getPlannedVsActualMargin).mockResolvedValue(MARGIN_DATA);

    render(<PlannedVsActualPage projectId={42} currentUserRoles={['VT-02']} />);

    await screen.findByTestId('planned-vs-actual-page');
    expect(screen.getByText('Mã: 42')).toBeInTheDocument();
  });

  it('dùng initialMargin khi được truyền vào (không gọi API)', async () => {
    render(<PlannedVsActualPage projectId={42} currentUserRoles={['VT-02']} initialMargin={MARGIN_DATA} />);

    expect(await screen.findByTestId('planned-vs-actual-page')).toBeInTheDocument();
    expect(screen.getByTestId('kpi-margin-percent')).toHaveTextContent('30,00 %');
    expect(screen.getByTestId('kpi-margin-percent')).toHaveTextContent('18,00 %');
    expect(profitabilityApi.getPlannedVsActualMargin).not.toHaveBeenCalled();
  });
});
