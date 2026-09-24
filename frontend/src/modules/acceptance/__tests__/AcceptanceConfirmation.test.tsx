import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AcceptanceDetailPage from '../pages/AcceptanceDetailPage';
import * as acceptanceApi from '../api/acceptanceApi';
import type { AcceptanceDetailRes } from '../types/acceptanceTypes';
import { todayLocalIso } from '../validators/acceptanceValidators';

vi.mock('../api/acceptanceApi', () => {
  class MockAcceptanceApiError extends Error {
    constructor(public readonly code: string, message: string, public readonly statusCode?: number) {
      super(message);
      this.name = 'AcceptanceApiError';
    }
  }
  return {
    getAcceptance: vi.fn(),
    confirmAcceptance: vi.fn(),
    rejectAcceptance: vi.fn(),
    resubmitAcceptance: vi.fn(),
    AcceptanceApiError: MockAcceptanceApiError,
  };
});

const TODAY = todayLocalIso();

const PENDING: AcceptanceDetailRes = {
  id: 5, certificateCode: 'NT-20260924-A1B2C3', projectId: 12, projectCode: 'DA-001', projectName: 'Trien khai ERP',
  contractId: 3, workPackageId: 40, workPackageName: 'Giai doan 1', title: 'Nghiem thu giai doan 1',
  acceptedValue: 300000000, note: null, status: 'PENDING_CONFIRMATION', revisionNo: 1, lastRejectionReason: null,
  signerName: null, signedDate: null, minutesUrl: null, confirmationChannel: null, confirmedBy: null, confirmedAt: null,
  paymentMilestone: { id: 101, name: 'Dot 1', amount: 300000000, expectedDate: '2026-11-30', status: 'PENDING' },
  linkedBy: 'ketoan01', linkedAt: '2026-09-24T11:00:00',
  tasks: [{ taskId: 100, taskName: 'Phan tich yeu cau' }],
  deliverables: [],
  decisions: [],
  createdBy: 'pm01', createdAt: `${TODAY}T08:00:00`, updatedAt: `${TODAY}T08:00:00`,
};

const ACCEPTED: AcceptanceDetailRes = {
  ...PENDING,
  status: 'ACCEPTED',
  signerName: 'Nguyen Van A',
  signedDate: TODAY,
  minutesUrl: '/files/nghiem-thu/NT-20260924-A1B2C3/bien-ban.pdf',
  confirmationChannel: 'INTERNAL',
  confirmedBy: 'pm01',
  confirmedAt: `${TODAY}T09:00:00`,
  paymentMilestone: { ...PENDING.paymentMilestone!, status: 'READY_TO_INVOICE' },
  decisions: [
    {
      id: 1, decision: 'ACCEPTED', channel: 'INTERNAL', revisionNo: 1, signerName: 'Nguyen Van A', signedDate: TODAY,
      minutesUrl: '/files/nghiem-thu/NT-20260924-A1B2C3/bien-ban.pdf', reason: null, recordedBy: 'pm01',
      recordedAt: `${TODAY}T09:00:00`,
    },
  ],
};

const REJECTED: AcceptanceDetailRes = {
  ...PENDING,
  status: 'NEEDS_REVISION',
  lastRejectionReason: 'Thieu tai lieu huong dan',
  decisions: [
    {
      id: 2, decision: 'REJECTED', channel: 'INTERNAL', revisionNo: 1, signerName: 'Nguyen Van A', signedDate: null,
      minutesUrl: null, reason: 'Thieu tai lieu huong dan', recordedBy: 'pm01', recordedAt: `${TODAY}T09:30:00`,
    },
  ],
};

async function renderDetail(cert: AcceptanceDetailRes, roles = ['VT-02']) {
  vi.mocked(acceptanceApi.getAcceptance).mockResolvedValue(cert);
  render(<AcceptanceDetailPage certificateId={cert.id} onBack={vi.fn()} currentUserRoles={roles} />);
  await screen.findByTestId('acceptance-detail-status');
}

describe('NCL-12-CN-002 — Khách hàng xác nhận phiếu nghiệm thu', () => {
  beforeEach(() => {
    vi.mocked(acceptanceApi.getAcceptance).mockReset();
    vi.mocked(acceptanceApi.confirmAcceptance).mockReset();
    vi.mocked(acceptanceApi.rejectAcceptance).mockReset();
    vi.mocked(acceptanceApi.resubmitAcceptance).mockReset();
  });

  it('TC-01: ghi nhận xác nhận (qua bước xác nhận) → đã nghiệm thu, khoá nội dung, mốc thanh toán được mở', async () => {
    vi.mocked(acceptanceApi.confirmAcceptance).mockResolvedValue(ACCEPTED);
    await renderDetail(PENDING);

    fireEvent.click(screen.getByTestId('acceptance-open-confirm'));
    fireEvent.change(screen.getByLabelText(/Người đại diện khách hàng/), { target: { value: 'Nguyen Van A' } });
    const file = new File(['pdf'], 'bien ban.pdf', { type: 'application/pdf' });
    fireEvent.change(screen.getByTestId('acceptance-minutes-file'), { target: { files: [file] } });
    expect(screen.getByLabelText(/Biên bản nghiệm thu/)).toHaveValue('/files/nghiem-thu/NT-20260924-A1B2C3/bien-ban.pdf');

    fireEvent.click(screen.getByTestId('acceptance-decision-submit'));
    const review = await screen.findByTestId('acceptance-decision-review');
    expect(review).toHaveTextContent('Thao tác không thể hoàn tác');
    expect(review).toHaveTextContent('Mốc thanh toán "Dot 1" sẽ được mở sang Sẵn sàng xuất hóa đơn');
    expect(acceptanceApi.confirmAcceptance).not.toHaveBeenCalled();

    fireEvent.click(screen.getByTestId('acceptance-decision-confirm'));
    await waitFor(() =>
      expect(acceptanceApi.confirmAcceptance).toHaveBeenCalledWith(5, {
        signerName: 'Nguyen Van A',
        signedDate: TODAY,
        minutesUrl: '/files/nghiem-thu/NT-20260924-A1B2C3/bien-ban.pdf',
      })
    );
    expect(await screen.findByTestId('acceptance-detail-notice')).toHaveTextContent('Sẵn sàng xuất hóa đơn');
    expect(screen.getByTestId('acceptance-detail-status')).toHaveTextContent('Đã nghiệm thu');
    expect(screen.getByTestId('acceptance-locked')).toBeInTheDocument();
    expect(screen.getByTestId('acceptance-detail-milestone')).toHaveTextContent('Sẵn sàng xuất hóa đơn');
    expect(screen.queryByTestId('acceptance-decision-actions')).not.toBeInTheDocument();
    expect(screen.queryByTestId('acceptance-open-resubmit')).not.toBeInTheDocument();
  });

  it('TC-01: thiếu người ký/biên bản hoặc ngày ký ở tương lai → báo lỗi ngay, không gọi máy chủ', async () => {
    await renderDetail(PENDING);
    fireEvent.click(screen.getByTestId('acceptance-open-confirm'));
    fireEvent.change(screen.getByLabelText(/Ngày ký biên bản/), { target: { value: '2999-01-01' } });
    fireEvent.click(screen.getByTestId('acceptance-decision-submit'));

    expect(await screen.findByText('Nhập tên người đại diện khách hàng ký xác nhận')).toBeInTheDocument();
    expect(screen.getByText('Ngày ký biên bản không được ở tương lai')).toBeInTheDocument();
    expect(screen.getByText('Tải lên hoặc nhập đường dẫn biên bản nghiệm thu đã ký')).toBeInTheDocument();
    expect(screen.queryByTestId('acceptance-decision-review')).not.toBeInTheDocument();
    expect(acceptanceApi.confirmAcceptance).not.toHaveBeenCalled();
  });

  it('TC-02: ghi nhận từ chối kèm lý do → phiếu cần chỉnh sửa và lý do được lưu, hiện nút nộp lại', async () => {
    vi.mocked(acceptanceApi.rejectAcceptance).mockResolvedValue(REJECTED);
    await renderDetail(PENDING);

    fireEvent.click(screen.getByTestId('acceptance-open-reject'));
    fireEvent.click(screen.getByTestId('acceptance-decision-submit'));
    expect(await screen.findByText('Nhập lý do khách hàng từ chối nghiệm thu')).toBeInTheDocument();
    expect(acceptanceApi.rejectAcceptance).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText(/Lý do khách hàng từ chối/), { target: { value: 'Thieu tai lieu huong dan' } });
    fireEvent.change(screen.getByLabelText(/Người đại diện khách hàng/), { target: { value: 'Nguyen Van A' } });
    fireEvent.click(screen.getByTestId('acceptance-decision-submit'));

    await waitFor(() =>
      expect(acceptanceApi.rejectAcceptance).toHaveBeenCalledWith(5, {
        reason: 'Thieu tai lieu huong dan',
        signerName: 'Nguyen Van A',
        minutesUrl: null,
      })
    );
    expect(await screen.findByTestId('acceptance-detail-notice')).toHaveTextContent('cần chỉnh sửa');
    expect(screen.getByTestId('acceptance-detail-status')).toHaveTextContent('Cần chỉnh sửa');
    expect(screen.getByText('Lý do khách hàng từ chối')).toBeInTheDocument();
    expect(screen.getByTestId('acceptance-open-resubmit')).toBeInTheDocument();
  });

  it('TC-02: nộp lại phiếu sau khi bị từ chối → quay về chờ khách hàng xác nhận, tăng lần nộp', async () => {
    vi.mocked(acceptanceApi.resubmitAcceptance).mockResolvedValue({
      ...PENDING, revisionNo: 2, acceptedValue: 250000000, decisions: REJECTED.decisions,
      updatedAt: `${TODAY}T10:00:00`,
    });
    await renderDetail(REJECTED);

    fireEvent.click(screen.getByTestId('acceptance-open-resubmit'));
    expect(screen.getByTestId('acceptance-resubmit-modal')).toHaveTextContent('Thieu tai lieu huong dan');
    fireEvent.change(screen.getByLabelText(/Giá trị nghiệm thu/), { target: { value: '250000000' } });
    fireEvent.click(screen.getByTestId('acceptance-resubmit-submit'));

    await waitFor(() =>
      expect(acceptanceApi.resubmitAcceptance).toHaveBeenCalledWith(5, {
        title: 'Nghiem thu giai doan 1',
        acceptedValue: 250000000,
        note: null,
      })
    );
    expect(await screen.findByTestId('acceptance-detail-notice')).toHaveTextContent('lần 2');
    expect(screen.getByTestId('acceptance-detail-status')).toHaveTextContent('Chờ khách hàng xác nhận');
    expect(screen.getByTestId('acceptance-detail-history')).toHaveTextContent('Nộp lại phiếu (lần 2)');
  });

  it('TC-03: người không phải Quản lý dự án không có thao tác xác nhận/từ chối', async () => {
    await renderDetail(PENDING, ['VT-05']);
    expect(screen.queryByTestId('acceptance-decision-actions')).not.toBeInTheDocument();
  });

  it('TC-03: backend từ chối (PM khác dự án) → hiện lỗi trong hộp thoại, phiếu giữ nguyên', async () => {
    const { AcceptanceApiError } = acceptanceApi;
    vi.mocked(acceptanceApi.rejectAcceptance).mockRejectedValue(
      new AcceptanceApiError('FORBIDDEN', 'Bạn không có quyền thao tác trên dự án này', 403)
    );
    await renderDetail(PENDING);
    fireEvent.click(screen.getByTestId('acceptance-open-reject'));
    fireEvent.change(screen.getByLabelText(/Lý do khách hàng từ chối/), { target: { value: 'Sai' } });
    fireEvent.click(screen.getByTestId('acceptance-decision-submit'));
    expect(await screen.findByTestId('acceptance-decision-error')).toHaveTextContent('Bạn không có quyền');
    expect(screen.getByTestId('acceptance-detail-status')).toHaveTextContent('Chờ khách hàng xác nhận');
  });

  it('TC-04: lịch sử ghi người thực hiện, nội dung (người ký, biên bản, kênh) và thời điểm xác nhận', async () => {
    await renderDetail(ACCEPTED);
    const history = screen.getByTestId('acceptance-detail-history');
    expect(history).toHaveTextContent('Khách hàng xác nhận (lần nộp 1)');
    expect(history).toHaveTextContent('Người ký: Nguyen Van A');
    expect(history).toHaveTextContent('biên bản /files/nghiem-thu/NT-20260924-A1B2C3/bien-ban.pdf');
    expect(history).toHaveTextContent('kênh: QLDA ghi nhận');
    expect(history).toHaveTextContent(new Date(`${TODAY}T09:00:00`).toLocaleString('vi-VN'));
    expect(history).toHaveTextContent('pm01');
  });
});
