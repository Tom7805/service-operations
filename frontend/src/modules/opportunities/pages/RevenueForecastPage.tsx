import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import { ICONS } from "../../../components/common/icons";
import {
  fetchRevenueForecast,
  OpportunityApiError,
} from "../api/opportunitiesApi";
import type { RevenueForecastData } from "../types/opportunityTypes";

interface RevenueForecastPageProps {
  currentUserRoles?: string[];
  currentUserName?: string;
  initialData?: RevenueForecastData;
}

const currencyFormatter = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

export function formatVND(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "0 ₫";
  return currencyFormatter.format(value);
}

export function formatMonthDisplay(monthStr: string): string {
  // Định dạng YYYY-MM thành "Tháng MM/YYYY"
  const match = /^(\d{4})-(\d{2})$/.exec(monthStr);
  if (match) {
    return `Tháng ${match[2]}/${match[1]}`;
  }
  return monthStr;
}

export default function RevenueForecastPage({
  currentUserRoles = ["VT-01"],
  currentUserName = "Ban giám đốc",
  initialData,
}: RevenueForecastPageProps) {
  // NCL-03-CN-004-TC-03: Chỉ Ban giám đốc (VT-01) hoặc Nhân viên kinh doanh (VT-04) được truy cập
  const isAllowed =
    currentUserRoles.includes("VT-01") || currentUserRoles.includes("VT-04");

  const [data, setData] = useState<RevenueForecastData | null>(
    initialData ?? null,
  );
  const [loading, setLoading] = useState(initialData ? false : isAllowed);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Bộ lọc thời gian (from / to)
  const [fromInput, setFromInput] = useState("");
  const [toInput, setToInput] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [appliedFilters, setAppliedFilters] = useState<{
    from?: string;
    to?: string;
  }>({});

  // Thông tin đồng bộ & quy tắc (TC-04)
  const [lastUpdated, setLastUpdated] = useState<string>(() =>
    new Date().toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }),
  );
  const [showRuleInfo, setShowRuleInfo] = useState(false);

  const loadForecast = useCallback(
    async (
      filters: { from?: string; to?: string },
      isManualRefresh = false,
    ) => {
      if (!isAllowed) return;

      if (isManualRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      try {
        const res = await fetchRevenueForecast({
          from: filters.from || undefined,
          to: filters.to || undefined,
        });
        setData(res);
        setLastUpdated(
          new Date().toLocaleTimeString("vi-VN", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          }),
        );
      } catch (err) {
        const msg =
          err instanceof OpportunityApiError
            ? err.message
            : err instanceof Error
              ? err.message
              : "Không thể tải báo cáo dự báo doanh thu từ máy chủ.";
        setError(msg);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [isAllowed],
  );

  useEffect(() => {
    if (initialData) return;
    loadForecast(appliedFilters);
  }, [appliedFilters, loadForecast, initialData]);

  // Xử lý áp dụng bộ lọc (TC-01, TC-02)
  const handleFilterSubmit = (e: FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    // Kiểm tra from <= to nếu cả 2 được nhập
    if (fromInput.trim() && toInput.trim()) {
      if (fromInput.trim() > toInput.trim()) {
        setValidationError("Tháng/ngày bắt đầu không được sau ngày kết thúc.");
        return;
      }
    }

    setAppliedFilters({
      from: fromInput.trim() || undefined,
      to: toInput.trim() || undefined,
    });
  };

  // Đặt lại bộ lọc
  const handleResetFilters = () => {
    setFromInput("");
    setToInput("");
    setValidationError(null);
    setAppliedFilters({});
  };

  // Tính toán các chỉ số thống kê
  const months = useMemo(() => data?.months ?? [], [data]);
  const totalRevenue = data?.totalExpectedRevenue ?? 0;

  const totalOpportunities = useMemo(() => {
    return months.reduce((acc, curr) => acc + (curr.opportunityCount || 0), 0);
  }, [months]);

  const maxMonthRevenue = useMemo(() => {
    return months.reduce(
      (max, curr) => Math.max(max, curr.expectedRevenue || 0),
      0,
    );
  }, [months]);

  const avgMonthlyRevenue = useMemo(() => {
    if (months.length === 0) return 0;
    return Math.round(totalRevenue / months.length);
  }, [totalRevenue, months.length]);

  // TC-03: Từ chối truy cập nếu không có thẩm quyền
  if (!isAllowed) {
    return (
      <div
        className="access-denied-container"
        data-testid="forecast-access-denied"
      >
        <div className="access-denied-card">
          <div className="access-denied-icon">{ICONS.shieldOff}</div>
          <h2>Bạn không có thẩm quyền truy cập màn hình này</h2>
          <p>
            Chức năng dự báo doanh thu theo xác suất giai đoạn chỉ dành riêng
            cho vai trò <strong>Ban giám đốc (VT-01)</strong> hoặc{" "}
            <strong>Nhân viên kinh doanh (VT-04)</strong>.
          </p>
          <div className="security-log-badge">
            <span className="security-log-badge__item">
              {ICONS.shield} Thời điểm: {new Date().toLocaleString("vi-VN")}
            </span>
            <span className="security-log-badge__item">
              Tài khoản: {currentUserName}
            </span>
            <span className="security-log-badge__item">
              Vai trò hiện tại: {currentUserRoles.join(", ")}
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="user-management-page" data-testid="revenue-forecast-page">
      {/* Tiêu đề trang & Thao tác chính */}
      <div className="page-header">
        <div>
          <div className="page-header__kicker">
            <span className="page-header__tag">
              {ICONS.chart} CƠ HỘI BÁN HÀNG
            </span>
            <span className="page-header__dot" />
            <span className="page-header__meta">
              QUY TẮC QTN-07 · CHU KỲ SỐ MỘT
            </span>
          </div>
          <h1 className="page-title">
            Dự báo doanh thu theo xác suất giai đoạn
          </h1>
          <p className="page-subtitle">
            Hệ thống nhân giá trị mỗi cơ hội còn mở với xác suất của giai đoạn
            hiện tại rồi cộng dồn theo tháng dự kiến ký hợp đồng.
          </p>
        </div>

        <div className="page-header__actions">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setShowRuleInfo((prev) => !prev)}
            title="Xem quy tắc nghiệp vụ tính dự báo (QTN-07)"
            data-testid="btn-toggle-rules"
          >
            {ICONS.info} Quy tắc tính QTN-07
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={() => loadForecast(appliedFilters, true)}
            disabled={loading || refreshing}
            title="Tính lại dự báo doanh thu theo trạng thái cơ hội mới nhất (TC-02)"
            data-testid="btn-refresh-forecast"
          >
            <span className={refreshing ? "inline-block animate-spin" : ""}>
              {ICONS.refresh}
            </span>{" "}
            {refreshing ? "Đang đồng bộ..." : "Làm mới số liệu"}
          </button>
        </div>
      </div>

      {/* Thông tin quy tắc nghiệp vụ QTN-07 (TC-04) */}
      {showRuleInfo && (
        <div
          className="bg-surface border border-line rounded-lg p-4 mb-5 text-sm text-ink-muted leading-relaxed"
          data-testid="rule-info-panel"
        >
          <div className="flex items-center justify-between font-semibold text-ink-strong mb-2">
            <span className="flex items-center gap-1.5">
              {ICONS.document} QUY TẮC NGHIỆP VỤ `QTN-07` — DỰ BÁO DOANH THU
              THEO XÁC SUẤT GIAI ĐOẠN
            </span>
            <button
              type="button"
              className="text-ink-faint hover:text-ink-strong"
              onClick={() => setShowRuleInfo(false)}
            >
              {ICONS.close}
            </button>
          </div>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <strong>Công thức:</strong> Doanh thu dự báo = Giá trị cơ hội ×
              Xác suất giai đoạn hiện tại (%).
            </li>
            <li>
              <strong>Điều kiện tính:</strong> Chỉ cộng dồn các cơ hội còn đang
              mở (<code>status = OPEN</code>) và đã có ngày dự kiến ký hợp đồng.
            </li>
            <li>
              <strong>Loại trừ tự động (TC-02):</strong> Cơ hội đã đóng (bao gồm
              cơ hội <code>LOST</code> thất bại hoặc <code>WON</code> đã thắng)
              và cơ hội chưa có ngày chốt sẽ bị loại khỏi dự báo.
            </li>
            <li>
              <strong>Cập nhật tức thì:</strong> Mỗi lần bấm <em>Làm mới</em>,
              hệ thống đọc trực tiếp dữ liệu cơ hội hiện hành và hiển thị kỳ
              vọng thời gian thực.
            </li>
          </ul>
        </div>
      )}

      {/* Bảng điều khiển bộ lọc thời gian */}
      <div className="user-table-card mb-6">
        <form
          onSubmit={handleFilterSubmit}
          className="user-table-toolbar"
          data-testid="filter-form"
        >
          <div className="toolbar-filters">
            <div className="filter-group">
              <label htmlFor="forecast-from" className="filter-label">
                Từ ngày/tháng:
              </label>
              <input
                id="forecast-from"
                type="date"
                className="filter-select"
                value={fromInput}
                onChange={(e) => setFromInput(e.target.value)}
                placeholder="YYYY-MM-DD"
                data-testid="filter-from-input"
              />
            </div>

            <div className="filter-group">
              <label htmlFor="forecast-to" className="filter-label">
                Đến ngày/tháng:
              </label>
              <input
                id="forecast-to"
                type="date"
                className="filter-select"
                value={toInput}
                onChange={(e) => setToInput(e.target.value)}
                placeholder="YYYY-MM-DD"
                data-testid="filter-to-input"
              />
            </div>

            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
              data-testid="btn-apply-filters"
            >
              {ICONS.search} Lọc dự báo
            </button>

            {(fromInput ||
              toInput ||
              appliedFilters.from ||
              appliedFilters.to) && (
              <button
                type="button"
                className="btn-secondary"
                onClick={handleResetFilters}
                data-testid="btn-reset-filters"
              >
                Đặt lại
              </button>
            )}
          </div>

          <div className="text-xs text-ink-muted flex items-center gap-2">
            <span>
              {ICONS.clock} Cập nhật lúc: <strong>{lastUpdated}</strong>
            </span>
          </div>
        </form>

        {validationError && (
          <div
            className="px-5 py-3 border-t border-line bg-pale-red-bg text-pale-red-fg text-sm flex items-center gap-2"
            data-testid="filter-validation-error"
          >
            <span>{ICONS.alertTriangle}</span>
            <span>{validationError}</span>
          </div>
        )}
      </div>

      {/* Báo lỗi tải dữ liệu */}
      {error && (
        <div
          className="p-4 mb-6 rounded-lg border border-pale-red-fg bg-pale-red-bg text-pale-red-fg flex items-center justify-between"
          data-testid="forecast-error-state"
        >
          <div className="flex items-center gap-2">
            <span>{ICONS.alertTriangle}</span>
            <span>{error}</span>
          </div>
          <button
            type="button"
            className="btn-secondary text-xs"
            onClick={() => loadForecast(appliedFilters)}
            data-testid="btn-retry-forecast"
          >
            Thử lại
          </button>
        </div>
      )}

      {/* 4 Thẻ chỉ số tổng quan (KPI Stat Cards - TC-01) */}
      <div className="stats-grid" data-testid="forecast-kpi-grid">
        <div className="stat-card" data-testid="kpi-total-revenue">
          <span className="stat-card__label">
            <span className="stat-card__icon stat-card__icon--blue">
              {ICONS.money}
            </span>
            Tổng doanh thu kỳ vọng
          </span>
          <span className="stat-card__value text-success">
            {formatVND(totalRevenue)}
          </span>
        </div>

        <div className="stat-card" data-testid="kpi-total-months">
          <span className="stat-card__label">
            <span className="stat-card__icon stat-card__icon--purple">
              {ICONS.calendar}
            </span>
            Số tháng dự báo
          </span>
          <span className="stat-card__value">{months.length}</span>
        </div>

        <div className="stat-card" data-testid="kpi-total-opportunities">
          <span className="stat-card__label">
            <span className="stat-card__icon stat-card__icon--green">
              {ICONS.briefcase}
            </span>
            Cơ hội mở trong kỳ
          </span>
          <span className="stat-card__value">{totalOpportunities}</span>
        </div>

        <div className="stat-card" data-testid="kpi-avg-revenue">
          <span className="stat-card__label">
            <span className="stat-card__icon stat-card__icon--amber">
              {ICONS.chart}
            </span>
            Kỳ vọng bình quân / tháng
          </span>
          <span className="stat-card__value text-ink-strong">
            {formatVND(avgMonthlyRevenue)}
          </span>
        </div>
      </div>

      {/* Biểu đồ thanh trực quan theo từng tháng (Visual Bar Chart) */}
      {months.length > 0 && (
        <div
          className="user-table-card mb-6 p-5"
          data-testid="forecast-visual-chart"
        >
          <div className="flex items-center justify-between mb-4 border-b border-line pb-3">
            <div>
              <h2 className="text-base font-semibold text-ink-strong">
                Phân bổ doanh thu kỳ vọng theo tháng
              </h2>
              <p className="text-xs text-ink-muted">
                Tương quan giá trị kỳ vọng (VNĐ) và khối lượng cơ hội mở sắp về
              </p>
            </div>
            <span className="text-xs font-mono text-ink-faint">
              Đỉnh kỳ vọng: {formatVND(maxMonthRevenue)}
            </span>
          </div>

          <div className="space-y-4 pt-1">
            {months.map((m) => {
              const percentOfMax =
                maxMonthRevenue > 0
                  ? Math.round((m.expectedRevenue / maxMonthRevenue) * 100)
                  : 0;
              const percentOfTotal =
                totalRevenue > 0
                  ? ((m.expectedRevenue / totalRevenue) * 100).toFixed(1)
                  : "0.0";

              return (
                <div
                  key={m.month}
                  className="group"
                  data-testid={`chart-bar-${m.month}`}
                >
                  <div className="flex items-center justify-between text-sm mb-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-ink-strong w-28">
                        {formatMonthDisplay(m.month)}
                      </span>
                      <span className="badge badge--blue text-xs">
                        {m.opportunityCount} cơ hội mở
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-ink-strong font-semibold">
                        {formatVND(m.expectedRevenue)}
                      </span>
                      <span className="text-xs text-ink-faint w-12 text-right">
                        {percentOfTotal}%
                      </span>
                    </div>
                  </div>

                  <div className="h-3 w-full bg-surface-sunken rounded-full overflow-hidden border border-line-soft">
                    <div
                      className="h-full bg-ink-strong transition-all duration-500 rounded-full"
                      style={{ width: `${Math.max(percentOfMax, 2)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Bảng chi tiết doanh thu theo tháng (TC-01) */}
      <div className="user-table-card" data-testid="forecast-table-card">
        <div className="px-5 py-4 border-b border-line flex items-center justify-between bg-surface-alt">
          <h2 className="text-sm font-semibold text-ink-strong uppercase tracking-wide font-mono">
            Chi tiết dự báo theo từng tháng
          </h2>
          <span className="text-xs text-ink-muted">
            Hiển thị {months.length} tháng
          </span>
        </div>

        {loading ? (
          <div
            className="p-12 text-center text-ink-muted"
            data-testid="forecast-loading-state"
          >
            <span className="inline-block animate-spin text-2xl mb-2">
              {ICONS.refresh}
            </span>
            <p>Đang tính toán dự báo doanh thu...</p>
          </div>
        ) : months.length === 0 ? (
          <div
            className="table-empty-state p-12 text-center"
            data-testid="forecast-empty-state"
          >
            <div className="table-empty-state__icon flex justify-center mb-3 text-ink-faint">
              {ICONS.chart}
            </div>
            <h3 className="text-base font-semibold text-ink-strong mb-1">
              Chưa có dữ liệu dự báo doanh thu
            </h3>
            <p className="text-sm text-ink-muted max-w-md mx-auto">
              Không tìm thấy cơ hội mở nào có ngày dự kiến ký nằm trong khoảng
              thời gian đã chọn. Các cơ hội đã đóng (thắng hoặc thất bại) tự
              động không được tính vào dự báo.
            </p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="user-data-table">
              <thead>
                <tr>
                  <th>Tháng dự kiến</th>
                  <th className="text-right">Doanh thu kỳ vọng (VNĐ)</th>
                  <th className="text-center">Số cơ hội mở</th>
                  <th className="text-right">Tỷ trọng đóng góp</th>
                  <th>Mức độ tập trung</th>
                </tr>
              </thead>
              <tbody>
                {months.map((m) => {
                  const share =
                    totalRevenue > 0
                      ? ((m.expectedRevenue / totalRevenue) * 100).toFixed(1)
                      : "0.0";
                  const isHigh = parseFloat(share) >= 30;

                  return (
                    <tr key={m.month} data-testid={`forecast-row-${m.month}`}>
                      <td className="font-semibold text-ink-strong">
                        {formatMonthDisplay(m.month)}
                        <span className="ml-2 font-mono text-xs text-ink-faint">
                          ({m.month})
                        </span>
                      </td>
                      <td className="text-right font-mono font-medium text-ink-strong">
                        {formatVND(m.expectedRevenue)}
                      </td>
                      <td className="text-center font-mono">
                        <span className="inline-flex items-center justify-center min-w-[28px] h-6 px-2 rounded bg-surface-sunken text-xs font-semibold text-ink">
                          {m.opportunityCount}
                        </span>
                      </td>
                      <td className="text-right font-mono font-medium text-ink-strong">
                        {share}%
                      </td>
                      <td>
                        {isHigh ? (
                          <span className="badge badge--green text-xs">
                            Kỳ trọng điểm
                          </span>
                        ) : (
                          <span className="badge badge--blue text-xs">
                            Bình thường
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-surface-sunken font-semibold border-t-2 border-line">
                  <td className="text-ink-strong uppercase text-xs font-mono">
                    TỔNG CỘNG
                  </td>
                  <td className="text-right font-mono text-ink-strong text-base">
                    {formatVND(totalRevenue)}
                  </td>
                  <td className="text-center font-mono text-ink-strong">
                    {totalOpportunities}
                  </td>
                  <td className="text-right font-mono text-ink-strong">
                    100.0%
                  </td>
                  <td>—</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
