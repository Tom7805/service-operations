import { useCallback, useEffect, useState } from 'react';
import { ICONS } from '../../components/common/icons';
import PortalLayout from '../../layouts/PortalLayout';
import ChangePasswordPage from '../auth/pages/ChangePasswordPage';
import type { AuthSession } from '../auth/types/authTypes';
import PortalDashboardPage from './pages/PortalDashboardPage';
import PortalProjectDetailPage from './pages/PortalProjectDetailPage';
import { isPortalHash, parsePortalHash, portalHash, type PortalRoute } from './utils/portalRoute';

interface Props {
  session: AuthSession;
  onLogout: () => void;
}

function currentRoute(): PortalRoute {
  return parsePortalHash(window.location.hash);
}

/**
 * Ứng dụng cổng khách hàng cho tài khoản VT-09 (Epic NCL-13). Điều hướng bằng hash `#/portal/...` để khách hàng mở
 * lại/nhập trực tiếp đường dẫn một dự án; mọi kiểm tra phạm vi dữ liệu (QTN-26) nằm ở backend.
 */
export default function PortalApp({ session, onLogout }: Props) {
  const [route, setRoute] = useState<PortalRoute>(currentRoute);

  useEffect(() => {
    // Đăng nhập xong mà chưa ở đường dẫn cổng → đưa về danh sách dự án (giữ nguyên nếu khách hàng mở sẵn một dự án).
    if (!isPortalHash(window.location.hash)) window.history.replaceState(null, '', portalHash({ view: 'projects' }));
    setRoute(currentRoute());
    const onHash = () => setRoute(currentRoute());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const navigate = useCallback((next: PortalRoute) => {
    const hash = portalHash(next);
    if (window.location.hash !== hash) window.location.hash = hash;
    setRoute(next);
    document.documentElement.scrollTop = 0;
  }, []);

  const logout = () => {
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
    onLogout();
  };

  const toProjects = () => navigate({ view: 'projects' });

  return (
    <PortalLayout
      fullName={session.fullName}
      username={session.username}
      navItems={[
        {
          key: 'projects',
          label: 'Dự án',
          icon: ICONS.folder,
          active: route.view !== 'change-password',
          onSelect: toProjects,
        },
      ]}
      onChangePassword={() => navigate({ view: 'change-password' })}
      onLogout={logout}
    >
      {route.view === 'change-password' ? (
        <ChangePasswordPage onBack={toProjects} onPasswordChanged={logout} />
      ) : route.view === 'project' ? (
        <PortalProjectDetailPage key={route.projectId} projectId={route.projectId} onBack={toProjects} />
      ) : route.view === 'invalid-project' ? (
        <div className="access-denied-container" data-testid="portal-invalid-project">
          <div className="access-denied-card">
            <div className="access-denied-icon">{ICONS.alertTriangle}</div>
            <h2>Đường dẫn dự án không hợp lệ</h2>
            <p>Mã dự án "{route.raw}" không đúng định dạng. Vui lòng mở dự án từ danh sách dự án của bạn.</p>
            <button type="button" className="btn btn-primary" onClick={toProjects}>
              Về danh sách dự án
            </button>
          </div>
        </div>
      ) : (
        <PortalDashboardPage
          customerName={session.fullName}
          onOpenProject={(projectId) => navigate({ view: 'project', projectId })}
        />
      )}
    </PortalLayout>
  );
}
