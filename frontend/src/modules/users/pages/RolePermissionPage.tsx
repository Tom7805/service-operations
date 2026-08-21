import React, { useCallback, useEffect, useState } from 'react';
import type { DepartmentInfo, ScopeType, User, UserAuditLog } from '../types/userTypes';
import { SYSTEM_ROLES } from '../types/userTypes';
import { getDepartmentsList, getUsers, updateUserRoleScope } from '../api/usersApi';
import RoleScopeModal from '../components/RoleScopeModal';
import RoleMatrixTable from '../components/RoleMatrixTable';

interface RolePermissionPageProps {
  currentUserRoles?: string[];
  currentUserName?: string;
}

export const RolePermissionPage: React.FC<RolePermissionPageProps> = ({
  currentUserRoles = ['VT-07'],
  currentUserName = 'Quản trị viên',
}) => {
  // TC-04: Security guard - Only VT-07 (Quản trị viên) has permission
  const isAdmin = currentUserRoles.includes('VT-07');

  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<DepartmentInfo[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Tab & Filters
  const [activeTab, setActiveTab] = useState<'USERS' | 'ROLES'>('USERS');
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  const [filterRole, setFilterRole] = useState<string>('ALL');
  const [filterScope, setFilterScope] = useState<string>('ALL');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [targetUser, setTargetUser] = useState<User | null>(null);

  // Realtime Audit Logs (TC-05)
  const [auditLogs, setAuditLogs] = useState<UserAuditLog[]>([
    {
      id: 'audit-perm-1',
      timestamp: new Date(Date.now() - 3600000).toLocaleTimeString('vi-VN') + ' ' + new Date().toLocaleDateString('vi-VN'),
      action: 'Cấu hình phân quyền',
      performedBy: 'Quản trị viên',
      targetUser: 'admin',
      details: 'Gán vai trò [VT-07] với phạm vi Toàn công ty (COMPANY)',
    },
  ]);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const addAuditLog = (action: string, targetUser: string, details: string) => {
    const newLog: UserAuditLog = {
      id: `audit-perm-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString('vi-VN') + ' ' + new Date().toLocaleDateString('vi-VN'),
      action,
      performedBy: currentUserName,
      targetUser,
      details,
    };
    setAuditLogs((prev) => [newLog, ...prev]);
  };

  const fetchData = useCallback(async () => {
    if (!isAdmin) return;
    setLoading(true);
    setError(null);
    try {
      const [usersRes, deptsRes] = await Promise.all([
        getUsers(),
        getDepartmentsList().catch(() => []),
      ]);
      setUsers(usersRes);
      setDepartments(deptsRes);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tải dữ liệu phân quyền người dùng.');
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handlers
  const handleOpenConfigure = (user: User) => {
    setTargetUser(user);
    setIsModalOpen(true);
  };

  const handleSaveRoleScope = async (
    userId: number,
    roleCodes: string[],
    scopeType: ScopeType,
    scopeDepartmentId?: number | null
  ) => {
    const target = users.find((u) => u.id === userId);
    if (!target) return;

    await updateUserRoleScope(userId, {
      fullName: target.fullName,
      email: target.email,
      departmentId: target.departmentId,
      roleCodes,
      scopeType,
      scopeDepartmentId,
    });

    const scopeDesc =
      scopeType === 'COMPANY'
        ? 'Toàn công ty'
        : scopeType === 'DEPARTMENT'
        ? `Nhánh bộ phận (ID: ${scopeDepartmentId})`
        : 'Cá nhân (SELF)';

    showToast(`Đã cập nhật phân quyền cho tài khoản @${target.username} thành công`);
    addAuditLog(
      'Cập nhật vai trò & phạm vi',
      target.username,
      `Gán vai trò [${roleCodes.join(', ')}] với phạm vi dữ liệu: ${scopeDesc}`
    );
    await fetchData();
  };

  // TC-04 Render Access Denied screen for non-admin users
  if (!isAdmin) {
    return (
      <div className="access-denied-container">
        <div className="access-denied-card">
          <div className="access-denied-icon">🚫</div>
          <span className="eyebrow text-danger">Từ chối truy cập (Access Denied)</span>
          <h2>Bạn không có thẩm quyền truy cập màn hình này</h2>
          <p>
            Chức năng Phân quyền theo vai trò và phạm vi dữ liệu chỉ dành riêng cho vai trò <strong>Quản trị viên (VT-07)</strong>.
            Hệ thống đã lưu lại lần truy cập trái phép này vào nhật ký an ninh.
          </p>
          <div className="security-log-badge">
            <span>🛡️ Lần thử truy cập: {new Date().toLocaleString('vi-VN')}</span>
            <span>Tài khoản: {currentUserName}</span>
          </div>
        </div>
      </div>
    );
  }

  // Filtered Users computation
  const filteredUsers = users.filter((u) => {
    const matchesKeyword =
      searchKeyword.trim() === '' ||
      u.username.toLowerCase().includes(searchKeyword.toLowerCase()) ||
      u.fullName.toLowerCase().includes(searchKeyword.toLowerCase()) ||
      (u.email && u.email.toLowerCase().includes(searchKeyword.toLowerCase()));

    const matchesRole = filterRole === 'ALL' || (u.roleCodes && u.roleCodes.includes(filterRole));

    const matchesScope =
      filterScope === 'ALL' ||
      (filterScope === 'COMPANY' && (!u.scopeType || u.scopeType === 'COMPANY')) ||
      (filterScope === 'DEPARTMENT' && u.scopeType === 'DEPARTMENT') ||
      (filterScope === 'SELF' && (u.scopeType === 'SELF' || u.scopeType === 'PERSONAL'));

    return matchesKeyword && matchesRole && matchesScope;
  });

  // KPI Calculations
  const totalUsers = users.length;
  const companyScopeUsers = users.filter((u) => !u.scopeType || u.scopeType === 'COMPANY').length;
  const deptScopeUsers = users.filter((u) => u.scopeType === 'DEPARTMENT').length;
  const selfScopeUsers = users.filter((u) => u.scopeType === 'SELF' || u.scopeType === 'PERSONAL').length;

  return (
    <div className="user-management-page">
      {/* Toast Notification */}
      {toastMessage && (
        <div className={`toast-notification toast--${toastMessage.type}`} role="status">
          <span className="toast__icon">{toastMessage.type === 'success' ? '✅' : '⚠️'}</span>
          <span>{toastMessage.text}</span>
          <button type="button" className="toast__close" onClick={() => setToastMessage(null)}>
            ✕
          </button>
        </div>
      )}

      {/* Page Header */}
      <div className="page-header">
        <div>
          <div className="breadcrumb">
            <span>Hệ thống</span> / <span>Quản trị & Phân quyền</span> / <span className="active">Phân quyền vai trò & Phạm vi dữ liệu</span>
          </div>
          <h1 className="page-title">Phân quyền vai trò & Phạm vi dữ liệu (NCL-01-CN-004)</h1>
          <p className="page-subtitle">
            Thiết lập vai trò chức năng (VT-01..VT-09) và phạm vi truy cập dữ liệu (Toàn công ty, Nhánh bộ phận, Cá nhân) theo chuẩn QTN-01.
          </p>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-card__icon stat-card__icon--purple">🛡️</div>
          <div>
            <span className="stat-card__label">Vai trò hệ thống</span>
            <strong className="stat-card__value">9 Vai trò</strong>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card__icon stat-card__icon--blue">👥</div>
          <div>
            <span className="stat-card__label">Tổng tài khoản</span>
            <strong className="stat-card__value">{totalUsers}</strong>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card__icon stat-card__icon--green">🌐</div>
          <div>
            <span className="stat-card__label">Phạm vi Toàn công ty</span>
            <strong className="stat-card__value text-success">{companyScopeUsers}</strong>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card__icon stat-card__icon--blue">🏢</div>
          <div>
            <span className="stat-card__label">Phạm vi Nhánh bộ phận</span>
            <strong className="stat-card__value">{deptScopeUsers}</strong>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card__icon stat-card__icon--red">👤</div>
          <div>
            <span className="stat-card__label">Phạm vi Chỉ cá nhân</span>
            <strong className="stat-card__value text-warning">{selfScopeUsers}</strong>
          </div>
        </div>
      </div>

      {/* Global Error Banner */}
      {error && (
        <div className="alert alert--error mb-4" role="alert">
          <span>⚠️ {error}</span>
          <button type="button" className="btn-secondary text-dark ml-auto" onClick={fetchData}>
            Thử lại
          </button>
        </div>
      )}

      {/* Main Tab Navigation & Toolbar */}
      <div className="user-table-card" style={{ marginBottom: '20px' }}>
        <div className="user-table-toolbar">
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div className="status-tabs">
              <button
                type="button"
                className={`status-tab ${activeTab === 'USERS' ? 'status-tab--active' : ''}`}
                onClick={() => setActiveTab('USERS')}
              >
                👥 Bảng phân quyền tài khoản ({users.length})
              </button>
              <button
                type="button"
                className={`status-tab ${activeTab === 'ROLES' ? 'status-tab--active' : ''}`}
                onClick={() => setActiveTab('ROLES')}
              >
                🛡️ Ma trận vai trò & quyền hạn (9)
              </button>
            </div>
          </div>

          {activeTab === 'USERS' && (
            <div className="toolbar-filters">
              {/* Search Box */}
              <div className="search-box">
                <span className="search-box__icon">🔍</span>
                <input
                  type="text"
                  className="search-box__input"
                  placeholder="Tìm tài khoản, họ tên, email..."
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                />
                {searchKeyword && (
                  <button type="button" className="search-box__clear" onClick={() => setSearchKeyword('')}>
                    ✕
                  </button>
                )}
              </div>

              {/* Role Filter */}
              <div className="filter-group">
                <span className="filter-label">Vai trò:</span>
                <select
                  className="filter-select"
                  value={filterRole}
                  onChange={(e) => setFilterRole(e.target.value)}
                >
                  <option value="ALL">-- Tất cả vai trò --</option>
                  {SYSTEM_ROLES.map((r) => (
                    <option key={r.code} value={r.code}>
                      {r.code} - {r.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Data Scope Filter */}
              <div className="filter-group">
                <span className="filter-label">Phạm vi:</span>
                <select
                  className="filter-select"
                  value={filterScope}
                  onChange={(e) => setFilterScope(e.target.value)}
                >
                  <option value="ALL">-- Tất cả phạm vi --</option>
                  <option value="COMPANY">🌐 Toàn công ty (COMPANY)</option>
                  <option value="DEPARTMENT">🏢 Nhánh bộ phận (DEPARTMENT)</option>
                  <option value="SELF">👤 Chỉ cá nhân (SELF)</option>
                </select>
              </div>

              <button
                type="button"
                className="btn-icon-refresh"
                onClick={fetchData}
                title="Làm mới dữ liệu từ máy chủ"
              >
                🔄
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Content Rendering by Active Tab */}
      {activeTab === 'ROLES' ? (
        <RoleMatrixTable
          users={users}
          onSelectRoleFilter={(code) => {
            setFilterRole(code);
            setActiveTab('USERS');
          }}
        />
      ) : (
        <div className="user-table-card">
          <div className="table-responsive">
            <table className="user-data-table">
              <thead>
                <tr>
                  <th>Tài Khoản & Nhân Sự</th>
                  <th>Bộ Phận Trực Thuộc</th>
                  <th>Vai Trò Được Gán</th>
                  <th>Phạm Vi Dữ Liệu (Scope)</th>
                  <th>Trạng Thái</th>
                  <th style={{ textAlign: 'right' }}>Thao Tác</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                      <div className="loader" style={{ margin: '0 auto 10px', borderColor: '#10b981', borderTopColor: 'transparent' }} />
                      Đang tải dữ liệu phân quyền...
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                      Không tìm thấy tài khoản nào khớp với bộ lọc.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => {
                    const deptObj = departments.find((d) => d.id === u.departmentId);
                    const scopeDeptObj = departments.find((d) => d.id === u.scopeDepartmentId);
                    const isSelf = u.scopeType === 'SELF' || u.scopeType === 'PERSONAL';
                    const isDept = u.scopeType === 'DEPARTMENT';
                    const isCompany = !u.scopeType || u.scopeType === 'COMPANY';

                    return (
                      <tr key={u.id}>
                        <td>
                          <div className="user-profile-cell">
                            <div className="avatar-circle">{u.fullName.charAt(0).toUpperCase()}</div>
                            <div className="user-profile-meta">
                              <span className="user-profile-fullname">{u.fullName}</span>
                              <span className="user-profile-username">@{u.username}</span>
                              {u.email && <span className="cell-email">{u.email}</span>}
                            </div>
                          </div>
                        </td>

                        <td>
                          {deptObj ? (
                            <span className="cell-dept">📂 {deptObj.name}</span>
                          ) : (
                            <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Chưa phân bổ</span>
                          )}
                        </td>

                        <td>
                          <div className="user-tags-wrap">
                            {u.roleCodes && u.roleCodes.length > 0 ? (
                              u.roleCodes.map((code) => {
                                const roleInfo = SYSTEM_ROLES.find((r) => r.code === code);
                                const badgeClass = roleInfo ? roleInfo.badgeClass : 'badge--gray';
                                return (
                                  <span key={code} className={`user-tag ${badgeClass}`} title={roleInfo?.name}>
                                    <strong className="user-tag__code">{code}</strong>
                                    <span>{roleInfo?.name || code}</span>
                                  </span>
                                );
                              })
                            ) : (
                              <span className="user-tag badge--gray">Chưa gán vai trò</span>
                            )}
                          </div>
                        </td>

                        <td>
                          {isCompany && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span className="status-pill status-pill--active" style={{ background: '#ecfdf5', color: '#059669', fontSize: '11.5px' }}>
                                🌐 Toàn công ty (COMPANY)
                              </span>
                            </div>
                          )}

                          {isDept && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                              <span className="status-pill" style={{ background: '#eff6ff', color: '#1d4ed8', fontSize: '11.5px' }}>
                                🏢 Nhánh bộ phận (DEPARTMENT)
                              </span>
                              <span style={{ fontSize: '11.5px', color: '#475569', paddingLeft: '4px' }}>
                                ↳ {scopeDeptObj ? scopeDeptObj.name : `Bộ phận ID: ${u.scopeDepartmentId ?? 'N/A'}`}
                              </span>
                            </div>
                          )}

                          {isSelf && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span className="status-pill" style={{ background: '#fef3c7', color: '#b45309', fontSize: '11.5px' }}>
                                👤 Chỉ cá nhân (SELF)
                              </span>
                            </div>
                          )}
                        </td>

                        <td>
                          {u.status === 'ACTIVE' ? (
                            <span className="status-pill status-pill--active">
                              <span className="status-pill__dot" /> Hoạt động
                            </span>
                          ) : (
                            <span className="status-pill status-pill--locked">
                              <span className="status-pill__dot" /> Đã khóa
                            </span>
                          )}
                        </td>

                        <td style={{ textAlign: 'right' }}>
                          <button
                            type="button"
                            className="btn-primary"
                            style={{ padding: '6px 14px', fontSize: '12.5px' }}
                            onClick={() => handleOpenConfigure(u)}
                            title="Cấu hình vai trò & phạm vi dữ liệu"
                          >
                            ⚙️ Phân quyền
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Audit Log Stream for TC-05 */}
      <div className="audit-log-card" style={{ marginTop: '24px' }}>
        <div className="audit-log-header">
          <h3 className="audit-log-title">📋 Nhật ký phân quyền & phạm vi dữ liệu (Audit Log)</h3>
          <span className="badge-pulse">Lưu vết 100% realtime</span>
        </div>
        <div className="audit-log-list">
          {auditLogs.map((log) => (
            <div key={log.id} className="audit-log-item">
              <div className="audit-log-icon">🛡️</div>
              <div className="audit-log-meta">
                <div className="audit-log-row">
                  <strong>{log.action}</strong> cho tài khoản <span className="highlight-username">@{log.targetUser}</span>
                  <span className="audit-log-time">{log.timestamp}</span>
                </div>
                <p className="audit-log-details">{log.details} • Thực hiện bởi <em>{log.performedBy}</em></p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Role & Scope Configuration Modal */}
      <RoleScopeModal
        isOpen={isModalOpen}
        user={targetUser}
        departmentsList={departments}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveRoleScope}
      />
    </div>
  );
};

export default RolePermissionPage;
