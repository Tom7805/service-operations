import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CreateProjectFromTemplateModal from '../components/CreateProjectFromTemplateModal';
import * as projectsApi from '../api/projectsApi';
import type {
  ContractTargetForProject,
  ProjectRes,
  ProjectTemplateRes,
  WorkBreakdownRes,
} from '../types/projectTypes';

vi.mock('../api/projectsApi', () => {
  class MockProjectsApiError extends Error {
    constructor(
      public readonly code: string,
      message: string,
      public readonly statusCode?: number,
      public readonly fieldErrors?: Array<{ field: string; message: string }>
    ) {
      super(message);
      this.name = 'ProjectsApiError';
    }
  }

  return {
    fetchProjectTemplates: vi.fn(),
    createProjectFromTemplate: vi.fn(),
    getWorkBreakdown: vi.fn(),
    deleteWorkPackage: vi.fn(),
    ProjectsApiError: MockProjectsApiError,
  };
});

const mockContract: ContractTargetForProject = {
  id: 1,
  contractCode: 'HD-2026-001',
  name: 'Hợp đồng phát triển phần mềm Alpha',
  customerId: 9,
  customerName: 'Công ty Cổ phần Alpha',
  contractType: 'FIXED_PRICE',
  limitValue: 600_000_000,
  status: 'ACTIVE',
  startDate: '2027-01-01',
  endDate: '2027-12-31',
};

const mockTemplates: ProjectTemplateRes[] = [
  {
    id: 5,
    code: 'MT-PHAN-MEM',
    name: 'Mẫu triển khai phần mềm',
    description: 'Cây hạng mục chuẩn cho dự án triển khai phần mềm',
    projectType: 'FIXED_PRICE',
    active: true,
    createdBy: 'admin',
    createdAt: '2026-09-01T08:00:00',
  },
  {
    id: 6,
    code: 'MT-BAO-TRI',
    name: 'Mẫu bảo trì định kỳ',
    description: 'Cây hạng mục cho hợp đồng bảo trì',
    projectType: 'MAINTENANCE',
    active: true,
    createdBy: 'admin',
    createdAt: '2026-09-01T08:00:00',
  },
];

const mockCreatedProject: ProjectRes = {
  id: 20,
  projectCode: 'DA-001',
  name: 'Dự án triển khai phần mềm Alpha',
  contractId: 1,
  customerId: 9,
  projectType: 'FIXED_PRICE',
  limitValue: 600_000_000,
  startDate: '2027-01-01',
  expectedEndDate: '2027-12-31',
  projectManagerId: 7,
  status: 'RUNNING',
  createdBy: 'pm01',
  createdAt: '2026-09-10T10:00:00',
};

const mockWbs: WorkBreakdownRes[] = [
  {
    id: 30,
    parentId: null,
    name: 'Khởi tạo dự án',
    description: 'Chuẩn bị môi trường',
    tasks: [
      {
        id: 31,
        projectId: 20,
        workPackageId: 30,
        parentTaskId: null,
        name: 'Thiết lập môi trường',
        description: null,
        expectedStartDate: '2027-01-01',
        expectedEndDate: '2027-01-05',
        status: 'TODO',
        budgetHours: 8,
      },
    ],
    children: [],
  },
  {
    id: 32,
    parentId: null,
    name: 'Hạng mục rỗng cần xóa',
    description: null,
    tasks: [],
    children: [],
  },
];

describe('CreateProjectFromTemplateModal Component (NCL-05-CN-007)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('TC-03: từ chối truy cập và ẩn form đối với vai trò không phải Quản lý dự án (VT-02)', () => {
    render(
      <CreateProjectFromTemplateModal
        isOpen={true}
        onClose={vi.fn()}
        contract={mockContract}
        currentUserRoles={['VT-05']}
      />
    );

    expect(screen.getByTestId('pm-role-alert')).toBeInTheDocument();
    expect(screen.getByText(/Chức năng Tạo dự án từ mẫu chỉ dành cho vai trò/i)).toBeInTheDocument();
    expect(screen.queryByTestId('project-template-form')).toBeNull();
  });

  it('TC-03: hiển thị cảnh báo và ẩn form khi hợp đồng không ở trạng thái ACTIVE', () => {
    const inactiveContract: ContractTargetForProject = {
      ...mockContract,
      status: 'TERMINATED',
    };

    render(
      <CreateProjectFromTemplateModal
        isOpen={true}
        onClose={vi.fn()}
        contract={inactiveContract}
        currentUserRoles={['VT-02']}
      />
    );

    expect(screen.getByTestId('contract-inactive-alert')).toBeInTheDocument();
    expect(screen.getByText(/Chỉ cho phép tạo dự án từ hợp đồng đang ở trạng thái/i)).toBeInTheDocument();
    expect(screen.queryByTestId('project-template-form')).toBeNull();
  });

  it('TC-01: mở modal, nạp danh sách mẫu dự án và hiển thị thẻ xem trước kế thừa từ hợp đồng', async () => {
    vi.mocked(projectsApi.fetchProjectTemplates).mockResolvedValue(mockTemplates);

    render(
      <CreateProjectFromTemplateModal
        isOpen={true}
        onClose={vi.fn()}
        contract={mockContract}
        currentUserRoles={['VT-02']}
      />
    );

    expect(screen.getByText(/Thông tin kế thừa tự động từ hợp đồng/i)).toBeInTheDocument();
    expect(screen.getByText('Công ty Cổ phần Alpha')).toBeInTheDocument();
    expect(screen.getByText('FIXED_PRICE')).toBeInTheDocument();
    expect(screen.getByText('RUNNING (Đang thực hiện)')).toBeInTheDocument();

    await waitFor(() => {
      expect(projectsApi.fetchProjectTemplates).toHaveBeenCalledWith(1);
    });

    const select = screen.getByTestId('template-select') as HTMLSelectElement;
    expect(select.options.length).toBeGreaterThan(1);
    expect(screen.getByTestId('template-preview-info')).toBeInTheDocument();
  });

  it('bắt lỗi client-side khi bỏ trống tên dự án hoặc nhập ngày kết thúc sớm hơn ngày bắt đầu', async () => {
    vi.mocked(projectsApi.fetchProjectTemplates).mockResolvedValue(mockTemplates);

    render(
      <CreateProjectFromTemplateModal
        isOpen={true}
        onClose={vi.fn()}
        contract={mockContract}
        currentUserRoles={['VT-02']}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('template-select')).toBeInTheDocument();
    });

    // Xóa tên dự án
    fireEvent.change(screen.getByTestId('project-name-input'), { target: { value: '' } });
    // Nhập ngày kết thúc sớm hơn ngày bắt đầu
    fireEvent.change(screen.getByTestId('start-date-input'), { target: { value: '2027-06-01' } });
    fireEvent.change(screen.getByTestId('end-date-input'), { target: { value: '2027-05-01' } });

    fireEvent.click(screen.getByTestId('submit-create-from-template-btn'));

    expect(screen.getByTestId('error-name')).toHaveTextContent('Tên dự án không được để trống');
    expect(screen.getByTestId('error-expectedEndDate')).toHaveTextContent(
      'Ngày kết thúc dự kiến không được sớm hơn ngày bắt đầu'
    );
    expect(projectsApi.createProjectFromTemplate).not.toHaveBeenCalled();
  });

  it('nút "Gán cho tôi" tự động điền ID người dùng đang đăng nhập', async () => {
    vi.mocked(projectsApi.fetchProjectTemplates).mockResolvedValue(mockTemplates);

    render(
      <CreateProjectFromTemplateModal
        isOpen={true}
        onClose={vi.fn()}
        contract={mockContract}
        currentUserRoles={['VT-02']}
        currentUserId={99}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('template-select')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByTestId('pm-id-input'), { target: { value: '12' } });
    expect((screen.getByTestId('pm-id-input') as HTMLInputElement).value).toBe('12');

    fireEvent.click(screen.getByTestId('btn-assign-to-me'));
    expect((screen.getByTestId('pm-id-input') as HTMLInputElement).value).toBe('99');
  });

  it('TC-01, TC-02, TC-04: tạo dự án từ mẫu thành công, dựng cây WBS và cho phép xóa hạng mục trên dự án', async () => {
    vi.mocked(projectsApi.fetchProjectTemplates).mockResolvedValue(mockTemplates);
    vi.mocked(projectsApi.createProjectFromTemplate).mockResolvedValue(mockCreatedProject);
    vi.mocked(projectsApi.getWorkBreakdown).mockResolvedValue(mockWbs);
    vi.mocked(projectsApi.deleteWorkPackage).mockResolvedValue();

    const onCreated = vi.fn();
    window.confirm = vi.fn().mockReturnValue(true);

    render(
      <CreateProjectFromTemplateModal
        isOpen={true}
        onClose={vi.fn()}
        contract={mockContract}
        currentUserRoles={['VT-02']}
        onCreated={onCreated}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('template-select')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByTestId('project-name-input'), {
      target: { value: 'Dự án triển khai phần mềm Alpha' },
    });
    fireEvent.change(screen.getByTestId('start-date-input'), { target: { value: '2027-01-01' } });
    fireEvent.change(screen.getByTestId('end-date-input'), { target: { value: '2027-12-31' } });
    fireEvent.change(screen.getByTestId('pm-id-input'), { target: { value: '7' } });

    fireEvent.click(screen.getByTestId('submit-create-from-template-btn'));

    await waitFor(() => {
      expect(projectsApi.createProjectFromTemplate).toHaveBeenCalledWith(1, {
        templateId: 5,
        name: 'Dự án triển khai phần mềm Alpha',
        startDate: '2027-01-01',
        expectedEndDate: '2027-12-31',
        projectManagerId: 7,
      });
    });

    expect(onCreated).toHaveBeenCalledWith(mockCreatedProject);

    // Kiểm tra màn hình hoàn tất thành công (TC-01, TC-04)
    await waitFor(() => {
      expect(screen.getByTestId('create-success-alert')).toBeInTheDocument();
    });
    expect(screen.getByText(/CREATE_FROM_TEMPLATE/i)).toBeInTheDocument();

    // Kiểm tra cây WBS được dựng sẵn từ mẫu (TC-01)
    await waitFor(() => {
      expect(screen.getByText('Khởi tạo dự án')).toBeInTheDocument();
      expect(screen.getByText('Thiết lập môi trường')).toBeInTheDocument();
      expect(screen.getByText('Ngân sách: 8 giờ')).toBeInTheDocument();
      expect(screen.getByText('Hạng mục rỗng cần xóa')).toBeInTheDocument();
    });

    // Kiểm tra thao tác xóa hạng mục trên cây WBS (TC-02)
    const deleteBtn = screen.getByTestId('delete-wp-btn-32');
    expect(deleteBtn).toBeInTheDocument();
    fireEvent.click(deleteBtn);

    expect(window.confirm).toHaveBeenCalled();
    await waitFor(() => {
      expect(projectsApi.deleteWorkPackage).toHaveBeenCalledWith(20, 32);
    });
    expect(screen.getByTestId('wbs-toast')).toHaveTextContent(/Mẫu dự án gốc vẫn được giữ nguyên không đổi/i);
  });

  it('xử lý và hiển thị thông báo lỗi từ server khi gọi API thất bại', async () => {
    vi.mocked(projectsApi.fetchProjectTemplates).mockResolvedValue(mockTemplates);
    vi.mocked(projectsApi.createProjectFromTemplate).mockRejectedValue(
      new projectsApi.ProjectsApiError('INVALID_STATE', 'Hợp đồng đã quá hạn hiệu lực')
    );

    render(
      <CreateProjectFromTemplateModal
        isOpen={true}
        onClose={vi.fn()}
        contract={mockContract}
        currentUserRoles={['VT-02']}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('template-select')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByTestId('project-name-input'), {
      target: { value: 'Dự án kiểm tra lỗi' },
    });
    fireEvent.change(screen.getByTestId('start-date-input'), { target: { value: '2027-01-01' } });
    fireEvent.change(screen.getByTestId('end-date-input'), { target: { value: '2027-12-31' } });
    fireEvent.change(screen.getByTestId('pm-id-input'), { target: { value: '7' } });

    fireEvent.click(screen.getByTestId('submit-create-from-template-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('submit-error')).toHaveTextContent('Hợp đồng đã quá hạn hiệu lực');
    });
  });
});
