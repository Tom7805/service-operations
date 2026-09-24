import '@testing-library/jest-dom';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AcceptanceDetailPage from '../pages/AcceptanceDetailPage';
import * as acceptanceApi from '../api/acceptanceApi';
import type { AcceptanceDetailRes } from '../types/acceptanceTypes';

vi.mock('../api/acceptanceApi', () => {
  class MockAcceptanceApiError extends Error {
    constructor(public readonly code: string, message: string, public readonly statusCode?: number) {
      super(message);
      this.name = 'AcceptanceApiError';
    }
  }
  return { getAcceptance: vi.fn(), AcceptanceApiError: MockAcceptanceApiError };
});

const DETAIL: AcceptanceDetailRes = {
  id: 5, certificateCode: 'NT-20260924-A1B2C3', projectId: 12, projectCode: 'DA-001', projectName: 'Trien khai ERP',
  contractId: 3, workPackageId: 40, workPackageName: 'Giai doan 1', title: 'Nghiem thu giai doan 1',
  acceptedValue: 300000000, note: 'Theo moc 1 cua hop dong', status: 'PENDING_CONFIRMATION', revisionNo: 1,
  lastRejectionReason: null, signerName: null, signedDate: null, minutesUrl: null, confirmationChannel: null,
  confirmedBy: null, confirmedAt: null, paymentMilestone: null, linkedBy: null, linkedAt: null,
  tasks: [{ taskId: 100, taskName: 'Phan tich yeu cau' }, { taskId: 103, taskName: 'Lap trinh phan he' }],
  deliverables: [{ deliverableId: 7, deliverableVersionId: 15, deliverableName: 'Tai lieu thiet ke', versionNo: '1.1' }],
  decisions: [],
  createdBy: 'pm01', createdAt: '2026-09-24T10:00:00', updatedAt: '2026-09-24T10:00:00',
};

describe('AcceptanceDetailPage — NCL-12-CN-001', () => {
  beforeEach(() => {
    vi.mocked(acceptanceApi.getAcceptance).mockReset();
  });

  it('TC-01/TC-04: hiện nội dung phiếu, trạng thái chờ xác nhận và lịch sử người lập + thời điểm', async () => {
    vi.mocked(acceptanceApi.getAcceptance).mockResolvedValue(DETAIL);
    const onBack = vi.fn();
    render(<AcceptanceDetailPage certificateId={5} onBack={onBack} />);

    expect(await screen.findByTestId('acceptance-detail-status')).toHaveTextContent('Chờ khách hàng xác nhận');
    expect(acceptanceApi.getAcceptance).toHaveBeenCalledWith(5);
    const tasks = screen.getByTestId('acceptance-detail-tasks');
    expect(within(tasks).getByText('Phan tich yeu cau')).toBeInTheDocument();
    expect(within(tasks).getByText('Lap trinh phan he')).toBeInTheDocument();
    expect(screen.getByText('Tai lieu thiet ke')).toBeInTheDocument();

    const history = screen.getByTestId('acceptance-detail-history');
    expect(history).toHaveTextContent('pm01');
    expect(history).toHaveTextContent('Lập phiếu nghiệm thu');
    expect(history).toHaveTextContent(new Date('2026-09-24T10:00:00').toLocaleString('vi-VN'));

    fireEvent.click(screen.getByLabelText('Quay lại danh sách nghiệm thu'));
    expect(onBack).toHaveBeenCalled();
  });

  it('lịch sử gồm cả các lần khách hàng từ chối kèm lý do', async () => {
    vi.mocked(acceptanceApi.getAcceptance).mockResolvedValue({
      ...DETAIL,
      status: 'NEEDS_REVISION',
      lastRejectionReason: 'Thieu tai lieu huong dan',
      decisions: [
        {
          id: 1, decision: 'REJECTED', channel: 'INTERNAL', revisionNo: 1, signerName: null, signedDate: null,
          minutesUrl: null, reason: 'Thieu tai lieu huong dan', recordedBy: 'pm01', recordedAt: '2026-09-25T09:00:00',
        },
      ],
    });
    render(<AcceptanceDetailPage certificateId={5} onBack={vi.fn()} />);
    const history = await screen.findByTestId('acceptance-detail-history');
    expect(history).toHaveTextContent('Khách hàng từ chối (lần nộp 1)');
    expect(history).toHaveTextContent('Thieu tai lieu huong dan');
  });

  it('lỗi tải (ví dụ 403 phiếu của dự án khác) → thông báo lỗi và nút thử lại', async () => {
    const { AcceptanceApiError } = acceptanceApi;
    vi.mocked(acceptanceApi.getAcceptance)
      .mockRejectedValueOnce(new AcceptanceApiError('FORBIDDEN', 'Bạn không có quyền thao tác trên dự án này', 403))
      .mockResolvedValueOnce(DETAIL);
    render(<AcceptanceDetailPage certificateId={5} onBack={vi.fn()} />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Bạn không có quyền thao tác trên dự án này');
    fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }));
    expect(await screen.findByTestId('acceptance-detail-status')).toBeInTheDocument();
  });
});
