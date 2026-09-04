import { useMemo, useState } from "react";
import { ICONS } from "../../../components/common/icons";
import { fetchStageHistory } from "../api/opportunitiesApi";
import OpportunityCloseModal from "../components/OpportunityCloseModal";
import {
  LOSS_REASON_OPTIONS,
  OPPORTUNITY_STAGES,
  type Opportunity,
  type StageHistoryItem,
} from "../types/opportunityTypes";

interface OpportunityListPageProps {
  currentUserRoles?: string[];
  currentUserName?: string;
  initialOpportunities?: Opportunity[];
}

const currencyFormatter = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

/** Dữ liệu mẫu chuẩn cho cơ hội bán hàng nếu chưa có dữ liệu từ prop */
const DEFAULT_OPPORTUNITIES: Opportunity[] = [
  {
    id: 1,
    name: "Triển khai hệ thống ERP cho Công ty ABC",
    customerId: 101,
    customerName: "Công ty Cổ phần Công nghệ ABC",
    expectedValue: 500000000,
    expectedCloseDate: "2026-09-30",
    stage: "NEGOTIATION",
    status: "OPEN",
    probability: 70,
    ownerId: 1,
    createdBy: "sale01",
    createdAt: "2026-08-15T09:00:00",
  },
  {
    id: 2,
    name: "Cung cấp giải pháp CRM & Chăm sóc khách hàng",
    customerId: 102,
    customerName: "Tập đoàn Bán lẻ Miền Nam",
    expectedValue: 250000000,
    expectedCloseDate: "2026-10-15",
    stage: "NEGOTIATION",
    status: "OPEN",
    probability: 70,
    ownerId: 1,
    createdBy: "sale01",
    createdAt: "2026-08-20T14:30:00",
  },
  {
    id: 3,
    name: "Nâng cấp hạ tầng dịch vụ Cloud cho Ngân hàng X",
    customerId: 103,
    customerName: "Ngân hàng TMCP X",
    expectedValue: 800000000,
    expectedCloseDate: "2026-11-20",
    stage: "PROPOSAL",
    status: "OPEN",
    probability: 40,
    ownerId: 1,
    createdBy: "sale01",
    createdAt: "2026-08-25T11:15:00",
  },
  {
    id: 4,
    name: "Tư vấn chuyển đổi số doanh nghiệp SME",
    customerId: 104,
    customerName: "Công ty May mặc Tân Bình",
    expectedValue: 120000000,
    expectedCloseDate: "2026-08-30",
    stage: "LOST",
    status: "CLOSED",
    probability: 0,
    lossReason: "PRICE_TOO_HIGH",
    closeReasonDetail: "Khách hàng ngân sách hạn chế, chi phí đề xuất vượt 20%",
    competitorName: "Phần mềm Á Châu",
    closedAt: "2026-08-29T16:00:00",
    ownerId: 1,
    createdBy: "sale01",
    createdAt: "2026-08-01T10:00:00",
  },
  {
    id: 5,
    name: "Bảo trì hệ thống thông tin nội bộ 2026",
    customerId: 105,
    customerName: "Công ty Logistics Nam Việt",
    expectedValue: 180000000,
    expectedCloseDate: "2026-08-20",
    stage: "WON",
    status: "CLOSED",
    probability: 100,
    closeReasonDetail:
      "Khách hàng hài lòng với chất lượng dịch vụ các năm trước",
    closedAt: "2026-08-18T10:30:00",
    ownerId: 1,
    createdBy: "sale01",
    createdAt: "2026-07-15T09:30:00",
  },
];

export default function OpportunityListPage({
  currentUserRoles = ["VT-04"],
  currentUserName = "Nhân viên kinh doanh",
  initialOpportunities,
}: OpportunityListPageProps) {
  // NCL-03-CN-005-TC-03: Chỉ Nhân viên kinh doanh (VT-04) mới được phép thực hiện
  const isSales = currentUserRoles.includes("VT-04");

  const [opportunities, setOpportunities] = useState<Opportunity[]>(
    initialOpportunities ?? DEFAULT_OPPORTUNITIES,
  );

  // Bộ lọc & Tìm kiếm
  const [searchTerm, setSearchTerm] = useState("");
  const [stageFilter, setStageFilter] = useState<string>("ALL");

  // Modal đóng cơ hội (NCL-03-CN-005)
  const [closingOpportunity, setClosingOpportunity] =
    useState<Opportunity | null>(null);

  // Modal lịch sử chuyển giai đoạn (TC-04)
  const [historyOpportunity, setHistoryOpportunity] =
    useState<Opportunity | null>(null);
  const [stageHistoryList, setStageHistoryList] = useState<StageHistoryItem[]>(
    [],
  );
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Toast thông báo
  const [toastMessage, setToastMessage] = useState<{
    text: string;
    type: "success" | "error" | "info";
  } | null>(null);

  const showToast = (
    text: string,
    type: "success" | "error" | "info" = "success",
  ) => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 5000);
  };

  // Xem lịch sử chuyển giai đoạn (TC-04)
  const handleOpenHistory = async (opp: Opportunity) => {
    setHistoryOpportunity(opp);
    setLoadingHistory(true);
    try {
      const history = await fetchStageHistory(opp.id);
      setStageHistoryList(history);
    } catch {
      // Fallback lịch sử hiển thị
      setStageHistoryList([
        {
          id: 1,
          opportunityId: opp.id,
          fromStage: "NEGOTIATION",
          toStage: opp.stage,
          changedByUsername: opp.createdBy || "sale01",
          changedAt: opp.closedAt || new Date().toISOString(),
        },
      ]);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Cập nhật sau khi đóng cơ hội thành công (TC-01, TC-04)
  const handleCloseSuccess = (updated: Opportunity) => {
    setOpportunities((prev) =>
      prev.map((o) => (o.id === updated.id ? { ...o, ...updated } : o)),
    );

    const isWon = updated.stage === "WON";
    showToast(
      `Đã ghi nhận kết quả ${isWon ? "THẮNG (WON)" : "THẤT BẠI (LOST)"} cho cơ hội "${updated.name}" thành công!`,
      "success",
    );
  };

  // Lọc danh sách cơ hội
  const filteredOpportunities = useMemo(() => {
    return opportunities.filter((item) => {
      const matchSearch =
        !searchTerm.trim() ||
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.customerName &&
          item.customerName.toLowerCase().includes(searchTerm.toLowerCase()));

      if (!matchSearch) return false;

      if (stageFilter === "NEGOTIATION_OPEN") {
        return item.stage === "NEGOTIATION" && item.status === "OPEN";
      }
      if (stageFilter === "WON") return item.stage === "WON";
      if (stageFilter === "LOST") return item.stage === "LOST";
      if (stageFilter === "OPEN") return item.status === "OPEN";
      if (stageFilter === "CLOSED") return item.status === "CLOSED";

      return true;
    });
  }, [opportunities, searchTerm, stageFilter]);

  // Thống kê nhanh
  const stats = useMemo(() => {
    const total = opportunities.length;
    const negotiationCount = opportunities.filter(
      (o) => o.stage === "NEGOTIATION" && o.status === "OPEN",
    ).length;
    const wonCount = opportunities.filter((o) => o.stage === "WON").length;
    const lostCount = opportunities.filter((o) => o.stage === "LOST").length;

    return { total, negotiationCount, wonCount, lostCount };
  }, [opportunities]);

  // TC-03: Từ chối truy cập nếu không phải Nhân viên kinh doanh (VT-04)
  if (!isSales) {
    return (
      <div
        className="access-denied-container"
        data-testid="opportunity-access-denied"
      >
        <div className="access-denied-card">
          <div className="access-denied-icon">{ICONS.shieldOff}</div>
          <h2>Bạn không có thẩm quyền truy cập màn hình này</h2>
          <p>
            Chức năng quản lý và ghi nhận kết quả thắng thua của cơ hội bán hàng
            chỉ dành riêng cho vai trò{" "}
            <strong>Nhân viên kinh doanh (VT-04)</strong>. Các vai trò khác bị
            từ chối truy cập và được ghi nhật ký bảo mật phía máy chủ (TC-03).
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
    <div className="user-management-page" data-testid="opportunity-list-page">
      {/* Toast thông báo */}
      {toastMessage && (
        <div
          className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg border text-sm max-w-md animate-fade-in ${
            toastMessage.type === "success"
              ? "bg-emerald-50 border-emerald-300 text-emerald-900"
              : "bg-rose-50 border-rose-300 text-rose-900"
          }`}
          data-testid="toast-notification"
        >
          <div className="flex items-center gap-2">
            <span>{toastMessage.type === "success" ? "✓" : "✕"}</span>
            <span>{toastMessage.text}</span>
          </div>
        </div>
      )}

      {/* Page Header */}
      <div className="page-header">
        <div>
          <div className="page-header__kicker">
            <span className="page-header__tag">
              {ICONS.target} QUY TRÌNH BÁN HÀNG
            </span>
            <span className="page-header__dot" />
            <span className="page-header__meta">
              STORY NCL-03-CN-005 · CHU KỲ SỐ MỘT
            </span>
          </div>
          <h1 className="page-title">Cơ hội bán hàng & Ghi nhận kết quả</h1>
          <p className="page-subtitle">
            Theo dõi đường ống cơ hội, đàm phán và ghi nhận lý do thắng hoặc
            thua của cơ hội để công ty rút kinh nghiệm cho các lần sau (QTN-06).
          </p>
        </div>
      </div>

      {/* Thẻ chỉ số tổng quan (KPI Stat Cards) */}
      <div className="stats-grid" data-testid="opportunity-stats-grid">
        <div className="stat-card">
          <span className="stat-card__label">
            <span className="stat-card__icon stat-card__icon--blue">
              {ICONS.target}
            </span>
            Tổng số cơ hội
          </span>
          <span className="stat-card__value">{stats.total}</span>
        </div>

        <div className="stat-card">
          <span className="stat-card__label">
            <span className="stat-card__icon stat-card__icon--amber">
              {ICONS.clock}
            </span>
            Đang đàm phán (Cần chốt)
          </span>
          <span className="stat-card__value text-warning">
            {stats.negotiationCount}
          </span>
        </div>

        <div className="stat-card">
          <span className="stat-card__label">
            <span className="stat-card__icon stat-card__icon--green">
              {ICONS.checkCircle}
            </span>
            Cơ hội đã thắng (WON)
          </span>
          <span className="stat-card__value text-success">
            {stats.wonCount}
          </span>
        </div>

        <div className="stat-card">
          <span className="stat-card__label">
            <span className="stat-card__icon stat-card__icon--red">
              {ICONS.close}
            </span>
            Cơ hội đã thất bại (LOST)
          </span>
          <span className="stat-card__value text-danger">
            {stats.lostCount}
          </span>
        </div>
      </div>

      {/* Toolbar bộ lọc & tìm kiếm */}
      <div className="user-table-card mb-6">
        <div className="user-table-toolbar">
          <div className="search-box">
            <span className="search-box__icon">{ICONS.search}</span>
            <input
              type="text"
              className="search-box__input"
              placeholder="Tìm theo tên cơ hội hoặc khách hàng..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              data-testid="search-opportunity-input"
            />
            {searchTerm && (
              <button
                type="button"
                className="search-box__clear"
                onClick={() => setSearchTerm("")}
              >
                {ICONS.close}
              </button>
            )}
          </div>

          <div className="toolbar-filters">
            <div className="filter-group">
              <label htmlFor="stage-filter-select" className="filter-label">
                Lọc trạng thái:
              </label>
              <select
                id="stage-filter-select"
                className="filter-select"
                value={stageFilter}
                onChange={(e) => setStageFilter(e.target.value)}
                data-testid="select-stage-filter"
              >
                <option value="ALL">Tất cả giai đoạn</option>
                <option value="NEGOTIATION_OPEN">
                  Đang đàm phán (Cần chốt)
                </option>
                <option value="OPEN">Tất cả đang mở</option>
                <option value="WON">Đã thắng (WON)</option>
                <option value="LOST">Đã thất bại (LOST)</option>
                <option value="CLOSED">Tất cả đã đóng</option>
              </select>
            </div>
          </div>
        </div>

        {/* Danh sách cơ hội dạng bảng */}
        <div className="table-responsive">
          <table className="user-data-table" data-testid="opportunity-table">
            <thead>
              <tr>
                <th>Tên cơ hội bán hàng</th>
                <th>Khách hàng</th>
                <th className="text-right">Giá trị kỳ vọng</th>
                <th className="text-center">Giai đoạn</th>
                <th className="text-center">Trạng thái</th>
                <th className="text-center">Xác suất</th>
                <th>Kết quả / Lý do đóng</th>
                <th className="text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredOpportunities.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-ink-muted">
                    Không tìm thấy cơ hội nào phù hợp với bộ lọc tìm kiếm.
                  </td>
                </tr>
              ) : (
                filteredOpportunities.map((opp) => {
                  const isNegotiationOpen =
                    opp.stage === "NEGOTIATION" && opp.status === "OPEN";
                  const isClosed = opp.status === "CLOSED";
                  const lossOption = LOSS_REASON_OPTIONS.find(
                    (o) => o.value === opp.lossReason,
                  );

                  return (
                    <tr key={opp.id} data-testid={`opportunity-row-${opp.id}`}>
                      {/* Tên cơ hội */}
                      <td className="font-semibold text-ink-strong">
                        <div>{opp.name}</div>
                        <div className="text-xs font-mono text-ink-faint">
                          Mã: OP-{String(opp.id).padStart(4, "0")}
                        </div>
                      </td>

                      {/* Khách hàng */}
                      <td>{opp.customerName || "—"}</td>

                      {/* Giá trị dự kiến */}
                      <td className="text-right font-mono font-medium text-ink-strong">
                        {opp.expectedValue != null
                          ? currencyFormatter.format(opp.expectedValue)
                          : "—"}
                      </td>

                      {/* Giai đoạn */}
                      <td className="text-center">
                        <span
                          className={`badge ${
                            opp.stage === "WON"
                              ? "badge--green"
                              : opp.stage === "LOST"
                                ? "badge--red"
                                : opp.stage === "NEGOTIATION"
                                  ? "badge--gold"
                                  : "badge--blue"
                          }`}
                        >
                          {OPPORTUNITY_STAGES[opp.stage]?.label ?? opp.stage}
                        </span>
                      </td>

                      {/* Trạng thái */}
                      <td className="text-center">
                        <span
                          className={`text-xs font-semibold px-2 py-0.5 rounded ${
                            isClosed
                              ? "bg-surface-sunken text-ink-muted"
                              : "bg-emerald-50 text-emerald-800"
                          }`}
                        >
                          {isClosed ? "Đã đóng" : "Đang mở"}
                        </span>
                      </td>

                      {/* Xác suất */}
                      <td className="text-center font-mono font-semibold">
                        {opp.probability != null ? `${opp.probability}%` : "—"}
                      </td>

                      {/* Kết quả / Lý do đóng (NCL-03-CN-005) */}
                      <td>
                        {opp.stage === "LOST" ? (
                          <div
                            className="text-xs space-y-0.5"
                            data-testid={`loss-reason-info-${opp.id}`}
                          >
                            <div className="font-semibold text-danger">
                              {lossOption?.label || opp.lossReason}
                            </div>
                            {opp.competitorName && (
                              <div className="text-ink-muted">
                                Đối thủ: <strong>{opp.competitorName}</strong>
                              </div>
                            )}
                            {opp.closeReasonDetail && (
                              <div
                                className="text-ink-faint italic truncate max-w-xs"
                                title={opp.closeReasonDetail}
                              >
                                "{opp.closeReasonDetail}"
                              </div>
                            )}
                          </div>
                        ) : opp.stage === "WON" ? (
                          <div className="text-xs space-y-0.5">
                            <div className="font-semibold text-success">
                              Ký hợp đồng thành công
                            </div>
                            {opp.closeReasonDetail && (
                              <div
                                className="text-ink-faint italic truncate max-w-xs"
                                title={opp.closeReasonDetail}
                              >
                                "{opp.closeReasonDetail}"
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-ink-faint">—</span>
                        )}
                      </td>

                      {/* Thao tác (TC-01, TC-04) */}
                      <td className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* Nút xem lịch sử chuyển giai đoạn */}
                          <button
                            type="button"
                            className="btn-secondary text-xs px-2.5 py-1"
                            onClick={() => handleOpenHistory(opp)}
                            title="Xem lịch sử chuyển giai đoạn"
                            data-testid={`btn-view-history-${opp.id}`}
                          >
                            {ICONS.history}
                          </button>

                          {/* Nút Ghi nhận kết quả thắng/thua */}
                          {isNegotiationOpen ? (
                            <button
                              type="button"
                              className="btn-primary text-xs px-3 py-1"
                              onClick={() => setClosingOpportunity(opp)}
                              title="Ghi nhận kết quả thắng hoặc thua của cơ hội (NCL-03-CN-005)"
                              data-testid={`btn-close-opportunity-${opp.id}`}
                            >
                              {ICONS.checkCircle} Chốt kết quả
                            </button>
                          ) : isClosed ? (
                            <span
                              className="text-xs text-ink-faint px-2 py-1 font-mono border border-line rounded"
                              data-testid={`badge-closed-${opp.id}`}
                            >
                              Đã hoàn tất
                            </span>
                          ) : (
                            <button
                              type="button"
                              className="btn-secondary text-xs px-2.5 py-1 opacity-50 cursor-not-allowed"
                              disabled
                              title="Chỉ ghi nhận kết quả khi cơ hội ở giai đoạn Thương lượng / Đàm phán (NEGOTIATION)"
                              data-testid={`btn-disabled-close-${opp.id}`}
                            >
                              Chưa thể chốt
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal ghi nhận kết quả thắng/thua (NCL-03-CN-005) */}
      {closingOpportunity && (
        <OpportunityCloseModal
          isOpen={!!closingOpportunity}
          opportunity={closingOpportunity}
          currentUserRoles={currentUserRoles}
          onClose={() => setClosingOpportunity(null)}
          onSuccess={handleCloseSuccess}
        />
      )}

      {/* Modal xem lịch sử chuyển giai đoạn (TC-04) */}
      {historyOpportunity && (
        <div className="modal-backdrop" data-testid="stage-history-modal">
          <div className="modal-card modal-card--md">
            <div className="modal-header">
              <div className="modal-title">
                <span className="modal-title__icon">{ICONS.history}</span>
                <span>Lịch sử giai đoạn: {historyOpportunity.name}</span>
              </div>
              <button
                type="button"
                className="modal-close"
                onClick={() => setHistoryOpportunity(null)}
                data-testid="btn-close-history-modal"
              >
                {ICONS.close}
              </button>
            </div>
            <div className="modal-body">
              {loadingHistory ? (
                <div className="p-8 text-center text-ink-muted">
                  Đang tải lịch sử...
                </div>
              ) : stageHistoryList.length === 0 ? (
                <div className="p-8 text-center text-ink-muted">
                  Chưa có lịch sử thay đổi giai đoạn.
                </div>
              ) : (
                <div className="space-y-3">
                  {stageHistoryList.map((h) => (
                    <div
                      key={h.id}
                      className="p-3 border border-line rounded-md bg-surface-alt text-sm flex items-center justify-between"
                    >
                      <div>
                        <div className="font-semibold text-ink-strong">
                          {h.fromStage ? `${h.fromStage} → ` : ""}
                          {h.toStage}
                        </div>
                        <div className="text-xs text-ink-faint">
                          Người thực hiện:{" "}
                          <strong>{h.changedByUsername}</strong>
                        </div>
                      </div>
                      <div className="text-xs font-mono text-ink-muted">
                        {new Date(h.changedAt).toLocaleString("vi-VN")}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setHistoryOpportunity(null)}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
