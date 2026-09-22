import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import InvoiceProposalPage from '../pages/InvoiceProposalPage';
import * as invoicesApi from '../api/invoicesApi';
import * as contractsApi from '../../contracts/api/contractsApi';
import * as projectsApi from '../../projects/api/projectsApi';
import type { InvoiceProposalRes } from '../types/invoiceTypes';
import type { ContractRes } from '../../contracts/types/contractTypes';
import type { ProjectRes } from '../../projects/types/projectTypes';

vi.mock('../api/invoicesApi', () => {
  class MockInvoicesApiError extends Error {
    constructor(
      public readonly code: string,
      message: string,
      public readonly statusCode?: number
    ) {
      super(message);
      this.name = 'InvoicesApiError';
    }
  }

  return {
    createInvoiceProposal: vi.fn(),
    InvoicesApiError: MockInvoicesApiError,
  };
});

vi.mock('../../contracts/api/contractsApi', () => ({
  fetchContracts: vi.fn(),
}));

vi.mock('../../projects/api/projectsApi', () => {
  class MockProjectsApiError extends Error {
    constructor(
      public readonly code: string,
      message: string,
      public readonly statusCode?: number
    ) {
      super(message);
      this.name = 'ProjectsApiError';
    }
  }

  return {
    fetchProjectsByContract: vi.fn(),
    ProjectsApiError: MockProjectsApiError,
  };
});

const CONTRACTS: ContractRes[] = [
  { id: 5, contractCode: 'HD-005', name: 'Bao tri he thong', opportunityId: null, customerId: 9, quoteId: null, contractType: 'TIME_AND_MATERIAL', totalValue: 0, status: 'ACTIVE' } as ContractRes,
];

const PROJECTS: ProjectRes[] = [
  {
    id: 1,
    projectCode: 'DA-001',
    name: 'Nang cap he thong',
    contractId: 5,
    customerId: 9,
    projectType: 'TIME_AND_MATERIAL',
    limitValue: null,
    startDate: '2026-01-01',
    expectedEndDate: '2026-12-31',
    projectManagerId: 1,
    status: 'ACTIVE',
    createdAt: '2026-01-01T00:00:00',
  },
];

const RESULT: InvoiceProposalRes = {
  id: 100,
  proposalCode: 'IP-20261001-A1B2C3',
  projectId: 1,
  contractId: 5,
  customerId: 9,
  periodFrom: '2026-09-01',
  periodTo: '2026-09-30',
  status: 'PENDING',
  laborAmount: 7200000,
  expenseAmount: 2000000,
  totalAmount: 9200000,
  note: 'Ky thang 9',
  laborLines: [
    {
      id: 1001,
      lineType: 'LABOR',
      timeEntryId: 11,
      projectExpenseId: null,
      lineDate: '2026-09-10',
      userId: 3,
      hours: 8,
      unitRate: 300000,
      description: 'Gio cong ngay 2026-09-10 - Phat trien API',
      amount: 2400000,
    },
  ],
  expenseLines: [
    {
      id: 1004,
      lineType: 'EXPENSE',
      timeEntryId: null,
      projectExpenseId: 50,
      lineDate: '2026-09-12',
      userId: null,
      hours: null,
      unitRate: null,
      description: 'Chi phi TRAVEL: Ve may bay cong tac',
      amount: 2000000,
    },
  ],
  skipped: {
    notApprovedCount: 5,
    nonBillableCount: 0,
    alreadyProposedCount: 0,
    missingRateCount: 0,
  },
  createdBy: 'ketoan01',
  createdAt: '2026-10-01T10:00:00',
};

async function selectContractAndProject() {
  const contractSelect = await screen.findByLabelText('Hợp đồng');
  fireEvent.change(contractSelect, { target: { value: '5' } });
  const projectSelect = await screen.findByRole('option', { name: 'DA-001 — Nang cap he thong' });
  fireEvent.change(screen.getByLabelText('Dự án'), { target: { value: '1' } });
  return projectSelect;
}

describe('InvoiceProposalPage (NCL-10-CN-001 — Đề xuất hóa đơn từ giờ công đã duyệt)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(contractsApi.fetchContracts).mockResolvedValue(CONTRACTS);
    vi.mocked(projectsApi.fetchProjectsByContract).mockResolvedValue(PROJECTS);
  });

  it('từ chối truy cập cho vai trò khác VT-05', () => {
    render(<InvoiceProposalPage currentUserRoles={['VT-02']} />);
    expect(screen.getByTestId('invoice-proposal-access-denied')).toBeInTheDocument();
    expect(invoicesApi.createInvoiceProposal).not.toHaveBeenCalled();
  });

  it('chọn hợp đồng thì tải đúng danh sách dự án của hợp đồng đó', async () => {
    render(<InvoiceProposalPage currentUserRoles={['VT-05']} />);

    const contractSelect = await screen.findByLabelText('Hợp đồng');
    fireEvent.change(contractSelect, { target: { value: '5' } });

    await waitFor(() => expect(projectsApi.fetchProjectsByContract).toHaveBeenCalledWith(5));
    expect(await screen.findByRole('option', { name: 'DA-001 — Nang cap he thong' })).toBeInTheDocument();
  });

  it('không cho tạo khi bỏ trống dự án và kỳ', async () => {
    render(<InvoiceProposalPage currentUserRoles={['VT-05']} />);

    fireEvent.click(screen.getByRole('button', { name: /Tạo đề xuất/i }));

    expect(await screen.findByText('Chọn hợp đồng và dự án trước')).toBeInTheDocument();
    expect(screen.getByText('Ngày bắt đầu kỳ không được để trống')).toBeInTheDocument();
    expect(screen.getByText('Ngày kết thúc kỳ không được để trống')).toBeInTheDocument();
    expect(invoicesApi.createInvoiceProposal).not.toHaveBeenCalled();
  });

  it('không cho tạo khi ngày kết thúc kỳ sớm hơn ngày bắt đầu', async () => {
    render(<InvoiceProposalPage currentUserRoles={['VT-05']} />);

    await selectContractAndProject();
    fireEvent.change(screen.getByLabelText('Từ ngày'), { target: { value: '2026-09-30' } });
    fireEvent.change(screen.getByLabelText('Đến ngày'), { target: { value: '2026-09-01' } });
    fireEvent.click(screen.getByRole('button', { name: /Tạo đề xuất/i }));

    expect(await screen.findByText('Ngày kết thúc kỳ không được sớm hơn ngày bắt đầu kỳ')).toBeInTheDocument();
    expect(invoicesApi.createInvoiceProposal).not.toHaveBeenCalled();
  });

  it('tạo đề xuất thành công thì hiện kết quả kèm dòng giờ công/chi phí và cảnh báo bỏ qua', async () => {
    vi.mocked(invoicesApi.createInvoiceProposal).mockResolvedValue(RESULT);

    render(<InvoiceProposalPage currentUserRoles={['VT-05']} />);

    await selectContractAndProject();
    fireEvent.change(screen.getByLabelText('Từ ngày'), { target: { value: '2026-09-01' } });
    fireEvent.change(screen.getByLabelText('Đến ngày'), { target: { value: '2026-09-30' } });
    fireEvent.change(screen.getByLabelText('Ghi chú'), { target: { value: 'Ky thang 9' } });
    fireEvent.click(screen.getByRole('button', { name: /Tạo đề xuất/i }));

    await waitFor(() =>
      expect(invoicesApi.createInvoiceProposal).toHaveBeenCalledWith(1, {
        periodFrom: '2026-09-01',
        periodTo: '2026-09-30',
        note: 'Ky thang 9',
      })
    );

    expect(await screen.findByTestId('invoice-proposal-result')).toBeInTheDocument();
    expect(screen.getByText('IP-20261001-A1B2C3')).toBeInTheDocument();
    expect(screen.getByText(/Đã bỏ qua: 5 dòng chưa duyệt/i)).toBeInTheDocument();
  });

  it('hiển thị lỗi khi hợp đồng không phải theo giờ hoặc kỳ không có dòng đủ điều kiện (INVALID_STATE)', async () => {
    vi.mocked(invoicesApi.createInvoiceProposal).mockRejectedValue(
      new invoicesApi.InvoicesApiError(
        'INVALID_STATE',
        'Ky khong co dong gio cong/phi phi nao du dieu kien de tao de nghi',
        400
      )
    );

    render(<InvoiceProposalPage currentUserRoles={['VT-05']} />);

    await selectContractAndProject();
    fireEvent.change(screen.getByLabelText('Từ ngày'), { target: { value: '2026-09-01' } });
    fireEvent.change(screen.getByLabelText('Đến ngày'), { target: { value: '2026-09-30' } });
    fireEvent.click(screen.getByRole('button', { name: /Tạo đề xuất/i }));

    expect(
      await screen.findByText('Ky khong co dong gio cong/phi phi nao du dieu kien de tao de nghi')
    ).toBeInTheDocument();
  });
});
