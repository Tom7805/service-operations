import { useState, useMemo } from 'react';
import type { Opportunity, QuoteRes } from '../types/opportunityTypes';
import { STAGE_CONFIGS } from '../types/opportunityTypes';
import OpportunityFormModal from '../components/OpportunityFormModal';
import StageTransitionControl from '../components/StageTransitionControl';
import QuoteBuilder from '../components/QuoteBuilder';
import { ICONS } from '../../../components/common/icons';

interface OpportunityListPageProps {
  currentUserRoles?: string[];
  currentUserName?: string;
  initialOpportunities?: Opportunity[];
}

export default function OpportunityListPage({
  currentUserRoles = ['VT-04'],
  initialOpportunities = [],
}: OpportunityListPageProps) {
  const isAllowed = currentUserRoles.includes('VT-04');

  const [opportunities, setOpportunities] = useState<Opportunity[]>(initialOpportunities);
  const [selectedOpportunity, setSelectedOpportunity] = useState<Opportunity | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [stageFilter, setStageFilter] = useState<string>('ALL');

  // Quản lý mở QuoteBuilder (NCL-03-CN-003)
  const [quoteTargetOpportunity, setQuoteTargetOpportunity] = useState<Opportunity | null>(null);
  const [sessionQuotes, setSessionQuotes] = useState<Record<number, QuoteRes>>({});

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
    showToast(`Đã chuyển giai đoạn cho "${updated.name}" thành công!`, 'success');
  };

  const handleQuoteCreated = (quote: QuoteRes) => {
    setSessionQuotes((prev) => ({
      ...prev,
      [quote.opportunityId]: quote,
    }));
    showToast(`Lập báo giá phiên bản #${quote.version} thành công!`, 'success');
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

  // Thống kê
  const totalExpectedValue = useMemo(() => {
    return opportunities.reduce((acc, o) => acc + (o.expectedValue || 0), 0);
  }, [opportunities]);

  const proposalCount = useMemo(() => {
    return opportunities.filter((o) => o.stage === 'PROPOSAL').length;
  }, [opportunities]);

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
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
            Quản lý cơ hội bán hàng & Báo giá
          </h2>
          <p style={{ margin: 0, color: 'var(--ink-muted)', fontSize: '14.5px' }}>
            Theo dõi tiến trình bán hàng, chuyển giai đoạn phễu và lập dự toán báo giá cho cơ hội (NCL-03).
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
              <span>Yêu cầu vai trò Nhân viên kinh doanh (VT-04)</span>
            </div>
          )}
        </div>
      </div>

      {/* Cảnh báo nếu không có vai trò VT-04 */}
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
            <strong>Phân quyền nghiệp vụ (Epic NCL-03):</strong>
            <p style={{ margin: '4px 0 0' }}>
              Tài khoản hiện tại của bạn không mang vai trò <strong>Nhân viên kinh doanh</strong> (<code>VT-04</code>).
              Hệ thống chỉ cho phép nhân viên kinh doanh tạo cơ hội, chuyển giai đoạn và lập báo giá.
            </p>
          </div>
        </div>
      )}

      {/* Thanh điều khiển tiến trình giai đoạn khi chọn cơ hội */}
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
              Đang chọn cơ hội: <strong style={{ color: 'var(--ink-strong)' }}>{selectedOpportunity.name}</strong>
            </span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setQuoteTargetOpportunity(selectedOpportunity)}
                style={{ padding: '4px 10px', fontSize: '12.5px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <span className="icon-sm">{ICONS.receipt}</span>
                <span>
                  {sessionQuotes[selectedOpportunity.id]
                    ? `Xem báo giá (v${sessionQuotes[selectedOpportunity.id].version})`
                    : 'Lập báo giá (PROPOSAL)'}
                </span>
              </button>

              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setSelectedOpportunity(null)}
                style={{ padding: '4px 10px', fontSize: '12.5px' }}
              >
                Thu gọn
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
              fontSize: '11px',
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
              fontSize: '11px',
              fontWeight: 500,
              textTransform: 'uppercase',
              letterSpacing: 'var(--track-caps)',
              color: 'var(--ink-muted)',
              marginBottom: '8px',
            }}
          >
            Giai đoạn đề xuất (Có thể lập báo giá)
          </div>
          <div
            style={{
              fontSize: '28px',
              fontWeight: 600,
              color: 'var(--pale-blue-fg)',
              lineHeight: 1,
              fontFamily: 'var(--font-mono, monospace)',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {proposalCount}
          </div>
        </div>

        <div style={{ background: 'var(--surface)', padding: '16px 20px' }}>
          <div
            style={{
              fontFamily: 'var(--font-mono, monospace)',
              fontSize: '11px',
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
            style={{ width: 'auto', minWidth: '220px' }}
          >
            <option value="ALL">Tất cả giai đoạn</option>
            <option value="APPROACH">Tiếp cận (10%)</option>
            <option value="PROPOSAL">Đề xuất giải pháp (40%)</option>
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
              borderCollapse: 'collapse',
              textAlign: 'left',
              fontSize: '14px',
            }}
          >
            <thead>
              <tr
                style={{
                  background: 'var(--surface-alt)',
                  borderBottom: '1px solid var(--line)',
                }}
              >
                <th
                  style={{
                    padding: '12px 16px',
                    fontFamily: 'var(--font-mono, monospace)',
                    fontSize: '11px',
                    fontWeight: 500,
                    textTransform: 'uppercase',
                    letterSpacing: 'var(--track-caps)',
                    color: 'var(--ink-muted)',
                  }}
                >
                  Tên cơ hội
                </th>
                <th
                  style={{
                    padding: '12px 16px',
                    fontFamily: 'var(--font-mono, monospace)',
                    fontSize: '11px',
                    fontWeight: 500,
                    textTransform: 'uppercase',
                    letterSpacing: 'var(--track-caps)',
                    color: 'var(--ink-muted)',
                  }}
                >
                  Khách hàng
                </th>
                <th
                  style={{
                    padding: '12px 16px',
                    fontFamily: 'var(--font-mono, monospace)',
                    fontSize: '11px',
                    fontWeight: 500,
                    textTransform: 'uppercase',
                    letterSpacing: 'var(--track-caps)',
                    color: 'var(--ink-muted)',
                    textAlign: 'right',
                  }}
                >
                  Giá trị dự kiến
                </th>
                <th
                  style={{
                    padding: '12px 16px',
                    fontFamily: 'var(--font-mono, monospace)',
                    fontSize: '11px',
                    fontWeight: 500,
                    textTransform: 'uppercase',
                    letterSpacing: 'var(--track-caps)',
                    color: 'var(--ink-muted)',
                  }}
                >
                  Giai đoạn
                </th>
                <th
                  style={{
                    padding: '12px 16px',
                    fontFamily: 'var(--font-mono, monospace)',
                    fontSize: '11px',
                    fontWeight: 500,
                    textTransform: 'uppercase',
                    letterSpacing: 'var(--track-caps)',
                    color: 'var(--ink-muted)',
                  }}
                >
                  Báo giá (NCL-03-CN-003)
                </th>
                <th
                  style={{
                    padding: '12px 16px',
                    fontFamily: 'var(--font-mono, monospace)',
                    fontSize: '11px',
                    fontWeight: 500,
                    textTransform: 'uppercase',
                    letterSpacing: 'var(--track-caps)',
                    color: 'var(--ink-muted)',
                    textAlign: 'right',
                  }}
                >
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredOpportunities.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '48px 24px', textAlign: 'center' }}>
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
                        {ICONS.receipt}
                      </div>
                      <h4 style={{ margin: '0 0 6px', color: 'var(--ink)', fontSize: '16px', fontWeight: 600 }}>
                        {searchTerm || stageFilter !== 'ALL'
                          ? 'Không tìm thấy cơ hội phù hợp'
                          : 'Chưa có cơ hội bán hàng nào'}
                      </h4>
                      <p style={{ margin: '0 0 16px', fontSize: '13.5px', lineHeight: '1.5' }}>
                        Khởi tạo cơ hội mới và chuyển sang giai đoạn Đề xuất để thực hiện lập báo giá.
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
                  const stageConfig = STAGE_CONFIGS[opp.stage as keyof typeof STAGE_CONFIGS];
                  const isSelected = selectedOpportunity?.id === opp.id;
                  const isProposal = opp.stage === 'PROPOSAL';
                  const quote = sessionQuotes[opp.id];

                  return (
                    <tr
                      key={opp.id}
                      style={{
                        borderBottom: '1px solid var(--line)',
                        background: isSelected ? 'var(--surface-sunken)' : 'transparent',
                        transition: 'background 0.15s ease',
                      }}
                    >
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: 600, color: 'var(--ink-strong)' }}>{opp.name}</div>
                        <div style={{ fontSize: '12px', color: 'var(--ink-muted)', marginTop: '2px' }}>
                          Dự kiến: {formatDate(opp.expectedCloseDate)}
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px', color: 'var(--ink)' }}>
                        {opp.customerName || `Khách hàng #${opp.customerId}`}
                      </td>
                      <td
                        style={{
                          padding: '12px 16px',
                          textAlign: 'right',
                          fontFamily: 'var(--font-mono, monospace)',
                          fontVariantNumeric: 'tabular-nums',
                          fontWeight: 600,
                          color: 'var(--ink-strong)',
                        }}
                      >
                        {formatCurrency(opp.expectedValue)}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span
                          style={{
                            padding: '3px 10px',
                            borderRadius: '999px',
                            fontSize: '12px',
                            fontWeight: 600,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            background:
                              opp.stage === 'WON'
                                ? 'var(--pale-green-bg)'
                                : opp.stage === 'LOST'
                                ? 'var(--pale-red-bg)'
                                : isProposal
                                ? 'var(--pale-blue-bg)'
                                : 'var(--surface-alt)',
                            color:
                              opp.stage === 'WON'
                                ? 'var(--pale-green-fg)'
                                : opp.stage === 'LOST'
                                ? 'var(--pale-red-fg)'
                                : isProposal
                                ? 'var(--pale-blue-fg)'
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
                            }}
                          />
                          {stageConfig?.shortLabel ?? opp.stage}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        {quote ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span
                              style={{
                                padding: '2px 8px',
                                background: 'var(--pale-green-bg)',
                                color: 'var(--pale-green-fg)',
                                borderRadius: '999px',
                                fontSize: '11px',
                                fontWeight: 600,
                              }}
                            >
                              v{quote.version}
                            </span>
                            <span
                              style={{
                                fontFamily: 'var(--font-mono, monospace)',
                                fontSize: '13px',
                                fontWeight: 600,
                              }}
                            >
                              {formatCurrency(quote.totalAmount)}
                            </span>
                          </div>
                        ) : isProposal ? (
                          <span style={{ fontSize: '12.5px', color: 'var(--pale-blue-fg)' }}>
                            Sẵn sàng lập báo giá
                          </span>
                        ) : (
                          <span style={{ fontSize: '12px', color: 'var(--ink-faint)' }}>
                            Cần ở Đề xuất (PROPOSAL)
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '6px' }}>
                          {isAllowed && (
                            <button
                              type="button"
                              className="btn btn-secondary"
                              onClick={() => setQuoteTargetOpportunity(opp)}
                              title={
                                isProposal
                                  ? 'Lập hoặc xem báo giá dự toán'
                                  : 'Cần chuyển sang Đề xuất trước khi lập báo giá'
                              }
                              style={{
                                fontSize: '12px',
                                padding: '4px 8px',
                                color: isProposal ? 'var(--pale-blue-fg)' : 'var(--ink-muted)',
                              }}
                            >
                              {quote ? 'Xem báo giá' : 'Lập báo giá'}
                            </button>
                          )}
                          <button
                            type="button"
                            className={`btn ${isSelected ? 'btn-primary' : 'btn-secondary'}`}
                            onClick={() => setSelectedOpportunity(isSelected ? null : opp)}
                            style={{ fontSize: '12px', padding: '4px 8px' }}
                          >
                            {isSelected ? 'Đang chọn' : 'Tiến trình'}
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

      {/* Modal Lập báo giá cho cơ hội (NCL-03-CN-003) */}
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
