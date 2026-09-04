import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import OpportunityListPage from '../pages/OpportunityListPage';
import OpportunityCloseModal from '../components/OpportunityCloseModal';
import * as opportunitiesApi from '../api/opportunitiesApi';
import type { Opportunity } from '../types/opportunityTypes';

// Giữ nguyên các export thật (OpportunityApiError, changeOpportunityStage, ...),
// chỉ thay closeOpportunity bằng mock để kiểm soát phản hồi máy chủ.
vi.mock('../api/opportunitiesApi', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../api/opportunitiesApi')>();
  return { ...actual, closeOpportunity: vi.fn() };
});

const mockOpportunities: Opportunity[] = [
  {
    id: 1,
    name: 'Triển khai ERP Doanh nghiệp',
    customerId: 101,
    customerName: 'Tập đoàn Đại Nam',
    expectedValue: 500000000,
    expectedCloseDate: '2026-10-31',
    stage: 'NEGOTIATION',
    status: 'OPEN',
    probability: 70,
    createdBy: 'sale01',
  },
  {
    id: 2,
    name: 'Dịch vụ Tư vấn Chuyển đổi số',
    customerId: 102,
    customerName: 'Công ty Hoa Sen',
    expectedValue: 200000000,
    expectedCloseDate: '2026-11-15',
    stage: 'PROPOSAL',
    status: 'OPEN',
    probability: 40,
    createdBy: 'sale01',
  },
  {
    id: 3,
    name: 'Phần mềm Quản lý Kho',
    customerId: 103,
    customerName: 'Logistics Toàn Cầu',
    expectedValue: 150000000,
    expectedCloseDate: '2026-08-30',
    stage: 'LOST',
    status: 'CLOSED',
    probability: 0,
    lossReason: 'PRICE_TOO_HIGH',
    closeReasonDetail: 'Giá cao hơn đối thủ 15%',
    competitorName: 'Phần mềm XYZ',
    closedAt: '2026-08-29T15:00:00',
    createdBy: 'sale01',
  },
];

describe('Ghi nhận kết quả thắng thua của cơ hội (NCL-03-CN-005)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Luồng thành công — kết quả Thắng (TC-01)', () => {
    it('ghi nhận WON không yêu cầu lý do và gửi đúng payload lên máy chủ', async () => {
      const target = mockOpportunities[0];
      const wonResponse: Opportunity = {
        ...target,
        stage: 'WON',
        status: 'CLOSED',
        probability: 100,
        closeReasonDetail: 'Khách hàng đồng ý phương án đề xuất',
        closedAt: '2026-09-04T16:15:00',
      };
      vi.mocked(opportunitiesApi.closeOpportunity).mockResolvedValue(wonResponse);

      const onSuccess = vi.fn();
      const onClose = vi.fn();

      render(
        <OpportunityCloseModal
          isOpen
          opportunity={target}
          currentUserRoles={['VT-04']}
          onClose={onClose}
          onSuccess={onSuccess}
        />,
      );

      fireEvent.click(screen.getByTestId('btn-select-won'));
      expect(screen.queryByTestId('select-loss-reason')).toBeNull();

      fireEvent.change(screen.getByTestId('textarea-reason-detail'), {
        target: { value: 'Khách hàng đồng ý phương án đề xuất' },
      });
      fireEvent.click(screen.getByTestId('btn-submit-close-opportunity'));

      await waitFor(() => {
        expect(opportunitiesApi.closeOpportunity).toHaveBeenCalledWith(1, {
          result: 'WON',
          lossReason: undefined,
          competitorName: undefined,
          reasonDetail: 'Khách hàng đồng ý phương án đề xuất',
        });
      });
      expect(onSuccess).toHaveBeenCalledWith(wonResponse);
      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('Luồng thành công — kết quả Thua trên màn danh sách (TC-01, TC-04)', () => {
    it('mở modal từ danh sách, ghi nhận LOST kèm lý do + đối thủ + chi tiết, sau đó khóa cơ hội', async () => {
      const closedResponse: Opportunity = {
        ...mockOpportunities[0],
        stage: 'LOST',
        status: 'CLOSED',
        probability: 0,
        lossReason: 'PRICE_TOO_HIGH',
        competitorName: 'Đối thủ XYZ',
        closeReasonDetail: 'Giá cao hơn 15% so với ngân sách của khách hàng',
        closedAt: '2026-09-04T16:00:00',
      };
      vi.mocked(opportunitiesApi.closeOpportunity).mockResolvedValue(
        closedResponse,
      );

      render(
        <OpportunityListPage
          currentUserRoles={['VT-04']}
          initialOpportunities={mockOpportunities}
        />,
      );

      fireEvent.click(screen.getByTestId('btn-close-opportunity-1'));
      expect(screen.getByTestId('opportunity-close-modal')).toBeInTheDocument();

      fireEvent.change(screen.getByTestId('select-loss-reason'), {
        target: { value: 'PRICE_TOO_HIGH' },
      });
      fireEvent.change(screen.getByTestId('input-competitor-name'), {
        target: { value: 'Đối thủ XYZ' },
      });
      fireEvent.change(screen.getByTestId('textarea-reason-detail'), {
        target: { value: 'Giá cao hơn 15% so với ngân sách của khách hàng' },
      });
      fireEvent.click(screen.getByTestId('btn-submit-close-opportunity'));

      await waitFor(() => {
        expect(opportunitiesApi.closeOpportunity).toHaveBeenCalledWith(1, {
          result: 'LOST',
          lossReason: 'PRICE_TOO_HIGH',
          competitorName: 'Đối thủ XYZ',
          reasonDetail: 'Giá cao hơn 15% so với ngân sách của khách hàng',
        });
      });

      await waitFor(() => {
        expect(screen.queryByTestId('opportunity-close-modal')).toBeNull();
      });

      expect(screen.getByTestId('badge-closed-1')).toHaveTextContent(
        'Đã hoàn tất',
      );
      expect(screen.getByTestId('loss-reason-info-1')).toHaveTextContent(
        /Giá cao hơn kỳ vọng/i,
      );
      expect(screen.getByTestId('loss-reason-info-1')).toHaveTextContent(
        'Đối thủ XYZ',
      );
      expect(screen.queryByTestId('btn-close-opportunity-1')).toBeNull();
    });
  });

  describe('Thiếu dữ liệu và ràng buộc (TC-02)', () => {
    it('chặn submit và báo lỗi khi chọn Thua nhưng chưa chọn lý do', () => {
      render(
        <OpportunityCloseModal
          isOpen
          opportunity={mockOpportunities[0]}
          currentUserRoles={['VT-04']}
          onClose={vi.fn()}
          onSuccess={vi.fn()}
        />,
      );

      expect(screen.getByTestId('select-loss-reason')).toHaveValue('');
      fireEvent.click(screen.getByTestId('btn-submit-close-opportunity'));

      expect(screen.getByTestId('loss-reason-error')).toBeInTheDocument();
      expect(
        screen.getByText(/Vui lòng chọn lý do khi ghi nhận cơ hội thất bại/i),
      ).toBeInTheDocument();
      expect(opportunitiesApi.closeOpportunity).not.toHaveBeenCalled();
    });

    it('hiển thị lỗi máy chủ khi backend trả INVALID_STATE', async () => {
      vi.mocked(opportunitiesApi.closeOpportunity).mockRejectedValue(
        new opportunitiesApi.OpportunityApiError(
          'INVALID_STATE',
          'Cơ hội đã đóng, không thể mở lại',
          400,
        ),
      );

      render(
        <OpportunityCloseModal
          isOpen
          opportunity={mockOpportunities[0]}
          currentUserRoles={['VT-04']}
          onClose={vi.fn()}
          onSuccess={vi.fn()}
        />,
      );

      fireEvent.change(screen.getByTestId('select-loss-reason'), {
        target: { value: 'BUDGET_CUT' },
      });
      fireEvent.click(screen.getByTestId('btn-submit-close-opportunity'));

      await waitFor(() => {
        expect(screen.getByTestId('modal-server-error')).toBeInTheDocument();
      });
      expect(
        screen.getByText(/Cơ hội đã đóng, không thể mở lại/i),
      ).toBeInTheDocument();
    });
  });

  describe('Phân quyền vai trò (TC-03)', () => {
    it('người dùng không thuộc VT-04 không thấy nút ghi nhận kết quả và thấy cảnh báo phân quyền', () => {
      render(
        <OpportunityListPage
          currentUserRoles={['VT-02']}
          currentUserName="Trần PM"
          initialOpportunities={mockOpportunities}
        />,
      );

      expect(screen.getByText(/Phân quyền nghiệp vụ/i)).toBeInTheDocument();
      expect(screen.queryByTestId('btn-close-opportunity-1')).toBeNull();
      expect(screen.queryByTestId('btn-disabled-close-2')).toBeNull();
    });
  });

  describe('Quy tắc QTN-06 & khóa cơ hội đã đóng (TC-04)', () => {
    it('vô hiệu hóa nút chốt khi cơ hội không ở giai đoạn Đàm phán', () => {
      render(
        <OpportunityListPage
          currentUserRoles={['VT-04']}
          initialOpportunities={mockOpportunities}
        />,
      );

      const disabled = screen.getByTestId('btn-disabled-close-2');
      expect(disabled).toBeDisabled();
      expect(disabled).toHaveTextContent(/Chưa thể chốt/i);
    });

    it('khóa thao tác với cơ hội đã đóng và hiển thị lý do thua + đối thủ', () => {
      render(
        <OpportunityListPage
          currentUserRoles={['VT-04']}
          initialOpportunities={mockOpportunities}
        />,
      );

      expect(screen.getByTestId('badge-closed-3')).toHaveTextContent(
        'Đã hoàn tất',
      );
      expect(screen.getByTestId('loss-reason-info-3')).toHaveTextContent(
        'Phần mềm XYZ',
      );
      expect(screen.queryByTestId('btn-close-opportunity-3')).toBeNull();
    });
  });
});
