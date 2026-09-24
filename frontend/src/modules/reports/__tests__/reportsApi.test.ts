import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { getPipelineReport, getProjectPerformanceReport, ReportsApiError } from '../api/reportsApi';

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

describe('reportsApi — getProjectPerformanceReport (NCL-11-CN-003)', () => {
  beforeEach(() => {
    localStorage.setItem('token', 'fake-token');
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    localStorage.clear();
    vi.unstubAllGlobals();
  });

  it('gọi API không kèm status khi không lọc', async () => {
    const mockData = {
      status: null,
      projectCount: 0,
      projectsWithoutPlanCount: 0,
      overPlannedHoursProjectCount: 0,
      belowPlannedMarginProjectCount: 0,
      projects: [],
    };
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ success: true, data: mockData }), { status: 200 })
    );

    const result = await getProjectPerformanceReport();

    expect(result).toEqual(mockData);
    expect(fetch).toHaveBeenCalledWith(
      expect.stringMatching(/\/reports\/project-performance$/),
      expect.objectContaining({ method: 'GET' })
    );
  });

  it('gọi API kèm status khi có lọc', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          success: true,
          data: { status: 'RUNNING', projectCount: 0, projectsWithoutPlanCount: 0, overPlannedHoursProjectCount: 0, belowPlannedMarginProjectCount: 0, projects: [] },
        }),
        { status: 200 }
      )
    );

    await getProjectPerformanceReport('RUNNING');

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/reports/project-performance?status=RUNNING'),
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

    await expect(getProjectPerformanceReport()).rejects.toBeInstanceOf(ReportsApiError);
  });
});
