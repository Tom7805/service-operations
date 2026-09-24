import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AcceptanceListPage from '../pages/AcceptanceListPage';
import * as acceptanceApi from '../api/acceptanceApi';
import * as projectsApi from '../../projects/api/projectsApi';
import type { ProjectRes } from '../../projects/types/projectTypes';
import type { WorkBreakdownRes } from '../../projects/types/taskTypes';
import type { AcceptanceCertificateRes } from '../types/acceptanceTypes';

vi.mock('../api/acceptanceApi', () => {
  class MockAcceptanceApiError extends Error {
    constructor(public readonly code: string, message: string, public readonly statusCode?: number) {
      super(message);
      this.name = 'AcceptanceApiError';
    }
  }
  return {
    checkAcceptanceAccess: vi.fn(),
    fetchProjectAcceptances: vi.fn(),
    getAcceptanceReadiness: vi.fn(),
    createAcceptance: vi.fn(),
    AcceptanceApiError: MockAcceptanceApiError,
  };
});

vi.mock('../../projects/api/projectsApi', () => ({ getWorkBreakdown: vi.fn() }));

function project(id: number, projectManagerId: number, status = 'RUNNING'): ProjectRes {
  return {
    id, projectCode: `DA-00${id}`, name: `Du an ${id}`, contractId: 3, customerId: 1, projectType: 'FIXED_PRICE',
    limitValue: null, startDate: '2026-01-01', expectedEndDate: '2026-12-31', projectManagerId, status,
    createdAt: '2026-01-01T00:00:00',
  };
}

const PROJECTS = [project(1, 7), project(2, 99), project(3, 7, 'CLOSED')];

const TREE: WorkBreakdownRes[] = [
  {
    id: 40, parentId: null, name: 'Giai doan 1', description: null, children: [],
    tasks: [
      { id: 100, projectId: 1, workPackageId: 40, parentTaskId: null, name: 'A', description: null, expectedStartDate: null, expectedEndDate: null, status: 'DONE' },
    ],
  },
  {
    id: 50, parentId: null, name: 'Giai doan 2', description: null, children: [],
    tasks: [
      { id: 101, projectId: 1, workPackageId: 50, parentTaskId: null, name: 'B', description: null, expectedStartDate: null, expectedEndDate: null, status: 'IN_PROGRESS' },
    ],
  },
  { id: 60, parentId: null, name: 'Giai doan 3', description: null, children: [], tasks: [] },
];

const CERT: AcceptanceCertificateRes = {
  id: 5, certificateCode: 'NT-20260924-A1B2C3', projectId: 1, projectCode: 'DA-001', projectName: 'Du an 1',
  contractId: 3, workPackageId: 60, workPackageName: 'Giai doan 3', title: 'Nghiem thu giai doan 3',
  acceptedValue: 300000000, status: 'PENDING_CONFIRMATION', revisionNo: 1, contractMilestoneId: null,
  contractMilestoneName: null, createdBy: 'pm01', createdAt: '2026-09-24T10:00:00', confirmedAt: null,
};

function Harness({ roles = ['VT-02'], onOpen = vi.fn() }: { roles?: string[]; onOpen?: (id: number) => void }) {
  const [selected, setSelected] = useState<number | null>(null);
  return (
    <AcceptanceListPage
      currentUserRoles={roles}
      currentUserName="PM Mot"
      currentUserId={7}
      projects={PROJECTS}
      selectedProjectId={selected}
      onSelectProject={setSelected}
      onOpenCertificate={onOpen}
    />
  );
}

describe('AcceptanceListPage — NCL-12-CN-001', () => {
  beforeEach(() => {
    vi.mocked(acceptanceApi.checkAcceptanceAccess).mockReset().mockResolvedValue(undefined);
    vi.mocked(acceptanceApi.fetchProjectAcceptances).mockReset().mockResolvedValue([CERT]);
    vi.mocked(acceptanceApi.getAcceptanceReadiness).mockReset();
    vi.mocked(projectsApi.getWorkBreakdown).mockReset().mockResolvedValue(TREE);
  });

  it('TC-03: người không phải Quản lý dự án bị từ chối và có request thật để backend ghi nhật ký', async () => {
    render(<Harness roles={['VT-05']} />);
    expect(screen.getByTestId('acceptance-access-denied')).toHaveTextContent('không có thẩm quyền lập phiếu nghiệm thu');
    await waitFor(() => expect(acceptanceApi.checkAcceptanceAccess).toHaveBeenCalledTimes(1));
    expect(projectsApi.getWorkBreakdown).not.toHaveBeenCalled();
  });

  it('chỉ liệt kê dự án người dùng là Quản lý dự án (QTN-01) và không gọi kiểm tra từ chối', () => {
    render(<Harness />);
    const options = within(screen.getByTestId('acceptance-project-select')).getAllByRole('option');
    expect(options.map((o) => o.textContent)).toEqual([
      '-- Chọn dự án bạn phụ trách --',
      'DA-001 — Du an 1',
      'DA-003 — Du an 3 (đã đóng)',
    ]);
    expect(screen.getByTestId('acceptance-no-project')).toBeInTheDocument();
    expect(screen.getByTestId('acceptance-open-create')).toBeDisabled();
    expect(acceptanceApi.checkAcceptanceAccess).not.toHaveBeenCalled();
  });

  it('chọn dự án → hiện tình trạng nghiệm thu từng hạng mục và danh sách phiếu đã lập', async () => {
    const onOpen = vi.fn();
    render(<Harness onOpen={onOpen} />);
    fireEvent.change(screen.getByTestId('acceptance-project-select'), { target: { value: '1' } });

    expect(await screen.findByTestId('acceptance-wp-table')).toBeInTheDocument();
    expect(projectsApi.getWorkBreakdown).toHaveBeenCalledWith(1);
    expect(acceptanceApi.fetchProjectAcceptances).toHaveBeenCalledWith(1);
    expect(screen.getByTestId('acceptance-wp-row-40')).toHaveTextContent('Đủ điều kiện nghiệm thu');
    expect(screen.getByTestId('acceptance-wp-row-50')).toHaveTextContent('Còn công việc dang dở');
    expect(screen.getByTestId('acceptance-wp-row-60')).toHaveTextContent('Đã có phiếu');
    expect(screen.getByTestId('acceptance-ready-count')).toHaveTextContent('1');

    fireEvent.click(screen.getByTestId('acceptance-cert-row-5'));
    expect(onOpen).toHaveBeenCalledWith(5);
  });

  it('bấm "Lập phiếu" trên hạng mục mở biểu mẫu đã chọn sẵn hạng mục đó', async () => {
    vi.mocked(acceptanceApi.getAcceptanceReadiness).mockResolvedValue({
      projectId: 1, workPackageId: 40, workPackageName: 'Giai doan 1', ready: true, totalTasks: 1, doneTasks: 1,
      unfinishedTasks: [], deliverables: [], activeCertificateId: null, activeCertificateCode: null, activeCertificateStatus: null,
    });
    render(<Harness />);
    fireEvent.change(screen.getByTestId('acceptance-project-select'), { target: { value: '1' } });
    fireEvent.click(await screen.findByTestId('acceptance-wp-create-40'));

    expect(await screen.findByTestId('acceptance-form-modal')).toBeInTheDocument();
    await waitFor(() => expect(acceptanceApi.getAcceptanceReadiness).toHaveBeenCalledWith(1, 40));
    expect(screen.getByLabelText(/Hạng mục cần nghiệm thu/)).toHaveValue('40');
  });

  it('dự án đã đóng → khoá nút lập phiếu', async () => {
    render(<Harness />);
    fireEvent.change(screen.getByTestId('acceptance-project-select'), { target: { value: '3' } });
    expect(await screen.findByTestId('acceptance-wp-table')).toBeInTheDocument();
    expect(screen.getByTestId('acceptance-open-create')).toBeDisabled();
    expect(screen.getByTestId('acceptance-wp-create-40')).toBeDisabled();
  });

  it('lỗi tải dữ liệu → hiện thông báo và cho thử lại', async () => {
    vi.mocked(projectsApi.getWorkBreakdown).mockRejectedValueOnce(new Error('Bạn không có quyền thực hiện thao tác này.'));
    render(<Harness />);
    fireEvent.change(screen.getByTestId('acceptance-project-select'), { target: { value: '1' } });
    expect(await screen.findByRole('alert')).toHaveTextContent('Bạn không có quyền thực hiện thao tác này.');
    fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }));
    expect(await screen.findByTestId('acceptance-wp-table')).toBeInTheDocument();
  });
});
