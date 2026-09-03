import { useState } from 'react';
import type { Customer } from '../types/customerTypes';
import { ICONS } from '../../../components/common/icons';
import RowActionsMenu, { type RowAction } from '../../../components/common/RowActionsMenu';

interface CustomerTableProps {
  customers: Customer[];
  loading?: boolean;
  onOpenCreate?: () => void;
  canCreate?: boolean;
  onNavigateDetail?: (customer: Customer) => void;
  // NCL-02-CN-005: mở biểu mẫu gán ngành nghề, quy mô và mức độ ưu tiên cho một khách hàng.
  canManageSegment?: boolean;
  onOpenSegment?: (customer: Customer) => void;
  // Chỉnh sửa thông tin hồ sơ (Tên / MST / SĐT / Ngành / Địa chỉ).
  canEdit?: boolean;
  onEdit?: (customer: Customer) => void;
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
  canEdit = false,
  onEdit,
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
        <div className="table-empty-state__icon"><span className="icon-lg">{ICONS.building}</span></div>
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

  const buildActions = (cust: Customer, isMerged: boolean): RowAction[] => {
    const actions: RowAction[] = [];

    if (onNavigateDetail) {
      actions.push({
        key: 'detail',
        label: 'Xem chi tiết & người liên hệ',
        icon: ICONS.users,
        onClick: () => onNavigateDetail(cust),
        disabled: isMerged,
        disabledReason: 'Hồ sơ đã bị gộp — không thể quản lý người liên hệ tiếp',
        testId: `btn-manage-contacts-${cust.id}`,
      });
    }

    if (canEdit && onEdit) {
      actions.push({
        key: 'edit',
        label: 'Chỉnh sửa hồ sơ',
        icon: ICONS.edit,
        onClick: () => onEdit(cust),
        disabled: isMerged,
        disabledReason: 'Hồ sơ đã bị gộp — không thể chỉnh sửa',
        testId: `btn-edit-${cust.id}`,
      });
    }

    if (canManageSegment && onOpenSegment) {
      actions.push({
        key: 'segment',
        label: 'Phân nhóm (ngành / quy mô / ưu tiên)',
        icon: ICONS.tag,
        onClick: () => onOpenSegment(cust),
        disabled: isMerged,
        disabledReason: 'Hồ sơ đã bị gộp — không thể phân nhóm tiếp (NCL-02-CN-006)',
        testId: `btn-open-segment-${cust.id}`,
      });
    }

    actions.push({
      key: 'copy',
      label: copiedCode === cust.code ? 'Đã sao chép mã!' : 'Sao chép mã khách hàng',
      icon: copiedCode === cust.code ? ICONS.check : ICONS.copy,
      onClick: () => handleCopyCode(cust.code),
    });

    return actions;
  };

  return (
    <div className="table-responsive">
      <table className="user-data-table customer-data-table">
        <thead>
          <tr>
            <th>Khách hàng</th>
            <th>Lĩnh vực / Ngành</th>
            <th>Quy mô</th>
            <th>Ưu tiên</th>
            <th>Địa chỉ trụ sở</th>
            <th>Ngày tạo</th>
            <th aria-label="Thao tác" />
          </tr>
        </thead>
        <tbody>
          {customers.map((cust) => {
            const isMerged = cust.status === 'MERGED';
            return (
            <tr key={cust.id ?? cust.code} className={`customer-table-row ${isMerged ? 'customer-table-row--merged' : ''}`}>
              <td>
                <div
                  className={`customer-name-cell ${onNavigateDetail ? 'customer-name-cell--clickable' : ''}`}
                  onClick={() => onNavigateDetail?.(cust)}
                  title={onNavigateDetail ? 'Nhấp để xem chi tiết & người liên hệ' : undefined}
                >
                  <div className="customer-avatar-icon">{ICONS.building}</div>
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
                    <span className="customer-code-sub">{cust.code}</span>
                    <span className="customer-taxcode-sub">
                      {cust.taxCode ? `MST: ${cust.taxCode}` : 'Chưa có MST'}
                    </span>
                  </div>
                </div>
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
                  <span className="address-text customer-address-cell" title={cust.address}>
                    {cust.address}
                  </span>
                ) : (
                  <span className="cell-muted">—</span>
                )}
              </td>
              <td>
                <span className="cell-date">{formatDate(cust.createdAt)}</span>
              </td>
              <td className="customer-actions-cell">
                <RowActionsMenu
                  actions={buildActions(cust, isMerged)}
                  ariaLabel={`Thao tác cho ${cust.name}`}
                />
              </td>
            </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
