import { useState, useMemo, useEffect, useRef, useCallback, useDeferredValue, memo } from 'react';
import type { Opportunity, OpportunityStage, QuoteRes } from '../types/opportunityTypes';
import { STAGE_CONFIGS, LOSS_REASON_OPTIONS } from '../types/opportunityTypes';
import { fetchOpportunities, OpportunityApiError } from '../api/opportunitiesApi';
import OpportunityFormModal from '../components/OpportunityFormModal';
import StageTransitionControl from '../components/StageTransitionControl';
import QuoteBuilder from '../components/QuoteBuilder';
import OpportunityCloseModal from '../components/OpportunityCloseModal';
import { ICONS } from '../../../components/common/icons';
import TableSkeleton from '../../../components/common/TableSkeleton';

/** NCL-03-CN-005 — nhãn tiếng Việt cho lý do thua đã lưu của cơ hội. */
function lossReasonLabel(reason?: string | null): string | null {
  if (!reason) return null;
  return LOSS_REASON_OPTIONS.find((o) => o.value === reason)?.label ?? reason;
}

/** Dựng Intl.NumberFormat một lần cho cả module — trước đây mỗi ô tiền của mỗi
 *  hàng dựng lại một formatter mới ở mỗi lần render (khá tốn với bảng dài). */
const CURRENCY_FORMAT = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' });
const formatCurrency = (amount: number): string => CURRENCY_FORMAT.format(amount);

const formatDate = (dateStr?: string | null): string => {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? dateStr : d.toLocaleDateString('vi-VN');
  } catch {
    return dateStr;
  }
};

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
  /** Tăng lên mỗi lần bấm "Thử lại" để effect tải danh sách chạy lại. */
  const [reloadKey, setReloadKey] = useState(0);
  const [selectedOpportunity, setSelectedOpportunity] = useState<Opportunity | null>(null);
  // "Thu gọn thanh tiến trình" trước đây gọi setSelectedOpportunity(null), tức là BỎ CHỌN
  // hẳn cơ hội chứ không chỉ ẩn panel — muốn xem lại phải xuống bảng bấm "Chọn" từ đầu.
  // Tách riêng cờ ẩn/hiện này để thu gọn xong vẫn giữ nguyên cơ hội đang chọn, mở lại được ngay.
  const [isProgressPanelCollapsed, setIsProgressPanelCollapsed] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [stageFilter, setStageFilter] = useState<string>('ALL');
  // Lọc cục bộ trên danh sách đã tải: để React ưu tiên cập nhật ô nhập trước, lọc bảng sau
  // (gõ nhanh trên máy yếu/điện thoại không bị khựng khi danh sách dài).
  const deferredSearchTerm = useDeferredValue(searchTerm);

  /** Bảng nằm dưới thấp, panel "Tiến trình bán hàng" nằm tận trên đầu trang —
   *  bấm chọn cơ hội từ bảng mà không cuộn lên thì người dùng không thấy gì
   *  thay đổi. Chọn xong cuộn mượt lên panel để thao tác tiếp luôn. */
  const stageControlRef = useRef<HTMLDivElement | null>(null);
  const selectOpportunityFromRow = useCallback((opp: Opportunity) => {
    setSelectedOpportunity((prev) => (prev?.id === opp.id ? prev : opp));
    // Chọn (lại) một cơ hội luôn mở panel ra, kể cả khi đang thu gọn từ lần trước.
    setIsProgressPanelCollapsed(false);
    requestAnimationFrame(() => {
      stageControlRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
    });
  }, []);
  const deselectOpportunity = useCallback(() => setSelectedOpportunity(null), []);

  // Lập báo giá cho cơ hội (NCL-03-CN-003) — chưa có API GET nên lưu tạm theo phiên
  const [quoteTargetOpportunity, setQuoteTargetOpportunity] = useState<Opportunity | null>(null);
  const [sessionQuotes, setSessionQuotes] = useState<Record<number, QuoteRes>>({});

  // Ghi nhận kết quả thắng/thua của cơ hội (NCL-03-CN-005)
  const [closeTargetOpportunity, setCloseTargetOpportunity] = useState<Opportunity | null>(null);
  // Kết quả chọn sẵn khi mở modal ghi nhận kết quả — panel tiến trình bấm "Đóng
  // Thất bại" / "Chốt Thành công" thì mở thẳng đúng lựa chọn đó thay vì luôn mặc định Thua.
  const [closeInitialResult, setCloseInitialResult] = useState<'WON' | 'LOST'>('LOST');

  const openCloseModal = useCallback((opp: Opportunity, initialResult: 'WON' | 'LOST' = 'LOST') => {
    setCloseInitialResult(initialResult);
    setCloseTargetOpportunity(opp);
  }, []);

  const [toastMessage, setToastMessage] = useState<{
    text: string;
    type: 'success' | 'error' | 'info';
  } | null>(null);

  // Giữ id bộ hẹn giờ của toast: toast mới phải huỷ hẹn giờ cũ, nếu không toast
  // thứ hai bị toast thứ nhất "đóng hộ" sớm; và huỷ khi rời trang để không set state sau unmount.
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
  }, []);

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToastMessage({ text, type });
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 5000);
  };

  // Tải danh sách cơ hội từ máy chủ khi mở trang, để cơ hội vừa tạo không biến
  // mất sau khi chuyển sang trang khác rồi quay lại (state trong bộ nhớ bị huỷ
  // khi component unmount). Bỏ qua khi đã được truyền sẵn dữ liệu (test/SSR).
  useEffect(() => {
    if (initialOpportunities.length > 0 && reloadKey === 0) return;

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
  }, [reloadKey]);

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
    // Chuẩn hoá từ khoá MỘT lần thay vì lặp lại toLowerCase().trim() cho từng hàng.
    const term = deferredSearchTerm.toLowerCase().trim();
    return opportunities.filter((o) => {
      const matchSearch =
        !term ||
        o.name.toLowerCase().includes(term) ||
        (o.customerName && o.customerName.toLowerCase().includes(term));

      const matchStage = stageFilter === 'ALL' || o.stage === stageFilter;

      return matchSearch && matchStage;
    });
  }, [opportunities, deferredSearchTerm, stageFilter]);

  // Thống kê số liệu — gộp 3 vòng lặp thành một lượt duyệt.
  const { totalExpectedValue, weightedForecastValue, wonCount } = useMemo(() => {
    let total = 0;
    let weighted = 0;
    let won = 0;
    for (const o of opportunities) {
      const value = o.expectedValue || 0;
      total += value;
      weighted += value * ((o.probability || 0) / 100);
      if (o.stage === 'WON') won += 1;
    }
    return { totalExpectedValue: total, weightedForecastValue: weighted, wonCount: won };
  }, [opportunities]);

  const hasActiveFilter = Boolean(searchTerm) || stageFilter !== 'ALL';

  return (
    <div className="page-container sl-page">
      {/* Toast thông báo */}
      {toastMessage && (
        <div role="status" aria-live="polite" className={`sl-toast sl-toast--${toastMessage.type}`}>
          <span aria-hidden="true">{toastMessage.type === 'success' ? ICONS.checkCircle : ICONS.alertTriangle}</span>
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Header trang */}
      <div className="sl-header">
        <div className="sl-header__main">
          <h2 className="sl-title">Quản lý cơ hội bán hàng & Phễu chuyển đổi</h2>
          <p className="sl-subtitle">
            Theo dõi tiến trình bán hàng, chuyển giai đoạn tuần tự và dự báo doanh số theo xác suất.
          </p>
        </div>

        <div className="sl-header__actions">
          {isAllowed ? (
            <button type="button" className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
              <span className="icon-sm">{ICONS.plus}</span>
              <span>Tạo cơ hội mới</span>
            </button>
          ) : (
            <div className="sl-lock-chip">
              <span aria-hidden="true">{ICONS.lock}</span>
              <span>Yêu cầu vai trò Nhân viên kinh doanh</span>
            </div>
          )}
        </div>
      </div>

      {/* Cảnh báo nếu không có quyền VT-04 */}
      {!isAllowed && (
        <div className="sl-banner sl-banner--warning" role="note">
          <span className="sl-banner__icon" aria-hidden="true">{ICONS.alertTriangle}</span>
          <div className="sl-banner__body">
            <strong>Chế độ chỉ xem:</strong>
            <p>
              Tài khoản của bạn không có vai trò <strong>Nhân viên kinh doanh</strong> nên
              chỉ theo dõi được đường ống bán hàng, không tạo cơ hội hoặc chuyển giai đoạn. Các thao tác này
              chỉ dành cho nhân viên kinh doanh.
            </p>
          </div>
        </div>
      )}

      {/* Điểm neo cuộn tới khi chọn cơ hội từ bảng phía dưới — luôn render (kể cả
          khi chưa có cơ hội nào được chọn) để ref sẵn sàng ngay từ cú click đầu tiên. */}
      <div ref={stageControlRef} />

      {/* Bộ điều khiển chuyển giai đoạn cho cơ hội đang chọn (NCL-03-CN-002) */}
      {selectedOpportunity && (
        <div>
          <div className="opp-stage-bar sl-opp-stagebar">
            <span className="sl-opp-stagebar__label">
              Đang điều khiển: <strong>{selectedOpportunity.name}</strong>
              {selectedOpportunity.customerName && ` (${selectedOpportunity.customerName})`}
            </span>
            <div className="sl-opp-stagebar__actions">
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
                      : 'Lập báo giá'}
                  </span>
                </button>
              )}
              {/* Chi la mot dieu khien HIEN THI (thu/mo panel), khong phai hanh dong
                  nghiep vu — tach rieng bang duong ke doc va dung nut icon nhat de
                  khong canh tranh trong luong voi hai nut hanh dong that o tren. */}
              <span aria-hidden="true" className="sl-vrule" />
              <button
                type="button"
                className="icon-btn"
                onClick={() => setIsProgressPanelCollapsed((v) => !v)}
                aria-label={isProgressPanelCollapsed ? 'Mở rộng thanh tiến trình' : 'Thu gọn thanh tiến trình'}
                title={isProgressPanelCollapsed ? 'Mở rộng thanh tiến trình' : 'Thu gọn thanh tiến trình'}
                aria-expanded={!isProgressPanelCollapsed}
              >
                <span className={`sl-chevron${isProgressPanelCollapsed ? ' sl-chevron--collapsed' : ''}`}>
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

      {/* Lỗi tải danh sách cơ hội từ máy chủ — kèm nút thử lại */}
      {loadError && (
        <div role="alert" className="sl-banner sl-banner--error">
          <span className="sl-banner__icon" aria-hidden="true">{ICONS.alertTriangle}</span>
          <span className="sl-banner__body">{loadError}</span>
          <span className="sl-banner__action">
            <button
              type="button"
              className="btn btn-secondary sl-btn-sm"
              onClick={() => setReloadKey((k) => k + 1)}
              disabled={isLoading}
            >
              <span className="icon-sm">{ICONS.refresh}</span>
              <span>Thử lại</span>
            </button>
          </span>
        </div>
      )}

      {/* Bảng chỉ số thống kê phân khoang chuẩn DESIGN.md */}
      <div className="stats-grid sl-stats">
        <div className="sl-stat">
          <div className="sl-stat__label">Tổng số cơ hội</div>
          <div className="sl-stat__value">{isLoading ? '—' : opportunities.length}</div>
        </div>
        <div className="sl-stat">
          <div className="sl-stat__label">Chốt thành công (WON)</div>
          <div className="sl-stat__value sl-stat__value--success">{isLoading ? '—' : wonCount}</div>
        </div>
        <div className="sl-stat">
          <div className="sl-stat__label">Tổng giá trị dự kiến</div>
          <div className="sl-stat__value sl-stat__value--sm">{formatCurrency(totalExpectedValue)}</div>
        </div>
        <div className="sl-stat">
          <div className="sl-stat__label">Dự báo theo xác suất (Weighted)</div>
          <div className="sl-stat__value sl-stat__value--sm sl-stat__value--info">
            {formatCurrency(weightedForecastValue)}
          </div>
        </div>
      </div>

      {/* Thanh bộ lọc & Tìm kiếm */}
      <div className="sl-toolbar">
        <div className="sl-toolbar__filters">
          <div className="sl-search">
            <span className="sl-search__icon" aria-hidden="true">{ICONS.search}</span>
            <input
              type="search"
              className="form-input"
              placeholder="Tìm theo tên cơ hội hoặc khách hàng..."
              aria-label="Tìm theo tên cơ hội hoặc khách hàng"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <select
            className="form-select"
            aria-label="Lọc theo giai đoạn"
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value)}
          >
            <option value="ALL">Tất cả giai đoạn</option>
            <option value="APPROACH">Tiếp cận (10%)</option>
            <option value="PROPOSAL">Đề xuất (40%)</option>
            <option value="NEGOTIATION">Đàm phán (70%)</option>
            <option value="WON">Chốt thành công (100%)</option>
            <option value="LOST">Đóng thất bại (0%)</option>
          </select>
        </div>

        <div className="sl-toolbar__count" aria-live="polite">
          Hiển thị <strong>{filteredOpportunities.length}</strong> cơ hội
        </div>
      </div>

      {/* Bảng danh sách cơ hội — dưới 640px mỗi hàng thành một thẻ xếp chồng */}
      <div className="sl-table-card">
        <div className="sl-table-scroll">
          {/* table-layout auto trước đây khiến cột "Tên cơ hội" bị bóp hẹp bất cứ khi
              nào cột "Thao tác" có dòng lý do thua dài. Cố định % mỗi cột qua colgroup
              để chiều rộng luôn nhất quán bất kể nội dung dài ngắn ra sao. */}
          <table className="sl-table sl-table--fixed sl-table--stack">
            <colgroup>
              <col style={{ width: '26%' }} />
              <col style={{ width: '16%' }} />
              <col style={{ width: '14%' }} />
              <col style={{ width: '18%' }} />
              <col style={{ width: '26%' }} />
            </colgroup>
            <thead>
              <tr>
                <th scope="col">Tên cơ hội</th>
                <th scope="col">Khách hàng</th>
                <th scope="col" className="sl-num">Giá trị dự kiến</th>
                <th scope="col">Giai đoạn hiện tại</th>
                <th scope="col" className="sl-num">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <TableSkeleton columns={5} rows={6} />
              ) : filteredOpportunities.length === 0 ? (
                <tr>
                  <td colSpan={5} className="sl-td-empty">
                    <div className="sl-empty">
                      <div className="sl-empty__icon" aria-hidden="true">{ICONS.target}</div>
                      <h4 className="sl-empty__title">
                        {hasActiveFilter ? 'Không tìm thấy cơ hội phù hợp' : 'Chưa có cơ hội bán hàng nào'}
                      </h4>
                      <p className="sl-empty__text">
                        {hasActiveFilter
                          ? 'Thử thay đổi từ khóa hoặc bộ lọc giai đoạn để hiển thị kết quả.'
                          : 'Bắt đầu quy trình kinh doanh bằng cách tạo cơ hội mới gắn liền với hồ sơ khách hàng.'}
                      </p>
                      {hasActiveFilter ? (
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() => {
                            setSearchTerm('');
                            setStageFilter('ALL');
                          }}
                        >
                          <span>Xoá bộ lọc</span>
                        </button>
                      ) : (
                        isAllowed && (
                          <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(true)}>
                            <span className="icon-sm">{ICONS.plus}</span>
                            <span>Tạo cơ hội đầu tiên</span>
                          </button>
                        )
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredOpportunities.map((opp) => (
                  <OpportunityRow
                    key={opp.id}
                    opp={opp}
                    isSelected={selectedOpportunity?.id === opp.id}
                    isAllowed={isAllowed}
                    onSelect={selectOpportunityFromRow}
                    onDeselect={deselectOpportunity}
                    onRequestClose={openCloseModal}
                  />
                ))
              )}
            </tbody>
          </table>
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

interface OpportunityRowProps {
  opp: Opportunity;
  isSelected: boolean;
  isAllowed: boolean;
  onSelect: (opp: Opportunity) => void;
  onDeselect: () => void;
  onRequestClose: (opp: Opportunity) => void;
}

/** Một hàng của bảng cơ hội. memo + callback ổn định từ trang cha: gõ tìm kiếm,
 *  đổi toast hay chọn một cơ hội khác chỉ render lại đúng các hàng đổi props. */
const OpportunityRow = memo(function OpportunityRow({
  opp,
  isSelected,
  isAllowed,
  onSelect,
  onDeselect,
  onRequestClose,
}: OpportunityRowProps) {
  const stageConfig = STAGE_CONFIGS[opp.stage as OpportunityStage];
  const isClosed = opp.status === 'CLOSED';
  const stageTone = opp.stage === 'WON' ? ' sl-stage-pill--won' : opp.stage === 'LOST' ? ' sl-stage-pill--lost' : '';

  return (
    <tr className={isSelected ? 'is-selected' : undefined}>
      <td>
        <button
          type="button"
          className="sl-row-link"
          onClick={() => onSelect(opp)}
          title="Xem tiến trình bán hàng của cơ hội này"
        >
          <div className="sl-row-link__title">{opp.name}</div>
          <div className="sl-cell-sub">Dự kiến: {formatDate(opp.expectedCloseDate)}</div>
        </button>
      </td>
      <td data-label="Khách hàng">
        <button
          type="button"
          className="sl-row-link sl-row-link--inline"
          onClick={() => onSelect(opp)}
          title="Xem tiến trình bán hàng của cơ hội này"
        >
          {opp.customerName || `Khách hàng #${opp.customerId}`}
        </button>
      </td>
      <td data-label="Giá trị dự kiến" className="sl-num sl-money">
        {formatCurrency(opp.expectedValue)}
      </td>
      <td data-label="Giai đoạn">
        {/* Xác suất luôn cố định theo giai đoạn (10/40/70/100/0%), không cần
            tách thành một cột riêng — gộp chung vào cùng một nhãn cho gọn. */}
        <span className={`sl-stage-pill${stageTone}`}>
          <span className="sl-stage-pill__dot" aria-hidden="true" />
          {stageConfig?.shortLabel ?? opp.stage}
          <span className="sl-stage-pill__prob">{opp.probability}%</span>
        </span>
        {/* "Còn bao nhiêu ngày ở giai đoạn" và "lý do thua" đã chuyển lên
            panel "Tiến trình bán hàng & Xác suất thành công" phía trên —
            chỉ hiện cho ĐÚNG MỘT cơ hội đang chọn. Xem StageTransitionControl.tsx. */}
      </td>
      <td className="sl-num">
        <div className="sl-cell-actions">
          {isClosed ? (
            // Lý do thua có thể rất dài (kèm tên đối thủ) — chỉ hiện nhãn gọn và
            // đưa chi tiết vào title tooltip; đầy đủ ở panel khi chọn cơ hội.
            <span
              data-testid={`badge-closed-${opp.id}`}
              className="sl-muted-tag"
              title={
                opp.stage === 'LOST' && (opp.lossReason || opp.competitorName)
                  ? `${lossReasonLabel(opp.lossReason) ?? ''}${
                      opp.competitorName ? ` · Đối thủ: ${opp.competitorName}` : ''
                    }`
                  : undefined
              }
            >
              Đã hoàn tất
            </span>
          ) : (
            isAllowed &&
            (opp.stage === 'NEGOTIATION' ? (
              <button
                type="button"
                className="btn btn-secondary sl-btn-sm"
                onClick={() => onRequestClose(opp)}
                data-testid={`btn-close-opportunity-${opp.id}`}
              >
                Ghi nhận kết quả
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-secondary sl-btn-sm"
                disabled
                data-testid={`btn-disabled-close-${opp.id}`}
                title="Cơ hội phải ở giai đoạn Đàm phán mới ghi nhận được kết quả thắng/thua"
              >
                Chưa thể chốt
              </button>
            ))
          )}
          <button
            type="button"
            className={`btn ${isSelected ? 'btn-primary' : 'btn-secondary'} sl-btn-sm`}
            aria-pressed={isSelected}
            onClick={() => (isSelected ? onDeselect() : onSelect(opp))}
          >
            {/* Nút này chỉ chọn hàng để mở panel tiến trình phía trên, không tự
                chuyển giai đoạn — nhãn "Chuyển giai đoạn" gây hiểu nhầm nên luôn
                dùng "Chọn". Chọn phải đi qua onSelect (selectOpportunityFromRow) để
                mở lại panel nếu đang bị thu gọn từ lần trước. */}
            {isSelected ? 'Đang chọn' : 'Chọn'}
          </button>
        </div>
      </td>
    </tr>
  );
});
