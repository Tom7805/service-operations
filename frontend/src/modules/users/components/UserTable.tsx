import React, { useEffect, useRef, useState } from 'react';
import type { User, UserStatus } from '../types/userTypes';
import { SYSTEM_DEPARTMENTS, SYSTEM_ROLES } from '../types/userTypes';
import { ICONS } from './icons';

interface RowAction {
  key: string;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  tone?: 'default' | 'danger';
}

/** Menu thao tác gọn theo từng dòng — thay cho dãy icon rời rạc, đúng mẫu bảng dữ liệu doanh nghiệp. */
function RowActionsMenu({ actions }: { actions: RowAction[] }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  return (
    <div className="row-menu" ref={containerRef}>
      <button
        type="button"
        className="row-menu__trigger"
        aria-label="Thao tác"
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {ICONS.more}
      </button>
      <div className={`row-menu__panel ${open ? 'row-menu__panel--open' : ''}`} role="menu">
        {actions.map((action) => (
          <button
            key={action.key}
            type="button"
            role="menuitem"
            className={`row-menu__item ${action.tone === 'danger' ? 'row-menu__item--danger' : ''}`}
            title={action.label}
            onClick={() => {
              setOpen(false);
              action.onClick();
            }}
          >
            <span className="row-menu__icon">{action.icon}</span>
            {action.label}
          </button>
        ))}
      </div>
    </div>
  );
}

interface UserTableProps {
  users: User[];
  loading: boolean;
  onEdit: (user: User) => void;
  onToggleStatus: (user: User) => void;
  onAssignRoles: (user: User) => void;
  onViewDetail: (user: User) => void;
  onRefresh: () => void;
  /** NCL-01-CN-009: mất/đổi điện thoại — đặt lại thiết lập TOTP để bắt buộc liên kết app mới. */
  onResetTwoFactor?: (user: User) => void;
}

export const UserTable: React.FC<UserTableProps> = ({
  users,
  loading,
  onEdit,
  onToggleStatus,
  onAssignRoles,
  onViewDetail,
  onRefresh,
  onResetTwoFactor,
}) => {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Filter users based on local search & filters
  const filteredUsers = users.filter((user) => {
    const term = search.toLowerCase().trim();
    const matchesSearch =
      !term ||
      user.username.toLowerCase().includes(term) ||
      user.fullName.toLowerCase().includes(term) ||
      (user.email && user.email.toLowerCase().includes(term));

    const matchesRole = roleFilter === 'ALL' || user.roleCodes.includes(roleFilter);
    const matchesStatus = statusFilter === 'ALL' || user.status === statusFilter;

    return matchesSearch && matchesRole && matchesStatus;
  });

  const getDepartmentName = (deptId: number | null) => {
    if (!deptId) return 'Chưa gán bộ phận';
    const dept = SYSTEM_DEPARTMENTS.find((d) => d.id === deptId);
    return dept ? dept.name : `Bộ phận #${deptId}`;
  };

  const getRoleBadge = (code: string) => {
    const role = SYSTEM_ROLES.find((r) => r.code === code);
    const name = role ? role.name : code;
    return (
      <span key={code} className="role-chip" title={role?.description || name}>
        {name}
      </span>
    );
  };

  const getStatusBadge = (status: UserStatus) => {
    switch (status) {
      case 'ACTIVE':
        return <span className="status-pill status-pill--active"><i className="status-pill__dot" /> Hoạt động</span>;
      case 'LOCKED':
        return <span className="status-pill status-pill--locked"><i className="status-pill__dot" /> Đã khóa</span>;
      case 'INACTIVE':
        return <span className="status-pill status-pill--inactive"><i className="status-pill__dot" /> Ngưng hoạt động</span>;
      default:
        return <span className="status-pill status-pill--inactive">{status}</span>;
    }
  };

  return (
    <div className="user-table-card">
      {/* Filter Toolbar */}
      <div className="user-table-toolbar">
        <div className="search-box">
          <svg className="search-box__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            type="text"
            className="search-box__input"
            placeholder="Tìm theo tên đăng nhập, họ tên hoặc email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button type="button" className="search-box__clear" onClick={() => setSearch('')} aria-label="Xóa tìm kiếm">
              ✕
            </button>
          )}
        </div>

        <div className="toolbar-filters">
          <div className="filter-group">
            <label htmlFor="role-select" className="filter-label">Vai trò:</label>
            <select
              id="role-select"
              className="filter-select"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
            >
              <option value="ALL">Tất cả vai trò</option>
              {SYSTEM_ROLES.map((role) => (
                <option key={role.code} value={role.code}>
                  {role.name}
                </option>
              ))}
            </select>
          </div>

          <div className="status-tabs" role="tablist" aria-label="Lọc theo trạng thái tài khoản">
            <button
              type="button"
              role="tab"
              aria-selected={statusFilter === 'ALL'}
              className={`status-tab ${statusFilter === 'ALL' ? 'status-tab--active' : ''}`}
              onClick={() => setStatusFilter('ALL')}
            >
              Tất cả ({users.length})
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={statusFilter === 'ACTIVE'}
              className={`status-tab ${statusFilter === 'ACTIVE' ? 'status-tab--active' : ''}`}
              onClick={() => setStatusFilter('ACTIVE')}
            >
              Hoạt động ({users.filter((u) => u.status === 'ACTIVE').length})
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={statusFilter === 'LOCKED'}
              className={`status-tab ${statusFilter === 'LOCKED' ? 'status-tab--active' : ''}`}
              onClick={() => setStatusFilter('LOCKED')}
            >
              Đã khóa ({users.filter((u) => u.status === 'LOCKED').length})
            </button>
          </div>

          <button type="button" className="btn-icon-refresh" onClick={onRefresh} title="Tải lại danh sách">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21.5 2v6h-6M2.5 22v-6h6" />
              <path d="M2 11.5a10 10 0 0 1 18.8-4.3L21.5 8M22 12.5a10 10 0 0 1-18.8 4.3L2.5 16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Main Data Table */}
      <div className="table-responsive">
        <table className="user-data-table">
          <thead>
            <tr>
              <th scope="col" style={{ width: '46px' }}>STT</th>
              <th scope="col">Tài khoản & Họ tên</th>
              <th scope="col">Email</th>
              <th scope="col">Bộ phận</th>
              <th scope="col">Vai trò hệ thống</th>
              <th scope="col" style={{ width: '132px' }}>Trạng thái</th>
              <th scope="col" style={{ width: '84px', textAlign: 'right' }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 4 }).map((_, idx) => (
                <tr key={idx} className="skeleton-row">
                  <td><div className="skeleton skeleton-text" style={{ width: '20px' }} /></td>
                  <td><div className="skeleton skeleton-text" style={{ width: '140px' }} /></td>
                  <td><div className="skeleton skeleton-text" style={{ width: '160px' }} /></td>
                  <td><div className="skeleton skeleton-text" style={{ width: '120px' }} /></td>
                  <td><div className="skeleton skeleton-text" style={{ width: '150px' }} /></td>
                  <td><div className="skeleton skeleton-pill" style={{ width: '90px' }} /></td>
                  <td><div className="skeleton skeleton-text" style={{ width: '80px', marginLeft: 'auto' }} /></td>
                </tr>
              ))
            ) : filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={7}>
                  <div className="table-empty-state">
                    <div className="empty-icon">{ICONS.user}</div>
                    <h3>Không tìm thấy tài khoản người dùng nào</h3>
                    <p>Thử điều chỉnh từ khóa tìm kiếm hoặc bộ lọc vai trò, trạng thái.</p>
                    {(search || roleFilter !== 'ALL' || statusFilter !== 'ALL') && (
                      <button
                        type="button"
                        className="btn-link"
                        onClick={() => {
                          setSearch('');
                          setRoleFilter('ALL');
                          setStatusFilter('ALL');
                        }}
                      >
                        Xóa tất cả bộ lọc
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              filteredUsers.map((user, index) => (
                <tr key={user.id} className={user.status === 'LOCKED' ? 'row--locked' : ''}>
                  <td className="col-index">{index + 1}</td>
                  <td>
                    <div className="user-profile-cell">
                      <div className="avatar-circle">
                        {user.fullName.charAt(0).toUpperCase()}
                      </div>
                      <div className="user-profile-meta">
                        <span className="user-profile-fullname" title={user.fullName}>{user.fullName}</span>
                        <span className="user-profile-username" title={`@${user.username}`}>@{user.username}</span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="cell-email" title={user.email || undefined}>{user.email || '—'}</span>
                  </td>
                  <td>
                    <span className="cell-dept" title={getDepartmentName(user.departmentId)}>{getDepartmentName(user.departmentId)}</span>
                  </td>
                  <td>
                    <div className="user-tags-wrap">
                      {user.roleCodes && user.roleCodes.length > 0
                        ? user.roleCodes.map((code) => getRoleBadge(code))
                        : <span className="cell-muted">Chưa gán</span>}
                    </div>
                  </td>
                  <td>{getStatusBadge(user.status)}</td>
                  <td style={{ textAlign: 'right' }}>
                    <RowActionsMenu
                      actions={[
                        { key: 'edit', label: 'Chỉnh sửa thông tin', icon: ICONS.edit, onClick: () => onEdit(user) },
                        { key: 'role', label: 'Phân quyền & vai trò', icon: ICONS.role, onClick: () => onAssignRoles(user) },
                        { key: 'detail', label: 'Xem chi tiết', icon: ICONS.eye, onClick: () => onViewDetail(user) },
                        ...(onResetTwoFactor
                          ? [{
                              key: 'reset-2fa',
                              label: 'Đặt lại xác thực hai bước',
                              icon: ICONS.resetTwoFactor,
                              onClick: () => onResetTwoFactor(user),
                            }]
                          : []),
                        {
                          key: 'toggle-status',
                          label: user.status === 'LOCKED' ? 'Mở khóa tài khoản' : 'Khóa tài khoản',
                          icon: user.status === 'LOCKED' ? ICONS.unlock : ICONS.lock,
                          onClick: () => onToggleStatus(user),
                          tone: user.status === 'LOCKED' ? 'default' : 'danger',
                        },
                      ]}
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="table-footer">
        <span className="table-footer__count">
          Hiển thị <strong>{filteredUsers.length}</strong> / <strong>{users.length}</strong> tài khoản
        </span>
      </div>
    </div>
  );
};

export default UserTable;
