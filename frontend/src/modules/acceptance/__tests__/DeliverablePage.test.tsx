import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import DeliverablePage from '../pages/DeliverablePage';
import * as acceptanceApi from '../api/acceptanceApi';
import * as projectsApi from '../../projects/api/projectsApi';
import type { ProjectRes } from '../../projects/types/projectTypes';
import type { WorkBreakdownRes } from '../../projects/types/taskTypes';
import type { DeliverableRes, DeliverableVersionRes } from '../types/acceptanceTypes';
import { todayLocalIso } from '../validators/acceptanceValidators';

vi.mock('../api/acceptanceApi', () => {
  class MockAcceptanceApiError extends Error {
    constructor(public readonly code: string, message: string, public readonly statusCode?: number) {
      super(message);
      this.name = 'AcceptanceApiError';
    }
  }
  return {
    checkDeliverableAccess: vi.fn(),
    fetchDeliverables: vi.fn(),
    getDeliverable: vi.fn(),
    createDeliverable: vi.fn(),
    createDeliverableVersion: vi.fn(),
    AcceptanceApiError: MockAcceptanceApiError,
  };
});
vi.mock('../../projects/api/projectsApi', () => ({ getWorkBreakdown: vi.fn() }));

const TODAY = todayLocalIso();

const PROJECTS: ProjectRes[] = [
  {
    id: 1, projectCode: 'DA-001', name: 'Du an 1', contractId: 3, customerId: 1, projectType: 'FIXED_PRICE',
    limitValue: null, startDate: '2026-01-01', expectedEndDate: '2026-12-31', projectManagerId: 7, status: 'RUNNING',
    createdAt: '2026-01-01T00:00:00',
  },
];

const TREE: WorkBreakdownRes[] = [
  { id: 40, parentId: null, name: 'Giai doan 1', description: null, tasks: [], children: [] },
  { id: 50, parentId: null, name: 'Giai doan 2', description: null, tasks: [], children: [] },
];

function version(id: number, versionNo: string, deliveredDate: string, latest: boolean): DeliverableVersionRes {
  return {
    id, deliverableId: 7, versionNo, deliveredDate, receiverName: 'Le Van C', fileUrl: null, note: null, latest,
    createdBy: 'pm01', createdAt: `${deliveredDate}T15:00:00`,
  };
}

const V10 = version(14, '1.0', '2026-09-20', true);
const DOC: DeliverableRes = {
  id: 7, projectId: 1, workPackageId: 40, workPackageName: 'Giai doan 1', name: 'Tai lieu thiet ke',
  deliverableType: 'DOCUMENT', description: 'SRS', versionCount: 1, latestVersion: V10, versions: [V10],
  createdBy: 'pm01', createdAt: '2026-09-19T09:00:00',
};

function Harness({ roles = ['VT-02'] }: { roles?: string[] }) {
  const [selected, setSelected] = useState<number | null>(1);
  return (
    <DeliverablePage
      currentUserRoles={roles}
      currentUserName="PM Mot"
      currentUserId={7}
      projects={PROJECTS}
      selectedProjectId={selected}
      onSelectProject={setSelected}
    />
  );
}

describe('DeliverablePage — NCL-12-CN-004', () => {
  beforeEach(() => {
    vi.mocked(acceptanceApi.checkDeliverableAccess).mockReset().mockResolvedValue(undefined);
    vi.mocked(acceptanceApi.fetchDeliverables).mockReset().mockResolvedValue([DOC]);
    vi.mocked(acceptanceApi.getDeliverable).mockReset();
    vi.mocked(acceptanceApi.createDeliverable).mockReset();
    vi.mocked(acceptanceApi.createDeliverableVersion).mockReset();
    vi.mocked(projectsApi.getWorkBreakdown).mockReset().mockResolvedValue(TREE);
  });

  it('liệt kê sản phẩm bàn giao với phiên bản mới nhất, người khai báo và thời điểm', async () => {
    render(<Harness />);
    const row = await screen.findByTestId('deliverable-row-7');
    expect(projectsApi.getWorkBreakdown).toHaveBeenCalledWith(1);
    expect(acceptanceApi.fetchDeliverables).toHaveBeenCalledWith(1);
    expect(row).toHaveTextContent('Tai lieu thiet ke');
    expect(row).toHaveTextContent('Tài liệu');
    expect(row).toHaveTextContent('1.0');
    expect(row).toHaveTextContent('pm01');
    expect(acceptanceApi.checkDeliverableAccess).not.toHaveBeenCalled();
  });

  it('TC-01: bàn giao lần hai → lưu phiên bản mới, phiên bản cũ vẫn giữ nguyên trong lịch sử', async () => {
    const V11 = version(15, '1.1', TODAY, true);
    vi.mocked(acceptanceApi.createDeliverableVersion).mockResolvedValue(V11);
    vi.mocked(acceptanceApi.getDeliverable).mockResolvedValue({
      ...DOC, versionCount: 2, latestVersion: V11, versions: [V11, { ...V10, latest: false }],
    });
    render(<Harness />);
    fireEvent.click(await screen.findByTestId('deliverable-new-version-7'));

    const modal = screen.getByTestId('deliverable-version-modal');
    expect(modal).toHaveTextContent('Các phiên bản đã bàn giao (1.0) được giữ nguyên');
    expect(screen.getByLabelText(/Số phiên bản/)).toHaveValue('1.1');
    expect(screen.getByLabelText(/Người nhận/)).toHaveValue('Le Van C');
    fireEvent.change(screen.getByTestId('version-file-input'), { target: { files: [new File(['x'], 'tk csdl.pdf')] } });
    expect(screen.getByLabelText(/Tệp bàn giao/)).toHaveValue('/files/ban-giao/7/1.1/tk-csdl.pdf');
    fireEvent.click(screen.getByTestId('deliverable-version-submit'));

    await waitFor(() =>
      expect(acceptanceApi.createDeliverableVersion).toHaveBeenCalledWith(7, {
        versionNo: '1.1',
        deliveredDate: TODAY,
        receiverName: 'Le Van C',
        fileUrl: '/files/ban-giao/7/1.1/tk-csdl.pdf',
        note: null,
      })
    );
    expect(await screen.findByTestId('deliverable-notice')).toHaveTextContent(
      'Đã lưu phiên bản 1.1 của "Tai lieu thiet ke" — 1 phiên bản trước vẫn được giữ nguyên.'
    );
    const history = await screen.findByTestId('deliverable-version-list');
    await waitFor(() => expect(within(history).getByTestId('deliverable-version-15')).toHaveTextContent('Mới nhất'));
    expect(within(history).getByTestId('deliverable-version-14')).toHaveTextContent('1.0');
    expect(screen.getByTestId('deliverable-total-versions')).toHaveTextContent('2');
  });

  it('TC-02: trùng số phiên bản (khác hoa thường/khoảng trắng) → báo trùng, yêu cầu đặt số khác, không gọi máy chủ', async () => {
    render(<Harness />);
    fireEvent.click(await screen.findByTestId('deliverable-new-version-7'));
    fireEvent.change(screen.getByLabelText(/Số phiên bản/), { target: { value: ' 1.0 ' } });
    fireEvent.click(screen.getByTestId('deliverable-version-submit'));
    expect(await screen.findByTestId('version-no-error')).toHaveTextContent(
      'Phiên bản "1.0" đã tồn tại — vui lòng đặt số phiên bản khác'
    );
    expect(acceptanceApi.createDeliverableVersion).not.toHaveBeenCalled();
  });

  it('TC-02: máy chủ báo trùng (409) → hiện lỗi ngay ở ô số phiên bản', async () => {
    const { AcceptanceApiError } = acceptanceApi;
    vi.mocked(acceptanceApi.createDeliverableVersion).mockRejectedValue(
      new AcceptanceApiError('DUPLICATE_DATA', 'So phien ban da ton tai', 409)
    );
    render(<Harness />);
    fireEvent.click(await screen.findByTestId('deliverable-new-version-7'));
    fireEvent.change(screen.getByLabelText(/Số phiên bản/), { target: { value: '2.0' } });
    fireEvent.click(screen.getByTestId('deliverable-version-submit'));
    expect(await screen.findByTestId('version-no-error')).toHaveTextContent('Phiên bản "2.0" đã tồn tại');
  });

  it('khai báo sản phẩm mới cho hạng mục; trùng tên trong cùng hạng mục bị báo trước khi gửi', async () => {
    vi.mocked(acceptanceApi.createDeliverable).mockResolvedValue({
      ...DOC, id: 8, workPackageId: 50, workPackageName: 'Giai doan 2', name: 'Ban cai dat',
      deliverableType: 'SOFTWARE_BUILD', description: null, versionCount: 0, latestVersion: null, versions: [],
    });
    render(<Harness />);
    await screen.findByTestId('deliverable-row-7');
    fireEvent.click(screen.getByTestId('deliverable-open-create'));

    fireEvent.change(screen.getByLabelText(/Hạng mục/, { selector: 'select#deliverable-wp' }), { target: { value: '40' } });
    fireEvent.change(screen.getByLabelText(/Tên sản phẩm/), { target: { value: 'tai lieu THIET KE' } });
    fireEvent.change(screen.getByLabelText(/Loại sản phẩm/), { target: { value: 'DOCUMENT' } });
    fireEvent.click(screen.getByTestId('deliverable-form-submit'));
    expect(await screen.findByText(/Hạng mục đã có sản phẩm/)).toBeInTheDocument();
    expect(acceptanceApi.createDeliverable).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText(/Hạng mục/, { selector: 'select#deliverable-wp' }), { target: { value: '50' } });
    fireEvent.change(screen.getByLabelText(/Tên sản phẩm/), { target: { value: 'Ban cai dat' } });
    fireEvent.change(screen.getByLabelText(/Loại sản phẩm/), { target: { value: 'SOFTWARE_BUILD' } });
    fireEvent.click(screen.getByTestId('deliverable-form-submit'));
    await waitFor(() =>
      expect(acceptanceApi.createDeliverable).toHaveBeenCalledWith(1, {
        workPackageId: 50, name: 'Ban cai dat', deliverableType: 'SOFTWARE_BUILD', description: null,
      })
    );
    expect(await screen.findByTestId('deliverable-row-8')).toHaveTextContent('Chưa bàn giao');
  });

  it('TC-04: lịch sử phiên bản ghi người thực hiện, nội dung và thời điểm', async () => {
    render(<Harness />);
    fireEvent.click(await screen.findByTestId('deliverable-toggle-7'));
    const v = within(screen.getByTestId('deliverable-version-list')).getByTestId('deliverable-version-14');
    expect(v).toHaveTextContent('1.0');
    expect(v).toHaveTextContent('Le Van C');
    expect(v).toHaveTextContent('pm01');
    expect(v).toHaveTextContent(new Date('2026-09-20T15:00:00').toLocaleString('vi-VN'));
  });

  it('TC-03: người không phải Quản lý dự án bị từ chối và có request thật để backend ghi nhật ký', async () => {
    render(<Harness roles={['VT-05']} />);
    expect(screen.getByTestId('deliverable-access-denied')).toHaveTextContent('không có thẩm quyền quản lý sản phẩm bàn giao');
    await waitFor(() => expect(acceptanceApi.checkDeliverableAccess).toHaveBeenCalledTimes(1));
    expect(acceptanceApi.fetchDeliverables).not.toHaveBeenCalled();
  });
});
