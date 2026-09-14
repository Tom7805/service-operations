import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import { ICONS } from "../../../components/common/icons";
import { roleLabels } from "../../../utils/roleLabel";
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

  // Tháng đang bung chi tiết danh sách cơ hội (bấm nhãn "X cơ hội mở" trên biểu đồ)
  const [expandedMonth, setExpandedMonth] = useState<string | null>(null);

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

  // Cơ hội đang mở nhưng chưa có xác suất giai đoạn (probability = null) —
  // bị tính ngầm như 0% nên đóng góp 0 vào dự báo mà không ai biết nếu không
  // có cảnh báo này. Dữ liệu hợp lệ không bao giờ rơi vào trường hợp này vì
  // OpportunityServiceImpl.create() luôn gán xác suất khởi tạo ngay khi tạo.
  const opportunitiesMissingProbability = useMemo(() => {
    return months.flatMap((m) => m.opportunities ?? []).filter((o) => o.probability == null);
  }, [months]);

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
            cho vai trò <strong>Ban giám đốc</strong> hoặc{" "}
            <strong>Nhân viên kinh doanh</strong>.
          </p>
          <div className="security-log-badge">
            <span className="security-log-badge__item">
              {ICONS.shield} Thời điểm: {new Date().toLocaleString("vi-VN")}
            </span>
            <span className="security-log-badge__item">
              Tài khoản: {currentUserName}
            </span>
            <span className="security-log-badge__item">
              Vai trò hiện tại: {roleLabels(currentUserRoles)}
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
              QUY TẮC DỰ BÁO DOANH THU
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
            title="Xem quy tắc nghiệp vụ tính dự báo"
            data-testid="btn-toggle-rules"
          >
            {ICONS.info} Quy tắc tính dự báo
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={() => loadForecast(appliedFilters, true)}
            disabled={loading || refreshing}
            title="Tính lại dự báo doanh thu theo trạng thái cơ hội mới nhất"
            data-testid="btn-refresh-forecast"
          >
            {refreshing ? (
              <span className="spinner-sm" aria-hidden="true" />
            ) : (
              ICONS.refresh
            )}{" "}
            {refreshing ? "Đang đồng bộ..." : "Làm mới số liệu"}
          </button>
        </div>
      </div>

      {/* Thông tin quy tắc nghiệp vụ QTN-07 (TC-04) */}
      {showRuleInfo && (
        <div className="forecast-rule-panel" data-testid="rule-info-panel">
          <div className="forecast-rule-panel__head">
            <span className="forecast-rule-panel__title">
              {ICONS.document} Quy tắc tính dự báo doanh thu
            </span>
            <button
              type="button"
              className="forecast-rule-panel__close"
              onClick={() => setShowRuleInfo(false)}
              aria-label="Đóng bảng quy tắc"
            >
              {ICONS.close}
            </button>
          </div>
          <ul className="forecast-rule-panel__list">
            <li>
              <strong>Công thức:</strong> Doanh thu dự báo = Giá trị cơ hội ×
              Xác suất giai đoạn hiện tại (%).
            </li>
            <li>
              <strong>Điều kiện tính:</strong> Chỉ cộng dồn các cơ hội còn đang
              mở (<code>status = OPEN</code>) và đã có ngày dự kiến ký hợp đồng.
            </li>
            <li>
              <strong>Loại trừ tự động:</strong> Cơ hội đã đóng (bao gồm cơ hội{" "}
              <code>LOST</code> thất bại hoặc <code>WON</code> đã thắng) và cơ
              hội chưa có ngày chốt sẽ bị loại khỏi dự báo.
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
      <div className="user-table-card">
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

          <div className="forecast-updated-at">
            {ICONS.clock} Cập nhật lúc: <strong>{lastUpdated}</strong>
          </div>
        </form>

        {validationError && (
          <div className="forecast-filter-error" data-testid="filter-validation-error">
            <span>{ICONS.alertTriangle}</span>
            <span>{validationError}</span>
          </div>
        )}
      </div>

      {/* Báo lỗi tải dữ liệu */}
      {error && (
        <div
          className="alert-box alert-box--danger"
          style={{ justifyContent: "space-between" }}
          data-testid="forecast-error-state"
        >
          <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {ICONS.alertTriangle} {error}
          </span>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => loadForecast(appliedFilters)}
            data-testid="btn-retry-forecast"
          >
            Thử lại
          </button>
        </div>
      )}

      {/* Cảnh báo dữ liệu: cơ hội mở nhưng thiếu xác suất giai đoạn (đang bị tính như 0%) */}
      {opportunitiesMissingProbability.length > 0 && (
        <div className="alert-box alert-box--warning" data-testid="forecast-missing-probability-warning">
          <span>{ICONS.alertTriangle}</span>
          <div>
            <strong>Cảnh báo dữ liệu:</strong> {opportunitiesMissingProbability.length} cơ hội
            đang mở nhưng chưa có xác suất giai đoạn, hệ thống tạm tính đóng góp của các cơ hội
            này là 0 đ vào dự báo — có thể khiến tổng doanh thu kỳ vọng thấp hơn thực tế:
            <ul className="forecast-data-warning-list">
              {opportunitiesMissingProbability.map((o) => (
                <li key={o.id}>
                  <strong>{o.name}</strong>
                  {o.customerName ? ` — ${o.customerName}` : ""} (
                  {formatVND(o.expectedValue)})
                </li>
              ))}
            </ul>
          </div>
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
        <div className="user-table-card" data-testid="forecast-visual-chart">
          <div className="forecast-chart">
            <div className="forecast-chart__head">
              <div>
                <h2 className="forecast-chart__title">
                  Phân bổ doanh thu kỳ vọng theo tháng
                </h2>
                <p className="forecast-chart__subtitle">
                  Tương quan giá trị kỳ vọng (VNĐ) và khối lượng cơ hội mở sắp về
                </p>
              </div>
              <span className="forecast-chart__peak">
                Tháng cao nhất: {formatVND(maxMonthRevenue)}
              </span>
            </div>

            <div className="forecast-chart__rows">
              {months.map((m) => {
                const percentOfMax =
                  maxMonthRevenue > 0
                    ? Math.round((m.expectedRevenue / maxMonthRevenue) * 100)
                    : 0;
                const percentOfTotal =
                  totalRevenue > 0
                    ? ((m.expectedRevenue / totalRevenue) * 100).toFixed(1)
                    : "0.0";

                const isExpanded = expandedMonth === m.month;
                const hasOpportunities = m.opportunities && m.opportunities.length > 0;

                return (
                  <div key={m.month} data-testid={`chart-bar-${m.month}`}>
                    <div className="forecast-chart__row-top">
                      <div className="forecast-chart__row-left">
                        <span className="forecast-chart__month">
                          {formatMonthDisplay(m.month)}
                        </span>
                        <button
                          type="button"
                          className="forecast-chart__toggle"
                          onClick={() =>
                            setExpandedMonth((prev) => (prev === m.month ? null : m.month))
                          }
                          disabled={!hasOpportunities}
                          aria-expanded={isExpanded}
                          data-testid={`chart-toggle-${m.month}`}
                          title={
                            hasOpportunities
                              ? "Xem danh sách cơ hội trong tháng này"
                              : "Không có dữ liệu chi tiết"
                          }
                        >
                          {m.opportunityCount} cơ hội mở
                          {hasOpportunities && (
                            <span className="forecast-chart__toggle-caret">
                              {isExpanded ? "▲" : "▼"}
                            </span>
                          )}
                        </button>
                      </div>
                      <div className="forecast-chart__row-right">
                        <span className="forecast-chart__amount">
                          {formatVND(m.expectedRevenue)}
                        </span>
                        <span className="forecast-chart__share">
                          {percentOfTotal}%
                        </span>
                      </div>
                    </div>

                    <div className="forecast-chart__track">
                      <div
                        className="forecast-chart__fill"
                        style={{ width: `${Math.max(percentOfMax, 2)}%` }}
                      />
                    </div>

                    {isExpanded && hasOpportunities && (
                      <div
                        className="forecast-chart__drill"
                        data-testid={`chart-drill-${m.month}`}
                      >
                        {m.opportunities.map((opp) => (
                          <div key={opp.id} className="forecast-chart__drill-item">
                            <div className="forecast-chart__drill-main">
                              <span className="forecast-chart__drill-name">
                                {opp.name}
                                {opp.probability == null && (
                                  <span className="forecast-chart__drill-flag">
                                    Thiếu xác suất
                                  </span>
                                )}
                              </span>
                              {opp.customerName && (
                                <span className="forecast-chart__drill-customer">
                                  {opp.customerName}
                                </span>
                              )}
                            </div>
                            <div className="forecast-chart__drill-meta">
                              <span>
                                {new Date(opp.expectedCloseDate).toLocaleDateString("vi-VN")}
                              </span>
                              <span>
                                {opp.probability == null ? "—" : `${opp.probability}%`} xác suất
                              </span>
                              <span className="forecast-chart__drill-value">
                                {formatVND(opp.weightedRevenue)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Bảng chi tiết doanh thu theo tháng (TC-01) */}
      <div className="user-table-card" data-testid="forecast-table-card">
        <div className="forecast-table-head">
          <h2 className="forecast-table-head__title">
            Chi tiết dự báo theo từng tháng
          </h2>
          <span className="forecast-table-head__count">
            Hiển thị {months.length} tháng
          </span>
        </div>

        {loading ? (
          <div className="forecast-loading-state" data-testid="forecast-loading-state">
            <span className="spinner-lg" aria-hidden="true" />
            <p>Đang tính toán dự báo doanh thu...</p>
          </div>
        ) : months.length === 0 ? (
          <div className="table-empty-state" data-testid="forecast-empty-state">
            <div className="table-empty-state__icon">{ICONS.chart}</div>
            <h3>Chưa có dữ liệu dự báo doanh thu</h3>
            <p>
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
                      <td>
                        {formatMonthDisplay(m.month)}
                        <span className="forecast-table__month-code">
                          ({m.month})
                        </span>
                      </td>
                      <td className="text-right mono-cell">
                        {formatVND(m.expectedRevenue)}
                      </td>
                      <td className="text-center">
                        <span className="count-chip">{m.opportunityCount}</span>
                      </td>
                      <td className="text-right mono-cell">{share}%</td>
                      <td>
                        {isHigh ? (
                          <span className="badge badge--green">Kỳ trọng điểm</span>
                        ) : (
                          <span className="badge badge--blue">Bình thường</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="forecast-table__total-row">
                  <td className="forecast-table__total-label">TỔNG CỘNG</td>
                  <td className="text-right mono-cell">
                    {formatVND(totalRevenue)}
                  </td>
                  <td className="text-center mono-cell">{totalOpportunities}</td>
                  <td className="text-right mono-cell">100.0%</td>
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
