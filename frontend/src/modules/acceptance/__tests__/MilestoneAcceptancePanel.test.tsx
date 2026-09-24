import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import MilestoneAcceptancePanel from '../components/MilestoneAcceptancePanel';
import * as acceptanceApi from '../api/acceptanceApi';
import type { AcceptanceCertificateRes, AcceptanceDetailRes, MilestoneAcceptanceRes } from '../types/acceptanceTypes';

vi.mock('../api/acceptanceApi', () => {
  class MockAcceptanceApiError extends Error {
    constructor(public readonly code: string, message: string, public readonly statusCode?: number) {
      super(message);
      this.name = 'AcceptanceApiError';
    }
  }
  return {
    fetchMilestoneAcceptances: vi.fn(),
    searchAcceptances: vi.fn(),
    linkPaymentMilestone: vi.fn(),
    unlinkPaymentMilestone: vi.fn(),
    getAcceptance: vi.fn(),
    AcceptanceApiError: MockAcceptanceApiError,
  };
});

vi.mock('../../invoices/api/invoicesApi', () => ({
  createInvoiceFromMilestone: vi.fn(),
  InvoicesApiError: class extends Error {},
}));

const base: MilestoneAcceptanceRes = {
  milestoneId: 101, contractId: 3, milestoneName: 'Dot 1', amount: 300000000, expectedDate: '2026-11-30',
  acceptanceCondition: null, milestoneStatus: 'PENDING', certificateId: null, certificateCode: null,
  certificateStatus: null, projectCode: null, workPackageName: null,
};

const ROW_READY: MilestoneAcceptanceRes = {
  ...base, milestoneStatus: 'READY_TO_INVOICE', certificateId: 5, certificateCode: 'NT-A', certificateStatus: 'ACCEPTED',
  projectCode: 'DA-001', workPackageName: 'Giai doan 1',
};
const ROW_PENDING_CERT: MilestoneAcceptanceRes = {
  ...base, milestoneId: 102, milestoneName: 'Dot 2', certificateId: 6, certificateCode: 'NT-B',
  certificateStatus: 'PENDING_CONFIRMATION', projectCode: 'DA-001', workPackageName: 'Giai doan 2',
};
const ROW_EMPTY: MilestoneAcceptanceRes = { ...base, milestoneId: 103, milestoneName: 'Dot 3' };
const ROW_INVOICED: MilestoneAcceptanceRes = { ...ROW_READY, milestoneId: 104, milestoneName: 'Dot 0', milestoneStatus: 'INVOICED' };

function cert(id: number, status: AcceptanceCertificateRes['status'], milestone?: { id: number; name: string }): AcceptanceCertificateRes {
  return {
    id, certificateCode: `NT-${id}`, projectId: 12, projectCode: 'DA-001', projectName: 'ERP', contractId: 3,
    workPackageId: 40 + id, workPackageName: `Hang muc ${id}`, title: `Nghiem thu ${id}`, acceptedValue: 100000000,
    status, revisionNo: 1, contractMilestoneId: milestone?.id ?? null, contractMilestoneName: milestone?.name ?? null,
    createdBy: 'pm01', createdAt: '2026-09-24T10:00:00', confirmedAt: status === 'ACCEPTED' ? '2026-09-25T09:00:00' : null,
  };
}

function detail(overrides: Partial<AcceptanceDetailRes>): AcceptanceDetailRes {
  return {
    id: 7, certificateCode: 'NT-7', projectId: 12, projectCode: 'DA-001', projectName: 'ERP', contractId: 3,
    workPackageId: 47, workPackageName: 'Hang muc 7', title: 'Nghiem thu 7', acceptedValue: 100000000, note: null,
    status: 'ACCEPTED', revisionNo: 1, lastRejectionReason: null, signerName: 'Nguyen Van A', signedDate: '2026-09-25',
    minutesUrl: '/f.pdf', confirmationChannel: 'INTERNAL', confirmedBy: 'pm01', confirmedAt: '2026-09-25T09:00:00',
    paymentMilestone: null, linkedBy: null, linkedAt: null, tasks: [], deliverables: [], decisions: [],
    createdBy: 'pm01', createdAt: '2026-09-24T10:00:00', updatedAt: '2026-09-25T09:00:00',
    ...overrides,
  };
}

describe('MilestoneAcceptancePanel — NCL-12-CN-003', () => {
  beforeEach(() => {
    vi.mocked(acceptanceApi.fetchMilestoneAcceptances).mockReset().mockResolvedValue([ROW_READY, ROW_PENDING_CERT, ROW_EMPTY, ROW_INVOICED]);
    vi.mocked(acceptanceApi.searchAcceptances).mockReset();
    vi.mocked(acceptanceApi.linkPaymentMilestone).mockReset();
    vi.mocked(acceptanceApi.unlinkPaymentMilestone).mockReset();
    vi.mocked(acceptanceApi.getAcceptance).mockReset();
  });

  it('liệt kê mốc kèm phiếu và điều kiện lập hóa đơn; chỉ mốc có phiếu đã xác nhận được lập hóa đơn', async () => {
    const onChanged = vi.fn();
    render(<MilestoneAcceptancePanel contractId={3} currentUserRoles={['VT-05']} onChanged={onChanged} />);
    await screen.findByTestId('milestone-acceptance-table');
    expect(acceptanceApi.fetchMilestoneAcceptances).toHaveBeenCalledWith(3);

    const ready = screen.getByTestId('milestone-acceptance-row-101');
    expect(ready).toHaveTextContent('Sẵn sàng xuất hóa đơn');
    expect(ready).toHaveTextContent('NT-A');
    expect(ready).toHaveTextContent('Đủ điều kiện');
    expect(screen.getByTestId('milestone-acceptance-invoice-101')).toBeEnabled();
    expect(screen.getByTestId('milestone-acceptance-row-104')).toHaveTextContent('Đã xuất hóa đơn');
    expect(screen.queryByTestId('milestone-acceptance-invoice-104')).not.toBeInTheDocument();
    expect(screen.getByTestId('milestone-acceptance-unlink-104')).toBeDisabled();
    expect(screen.getByText(/1\/4 mốc đủ điều kiện/)).toBeInTheDocument();
  });

  it('TC-02: mốc gắn phiếu còn chờ xác nhận → chặn lập hóa đơn và báo mốc chưa đủ điều kiện', async () => {
    render(<MilestoneAcceptancePanel contractId={3} currentUserRoles={['VT-05']} />);
    await screen.findByTestId('milestone-acceptance-table');
    expect(screen.getByTestId('milestone-acceptance-invoice-102')).toBeDisabled();
    expect(screen.getByTestId('milestone-acceptance-reason-102')).toHaveTextContent(
      'Chưa đủ điều kiện lập hóa đơn: phiếu NT-B chưa được khách hàng xác nhận (chờ khách hàng xác nhận).'
    );
    expect(screen.getByTestId('milestone-acceptance-invoice-103')).toBeDisabled();
    expect(screen.getByTestId('milestone-acceptance-reason-103')).toHaveTextContent('chưa gắn phiếu nghiệm thu');
  });

  it('TC-01: gắn phiếu đã xác nhận → xem trước mốc sẽ mở, xác nhận gắn, mốc đủ điều kiện lập hóa đơn', async () => {
    const onChanged = vi.fn();
    vi.mocked(acceptanceApi.searchAcceptances).mockResolvedValue([
      cert(7, 'ACCEPTED'),
      cert(8, 'PENDING_CONFIRMATION'),
      cert(5, 'ACCEPTED', { id: 101, name: 'Dot 1' }),
    ]);
    vi.mocked(acceptanceApi.linkPaymentMilestone).mockResolvedValue(
      detail({
        paymentMilestone: { id: 103, name: 'Dot 3', amount: 300000000, expectedDate: '2026-11-30', status: 'READY_TO_INVOICE' },
        linkedBy: 'ketoan01', linkedAt: '2026-09-25T10:00:00',
      })
    );
    render(<MilestoneAcceptancePanel contractId={3} currentUserRoles={['VT-05']} onChanged={onChanged} />);
    await screen.findByTestId('milestone-acceptance-table');

    fireEvent.click(screen.getByTestId('milestone-acceptance-link-103'));
    const modal = await screen.findByTestId('milestone-link-modal');
    await within(modal).findByTestId('milestone-link-option-7');
    expect(acceptanceApi.searchAcceptances).toHaveBeenCalledWith({ contractId: 3 });
    // Phiếu đã gắn mốc khác bị khoá lựa chọn.
    expect(within(screen.getByTestId('milestone-link-option-5')).getByRole('radio')).toBeDisabled();
    expect(screen.getByTestId('milestone-link-submit')).toBeDisabled();

    fireEvent.click(within(screen.getByTestId('milestone-link-option-8')).getByRole('radio'));
    expect(screen.getByTestId('milestone-link-preview')).toHaveTextContent('Chờ nghiệm thu');
    fireEvent.click(within(screen.getByTestId('milestone-link-option-7')).getByRole('radio'));
    expect(screen.getByTestId('milestone-link-preview')).toHaveTextContent('Sẵn sàng xuất hóa đơn');

    vi.mocked(acceptanceApi.fetchMilestoneAcceptances).mockResolvedValue([
      { ...ROW_EMPTY, milestoneStatus: 'READY_TO_INVOICE', certificateId: 7, certificateCode: 'NT-7', certificateStatus: 'ACCEPTED', projectCode: 'DA-001', workPackageName: 'Hang muc 7' },
    ]);
    fireEvent.click(screen.getByTestId('milestone-link-submit'));

    await waitFor(() => expect(acceptanceApi.linkPaymentMilestone).toHaveBeenCalledWith(7, { contractMilestoneId: 103 }));
    expect(await screen.findByTestId('milestone-acceptance-notice')).toHaveTextContent(
      'Đã gắn phiếu NT-7 vào mốc "Dot 3" — mốc sẵn sàng xuất hóa đơn.'
    );
    expect(onChanged).toHaveBeenCalled();
    await waitFor(() => expect(screen.getByTestId('milestone-acceptance-invoice-103')).toBeEnabled());
  });

  it('gắn thất bại (mốc đã gắn phiếu khác) → báo lỗi trong hộp thoại', async () => {
    const { AcceptanceApiError } = acceptanceApi;
    vi.mocked(acceptanceApi.searchAcceptances).mockResolvedValue([cert(7, 'ACCEPTED')]);
    vi.mocked(acceptanceApi.linkPaymentMilestone).mockRejectedValue(
      new AcceptanceApiError('DUPLICATE_DATA', 'Moc thanh toan da gan voi phieu khac', 409)
    );
    render(<MilestoneAcceptancePanel contractId={3} currentUserRoles={['VT-05']} />);
    await screen.findByTestId('milestone-acceptance-table');
    fireEvent.click(screen.getByTestId('milestone-acceptance-link-103'));
    fireEvent.click(within(await screen.findByTestId('milestone-link-option-7')).getByRole('radio'));
    fireEvent.click(screen.getByTestId('milestone-link-submit'));
    expect(await screen.findByTestId('milestone-link-error')).toHaveTextContent('Moc thanh toan da gan voi phieu khac');
  });

  it('gỡ phiếu khỏi mốc đang mở → cảnh báo mốc về chờ nghiệm thu, xác nhận rồi gỡ', async () => {
    vi.mocked(acceptanceApi.unlinkPaymentMilestone).mockResolvedValue(detail({ id: 5, certificateCode: 'NT-A' }));
    render(<MilestoneAcceptancePanel contractId={3} currentUserRoles={['VT-05']} />);
    await screen.findByTestId('milestone-acceptance-table');
    fireEvent.click(screen.getByTestId('milestone-acceptance-unlink-101'));
    expect(screen.getByTestId('milestone-unlink-modal')).toHaveTextContent('quay về "Chờ nghiệm thu"');
    fireEvent.click(screen.getByTestId('milestone-unlink-submit'));
    await waitFor(() => expect(acceptanceApi.unlinkPaymentMilestone).toHaveBeenCalledWith(5));
    expect(await screen.findByTestId('milestone-acceptance-notice')).toHaveTextContent('Đã gỡ phiếu NT-A khỏi mốc "Dot 1"');
  });

  it('TC-04: xem lịch sử phiếu — ai gắn mốc, lúc nào, nội dung', async () => {
    vi.mocked(acceptanceApi.getAcceptance).mockResolvedValue(
      detail({
        id: 5, certificateCode: 'NT-A',
        paymentMilestone: { id: 101, name: 'Dot 1', amount: 300000000, expectedDate: '2026-11-30', status: 'READY_TO_INVOICE' },
        linkedBy: 'ketoan01', linkedAt: '2026-09-25T10:00:00',
      })
    );
    render(<MilestoneAcceptancePanel contractId={3} currentUserRoles={['VT-05']} />);
    await screen.findByTestId('milestone-acceptance-table');
    fireEvent.click(screen.getByTestId('milestone-acceptance-history-101'));
    const table = await screen.findByTestId('acceptance-history-table');
    expect(acceptanceApi.getAcceptance).toHaveBeenCalledWith(5);
    expect(table).toHaveTextContent('ketoan01');
    expect(table).toHaveTextContent('Gắn vào mốc thanh toán');
    expect(table).toHaveTextContent('Mốc "Dot 1"');
    expect(table).toHaveTextContent(new Date('2026-09-25T10:00:00').toLocaleString('vi-VN'));
  });

  it('TC-03: người không phải Kế toán không thấy chức năng và không gọi API', () => {
    const { container } = render(<MilestoneAcceptancePanel contractId={3} currentUserRoles={['VT-02']} />);
    expect(container).toBeEmptyDOMElement();
    expect(acceptanceApi.fetchMilestoneAcceptances).not.toHaveBeenCalled();
  });
});
