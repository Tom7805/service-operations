import { useState, useMemo, useEffect, useRef } from 'react';
import type { CSSProperties } from 'react';
import type { Opportunity, OpportunityStage, QuoteRes } from '../types/opportunityTypes';
import { STAGE_CONFIGS, LOSS_REASON_OPTIONS } from '../types/opportunityTypes';
import { fetchOpportunities, OpportunityApiError } from '../api/opportunitiesApi';
import OpportunityFormModal from '../components/OpportunityFormModal';
import StageTransitionControl from '../components/StageTransitionControl';
import QuoteBuilder from '../components/QuoteBuilder';
import OpportunityCloseModal from '../components/OpportunityCloseModal';
import { ICONS } from '../../../components/common/icons';

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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [stageFilter, setStageFilter] = useState<string>('ALL');

  /** Bảng nằm dưới thấp, panel "Tiến trình bán hàng" nằm tận trên đầu trang —
   *  bấm chọn cơ hội từ bảng mà không cuộn lên thì người dùng không thấy gì
   *  thay đổi. Chọn xong cuộn mượt lên panel để thao tác tiếp luôn. */
  const stageControlRef = useRef<HTMLDivElement | null>(null);
  const selectOpportunityFromRow = (opp: Opportunity) => {
    setSelectedOpportunity((prev) => (prev?.id === opp.id ? prev : opp));
    requestAnimationFrame(() => {
      stageControlRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
    });
  };

  // Lập báo giá cho cơ hội (NCL-03-CN-003) — chưa có API GET nên lưu tạm theo phiên
  const [quoteTargetOpportunity, setQuoteTargetOpportunity] = useState<Opportunity | null>(null);
  const [sessionQuotes, setSessionQuotes] = useState<Record<number, QuoteRes>>({});

  // Ghi nhận kết quả thắng/thua của cơ hội (NCL-03-CN-005)
  const [closeTargetOpportunity, setCloseTargetOpportunity] = useState<Opportunity | null>(null);

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
      selectOpportunityFromRow(target);
    }
    onFocusConsumed?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusOpportunityId, isLoading, opportunities]);

  const handleCreatedSuccess = (newOpportunity: Opportunity) => {
    setOpportunities((prev) => [newOpportunity, ...prev]);
    setSelectedOpportunity(newOpportunity);
    showToast(`Tạo cơ hội bán hàng "${newOpportunity.name}" thành công!`, 'success');
  };

  const handleOpportunityUpdated = (updated: Opportunity) => {
    setOpportunities((prev) =>
      prev.map((o) => (o.id === updated.id ? updated : o))
    );
    setSelectedOpportunity(updated);
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
    selectOpportunityFromRow(updated);
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

  const weightedForecastValue = useMemo(() => {
    return opportunities.reduce((acc, o) => {
      const prob = o.probability || 0;
      return acc + (o.expectedValue || 0) * (prob / 100);
    }, 0);
  }, [opportunities]);

  const wonCount = useMemo(() => {
    return opportunities.filter((o) => o.stage === 'WON').length;
  }, [opportunities]);

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  };

  /** Nhãn tiêu đề bảng — cỡ chữ 11px cũ quá nhỏ khó đọc, và không có nowrap nên
   *  các tiêu đề 2-3 từ ("Giá trị dự kiến", "Giai đoạn hiện tại") bị xuống dòng
   *  lệch nhau trông rối mắt. Dùng chung một style để 5 cột luôn đồng nhất. */
  const tableHeadStyle: CSSProperties = {
    padding: '12px 16px',
    fontFamily: 'var(--font-mono, monospace)',
    fontSize: '12px',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: 'var(--track-caps)',
    color: 'var(--ink-muted)',
    whiteSpace: 'nowrap',
  };

  /** Mỗi hàng cao thấp khác nhau tuỳ có dòng phụ (lý do thua, ngày dự kiến...)
   *  hay không — hàng đã đóng cao hơn hàng đang mở, khiến bảng nhìn lởm chởm.
   *  Ép mọi ô neo lên đỉnh (thay vì canh giữa theo chiều dọc mặc định) để phần
   *  đầu mỗi hàng luôn thẳng hàng bất kể ô đó có bao nhiêu dòng nội dung. */
  const tableCellStyle: CSSProperties = {
    padding: '14px 16px',
    verticalAlign: 'top',
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
    <div className="page-container" style={{ padding: '24px', maxWidth: '1280px', margin: '0 auto' }}>
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

      {/* Header trang */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '24px',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <h2
            style={{
              fontSize: '24px',
              fontWeight: 600,
              color: 'var(--ink-strong)',
              letterSpacing: 'var(--track-2xl)',
              margin: '0 0 6px 0',
            }}
          >
            Quản lý cơ hội bán hàng & Phễu chuyển đổi
          </h2>
          <p style={{ margin: 0, color: 'var(--ink-muted)', fontSize: '14.5px' }}>
            Theo dõi tiến trình bán hàng, chuyển giai đoạn tuần tự và dự báo doanh số theo xác suất.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          {isAllowed ? (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setIsModalOpen(true)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
            >
              <span className="icon-sm">{ICONS.plus}</span>
              <span>Tạo cơ hội mới</span>
            </button>
          ) : (
            <div
              style={{
                padding: '8px 14px',
                background: 'var(--surface-sunken)',
                border: '1px solid var(--line)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--ink-muted)',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <span>{ICONS.lock}</span>
              <span>Yêu cầu vai trò Nhân viên kinh doanh</span>
            </div>
          )}
        </div>
      </div>

      {/* Cảnh báo nếu không có quyền VT-04 */}
      {!isAllowed && (
        <div
          style={{
            marginBottom: '24px',
            padding: '14px 18px',
            background: 'var(--pale-yellow-bg)',
            color: 'var(--pale-yellow-fg)',
            border: '1px solid rgba(149, 100, 0, 0.25)',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
            fontSize: '14px',
            lineHeight: '1.5',
          }}
          role="note"
        >
          <span style={{ flexShrink: 0, marginTop: '2px' }}>{ICONS.alertTriangle}</span>
          <div>
            <strong>Chế độ chỉ xem:</strong>
            <p style={{ margin: '4px 0 0' }}>
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
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '10px',
            }}
          >
            <span style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--ink-soft)' }}>
              Đang điều khiển: <strong style={{ color: 'var(--ink-strong)' }}>{selectedOpportunity.name}</strong>
              {selectedOpportunity.customerName && ` (${selectedOpportunity.customerName})`}
            </span>
            <div style={{ display: 'flex', gap: '8px' }}>
              {isAllowed && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setQuoteTargetOpportunity(selectedOpportunity)}
                  style={{
                    padding: '2px 8px',
                    fontSize: '13px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <span className="icon-sm">{ICONS.receipt}</span>
                  <span>
                    {sessionQuotes[selectedOpportunity.id]
                      ? `Xem báo giá (v${sessionQuotes[selectedOpportunity.id].version})`
                      : 'Lập báo giá'}
                  </span>
                </button>
              )}
              {onOpenActivities && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => onOpenActivities(selectedOpportunity.id, selectedOpportunity.name)}
                  style={{
                    padding: '2px 8px',
                    fontSize: '13px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <span className="icon-sm">{ICONS.clock}</span>
                  <span>Ghi nhận chăm sóc</span>
                </button>
              )}
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setSelectedOpportunity(null)}
                style={{ padding: '2px 8px', fontSize: '13px' }}
              >
                Thu gọn thanh tiến trình
              </button>
            </div>
          </div>
          <StageTransitionControl
            opportunity={selectedOpportunity}
            onOpportunityUpdated={handleOpportunityUpdated}
            currentUserRoles={currentUserRoles}
          />
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

      {/* Bảng chỉ số thống kê phân khoang chuẩn DESIGN.md */}
      <div
        className="stats-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1px',
          background: 'var(--line)',
          border: '1px solid var(--line)',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
          marginBottom: '24px',
        }}
      >
        <div style={{ background: 'var(--surface)', padding: '16px 20px' }}>
          <div
            style={{
              fontFamily: 'var(--font-mono, monospace)',
              fontSize: '11.5px',
              fontWeight: 500,
              textTransform: 'uppercase',
              letterSpacing: 'var(--track-caps)',
              color: 'var(--ink-muted)',
              marginBottom: '8px',
            }}
          >
            Tổng số cơ hội
          </div>
          <div
            style={{
              fontSize: '28px',
              fontWeight: 600,
              color: 'var(--ink-strong)',
              lineHeight: 1,
              fontFamily: 'var(--font-mono, monospace)',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {opportunities.length}
          </div>
        </div>

        <div style={{ background: 'var(--surface)', padding: '16px 20px' }}>
          <div
            style={{
              fontFamily: 'var(--font-mono, monospace)',
              fontSize: '11.5px',
              fontWeight: 500,
              textTransform: 'uppercase',
              letterSpacing: 'var(--track-caps)',
              color: 'var(--ink-muted)',
              marginBottom: '8px',
            }}
          >
            Chốt thành công (WON)
          </div>
          <div
            style={{
              fontSize: '28px',
              fontWeight: 600,
              color: 'var(--pale-green-fg)',
              lineHeight: 1,
              fontFamily: 'var(--font-mono, monospace)',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {wonCount}
          </div>
        </div>

        <div style={{ background: 'var(--surface)', padding: '16px 20px' }}>
          <div
            style={{
              fontFamily: 'var(--font-mono, monospace)',
              fontSize: '11.5px',
              fontWeight: 500,
              textTransform: 'uppercase',
              letterSpacing: 'var(--track-caps)',
              color: 'var(--ink-muted)',
              marginBottom: '8px',
            }}
          >
            Tổng giá trị dự kiến
          </div>
          <div
            style={{
              fontSize: '22px',
              fontWeight: 600,
              color: 'var(--ink-strong)',
              lineHeight: 1.1,
              fontFamily: 'var(--font-mono, monospace)',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {formatCurrency(totalExpectedValue)}
          </div>
        </div>

        <div style={{ background: 'var(--surface)', padding: '16px 20px' }}>
          <div
            style={{
              fontFamily: 'var(--font-mono, monospace)',
              fontSize: '11.5px',
              fontWeight: 500,
              textTransform: 'uppercase',
              letterSpacing: 'var(--track-caps)',
              color: 'var(--ink-muted)',
              marginBottom: '8px',
            }}
          >
            Dự báo theo xác suất (Weighted)
          </div>
          <div
            style={{
              fontSize: '22px',
              fontWeight: 600,
              color: 'var(--pale-blue-fg)',
              lineHeight: 1.1,
              fontFamily: 'var(--font-mono, monospace)',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {formatCurrency(weightedForecastValue)}
          </div>
        </div>
      </div>

      {/* Thanh bộ lọc & Tìm kiếm */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px',
          gap: '12px',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', gap: '12px', flex: 1, flexWrap: 'wrap', minWidth: '320px' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '260px', maxWidth: '440px' }}>
            <span
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--ink-muted)',
                pointerEvents: 'none',
                display: 'flex',
              }}
            >
              {ICONS.search}
            </span>
            <input
              type="text"
              className="form-input"
              placeholder="Tìm theo tên cơ hội hoặc khách hàng..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ paddingLeft: '36px' }}
            />
          </div>

          <select
            className="form-select"
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value)}
            style={{ width: 'auto', minWidth: '200px' }}
          >
            <option value="ALL">Tất cả giai đoạn</option>
            <option value="APPROACH">Tiếp cận (10%)</option>
            <option value="PROPOSAL">Đề xuất (40%)</option>
            <option value="NEGOTIATION">Đàm phán (70%)</option>
            <option value="WON">Chốt thành công (100%)</option>
            <option value="LOST">Đóng thất bại (0%)</option>
          </select>
        </div>

        <div style={{ fontSize: '13.5px', color: 'var(--ink-muted)' }}>
          Hiển thị <strong>{filteredOpportunities.length}</strong> cơ hội
        </div>
      </div>

      {/* Bảng danh sách cơ hội */}
      <div
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--line)',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
        }}
      >
        <div style={{ overflowX: 'auto' }}>
          <table
            style={{
              width: '100%',
              // table-layout auto trước đây khiến cột "Tên cơ hội" bị bóp hẹp
              // bất cứ khi nào cột "Thao tác" có dòng lý do thua dài — cả bảng
              // bị lệch, hàng có lý do dài kéo giãn hết các hàng khác theo.
              // Cố định % mỗi cột qua colgroup để chiều rộng luôn nhất quán
              // bất kể nội dung dài ngắn ra sao.
              tableLayout: 'fixed',
              borderCollapse: 'collapse',
              textAlign: 'left',
              fontSize: '15px',
            }}
          >
            <colgroup>
              <col style={{ width: '26%' }} />
              <col style={{ width: '16%' }} />
              <col style={{ width: '14%' }} />
              <col style={{ width: '18%' }} />
              <col style={{ width: '26%' }} />
            </colgroup>
            <thead>
              <tr
                style={{
                  background: 'var(--surface-alt)',
                  borderBottom: '1px solid var(--line)',
                }}
              >
                <th style={tableHeadStyle}>Tên cơ hội</th>
                <th style={tableHeadStyle}>Khách hàng</th>
                <th style={{ ...tableHeadStyle, textAlign: 'right' }}>Giá trị dự kiến</th>
                <th style={tableHeadStyle}>Giai đoạn hiện tại</th>
                <th style={{ ...tableHeadStyle, textAlign: 'right' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={5} style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--ink-muted)' }}>
                    Đang tải danh sách cơ hội bán hàng…
                  </td>
                </tr>
              ) : filteredOpportunities.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '48px 24px', textAlign: 'center' }}>
                    <div style={{ maxWidth: '380px', margin: '0 auto', color: 'var(--ink-muted)' }}>
                      <div
                        style={{
                          width: '48px',
                          height: '48px',
                          borderRadius: 'var(--radius-md)',
                          background: 'var(--surface-sunken)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'var(--ink-muted)',
                          marginBottom: '12px',
                        }}
                      >
                        {ICONS.target}
                      </div>
                      <h4 style={{ margin: '0 0 6px', color: 'var(--ink)', fontSize: '16px', fontWeight: 600 }}>
                        {searchTerm || stageFilter !== 'ALL'
                          ? 'Không tìm thấy cơ hội phù hợp'
                          : 'Chưa có cơ hội bán hàng nào'}
                      </h4>
                      <p style={{ margin: '0 0 16px', fontSize: '13.5px', lineHeight: '1.5' }}>
                        {searchTerm || stageFilter !== 'ALL'
                          ? 'Thử thay đổi từ khóa hoặc bộ lọc giai đoạn để hiển thị kết quả.'
                          : 'Bắt đầu quy trình kinh doanh bằng cách tạo cơ hội mới gắn liền với hồ sơ khách hàng.'}
                      </p>
                      {!searchTerm && stageFilter === 'ALL' && isAllowed && (
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() => setIsModalOpen(true)}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                        >
                          <span className="icon-sm">{ICONS.plus}</span>
                          <span>Tạo cơ hội đầu tiên</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredOpportunities.map((opp) => {
                  const stageConfig = STAGE_CONFIGS[opp.stage as OpportunityStage];
                  const isSelected = selectedOpportunity?.id === opp.id;
                  const isClosed = opp.status === 'CLOSED';

                  return (
                    <tr
                      key={opp.id}
                      style={{
                        borderBottom: '1px solid var(--line)',
                        background: isSelected ? 'var(--surface-sunken)' : 'transparent',
                        transition: 'background 0.15s ease',
                      }}
                    >
                      <td style={tableCellStyle}>
                        <button
                          type="button"
                          onClick={() => selectOpportunityFromRow(opp)}
                          title="Xem tiến trình bán hàng của cơ hội này"
                          style={{
                            all: 'unset',
                            cursor: 'pointer',
                            display: 'block',
                          }}
                        >
                          <div
                            style={{
                              fontWeight: 600,
                              color: 'var(--ink-strong)',
                              textDecoration: 'none',
                            }}
                          >
                            {opp.name}
                          </div>
                          <div style={{ fontSize: '12.5px', color: 'var(--ink-muted)', marginTop: '2px' }}>
                            Dự kiến: {formatDate(opp.expectedCloseDate)}
                          </div>
                        </button>
                      </td>
                      <td style={tableCellStyle}>
                        <button
                          type="button"
                          onClick={() => selectOpportunityFromRow(opp)}
                          title="Xem tiến trình bán hàng của cơ hội này"
                          style={{
                            all: 'unset',
                            cursor: 'pointer',
                            display: 'inline',
                            color: 'var(--ink)',
                          }}
                        >
                          {opp.customerName || `Khách hàng #${opp.customerId}`}
                        </button>
                      </td>
                      <td
                        style={{
                          ...tableCellStyle,
                          textAlign: 'right',
                          fontFamily: 'var(--font-mono, monospace)',
                          fontVariantNumeric: 'tabular-nums',
                          fontWeight: 600,
                          color: 'var(--ink-strong)',
                        }}
                      >
                        {formatCurrency(opp.expectedValue)}
                      </td>
                      <td style={tableCellStyle}>
                        {/* Xác suất luôn cố định theo giai đoạn (10/40/70/100/0%), không cần
                            tách thành một cột riêng — gộp chung vào cùng một nhãn cho gọn. */}
                        <span
                          style={{
                            padding: '4px 10px',
                            borderRadius: '999px',
                            fontSize: '12.5px',
                            fontWeight: 600,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '7px',
                            whiteSpace: 'nowrap',
                            background:
                              opp.stage === 'WON'
                                ? 'var(--pale-green-bg)'
                                : opp.stage === 'LOST'
                                ? 'var(--pale-red-bg)'
                                : 'var(--surface-alt)',
                            color:
                              opp.stage === 'WON'
                                ? 'var(--pale-green-fg)'
                                : opp.stage === 'LOST'
                                ? 'var(--pale-red-fg)'
                                : 'var(--ink-strong)',
                            border: '1px solid var(--line)',
                          }}
                        >
                          <span
                            style={{
                              width: '6px',
                              height: '6px',
                              borderRadius: '50%',
                              background: 'currentColor',
                              flexShrink: 0,
                            }}
                          />
                          {stageConfig?.shortLabel ?? opp.stage}
                          <span
                            style={{
                              fontFamily: 'var(--font-mono, monospace)',
                              opacity: 0.7,
                              paddingLeft: '2px',
                              borderLeft: '1px solid currentColor',
                              marginLeft: '1px',
                            }}
                          >
                            &nbsp;{opp.probability}%
                          </span>
                        </span>
                        {/* "Còn bao nhiêu ngày ở giai đoạn" và "lý do thua" đã chuyển lên
                            panel "Tiến trình bán hàng & Xác suất thành công" phía trên —
                            chỉ hiện cho ĐÚNG MỘT cơ hội đang chọn, thay vì lặp lại ở mọi
                            hàng của bảng gây rối mắt. Xem StageTransitionControl.tsx. */}
                      </td>
                      <td style={{ ...tableCellStyle, textAlign: 'right' }}>
                        <div
                          style={{
                            display: 'flex',
                            gap: '10px',
                            justifyContent: 'flex-end',
                            alignItems: 'flex-start',
                            flexWrap: 'nowrap',
                          }}
                        >
                          {isClosed ? (
                            // Lý do thua có thể rất dài (kèm tên đối thủ) — cắt gọn một
                            // dòng bằng ellipsis thay vì ép cả bảng giãn rộng ra theo nó;
                            // xem đầy đủ bằng cách di chuột vào (title tooltip).
                            <div style={{ minWidth: 0, maxWidth: '100%', textAlign: 'right' }}>
                              {/* Lý do thua chuyển lên panel "Tiến trình bán hàng & Xác suất
                                  thành công" phía trên khi chọn đúng cơ hội này — không lặp
                                  lại ở mọi hàng của bảng nữa (xem StageTransitionControl.tsx). */}
                              <span
                                data-testid={`badge-closed-${opp.id}`}
                                title={
                                  opp.stage === 'LOST' && (opp.lossReason || opp.competitorName)
                                    ? `${lossReasonLabel(opp.lossReason) ?? ''}${
                                        opp.competitorName ? ` · Đối thủ: ${opp.competitorName}` : ''
                                      }`
                                    : undefined
                                }
                                style={{
                                  fontSize: '12.5px',
                                  fontWeight: 600,
                                  color: 'var(--ink-muted)',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                Đã hoàn tất
                              </span>
                            </div>
                          ) : (
                            isAllowed &&
                            (opp.stage === 'NEGOTIATION' ? (
                              <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={() => setCloseTargetOpportunity(opp)}
                                data-testid={`btn-close-opportunity-${opp.id}`}
                                style={{ fontSize: '12.5px', padding: '4px 10px', whiteSpace: 'nowrap' }}
                              >
                                Ghi nhận kết quả
                              </button>
                            ) : (
                              <button
                                type="button"
                                className="btn btn-secondary"
                                disabled
                                data-testid={`btn-disabled-close-${opp.id}`}
                                title="Cơ hội phải ở giai đoạn Đàm phán mới ghi nhận được kết quả thắng/thua"
                                style={{ fontSize: '12.5px', padding: '4px 10px', opacity: 0.55, whiteSpace: 'nowrap' }}
                              >
                                Chưa thể chốt
                              </button>
                            ))
                          )}
                          <button
                            type="button"
                            className={`btn ${isSelected ? 'btn-primary' : 'btn-secondary'}`}
                            onClick={() => setSelectedOpportunity(isSelected ? null : opp)}
                            style={{ fontSize: '12.5px', padding: '4px 10px', whiteSpace: 'nowrap' }}
                          >
                            {isSelected ? 'Đang chọn' : 'Chuyển giai đoạn'}
                          </button>
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
