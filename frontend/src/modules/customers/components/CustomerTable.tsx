import { useState } from 'react';
import type { Customer } from '../types/customerTypes';

interface CustomerTableProps {
  customers: Customer[];
  loading?: boolean;
  onOpenCreate?: () => void;
  canCreate?: boolean;
  onNavigateDetail?: (customer: Customer) => void;
  // NCL-02-CN-005: mở biểu mẫu gán ngành nghề, quy mô và mức độ ưu tiên cho một khách hàng.
  canManageSegment?: boolean;
  onOpenSegment?: (customer: Customer) => void;
}

/** Trả về sắc thái hiển thị (màu) tương ứng mức độ ưu tiên đã chọn. */
function priorityTone(priority?: string | null): 'low' | 'medium' | 'high' {
  const normalized = priority?.trim().toLowerCase() ?? '';
  if (normalized === 'cao') return 'high';
  if (normalized === 'thấp') return 'low';
  return 'medium';
}

export default function CustomerTable({
  customers,
  loading = false,
  onOpenCreate,
  canCreate = false,
  onNavigateDetail,
  canManageSegment = false,
  onOpenSegment,
}: CustomerTableProps) {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code).then(() => {
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    });
  };

  const formatDate = (isoString?: string) => {
    if (!isoString) return '—';
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString('vi-VN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  if (loading) {
    return (
      <div className="table-loading-state">
        <div className="spinner-lg" />
        <p>Đang tải danh sách hồ sơ khách hàng...</p>
      </div>
    );
  }

  if (customers.length === 0) {
    return (
      <div className="table-empty-state">
        <div className="table-empty-state__icon">🏢</div>
        <h3>Chưa có hồ sơ khách hàng nào</h3>
        <p>
          Hệ thống hiện tại chưa có hồ sơ khách hàng được ghi nhận. Bắt đầu tạo mới hồ sơ để quản lý thông tin khách hàng và dự án.
        </p>
        {canCreate && onOpenCreate && (
          <button
            type="button"
            className="btn btn-primary"
            onClick={onOpenCreate}
            style={{ marginTop: '16px' }}
          >
            <span>+</span>
            <span>Tạo hồ sơ khách hàng đầu tiên</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="table-responsive">
      <table className="user-data-table customer-data-table">
        <thead>
          <tr>
            <th style={{ width: '130px' }}>Mã khách hàng</th>
            <th style={{ minWidth: '220px' }}>Tên khách hàng</th>
            <th style={{ width: '150px' }}>Mã số thuế</th>
            <th style={{ width: '170px' }}>Lĩnh vực / Ngành</th>
            <th style={{ width: '110px' }}>Quy mô</th>
            <th style={{ width: '130px' }}>Ưu tiên</th>
            <th style={{ minWidth: '240px' }}>Địa chỉ trụ sở</th>
            <th style={{ width: '150px' }}>Ngày tạo</th>
            <th style={{ width: '220px', textAlign: 'center' }}>Thao tác</th>
          </tr>
        </thead>
        <tbody>
          {customers.map((cust) => {
            const isMerged = cust.status === 'MERGED';
            return (
            <tr key={cust.id ?? cust.code} className={`customer-table-row ${isMerged ? 'customer-table-row--merged' : ''}`}>
              <td>
                <div className="customer-code-cell">
                  <span className="customer-code-pill">{cust.code}</span>
                  <button
                    type="button"
                    className="btn-copy-code"
                    title={copiedCode === cust.code ? 'Đã sao chép!' : 'Sao chép mã'}
                    onClick={() => handleCopyCode(cust.code)}
                    aria-label={`Sao chép mã ${cust.code}`}
                  >
                    {copiedCode === cust.code ? '✓' : '📋'}
                  </button>
                </div>
              </td>
              <td>
                <div
                  className={`customer-name-cell ${onNavigateDetail ? 'customer-name-cell--clickable' : ''}`}
                  onClick={() => onNavigateDetail?.(cust)}
                  title={onNavigateDetail ? 'Nhấp để xem chi tiết & người liên hệ' : undefined}
                >
                  <div className="customer-avatar-icon">🏢</div>
                  <div className="customer-name-meta">
                    <span className="customer-company-name">
                      {cust.name}
                      {isMerged && (
                        <span
                          className="merged-status-badge"
                          data-testid={`merged-badge-${cust.id}`}
                          title={
                            cust.mergedIntoId
                              ? `Đã gộp vào hồ sơ #${cust.mergedIntoId}`
                              : 'Hồ sơ đã bị gộp'
                          }
                        >
                          Đã gộp
                        </span>
                      )}
                    </span>
                    <span className="customer-id-sub">ID: #{cust.id}</span>
                  </div>
                </div>
              </td>
              <td>
                {cust.taxCode ? (
                  <span className="taxcode-badge">{cust.taxCode}</span>
                ) : (
                  <span className="cell-muted">—</span>
                )}
              </td>
              <td>
                {cust.industry ? (
                  <span className="industry-tag">{cust.industry}</span>
                ) : (
                  <span className="cell-muted">—</span>
                )}
              </td>
              <td>
                {cust.companySize ? (
                  <span className="company-size-tag" data-testid={`segment-size-${cust.id}`}>
                    {cust.companySize}
                  </span>
                ) : (
                  <span className="cell-muted">—</span>
                )}
              </td>
              <td>
                {cust.priority ? (
                  <span
                    className={`priority-tag priority-tag--${priorityTone(cust.priority)}`}
                    data-testid={`segment-priority-${cust.id}`}
                  >
                    {cust.priority}
                  </span>
                ) : (
                  <span className="cell-muted">—</span>
                )}
              </td>
              <td>
                {cust.address ? (
                  <span className="address-text" title={cust.address}>
                    {cust.address}
                  </span>
                ) : (
                  <span className="cell-muted">—</span>
                )}
              </td>
              <td>
                <span className="cell-date">{formatDate(cust.createdAt)}</span>
              </td>
              <td style={{ textAlign: 'center' }}>
                <div className="table-actions" style={{ justifyContent: 'center', gap: '8px' }}>
                  {onNavigateDetail && (
                    <button
                      type="button"
                      className="btn-manage-contacts-link"
                      onClick={() => onNavigateDetail(cust)}
                      title={
                        isMerged
                          ? 'Hồ sơ đã bị gộp — không thể quản lý người liên hệ tiếp'
                          : 'Quản lý danh bạ & người liên hệ của khách hàng (NCL-02-CN-003)'
                      }
                      disabled={isMerged}
                      data-testid={`btn-manage-contacts-${cust.id}`}
                    >
                      <span>👥</span>
                      <span>Người liên hệ</span>
                    </button>
                  )}
                  {canManageSegment && onOpenSegment && (
                    <button
                      type="button"
                      className="btn-manage-contacts-link"
                      onClick={() => onOpenSegment(cust)}
                      title={
                        isMerged
                          ? 'Hồ sơ đã bị gộp — không thể phân nhóm tiếp (NCL-02-CN-006)'
                          : 'Gán ngành nghề, quy mô và mức độ ưu tiên (NCL-02-CN-005)'
                      }
                      disabled={isMerged}
                      data-testid={`btn-open-segment-${cust.id}`}
                    >
                      <span>🏷️</span>
                      <span>Phân nhóm</span>
                    </button>
                  )}
                  <button
                    type="button"
                    className="action-btn"
                    title="Sao chép mã khách hàng"
                    onClick={() => handleCopyCode(cust.code)}
                  >
                    {copiedCode === cust.code ? '✓' : '📋'}
                  </button>
                </div>
              </td>
            </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

