import React, { useState } from 'react';
import type { User, UserStatus } from '../types/userTypes';
import { SYSTEM_ROLES } from '../types/userTypes';
import type { DepartmentInfo } from '../types/userTypes';
import { departmentName } from '../hooks/useDepartmentOptions';
import { ICONS } from './icons';
import RowActionsMenu from '../../../components/common/RowActionsMenu';
import TableSkeleton from '../../../components/common/TableSkeleton';

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
  /** Danh sách bộ phận thật (GET /departments) để hiện tên bộ phận của từng tài khoản. */
  departments?: DepartmentInfo[];
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
  departments = [],
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

  const getDepartmentName = (deptId: number | null) => departmentName(departments, deptId);

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
      // Trạng thái bình thường chỉ là chấm + chữ nhạt; ngoại lệ (khóa, ngưng) mới được nhấn.
      case 'ACTIVE':
        return <span className="list-status list-status--on">Hoạt động</span>;
      case 'LOCKED':
        return <span className="list-status list-status--danger">Đã khóa</span>;
      case 'INACTIVE':
        return <span className="list-status list-status--off">Ngưng hoạt động</span>;
      default:
        return <span className="list-status list-status--off">{status}</span>;
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
              <span className="icon-sm">{ICONS.close}</span>
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
        {/* Danh sách gọn: mỗi hàng một dòng. Cột STT bỏ vì không mang thông tin; vai trò thứ hai
            trở đi gộp thành "+N" (rê chuột xem đủ). Bấm vào hàng để mở chi tiết. */}
        <table className="user-data-table list-table">
          <thead>
            <tr>
              <th scope="col" style={{ width: '26%' }}>Tài khoản</th>
              <th scope="col" className="list-table__hide-sm" style={{ width: '22%' }}>Email</th>
              <th scope="col" className="list-table__hide-sm" style={{ width: '18%' }}>Bộ phận</th>
              <th scope="col" className="list-table__hide-sm" style={{ width: '16%' }}>Vai trò</th>
              <th scope="col" style={{ width: '14%' }}>Trạng thái</th>
              <th scope="col" className="list-table__actions">
              <span className="visually-hidden">Thao tác</span>
            </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <TableSkeleton columns={6} />
            ) : filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={6}>
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
              filteredUsers.map((user) => (
                <tr
                  key={user.id}
                  className={`list-table__row ${user.status === 'LOCKED' ? 'row--locked' : ''}`}
                  onClick={() => onViewDetail(user)}
                >
                  <td>
                    <div className="user-profile-cell">
                      <div className="avatar-circle">
                        {user.fullName.charAt(0).toUpperCase()}
                      </div>
                      <div className="user-profile-meta">
                        <button
                          type="button"
                          className="list-table__title"
                          onClick={(e) => {
                            e.stopPropagation();
                            onViewDetail(user);
                          }}
                          title={user.fullName}
                        >
                          {user.fullName}
                        </button>
                        <span className="list-table__sub" title={`@${user.username}`}>@{user.username}</span>
                      </div>
                    </div>
                  </td>
                  <td className="list-table__hide-sm">
                    <span className="list-table__clip list-table__muted" title={user.email || undefined}>{user.email || '—'}</span>
                  </td>
                  <td className="list-table__hide-sm">
                    <span className="list-table__clip" title={getDepartmentName(user.departmentId)}>{getDepartmentName(user.departmentId)}</span>
                  </td>
                  <td className="list-table__hide-sm">
                    {user.roleCodes && user.roleCodes.length > 0 ? (
                      <span className="list-table__inline">
                        {getRoleBadge(user.roleCodes[0])}
                        {user.roleCodes.length > 1 && (
                          <span
                            className="list-chip"
                            title={user.roleCodes
                              .slice(1)
                              .map((code) => SYSTEM_ROLES.find((r) => r.code === code)?.name ?? code)
                              .join(', ')}
                          >
                            +{user.roleCodes.length - 1}
                          </span>
                        )}
                      </span>
                    ) : (
                      <span className="list-table__muted">Chưa gán</span>
                    )}
                  </td>
                  <td>{getStatusBadge(user.status)}</td>
                  <td className="list-table__actions" onClick={(e) => e.stopPropagation()}>
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
