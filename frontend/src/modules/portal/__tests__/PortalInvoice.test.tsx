import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as portalApi from '../api/portalApi';
import PortalApp from '../PortalApp';
import PortalAccessDeniedPage from '../pages/PortalAccessDeniedPage';
import PortalInvoiceDetailPage from '../pages/PortalInvoiceDetailPage';
import PortalInvoicePage from '../pages/PortalInvoicePage';
import type { PortalDebtSummary, PortalInvoice } from '../types/portalTypes';
import { parsePortalHash, portalFeatureOf } from '../utils/portalRoute';

vi.mock('../api/portalApi', async () => {
  const actual = await vi.importActual<typeof import('../api/portalApi')>('../api/portalApi');
  return {
    PortalApiError: actual.PortalApiError,
    fetchPortalProjects: vi.fn(() => Promise.resolve([])),
    fetchPortalProjectProgress: vi.fn(),
    fetchPortalAcceptances: vi.fn(() => Promise.resolve([])),
    fetchPortalInvoices: vi.fn(),
    fetchPortalInvoiceSummary: vi.fn(),
    fetchPortalInvoice: vi.fn(),
  };
});

const api = vi.mocked(portalApi);
const { PortalApiError } = portalApi;

function invoice(overrides: Partial<PortalInvoice> = {}): PortalInvoice {
  return {
    id: 9,
    invoiceCode: 'INV-20260901-A1B2C3',
    contractId: 3,
    contractCode: 'HD-2026-001',
    invoiceDate: '2026-08-15',
    dueDate: '2026-09-14',
    status: 'PARTIALLY_PAID',
    totalAmount: 100000000,
    paidAmount: 60000000,
    remainingAmount: 40000000,
    overdue: true,
    daysOverdue: 10,
    ...overrides,
  };
}

const three = [
  invoice(),
  invoice({ id: 10, invoiceCode: 'INV-2', status: 'ISSUED', totalAmount: 50000000, paidAmount: 0, remainingAmount: 50000000, dueDate: '2026-10-14', overdue: false, daysOverdue: 0 }),
  invoice({ id: 11, invoiceCode: 'INV-3', status: 'PAID', totalAmount: 30000000, paidAmount: 30000000, remainingAmount: 0, overdue: false, daysOverdue: 0 }),
];

const summary: PortalDebtSummary = {
  customerId: 1001,
  customerCode: 'KH-100001',
  customerName: 'Cong ty CP Giai Phap So Viet',
  invoiceCount: 3,
  totalInvoiced: 180000000,
  totalPaid: 90000000,
  totalOutstanding: 90000000,
  overdueInvoiceCount: 1,
  totalOverdue: 40000000,
  nextDueDate: '2026-10-14',
  nextDueAmount: 50000000,
};

beforeEach(() => {
  vi.clearAllMocks();
  window.history.replaceState(null, '', '/');
});
afterEach(() => window.history.replaceState(null, '', '/'));

describe('NCL-13-CN-004 — Khách hàng xem hóa đơn và công nợ', () => {
  it('TC-01: hiện ba hóa đơn kèm số đã trả, còn phải trả, hạn thanh toán và trạng thái; tổng hợp công nợ', async () => {
    api.fetchPortalInvoices.mockResolvedValue(three);
    api.fetchPortalInvoiceSummary.mockResolvedValue(summary);
    render(<PortalInvoicePage onOpen={vi.fn()} />);
    const table = await screen.findByTestId('portal-invoice-table');
    expect(within(table).getAllByRole('row').slice(1)).toHaveLength(3);

    const row = screen.getByTestId('portal-invoice-row-9');
    expect(row).toHaveTextContent('100.000.000 ₫');
    expect(row).toHaveTextContent('60.000.000 ₫');
    expect(row).toHaveTextContent('40.000.000 ₫');
    expect(row).toHaveTextContent('Hạn: 14/9/2026');
    expect(row).toHaveTextContent('quá 10 ngày');
    expect(row).toHaveTextContent('Thanh toán một phần');
    expect(screen.getByTestId('portal-invoice-row-10')).toHaveTextContent('Chưa thanh toán');
    expect(screen.getByTestId('portal-invoice-row-11')).toHaveTextContent('Đã thanh toán');

    expect(screen.getByTestId('portal-invoice-outstanding')).toHaveTextContent('90.000.000 ₫');
    expect(screen.getByTestId('portal-invoice-next-due')).toHaveTextContent('14/10/2026');
    expect(screen.getByTestId('portal-invoice-overdue-banner')).toHaveTextContent('40.000.000 ₫');
  });

  it('TC-01: lọc còn phải trả / quá hạn / đã thanh toán, tìm kiếm và mở chi tiết', async () => {
    const onOpen = vi.fn();
    api.fetchPortalInvoices.mockResolvedValue(three);
    api.fetchPortalInvoiceSummary.mockResolvedValue(summary);
    render(<PortalInvoicePage onOpen={onOpen} />);
    await screen.findByTestId('portal-invoice-table');
    const ids = () => screen.queryAllByTestId(/^portal-invoice-row-/).map((r) => r.getAttribute('data-testid'));

    fireEvent.click(screen.getByTestId('portal-invoice-tab-OUTSTANDING'));
    expect(ids()).toEqual(['portal-invoice-row-9', 'portal-invoice-row-10']);
    fireEvent.click(screen.getByTestId('portal-invoice-tab-OVERDUE'));
    expect(ids()).toEqual(['portal-invoice-row-9']);
    fireEvent.click(screen.getByTestId('portal-invoice-tab-PAID'));
    expect(ids()).toEqual(['portal-invoice-row-11']);
    fireEvent.click(screen.getByTestId('portal-invoice-tab-CANCELLED'));
    expect(screen.getByTestId('portal-invoice-empty')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('portal-invoice-tab-ALL'));
    fireEvent.change(screen.getByLabelText('Tìm hóa đơn'), { target: { value: 'inv-3' } });
    expect(ids()).toEqual(['portal-invoice-row-11']);
    fireEvent.click(screen.getByTestId('portal-invoice-open-11'));
    expect(onOpen).toHaveBeenCalledWith(11);
  });

  it('chưa có hóa đơn → thông báo trống; lỗi tải → thử lại', async () => {
    api.fetchPortalInvoices.mockResolvedValueOnce([]);
    api.fetchPortalInvoiceSummary.mockResolvedValue({ ...summary, invoiceCount: 0, overdueInvoiceCount: 0, totalOverdue: 0, nextDueDate: null });
    const { unmount } = render(<PortalInvoicePage onOpen={vi.fn()} />);
    expect(await screen.findByTestId('portal-invoice-empty')).toHaveTextContent('Chưa có hóa đơn nào');
    unmount();

    api.fetchPortalInvoices.mockRejectedValueOnce(new PortalApiError('NETWORK_ERROR', 'Không kết nối được máy chủ.', 503));
    api.fetchPortalInvoices.mockResolvedValueOnce(three);
    render(<PortalInvoicePage onOpen={vi.fn()} />);
    expect(await screen.findByText('Không kết nối được máy chủ.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }));
    expect(await screen.findByTestId('portal-invoice-table')).toBeInTheDocument();
  });

  it('chi tiết: dòng hóa đơn, lịch sử thanh toán, số còn phải trả, cảnh báo quá hạn', async () => {
    api.fetchPortalInvoice.mockResolvedValue({
      invoice: invoice(),
      lines: [{ description: 'Dot 1 - Nghiem thu giai doan 1', amount: 100000000 }],
      payments: [{ paymentDate: '2026-09-20', amount: 60000000, method: 'BANK_TRANSFER' }],
    });
    render(<PortalInvoiceDetailPage invoiceId={9} onBack={vi.fn()} />);
    await screen.findByTestId('portal-invoice-detail');
    expect(api.fetchPortalInvoice).toHaveBeenCalledWith(9);
    expect(screen.getByTestId('portal-invoice-lines')).toHaveTextContent('Dot 1 - Nghiem thu giai doan 1');
    expect(screen.getByTestId('portal-invoice-payments')).toHaveTextContent('Chuyển khoản');
    expect(screen.getByTestId('portal-invoice-payments')).toHaveTextContent('20/9/2026');
    expect(screen.getByTestId('portal-invoice-remaining')).toHaveTextContent('40.000.000 ₫');
    expect(screen.getByTestId('portal-invoice-overdue')).toHaveTextContent('10 ngày');
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '60');
  });

  it('chi tiết hóa đơn đã hủy báo không cần thanh toán', async () => {
    api.fetchPortalInvoice.mockResolvedValue({
      invoice: invoice({ status: 'CANCELLED', remainingAmount: 0, overdue: false, daysOverdue: 0, paidAmount: 0 }),
      lines: [],
      payments: [],
    });
    render(<PortalInvoiceDetailPage invoiceId={9} onBack={vi.fn()} />);
    expect(await screen.findByTestId('portal-invoice-cancelled')).toBeInTheDocument();
    expect(screen.getByTestId('portal-invoice-status')).toHaveTextContent('Đã hủy');
  });

  it('TC-02: hóa đơn của khách hàng khác (403) → màn từ chối, không hiện dữ liệu, quay lại được', async () => {
    const onBack = vi.fn();
    api.fetchPortalInvoice.mockRejectedValue(new PortalApiError('FORBIDDEN', 'x', 403));
    render(<PortalInvoiceDetailPage invoiceId={777} onBack={onBack} />);
    const denied = await screen.findByTestId('portal-invoice-forbidden');
    expect(denied).toHaveTextContent('Bạn không có quyền xem hóa đơn này');
    expect(denied).toHaveTextContent('ghi vào nhật ký');
    expect(denied).toHaveTextContent('777');
    expect(screen.queryByTestId('portal-invoice-detail')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('portal-invoice-back'));
    expect(onBack).toHaveBeenCalled();
  });

  it('TC-02: nhập trực tiếp đường dẫn hóa đơn trên cổng gọi đúng mã đó', async () => {
    api.fetchPortalInvoice.mockRejectedValue(new PortalApiError('FORBIDDEN', 'x', 403));
    window.history.replaceState(null, '', '/#/portal/invoices/555');
    render(
      <PortalApp
        session={{ accessToken: 't', tokenType: 'Bearer', userId: 17, username: 'khachhang01', fullName: 'Nguyen Thi Nhi', roles: ['VT-09'] }}
        onLogout={vi.fn()}
      />
    );
    expect(await screen.findByTestId('portal-invoice-forbidden')).toBeInTheDocument();
    expect(api.fetchPortalInvoice).toHaveBeenCalledWith(555);
    expect(screen.getByRole('button', { name: /Hóa đơn/ })).toHaveAttribute('aria-current', 'page');
  });

  it('TC-03: tài khoản nội bộ mở chức năng xem hóa đơn trên cổng → từ chối, gọi API hóa đơn cổng để ghi nhật ký', async () => {
    api.fetchPortalInvoices.mockRejectedValue(new PortalApiError('FORBIDDEN', 'x', 403));
    render(<PortalAccessDeniedPage currentUserRoles={['VT-05']} currentUserName="Ke toan" feature="invoices" onLeave={vi.fn()} />);
    expect(screen.getByTestId('portal-internal-denied')).toHaveTextContent('Xem hóa đơn và công nợ trên cổng chỉ dành cho khách hàng');
    await waitFor(() => expect(api.fetchPortalInvoices).toHaveBeenCalledTimes(1));
    expect(api.fetchPortalProjects).not.toHaveBeenCalled();
  });

  it('TC-04: trang chi tiết cho khách hàng biết lượt xem được ghi nhật ký cổng', async () => {
    api.fetchPortalInvoice.mockResolvedValue({ invoice: invoice({ overdue: false }), lines: [], payments: [] });
    render(<PortalInvoiceDetailPage invoiceId={9} onBack={vi.fn()} />);
    expect(await screen.findByText(/Lượt xem của bạn được ghi nhận/)).toBeInTheDocument();
  });

  it('đường dẫn hóa đơn', () => {
    expect(parsePortalHash('#/portal/invoices')).toEqual({ view: 'invoices' });
    expect(parsePortalHash('#/portal/invoices/9')).toEqual({ view: 'invoice', invoiceId: 9 });
    expect(parsePortalHash('#/portal/invoices/x')).toEqual({ view: 'invalid-invoice', raw: 'x' });
    expect(portalFeatureOf('#/portal/invoices/9')).toBe('invoices');
  });
});
