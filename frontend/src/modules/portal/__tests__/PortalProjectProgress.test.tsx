import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as portalApi from '../api/portalApi';
import PortalApp from '../PortalApp';
import PortalAccessDeniedPage from '../pages/PortalAccessDeniedPage';
import PortalDashboardPage from '../pages/PortalDashboardPage';
import PortalProjectDetailPage, { orderWorkPackages } from '../pages/PortalProjectDetailPage';
import type { PortalProjectProgressRes, PortalProjectRes } from '../types/portalTypes';

vi.mock('../api/portalApi', async () => {
  const actual = await vi.importActual<typeof import('../api/portalApi')>('../api/portalApi');
  return {
    PortalApiError: actual.PortalApiError,
    fetchPortalProjects: vi.fn(),
    fetchPortalProjectProgress: vi.fn(),
    fetchPortalAcceptances: vi.fn(() => Promise.resolve([])),
  };
});

const api = vi.mocked(portalApi);
const { PortalApiError } = portalApi;

function project(overrides: Partial<PortalProjectRes> = {}): PortalProjectRes {
  return {
    id: 12,
    projectCode: 'DA-001',
    name: 'Trien khai ERP',
    status: 'RUNNING',
    startDate: '2026-09-01',
    expectedEndDate: '2026-12-31',
    contractCode: 'HD-2026-001',
    projectManagerName: 'Nguyen Van Dung',
    totalTasks: 12,
    doneTasks: 8,
    progressPercent: 67,
    totalMilestones: 3,
    doneMilestones: 1,
    lateMilestones: 1,
    nextMilestoneName: 'Ban giao giai doan 1',
    nextMilestoneDate: '2026-09-19',
    ...overrides,
  };
}

const progress: PortalProjectProgressRes = {
  project: project(),
  workPackages: [
    { id: 41, parentId: 40, name: 'Thiet ke', totalTasks: 1, doneTasks: 1, progressPercent: 100, acceptanceStatus: null },
    { id: 40, parentId: null, name: 'Giai doan 1', totalTasks: 3, doneTasks: 2, progressPercent: 67, acceptanceStatus: 'PENDING_CONFIRMATION' },
  ],
  milestones: [
    { id: 7, name: 'Ban giao giai doan 1', plannedDate: '2026-09-19', actualDate: null, status: 'LATE', daysLate: 5 },
    { id: 8, name: 'Khoi dong', plannedDate: '2026-09-02', actualDate: '2026-09-02', status: 'DONE' },
  ],
  deliverables: [
    {
      deliverableId: 7,
      workPackageId: 41,
      workPackageName: 'Thiet ke',
      name: 'Tai lieu thiet ke',
      deliverableType: 'DOCUMENT',
      latestVersionNo: '1.1',
      latestDeliveredDate: '2026-09-22',
      latestFileUrl: '/files/tai-lieu-thiet-ke-1.1.pdf',
      versionCount: 2,
    },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
  window.history.replaceState(null, '', '/');
});

afterEach(() => {
  window.history.replaceState(null, '', '/');
});

describe('NCL-13-CN-002 — Khách hàng xem tiến độ dự án', () => {
  it('TC-01: hiện đúng các dự án backend trả cho khách hàng kèm tiến độ, mốc trễ, mốc kế tiếp', async () => {
    api.fetchPortalProjects.mockResolvedValue([
      project(),
      project({ id: 13, projectCode: 'DA-002', name: 'Bao tri he thong', progressPercent: 20, lateMilestones: 0 }),
    ]);
    render(<PortalDashboardPage customerName="Nguyen Thi Nhi" onOpenProject={vi.fn()} />);

    const grid = await screen.findByTestId('portal-project-grid');
    expect(within(grid).getAllByRole('article')).toHaveLength(2);
    const card = screen.getByTestId('portal-project-card-12');
    expect(card).toHaveTextContent('Trien khai ERP');
    expect(card).toHaveTextContent('67%');
    expect(card).toHaveTextContent('8/12 công việc đã xong');
    expect(card).toHaveTextContent('Ban giao giai doan 1');
    expect(screen.getByTestId('portal-project-late-12')).toHaveTextContent('1 mốc trễ');
    expect(within(card).getByRole('progressbar')).toHaveAttribute('aria-valuenow', '67');
    expect(screen.getByTestId('portal-stat-running')).toHaveTextContent('2');
  });

  it('TC-01: lọc đang thực hiện / đã kết thúc và tìm kiếm; mở chi tiết dự án', async () => {
    const onOpen = vi.fn();
    api.fetchPortalProjects.mockResolvedValue([
      project(),
      project({ id: 14, projectCode: 'DA-000', name: 'Du an cu', status: 'CLOSED', lateMilestones: 0, nextMilestoneName: null }),
    ]);
    render(<PortalDashboardPage customerName="KH" onOpenProject={onOpen} />);
    await screen.findByTestId('portal-project-card-12');
    expect(screen.queryByTestId('portal-project-card-14')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('portal-projects-tab-CLOSED'));
    expect(screen.getByTestId('portal-project-card-14')).toHaveTextContent('Đã kết thúc');
    expect(screen.queryByTestId('portal-project-card-12')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('portal-projects-tab-ALL'));
    fireEvent.change(screen.getByLabelText('Tìm dự án'), { target: { value: 'erp' } });
    expect(screen.queryByTestId('portal-project-card-14')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('portal-project-open-12'));
    expect(onOpen).toHaveBeenCalledWith(12);
  });

  it('TC-01: khách hàng chưa có dự án thấy thông báo trống; lỗi tải thì cho thử lại', async () => {
    api.fetchPortalProjects.mockResolvedValueOnce([]);
    const { unmount } = render(<PortalDashboardPage customerName="KH" onOpenProject={vi.fn()} />);
    expect(await screen.findByTestId('portal-projects-empty')).toBeInTheDocument();
    unmount();

    api.fetchPortalProjects.mockRejectedValueOnce(new PortalApiError('NETWORK_ERROR', 'Không kết nối được máy chủ.', 503));
    api.fetchPortalProjects.mockResolvedValueOnce([project()]);
    render(<PortalDashboardPage customerName="KH" onOpenProject={vi.fn()} />);
    expect(await screen.findByText('Không kết nối được máy chủ.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }));
    expect(await screen.findByTestId('portal-project-card-12')).toBeInTheDocument();
  });

  it('chi tiết: mốc tiến độ (trễ kèm số ngày), hạng mục theo cây kèm nghiệm thu, sản phẩm đã bàn giao', async () => {
    api.fetchPortalProjectProgress.mockResolvedValue(progress);
    render(<PortalProjectDetailPage projectId={12} onBack={vi.fn()} />);
    await screen.findByTestId('portal-project-detail');
    expect(api.fetchPortalProjectProgress).toHaveBeenCalledWith(12);
    expect(screen.getByTestId('portal-detail-progress')).toHaveTextContent('67%');
    expect(screen.getByTestId('portal-milestone-7')).toHaveTextContent('Đang trễ 5 ngày');
    expect(screen.getByTestId('portal-milestone-8')).toHaveTextContent('Đã hoàn thành');

    const rows = within(screen.getByTestId('portal-detail-work-packages')).getAllByRole('row').slice(1);
    expect(rows.map((r) => r.getAttribute('data-testid'))).toEqual(['portal-wp-40', 'portal-wp-41']);
    expect(rows[0]).toHaveTextContent('Chờ bạn xác nhận nghiệm thu');
    expect(rows[1]).toHaveTextContent('100%');

    const deliverable = screen.getByTestId('portal-deliverable-7');
    expect(deliverable).toHaveTextContent('Tai lieu thiet ke');
    expect(deliverable).toHaveTextContent('Tài liệu');
    expect(deliverable).toHaveTextContent('1.1');
    expect(deliverable).toHaveTextContent('tai-lieu-thiet-ke-1.1.pdf');
  });

  it('TC-02: dự án của khách hàng khác (403) → màn từ chối, không hiện dữ liệu, quay về danh sách được', async () => {
    const onBack = vi.fn();
    api.fetchPortalProjectProgress.mockRejectedValue(new PortalApiError('FORBIDDEN', 'Bạn không có quyền xem nội dung này.', 403));
    render(<PortalProjectDetailPage projectId={999} onBack={onBack} />);
    const denied = await screen.findByTestId('portal-project-forbidden');
    expect(denied).toHaveTextContent('Bạn không có quyền xem dự án này');
    expect(denied).toHaveTextContent('ghi vào nhật ký');
    expect(denied).toHaveTextContent('999');
    expect(screen.queryByTestId('portal-project-detail')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('portal-detail-back'));
    expect(onBack).toHaveBeenCalled();
  });

  it('TC-03: không hiển thị ghi chú/mô tả nội bộ kể cả khi response lỡ chứa các trường đó', async () => {
    const leaky = {
      ...progress,
      project: { ...progress.project, description: 'GHI CHU NOI BO DU AN', riskNote: 'RUI RO NOI BO', budgetHours: 999 },
      workPackages: progress.workPackages.map((w) => ({ ...w, description: 'MO TA HANG MUC NOI BO' })),
      milestones: progress.milestones.map((m) => ({ ...m, description: 'GHI CHU MOC NOI BO' })),
      deliverables: progress.deliverables.map((d) => ({ ...d, note: 'GHI CHU BAN GIAO NOI BO' })),
    } as unknown as PortalProjectProgressRes;
    api.fetchPortalProjectProgress.mockResolvedValue(leaky);
    render(<PortalProjectDetailPage projectId={12} onBack={vi.fn()} />);
    const page = await screen.findByTestId('portal-project-detail');
    expect(page).not.toHaveTextContent(/NOI BO/);
    expect(page).not.toHaveTextContent('999');
  });

  it('TC-04: tài khoản nội bộ mở cổng → màn từ chối và gọi thật API cổng để backend ghi nhật ký', async () => {
    api.fetchPortalProjects.mockRejectedValue(new PortalApiError('FORBIDDEN', 'x', 403));
    const onLeave = vi.fn();
    render(<PortalAccessDeniedPage currentUserRoles={['VT-02']} currentUserName="PM A" onLeave={onLeave} />);
    expect(screen.getByTestId('portal-internal-denied')).toHaveTextContent('chỉ dành cho khách hàng');
    await waitFor(() => expect(api.fetchPortalProjects).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByTestId('portal-internal-denied-leave'));
    expect(onLeave).toHaveBeenCalled();
  });

  it('TC-05: trang chi tiết cho khách hàng biết lượt xem được ghi nhật ký cổng', async () => {
    api.fetchPortalProjectProgress.mockResolvedValue(progress);
    render(<PortalProjectDetailPage projectId={12} onBack={vi.fn()} />);
    expect(await screen.findByText(/Lượt xem của bạn được ghi nhận/)).toBeInTheDocument();
  });
});

describe('PortalApp — điều hướng cổng bằng đường dẫn #/portal', () => {
  const session = { accessToken: 't', tokenType: 'Bearer', userId: 17, username: 'khachhang01', fullName: 'Nguyen Thi Nhi', roles: ['VT-09'] };

  it('đăng nhập vào danh sách dự án, mở chi tiết cập nhật đường dẫn, quay lại được', async () => {
    api.fetchPortalProjects.mockResolvedValue([project()]);
    api.fetchPortalProjectProgress.mockResolvedValue(progress);
    render(<PortalApp session={session} onLogout={vi.fn()} />);
    expect(screen.getByTestId('portal-shell')).toBeInTheDocument();
    await waitFor(() => expect(window.location.hash).toBe('#/portal/projects'));
    fireEvent.click(await screen.findByTestId('portal-project-open-12'));
    expect(window.location.hash).toBe('#/portal/projects/12');
    await screen.findByTestId('portal-project-detail');
    fireEvent.click(screen.getByTestId('portal-detail-back'));
    await screen.findByTestId('portal-project-card-12');
    expect(window.location.hash).toBe('#/portal/projects');
  });

  it('TC-02: nhập trực tiếp đường dẫn dự án → gọi đúng mã đó; mã sai định dạng báo đường dẫn không hợp lệ', async () => {
    api.fetchPortalProjectProgress.mockRejectedValue(new PortalApiError('FORBIDDEN', 'x', 403));
    window.history.replaceState(null, '', '/#/portal/projects/555');
    const { unmount } = render(<PortalApp session={session} onLogout={vi.fn()} />);
    expect(await screen.findByTestId('portal-project-forbidden')).toBeInTheDocument();
    expect(api.fetchPortalProjectProgress).toHaveBeenCalledWith(555);
    unmount();

    window.history.replaceState(null, '', '/#/portal/projects/abc');
    render(<PortalApp session={session} onLogout={vi.fn()} />);
    expect(screen.getByTestId('portal-invalid-project')).toHaveTextContent('abc');
  });

  it('đăng xuất từ menu tài khoản', async () => {
    api.fetchPortalProjects.mockResolvedValue([]);
    const onLogout = vi.fn();
    render(<PortalApp session={session} onLogout={onLogout} />);
    fireEvent.click(screen.getByTestId('portal-user-menu'));
    fireEvent.click(screen.getByTestId('portal-logout'));
    expect(onLogout).toHaveBeenCalled();
    expect(window.location.hash).toBe('');
  });
});

describe('orderWorkPackages', () => {
  it('xếp cha trước con, thụt theo cấp; hạng mục có cha không tồn tại coi như gốc', () => {
    const ordered = orderWorkPackages([
      { id: 3, parentId: 2, name: 'c', totalTasks: 0, doneTasks: 0, progressPercent: 0 },
      { id: 1, parentId: null, name: 'a', totalTasks: 0, doneTasks: 0, progressPercent: 0 },
      { id: 2, parentId: 1, name: 'b', totalTasks: 0, doneTasks: 0, progressPercent: 0 },
      { id: 9, parentId: 77, name: 'orphan', totalTasks: 0, doneTasks: 0, progressPercent: 0 },
    ]);
    expect(ordered.map((w) => [w.id, w.depth])).toEqual([[1, 0], [2, 1], [3, 2], [9, 0]]);
  });
});
