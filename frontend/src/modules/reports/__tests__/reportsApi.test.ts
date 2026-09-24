import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { getPipelineReport, getDashboardSummary, ReportsApiError } from '../api/reportsApi';

describe('reportsApi — getPipelineReport (NCL-03-CN-007)', () => {
  beforeEach(() => {
    localStorage.setItem('token', 'fake-token');
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    localStorage.clear();
    vi.unstubAllGlobals();
  });

  it('trả về dữ liệu báo cáo khi backend phản hồi thành công', async () => {
    const mockData = {
      totalOpportunityCount: 12,
      totalExpectedValue: 3150000000,
      stalledThresholdDays: 60,
      generatedAt: '2026-09-04T11:20:31',
      stages: [],
    };
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ success: true, data: mockData }), { status: 200 })
    );

    const result = await getPipelineReport();

    expect(result).toEqual(mockData);
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/opportunities/pipeline-report'),
      expect.objectContaining({ method: 'GET' })
    );
  });

  it('ném ReportsApiError khi backend trả 403 FORBIDDEN', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({ success: false, errorCode: 'FORBIDDEN', message: 'Không có quyền' }),
        { status: 403 }
      )
    );

    await expect(getPipelineReport()).rejects.toBeInstanceOf(ReportsApiError);
  });

  it('ném ReportsApiError khi không kết nối được máy chủ', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error('network down'));

    await expect(getPipelineReport()).rejects.toBeInstanceOf(ReportsApiError);
  });
});

describe('reportsApi — getDashboardSummary (NCL-11-CN-001)', () => {
  beforeEach(() => {
    localStorage.setItem('token', 'fake-token');
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    localStorage.clear();
    vi.unstubAllGlobals();
  });

  it('trả về các chỉ số bảng điều khiển khi backend phản hồi thành công', async () => {
    const mockData = {
      from: '2026-01-01',
      to: '2026-01-31',
      kpis: {
        recognizedRevenue: 4000000,
        averageMarginRate: 0.1,
        billableHoursRatio: 0.4444,
        negativeMarginProjectCount: 1,
        overdueInvoiceCount: 2,
      },
      missingCostEntryCount: 0,
      missingRevenueEntryCount: 0,
    };
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ success: true, data: mockData }), { status: 200 })
    );

    const result = await getDashboardSummary('2026-01-01', '2026-01-31');

    expect(result).toEqual(mockData);
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/reports/dashboard?from=2026-01-01&to=2026-01-31'),
      expect.objectContaining({ method: 'GET' })
    );
  });

  it('ném ReportsApiError khi backend trả 403 FORBIDDEN', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({ success: false, errorCode: 'FORBIDDEN', message: 'Không có quyền' }),
        { status: 403 }
      )
    );

    await expect(getDashboardSummary('2026-01-01', '2026-01-31')).rejects.toBeInstanceOf(ReportsApiError);
  });
});
