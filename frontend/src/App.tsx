import { useState } from 'react';
import LoginPage from './modules/auth/pages/LoginPage';
import type { AuthSession } from './modules/auth/types/authTypes';
import UserListPage from './modules/users/pages/UserListPage';
import UserDetailPage from './modules/users/pages/UserDetailPage';
import RolePermissionPage from './modules/users/pages/RolePermissionPage';
import DepartmentTreePage from './modules/departments/pages/DepartmentTreePage';
import MaskingRulePage from './modules/masking/pages/MaskingRulePage';
import SensitiveAccessLogPage from './modules/auditLog/pages/SensitiveAccessLogPage';

function readStoredSession(): AuthSession | null {
  const raw = localStorage.getItem('session');
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthSession;
  } catch {
    return null;
  }
}

export default function App() {
  const [session, setSession] = useState<AuthSession | null>(readStoredSession);

  const [activeTab, setActiveTab] = useState<'DEPARTMENTS' | 'PERMISSIONS' | 'USERS' | 'DETAIL' | 'MASKING' | 'AUDIT_LOG'>('DEPARTMENTS');
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [simulatedRole, setSimulatedRole] = useState<'VT-07' | 'VT-03' | 'VT-06'>('VT-07');

  function handleAuthenticated(newSession: AuthSession) {
    localStorage.setItem('token', newSession.accessToken);
    localStorage.setItem('session', JSON.stringify(newSession));
    setSession(newSession);
  }

  function handleLogout() {
    localStorage.removeItem('token');
    localStorage.removeItem('session');
    setSession(null);
  }

  if (!session) return <LoginPage onAuthenticated={handleAuthenticated} />;

  const currentRoles = [simulatedRole];

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="header-left">
          <strong className="app-brand">⚡ ServiceOps</strong>
          <nav className="app-nav">
            <button
              type="button"
              className={`nav-link ${activeTab === 'DEPARTMENTS' ? 'nav-link--active' : ''}`}
              onClick={() => setActiveTab('DEPARTMENTS')}
            >
              🏛️ Cây tổ chức
            </button>
            <button
              type="button"
              className={`nav-link ${activeTab === 'PERMISSIONS' ? 'nav-link--active' : ''}`}
              onClick={() => setActiveTab('PERMISSIONS')}
            >
              🛡️ Phân quyền & Phạm vi
            </button>
            <button
              type="button"
              className={`nav-link ${activeTab === 'USERS' || activeTab === 'DETAIL' ? 'nav-link--active' : ''}`}
              onClick={() => setActiveTab('USERS')}
            >
              👤 Tài khoản
            </button>
            <button
              type="button"
              className={`nav-link ${activeTab === 'MASKING' ? 'nav-link--active' : ''}`}
              onClick={() => setActiveTab('MASKING')}
            >
              🔐 Che dữ liệu nhạy cảm
            </button>
            <button
              type="button"
              className={`nav-link ${activeTab === 'AUDIT_LOG' ? 'nav-link--active' : ''}`}
              onClick={() => setActiveTab('AUDIT_LOG')}
            >
              🕵️ Nhật ký truy cập
            </button>
          </nav>
        </div>

        <div className="header-right">
          <div className="role-switcher">
            <span className="switcher-label">Giả lập vai trò:</span>
            <select
              className="switcher-select"
              value={simulatedRole}
              onChange={(e) => setSimulatedRole(e.target.value as 'VT-07' | 'VT-03' | 'VT-06')}
            >
              <option value="VT-07">Quản trị viên (VT-07)</option>
              <option value="VT-06">Nhân sự (VT-06)</option>
              <option value="VT-03">Nhân viên chuyên môn (VT-03)</option>
            </select>
          </div>

          <span className="user-greeting">
            Xin chào, <strong>{session.fullName}</strong>
          </span>
          <button type="button" className="btn-logout" onClick={handleLogout}>
            Đăng xuất
          </button>
        </div>
      </header>

      <main className="app-content">
        {activeTab === 'DEPARTMENTS' ? (
          <DepartmentTreePage
            currentUserRoles={currentRoles}
            currentUserName={session.fullName}
          />
        ) : activeTab === 'PERMISSIONS' ? (
          <RolePermissionPage
            currentUserRoles={currentRoles}
            currentUserName={session.fullName}
          />
        ) : activeTab === 'MASKING' ? (
          <MaskingRulePage
            currentUserRoles={currentRoles}
            currentUserName={session.fullName}
          />
        ) : activeTab === 'AUDIT_LOG' ? (
          <SensitiveAccessLogPage
            currentUserRoles={currentRoles}
            currentUserName={session.fullName}
          />
        ) : activeTab === 'DETAIL' && selectedUserId ? (
          <UserDetailPage userId={selectedUserId} onBack={() => setActiveTab('USERS')} />
        ) : (
          <UserListPage
            currentUserRoles={currentRoles}
            currentUserName={session.fullName}
            onNavigateDetail={(id) => {
              setSelectedUserId(id);
              setActiveTab('DETAIL');
            }}
          />
        )}
      </main>
    </div>
  );
}
