import { useState } from 'react';
import LoginPage from './modules/auth/pages/LoginPage';
import type { AuthSession } from './modules/auth/types/authTypes';
import UserListPage from './modules/users/pages/UserListPage';
import UserDetailPage from './modules/users/pages/UserDetailPage';

export default function App() {
  const [session, setSession] = useState<AuthSession | null>({
    accessToken: 'demo-token',
    tokenType: 'Bearer',
    userId: 1,
    username: 'admin',
    fullName: 'Nguyễn Văn Quản Trị',
    roles: ['VT-07'],
  });

  const [activeTab, setActiveTab] = useState<'USERS' | 'DETAIL'>('USERS');
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [simulatedRole, setSimulatedRole] = useState<'VT-07' | 'VT-03'>('VT-07');

  if (!session) return <LoginPage onAuthenticated={setSession} />;

  const currentRoles = simulatedRole === 'VT-07' ? ['VT-07'] : ['VT-03'];

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="header-left">
          <strong className="app-brand">⚡ ServiceOps</strong>
          <nav className="app-nav">
            <button
              type="button"
              className={`nav-link ${activeTab === 'USERS' ? 'nav-link--active' : ''}`}
              onClick={() => setActiveTab('USERS')}
            >
              👤 Quản lý tài khoản (NCL-01-CN-002)
            </button>
          </nav>
        </div>

        <div className="header-right">
          <div className="role-switcher">
            <span className="switcher-label">Giả lập vai trò (TC-04):</span>
            <select
              className="switcher-select"
              value={simulatedRole}
              onChange={(e) => setSimulatedRole(e.target.value as 'VT-07' | 'VT-03')}
            >
              <option value="VT-07">Quản trị viên (VT-07)</option>
              <option value="VT-03">Nhân viên chuyên môn (VT-03)</option>
            </select>
          </div>

          <span className="user-greeting">
            Xin chào, <strong>{session.fullName}</strong>
          </span>
          <button type="button" className="btn-logout" onClick={() => setSession(null)}>
            Đăng xuất
          </button>
        </div>
      </header>

      <main className="app-content">
        {activeTab === 'DETAIL' && selectedUserId ? (
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
