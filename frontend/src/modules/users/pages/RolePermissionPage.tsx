import React, { useCallback, useEffect, useState } from 'react';
import type { DepartmentInfo, ScopeType, User } from '../types/userTypes';
import { SYSTEM_ROLES } from '../types/userTypes';
import { getDepartmentsList, getUsers, updateUserRoleScope } from '../api/usersApi';
import RoleScopeModal from '../components/RoleScopeModal';
import RoleMatrixTable from '../components/RoleMatrixTable';
import { ICONS } from '../components/icons';
import TableSkeleton from '../../../components/common/TableSkeleton';

interface RolePermissionPageProps {
  currentUserRoles?: string[];
  currentUserName?: string;
  /** Mở trang Nhật ký hệ thống (đã tách riêng, có phân trang thật từ máy chủ). */
  onViewAuditLog?: () => void;
}

export const RolePermissionPage: React.FC<RolePermissionPageProps> = ({
  currentUserRoles = ['VT-07'],
  currentUserName = 'Quản trị viên',
  onViewAuditLog,
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

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
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

    showToast(`Đã cập nhật phân quyền cho tài khoản @${target.username} thành công`);
    await fetchData();
  };

  // TC-04 Render Access Denied screen for non-admin users
  if (!isAdmin) {
    return (
      <div className="access-denied-container">
        <div className="access-denied-card">
          <div className="access-denied-icon">{ICONS.shieldOff}</div>
          <span className="eyebrow text-danger">Từ chối truy cập (Access Denied)</span>
          <h2>Bạn không có thẩm quyền truy cập màn hình này</h2>
          <p>
            Chức năng Phân quyền theo vai trò và phạm vi dữ liệu chỉ dành riêng cho vai trò <strong>Quản trị viên</strong>.
            Hệ thống đã lưu lại lần truy cập trái phép này vào nhật ký an ninh.
          </p>
          <div className="security-log-badge">
            <span className="security-log-badge__item">{ICONS.shield} Lần thử truy cập: {new Date().toLocaleString('vi-VN')}</span>
            <span className="security-log-badge__item">Tài khoản: {currentUserName}</span>
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
        <div className={`toast-banner toast-banner--${toastMessage.type}`} role="status">
          <span className="toast-banner__icon">{toastMessage.type === 'success' ? ICONS.checkCircle : ICONS.alertTriangle}</span>
          <span>{toastMessage.text}</span>
          <button type="button" className="toast-banner__close" aria-label="Đóng thông báo" onClick={() => setToastMessage(null)}>
            {ICONS.close}
          </button>
        </div>
      )}

      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Phân quyền vai trò & phạm vi dữ liệu</h1>
          <p className="page-subtitle">Gán vai trò và phạm vi truy cập dữ liệu cho từng tài khoản.</p>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-card__icon stat-card__icon--purple">{ICONS.shield}</div>
          <div>
            <span className="stat-card__label">Vai trò hệ thống</span>
            <strong className="stat-card__value">9 vai trò</strong>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card__icon stat-card__icon--blue">{ICONS.users}</div>
          <div>
            <span className="stat-card__label">Tổng tài khoản</span>
            <strong className="stat-card__value">{totalUsers}</strong>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card__icon stat-card__icon--green">{ICONS.globe}</div>
          <div>
            <span className="stat-card__label">Toàn công ty</span>
            <strong className="stat-card__value text-success">{companyScopeUsers}</strong>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card__icon stat-card__icon--blue">{ICONS.building}</div>
          <div>
            <span className="stat-card__label">Nhánh bộ phận</span>
            <strong className="stat-card__value">{deptScopeUsers}</strong>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card__icon stat-card__icon--amber">{ICONS.user}</div>
          <div>
            <span className="stat-card__label">Chỉ cá nhân</span>
            <strong className="stat-card__value text-warning">{selfScopeUsers}</strong>
          </div>
        </div>
      </div>

      {/* Global Error Banner */}
      {error && (
        <div className="alert alert--error mb-4" role="alert">
          <span className="alert__icon">{ICONS.alertTriangle}</span>
          <span>{error}</span>
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
                <span className="status-tab__icon">{ICONS.users}</span> Bảng phân quyền tài khoản ({users.length})
              </button>
              <button
                type="button"
                className={`status-tab ${activeTab === 'ROLES' ? 'status-tab--active' : ''}`}
                onClick={() => setActiveTab('ROLES')}
              >
                <span className="status-tab__icon">{ICONS.shield}</span> Vai trò & quyền hạn (9)
              </button>
            </div>
          </div>

          {activeTab === 'USERS' && (
            <div className="toolbar-filters">
              {/* Search Box */}
              <div className="search-box">
                <span className="search-box__icon">{ICONS.search}</span>
                <input
                  type="text"
                  className="search-box__input"
                  placeholder="Tìm tài khoản, họ tên, email..."
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                />
                {searchKeyword && (
                  <button type="button" className="search-box__clear" aria-label="Xóa tìm kiếm" onClick={() => setSearchKeyword('')}>
                    {ICONS.close}
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
                      {r.name}
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
                  <option value="COMPANY">Toàn công ty (COMPANY)</option>
                  <option value="DEPARTMENT">Nhánh bộ phận (DEPARTMENT)</option>
                  <option value="SELF">Chỉ cá nhân (SELF)</option>
                </select>
              </div>

              <button
                type="button"
                className="btn-icon-refresh"
                onClick={fetchData}
                title="Làm mới dữ liệu từ máy chủ"
                aria-label="Làm mới dữ liệu"
              >
                {ICONS.refresh}
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
                  <th>Tài khoản & nhân sự</th>
                  <th>Bộ phận Trực Thuộc</th>
                  <th>Vai trò được gán</th>
                  <th>Phạm vi dữ liệu</th>
                  <th style={{ textAlign: 'right' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <TableSkeleton columns={5} />
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '40px', color: '#787774' }}>
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
                            <span className="cell-dept">{deptObj.name}</span>
                          ) : (
                            <span className="cell-muted">Chưa phân bổ</span>
                          )}
                        </td>

                        <td>
                          <div className="user-tags-wrap">
                            {u.roleCodes && u.roleCodes.length > 0 ? (
                              u.roleCodes.map((code) => {
                                const roleInfo = SYSTEM_ROLES.find((r) => r.code === code);
                                return (
                                  <span key={code} className="role-chip" title={code}>
                                    {roleInfo?.name || code}
                                  </span>
                                );
                              })
                            ) : (
                              <span className="cell-muted">Chưa gán vai trò</span>
                            )}
                          </div>
                        </td>

                        <td>
                          {isCompany && <span className="scope-chip">Toàn công ty</span>}

                          {isDept && (
                            <div className="scope-chip-group">
                              <span className="scope-chip">Nhánh bộ phận</span>
                              <span className="scope-chip-group__sub">
                                {scopeDeptObj ? scopeDeptObj.name : `Bộ phận ID: ${u.scopeDepartmentId ?? 'N/A'}`}
                              </span>
                            </div>
                          )}

                          {isSelf && <span className="scope-chip">Chỉ cá nhân</span>}
                        </td>

                        <td style={{ textAlign: 'right' }}>
                          {/* Nút kính (phụ), KHÔNG phải nút chàm đặc: màu nhấn đổ đầy được dành riêng
                              cho hành động chính của cả trang. Lặp nó trên từng dòng (10 nút chàm
                              xếp dọc mép phải) làm mất hẳn ý nghĩa "đâu là hành động chính". */}
                          <button
                            type="button"
                            className="btn-secondary"
                            style={{ padding: '7px 14px', fontSize: '13px' }}
                            onClick={() => handleOpenConfigure(u)}
                            title="Cấu hình vai trò & phạm vi dữ liệu"
                          >
                            <span className="btn-primary__icon">{ICONS.settings}</span> Phân quyền
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

      {/* TC-05: nhật ký phân quyền giờ nằm ở trang riêng biệt "Nhật ký hệ thống" — lưu thật trên
          máy chủ, có phân trang, không còn là danh sách nhúng cuộn tay ở đây. */}
      {onViewAuditLog && (
        <button type="button" className="audit-log-link" onClick={onViewAuditLog}>
          <span className="audit-log-link__icon">{ICONS.clipboardList}</span>
          <span className="audit-log-link__text">
            <strong>Xem nhật ký phân quyền đầy đủ</strong>
            <span>Toàn bộ lịch sử gán vai trò và phạm vi dữ liệu — lưu trên máy chủ</span>
          </span>
          <span className="audit-log-link__arrow">→</span>
        </button>
      )}

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
