import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as portalApi from '../api/portalApi';
import { validateRejectReason } from '../components/PortalAcceptanceDecisionModal';
import PortalApp from '../PortalApp';
import PortalAccessDeniedPage from '../pages/PortalAccessDeniedPage';
import PortalAcceptanceDetailPage from '../pages/PortalAcceptanceDetailPage';
import PortalAcceptancePage from '../pages/PortalAcceptancePage';
import type { PortalAcceptanceDetail, PortalAcceptanceSummary } from '../types/portalTypes';
import { parsePortalHash, portalFeatureOf, portalHash } from '../utils/portalRoute';

vi.mock('../api/portalApi', async () => {
  const actual = await vi.importActual<typeof import('../api/portalApi')>('../api/portalApi');
  return {
    PortalApiError: actual.PortalApiError,
    fetchPortalProjects: vi.fn(() => Promise.resolve([])),
    fetchPortalProjectProgress: vi.fn(),
    fetchPortalAcceptances: vi.fn(),
    fetchPortalAcceptance: vi.fn(),
    confirmPortalAcceptance: vi.fn(),
    rejectPortalAcceptance: vi.fn(),
  };
});

const api = vi.mocked(portalApi);
const { PortalApiError } = portalApi;

function summary(overrides: Partial<PortalAcceptanceSummary> = {}): PortalAcceptanceSummary {
  return {
    id: 5,
    certificateCode: 'NT-20260924-A1B2C3',
    projectId: 12,
    projectCode: 'DA-001',
    projectName: 'Trien khai ERP',
    workPackageName: 'Giai doan 1',
    title: 'Nghiem thu giai doan 1',
    acceptedValue: 300000000,
    status: 'PENDING_CONFIRMATION',
    revisionNo: 1,
    awaitingDecision: true,
    createdAt: '2026-09-24T10:00:00',
    updatedAt: '2026-09-24T10:00:00',
    confirmedAt: null,
    ...overrides,
  };
}

function detail(overrides: Partial<PortalAcceptanceDetail> = {}): PortalAcceptanceDetail {
  return {
    ...summary(),
    note: 'Theo moc 1 cua hop dong',
    lastRejectionReason: null,
    signerName: null,
    signedDate: null,
    confirmationChannel: null,
    tasks: ['Phan tich yeu cau', 'Lap trinh phan he'],
    deliverables: [{ deliverableName: 'Tai lieu thiet ke', versionNo: '1.1' }],
    decisions: [],
    ...overrides,
  };
}

const accepted = detail({
  status: 'ACCEPTED',
  awaitingDecision: false,
  signerName: 'Nguyen Thi Nhi',
  signedDate: '2026-09-25',
  confirmationChannel: 'PORTAL',
  confirmedAt: '2026-09-25T09:00:00',
  decisions: [
    { decision: 'ACCEPTED', channel: 'PORTAL', revisionNo: 1, signerName: 'Nguyen Thi Nhi', signedDate: '2026-09-25', reason: null, recordedAt: '2026-09-25T09:00:00' },
  ],
});

function renderDetail(onDecided = vi.fn()) {
  render(
    <PortalAcceptanceDetailPage certificateId={5} signerName="Nguyen Thi Nhi" onBack={vi.fn()} onOpenProject={vi.fn()} onDecided={onDecided} />
  );
  return onDecided;
}

beforeEach(() => {
  vi.clearAllMocks();
  window.history.replaceState(null, '', '/');
});
afterEach(() => window.history.replaceState(null, '', '/'));

describe('NCL-13-CN-003 — Khách hàng duyệt phiếu nghiệm thu trên cổng', () => {
  it('danh sách: phiếu chờ xác nhận đưa lên đầu, mở sẵn bộ lọc chờ xác nhận, lọc theo dự án', async () => {
    const onChangeProject = vi.fn();
    const onOpen = vi.fn();
    api.fetchPortalAcceptances.mockResolvedValue([
      summary({ id: 6, status: 'ACCEPTED', awaitingDecision: false, title: 'Nghiem thu cu' }),
      summary(),
      summary({ id: 7, projectId: 13, projectCode: 'DA-002', projectName: 'Cong thong tin', status: 'NEEDS_REVISION', awaitingDecision: false }),
    ]);
    render(<PortalAcceptancePage onChangeProject={onChangeProject} onOpen={onOpen} />);
    await screen.findByTestId('portal-acceptance-table');
    expect(screen.getByTestId('portal-acceptance-pending-banner')).toHaveTextContent('1');
    expect(screen.getByTestId('portal-acceptance-tab-PENDING_CONFIRMATION')).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByTestId('portal-acceptance-row-5')).toHaveTextContent('300.000.000 ₫');
    expect(screen.queryByTestId('portal-acceptance-row-6')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('portal-acceptance-tab-ALL'));
    const rows = within(screen.getByTestId('portal-acceptance-table')).getAllByRole('row').slice(1);
    expect(rows[0]).toHaveAttribute('data-testid', 'portal-acceptance-row-5');
    fireEvent.change(screen.getByTestId('portal-acceptance-project'), { target: { value: '13' } });
    expect(onChangeProject).toHaveBeenCalledWith(13);
    fireEvent.click(screen.getByTestId('portal-acceptance-open-5'));
    expect(onOpen).toHaveBeenCalledWith(5);
  });

  it('danh sách lọc sẵn theo dự án truyền vào', async () => {
    api.fetchPortalAcceptances.mockResolvedValue([
      summary({ status: 'ACCEPTED', awaitingDecision: false }),
      summary({ id: 7, projectId: 13, status: 'ACCEPTED', awaitingDecision: false }),
    ]);
    render(<PortalAcceptancePage projectId={13} onChangeProject={vi.fn()} onOpen={vi.fn()} />);
    await screen.findByTestId('portal-acceptance-row-7');
    expect(screen.queryByTestId('portal-acceptance-row-5')).not.toBeInTheDocument();
  });

  it('chi tiết: hiện nội dung, công việc, sản phẩm bàn giao và nút quyết định khi chờ xác nhận', async () => {
    api.fetchPortalAcceptance.mockResolvedValue(detail());
    renderDetail();
    await screen.findByTestId('portal-acceptance-detail');
    expect(screen.getByTestId('portal-acceptance-value')).toHaveTextContent('300.000.000 ₫');
    expect(screen.getByTestId('portal-acceptance-tasks')).toHaveTextContent('Lap trinh phan he');
    expect(screen.getByTestId('portal-acceptance-deliverables')).toHaveTextContent('Tai lieu thiet ke');
    expect(screen.getByTestId('portal-acceptance-deliverables')).toHaveTextContent('1.1');
    expect(screen.getByText(/Theo moc 1 cua hop dong/)).toBeInTheDocument();
    expect(screen.getByTestId('portal-decision-bar')).toBeInTheDocument();
  });

  it('TC-01: xác nhận cần tích đồng ý; xác nhận xong phiếu → Đã nghiệm thu kèm người ký, thời điểm; khoá thao tác', async () => {
    api.fetchPortalAcceptance.mockResolvedValue(detail());
    api.confirmPortalAcceptance.mockResolvedValue(accepted);
    const onDecided = renderDetail();
    fireEvent.click(await screen.findByTestId('portal-open-confirm'));
    const modal = screen.getByTestId('portal-decision-modal');
    expect(modal).toHaveTextContent('Nguyen Thi Nhi');
    expect(modal).toHaveTextContent(new Date().toLocaleDateString('vi-VN'));

    fireEvent.click(within(modal).getByTestId('portal-decision-submit'));
    expect(await within(modal).findByText(/tích xác nhận đã xem nội dung/)).toBeInTheDocument();
    expect(api.confirmPortalAcceptance).not.toHaveBeenCalled();

    fireEvent.click(within(modal).getByRole('checkbox'));
    fireEvent.click(within(modal).getByTestId('portal-decision-submit'));
    await waitFor(() => expect(api.confirmPortalAcceptance).toHaveBeenCalledWith(5));

    expect(await screen.findByTestId('portal-acceptance-accepted')).toHaveTextContent('Nguyen Thi Nhi');
    expect(screen.getByTestId('portal-acceptance-status')).toHaveTextContent('Đã nghiệm thu');
    expect(screen.getByTestId('portal-acceptance-notice')).toHaveTextContent('Đã xác nhận nghiệm thu');
    expect(screen.queryByTestId('portal-decision-bar')).not.toBeInTheDocument();
    expect(screen.queryByTestId('portal-decision-modal')).not.toBeInTheDocument();
    expect(onDecided).toHaveBeenCalled();
  });

  it('TC-02: từ chối mà chưa nhập lý do (hoặc chỉ khoảng trắng) → yêu cầu nhập lý do, không gửi', async () => {
    api.fetchPortalAcceptance.mockResolvedValue(detail());
    renderDetail();
    fireEvent.click(await screen.findByTestId('portal-open-reject'));
    const modal = screen.getByTestId('portal-decision-modal');
    fireEvent.click(within(modal).getByTestId('portal-decision-submit'));
    expect(await within(modal).findByTestId('portal-reject-reason-error')).toHaveTextContent('Vui lòng nhập lý do từ chối');
    fireEvent.change(within(modal).getByTestId('portal-reject-reason'), { target: { value: '    ' } });
    fireEvent.click(within(modal).getByTestId('portal-decision-submit'));
    expect(within(modal).getByTestId('portal-reject-reason-error')).toBeInTheDocument();
    expect(api.rejectPortalAcceptance).not.toHaveBeenCalled();
  });

  it('TC-02: từ chối kèm lý do → phiếu Đang chỉnh sửa, lý do hiển thị, lịch sử ghi quyết định', async () => {
    api.fetchPortalAcceptance.mockResolvedValue(detail());
    api.rejectPortalAcceptance.mockResolvedValue(
      detail({
        status: 'NEEDS_REVISION',
        awaitingDecision: false,
        lastRejectionReason: 'Thieu tai lieu huong dan su dung',
        decisions: [
          { decision: 'REJECTED', channel: 'PORTAL', revisionNo: 1, signerName: 'Nguyen Thi Nhi', reason: 'Thieu tai lieu huong dan su dung', recordedAt: '2026-09-25T09:00:00' },
        ],
      })
    );
    renderDetail();
    fireEvent.click(await screen.findByTestId('portal-open-reject'));
    const modal = screen.getByTestId('portal-decision-modal');
    fireEvent.change(within(modal).getByTestId('portal-reject-reason'), { target: { value: '  Thieu tai lieu huong dan su dung ' } });
    fireEvent.click(within(modal).getByTestId('portal-decision-submit'));
    await waitFor(() => expect(api.rejectPortalAcceptance).toHaveBeenCalledWith(5, 'Thieu tai lieu huong dan su dung'));
    expect(await screen.findByTestId('portal-acceptance-revision')).toHaveTextContent('Thieu tai lieu huong dan su dung');
    expect(screen.getByTestId('portal-acceptance-history')).toHaveTextContent('Từ chối nghiệm thu');
    expect(screen.getByTestId('portal-acceptance-history')).toHaveTextContent('Lý do: Thieu tai lieu huong dan su dung');
  });

  it('phiếu không còn chờ xác nhận (INVALID_STATE) → báo lỗi và nạp lại phiếu', async () => {
    api.fetchPortalAcceptance.mockResolvedValueOnce(detail()).mockResolvedValueOnce(accepted);
    api.confirmPortalAcceptance.mockRejectedValue(new PortalApiError('INVALID_STATE', 'x', 400));
    renderDetail();
    fireEvent.click(await screen.findByTestId('portal-open-confirm'));
    const modal = screen.getByTestId('portal-decision-modal');
    fireEvent.click(within(modal).getByRole('checkbox'));
    fireEvent.click(within(modal).getByTestId('portal-decision-submit'));
    expect(await within(modal).findByTestId('portal-decision-error')).toHaveTextContent('không còn ở trạng thái chờ');
    await waitFor(() => expect(api.fetchPortalAcceptance).toHaveBeenCalledTimes(2));
  });

  it('phiếu đã nghiệm thu: không còn nút quyết định', async () => {
    api.fetchPortalAcceptance.mockResolvedValue(accepted);
    renderDetail();
    expect(await screen.findByTestId('portal-acceptance-accepted')).toBeInTheDocument();
    expect(screen.queryByTestId('portal-open-confirm')).not.toBeInTheDocument();
    expect(screen.queryByTestId('portal-open-reject')).not.toBeInTheDocument();
  });

  it('phiếu của khách hàng khác (403) → màn từ chối', async () => {
    api.fetchPortalAcceptance.mockRejectedValue(new PortalApiError('FORBIDDEN', 'x', 403));
    renderDetail();
    expect(await screen.findByTestId('portal-acceptance-forbidden')).toHaveTextContent('không có quyền');
  });

  it('TC-03: tài khoản nội bộ (kể cả Quản lý dự án) mở chức năng duyệt phiếu → từ chối, gọi API phiếu để ghi nhật ký', async () => {
    api.fetchPortalAcceptances.mockRejectedValue(new PortalApiError('FORBIDDEN', 'x', 403));
    render(<PortalAccessDeniedPage currentUserRoles={['VT-02']} currentUserName="PM A" feature="acceptances" onLeave={vi.fn()} />);
    expect(screen.getByTestId('portal-internal-denied')).toHaveTextContent('Duyệt phiếu nghiệm thu trên cổng chỉ dành cho khách hàng');
    await waitFor(() => expect(api.fetchPortalAcceptances).toHaveBeenCalledTimes(1));
    expect(api.fetchPortalProjects).not.toHaveBeenCalled();
  });

  it('TC-04: lịch sử nghiệm thu hiện người thực hiện, kênh, thời điểm', async () => {
    api.fetchPortalAcceptance.mockResolvedValue(accepted);
    renderDetail();
    const history = await screen.findByTestId('portal-acceptance-history');
    expect(history).toHaveTextContent('Xác nhận nghiệm thu');
    expect(history).toHaveTextContent('Nguyen Thi Nhi');
    expect(history).toHaveTextContent('Trên cổng khách hàng');
    expect(history).toHaveTextContent(new Date('2026-09-25T09:00:00').toLocaleString('vi-VN'));
  });

  it('khung cổng: huy hiệu số phiếu chờ xác nhận trên mục Nghiệm thu, mở đường dẫn phiếu trực tiếp', async () => {
    api.fetchPortalAcceptances.mockResolvedValue([summary()]);
    api.fetchPortalAcceptance.mockResolvedValue(detail());
    window.history.replaceState(null, '', '/#/portal/acceptances/5');
    render(
      <PortalApp
        session={{ accessToken: 't', tokenType: 'Bearer', userId: 17, username: 'khachhang01', fullName: 'Nguyen Thi Nhi', roles: ['VT-09'] }}
        onLogout={vi.fn()}
      />
    );
    expect(await screen.findByTestId('portal-nav-badge-acceptances')).toHaveTextContent('1');
    expect(api.fetchPortalAcceptances).toHaveBeenCalledWith({ status: 'PENDING_CONFIRMATION' });
    expect(await screen.findByTestId('portal-acceptance-detail')).toBeInTheDocument();
    expect(api.fetchPortalAcceptance).toHaveBeenCalledWith(5);
  });
});

describe('validateRejectReason & đường dẫn phiếu', () => {
  it('lý do bắt buộc, tối đa 1000 ký tự', () => {
    expect(validateRejectReason('')).toBeDefined();
    expect(validateRejectReason('   ')).toBeDefined();
    expect(validateRejectReason('a'.repeat(1001))).toMatch(/1000/);
    expect(validateRejectReason('Thieu tai lieu')).toBeUndefined();
  });

  it('phân tích đường dẫn phiếu nghiệm thu', () => {
    expect(parsePortalHash('#/portal/acceptances')).toEqual({ view: 'acceptances', projectId: null });
    expect(parsePortalHash('#/portal/acceptances?project=12')).toEqual({ view: 'acceptances', projectId: 12 });
    expect(parsePortalHash('#/portal/acceptances/5')).toEqual({ view: 'acceptance', certificateId: 5 });
    expect(parsePortalHash('#/portal/acceptances/x')).toEqual({ view: 'invalid-acceptance', raw: 'x' });
    expect(portalHash({ view: 'acceptances', projectId: 12 })).toBe('#/portal/acceptances?project=12');
    expect(portalFeatureOf('#/portal/acceptances/5')).toBe('acceptances');
    expect(portalFeatureOf('#/portal/projects')).toBe('projects');
  });
});
