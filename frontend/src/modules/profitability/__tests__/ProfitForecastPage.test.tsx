import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ProfitForecastPage from '../pages/ProfitForecastPage';
import * as profitabilityApi from '../api/profitabilityApi';
import * as projectsApi from '../../projects/api/projectsApi';
import type { ProjectRes } from '../../projects/types/projectTypes';
import type { ProfitForecastRes } from '../types/profitabilityTypes';

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
  return { getProfitForecast: vi.fn(), ProfitabilityApiError: MockProfitabilityApiError };
});

vi.mock('../../projects/api/projectsApi', () => ({ getProject: vi.fn() }));

const PROJECT: ProjectRes = {
  id: 42,
  projectCode: 'PRJ-2026-042',
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

// TC-01: đã dùng 600 giờ trên ngân sách 1000 giờ → còn 400 giờ, biên dự báo dương.
const WITHIN_BUDGET: ProfitForecastRes = {
  projectId: 42,
  budgetHours: 1000,
  actualHours: 600,
  remainingHours: 400,
  overBudget: false,
  taskCompletionRate: 0.5,
  estimatedTotalHoursAtCompletion: 1000,
  actualRevenue: 60000000,
  actualCost: 36000000,
  actualMargin: 24000000,
  actualMarginPercent: 40,
  forecastRevenue: 100000000,
  forecastCost: 60000000,
  forecastMargin: 40000000,
  forecastMarginPercent: 40,
  marginVariancePercentPoints: 0,
  riskOfLoss: false,
  warnings: [],
};

// TC-02: vượt ngân sách, phần còn lại theo tốc độ tiêu hao thực tế, dự báo lỗ.
const OVER_BUDGET_LOSS: ProfitForecastRes = {
  projectId: 42,
  budgetHours: 160,
  actualHours: 200,
  remainingHours: 40,
  overBudget: true,
  taskCompletionRate: 0.8,
  estimatedTotalHoursAtCompletion: 240,
  actualRevenue: 80000000,
  actualCost: 60000000,
  actualMargin: 20000000,
  actualMarginPercent: 25,
  forecastRevenue: 96000000,
  forecastCost: 110000000,
  forecastMargin: -14000000,
  forecastMarginPercent: -14.58,
  marginVariancePercentPoints: -39.58,
  riskOfLoss: true,
  warnings: [
    'Du an da vuot ngan sach gio cong (200.00/160.00 gio) - phan con lai duoc uoc tinh theo toc do tieu hao thuc te.',
    'Du bao bien loi nhuan khi ket thuc du an am - nguy co lo.',
  ],
};

describe('ProfitForecastPage (NCL-09-CN-007 — Dự báo lợi nhuận tới khi kết thúc dự án)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(projectsApi.getProject).mockResolvedValue(PROJECT);
  });

  // TC-03: chỉ VT-02; vai trò khác bị từ chối và không gọi API.
  it.each(['VT-01', 'VT-03', 'VT-04', 'VT-05', 'VT-06', 'VT-07'])('từ chối truy cập cho vai trò %s', (role) => {
    render(<ProfitForecastPage projectId={42} currentUserRoles={[role]} />);
    expect(screen.getByTestId('profit-forecast-forbidden')).toBeInTheDocument();
    expect(profitabilityApi.getProfitForecast).not.toHaveBeenCalled();
    expect(projectsApi.getProject).not.toHaveBeenCalled();
  });

  it('hiển thị trạng thái loading khi đang tải', () => {
    vi.mocked(profitabilityApi.getProfitForecast).mockReturnValue(new Promise(() => {}));
    render(<ProfitForecastPage projectId={42} currentUserRoles={['VT-02']} />);
    expect(screen.getByTestId('profit-forecast-loading')).toBeInTheDocument();
  });

  // TC-01
  it('VT-02 xem dự báo: giờ còn lại theo ngân sách và biên dự báo, không cảnh báo lỗ/vượt ngân sách', async () => {
    vi.mocked(profitabilityApi.getProfitForecast).mockResolvedValue(WITHIN_BUDGET);
    render(<ProfitForecastPage projectId={42} currentUserRoles={['VT-02']} />);

    expect(await screen.findByTestId('hours-forecast')).toBeInTheDocument();
    expect(profitabilityApi.getProfitForecast).toHaveBeenCalledWith(42);
    expect(await screen.findByText('PRJ-2026-042')).toBeInTheDocument();

    expect(screen.getByTestId('budget-hours')).toHaveTextContent('1.000,00 giờ');
    expect(screen.getByTestId('actual-hours')).toHaveTextContent('600,00 giờ');
    expect(screen.getByTestId('remaining-hours')).toHaveTextContent('400,00 giờ');
    expect(screen.getByTestId('estimated-total-hours')).toHaveTextContent('1.000,00 giờ');
    expect(screen.getByTestId('budget-usage')).toHaveTextContent('60,00 %');

    expect(screen.getByTestId('kpi-cost')).toHaveTextContent('36.000.000 ₫');
    expect(screen.getByTestId('kpi-cost')).toHaveTextContent('60.000.000 ₫');
    expect(screen.getByTestId('kpi-margin-percent')).toHaveTextContent('40,00 %');
    expect(screen.getByTestId('margin-variance')).toHaveTextContent('0,00 %');

    expect(screen.queryByTestId('risk-of-loss-alert')).not.toBeInTheDocument();
    expect(screen.queryByTestId('over-budget-alert')).not.toBeInTheDocument();
    expect(screen.queryByTestId('forecast-warnings')).not.toBeInTheDocument();
  });

  // TC-02
  it('vượt ngân sách: cảnh báo vượt ngân sách, nguy cơ lỗ, biên dự báo âm và danh sách cảnh báo', async () => {
    vi.mocked(profitabilityApi.getProfitForecast).mockResolvedValue(OVER_BUDGET_LOSS);
    render(<ProfitForecastPage projectId={42} currentUserRoles={['VT-02']} />);

    expect(await screen.findByTestId('risk-of-loss-alert')).toHaveTextContent('Nguy cơ lỗ');
    const overBudget = screen.getByTestId('over-budget-alert');
    expect(overBudget).toHaveTextContent('200,00 / 160,00 giờ');
    expect(overBudget).toHaveTextContent('80,00 %');

    expect(screen.getByTestId('remaining-hours')).toHaveTextContent('40,00 giờ');
    expect(screen.getByTestId('estimated-total-hours')).toHaveTextContent('240,00 giờ');
    expect(screen.getByTestId('budget-usage')).toHaveTextContent('125,00 %');
    expect(screen.getByTestId('kpi-margin')).toHaveTextContent('-14.000.000 ₫');
    expect(screen.getByTestId('kpi-margin-percent')).toHaveTextContent('-14,58 %');
    expect(screen.getByTestId('margin-variance')).toHaveTextContent('-39,58 %');
    expect(screen.getByTestId('forecast-warning-0')).toHaveTextContent('vuot ngan sach');
    expect(screen.getByTestId('forecast-warning-1')).toBeInTheDocument();
  });

  it('dự án chưa khai báo ngân sách giờ: không hiện thanh ngân sách, biên null hiển thị "—"', async () => {
    vi.mocked(profitabilityApi.getProfitForecast).mockResolvedValue({
      ...WITHIN_BUDGET,
      budgetHours: 0,
      remainingHours: 0,
      taskCompletionRate: null,
      actualMarginPercent: null,
      forecastMarginPercent: null,
      marginVariancePercentPoints: null,
      warnings: ['Du an chua khai bao ngan sach gio cong cho cong viec nao.'],
    });
    render(<ProfitForecastPage projectId={42} currentUserRoles={['VT-02']} />);

    expect(await screen.findByTestId('forecast-warnings')).toBeInTheDocument();
    expect(screen.queryByTestId('budget-usage')).not.toBeInTheDocument();
    expect(screen.getByTestId('margin-variance')).toHaveTextContent('—');
    expect(screen.getByTestId('kpi-margin-percent')).toHaveTextContent('—');
  });

  it('lỗi 403 từ backend hiển thị thông báo lỗi', async () => {
    vi.mocked(profitabilityApi.getProfitForecast).mockRejectedValue(
      new profitabilityApi.ProfitabilityApiError('FORBIDDEN', 'Bạn không có quyền', 403)
    );
    render(<ProfitForecastPage projectId={42} currentUserRoles={['VT-02']} />);
    expect(await screen.findByTestId('profit-forecast-error')).toHaveTextContent('Bạn không có quyền');
    expect(screen.queryByTestId('hours-forecast')).not.toBeInTheDocument();
  });

  it('nút Tải lại gọi lại API và nút Quay lại gọi onBack', async () => {
    vi.mocked(profitabilityApi.getProfitForecast).mockResolvedValue(WITHIN_BUDGET);
    const onBack = vi.fn();
    render(<ProfitForecastPage projectId={42} currentUserRoles={['VT-02']} onBack={onBack} />);

    await screen.findByTestId('hours-forecast');
    fireEvent.click(screen.getByTestId('btn-reload-profit-forecast'));
    await waitFor(() => expect(profitabilityApi.getProfitForecast).toHaveBeenCalledTimes(2));

    fireEvent.click(screen.getByTestId('btn-back-profit-forecast'));
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
