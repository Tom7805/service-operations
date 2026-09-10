import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import CreateProjectModal from '../components/CreateProjectModal';
import * as contractsApi from '../api/contractsApi';
import type { ContractTargetForProject, ProjectRes } from '../types/contractTypes';

vi.mock('../api/contractsApi', () => ({
  createProjectFromContract: vi.fn(),
  ProjectsApiError: class extends Error {
    constructor(
      public code: string,
      message: string,
      public statusCode?: number,
      public fieldErrors?: Array<{ field: string; message: string }>
    ) {
      super(message);
      this.name = 'ProjectsApiError';
    }
  },
}));

const activeContract: ContractTargetForProject = {
  id: 5,
  contractCode: 'HD-2026-005',
  name: 'Hợp đồng dịch vụ triển khai ERP',
  customerId: 1,
  customerName: 'Công ty TNHH ABC',
  contractType: 'FIXED_PRICE',
  totalValue: 600_000_000,
  limitValue: 600_000_000,
  startDate: '2027-01-01',
  endDate: '2027-12-31',
  status: 'ACTIVE',
};

const completedContract: ContractTargetForProject = {
  ...activeContract,
  id: 6,
  contractCode: 'HD-2026-006',
  status: 'COMPLETED',
};

const mockProjectRes: ProjectRes = {
  id: 20,
  projectCode: 'DA-4K7X2Q9',
  name: 'Triển khai ERP Công ty TNHH ABC',
  contractId: 5,
  customerId: 1,
  projectType: 'FIXED_PRICE',
  limitValue: 600_000_000,
  startDate: '2027-01-01',
  expectedEndDate: '2027-12-31',
  projectManagerId: 7,
  status: 'RUNNING',
  createdBy: 'pm01',
  createdAt: '2026-09-09T10:00:00',
};

describe('CreateProjectModal (NCL-05-CN-001 — Tạo dự án từ hợp đồng)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('TC-01: Tạo dự án từ hợp đồng ACTIVE thành công với thông tin hợp lệ', async () => {
    vi.mocked(contractsApi.createProjectFromContract).mockResolvedValue(mockProjectRes);

    const onSaved = vi.fn();
    const onClose = vi.fn();

    render(
      <CreateProjectModal
        contract={activeContract}
        isOpen
        onClose={onClose}
        onSaved={onSaved}
        currentUserRoles={['VT-02']}
        currentUserId={7}
      />
    );

    // Kiểm tra thông tin kế thừa hiển thị
    expect(screen.getByText(/Tạo dự án từ hợp đồng/i)).toBeInTheDocument();
    expect(screen.getByText(/Công ty TNHH ABC/i)).toBeInTheDocument();
    expect(screen.getByText(/FIXED_PRICE/i)).toBeInTheDocument();
    expect(screen.getByText(/RUNNING \(Đang triển khai\)/i)).toBeInTheDocument();

    // Điền thông tin form
    const nameInput = screen.getByLabelText(/Tên dự án/i);
    fireEvent.change(nameInput, {
      target: { value: 'Triển khai ERP Công ty TNHH ABC' },
    });

    const startInput = screen.getByLabelText(/Ngày bắt đầu/i);
    fireEvent.change(startInput, {
      target: { value: '2027-01-01' },
    });

    const endInput = screen.getByLabelText(/Ngày kết thúc dự kiến/i);
    fireEvent.change(endInput, {
      target: { value: '2027-12-31' },
    });

    const pmInput = screen.getByLabelText(/Người quản lý dự án/i);
    fireEvent.change(pmInput, {
      target: { value: '7' },
    });

    // Bấm tạo dự án
    fireEvent.click(screen.getByTestId('submit-create-project-btn'));

    await waitFor(() => {
      expect(contractsApi.createProjectFromContract).toHaveBeenCalledWith(5, {
        name: 'Triển khai ERP Công ty TNHH ABC',
        startDate: '2027-01-01',
        expectedEndDate: '2027-12-31',
        projectManagerId: 7,
      });
      expect(onSaved).toHaveBeenCalledWith(mockProjectRes);
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('TC-02: Từ chối tạo dự án khi hợp đồng không còn hiệu lực (COMPLETED/TERMINATED)', () => {
    render(
      <CreateProjectModal
        contract={completedContract}
        isOpen
        onClose={vi.fn()}
        currentUserRoles={['VT-02']}
      />
    );

    // Xác nhận hiển thị cảnh báo hợp đồng không còn hiệu lực
    expect(screen.getByTestId('project-inactive-alert')).toHaveTextContent(
      /Chỉ cho phép tạo dự án từ hợp đồng đang còn hiệu lực \(ACTIVE\)/i
    );
    // Form tạo dự án không hiển thị
    expect(screen.queryByTestId('create-project-form')).not.toBeInTheDocument();
  });

  it('TC-03a: Báo lỗi validation khi tên dự án để trống hoặc chỉ có khoảng trắng', async () => {
    render(
      <CreateProjectModal
        contract={activeContract}
        isOpen
        onClose={vi.fn()}
        currentUserRoles={['VT-02']}
      />
    );

    const nameInput = screen.getByLabelText(/Tên dự án/i);
    fireEvent.change(nameInput, { target: { value: '   ' } });

    fireEvent.click(screen.getByTestId('submit-create-project-btn'));

    expect(screen.getByTestId('error-name')).toHaveTextContent(/Tên dự án không được để trống/i);
    expect(contractsApi.createProjectFromContract).not.toHaveBeenCalled();
  });

  it('TC-03b: Báo lỗi validation khi thiếu ngày bắt đầu hoặc ngày kết thúc dự kiến', async () => {
    render(
      <CreateProjectModal
        contract={activeContract}
        isOpen
        onClose={vi.fn()}
        currentUserRoles={['VT-02']}
      />
    );

    const startInput = screen.getByLabelText(/Ngày bắt đầu/i);
    fireEvent.change(startInput, { target: { value: '' } });

    const endInput = screen.getByLabelText(/Ngày kết thúc dự kiến/i);
    fireEvent.change(endInput, { target: { value: '' } });

    fireEvent.click(screen.getByTestId('submit-create-project-btn'));

    expect(screen.getByTestId('error-start-date')).toHaveTextContent(/Ngày bắt đầu không được để trống/i);
    expect(screen.getByTestId('error-expected-end-date')).toHaveTextContent(
      /Ngày kết thúc dự kiến không được để trống/i
    );
    expect(contractsApi.createProjectFromContract).not.toHaveBeenCalled();
  });

  it('TC-03c: Báo lỗi validation khi ngày kết thúc dự kiến sớm hơn ngày bắt đầu', async () => {
    render(
      <CreateProjectModal
        contract={activeContract}
        isOpen
        onClose={vi.fn()}
        currentUserRoles={['VT-02']}
      />
    );

    const startInput = screen.getByLabelText(/Ngày bắt đầu/i);
    fireEvent.change(startInput, { target: { value: '2027-10-01' } });

    const endInput = screen.getByLabelText(/Ngày kết thúc dự kiến/i);
    fireEvent.change(endInput, { target: { value: '2027-09-30' } });

    fireEvent.click(screen.getByTestId('submit-create-project-btn'));

    expect(screen.getByTestId('error-expected-end-date')).toHaveTextContent(
      /Ngày kết thúc dự kiến không được sớm hơn ngày bắt đầu/i
    );
    expect(contractsApi.createProjectFromContract).not.toHaveBeenCalled();
  });

  it('TC-03d: Báo lỗi validation khi thiếu người quản lý dự án hoặc ID <= 0', async () => {
    render(
      <CreateProjectModal
        contract={activeContract}
        isOpen
        onClose={vi.fn()}
        currentUserRoles={['VT-02']}
      />
    );

    const pmInput = screen.getByLabelText(/Người quản lý dự án/i);
    fireEvent.change(pmInput, { target: { value: '0' } });

    fireEvent.click(screen.getByTestId('submit-create-project-btn'));

    expect(screen.getByTestId('error-project-manager')).toHaveTextContent(
      /Người quản lý dự án không được để trống/i
    );
    expect(contractsApi.createProjectFromContract).not.toHaveBeenCalled();
  });

  it('TC-04a: Từ chối truy cập khi không có vai trò Quản lý dự án (VT-02)', () => {
    render(
      <CreateProjectModal
        contract={activeContract}
        isOpen
        onClose={vi.fn()}
        currentUserRoles={['VT-04']} // Sales, không phải VT-02
      />
    );

    expect(screen.getByTestId('project-role-alert')).toHaveTextContent(
      /Yêu cầu vai trò Quản lý dự án \(VT-02\)/i
    );
    expect(screen.queryByTestId('create-project-form')).not.toBeInTheDocument();
  });

  it('TC-04b: Nút "Gán cho tôi" tự động điền ID người dùng đang đăng nhập', () => {
    render(
      <CreateProjectModal
        contract={activeContract}
        isOpen
        onClose={vi.fn()}
        currentUserRoles={['VT-02']}
        currentUserId={42}
      />
    );

    const pmInput = screen.getByLabelText(/Người quản lý dự án/i) as HTMLInputElement;
    fireEvent.change(pmInput, { target: { value: '' } });
    expect(pmInput.value).toBe('');

    fireEvent.click(screen.getByRole('button', { name: /Gán cho tôi/i }));
    expect(pmInput.value).toBe('42');
  });

  it('TC-05: Hiển thị lỗi từ backend khi API trả về lỗi', async () => {
    vi.mocked(contractsApi.createProjectFromContract).mockRejectedValue(
      new contractsApi.ProjectsApiError(
        'INVALID_STATE',
        'Chi tao du an tu hop dong dang con hieu luc (ACTIVE)',
        400
      )
    );

    render(
      <CreateProjectModal
        contract={activeContract}
        isOpen
        onClose={vi.fn()}
        currentUserRoles={['VT-02']}
        currentUserId={7}
      />
    );

    fireEvent.change(screen.getByLabelText(/Tên dự án/i), {
      target: { value: 'Dự án ERP' },
    });
    fireEvent.change(screen.getByLabelText(/Ngày bắt đầu/i), {
      target: { value: '2027-01-01' },
    });
    fireEvent.change(screen.getByLabelText(/Ngày kết thúc dự kiến/i), {
      target: { value: '2027-12-31' },
    });
    fireEvent.change(screen.getByLabelText(/Người quản lý dự án/i), {
      target: { value: '7' },
    });

    fireEvent.click(screen.getByTestId('submit-create-project-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('project-server-error')).toHaveTextContent(
        /Chi tao du an tu hop dong dang con hieu luc \(ACTIVE\)/i
      );
    });
  });
});
