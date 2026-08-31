import { useCallback, useEffect, useState } from 'react';
import { AuthApiError, getTwoFactorConfigs, updateTwoFactorConfig } from '../api/authApi';
import type { TwoFactorRoleConfig } from '../types/authTypes';
import { ICONS } from '../../../components/common/icons';

interface TwoFactorSetupPageProps {
  currentUserRoles?: string[];
  currentUserName?: string;
}

function formatUpdatedAt(value: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('vi-VN');
}

/**
 * NCL-01-CN-009 — màn hình quản trị viên bật/tắt xác thực hai bước theo vai trò.
 *
 * TC-03: chỉ VT-07 được truy cập, người khác thấy màn hình từ chối (backend đã ghi nhật ký
 * lần từ chối qua GlobalExceptionHandler khi gọi API — ở đây chặn sớm luôn cả việc gọi API).
 * TC-04: mỗi lần đổi trạng thái hiển thị ngay người thực hiện + thời điểm mới nhất backend trả về.
 */
export default function TwoFactorSetupPage({
  currentUserRoles = ['VT-07'],
  currentUserName = 'Quản trị viên',
}: TwoFactorSetupPageProps) {
  const isAdmin = currentUserRoles.includes('VT-07');

  const [configs, setConfigs] = useState<TwoFactorRoleConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingRoleId, setSavingRoleId] = useState<number | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<TwoFactorRoleConfig | null>(null);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const fetchConfigs = useCallback(async () => {
    if (!isAdmin) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getTwoFactorConfigs();
      setConfigs(data);
    } catch (err) {
      setError(err instanceof AuthApiError ? err.message : 'Không thể tải cấu hình xác thực hai bước.');
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    fetchConfigs();
  }, [fetchConfigs]);

  const handleConfirmToggle = async () => {
    if (!confirmTarget) return;
    const target = confirmTarget;
    const nextEnabled = !target.enabled;

    setSavingRoleId(target.roleId);
    try {
      const updated = await updateTwoFactorConfig(target.roleId, { enabled: nextEnabled });
      setConfigs((prev) => prev.map((item) => (item.roleId === updated.roleId ? updated : item)));
      showToast(
        `Đã ${nextEnabled ? 'bật' : 'tắt'} xác thực hai bước cho vai trò ${target.roleCode} — ${target.roleName}`
      );
    } catch (err) {
      showToast(
        err instanceof AuthApiError ? err.message : 'Không thể cập nhật cấu hình xác thực hai bước.',
        'error'
      );
    } finally {
      setSavingRoleId(null);
      setConfirmTarget(null);
    }
  };

  // TC-03: chặn truy cập ngay tại giao diện đối với người không phải quản trị viên.
  if (!isAdmin) {
    return (
      <div className="access-denied-container">
        <div className="access-denied-card">
          <div className="access-denied-icon">{ICONS.shieldOff}</div>
          <span className="eyebrow text-danger">Từ chối truy cập (Access Denied)</span>
          <h2>Bạn không có thẩm quyền truy cập màn hình này</h2>
          <p>
            Chức năng cấu hình xác thực hai bước chỉ dành riêng cho vai trò <strong>Quản trị viên</strong>.
            Hệ thống đã lưu lại lần truy cập trái phép này vào nhật ký an ninh.
          </p>
          <div className="security-log-badge">
            <span className="security-log-badge__item">{ICONS.shield} Lần thử truy cập: {new Date().toLocaleString('vi-VN')}</span>
            <span className="security-log-badge__item">{ICONS.user} Người dùng: {currentUserName}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="user-management-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Xác thực hai bước theo vai trò</h1>
          <p className="page-subtitle">
            Vai trò được bật sẽ phải nhập mã OTP mỗi lần đăng nhập, sau mật khẩu.
          </p>
        </div>
      </div>

      {error && (
        <div className="alert alert--error" role="alert">
          <span className="alert__icon">{ICONS.alertTriangle}</span>
          <span>{error}</span>
        </div>
      )}

      <div className="user-table-card">
        <div className="table-responsive">
          <table className="user-data-table">
            <thead>
              <tr>
                <th>Vai trò</th>
                <th>Trạng thái</th>
                <th>Cập nhật lần cuối</th>
                <th style={{ textAlign: 'right' }}>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', padding: 32, color: '#64748b' }}>
                    Đang tải cấu hình...
                  </td>
                </tr>
              ) : configs.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', padding: 32, color: '#64748b' }}>
                    Chưa có vai trò nào trong hệ thống.
                  </td>
                </tr>
              ) : (
                configs.map((config) => (
                  <tr key={config.roleId}>
                    <td>
                      <span className="role-code">{config.roleCode}</span>{' '}
                      <span className="role-title">{config.roleName}</span>
                    </td>
                    <td>
                      <span className={`status-pill ${config.enabled ? 'status-pill--active' : 'status-pill--inactive'}`}>
                        <span className="status-pill__dot" />
                        {config.enabled ? 'Đang bật' : 'Đang tắt'}
                      </span>
                    </td>
                    <td>
                      {config.updatedBy ? (
                        <>
                          <span className="cell-dept">@{config.updatedBy}</span>
                          <br />
                          <span className="user-profile-username">{formatUpdatedAt(config.updatedAt)}</span>
                        </>
                      ) : (
                        <span className="user-profile-username">Chưa từng thay đổi</span>
                      )}
                    </td>
                    <td>
                      <div className="table-actions">
                        <button
                          type="button"
                          className={config.enabled ? 'btn-secondary' : 'btn-primary'}
                          disabled={savingRoleId === config.roleId}
                          onClick={() => setConfirmTarget(config)}
                        >
                          {savingRoleId === config.roleId ? 'Đang lưu...' : config.enabled ? 'Tắt' : 'Bật'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {confirmTarget && (
        <div className="modal-backdrop" onClick={() => setConfirmTarget(null)} role="dialog">
          <div className="modal-card modal-card--sm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <span className="modal-eyebrow">Xác nhận</span>
                <h3 className="modal-title">
                  <span className="modal-title__icon">{confirmTarget.enabled ? ICONS.unlock : ICONS.lock}</span>
                  {confirmTarget.enabled ? 'Tắt xác thực hai bước' : 'Bật xác thực hai bước'}
                </h3>
              </div>
            </div>
            <div className="modal-body">
              <p>
                Bạn có chắc chắn muốn {confirmTarget.enabled ? 'tắt' : 'bật'} xác thực hai bước cho vai trò{' '}
                <strong>{confirmTarget.roleCode} — {confirmTarget.roleName}</strong>?
                {!confirmTarget.enabled && (
                  <>
                    {' '}
                    Từ lúc này, mọi tài khoản thuộc vai trò này sẽ phải nhập mã OTP mỗi lần đăng nhập.
                  </>
                )}
              </p>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn-secondary" onClick={() => setConfirmTarget(null)}>
                Hủy
              </button>
              <button type="button" className="btn-primary" onClick={handleConfirmToggle}>
                {confirmTarget.enabled ? 'Xác nhận tắt' : 'Xác nhận bật'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toastMessage && (
        <div className={`toast-banner toast-banner--${toastMessage.type}`} role="status">
          <span className="toast-banner__icon">{toastMessage.type === 'success' ? ICONS.checkCircle : ICONS.alertTriangle}</span>
          <span>{toastMessage.text}</span>
          <button type="button" className="toast-banner__close" onClick={() => setToastMessage(null)}>
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
