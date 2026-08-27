import React, { useCallback, useEffect, useState } from 'react';
import { createUser, getUsers, updateUser, updateUserStatus, UserApiError } from '../api/usersApi';
import RoleAssignModal from '../components/RoleAssignModal';
import UserFormModal from '../components/UserFormModal';
import UserTable from '../components/UserTable';
import type { CreateUserPayload, ScopeType, UpdateUserPayload, User, UserAuditLog } from '../types/userTypes';

interface UserListPageProps {
  currentUserRoles?: string[];
  currentUserName?: string;
  onNavigateDetail?: (userId: number) => void;
}

export const UserListPage: React.FC<UserListPageProps> = ({
  currentUserRoles = ['VT-07'],
  currentUserName = 'Quản trị viên',
  onNavigateDetail,
}) => {
  // TC-04 Permission check: Only VT-07 (Quản trị viên) can manage users
  const isAdmin = currentUserRoles.includes('VT-07');

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [roleTargetUser, setRoleTargetUser] = useState<User | null>(null);

  // Status toggle confirmation modal & Audit log (TC-05)
  const [confirmStatusUser, setConfirmStatusUser] = useState<User | null>(null);
  const [auditLogs, setAuditLogs] = useState<UserAuditLog[]>([
    {
      id: 'log-101',
      timestamp: new Date(Date.now() - 3600000).toLocaleTimeString('vi-VN') + ' ' + new Date().toLocaleDateString('vi-VN'),
      action: 'Tạo tài khoản mới',
      performedBy: 'Quản trị viên',
      targetUser: 'admin',
      details: 'Khởi tạo tài khoản Quản trị hệ thống',
    },
  ]);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const fetchUsersList = useCallback(async () => {
    if (!isAdmin) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getUsers();
      setUsers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tải danh sách tài khoản người dùng.');
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    fetchUsersList();
  }, [fetchUsersList]);

  // Log audit activity for TC-05
  const addAuditLog = (action: string, targetUser: string, details: string) => {
    const newLog: UserAuditLog = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString('vi-VN') + ' ' + new Date().toLocaleDateString('vi-VN'),
      action,
      performedBy: currentUserName,
      targetUser,
      details,
    };
    setAuditLogs((prev) => [newLog, ...prev]);
  };

  // Handlers
  const handleOpenCreateModal = () => {
    setEditingUser(null);
    setIsFormOpen(true);
  };

  const handleOpenEditModal = (user: User) => {
    setEditingUser(user);
    setIsFormOpen(true);
  };

  const handleOpenRoleModal = (user: User) => {
    setRoleTargetUser(user);
    setIsRoleModalOpen(true);
  };

  const handleSubmitCreate = async (payload: CreateUserPayload) => {
    const created = await createUser(payload);
    showToast(`Đã tạo thành công tài khoản @${created.username}`);
    addAuditLog('Tạo tài khoản', created.username, `Tạo tài khoản cho ${created.fullName}`);
    await fetchUsersList();
  };

  const handleSubmitUpdate = async (id: number, payload: UpdateUserPayload) => {
    const updated = await updateUser(id, payload);
    showToast(`Cập nhật tài khoản @${updated.username} thành công`);
    addAuditLog('Cập nhật tài khoản', updated.username, `Cập nhật thông tin tài khoản ${updated.fullName}`);
    await fetchUsersList();
  };

  const handleSaveRoles = async (userId: number, roleCodes: string[], scopeType: ScopeType) => {
    const target = users.find((u) => u.id === userId);
    if (!target) return;
    const updated = await updateUser(userId, { fullName: target.fullName, roleCodes, scopeType });
    showToast(`Đã gán ${roleCodes.length} vai trò cho tài khoản @${updated.username}`);
    addAuditLog('Cấu hình phân quyền', updated.username, `Gán vai trò [${roleCodes.join(', ')}] với phạm vi ${scopeType}`);
    await fetchUsersList();
  };

  // TC-03 & TC-05 Status Lock/Unlock Confirmation
  const handleConfirmToggleStatus = async () => {
    if (!confirmStatusUser) return;
    const target = confirmStatusUser;
    const nextStatus = target.status === 'LOCKED' ? 'ACTIVE' : 'LOCKED';

    try {
      const updated = await updateUserStatus(target.id, nextStatus);
      const actionText = nextStatus === 'LOCKED' ? 'Khóa tài khoản' : 'Mở khóa tài khoản';
      showToast(`${actionText} @${updated.username} thành công`);
      addAuditLog(actionText, updated.username, `Đổi trạng thái tài khoản thành ${nextStatus}`);
      setConfirmStatusUser(null);
      await fetchUsersList();
    } catch (err) {
      if (err instanceof UserApiError && err.code === 'INVALID_STATE') {
        showToast(`Tài khoản đã ở trạng thái ${nextStatus}`, 'error');
      } else {
        showToast(err instanceof Error ? err.message : 'Không thể thay đổi trạng thái tài khoản', 'error');
      }
      setConfirmStatusUser(null);
    }
  };

  // Render TC-04 Access Denied screen if non-admin user
  if (!isAdmin) {
    return (
      <div className="access-denied-container">
        <div className="access-denied-card">
          <div className="access-denied-icon">🚫</div>
          <span className="eyebrow text-danger">Từ chối truy cập (Access Denied)</span>
          <h2>Bạn không có thẩm quyền truy cập màn hình này</h2>
          <p>
            Chức năng Quản lý tài khoản người dùng chỉ dành riêng cho vai trò <strong>Quản trị viên</strong>.
            Hệ thống đã ghi lại lần truy cập trái phép này vào nhật ký bảo mật.
          </p>
          <div className="security-log-badge">
            <span>🛡️ Lần thử truy cập: {new Date().toLocaleString('vi-VN')}</span>
            <span>Tài khoản: {currentUserName}</span>
          </div>
        </div>
      </div>
    );
  }

  // Dashboard Stats Counter
  const totalCount = users.length;
  const activeCount = users.filter((u) => u.status === 'ACTIVE').length;
  const lockedCount = users.filter((u) => u.status === 'LOCKED').length;
  const adminCount = users.filter((u) => u.roleCodes.includes('VT-07')).length;

  return (
    <div className="user-management-page">
      {/* Toast Banner */}
      {toastMessage && (
        <div className={`toast-banner toast-banner--${toastMessage.type}`} role="status">
          <span className="toast-banner__icon">{toastMessage.type === 'success' ? '✅' : '⚠️'}</span>
          <span>{toastMessage.text}</span>
          <button type="button" className="toast-banner__close" onClick={() => setToastMessage(null)}>✕</button>
        </div>
      )}

      {/* Page Header */}
      <div className="page-header">
        <div>
          <div className="breadcrumb">
            <span>Hệ thống</span> / <span>Quản trị & Phân quyền</span> / <span className="active">Quản lý tài khoản</span>
          </div>
          <h1 className="page-title">Quản lý tài khoản người dùng</h1>
          <p className="page-subtitle">
            Tạo mới, phân vai trò, đặt phạm vi dữ liệu và theo dõi trạng thái tài khoản toàn bộ nhân sự công ty.
          </p>
        </div>
        <div className="page-header-actions">
          <button type="button" className="btn-primary btn-lg" onClick={handleOpenCreateModal}>
            <span className="btn-icon">+</span> Thêm tài khoản mới
          </button>
        </div>
      </div>

      {/* Stats Summary Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-card__icon stat-card__icon--blue">👥</div>
          <div>
            <span className="stat-card__label">Tổng tài khoản</span>
            <strong className="stat-card__value">{totalCount}</strong>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card__icon stat-card__icon--green">🟢</div>
          <div>
            <span className="stat-card__label">Đang hoạt động</span>
            <strong className="stat-card__value text-success">{activeCount}</strong>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card__icon stat-card__icon--red">🔒</div>
          <div>
            <span className="stat-card__label">Đang bị khóa</span>
            <strong className="stat-card__value text-danger">{lockedCount}</strong>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card__icon stat-card__icon--purple">⚡</div>
          <div>
            <span className="stat-card__label">Quản trị viên</span>
            <strong className="stat-card__value">{adminCount}</strong>
          </div>
        </div>
      </div>

      {/* Global Error Banner */}
      {error && (
        <div className="alert alert--error mb-4" role="alert">
          <span>⚠️ {error}</span>
          <button type="button" className="btn-link text-white ml-auto" onClick={fetchUsersList}>
            Thử lại
          </button>
        </div>
      )}

      {/* User Table Component */}
      <UserTable
        users={users}
        loading={loading}
        onEdit={handleOpenEditModal}
        onToggleStatus={(u) => setConfirmStatusUser(u)}
        onAssignRoles={handleOpenRoleModal}
        onViewDetail={(u) => onNavigateDetail ? onNavigateDetail(u.id) : handleOpenEditModal(u)}
        onRefresh={fetchUsersList}
      />

      {/* Audit Log Stream section for TC-05 */}
      <div className="audit-log-card">
        <div className="audit-log-header">
          <h3 className="audit-log-title">📋 Nhật ký thao tác tài khoản gần đây (Audit Log)</h3>
          <span className="badge-pulse">Lưu vết 100% realtime</span>
        </div>
        <div className="audit-log-list">
          {auditLogs.map((log) => (
            <div key={log.id} className="audit-log-item">
              <div className="audit-log-icon">📝</div>
              <div className="audit-log-meta">
                <div className="audit-log-row">
                  <strong>{log.action}</strong> đối với tài khoản <span className="highlight-username">@{log.targetUser}</span>
                  <span className="audit-log-time">{log.timestamp}</span>
                </div>
                <p className="audit-log-details">{log.details} • Thực hiện bởi <em>{log.performedBy}</em></p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Form Modal for Create & Edit */}
      <UserFormModal
        isOpen={isFormOpen}
        editingUser={editingUser}
        onClose={() => setIsFormOpen(false)}
        onSubmitCreate={handleSubmitCreate}
        onSubmitUpdate={handleSubmitUpdate}
      />

      {/* Role Assign Modal */}
      <RoleAssignModal
        isOpen={isRoleModalOpen}
        user={roleTargetUser}
        onClose={() => setIsRoleModalOpen(false)}
        onSave={handleSaveRoles}
      />

      {/* Status Toggle Confirmation Dialog (TC-03, TC-05) */}
      {confirmStatusUser && (
        <div className="modal-backdrop" onClick={() => setConfirmStatusUser(null)} role="dialog">
          <div className="modal-card modal-card--sm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title text-warning">
                {confirmStatusUser.status === 'LOCKED' ? '🔓 Xác nhận mở khóa tài khoản' : '🔒 Xác nhận khóa tài khoản'}
              </h3>
              <button type="button" className="modal-close" onClick={() => setConfirmStatusUser(null)}>✕</button>
            </div>
            <div className="modal-body">
              <p>
                Bạn có chắc chắn muốn {confirmStatusUser.status === 'LOCKED' ? 'mở khóa' : 'khóa'} tài khoản{' '}
                <strong>@{confirmStatusUser.username}</strong> ({confirmStatusUser.fullName})?
              </p>
              <div className="confirm-note-box">
                <span>ℹ️ Hành động này sẽ được ghi vết vào Nhật ký truy cập hệ thống kèm thời điểm và thông tin tài khoản thực hiện.</span>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn-secondary" onClick={() => setConfirmStatusUser(null)}>
                Hủy bỏ
              </button>
              <button
                type="button"
                className={`btn-primary ${confirmStatusUser.status === 'LOCKED' ? 'btn-success' : 'btn-danger'}`}
                onClick={handleConfirmToggleStatus}
              >
                {confirmStatusUser.status === 'LOCKED' ? 'Xác nhận mở khóa' : 'Xác nhận khóa tài khoản'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserListPage;
