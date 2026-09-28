import { useCallback, useEffect, useState } from 'react';
import { ICONS } from '../../components/common/icons';
import PortalLayout from '../../layouts/PortalLayout';
import ChangePasswordPage from '../auth/pages/ChangePasswordPage';
import type { AuthSession } from '../auth/types/authTypes';
import { fetchPortalAcceptances } from './api/portalApi';
import PortalAcceptanceDetailPage from './pages/PortalAcceptanceDetailPage';
import PortalAcceptancePage from './pages/PortalAcceptancePage';
import PortalDashboardPage from './pages/PortalDashboardPage';
import PortalInvoiceDetailPage from './pages/PortalInvoiceDetailPage';
import PortalInvoicePage from './pages/PortalInvoicePage';
import PortalProjectDetailPage from './pages/PortalProjectDetailPage';
import { isPortalHash, parsePortalHash, portalHash, type PortalRoute } from './utils/portalRoute';

interface Props {
  session: AuthSession;
  onLogout: () => void;
}

const INVALID_TEXT = {
  'invalid-project': { noun: 'dự án', back: 'Về danh sách dự án' },
  'invalid-acceptance': { noun: 'phiếu nghiệm thu', back: 'Về danh sách phiếu nghiệm thu' },
  'invalid-invoice': { noun: 'hóa đơn', back: 'Về danh sách hóa đơn' },
} as const;

function currentRoute(): PortalRoute {
  return parsePortalHash(window.location.hash);
}

/**
 * Ứng dụng cổng khách hàng cho tài khoản VT-09 (Epic NCL-13). Điều hướng bằng hash `#/portal/...` để khách hàng mở
 * lại/nhập trực tiếp đường dẫn một dự án hay phiếu; mọi kiểm tra phạm vi dữ liệu (QTN-26) nằm ở backend.
 */
export default function PortalApp({ session, onLogout }: Props) {
  const [route, setRoute] = useState<PortalRoute>(currentRoute);
  const [pendingAcceptances, setPendingAcceptances] = useState(0);

  useEffect(() => {
    // Đăng nhập xong mà chưa ở đường dẫn cổng → đưa về danh sách dự án (giữ nguyên nếu khách hàng mở sẵn một trang).
    if (!isPortalHash(window.location.hash)) window.history.replaceState(null, '', portalHash({ view: 'projects' }));
    setRoute(currentRoute());
    const onHash = () => setRoute(currentRoute());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  // Số phiếu nghiệm thu chờ khách hàng xác nhận — huy hiệu trên mục "Nghiệm thu" (NCL-13-CN-003).
  const refreshPending = useCallback(() => {
    fetchPortalAcceptances({ status: 'PENDING_CONFIRMATION' })
      .then((list) => setPendingAcceptances(list.length))
      .catch(() => setPendingAcceptances(0));
  }, []);

  useEffect(() => {
    refreshPending();
  }, [refreshPending]);

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
  const toAcceptances = (projectId?: number | null) => navigate({ view: 'acceptances', projectId: projectId ?? null });
  const inAcceptances = route.view === 'acceptances' || route.view === 'acceptance' || route.view === 'invalid-acceptance';
  const inInvoices = route.view === 'invoices' || route.view === 'invoice' || route.view === 'invalid-invoice';
  const toInvoices = () => navigate({ view: 'invoices' });

  return (
    <PortalLayout
      fullName={session.fullName}
      username={session.username}
      navItems={[
        {
          key: 'projects',
          label: 'Dự án',
          icon: ICONS.folder,
          active: route.view !== 'change-password' && !inAcceptances && !inInvoices,
          onSelect: toProjects,
        },
        {
          key: 'acceptances',
          label: 'Nghiệm thu',
          icon: ICONS.checkCircle,
          active: inAcceptances,
          badge: pendingAcceptances,
          onSelect: () => toAcceptances(),
        },
        {
          key: 'invoices',
          label: 'Hóa đơn',
          icon: ICONS.receipt,
          active: inInvoices,
          onSelect: toInvoices,
        },
      ]}
      onChangePassword={() => navigate({ view: 'change-password' })}
      onLogout={logout}
    >
      {route.view === 'change-password' ? (
        <ChangePasswordPage onBack={toProjects} onPasswordChanged={logout} />
      ) : route.view === 'project' ? (
        <PortalProjectDetailPage
          key={route.projectId}
          projectId={route.projectId}
          onBack={toProjects}
          onOpenAcceptances={(projectId) => toAcceptances(projectId)}
        />
      ) : route.view === 'acceptances' ? (
        <PortalAcceptancePage
          projectId={route.projectId}
          onChangeProject={(projectId) => toAcceptances(projectId)}
          onOpen={(certificateId) => navigate({ view: 'acceptance', certificateId })}
        />
      ) : route.view === 'acceptance' ? (
        <PortalAcceptanceDetailPage
          key={route.certificateId}
          certificateId={route.certificateId}
          signerName={session.fullName}
          onBack={() => toAcceptances()}
          onOpenProject={(projectId) => navigate({ view: 'project', projectId })}
          onDecided={refreshPending}
        />
      ) : route.view === 'invoices' ? (
        <PortalInvoicePage onOpen={(invoiceId) => navigate({ view: 'invoice', invoiceId })} />
      ) : route.view === 'invoice' ? (
        <PortalInvoiceDetailPage key={route.invoiceId} invoiceId={route.invoiceId} onBack={toInvoices} />
      ) : route.view === 'invalid-project' || route.view === 'invalid-acceptance' || route.view === 'invalid-invoice' ? (
        <div className="access-denied-container" data-testid="portal-invalid-project">
          <div className="access-denied-card">
            <div className="access-denied-icon">{ICONS.alertTriangle}</div>
            <h2>Đường dẫn không hợp lệ</h2>
            <p>
              Mã {INVALID_TEXT[route.view].noun} "{route.raw}" không đúng định dạng. Vui lòng mở từ danh sách trên cổng.
            </p>
            <button
              type="button"
              className="btn btn-primary"
              onClick={
                route.view === 'invalid-project' ? toProjects : route.view === 'invalid-invoice' ? toInvoices : () => toAcceptances()
              }
            >
              {INVALID_TEXT[route.view].back}
            </button>
          </div>
        </div>
      ) : (
        <PortalDashboardPage
          customerName={session.fullName}
          onOpenProject={(projectId) => navigate({ view: 'project', projectId })}
          pendingAcceptances={pendingAcceptances}
          onOpenAcceptances={() => toAcceptances()}
        />
      )}
    </PortalLayout>
  );
}
