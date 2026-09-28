import { PORTAL_STATUS_LABEL, type PortalAccountStatus } from '../types/portalAccountTypes';

/** Nhãn trạng thái tài khoản cổng — dùng chung kiểu `status-pill` với màn hình Quản lý tài khoản. */
export default function PortalAccountStatusBadge({ status }: { status: string }) {
  const label = PORTAL_STATUS_LABEL[status as PortalAccountStatus] ?? status;
  const tone = status === 'ACTIVE' ? 'active' : status === 'LOCKED' ? 'locked' : 'inactive';
  return (
    <span className={`status-pill status-pill--${tone}`}>
      <i className="status-pill__dot" /> {label}
    </span>
  );
}
