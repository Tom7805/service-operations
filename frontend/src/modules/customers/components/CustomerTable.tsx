import { memo, useCallback, useEffect, useRef, useState } from 'react';
import type { Customer } from '../types/customerTypes';
import { ICONS } from '../../../components/common/icons';
import RowActionsMenu, { type RowAction } from '../../../components/common/RowActionsMenu';
import TableSkeleton from '../../../components/common/TableSkeleton';

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

const TABLE_HEAD = (
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
);

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
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
  }, []);

  // Ổn định tham chiếu để các hàng memo không render lại khi chỉ trang cha đổi state.
  const handleCopyCode = useCallback((code: string) => {
    navigator.clipboard.writeText(code).then(() => {
      setCopiedCode(code);
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => setCopiedCode(null), 2000);
    });
  }, []);

  if (loading) {
    // Khung xương đúng 7 cột của bảng thật — bố cục không nhảy khi dữ liệu về.
    return (
      <div className="table-responsive">
        <table className="user-data-table customer-data-table" aria-busy="true">
          {TABLE_HEAD}
          <tbody>
            <TableSkeleton columns={7} rows={6} />
          </tbody>
        </table>
        <p className="sl-sr-only">Đang tải danh sách hồ sơ khách hàng...</p>
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
          <button type="button" className="btn btn-primary sl-empty-cta" onClick={onOpenCreate}>
            <span>+</span>
            <span>Tạo hồ sơ khách hàng đầu tiên</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="table-responsive sl-stack-host">
      <table className="user-data-table customer-data-table sl-stack-sm">
        {TABLE_HEAD}
        <tbody>
          {customers.map((cust) => (
            <CustomerRow
              key={cust.id ?? cust.code}
              cust={cust}
              isCopied={copiedCode === cust.code}
              onNavigateDetail={onNavigateDetail}
              onEdit={canEdit ? onEdit : undefined}
              onOpenSegment={canManageSegment ? onOpenSegment : undefined}
              onCopyCode={handleCopyCode}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface CustomerRowProps {
  cust: Customer;
  isCopied: boolean;
  onNavigateDetail?: (customer: Customer) => void;
  onEdit?: (customer: Customer) => void;
  onOpenSegment?: (customer: Customer) => void;
  onCopyCode: (code: string) => void;
}

/** Một hàng khách hàng — memo: gõ tìm kiếm/lọc chỉ render lại hàng thật sự đổi. */
const CustomerRow = memo(function CustomerRow({
  cust,
  isCopied,
  onNavigateDetail,
  onEdit,
  onOpenSegment,
  onCopyCode,
}: CustomerRowProps) {
  const isMerged = cust.status === 'MERGED';

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
  if (onEdit) {
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
  if (onOpenSegment) {
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
    label: isCopied ? 'Đã sao chép mã!' : 'Sao chép mã khách hàng',
    icon: isCopied ? ICONS.check : ICONS.copy,
    onClick: () => onCopyCode(cust.code),
  });

  const nameContent = (
    <>
      <span className="customer-avatar-icon" aria-hidden="true">{ICONS.building}</span>
      <span className="customer-name-meta">
        <span className="customer-company-name">
          {cust.name}
          {isMerged && (
            <span
              className="merged-status-badge"
              data-testid={`merged-badge-${cust.id}`}
              title={cust.mergedIntoId ? `Đã gộp vào hồ sơ #${cust.mergedIntoId}` : 'Hồ sơ đã bị gộp'}
            >
              Đã gộp
            </span>
          )}
        </span>
        <span className="customer-code-sub">{cust.code}</span>
        <span className="customer-taxcode-sub">{cust.taxCode ? `MST: ${cust.taxCode}` : 'Chưa có MST'}</span>
      </span>
    </>
  );

  return (
    <tr className={`customer-table-row ${isMerged ? 'customer-table-row--merged' : ''}`}>
      <td className="sl-stack-sm__primary">
        {onNavigateDetail ? (
          // Ô tên là một <button> thật (trước đây là <div onClick>): bấm được bằng bàn phím,
          // có vòng focus, và trình đọc màn hình đọc ra là một nút.
          <button
            type="button"
            className="customer-name-cell customer-name-cell--clickable sl-cell-button"
            onClick={() => onNavigateDetail(cust)}
            title="Nhấp để xem chi tiết & người liên hệ"
          >
            {nameContent}
          </button>
        ) : (
          <div className="customer-name-cell">{nameContent}</div>
        )}
      </td>
      <td data-label="Ngành">
        {cust.industry ? <span className="industry-tag">{cust.industry}</span> : <span className="cell-muted">—</span>}
      </td>
      <td data-label="Quy mô">
        {cust.companySize ? (
          <span className="company-size-tag" data-testid={`segment-size-${cust.id}`}>
            {cust.companySize}
          </span>
        ) : (
          <span className="cell-muted">—</span>
        )}
      </td>
      <td data-label="Ưu tiên">
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
      <td data-label="Địa chỉ" className="sl-stack-sm__wide">
        {cust.address ? (
          <span className="address-text customer-address-cell" title={cust.address}>
            {cust.address}
          </span>
        ) : (
          <span className="cell-muted">—</span>
        )}
      </td>
      <td data-label="Ngày tạo">
        <span className="cell-date">{formatDate(cust.createdAt)}</span>
      </td>
      <td className="customer-actions-cell sl-stack-sm__menu">
        <RowActionsMenu actions={actions} ariaLabel={`Thao tác cho ${cust.name}`} />
      </td>
    </tr>
  );
});
