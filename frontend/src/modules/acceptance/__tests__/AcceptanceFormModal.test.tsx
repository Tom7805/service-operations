import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AcceptanceFormModal from '../components/AcceptanceFormModal';
import * as acceptanceApi from '../api/acceptanceApi';
import type { AcceptanceDetailRes, AcceptanceReadinessRes } from '../types/acceptanceTypes';
import { flattenWorkPackages } from '../utils/workPackageTree';
import type { WorkBreakdownRes } from '../../projects/types/taskTypes';

vi.mock('../api/acceptanceApi', () => {
  class MockAcceptanceApiError extends Error {
    constructor(public readonly code: string, message: string, public readonly statusCode?: number) {
      super(message);
      this.name = 'AcceptanceApiError';
    }
  }
  return {
    getAcceptanceReadiness: vi.fn(),
    createAcceptance: vi.fn(),
    AcceptanceApiError: MockAcceptanceApiError,
  };
});

const TREE: WorkBreakdownRes[] = [
  {
    id: 40, parentId: null, name: 'Giai doan 1', description: null, children: [],
    tasks: [
      { id: 100, projectId: 12, workPackageId: 40, parentTaskId: null, name: 'Phan tich yeu cau', description: null, expectedStartDate: null, expectedEndDate: null, status: 'DONE' },
      { id: 103, projectId: 12, workPackageId: 40, parentTaskId: null, name: 'Lap trinh phan he', description: null, expectedStartDate: null, expectedEndDate: null, status: 'DONE' },
    ],
  },
  { id: 50, parentId: null, name: 'Giai doan 2', description: null, children: [], tasks: [] },
];
const WPS = flattenWorkPackages(TREE);

const READY: AcceptanceReadinessRes = {
  projectId: 12, workPackageId: 40, workPackageName: 'Giai doan 1', ready: true, totalTasks: 2, doneTasks: 2,
  unfinishedTasks: [],
  deliverables: [
    { deliverableId: 7, deliverableName: 'Tai lieu thiet ke', latestVersionId: 15, latestVersionNo: '1.1' },
    { deliverableId: 8, deliverableName: 'Ban cai dat', latestVersionId: null, latestVersionNo: null },
  ],
  activeCertificateId: null, activeCertificateCode: null, activeCertificateStatus: null,
};

const NOT_READY: AcceptanceReadinessRes = {
  ...READY, workPackageId: 50, workPackageName: 'Giai doan 2', ready: false, totalTasks: 3, doneTasks: 1,
  unfinishedTasks: [
    { taskId: 101, taskName: 'Kiem thu', status: 'IN_PROGRESS' },
    { taskId: 102, taskName: 'Trien khai', status: 'TODO' },
  ],
  deliverables: [],
};

const CREATED: AcceptanceDetailRes = {
  id: 5, certificateCode: 'NT-20260924-A1B2C3', projectId: 12, projectCode: 'DA-001', projectName: 'Trien khai ERP',
  contractId: 3, workPackageId: 40, workPackageName: 'Giai doan 1', title: 'Nghiem thu giai doan 1',
  acceptedValue: 300000000, note: null, status: 'PENDING_CONFIRMATION', revisionNo: 1, lastRejectionReason: null,
  signerName: null, signedDate: null, minutesUrl: null, confirmationChannel: null, confirmedBy: null, confirmedAt: null,
  paymentMilestone: null, linkedBy: null, linkedAt: null,
  tasks: [{ taskId: 100, taskName: 'Phan tich yeu cau' }, { taskId: 103, taskName: 'Lap trinh phan he' }],
  deliverables: [{ deliverableId: 7, deliverableVersionId: 15, deliverableName: 'Tai lieu thiet ke', versionNo: '1.1' }],
  decisions: [], createdBy: 'pm01', createdAt: '2026-09-24T10:00:00', updatedAt: '2026-09-24T10:00:00',
};

function renderModal(props: Partial<Parameters<typeof AcceptanceFormModal>[0]> = {}) {
  const onCreated = vi.fn();
  render(
    <AcceptanceFormModal
      isOpen
      onClose={vi.fn()}
      onCreated={onCreated}
      projectId={12}
      projectLabel="DA-001 — Trien khai ERP"
      workPackages={WPS}
      currentUserRoles={['VT-02']}
      {...props}
    />
  );
  return { onCreated };
}

describe('AcceptanceFormModal — NCL-12-CN-001', () => {
  beforeEach(() => {
    vi.mocked(acceptanceApi.getAcceptanceReadiness).mockReset();
    vi.mocked(acceptanceApi.createAcceptance).mockReset();
  });

  it('TC-01: hạng mục đã xong → xem trước nội dung, xác nhận và lập phiếu chờ khách hàng xác nhận', async () => {
    vi.mocked(acceptanceApi.getAcceptanceReadiness).mockResolvedValue(READY);
    vi.mocked(acceptanceApi.createAcceptance).mockResolvedValue(CREATED);
    const { onCreated } = renderModal({ initialWorkPackageId: 40 });

    expect(await screen.findByTestId('acceptance-ready')).toBeInTheDocument();
    expect(acceptanceApi.getAcceptanceReadiness).toHaveBeenCalledWith(12, 40);
    const preview = screen.getByTestId('acceptance-preview');
    expect(preview).toHaveTextContent('#100 Phan tich yeu cau');
    expect(preview).toHaveTextContent('#103 Lap trinh phan he');
    expect(preview).toHaveTextContent('Phiên bản 1.1');
    expect(preview).toHaveTextContent('Chưa bàn giao — không vào phiếu');

    fireEvent.change(screen.getByLabelText(/Giá trị nghiệm thu/), { target: { value: '300.000.000' } });
    fireEvent.change(screen.getByLabelText('Tiêu đề phiếu'), { target: { value: 'Nghiem thu giai doan 1' } });
    fireEvent.click(screen.getByTestId('acceptance-submit'));

    expect(await screen.findByTestId('acceptance-confirm-step')).toHaveTextContent('Chờ khách hàng xác nhận');
    expect(acceptanceApi.createAcceptance).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId('acceptance-confirm-submit'));

    await waitFor(() => expect(onCreated).toHaveBeenCalledWith(CREATED));
    expect(acceptanceApi.createAcceptance).toHaveBeenCalledWith(12, {
      workPackageId: 40,
      title: 'Nghiem thu giai doan 1',
      acceptedValue: 300000000,
      note: null,
    });
  });

  it('TC-02: hạng mục còn công việc dang dở → khoá nút lập phiếu và liệt kê các công việc đó', async () => {
    vi.mocked(acceptanceApi.getAcceptanceReadiness).mockResolvedValue(NOT_READY);
    renderModal();

    fireEvent.change(screen.getByLabelText(/Hạng mục cần nghiệm thu/), { target: { value: '50' } });

    const alert = await screen.findByTestId('acceptance-unfinished');
    expect(alert).toHaveTextContent('còn 2 công việc chưa hoàn thành');
    expect(screen.getByTestId('acceptance-unfinished-task-101')).toHaveTextContent('Kiem thu');
    expect(screen.getByTestId('acceptance-unfinished-task-101')).toHaveTextContent('Đang làm');
    expect(screen.getByTestId('acceptance-unfinished-task-102')).toHaveTextContent('Chưa bắt đầu');
    expect(screen.getByTestId('acceptance-submit')).toBeDisabled();
  });

  it('báo lỗi ngay trên ô nhập khi thiếu giá trị nghiệm thu', async () => {
    vi.mocked(acceptanceApi.getAcceptanceReadiness).mockResolvedValue(READY);
    renderModal({ initialWorkPackageId: 40 });
    await screen.findByTestId('acceptance-ready');

    fireEvent.click(screen.getByTestId('acceptance-submit'));
    expect(await screen.findByText('Giá trị nghiệm thu không được để trống')).toBeInTheDocument();
    expect(screen.queryByTestId('acceptance-confirm-step')).not.toBeInTheDocument();
  });

  it('hiển thị phiếu đang chặn khi nhánh hạng mục đã có phiếu', async () => {
    vi.mocked(acceptanceApi.getAcceptanceReadiness).mockResolvedValue({
      ...READY, ready: false, activeCertificateId: 9, activeCertificateCode: 'NT-OLD', activeCertificateStatus: 'NEEDS_REVISION',
    });
    renderModal({ initialWorkPackageId: 40 });
    expect(await screen.findByTestId('acceptance-blocked-certificate')).toHaveTextContent('NT-OLD');
    expect(screen.getByTestId('acceptance-blocked-certificate')).toHaveTextContent('Cần chỉnh sửa');
    expect(screen.getByTestId('acceptance-submit')).toBeDisabled();
  });

  it('backend chặn lúc lập (công việc vừa bị mở lại) → báo lỗi và nạp lại điều kiện', async () => {
    const { AcceptanceApiError } = acceptanceApi;
    vi.mocked(acceptanceApi.getAcceptanceReadiness).mockResolvedValueOnce(READY).mockResolvedValueOnce({
      ...NOT_READY, workPackageId: 40,
    });
    vi.mocked(acceptanceApi.createAcceptance).mockRejectedValue(
      new AcceptanceApiError('INVALID_STATE', 'Hang muc con cong viec chua hoan thanh', 400)
    );
    renderModal({ initialWorkPackageId: 40 });
    await screen.findByTestId('acceptance-ready');

    fireEvent.change(screen.getByLabelText(/Giá trị nghiệm thu/), { target: { value: '1000' } });
    fireEvent.click(screen.getByTestId('acceptance-submit'));
    fireEvent.click(await screen.findByTestId('acceptance-confirm-submit'));

    expect(await screen.findByTestId('acceptance-save-error')).toHaveTextContent('Hang muc con cong viec chua hoan thanh');
    expect(await screen.findByTestId('acceptance-unfinished')).toBeInTheDocument();
    expect(acceptanceApi.getAcceptanceReadiness).toHaveBeenCalledTimes(2);
  });

  it('dự án đã đóng → không lập được phiếu', async () => {
    vi.mocked(acceptanceApi.getAcceptanceReadiness).mockResolvedValue(READY);
    renderModal({ initialWorkPackageId: 40, projectClosed: true });
    await screen.findByTestId('acceptance-ready');
    expect(screen.getByText(/Dự án đã đóng/)).toBeInTheDocument();
    expect(screen.getByTestId('acceptance-submit')).toBeDisabled();
  });
});
