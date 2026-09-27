import { useState, useMemo, useEffect, useRef } from 'react';
import type { Opportunity, OpportunityStage, QuoteRes } from '../types/opportunityTypes';
import { STAGE_CONFIGS, LOSS_REASON_OPTIONS, ALL_STAGES_ORDER } from '../types/opportunityTypes';
import { fetchOpportunities, OpportunityApiError } from '../api/opportunitiesApi';
import OpportunityFormModal from '../components/OpportunityFormModal';
import StageTransitionControl from '../components/StageTransitionControl';
import QuoteBuilder from '../components/QuoteBuilder';
import OpportunityCloseModal from '../components/OpportunityCloseModal';
import { ICONS } from '../../../components/common/icons';
import PageHeader from '../../../components/common/PageHeader';
import TableSkeleton from '../../../components/common/TableSkeleton';
import RowActionsMenu, { type RowAction } from '../../../components/common/RowActionsMenu';

/** NCL-03-CN-005 — nhãn tiếng Việt cho lý do thua đã lưu của cơ hội. */
function lossReasonLabel(reason?: string | null): string | null {
  if (!reason) return null;
  return LOSS_REASON_OPTIONS.find((o) => o.value === reason)?.label ?? reason;
}

interface OpportunityListPageProps {
  currentUserRoles?: string[];
  currentUserName?: string;
  initialOpportunities?: Opportunity[];
  /** Mở màn "Ghi nhận hoạt động chăm sóc cơ hội" cho đúng cơ hội đang chọn —
   *  trước đây màn đó chỉ vào được bằng cách tự gõ tay mã số cơ hội, không ai
   *  đoán được mã số nếu không tra database. */
  onOpenActivities?: (opportunityId: number, opportunityName: string) => void;
  /** ID cơ hội cần tự động mở lên khi trang vừa tải xong — dùng khi được điều
   *  hướng từ nơi khác (ví dụ bấm một cơ hội "đọng lâu" ở Báo cáo đường ống). */
  focusOpportunityId?: number | null;
  /** Gọi lại sau khi đã xử lý xong focusOpportunityId, để App xoá state đi —
   *  tránh việc quay lại tab này lần sau lại tự động cuộn/chọn lại lần nữa. */
  onFocusConsumed?: () => void;
}

export default function OpportunityListPage({
  currentUserRoles = ['VT-04'],
  initialOpportunities = [],
  onOpenActivities,
  focusOpportunityId = null,
  onFocusConsumed,
}: OpportunityListPageProps) {
  const isAllowed = currentUserRoles.includes('VT-04');

  const [opportunities, setOpportunities] = useState<Opportunity[]>(initialOpportunities);
  const [isLoading, setIsLoading] = useState(initialOpportunities.length === 0);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedOpportunity, setSelectedOpportunity] = useState<Opportunity | null>(null);
  // "Thu gọn thanh tiến trình" trước đây gọi setSelectedOpportunity(null), tức là BỎ CHỌN
  // hẳn cơ hội chứ không chỉ ẩn panel — muốn xem lại phải xuống bảng bấm "Chọn" từ đầu.
  // Tách riêng cờ ẩn/hiện này để thu gọn xong vẫn giữ nguyên cơ hội đang chọn, mở lại được ngay.
  const [isProgressPanelCollapsed, setIsProgressPanelCollapsed] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [stageFilter, setStageFilter] = useState<string>('ALL');

  /** Bảng nằm dưới thấp, panel "Tiến trình bán hàng" nằm tận trên đầu trang —
   *  bấm chọn cơ hội từ bảng mà không cuộn lên thì người dùng không thấy gì
   *  thay đổi. Chọn xong cuộn mượt lên panel để thao tác tiếp luôn. */
  const stageControlRef = useRef<HTMLDivElement | null>(null);
  const selectOpportunityFromRow = (opp: Opportunity) => {
    setSelectedOpportunity((prev) => (prev?.id === opp.id ? prev : opp));
    // Chọn (lại) một cơ hội luôn mở panel ra, kể cả khi đang thu gọn từ lần trước.
    setIsProgressPanelCollapsed(false);
    requestAnimationFrame(() => {
      stageControlRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
    });
  };

  // Báo giá (NCL-03-CN-003): QuoteBuilder tự tải phiên bản mới nhất từ máy chủ khi mở;
  // sessionQuotes chỉ giữ bản vừa lập để nhãn nút hiện đúng số phiên bản ngay lập tức.
  const [quoteTargetOpportunity, setQuoteTargetOpportunity] = useState<Opportunity | null>(null);
  const [sessionQuotes, setSessionQuotes] = useState<Record<number, QuoteRes>>({});

  // Ghi nhận kết quả thắng/thua của cơ hội (NCL-03-CN-005)
  const [closeTargetOpportunity, setCloseTargetOpportunity] = useState<Opportunity | null>(null);
  // Kết quả chọn sẵn khi mở modal ghi nhận kết quả — panel tiến trình bấm "Đóng
  // Thất bại" / "Chốt Thành công" thì mở thẳng đúng lựa chọn đó thay vì luôn mặc định Thua.
  const [closeInitialResult, setCloseInitialResult] = useState<'WON' | 'LOST'>('LOST');

  const openCloseModal = (opp: Opportunity, initialResult: 'WON' | 'LOST' = 'LOST') => {
    setCloseInitialResult(initialResult);
    setCloseTargetOpportunity(opp);
  };

  const [toastMessage, setToastMessage] = useState<{
    text: string;
    type: 'success' | 'error' | 'info';
  } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 5000);
  };

  // Tải danh sách cơ hội từ máy chủ khi mở trang, để cơ hội vừa tạo không biến
  // mất sau khi chuyển sang trang khác rồi quay lại (state trong bộ nhớ bị huỷ
  // khi component unmount). Bỏ qua khi đã được truyền sẵn dữ liệu (test/SSR).
  useEffect(() => {
    if (initialOpportunities.length > 0) return;

    let cancelled = false;
    setIsLoading(true);
    setLoadError(null);

    fetchOpportunities()
      .then((data) => {
        if (!cancelled) setOpportunities(data);
      })
      .catch((err) => {
        if (cancelled) return;
        // 403: tài khoản không có vai trò xem pipeline (VT-04). Trang đã hiển thị
        // sẵn cảnh báo phân quyền màu vàng, nên không cần thêm banner đỏ.
        if (err instanceof OpportunityApiError && err.statusCode === 403) {
          setOpportunities([]);
          return;
        }
        const message =
          err instanceof OpportunityApiError
            ? err.message
            : 'Không tải được danh sách cơ hội bán hàng. Vui lòng thử lại.';
        setLoadError(message);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Được điều hướng tới từ nơi khác kèm một ID cơ hội cụ thể (ví dụ từ Báo cáo
  // đường ống, bấm vào một cơ hội đọng lâu) — chờ danh sách tải xong rồi tự mở
  // đúng cơ hội đó lên, xoá bộ lọc đang áp dụng để chắc chắn hàng đó hiển thị.
  useEffect(() => {
    if (!focusOpportunityId || isLoading) return;
    const target = opportunities.find((o) => o.id === focusOpportunityId);
    if (target) {
      setSearchTerm('');
      setStageFilter('ALL');
      // Không dùng selectOpportunityFromRow ở đây: hàm đó kèm scrollIntoView để
      // kéo trang xuống panel khi người dùng vừa bấm chọn 1 hàng ở giữa trang dài.
      // Còn đây là tự khôi phục lựa chọn ngay sau khi trang MỚI mount lại (quay lại
      // từ Ghi nhận chăm sóc / nhảy từ Báo cáo đường ống) — panel vốn đã nằm ngay
      // đầu trang, cuộn thêm chỉ đẩy khuất tiêu đề trang lên trên, không cần thiết.
      setSelectedOpportunity(target);
      setIsProgressPanelCollapsed(false);
    }
    onFocusConsumed?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusOpportunityId, isLoading, opportunities]);

  const handleCreatedSuccess = (newOpportunity: Opportunity) => {
    setOpportunities((prev) => [newOpportunity, ...prev]);
    setSelectedOpportunity(newOpportunity);
    setIsProgressPanelCollapsed(false);
    showToast(`Tạo cơ hội bán hàng "${newOpportunity.name}" thành công!`, 'success');
  };

  const handleOpportunityUpdated = (updated: Opportunity) => {
    setOpportunities((prev) =>
      prev.map((o) => (o.id === updated.id ? updated : o))
    );
    setSelectedOpportunity(updated);
    setIsProgressPanelCollapsed(false);
    showToast(`Đã cập nhật giai đoạn cho "${updated.name}" thành công!`, 'success');
  };

  const handleQuoteCreated = (quote: QuoteRes) => {
    setSessionQuotes((prev) => ({ ...prev, [quote.opportunityId]: quote }));
    showToast(`Lập báo giá phiên bản #${quote.version} thành công!`, 'success');
  };

  const handleOpportunityClosed = (updated: Opportunity) => {
    setOpportunities((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
    // Ghi kết quả thắng/thua thường bấm thẳng từ hàng trong bảng, không cần chọn
    // trước — nhưng lý do thua (nếu có) chỉ hiện ở panel phía trên, nên sau khi
    // chốt xong phải TỰ mở panel đó lên để người dùng thấy ngay kết quả, không
    // phải tự bấm chọn lại cơ hội vừa xử lý xong.
    // Không dùng selectOpportunityFromRow ở đây: nó giữ nguyên object cũ khi id
    // trùng với cơ hội đang chọn sẵn (tối ưu tránh re-render khi click lại cùng
    // hàng), nhưng cơ hội đang chọn CHÍNH LÀ cơ hội vừa chốt nên object mới luôn
    // phải thắng, nếu không panel vẫn hiển thị giai đoạn Đàm phán cũ dù đã Won/Lost.
    setSelectedOpportunity(updated);
    setIsProgressPanelCollapsed(false);
    requestAnimationFrame(() => {
      stageControlRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
    });
    const outcome = updated.stage === 'WON' ? 'Thắng' : 'Thua';
    showToast(`Đã ghi nhận kết quả ${outcome} cho "${updated.name}".`, 'success');
  };

  const filteredOpportunities = useMemo(() => {
    return opportunities.filter((o) => {
      const matchSearch =
        !searchTerm.trim() ||
        o.name.toLowerCase().includes(searchTerm.toLowerCase().trim()) ||
        (o.customerName && o.customerName.toLowerCase().includes(searchTerm.toLowerCase().trim()));

      const matchStage = stageFilter === 'ALL' || o.stage === stageFilter;

      return matchSearch && matchStage;
    });
  }, [opportunities, searchTerm, stageFilter]);

  // Thống kê số liệu
  const totalExpectedValue = useMemo(() => {
    return opportunities.reduce((acc, o) => acc + (o.expectedValue || 0), 0);
  }, [opportunities]);

  // QTN-07: dự báo theo xác suất chỉ cộng các cơ hội còn mở — cơ hội đã thắng/thua
  // không còn là "dự báo" (trước đây cộng cả WON 100% làm số dự báo bị thổi phồng).
  const weightedForecastValue = useMemo(() => {
    return opportunities.filter((o) => o.status === 'OPEN').reduce((acc, o) => {
      const prob = o.probability || 0;
      return acc + (o.expectedValue || 0) * (prob / 100);
    }, 0);
  }, [opportunities]);

  const formatCurrency = (amount: number): string => {
    return `${new Intl.NumberFormat('vi-VN').format(amount)} đ`;
  };

  const formatDate = (dateStr?: string | null): string => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      return isNaN(d.getTime()) ? dateStr : d.toLocaleDateString('vi-VN');
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="user-management-page">
      {/* Toast thông báo */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: 'fixed',
            top: '20px',
            right: '24px',
            zIndex: 1050,
            padding: '12px 20px',
            background: toastMessage.type === 'success' ? 'var(--pale-green-bg)' : 'var(--pale-red-bg)',
            color: toastMessage.type === 'success' ? 'var(--pale-green-fg)' : 'var(--pale-red-fg)',
            border: `1px solid ${toastMessage.type === 'success' ? 'rgba(52, 101, 56, 0.25)' : 'rgba(159, 47, 45, 0.25)'}`,
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-md)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '14px',
            fontWeight: 500,
            animation: 'fadeIn 0.2s var(--ease-out)',
          }}
        >
          <span>{toastMessage.type === 'success' ? ICONS.checkCircle : ICONS.alertTriangle}</span>
          <span>{toastMessage.text}</span>
        </div>
      )}

      <PageHeader
        title="Cơ hội"
        actions={
          isAllowed ? (
            <button type="button" className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
              <span className="icon-sm">{ICONS.plus}</span>
              <span>Tạo cơ hội</span>
            </button>
          ) : (
            <span
              className="view-only-pill"
              title="Chỉ Nhân viên kinh doanh được tạo cơ hội và chuyển giai đoạn"
              data-testid="opportunity-view-only"
            >
              {ICONS.eye} Chỉ xem
            </span>
          )
        }
      />

      {/* Điểm neo cuộn tới khi chọn cơ hội từ bảng phía dưới — luôn render (kể cả
          khi chưa có cơ hội nào được chọn) để ref sẵn sàng ngay từ cú click đầu tiên. */}
      <div ref={stageControlRef} />

      {/* Bộ điều khiển chuyển giai đoạn cho cơ hội đang chọn (NCL-03-CN-002) */}
      {selectedOpportunity && (
        <div>
          <div
            className="opp-stage-bar"
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '10px',
              marginBottom: '14px',
            }}
          >
            <span style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--ink-soft)' }}>
              Đang điều khiển: <strong style={{ color: 'var(--ink-strong)' }}>{selectedOpportunity.name}</strong>
              {selectedOpportunity.customerName && ` (${selectedOpportunity.customerName})`}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {onOpenActivities && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => onOpenActivities(selectedOpportunity.id, selectedOpportunity.name)}
                >
                  <span className="icon-sm">{ICONS.clock}</span>
                  <span>Ghi nhận chăm sóc</span>
                </button>
              )}
              {isAllowed && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setQuoteTargetOpportunity(selectedOpportunity)}
                >
                  <span className="icon-sm">{ICONS.receipt}</span>
                  <span>
                    {sessionQuotes[selectedOpportunity.id]
                      ? `Xem báo giá (v${sessionQuotes[selectedOpportunity.id].version})`
                      : 'Báo giá'}
                  </span>
                </button>
              )}
              {/* Chi la mot dieu khien HIEN THI (thu/mo panel), khong phai hanh dong
                  nghiep vu — tach rieng bang duong ke doc va dung nut icon nhat de
                  khong canh tranh trong luong voi hai nut hanh dong that o tren. */}
              <span aria-hidden="true" style={{ width: '1px', height: '22px', background: 'var(--line)' }} />
              <button
                type="button"
                className="icon-btn"
                onClick={() => setIsProgressPanelCollapsed((v) => !v)}
                aria-label={isProgressPanelCollapsed ? 'Mở rộng thanh tiến trình' : 'Thu gọn thanh tiến trình'}
                title={isProgressPanelCollapsed ? 'Mở rộng thanh tiến trình' : 'Thu gọn thanh tiến trình'}
                aria-expanded={!isProgressPanelCollapsed}
              >
                <span
                  style={{
                    display: 'inline-flex',
                    transform: isProgressPanelCollapsed ? 'rotate(-90deg)' : 'none',
                    transition: 'transform var(--dur-base) var(--ease-out)',
                  }}
                >
                  {ICONS.chevronDown}
                </span>
              </button>
            </div>
          </div>
          {!isProgressPanelCollapsed && (
            <StageTransitionControl
              opportunity={selectedOpportunity}
              onOpportunityUpdated={handleOpportunityUpdated}
              currentUserRoles={currentUserRoles}
              onRequestClose={(result) => openCloseModal(selectedOpportunity, result)}
            />
          )}
        </div>
      )}

      {/* Lỗi tải danh sách cơ hội từ máy chủ */}
      {loadError && (
        <div
          role="alert"
          style={{
            marginBottom: '16px',
            padding: '12px 16px',
            background: 'var(--pale-red-bg)',
            color: 'var(--pale-red-fg)',
            border: '1px solid rgba(159, 47, 45, 0.25)',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '13.5px',
          }}
        >
          <span style={{ flexShrink: 0 }}>{ICONS.alertTriangle}</span>
          <span>{loadError}</span>
        </div>
      )}

      {/* Danh sách gọn cùng mẫu với Khách hàng / Hợp đồng: mỗi hàng một dòng, bấm cả hàng để mở tiến trình
          bán hàng ở khung phía trên; các thao tác phụ (ghi nhận kết quả, chăm sóc, báo giá) vào menu ⋮ — khung
          tiến trình cũng có sẵn các nút này. Hàng ô đếm số đầu trang đã bỏ; tổng giá trị nằm ở chân bảng. */}
      <div className="user-table-card">
        <div className="user-table-toolbar">
          <div className="search-box">
            <svg className="search-box__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <input
              type="text"
              className="search-box__input"
              placeholder="Tìm cơ hội, khách hàng"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              aria-label="Tìm cơ hội"
            />
            {searchTerm && (
              <button type="button" className="search-box__clear" onClick={() => setSearchTerm('')} aria-label="Xóa tìm kiếm">
                {ICONS.close}
              </button>
            )}
          </div>
          <div className="toolbar-filters">
            <div className="filter-group">
              <span className="filter-label">Giai đoạn:</span>
              <select
                className="filter-select"
                value={stageFilter}
                onChange={(e) => setStageFilter(e.target.value)}
                aria-label="Lọc theo giai đoạn"
              >
                <option value="ALL">Tất cả giai đoạn</option>
                {ALL_STAGES_ORDER.map((stage) => (
                  <option key={stage} value={stage}>
                    {STAGE_CONFIGS[stage].shortLabel}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="table-responsive">
          <table className="user-data-table list-table" data-testid="opportunity-table">
            <thead>
              <tr>
                <th style={{ width: '32%' }}>Cơ hội</th>
                <th style={{ width: '23%' }}>Khách hàng</th>
                <th className="list-table__num" style={{ width: '17%' }}>Giá trị dự kiến</th>
                <th style={{ width: '22%' }}>Giai đoạn</th>
                <th className="list-table__actions">
                  <span className="visually-hidden">Thao tác</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <TableSkeleton columns={5} rows={4} />
              ) : filteredOpportunities.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '40px', color: 'var(--ink-muted)', whiteSpace: 'normal' }}>
                    {searchTerm || stageFilter !== 'ALL' ? (
                      'Không có cơ hội khớp bộ lọc.'
                    ) : (
                      <>
                        Chưa có cơ hội nào.
                        {isAllowed && (
                          <>
                            {' '}
                            <button type="button" className="btn-link" onClick={() => setIsModalOpen(true)}>
                              Tạo cơ hội đầu tiên
                            </button>
                          </>
                        )}
                      </>
                    )}
                  </td>
                </tr>
              ) : (
                filteredOpportunities.map((opp) => {
                  const stageConfig = STAGE_CONFIGS[opp.stage as OpportunityStage];
                  const isSelected = selectedOpportunity?.id === opp.id;
                  const isClosed = opp.status === 'CLOSED';
                  const lossNote =
                    opp.stage === 'LOST' && (opp.lossReason || opp.competitorName)
                      ? `${lossReasonLabel(opp.lossReason) ?? ''}${opp.competitorName ? ` · Đối thủ: ${opp.competitorName}` : ''}`
                      : undefined;
                  const actions: RowAction[] = [
                    {
                      key: 'progress',
                      label: 'Xem tiến trình',
                      icon: ICONS.target,
                      onClick: () => selectOpportunityFromRow(opp),
                    },
                  ];
                  if (!isClosed && isAllowed) {
                    // QTN-06: mọi cơ hội đang mở đều ghi nhận được kết quả — Thua ở bất kỳ giai đoạn nào,
                    // Thắng chỉ khi đang Đàm phán (modal tự khóa lựa chọn Thắng).
                    actions.push({
                      key: 'result',
                      label: 'Ghi nhận kết quả',
                      icon: ICONS.checkCircle,
                      onClick: () => openCloseModal(opp),
                      testId: `btn-close-opportunity-${opp.id}`,
                    });
                  }
                  if (onOpenActivities) {
                    actions.push({
                      key: 'activities',
                      label: 'Ghi nhận chăm sóc',
                      icon: ICONS.clock,
                      onClick: () => onOpenActivities(opp.id, opp.name),
                    });
                  }
                  if (isAllowed) {
                    actions.push({
                      key: 'quote',
                      label: sessionQuotes[opp.id] ? `Xem báo giá (v${sessionQuotes[opp.id].version})` : 'Báo giá',
                      icon: ICONS.receipt,
                      onClick: () => setQuoteTargetOpportunity(opp),
                    });
                  }

                  return (
                    <tr
                      key={opp.id}
                      className={`list-table__row ${isSelected ? 'list-table__row--selected' : ''}`}
                      onClick={() => (isSelected ? setSelectedOpportunity(null) : selectOpportunityFromRow(opp))}
                      aria-selected={isSelected}
                      data-testid={`opp-row-${opp.id}`}
                    >
                      <td>
                        <div className="user-profile-meta">
                          <button
                            type="button"
                            className="list-table__title"
                            onClick={(e) => {
                              e.stopPropagation();
                              selectOpportunityFromRow(opp);
                            }}
                            title={opp.name}
                          >
                            {opp.name}
                          </button>
                          <span className="list-table__sub list-table__sub--text">
                            Dự kiến chốt {formatDate(opp.expectedCloseDate)}
                          </span>
                        </div>
                      </td>
                      <td>
                        <span className="list-table__clip" title={opp.customerName || undefined}>
                          {opp.customerName || `Khách hàng #${opp.customerId}`}
                        </span>
                      </td>
                      <td className="list-table__num">{formatCurrency(opp.expectedValue)}</td>
                      <td>
                        {opp.stage === 'WON' ? (
                          <span className="list-status list-status--on" data-testid={`badge-closed-${opp.id}`}>
                            Thành công
                          </span>
                        ) : opp.stage === 'LOST' ? (
                          <span className="list-status list-status--off" data-testid={`badge-closed-${opp.id}`} title={lossNote}>
                            Thất bại
                          </span>
                        ) : (
                          // Xác suất cố định theo giai đoạn — gộp vào cùng một nhãn.
                          <span className="opp-stage">
                            {stageConfig?.shortLabel ?? opp.stage}
                            <span className="opp-stage__prob">{opp.probability}%</span>
                          </span>
                        )}
                      </td>
                      <td className="list-table__actions" onClick={(e) => e.stopPropagation()}>
                        <RowActionsMenu ariaLabel={`Thao tác với ${opp.name}`} actions={actions} />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="table-footer opp-footer">
          <span>
            Hiển thị <strong>{filteredOpportunities.length}</strong> / <strong>{opportunities.length}</strong> cơ hội
          </span>
          {opportunities.length > 0 && (
            <span className="opp-footer__sum">
              Tổng giá trị dự kiến <strong>{formatCurrency(totalExpectedValue)}</strong>
              <span aria-hidden="true"> · </span>
              Dự báo theo xác suất <strong>{formatCurrency(weightedForecastValue)}</strong>
            </span>
          )}
        </div>
      </div>

      {/* Modal tạo cơ hội */}
      <OpportunityFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleCreatedSuccess}
      />

      {/* Modal ghi nhận kết quả thắng/thua (NCL-03-CN-005) */}
      <OpportunityCloseModal
        isOpen={Boolean(closeTargetOpportunity)}
        opportunity={closeTargetOpportunity}
        currentUserRoles={currentUserRoles}
        initialResult={closeInitialResult}
        onClose={() => setCloseTargetOpportunity(null)}
        onSuccess={handleOpportunityClosed}
      />

      {/* Modal lập báo giá cho cơ hội (NCL-03-CN-003) */}
      {quoteTargetOpportunity && (
        <QuoteBuilder
          opportunity={quoteTargetOpportunity}
          isOpen={Boolean(quoteTargetOpportunity)}
          onClose={() => setQuoteTargetOpportunity(null)}
          onQuoteCreated={handleQuoteCreated}
          currentUserRoles={currentUserRoles}
          initialQuote={sessionQuotes[quoteTargetOpportunity.id] ?? null}
        />
      )}
    </div>
  );
}
