import { useCallback, useEffect, useMemo, useState } from 'react';
import { getMaskingRules } from '../api/maskingApi';
import type { MaskingAuditLog, MaskingRule } from '../types/maskingTypes';
import { canViewSensitiveData } from '../../../hooks/usePermission';
import { SYSTEM_ROLES } from '../../users/types/userTypes';
import { ICONS } from '../../../components/common/icons';
import TableSkeleton from '../../../components/common/TableSkeleton';

interface MaskingRulePageProps {
  currentUserRoles?: string[];
  currentUserName?: string;
}

const ROLE_LABELS: Record<string, string> = Object.fromEntries(
  SYSTEM_ROLES.map((r) => [r.code, r.name])
);

export default function MaskingRulePage({
  currentUserRoles = ['VT-07'],
  currentUserName = 'Quản trị viên',
}: MaskingRulePageProps) {
  const isAllowed = canViewSensitiveData(currentUserRoles);

  const [rules, setRules] = useState<MaskingRule[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Hoạt động trong phiên hiện tại — chỉ để tham khảo trên màn hình, KHÔNG phải nhật ký
  // truy cập thật (nhật ký thật ghi ở server, xem tại màn hình "Nhật ký truy cập dữ liệu
  // nhạy cảm" dành cho Quản trị viên).
  const [auditLogs, setAuditLogs] = useState<MaskingAuditLog[]>([
    {
      id: 'audit-mask-1',
      timestamp: new Date().toLocaleTimeString('vi-VN') + ' ' + new Date().toLocaleDateString('vi-VN'),
      action: 'Xem cấu hình che dữ liệu',
      performedBy: currentUserName,
      details: 'Mở màn hình cấu hình quy tắc che dữ liệu lương/giá vốn',
    },
  ]);

  const showToast = useCallback((text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  }, []);

  const addAuditLog = useCallback(
    (action: string, details: string) => {
      const newLog: MaskingAuditLog = {
        id: `audit-mask-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString('vi-VN') + ' ' + new Date().toLocaleDateString('vi-VN'),
        action,
        performedBy: currentUserName,
        details,
      };
      setAuditLogs((prev) => [newLog, ...prev]);
    },
    [currentUserName]
  );

  const fetchRules = useCallback(async () => {
    if (!isAllowed) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getMaskingRules();
      setRules(data);
      addAuditLog(
        'Tải danh sách quy tắc che dữ liệu',
        `Tải thành công ${data.length} quy tắc che dữ liệu lương/giá vốn từ máy chủ`
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Không thể tải danh sách quy tắc che dữ liệu.';
      setError(message);
      showToast(message, 'error');
    } finally {
      setLoading(false);
    }
  }, [isAllowed, addAuditLog, showToast]);

  useEffect(() => {
    fetchRules();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchRules]);

  const allowedRoleNames = useMemo(
    () => (rules.length > 0 ? rules[0].allowedRoles : []),
    [rules]
  );

  // TC-04: Từ chối truy cập nếu không đủ quyền
  if (!isAllowed) {
    return (
      <div className="access-denied-container">
        <div className="access-denied-card">
          <div className="access-denied-icon">{ICONS.lock}</div>
          <span className="eyebrow text-danger">Từ chối truy cập (Access Denied)</span>
          <h2>Bạn không có thẩm quyền truy cập dữ liệu nhạy cảm</h2>
          <p>
            Chức năng cấu hình quy tắc che dữ liệu lương/giá vốn chỉ dành cho các vai trò{' '}
            <strong>Nhân sự</strong>, <strong>Kế toán</strong> và{' '}
            <strong>Ban giám đốc</strong>. Hệ thống đã ghi nhận lần truy cập trái phép này.
          </p>
          <div className="security-log-badge">
            <span className="security-log-badge__item">{ICONS.shield} Lần thử truy cập: {new Date().toLocaleString('vi-VN')}</span>
            <span className="security-log-badge__item">Tài khoản: {currentUserName}</span>
            <span className="security-log-badge__item">Vai trò hiện tại: {currentUserRoles.join(', ')}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="user-management-page">
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
          <h1 className="page-title">Che dữ liệu lương & giá vốn</h1>
          <p className="page-subtitle">Chỉ nhân sự, kế toán và ban giám đốc được xem dữ liệu thật.</p>
        </div>
        <button type="button" className="btn-icon-refresh" onClick={fetchRules} title="Làm mới dữ liệu" aria-label="Làm mới dữ liệu">
          {ICONS.refresh}
        </button>
      </div>

      {/* KPI Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-card__icon stat-card__icon--purple">{ICONS.key}</div>
          <div>
            <span className="stat-card__label">Quy tắc che dữ liệu</span>
            <strong className="stat-card__value">{rules.length}</strong>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card__icon stat-card__icon--green">{ICONS.users}</div>
          <div>
            <span className="stat-card__label">Vai trò được phép xem</span>
            <strong className="stat-card__value">{allowedRoleNames.length}</strong>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card__icon stat-card__icon--blue">{ICONS.clipboardList}</div>
          <div>
            <span className="stat-card__label">Hoạt động trong phiên này</span>
            <strong className="stat-card__value">{auditLogs.length}</strong>
          </div>
        </div>
      </div>

      {error && (
        <div className="alert alert--error" role="alert">
          <span className="alert__icon">{ICONS.alertTriangle}</span>
          <span>{error}</span>
          <button type="button" className="btn-secondary text-dark ml-auto" onClick={fetchRules}>
            Thử lại
          </button>
        </div>
      )}

      {/* Danh sách quy tắc che dữ liệu */}
      <div className="user-table-card">
        <div className="user-table-toolbar">
          <h3 style={{ margin: 0, fontSize: '15px', color: '#111111', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="icon-sm">{ICONS.clipboardList}</span> Danh sách quy tắc che dữ liệu
          </h3>
          <span className="badge-pulse">Đang áp dụng</span>
        </div>
        <div className="table-responsive">
          <table className="user-data-table">
            <thead>
              <tr>
                <th>Mã quy tắc</th>
                <th>Loại dữ liệu nhạy cảm</th>
                <th>Vai trò được phép xem</th>
                <th>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <TableSkeleton columns={4} />
              ) : rules.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', padding: '40px', color: '#787774' }}>
                    Không có quy tắc che dữ liệu nào.
                  </td>
                </tr>
              ) : (
                rules.map((rule) => (
                  <tr key={rule.level}>
                    <td>
                      <span className="checklist-code">{rule.level}</span>
                    </td>
                    <td>
                      <strong style={{ color: '#111111' }}>{rule.levelLabel}</strong>
                    </td>
                    <td>
                      <div className="user-tags-wrap">
                        {rule.allowedRoles.map((roleCode) => (
                          <span key={roleCode} className="user-tag badge--green" title={ROLE_LABELS[roleCode] || roleCode}>
                            <strong className="user-tag__code">{roleCode}</strong>
                            <span>{ROLE_LABELS[roleCode] || roleCode}</span>
                          </span>
                        ))}
                      </div>
                    </td>
                    <td>
                      <span className="status-pill status-pill--active">
                        <span className="status-pill__dot" /> Đang áp dụng
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Hoạt động trong phiên hiện tại — nhật ký truy cập thật nằm ở server, không hiển thị ở đây */}
      <div className="audit-log-card" style={{ marginTop: '24px' }}>
        <div className="audit-log-header">
          <h3 className="audit-log-title"><span className="audit-log-title__icon">{ICONS.clipboardList}</span> Hoạt động trong phiên làm việc này</h3>
          <span className="badge-pulse">Chỉ trên trình duyệt, mất khi tải lại trang</span>
        </div>
        <div className="audit-log-list">
          {auditLogs.map((log) => (
            <div key={log.id} className="audit-log-item">
              <div className="audit-log-icon">{ICONS.key}</div>
              <div className="audit-log-meta">
                <div className="audit-log-row">
                  <strong>{log.action}</strong>
                  <span className="audit-log-time">{log.timestamp}</span>
                </div>
                <p className="audit-log-details">
                  {log.details} • Thực hiện bởi <em>{log.performedBy}</em>
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}