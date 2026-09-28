import { useEffect } from 'react';
import { ICONS } from '../../../components/common/icons';
import { roleLabels } from '../../../utils/roleLabel';
import { fetchPortalAcceptances, fetchPortalInvoices, fetchPortalProjects } from '../api/portalApi';
import type { PortalFeature } from '../utils/portalRoute';

interface Props {
  currentUserRoles: string[];
  currentUserName: string;
  /** Chức năng cổng mà đường dẫn trỏ tới — quyết định API được gọi để backend ghi đúng tên chức năng bị từ chối. */
  feature?: PortalFeature;
  onLeave: () => void;
}

const FEATURE_TEXT = {
  projects: {
    title: 'Cổng theo dõi dự án chỉ dành cho khách hàng',
    hint: 'Tài khoản nội bộ xem tiến độ ở mục Dự án.',
  },
  acceptances: {
    title: 'Duyệt phiếu nghiệm thu trên cổng chỉ dành cho khách hàng',
    hint: 'Tài khoản nội bộ xử lý phiếu ở mục Nghiệm thu.',
  },
  invoices: {
    title: 'Xem hóa đơn và công nợ trên cổng chỉ dành cho khách hàng',
    hint: 'Tài khoản nội bộ xem hóa đơn ở mục Hóa đơn.',
  },
} as const;

/**
 * Tài khoản nội bộ mở đường dẫn cổng khách hàng (`#/portal/...`) — NCL-13-CN-002-TC-04, NCL-13-CN-003-TC-03. Gọi thật
 * API cổng tương ứng để backend trả 403 và ghi nhật ký "Từ chối truy cập" kèm tên chức năng; kết quả không dùng tới.
 */
export default function PortalAccessDeniedPage({ currentUserRoles, currentUserName, feature = 'projects', onLeave }: Props) {
  useEffect(() => {
    const call =
      feature === 'acceptances' ? fetchPortalAcceptances() : feature === 'invoices' ? fetchPortalInvoices() : fetchPortalProjects();
    call.catch(() => undefined);
  }, [feature]);

  const text = FEATURE_TEXT[feature];

  return (
    <div className="access-denied-container" data-testid="portal-internal-denied">
      <div className="access-denied-card">
        <div className="access-denied-icon">{ICONS.shieldOff}</div>
        <h2>{text.title}</h2>
        <p>
          {text.hint} Lần truy cập đã được ghi vào nhật ký.
        </p>
        <div className="security-log-badge">
          <span className="security-log-badge__item">
            {ICONS.shield} Thời điểm ghi nhận: {new Date().toLocaleString('vi-VN')}
          </span>
          <span className="security-log-badge__item">Tài khoản: {currentUserName}</span>
          <span className="security-log-badge__item">
            Vai trò tài khoản: {roleLabels(currentUserRoles) || '(không xác định)'}
          </span>
        </div>
        <div style={{ marginTop: '20px' }}>
          <button type="button" className="btn btn-primary" onClick={onLeave} data-testid="portal-internal-denied-leave">
            Về trang làm việc
          </button>
        </div>
      </div>
    </div>
  );
}
