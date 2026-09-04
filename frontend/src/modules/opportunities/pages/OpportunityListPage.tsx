import { useState, useMemo } from 'react';
import type { Opportunity } from '../types/opportunityTypes';
import OpportunityFormModal from '../components/OpportunityFormModal';
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
  // NCL-03-CN-001 (TC-03): Chỉ Nhân viên kinh doanh (VT-04) có quyền tạo cơ hội bán hàng.
  const isAllowed = currentUserRoles.includes('VT-04');

  const [opportunities, setOpportunities] = useState<Opportunity[]>(initialOpportunities);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
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
    showToast(`Tạo cơ hội bán hàng "${newOpportunity.name}" thành công!`, 'success');
  };

  const filteredOpportunities = useMemo(() => {
    if (!searchTerm.trim()) return opportunities;
    const term = searchTerm.toLowerCase().trim();
    return opportunities.filter(
      (o) =>
        o.name.toLowerCase().includes(term) ||
        (o.customerName && o.customerName.toLowerCase().includes(term))
    );
  }, [opportunities, searchTerm]);

  // Thống kê nhanh
  const totalValue = useMemo(() => {
    return opportunities.reduce((acc, o) => acc + (o.expectedValue || 0), 0);
  }, [opportunities]);

  const approachCount = useMemo(() => {
    return opportunities.filter((o) => o.stage === 'APPROACH').length;
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
            Cơ hội bán hàng
          </h2>
          <p style={{ margin: 0, color: 'var(--ink-muted)', fontSize: '14.5px' }}>
            Khởi tạo và theo dõi các cơ hội kinh doanh mới gắn liền với hồ sơ khách hàng.
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
              <span>Tạo cơ hội bán hàng</span>
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

      {/* Cảnh báo phân quyền nếu không có VT-04 */}
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
            <strong>Thông báo phân quyền (NCL-03-CN-001 TC-03):</strong>
            <p style={{ margin: '4px 0 0' }}>
              Tài khoản hiện tại của bạn không mang vai trò <strong>Nhân viên kinh doanh</strong> (<code>VT-04</code>).
              Hệ thống chỉ cho phép nhân viên kinh doanh khởi tạo cơ hội bán hàng. Mọi yêu cầu trái quyền sẽ bị từ chối
              và ghi nhật ký giám sát.
            </p>
          </div>
        </div>
      )}

      {/* Bảng chỉ số thống kê phân khoang chuẩn DESIGN.md */}
      <div
        className="stats-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
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
            Tổng cơ hội (phiên)
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
            Giai đoạn tiếp cận (APPROACH)
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
            {approachCount}
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
              fontSize: '24px',
              fontWeight: 600,
              color: 'var(--ink-strong)',
              lineHeight: 1.1,
              fontFamily: 'var(--font-mono, monospace)',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {formatCurrency(totalValue)}
          </div>
        </div>
      </div>

      {/* Bộ lọc & Tìm kiếm */}
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
        <div style={{ position: 'relative', minWidth: '320px', maxWidth: '480px', flex: 1 }}>
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
                  Ngày dự kiến chốt
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
                  Trạng thái
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
                  Thời điểm tạo
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredOpportunities.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '48px 24px', textAlign: 'center' }}>
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
                        {searchTerm ? 'Không tìm thấy cơ hội phù hợp' : 'Chưa có cơ hội bán hàng nào'}
                      </h4>
                      <p style={{ margin: '0 0 16px', fontSize: '13.5px', lineHeight: '1.5' }}>
                        {searchTerm
                          ? 'Thử thay đổi từ khóa tìm kiếm hoặc xóa bộ lọc để xem lại danh sách.'
                          : 'Bắt đầu quy trình bán hàng bằng cách khởi tạo cơ hội mới gắn với hồ sơ khách hàng đã có trong hệ thống.'}
                      </p>
                      {!searchTerm && isAllowed && (
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
                filteredOpportunities.map((opp) => (
                  <tr
                    key={opp.id}
                    style={{
                      borderBottom: '1px solid var(--line)',
                      transition: 'background 0.15s ease',
                    }}
                  >
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--ink-strong)' }}>
                      {opp.name}
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
                    <td style={{ padding: '12px 16px', color: 'var(--ink-soft)' }}>
                      {formatDate(opp.expectedCloseDate)}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span
                        style={{
                          padding: '2px 8px',
                          background: 'var(--pale-green-bg)',
                          color: 'var(--pale-green-fg)',
                          borderRadius: '999px',
                          fontSize: '12px',
                          fontWeight: 600,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
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
                        Tiếp cận
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span
                        style={{
                          padding: '2px 8px',
                          background: 'var(--pale-blue-bg)',
                          color: 'var(--pale-blue-fg)',
                          borderRadius: '999px',
                          fontSize: '12px',
                          fontWeight: 600,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
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
                        Đang xử lý
                      </span>
                    </td>
                    <td
                      style={{
                        padding: '12px 16px',
                        color: 'var(--ink-muted)',
                        fontSize: '13px',
                        fontFamily: 'var(--font-mono, monospace)',
                      }}
                    >
                      {formatDate(opp.createdAt)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal tạo cơ hội bán hàng */}
      <OpportunityFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleCreatedSuccess}
      />
    </div>
  );
}
