import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import RevenueForecastPage from "../pages/RevenueForecastPage";
import * as opportunitiesApi from "../api/opportunitiesApi";
import type { RevenueForecastData } from "../types/opportunityTypes";

const mockForecastData: RevenueForecastData = {
  totalExpectedRevenue: 230000000,
  months: [
    {
      month: "2026-09",
      expectedRevenue: 180000000,
      opportunityCount: 2,
    },
    {
      month: "2026-10",
      expectedRevenue: 50000000,
      opportunityCount: 1,
    },
  ],
};

vi.mock("../api/opportunitiesApi", () => ({
  fetchRevenueForecast: vi.fn().mockResolvedValue({
    totalExpectedRevenue: 230000000,
    months: [
      { month: "2026-09", expectedRevenue: 180000000, opportunityCount: 2 },
      { month: "2026-10", expectedRevenue: 50000000, opportunityCount: 1 },
    ],
  }),
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

describe("RevenueForecastPage Component (NCL-03-CN-004)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(opportunitiesApi.fetchRevenueForecast).mockResolvedValue(
      mockForecastData,
    );
  });

  describe("Kiểm tra phân quyền truy cập vai trò (TC-03)", () => {
    it("cho phép Ban giám đốc (VT-01) truy cập màn hình dự báo doanh thu", async () => {
      render(
        <RevenueForecastPage
          currentUserRoles={["VT-01"]}
          currentUserName="Nguyễn Tổng Giám Đốc"
        />,
      );

      expect(
        screen.getByRole("heading", {
          level: 1,
          name: /Dự báo doanh thu theo xác suất giai đoạn/i,
        }),
      ).toBeInTheDocument();
      expect(screen.queryByTestId("forecast-access-denied")).toBeNull();
      expect(screen.getByTestId("btn-refresh-forecast")).toBeInTheDocument();
      await waitFor(() => {
        expect(opportunitiesApi.fetchRevenueForecast).toHaveBeenCalled();
      });
    });

    it("cho phép Nhân viên kinh doanh (VT-04) truy cập màn hình dự báo doanh thu", async () => {
      render(
        <RevenueForecastPage
          currentUserRoles={["VT-04"]}
          currentUserName="Trần Kinh Doanh"
        />,
      );

      expect(
        screen.getByRole("heading", {
          level: 1,
          name: /Dự báo doanh thu theo xác suất giai đoạn/i,
        }),
      ).toBeInTheDocument();
      expect(screen.queryByTestId("forecast-access-denied")).toBeNull();
      await waitFor(() => {
        expect(opportunitiesApi.fetchRevenueForecast).toHaveBeenCalled();
      });
    });

    it("từ chối truy cập (Access Denied) khi người dùng có vai trò khác như Quản lý dự án (VT-02)", () => {
      render(
        <RevenueForecastPage
          currentUserRoles={["VT-02"]}
          currentUserName="Lê Quản Lý Dự Án"
        />,
      );

      expect(screen.getByTestId("forecast-access-denied")).toBeInTheDocument();
      expect(
        screen.getByText(/Bạn không có thẩm quyền truy cập màn hình này/i),
      ).toBeInTheDocument();
      expect(screen.queryByTestId("btn-refresh-forecast")).toBeNull();
      expect(opportunitiesApi.fetchRevenueForecast).not.toHaveBeenCalled();
    });

    it("từ chối truy cập khi người dùng là Quản trị viên (VT-07) không kiêm nhiệm VT-01/VT-04", () => {
      render(
        <RevenueForecastPage
          currentUserRoles={["VT-07"]}
          currentUserName="Admin System"
        />,
      );

      expect(screen.getByTestId("forecast-access-denied")).toBeInTheDocument();
      expect(opportunitiesApi.fetchRevenueForecast).not.toHaveBeenCalled();
    });

    it("từ chối truy cập khi người dùng là Nhân sự (VT-06) hoặc Chuyên môn (VT-03)", () => {
      render(
        <RevenueForecastPage
          currentUserRoles={["VT-06", "VT-03"]}
          currentUserName="Hoàng Nhân Sự"
        />,
      );

      expect(screen.getByTestId("forecast-access-denied")).toBeInTheDocument();
    });
  });

  describe("Hiển thị dữ liệu dự báo doanh thu theo xác suất (TC-01)", () => {
    it("hiển thị đầy đủ tổng doanh thu kỳ vọng và các thẻ KPI tổng quan", async () => {
      render(
        <RevenueForecastPage
          currentUserRoles={["VT-01"]}
          initialData={mockForecastData}
        />,
      );

      // Thẻ KPI tổng doanh thu (230,000,000 VNĐ)
      const kpiTotal = screen.getByTestId("kpi-total-revenue");
      expect(kpiTotal).toBeInTheDocument();
      expect(kpiTotal).toHaveTextContent(/230\.000\.000/);

      // Thẻ số tháng dự báo (2 tháng)
      const kpiMonths = screen.getByTestId("kpi-total-months");
      expect(kpiMonths).toHaveTextContent("2");

      // Thẻ cơ hội mở trong kỳ (2 + 1 = 3 cơ hội)
      const kpiOpps = screen.getByTestId("kpi-total-opportunities");
      expect(kpiOpps).toHaveTextContent("3");

      // Thẻ kỳ vọng trung bình mỗi tháng (230,000,000 / 2 = 115,000,000 VNĐ)
      const kpiAvg = screen.getByTestId("kpi-avg-revenue");
      expect(kpiAvg).toHaveTextContent(/115\.000\.000/);
    });

    it("hiển thị biểu đồ phân bổ trực quan theo tháng", async () => {
      render(
        <RevenueForecastPage
          currentUserRoles={["VT-01"]}
          initialData={mockForecastData}
        />,
      );

      expect(screen.getByTestId("forecast-visual-chart")).toBeInTheDocument();
      expect(screen.getByTestId("chart-bar-2026-09")).toBeInTheDocument();
      expect(screen.getByTestId("chart-bar-2026-10")).toBeInTheDocument();
    });

    it("hiển thị bảng chi tiết từng tháng với tỷ trọng % và số cơ hội mở", async () => {
      render(
        <RevenueForecastPage
          currentUserRoles={["VT-01"]}
          initialData={mockForecastData}
        />,
      );

      expect(screen.getByTestId("forecast-table-card")).toBeInTheDocument();

      // Dòng tháng 2026-09
      const row09 = screen.getByTestId("forecast-row-2026-09");
      expect(row09).toHaveTextContent(/Tháng 09\/2026/);
      expect(row09).toHaveTextContent(/180\.000\.000/);
      expect(row09).toHaveTextContent("2"); // 2 cơ hội mở
      expect(row09).toHaveTextContent(/78\.3%/); // 180 / 230 ≈ 78.3%

      // Dòng tháng 2026-10
      const row10 = screen.getByTestId("forecast-row-2026-10");
      expect(row10).toHaveTextContent(/Tháng 10\/2026/);
      expect(row10).toHaveTextContent(/50\.000\.000/);
      expect(row10).toHaveTextContent("1"); // 1 cơ hội mở
      expect(row10).toHaveTextContent(/21\.7%/); // 50 / 230 ≈ 21.7%
    });
  });

  describe("Ngoại lệ, bộ lọc thời gian và cập nhật dữ liệu (TC-02)", () => {
    it('gọi lại API khi người dùng bấm nút "Làm mới số liệu"', async () => {
      render(
        <RevenueForecastPage
          currentUserRoles={["VT-01"]}
          initialData={mockForecastData}
        />,
      );

      const refreshBtn = screen.getByTestId("btn-refresh-forecast");
      fireEvent.click(refreshBtn);

      await waitFor(() => {
        expect(opportunitiesApi.fetchRevenueForecast).toHaveBeenCalledTimes(1);
      });
    });

    it("lọc dữ liệu theo khoảng thời gian from và to hợp lệ", async () => {
      render(<RevenueForecastPage currentUserRoles={["VT-01"]} />);

      await waitFor(() => {
        expect(opportunitiesApi.fetchRevenueForecast).toHaveBeenCalledWith({});
      });

      const fromInput = screen.getByTestId("filter-from-input");
      const toInput = screen.getByTestId("filter-to-input");
      const applyBtn = screen.getByTestId("btn-apply-filters");

      fireEvent.change(fromInput, { target: { value: "2026-09-01" } });
      fireEvent.change(toInput, { target: { value: "2026-12-31" } });
      fireEvent.click(applyBtn);

      await waitFor(() => {
        expect(opportunitiesApi.fetchRevenueForecast).toHaveBeenCalledWith({
          from: "2026-09-01",
          to: "2026-12-31",
        });
      });
    });

    it("báo lỗi validation khi người dùng chọn ngày bắt đầu sau ngày kết thúc (from > to)", async () => {
      render(<RevenueForecastPage currentUserRoles={["VT-01"]} />);

      await waitFor(() => {
        expect(opportunitiesApi.fetchRevenueForecast).toHaveBeenCalled();
      });

      const fromInput = screen.getByTestId("filter-from-input");
      const toInput = screen.getByTestId("filter-to-input");
      const filterForm = screen.getByTestId("filter-form");

      // from sau to
      fireEvent.change(fromInput, { target: { value: "2026-11-01" } });
      fireEvent.change(toInput, { target: { value: "2026-09-01" } });
      fireEvent.submit(filterForm);

      expect(screen.getByTestId("filter-validation-error")).toBeInTheDocument();
      expect(
        screen.getByText(/Tháng\/ngày bắt đầu không được sau ngày kết thúc/i),
      ).toBeInTheDocument();
    });

    it("nút Đặt lại xóa bỏ bộ lọc và tải lại dữ liệu mặc định", async () => {
      render(<RevenueForecastPage currentUserRoles={["VT-01"]} />);

      const fromInput = screen.getByTestId("filter-from-input");
      fireEvent.change(fromInput, { target: { value: "2026-09-01" } });

      const resetBtn = screen.getByTestId("btn-reset-filters");
      fireEvent.click(resetBtn);

      expect(fromInput).toHaveValue("");
      await waitFor(() => {
        expect(opportunitiesApi.fetchRevenueForecast).toHaveBeenCalledWith({});
      });
    });

    it("hiển thị Empty State khi không có dữ liệu cơ hội trong khoảng lọc", async () => {
      vi.mocked(opportunitiesApi.fetchRevenueForecast).mockResolvedValue({
        totalExpectedRevenue: 0,
        months: [],
      });

      render(<RevenueForecastPage currentUserRoles={["VT-01"]} />);

      await waitFor(() => {
        expect(screen.getByTestId("forecast-empty-state")).toBeInTheDocument();
      });

      expect(
        screen.getByText(/Chưa có dữ liệu dự báo doanh thu/i),
      ).toBeInTheDocument();
      expect(screen.queryByTestId("forecast-visual-chart")).toBeNull();
    });

    it("hiển thị thông báo lỗi và nút Thử lại khi API backend bị lỗi", async () => {
      vi.mocked(opportunitiesApi.fetchRevenueForecast).mockRejectedValue(
        new opportunitiesApi.OpportunityApiError(
          "SERVER_ERROR",
          "Lỗi kết nối máy chủ dữ liệu dự báo",
          500,
        ),
      );

      render(<RevenueForecastPage currentUserRoles={["VT-01"]} />);

      await waitFor(() => {
        expect(screen.getByTestId("forecast-error-state")).toBeInTheDocument();
      });

      expect(
        screen.getByText(/Lỗi kết nối máy chủ dữ liệu dự báo/i),
      ).toBeInTheDocument();
      expect(screen.getByTestId("btn-retry-forecast")).toBeInTheDocument();
    });
  });

  describe("Xem quy tắc tính dự báo QTN-07 và siêu dữ liệu (TC-04)", () => {
    it("bật và tắt panel thông tin quy tắc nghiệp vụ QTN-07", async () => {
      render(
        <RevenueForecastPage
          currentUserRoles={["VT-01"]}
          initialData={mockForecastData}
        />,
      );

      const toggleBtn = screen.getByTestId("btn-toggle-rules");
      expect(screen.queryByTestId("rule-info-panel")).toBeNull();

      // Bật panel
      fireEvent.click(toggleBtn);
      expect(screen.getByTestId("rule-info-panel")).toBeInTheDocument();
      expect(
        screen.getByText(/QUY TẮC NGHIỆP VỤ `QTN-07`/i),
      ).toBeInTheDocument();

      // Tắt panel
      fireEvent.click(toggleBtn);
      expect(screen.queryByTestId("rule-info-panel")).toBeNull();
    });
  });
});
