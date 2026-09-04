import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import QuoteBuilder from '../components/QuoteBuilder';
import * as quotesApi from '../api/quotesApi';
import type { Opportunity, QuoteRes } from '../types/opportunityTypes';

vi.mock('../api/quotesApi', async () => {
  const actual = await vi.importActual<typeof import('../api/quotesApi')>('../api/quotesApi');
  return {
    ...actual,
    createOpportunityQuote: vi.fn(),
  };
});

const mockOpportunityProposal: Opportunity = {
  id: 101,
  code: 'OPP-2026-0001',
  name: 'Tư vấn Chuyển đổi số Doanh nghiệp',
  stage: 'PROPOSAL',
  status: 'OPEN',
  customerId: 1,
  customerName: 'Công ty Cổ phần Công nghệ ABC',
  customerCode: 'KH-001',
  expectedValue: 120_000_000,
  expectedCloseDate: '2026-10-15',
  probability: 40,
  createdAt: '2026-09-01T10:00:00Z',
  updatedAt: '2026-09-01T10:00:00Z',
};

const mockOpportunityApproach: Opportunity = {
  ...mockOpportunityProposal,
  id: 102,
  code: 'OPP-2026-0002',
  stage: 'APPROACH',
};

const mockSuccessQuoteRes: QuoteRes = {
  id: 501,
  opportunityId: 101,
  version: 1,
  totalAmount: 48_000_000,
  currency: 'VND',
  effectiveDate: '2026-09-04',
  items: [
    {
      id: 1,
      professionalRole: 'Lập trình viên cao cấp',
      workDays: 20,
      unitRate: 1_800_000,
      amount: 36_000_000,
      priced: true,
    },
    {
      id: 2,
      professionalRole: 'Kỹ sư kiểm thử phần mềm',
      workDays: 10,
      unitRate: 1_200_000,
      amount: 12_000_000,
      priced: true,
    },
  ],
  missingRates: [],
  createdAt: '2026-09-04T10:00:00Z',
};

const mockMissingRatesQuoteRes: QuoteRes = {
  id: 502,
  opportunityId: 101,
  version: 2,
  totalAmount: 36_000_000,
  currency: 'VND',
  effectiveDate: '2026-09-04',
  items: [
    {
      id: 1,
      professionalRole: 'Lập trình viên cao cấp',
      workDays: 20,
      unitRate: 1_800_000,
      amount: 36_000_000,
      priced: true,
    },
    {
      id: 2,
      professionalRole: 'Chuyên gia AI/ML Chưa có biểu giá',
      workDays: 5,
      unitRate: null,
      amount: null,
      priced: false,
    },
  ],
  missingRates: ['Chuyên gia AI/ML Chưa có biểu giá'],
  createdAt: '2026-09-04T10:00:00Z',
};

describe('QuoteBuilder Component (NCL-03-CN-003-CV-03 & CV-05)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('không hiển thị khi isOpen = false', () => {
    const { container } = render(
      <QuoteBuilder
        opportunity={mockOpportunityProposal}
        isOpen={false}
        onClose={vi.fn()}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('hiển thị thông tin cơ hội và bảng vị trí công việc khi mở với giai đoạn PROPOSAL', () => {
    render(
      <QuoteBuilder
        opportunity={mockOpportunityProposal}
        isOpen={true}
        onClose={vi.fn()}
        currentUserRoles={['VT-04']}
      />
    );

    expect(screen.getByRole('heading', { name: /Lập báo giá cho cơ hội/i })).toBeInTheDocument();
    expect(screen.getByText(/OPP-2026-0001/)).toBeInTheDocument();
    expect(screen.getByText(/Công ty Cổ phần Công nghệ ABC/)).toBeInTheDocument();
    expect(screen.getByText(/Tư vấn Chuyển đổi số Doanh nghiệp/)).toBeInTheDocument();

    // Có ít nhất 2 dòng mặc định
    expect(screen.getByDisplayValue('Lập trình viên cao cấp')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Kỹ sư kiểm thử phần mềm')).toBeInTheDocument();
  });

  it('chặn thao tác và cảnh báo quy tắc QTN-06 khi cơ hội KHÔNG ở giai đoạn PROPOSAL', () => {
    render(
      <QuoteBuilder
        opportunity={mockOpportunityApproach}
        isOpen={true}
        onClose={vi.fn()}
        currentUserRoles={['VT-04']}
      />
    );

    // Cảnh báo giai đoạn không hợp lệ
    expect(
      screen.getByText(/Báo giá chỉ được phép khởi tạo khi cơ hội ở giai đoạn/i)
    ).toBeInTheDocument();

    // Nút submit bị vô hiệu hoá
    const submitBtn = screen.getByRole('button', { name: /Lưu & Tạo báo giá/i });
    expect(submitBtn).toBeDisabled();
  });

  it('chặn thao tác và hiển thị cảnh báo phân quyền khi người dùng không có vai trò VT-04', () => {
    render(
      <QuoteBuilder
        opportunity={mockOpportunityProposal}
        isOpen={true}
        onClose={vi.fn()}
        currentUserRoles={['VT-01']} // Role khác, không phải VT-04
      />
    );

    expect(
      screen.getByText(/Chức năng lập báo giá yêu cầu vai trò Nhân viên kinh doanh/i)
    ).toBeInTheDocument();

    const submitBtn = screen.getByRole('button', { name: /Lưu & Tạo báo giá/i });
    expect(submitBtn).toBeDisabled();
  });

  it('cho phép thêm dòng báo giá mới và nhập dữ liệu', () => {
    render(
      <QuoteBuilder
        opportunity={mockOpportunityProposal}
        isOpen={true}
        onClose={vi.fn()}
        currentUserRoles={['VT-04']}
      />
    );

    const addBtn = screen.getByRole('button', { name: /Thêm dòng báo giá/i });
    fireEvent.click(addBtn);

    const roleInputs = screen.getAllByPlaceholderText(/Nhập hoặc chọn vai trò/i);
    expect(roleInputs.length).toBe(3);

    fireEvent.change(roleInputs[2], { target: { value: 'Kiến trúc sư giải pháp' } });
    expect(roleInputs[2]).toHaveValue('Kiến trúc sư giải pháp');
  });

  it('cho phép xóa dòng báo giá khi có nhiều hơn 1 dòng, và không thể xóa khi chỉ còn 1 dòng', () => {
    render(
      <QuoteBuilder
        opportunity={mockOpportunityProposal}
        isOpen={true}
        onClose={vi.fn()}
        currentUserRoles={['VT-04']}
      />
    );

    const deleteButtons = screen.getAllByRole('button', { name: /Xóa dòng/i });
    expect(deleteButtons.length).toBe(2);

    // Xóa dòng 2
    fireEvent.click(deleteButtons[1]);

    const remainingDeleteButtons = screen.getAllByRole('button', { name: /Xóa dòng/i });
    expect(remainingDeleteButtons.length).toBe(1);
    expect(remainingDeleteButtons[0]).toBeDisabled();
  });

  it('kiểm tra và hiển thị lỗi validation khi xóa trắng vai trò hoặc nhập số ngày công không hợp lệ', async () => {
    render(
      <QuoteBuilder
        opportunity={mockOpportunityProposal}
        isOpen={true}
        onClose={vi.fn()}
        currentUserRoles={['VT-04']}
      />
    );

    const roleInput = screen.getByDisplayValue('Lập trình viên cao cấp');
    fireEvent.change(roleInput, { target: { value: '' } });

    const daysInput = screen.getByDisplayValue('20');
    fireEvent.change(daysInput, { target: { value: '0' } });

    const submitBtn = screen.getByRole('button', { name: /Lưu & Tạo báo giá/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText('Vai trò chuyên môn không được để trống')).toBeInTheDocument();
      expect(screen.getByText('Số ngày công phải lớn hơn 0')).toBeInTheDocument();
    });

    expect(quotesApi.createOpportunityQuote).not.toHaveBeenCalled();
  });

  it('gọi API POST /opportunities/{id}/quotes và hiển thị kết quả báo giá thành công', async () => {
    vi.mocked(quotesApi.createOpportunityQuote).mockResolvedValueOnce(mockSuccessQuoteRes);
    const onQuoteCreated = vi.fn();

    render(
      <QuoteBuilder
        opportunity={mockOpportunityProposal}
        isOpen={true}
        onClose={vi.fn()}
        onQuoteCreated={onQuoteCreated}
        currentUserRoles={['VT-04']}
      />
    );

    const submitBtn = screen.getByRole('button', { name: /Lưu & Tạo báo giá/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(quotesApi.createOpportunityQuote).toHaveBeenCalledWith(
        101,
        {
          items: [
            { professionalRole: 'Lập trình viên cao cấp', workDays: 20 },
            { professionalRole: 'Kỹ sư kiểm thử phần mềm', workDays: 10 },
          ],
        }
      );
    });

    // Sau khi tạo thành công, giao diện chuyển sang chế độ hiển thị kết quả báo giá
    await waitFor(() => {
      expect(screen.getByText(/Báo giá phiên bản #1/i)).toBeInTheDocument();
      expect(screen.getByText(/48\.000\.000/)).toBeInTheDocument();
      expect(screen.getByText(/Bốn mươi tám triệu đồng/i)).toBeInTheDocument();
      expect(screen.getByText(/36\.000\.000/)).toBeInTheDocument();
      expect(screen.getByText(/12\.000\.000/)).toBeInTheDocument();
    });

    expect(onQuoteCreated).toHaveBeenCalledWith(mockSuccessQuoteRes);
  });

  it('hiển thị cảnh báo missingRates khi máy chủ phản hồi có vai trò chưa thiết lập biểu giá', async () => {
    vi.mocked(quotesApi.createOpportunityQuote).mockResolvedValueOnce(mockMissingRatesQuoteRes);

    render(
      <QuoteBuilder
        opportunity={mockOpportunityProposal}
        isOpen={true}
        onClose={vi.fn()}
        currentUserRoles={['VT-04']}
      />
    );

    const submitBtn = screen.getByRole('button', { name: /Lưu & Tạo báo giá/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/Cảnh báo chưa có đơn giá hiệu lực/i)).toBeInTheDocument();
      expect(screen.getAllByText(/Chuyên gia AI\/ML Chưa có biểu giá/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText(/\(Chưa có đơn giá bán hiệu lực\)/i)).toBeInTheDocument();
    });
  });

  it('xử lý lỗi 403 Forbidden từ máy chủ và hiển thị thông báo chi tiết', async () => {
    vi.mocked(quotesApi.createOpportunityQuote).mockRejectedValueOnce(
      new quotesApi.QuoteApiError(
        'FORBIDDEN',
        'Bạn không có quyền lập báo giá cho cơ hội bán hàng này (yêu cầu vai trò VT-04).',
        403
      )
    );

    render(
      <QuoteBuilder
        opportunity={mockOpportunityProposal}
        isOpen={true}
        onClose={vi.fn()}
        currentUserRoles={['VT-04']}
      />
    );

    const submitBtn = screen.getByRole('button', { name: /Lưu & Tạo báo giá/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/Bạn không có quyền lập báo giá/i)).toBeInTheDocument();
    });
  });

  it('cho phép bấm "Tạo phiên bản báo giá mới" để điều chỉnh lại danh mục', async () => {
    render(
      <QuoteBuilder
        opportunity={mockOpportunityProposal}
        isOpen={true}
        onClose={vi.fn()}
        initialQuote={mockSuccessQuoteRes}
        currentUserRoles={['VT-04']}
      />
    );

    // Đang ở màn hình xem kết quả
    expect(screen.getByText(/Báo giá phiên bản #1/i)).toBeInTheDocument();

    const newVersionBtn = screen.getByRole('button', { name: /Tạo phiên bản báo giá mới/i });
    fireEvent.click(newVersionBtn);

    // Trở lại biểu mẫu nhập liệu
    expect(screen.getByText(/Bảng danh mục vị trí & số ngày công dự kiến/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Lưu & Tạo báo giá/i })).toBeInTheDocument();
  });
});
