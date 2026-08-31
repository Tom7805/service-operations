import React, { useCallback, useEffect, useState } from 'react';
import { createUser, getUsers, resetUserTwoFactor, updateUser, updateUserStatus, UserApiError } from '../api/usersApi';
import RoleAssignModal from '../components/RoleAssignModal';
import UserFormModal from '../components/UserFormModal';
import UserTable from '../components/UserTable';
import { ICONS } from '../components/icons';
import type { CreateUserPayload, ScopeType, UpdateUserPayload, User } from '../types/userTypes';

interface UserListPageProps {
  currentUserRoles?: string[];
  currentUserName?: string;
  onNavigateDetail?: (userId: number) => void;
  /** Mở trang Nhật ký hệ thống (đã tách riêng, có phân trang thật từ máy chủ). */
  onViewAuditLog?: () => void;
}

export const UserListPage: React.FC<UserListPageProps> = ({
  currentUserRoles = ['VT-07'],
  currentUserName = 'Quản trị viên',
  onNavigateDetail,
  onViewAuditLog,
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

  // Status toggle confirmation modal (TC-05)
  const [confirmStatusUser, setConfirmStatusUser] = useState<User | null>(null);
  // NCL-01-CN-009: xác nhận trước khi đặt lại 2FA — thao tác bắt buộc người dùng liên kết lại app mới.
  const [confirmResetTwoFactorUser, setConfirmResetTwoFactorUser] = useState<User | null>(null);
  const [resettingTwoFactor, setResettingTwoFactor] = useState(false);

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
    await fetchUsersList();
  };

  const handleSubmitUpdate = async (id: number, payload: UpdateUserPayload) => {
    const updated = await updateUser(id, payload);
    showToast(`Cập nhật tài khoản @${updated.username} thành công`);
    await fetchUsersList();
  };

  const handleSaveRoles = async (userId: number, roleCodes: string[], scopeType: ScopeType) => {
    const target = users.find((u) => u.id === userId);
    if (!target) return;
    const updated = await updateUser(userId, { fullName: target.fullName, roleCodes, scopeType });
    showToast(`Đã gán ${roleCodes.length} vai trò cho tài khoản @${updated.username}`);
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

  // NCL-01-CN-009: mất/đổi điện thoại — đặt lại thiết lập TOTP, bắt liên kết app mới ở lần đăng nhập kế tiếp.
  const handleConfirmResetTwoFactor = async () => {
    if (!confirmResetTwoFactorUser) return;
    const target = confirmResetTwoFactorUser;
    setResettingTwoFactor(true);
    try {
      await resetUserTwoFactor(target.id);
      showToast(`Đã đặt lại xác thực hai bước cho @${target.username}. Lần đăng nhập kế tiếp sẽ yêu cầu quét QR liên kết app mới.`);
      setConfirmResetTwoFactorUser(null);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Không thể đặt lại xác thực hai bước', 'error');
    } finally {
      setResettingTwoFactor(false);
    }
  };

  // Render TC-04 Access Denied screen if non-admin user
  if (!isAdmin) {
    return (
      <div className="access-denied-container">
        <div className="access-denied-card">
          <div className="access-denied-icon">{ICONS.shieldOff}</div>
          <span className="eyebrow text-danger">Từ chối truy cập (Access Denied)</span>
          <h2>Bạn không có thẩm quyền truy cập màn hình này</h2>
          <p>
            Chức năng Quản lý tài khoản người dùng chỉ dành riêng cho vai trò <strong>Quản trị viên</strong>.
            Hệ thống đã ghi lại lần truy cập trái phép này vào nhật ký bảo mật.
          </p>
          <div className="security-log-badge">
            <span className="security-log-badge__item">{ICONS.shield} Lần thử truy cập: {new Date().toLocaleString('vi-VN')}</span>
            <span className="security-log-badge__item">Tài khoản: {currentUserName}</span>
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
          <span className="toast-banner__icon">{toastMessage.type === 'success' ? ICONS.checkCircle : ICONS.alertTriangle}</span>
          <span>{toastMessage.text}</span>
          <button type="button" className="toast-banner__close" aria-label="Đóng thông báo" onClick={() => setToastMessage(null)}>{ICONS.close}</button>
        </div>
      )}

      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Quản lý tài khoản người dùng</h1>
          <p className="page-subtitle">Tạo mới, phân quyền và theo dõi trạng thái tài khoản.</p>
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
          <div className="stat-card__icon stat-card__icon--blue">{ICONS.users}</div>
          <div>
            <span className="stat-card__label">Tổng tài khoản</span>
            <strong className="stat-card__value">{totalCount}</strong>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card__icon stat-card__icon--green">{ICONS.userCheck}</div>
          <div>
            <span className="stat-card__label">Đang hoạt động</span>
            <strong className="stat-card__value text-success">{activeCount}</strong>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card__icon stat-card__icon--red">{ICONS.lock}</div>
          <div>
            <span className="stat-card__label">Đang bị khóa</span>
            <strong className="stat-card__value text-danger">{lockedCount}</strong>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card__icon stat-card__icon--purple">{ICONS.shield}</div>
          <div>
            <span className="stat-card__label">Quản trị viên</span>
            <strong className="stat-card__value">{adminCount}</strong>
          </div>
        </div>
      </div>

      {/* Global Error Banner */}
      {error && (
        <div className="alert alert--error mb-4" role="alert">
          <span className="alert__icon">{ICONS.alertTriangle}</span>
          <span>{error}</span>
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
        onResetTwoFactor={(u) => setConfirmResetTwoFactorUser(u)}
      />

      {/* TC-05: nhật ký thao tác tài khoản giờ nằm ở trang riêng biệt "Nhật ký hệ thống" — lưu thật
          trên máy chủ, có phân trang, không còn là danh sách nhúng cuộn tay ở đây. */}
      {onViewAuditLog && (
        <button type="button" className="audit-log-link" onClick={onViewAuditLog}>
          <span className="audit-log-link__icon">{ICONS.clipboardList}</span>
          <span className="audit-log-link__text">
            <strong>Xem nhật ký thao tác đầy đủ</strong>
            <span>Toàn bộ lịch sử tạo/sửa/khóa tài khoản, phân quyền — lưu trên máy chủ</span>
          </span>
          <span className="audit-log-link__arrow">→</span>
        </button>
      )}

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
                <span className="modal-title__icon">{confirmStatusUser.status === 'LOCKED' ? ICONS.unlock : ICONS.lock}</span>
                {confirmStatusUser.status === 'LOCKED' ? 'Xác nhận mở khóa tài khoản' : 'Xác nhận khóa tài khoản'}
              </h3>
              <button type="button" className="modal-close" aria-label="Đóng" onClick={() => setConfirmStatusUser(null)}>{ICONS.close}</button>
            </div>
            <div className="modal-body">
              <p>
                Bạn có chắc chắn muốn {confirmStatusUser.status === 'LOCKED' ? 'mở khóa' : 'khóa'} tài khoản{' '}
                <strong>@{confirmStatusUser.username}</strong> ({confirmStatusUser.fullName})?
              </p>
              <div className="confirm-note-box">
                <span className="confirm-note-box__icon">{ICONS.info}</span>
                <span>Hành động này sẽ được ghi vết vào Nhật ký truy cập hệ thống kèm thời điểm và thông tin tài khoản thực hiện.</span>
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

      {/* NCL-01-CN-009: xác nhận đặt lại xác thực hai bước (mất/đổi điện thoại) */}
      {confirmResetTwoFactorUser && (
        <div className="modal-backdrop" onClick={() => setConfirmResetTwoFactorUser(null)} role="dialog">
          <div className="modal-card modal-card--sm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title text-warning">
                <span className="modal-title__icon">{ICONS.resetTwoFactor}</span>
                Xác nhận đặt lại xác thực hai bước
              </h3>
              <button type="button" className="modal-close" aria-label="Đóng" onClick={() => setConfirmResetTwoFactorUser(null)}>{ICONS.close}</button>
            </div>
            <div className="modal-body">
              <p>
                Đặt lại xác thực hai bước cho tài khoản{' '}
                <strong>@{confirmResetTwoFactorUser.username}</strong> ({confirmResetTwoFactorUser.fullName})?
              </p>
              <div className="confirm-note-box">
                <span className="confirm-note-box__icon">{ICONS.info}</span>
                <span>
                  Chỉ dùng khi người dùng đã mất/đổi điện thoại và không còn app Authenticator nào tạo được mã
                  cho tài khoản này nữa. Sau khi đặt lại, app cũ sẽ ngừng hoạt động — lần đăng nhập kế tiếp của
                  tài khoản này sẽ bắt buộc quét mã QR để liên kết app mới.
                </span>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn-secondary" onClick={() => setConfirmResetTwoFactorUser(null)} disabled={resettingTwoFactor}>
                Hủy bỏ
              </button>
              <button type="button" className="btn-primary btn-danger" onClick={handleConfirmResetTwoFactor} disabled={resettingTwoFactor}>
                {resettingTwoFactor ? 'Đang xử lý...' : 'Xác nhận đặt lại'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserListPage;
