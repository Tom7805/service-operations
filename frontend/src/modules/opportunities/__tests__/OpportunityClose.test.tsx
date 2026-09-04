import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import OpportunityListPage from "../pages/OpportunityListPage";
import OpportunityCloseModal from "../components/OpportunityCloseModal";
import * as opportunitiesApi from "../api/opportunitiesApi";
import type { Opportunity } from "../types/opportunityTypes";

const mockOpportunities: Opportunity[] = [
  {
    id: 1,
    name: "Triển khai ERP Doanh nghiệp",
    customerId: 101,
    customerName: "Tập đoàn Đại Nam",
    expectedValue: 500000000,
    expectedCloseDate: "2026-10-31",
    stage: "NEGOTIATION",
    status: "OPEN",
    probability: 70,
    createdBy: "sale01",
  },
  {
    id: 2,
    name: "Dịch vụ Tư vấn Chuyển đổi số",
    customerId: 102,
    customerName: "Công ty Hoa Sen",
    expectedValue: 200000000,
    expectedCloseDate: "2026-11-15",
    stage: "PROPOSAL",
    status: "OPEN",
    probability: 40,
    createdBy: "sale01",
  },
  {
    id: 3,
    name: "Phần mềm Quản lý Kho",
    customerId: 103,
    customerName: "Logistics Toàn Cầu",
    expectedValue: 150000000,
    expectedCloseDate: "2026-08-30",
    stage: "LOST",
    status: "CLOSED",
    probability: 0,
    lossReason: "PRICE_TOO_HIGH",
    closeReasonDetail: "Giá cao hơn đối thủ 15%",
    competitorName: "Phần mềm XYZ",
    closedAt: "2026-08-29T15:00:00",
    createdBy: "sale01",
  },
];

vi.mock("../api/opportunitiesApi", () => ({
  closeOpportunity: vi.fn(),
  fetchStageHistory: vi.fn().mockResolvedValue([
    {
      id: 10,
      opportunityId: 1,
      fromStage: "NEGOTIATION",
      toStage: "LOST",
      changedByUsername: "sale01",
      changedAt: "2026-09-04T10:00:00",
    },
  ]),
  OpportunityApiError: class extends Error {
    constructor(
      public code: string,
      message: string,
      public statusCode?: number,
    ) {
      super(message);
      this.name = "OpportunityApiError";
    }
  },
}));

describe("Ghi nhận kết quả thắng thua của cơ hội (Story NCL-03-CN-005)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Kiểm tra phân quyền truy cập vai trò (TC-03)", () => {
    it("cho phép Nhân viên kinh doanh (VT-04) truy cập màn hình cơ hội bán hàng", () => {
      render(
        <OpportunityListPage
          currentUserRoles={["VT-04"]}
          currentUserName="Nguyễn Sales"
          initialOpportunities={mockOpportunities}
        />,
      );

      expect(
        screen.getByRole("heading", {
          level: 1,
          name: /Cơ hội bán hàng & Ghi nhận kết quả/i,
        }),
      ).toBeInTheDocument();
      expect(screen.queryByTestId("opportunity-access-denied")).toBeNull();
      expect(screen.getByTestId("btn-close-opportunity-1")).toBeInTheDocument();
    });

    it("từ chối truy cập (Access Denied) khi người dùng là Quản lý dự án (VT-02)", () => {
      render(
        <OpportunityListPage
          currentUserRoles={["VT-02"]}
          currentUserName="Trần PM"
          initialOpportunities={mockOpportunities}
        />,
      );

      expect(
        screen.getByTestId("opportunity-access-denied"),
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Bạn không có thẩm quyền truy cập màn hình này/i),
      ).toBeInTheDocument();
      expect(screen.queryByTestId("opportunity-table")).toBeNull();
    });

    it("từ chối truy cập khi người dùng là Ban giám đốc (VT-01) không kiêm VT-04", () => {
      render(
        <OpportunityListPage
          currentUserRoles={["VT-01"]}
          currentUserName="Lê Giám Đốc"
          initialOpportunities={mockOpportunities}
        />,
      );

      expect(
        screen.getByTestId("opportunity-access-denied"),
      ).toBeInTheDocument();
    });

    it("từ chối truy cập khi người dùng là Nhân sự (VT-06) hoặc Quản trị viên (VT-07)", () => {
      render(
        <OpportunityListPage
          currentUserRoles={["VT-06", "VT-07"]}
          currentUserName="Admin"
          initialOpportunities={mockOpportunities}
        />,
      );

      expect(
        screen.getByTestId("opportunity-access-denied"),
      ).toBeInTheDocument();
    });
  });

  describe("Luồng thành công ghi nhận kết quả (TC-01)", () => {
    it("ghi nhận kết quả Thua (LOST) kèm lý do giá cao, đối thủ và chi tiết thành công", async () => {
      const opportunityToClose = mockOpportunities[0]; // Stage = NEGOTIATION
      const closedOpportunityResponse: Opportunity = {
        ...opportunityToClose,
        stage: "LOST",
        status: "CLOSED",
        probability: 0,
        lossReason: "PRICE_TOO_HIGH",
        competitorName: "Đối thủ XYZ",
        closeReasonDetail: "Giá cao hơn 15% so với ngân sách của khách hàng",
        closedAt: "2026-09-04T16:00:00",
      };

      vi.mocked(opportunitiesApi.closeOpportunity).mockResolvedValue(
        closedOpportunityResponse,
      );

      render(
        <OpportunityListPage
          currentUserRoles={["VT-04"]}
          initialOpportunities={mockOpportunities}
        />,
      );

      // Bấm nút mở modal chốt kết quả cho cơ hội #1
      fireEvent.click(screen.getByTestId("btn-close-opportunity-1"));

      // Modal xuất hiện
      expect(screen.getByTestId("opportunity-close-modal")).toBeInTheDocument();

      // Mặc định chọn LOST, chọn lý do PRICE_TOO_HIGH
      const selectReason = screen.getByTestId("select-loss-reason");
      fireEvent.change(selectReason, { target: { value: "PRICE_TOO_HIGH" } });

      // Nhập tên đối thủ cạnh tranh
      const inputCompetitor = screen.getByTestId("input-competitor-name");
      fireEvent.change(inputCompetitor, { target: { value: "Đối thủ XYZ" } });

      // Nhập ghi chú chi tiết
      const textareaDetail = screen.getByTestId("textarea-reason-detail");
      fireEvent.change(textareaDetail, {
        target: { value: "Giá cao hơn 15% so với ngân sách của khách hàng" },
      });

      // Submit
      fireEvent.click(screen.getByTestId("btn-submit-close-opportunity"));

      await waitFor(() => {
        expect(opportunitiesApi.closeOpportunity).toHaveBeenCalledWith(1, {
          result: "LOST",
          lossReason: "PRICE_TOO_HIGH",
          competitorName: "Đối thủ XYZ",
          reasonDetail: "Giá cao hơn 15% so với ngân sách của khách hàng",
        });
      });

      // Modal đóng lại sau khi thành công
      await waitFor(() => {
        expect(screen.queryByTestId("opportunity-close-modal")).toBeNull();
      });

      // Cơ hội đã đóng hiển thị kết quả và nút bị khóa thành "Đã hoàn tất" (TC-04)
      expect(screen.getByTestId("badge-closed-1")).toHaveTextContent(
        "Đã hoàn tất",
      );
      expect(screen.getByTestId("loss-reason-info-1")).toHaveTextContent(
        /Giá cao hơn kỳ vọng/i,
      );
    });

    it("ghi nhận kết quả Thắng (WON) thành công và không yêu cầu lý do thua", async () => {
      const opportunityToClose = mockOpportunities[0];
      const wonOpportunityResponse: Opportunity = {
        ...opportunityToClose,
        stage: "WON",
        status: "CLOSED",
        probability: 100,
        closeReasonDetail: "Khách hàng đồng ý phương án đề xuất",
        closedAt: "2026-09-04T16:15:00",
      };

      vi.mocked(opportunitiesApi.closeOpportunity).mockResolvedValue(
        wonOpportunityResponse,
      );

      const handleSuccess = vi.fn();
      const handleClose = vi.fn();

      render(
        <OpportunityCloseModal
          isOpen={true}
          opportunity={opportunityToClose}
          currentUserRoles={["VT-04"]}
          onClose={handleClose}
          onSuccess={handleSuccess}
        />,
      );

      // Chuyển sang chọn Thắng (WON)
      fireEvent.click(screen.getByTestId("btn-select-won"));

      // Phần chọn lý do thua bị ẩn
      expect(screen.queryByTestId("select-loss-reason")).toBeNull();

      // Nhập ghi chú
      const textareaDetail = screen.getByTestId("textarea-reason-detail");
      fireEvent.change(textareaDetail, {
        target: { value: "Khách hàng đồng ý phương án đề xuất" },
      });

      // Submit
      fireEvent.click(screen.getByTestId("btn-submit-close-opportunity"));

      await waitFor(() => {
        expect(opportunitiesApi.closeOpportunity).toHaveBeenCalledWith(1, {
          result: "WON",
          lossReason: undefined,
          competitorName: undefined,
          reasonDetail: "Khách hàng đồng ý phương án đề xuất",
        });
      });

      expect(handleSuccess).toHaveBeenCalledWith(wonOpportunityResponse);
      expect(handleClose).toHaveBeenCalled();
    });
  });

  describe("Kiểm tra thiếu dữ liệu và ràng buộc validation (TC-02)", () => {
    it("chặn submit và báo lỗi khi chọn kết quả Thua nhưng chưa chọn lý do", async () => {
      const opportunityToClose = mockOpportunities[0];
      const handleSuccess = vi.fn();
      const handleClose = vi.fn();

      render(
        <OpportunityCloseModal
          isOpen={true}
          opportunity={opportunityToClose}
          currentUserRoles={["VT-04"]}
          onClose={handleClose}
          onSuccess={handleSuccess}
        />,
      );

      // Đang ở chế độ LOST nhưng ô lý do để trống
      expect(screen.getByTestId("select-loss-reason")).toHaveValue("");

      // Bấm nút xác nhận
      fireEvent.click(screen.getByTestId("btn-submit-close-opportunity"));

      // Form báo lỗi yêu cầu chọn lý do
      expect(screen.getByTestId("loss-reason-error")).toBeInTheDocument();
      expect(
        screen.getByText(/Vui lòng chọn lý do khi ghi nhận cơ hội thất bại/i),
      ).toBeInTheDocument();

      // Không gọi API backend
      expect(opportunitiesApi.closeOpportunity).not.toHaveBeenCalled();
      expect(handleSuccess).not.toHaveBeenCalled();
    });

    it("hiển thị thông báo lỗi khi máy chủ trả về VALIDATION_ERROR hoặc INVALID_STATE", async () => {
      const opportunityToClose = mockOpportunities[0];
      vi.mocked(opportunitiesApi.closeOpportunity).mockRejectedValue(
        new opportunitiesApi.OpportunityApiError(
          "INVALID_STATE",
          "Cơ hội đã đóng, không thể mở lại",
          400,
        ),
      );

      render(
        <OpportunityCloseModal
          isOpen={true}
          opportunity={opportunityToClose}
          currentUserRoles={["VT-04"]}
          onClose={vi.fn()}
          onSuccess={vi.fn()}
        />,
      );

      // Chọn lý do
      fireEvent.change(screen.getByTestId("select-loss-reason"), {
        target: { value: "BUDGET_CUT" },
      });

      fireEvent.click(screen.getByTestId("btn-submit-close-opportunity"));

      await waitFor(() => {
        expect(screen.getByTestId("modal-server-error")).toBeInTheDocument();
      });

      expect(
        screen.getByText(/Cơ hội đã đóng, không thể mở lại/i),
      ).toBeInTheDocument();
    });
  });

  describe("Quy tắc QTN-06 & Khóa cơ hội sau khi đóng (TC-04)", () => {
    it("vô hiệu hóa nút chốt kết quả khi cơ hội không ở giai đoạn đàm phán (ví dụ PROPOSAL)", () => {
      render(
        <OpportunityListPage
          currentUserRoles={["VT-04"]}
          initialOpportunities={mockOpportunities}
        />,
      );

      // Cơ hội #2 ở giai đoạn PROPOSAL -> Nút bị disabled
      const disabledBtn = screen.getByTestId("btn-disabled-close-2");
      expect(disabledBtn).toBeInTheDocument();
      expect(disabledBtn).toBeDisabled();
      expect(disabledBtn).toHaveTextContent(/Chưa thể chốt/i);
    });

    it("khóa thao tác đối với cơ hội đã đóng (status = CLOSED) và hiển thị thông tin lý do", () => {
      render(
        <OpportunityListPage
          currentUserRoles={["VT-04"]}
          initialOpportunities={mockOpportunities}
        />,
      );

      // Cơ hội #3 đã đóng ở trạng thái LOST
      expect(screen.getByTestId("badge-closed-3")).toHaveTextContent(
        "Đã hoàn tất",
      );
      expect(screen.getByTestId("loss-reason-info-3")).toBeInTheDocument();
      expect(screen.getByTestId("loss-reason-info-3")).toHaveTextContent(
        "Phần mềm XYZ",
      );
      expect(screen.queryByTestId("btn-close-opportunity-3")).toBeNull();
    });

    it("mở modal xem lịch sử chuyển giai đoạn của cơ hội", async () => {
      render(
        <OpportunityListPage
          currentUserRoles={["VT-04"]}
          initialOpportunities={mockOpportunities}
        />,
      );

      const viewHistoryBtn = screen.getByTestId("btn-view-history-1");
      fireEvent.click(viewHistoryBtn);

      await waitFor(() => {
        expect(screen.getByTestId("stage-history-modal")).toBeInTheDocument();
      });

      expect(opportunitiesApi.fetchStageHistory).toHaveBeenCalledWith(1);
      expect(screen.getByText(/NEGOTIATION → LOST/i)).toBeInTheDocument();

      // Đóng modal lịch sử
      fireEvent.click(screen.getByTestId("btn-close-history-modal"));
      expect(screen.queryByTestId("stage-history-modal")).toBeNull();
    });
  });
});
