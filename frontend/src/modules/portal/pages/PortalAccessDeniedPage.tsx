import { useEffect } from 'react';
import { ICONS } from '../../../components/common/icons';
import { roleLabels } from '../../../utils/roleLabel';
import { fetchPortalProjects } from '../api/portalApi';

interface Props {
  currentUserRoles: string[];
  currentUserName: string;
  onLeave: () => void;
}

/**
 * NCL-13-CN-002-TC-04 — tài khoản nội bộ mở đường dẫn cổng khách hàng (`#/portal/...`). Gọi thật `GET /portal/projects`
 * để backend trả 403 và ghi nhật ký "Từ chối truy cập — Cổng theo dõi dự án"; kết quả không dùng tới.
 */
export default function PortalAccessDeniedPage({ currentUserRoles, currentUserName, onLeave }: Props) {
  useEffect(() => {
    fetchPortalProjects().catch(() => undefined);
  }, []);

  return (
    <div className="access-denied-container" data-testid="portal-internal-denied">
      <div className="access-denied-card">
        <div className="access-denied-icon">{ICONS.shieldOff}</div>
        <h2>Cổng theo dõi dự án chỉ dành cho khách hàng</h2>
        <p>
          Chức năng này chỉ dành cho tài khoản <strong>Khách hàng</strong> (VT-09) được cấp tài khoản cổng. Tài khoản nội
          bộ theo dõi tiến độ dự án ở các màn hình quản lý dự án. Hệ thống đã ghi lại lần từ chối truy cập này vào nhật
          ký hệ thống.
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
