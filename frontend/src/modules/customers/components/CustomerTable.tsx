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
        <h3>Chưa có khách hàng nào</h3>
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
        disabledReason: 'Hồ sơ đã bị gộp — không thể phân nhóm tiếp',
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
      {/* Danh sách gọn: mỗi hàng một dòng — tên, mã và ba nhãn phân nhóm để lọc/nhận diện nhanh.
          Mã số thuế, địa chỉ, ngày tạo xem ở trang chi tiết (bấm vào hàng). */}
      <table className="user-data-table customer-data-table list-table">
        <thead>
          <tr>
            <th style={{ width: '38%' }}>Khách hàng</th>
            <th className="list-table__hide-sm" style={{ width: '24%' }}>Ngành</th>
            <th className="list-table__hide-sm" style={{ width: '17%' }}>Quy mô</th>
            <th style={{ width: '15%' }}>Ưu tiên</th>
            <th className="list-table__actions">
              <span className="visually-hidden">Thao tác</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {customers.map((cust) => {
            const isMerged = cust.status === 'MERGED';
            return (
            <tr
              key={cust.id ?? cust.code}
              className={`customer-table-row ${onNavigateDetail ? 'list-table__row' : ''} ${isMerged ? 'customer-table-row--merged' : ''}`}
              onClick={onNavigateDetail ? () => onNavigateDetail(cust) : undefined}
            >
              <td>
                <div className="user-profile-cell">
                  <div className="avatar-circle customer-avatar-icon">{ICONS.building}</div>
                  <div className="user-profile-meta">
                    <span className="list-table__inline">
                      {onNavigateDetail ? (
                        <button
                          type="button"
                          className="list-table__title customer-company-name"
                          onClick={(e) => {
                            e.stopPropagation();
                            onNavigateDetail(cust);
                          }}
                          title={cust.name}
                        >
                          {cust.name}
                        </button>
                      ) : (
                        <span className="list-table__title customer-company-name" title={cust.name}>
                          {cust.name}
                        </span>
                      )}
                      {isMerged && (
                        <span
                          className="list-chip merged-status-badge"
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
                    <span className="list-table__sub customer-code-sub">{cust.code}</span>
                  </div>
                </div>
              </td>
              <td className="list-table__hide-sm">
                {cust.industry ? (
                  <span className="list-table__clip" title={cust.industry}>{cust.industry}</span>
                ) : (
                  <span className="list-table__muted">—</span>
                )}
              </td>
              <td className="list-table__hide-sm">
                {cust.companySize ? (
                  <span className="list-table__clip" data-testid={`segment-size-${cust.id}`}>
                    {cust.companySize}
                  </span>
                ) : (
                  <span className="list-table__muted">—</span>
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
                  <span className="list-table__muted">—</span>
                )}
              </td>
              <td className="list-table__actions customer-actions-cell" onClick={(e) => e.stopPropagation()}>
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
