import { useCallback, useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { ICONS } from '../../../components/common/icons';
import RowActionsMenu from '../../../components/common/RowActionsMenu';
import { roleLabel, roleLabels } from '../../../utils/roleLabel';
import { fetchCustomers } from '../../customers/api/customersApi';
import type { Customer } from '../../customers/types/customerTypes';
import type { AuditLogEntry } from '../../auditLog/types/auditLogTypes';
import {
  checkPortalAccountAccess,
  fetchPortalAccountHistory,
  fetchPortalAccounts,
} from '../api/portalAccountApi';
import PortalAccountDetailModal, { formatDateTime } from '../components/PortalAccountDetailModal';
import PortalAccountGrantModal from '../components/PortalAccountGrantModal';
import PortalAccountStatusBadge from '../components/PortalAccountStatusBadge';
import PortalAccountStatusModal from '../components/PortalAccountStatusModal';
import { CONTACT_ROLE_LABEL, type ContactRole, type PortalAccountRes } from '../types/portalAccountTypes';

interface Props {
  currentUserRoles?: string[];
  currentUserName?: string;
  /** Mở trang Nhật ký hệ thống đầy đủ. */
  onViewAuditLog?: () => void;
}

type StatusFilter = 'ALL' | 'ACTIVE' | 'LOCKED';

const headStyle: CSSProperties = {
  padding: '12px 16px',
  fontFamily: 'var(--font-mono, monospace)',
  fontSize: '12px',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: 'var(--track-caps)',
  color: 'var(--ink-muted)',
  whiteSpace: 'nowrap',
};

/**
 * NCL-13-CN-001 — Cấp tài khoản cổng cho khách hàng (Quản trị viên, VT-07).
 *
 * Quản trị viên chọn một người liên hệ của khách hàng và cấp tài khoản cổng gắn cố định với khách hàng đó (TC-01);
 * khoá tài khoản khi người liên hệ nghỉ việc — không đăng nhập được nữa, dữ liệu giữ nguyên (TC-02). Người không phải
 * Quản trị viên bị từ chối và lần từ chối được backend ghi nhật ký (TC-03). Mỗi lần cấp/khoá/mở khoá hiện trong lịch sử
 * với người thực hiện, nội dung và thời điểm (TC-04).
 */
export default function PortalAccountPage({
  currentUserRoles = [],
  currentUserName = 'Người dùng',
  onViewAuditLog,
}: Props) {
  const isAdmin = currentUserRoles.includes('VT-07');

  // TC-03: gọi thật endpoint để backend trả 403 và ghi "Từ chối truy cập — Cấp tài khoản cổng khách hàng".
  useEffect(() => {
    if (isAdmin) return;
    checkPortalAccountAccess().catch(() => undefined);
  }, [isAdmin]);

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customersLoading, setCustomersLoading] = useState(false);
  const [customerFilter, setCustomerFilter] = useState<number | ''>('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [search, setSearch] = useState('');

  const [accounts, setAccounts] = useState<PortalAccountRes[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [recent, setRecent] = useState<AuditLogEntry[]>([]);
  const [recentLoading, setRecentLoading] = useState(false);
  const [recentError, setRecentError] = useState<string | null>(null);

  const [notice, setNotice] = useState<string | null>(null);
  const [highlightId, setHighlightId] = useState<number | null>(null);
  const [grantOpen, setGrantOpen] = useState(false);
  const [detailTarget, setDetailTarget] = useState<PortalAccountRes | null>(null);
  const [statusTarget, setStatusTarget] = useState<PortalAccountRes | null>(null);
  const [historyVersion, setHistoryVersion] = useState(0);

  const loadAccounts = useCallback(async (customerId: number | '') => {
    setIsLoading(true);
    setLoadError(null);
    try {
      setAccounts(await fetchPortalAccounts({ customerId: customerId === '' ? null : customerId }));
    } catch (err) {
      setAccounts([]);
      setLoadError(err instanceof Error && err.message ? err.message : 'Không tải được danh sách tài khoản cổng.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadRecent = useCallback(async () => {
    setRecentLoading(true);
    setRecentError(null);
    try {
      setRecent((await fetchPortalAccountHistory(undefined, 50, true)).slice(0, 10));
    } catch (err) {
      setRecent([]);
      setRecentError(err instanceof Error && err.message ? err.message : 'Không tải được nhật ký cổng khách hàng.');
    } finally {
      setRecentLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;
    setCustomersLoading(true);
    fetchCustomers()
      .then((list) => {
        if (!cancelled) setCustomers(list);
      })
      .catch(() => {
        if (!cancelled) setCustomers([]);
      })
      .finally(() => {
        if (!cancelled) setCustomersLoading(false);
      });
    void loadRecent();
    return () => {
      cancelled = true;
    };
  }, [isAdmin, loadRecent]);

  useEffect(() => {
    if (!isAdmin) return;
    void loadAccounts(customerFilter);
  }, [isAdmin, customerFilter, loadAccounts]);

  const counts = useMemo(
    () => ({
      total: accounts.length,
      active: accounts.filter((a) => a.status === 'ACTIVE').length,
      locked: accounts.filter((a) => a.status === 'LOCKED').length,
      customers: new Set(accounts.map((a) => a.customerId)).size,
    }),
    [accounts]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return accounts.filter(
      (a) =>
        (statusFilter === 'ALL' || a.status === statusFilter) &&
        (!q ||
          a.username.toLowerCase().includes(q) ||
          (a.fullName ?? '').toLowerCase().includes(q) ||
          (a.email ?? '').toLowerCase().includes(q) ||
          (a.customerName ?? '').toLowerCase().includes(q) ||
          (a.customerCode ?? '').toLowerCase().includes(q))
    );
  }, [accounts, statusFilter, search]);

  const refreshAll = () => {
    void loadAccounts(customerFilter);
    void loadRecent();
    setHistoryVersion((v) => v + 1);
  };

  const handleCreated = (account: PortalAccountRes) => {
    setHighlightId(account.id);
    setNotice(
      `Đã cấp tài khoản cổng @${account.username} cho ${account.contactName ?? account.fullName} ` +
        `(${account.customerCode} · ${account.customerName}).`
    );
    refreshAll();
  };

  const handleStatusChanged = (updated: PortalAccountRes) => {
    setStatusTarget(null);
    setHighlightId(updated.id);
    setAccounts((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
    setDetailTarget((prev) => (prev && prev.id === updated.id ? updated : prev));
    setNotice(
      updated.status === 'LOCKED'
        ? `Đã khóa tài khoản cổng @${updated.username} — tài khoản không đăng nhập được nữa, dữ liệu được giữ nguyên.`
        : `Đã mở khóa tài khoản cổng @${updated.username} — người liên hệ đăng nhập lại được.`
    );
    void loadRecent();
    setHistoryVersion((v) => v + 1);
  };

  if (!isAdmin) {
    return (
      <div className="access-denied-container" data-testid="portal-account-access-denied">
        <div className="access-denied-card">
          <div className="access-denied-icon">{ICONS.shieldOff}</div>
          <h2>Bạn không có thẩm quyền cấp tài khoản cổng khách hàng</h2>
          <p>
            Chức năng cấp và quản lý tài khoản cổng khách hàng chỉ dành cho <strong>Quản trị viên</strong> (VT-07). Hệ
            thống đã ghi lại lần từ chối truy cập này vào nhật ký hệ thống.
          </p>
          <div className="security-log-badge">
            <span className="security-log-badge__item">
              {ICONS.shield} Thời điểm ghi nhận: {new Date().toLocaleString('vi-VN')}
            </span>
            <span className="security-log-badge__item">Tài khoản: {currentUserName}</span>
            <span className="security-log-badge__item">
              Vai trò tài khoản: {roleLabels(currentUserRoles) || '(không xác định)'}
            </span>
          </div>
        </div>
      </div>
    );
  }

  const selectedCustomer = customerFilter === '' ? null : customers.find((c) => c.id === customerFilter) ?? null;

  return (
    <div className="user-management-page">
      {notice && (
        <div className="alert-box alert-box--success" role="status" data-testid="portal-account-notice">
          <span className="alert-box__icon">{ICONS.checkCircle}</span>
          <div className="alert-box__content">{notice}</div>
          <button type="button" className="modal-close" onClick={() => setNotice(null)} aria-label="Ẩn thông báo">
            {ICONS.close}
          </button>
        </div>
      )}

      <div className="page-header">
        <div>
          <div className="page-header__kicker">
            <span className="page-header__tag">{ICONS.globe} CỔNG KHÁCH HÀNG</span>
            <span className="page-header__dot" />
            <span className="page-header__meta">{selectedCustomer ? selectedCustomer.code : 'TẤT CẢ KHÁCH HÀNG'}</span>
          </div>
          <h1 className="page-title">Tài khoản cổng khách hàng</h1>
          <p className="page-subtitle">
            Cấp tài khoản cho người liên hệ của khách hàng để họ tự theo dõi dự án — mỗi tài khoản chỉ xem được dữ liệu
            của đúng khách hàng mình.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => setGrantOpen(true)}
          data-testid="portal-account-open-grant"
        >
          <span className="icon-xs">{ICONS.plus}</span> Cấp tài khoản cổng
        </button>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-card__icon stat-card__icon--blue">{ICONS.users}</div>
          <div>
            <span className="stat-card__label">Tài khoản cổng</span>
            <div className="stat-card__value" data-testid="portal-account-total">{counts.total}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card__icon stat-card__icon--green">{ICONS.userCheck}</div>
          <div>
            <span className="stat-card__label">Đang hoạt động</span>
            <div className="stat-card__value text-success">{counts.active}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card__icon stat-card__icon--red">{ICONS.lock}</div>
          <div>
            <span className="stat-card__label">Đã khóa</span>
            <div className="stat-card__value text-danger" data-testid="portal-account-locked">{counts.locked}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card__icon stat-card__icon--purple">{ICONS.building}</div>
          <div>
            <span className="stat-card__label">Khách hàng có tài khoản</span>
            <div className="stat-card__value">{counts.customers}</div>
          </div>
        </div>
      </div>

      <div className="user-table-card">
        <div className="user-table-toolbar">
          <div className="search-box">
            <span className="search-box__icon" aria-hidden="true">{ICONS.search}</span>
            <input
              type="text"
              className="search-box__input"
              placeholder="Tìm theo tên đăng nhập, họ tên, email, khách hàng..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Tìm tài khoản cổng"
            />
            {search && (
              <button type="button" className="search-box__clear" onClick={() => setSearch('')} aria-label="Xóa tìm kiếm">
                <span className="icon-sm">{ICONS.close}</span>
              </button>
            )}
          </div>
          <div className="toolbar-filters">
            <div className="filter-group">
              <label htmlFor="portal-account-customer" className="filter-label">Khách hàng:</label>
              <select
                id="portal-account-customer"
                className="filter-select"
                style={{ maxWidth: '260px' }}
                value={customerFilter}
                onChange={(e) => setCustomerFilter(e.target.value ? Number(e.target.value) : '')}
                disabled={customersLoading}
                data-testid="portal-account-customer-filter"
              >
                <option value="">{customersLoading ? 'Đang tải...' : 'Tất cả khách hàng'}</option>
                {customers
                  .filter((c) => c.status !== 'MERGED')
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code} — {c.name}
                    </option>
                  ))}
              </select>
            </div>
            <div className="status-tabs" role="tablist" aria-label="Lọc theo trạng thái tài khoản cổng">
              {(
                [
                  ['ALL', 'Tất cả', counts.total],
                  ['ACTIVE', 'Hoạt động', counts.active],
                  ['LOCKED', 'Đã khóa', counts.locked],
                ] as const
              ).map(([key, label, count]) => (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={statusFilter === key}
                  className={`status-tab ${statusFilter === key ? 'status-tab--active' : ''}`}
                  onClick={() => setStatusFilter(key)}
                  data-testid={`portal-account-tab-${key}`}
                >
                  {label} ({count})
                </button>
              ))}
            </div>
            <button type="button" className="btn-icon-refresh" onClick={refreshAll} title="Tải lại" aria-label="Tải lại danh sách">
              {ICONS.refresh}
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="table-loading-state">
            <div className="spinner-lg" />
            <p>Đang tải tài khoản cổng...</p>
          </div>
        ) : loadError ? (
          <div className="table-error-state" role="alert">
            <div className="table-error-state__icon">{ICONS.alertTriangle}</div>
            <div className="table-error-state__body">
              <h3>Không tải được tài khoản cổng</h3>
              <p>{loadError}</p>
            </div>
            <button type="button" className="btn btn-secondary" onClick={() => void loadAccounts(customerFilter)}>
              Thử lại
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="table-empty-state" data-testid="portal-account-empty">
            <div className="table-empty-state__icon">{ICONS.key}</div>
            <h3>{accounts.length === 0 ? 'Chưa cấp tài khoản cổng nào' : 'Không có tài khoản khớp bộ lọc'}</h3>
            <p>
              {accounts.length === 0
                ? 'Bấm "Cấp tài khoản cổng" để chọn người liên hệ của khách hàng và cấp tài khoản.'
                : 'Thử đổi từ khóa tìm kiếm, khách hàng hoặc trạng thái.'}
            </p>
            {accounts.length === 0 && (
              <button type="button" className="btn btn-primary" onClick={() => setGrantOpen(true)}>
                <span className="icon-xs">{ICONS.plus}</span> Cấp tài khoản cổng
              </button>
            )}
          </div>
        ) : (
          <div className="table-responsive">
            <table className="user-data-table" data-testid="portal-account-table">
              <thead>
                <tr>
                  <th style={headStyle}>Tài khoản</th>
                  <th style={headStyle}>Khách hàng</th>
                  <th style={headStyle}>Người liên hệ</th>
                  <th style={headStyle}>Trạng thái</th>
                  <th style={headStyle}>Cấp bởi</th>
                  <th style={{ ...headStyle, textAlign: 'right' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((a) => {
                  const locked = a.status === 'LOCKED';
                  return (
                    <tr
                      key={a.id}
                      className={`${locked ? 'row--locked' : ''}${a.id === highlightId ? ' portal-account-row--new' : ''}`}
                      data-testid={`portal-account-row-${a.id}`}
                    >
                      <td>
                        <button
                          type="button"
                          className="portal-account-cell btn-link"
                          style={{ textAlign: 'left', padding: 0 }}
                          onClick={() => setDetailTarget(a)}
                          title="Xem chi tiết và lịch sử"
                        >
                          <span className="portal-account-cell__name">@{a.username}</span>
                          <span className="portal-account-cell__sub">{a.email || 'Chưa có email khôi phục'}</span>
                        </button>
                      </td>
                      <td>
                        <div className="portal-account-cell">
                          <span className="portal-account-cell__name">{a.customerName ?? '—'}</span>
                          <span className="portal-account-cell__sub">{a.customerCode}</span>
                        </div>
                      </td>
                      <td>
                        <div className="portal-account-cell">
                          <span>
                            {a.contactName ?? a.fullName}
                            {a.contactRole === 'PRIMARY' && (
                              <span className="badge badge--blue" style={{ marginLeft: '6px' }}>
                                {CONTACT_ROLE_LABEL[a.contactRole as ContactRole]}
                              </span>
                            )}
                          </span>
                          <span className="portal-account-cell__sub">{a.contactTitle || '—'}</span>
                        </div>
                      </td>
                      <td>
                        <PortalAccountStatusBadge status={a.status} />
                        {locked && a.statusReason && (
                          <div className="portal-account-cell__sub" style={{ marginTop: '4px', maxWidth: '220px' }}>
                            {a.statusReason}
                          </div>
                        )}
                      </td>
                      <td className="cell-muted" style={{ fontSize: '12.5px', whiteSpace: 'nowrap' }}>
                        {a.createdBy || '—'}
                        <div>{formatDateTime(a.createdAt)}</div>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <RowActionsMenu
                          ariaLabel={`Thao tác với tài khoản ${a.username}`}
                          actions={[
                            {
                              key: 'detail',
                              label: 'Xem chi tiết & lịch sử',
                              icon: ICONS.eye,
                              onClick: () => setDetailTarget(a),
                              testId: `portal-account-detail-${a.id}`,
                            },
                            {
                              key: 'toggle',
                              label: locked ? 'Mở khóa tài khoản' : 'Khóa tài khoản',
                              icon: locked ? ICONS.unlock : ICONS.lock,
                              tone: locked ? 'default' : 'danger',
                              onClick: () => setStatusTarget(a),
                              testId: `portal-account-toggle-${a.id}`,
                            },
                          ]}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {!isLoading && !loadError && accounts.length > 0 && (
          <div className="table-footer">
            <span className="table-footer__count">
              Hiển thị <strong>{filtered.length}</strong> / <strong>{accounts.length}</strong> tài khoản cổng
            </span>
          </div>
        )}
      </div>

      {/* TC-04: nhật ký cổng khách hàng — thao tác cấp/khoá/mở khoá gần đây, lưu trên máy chủ. */}
      <div className="user-table-card" style={{ marginTop: '16px', padding: '16px 20px' }} data-testid="portal-account-recent">
        <div className="portal-history__head">
          <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 600, display: 'inline-flex', gap: '6px', alignItems: 'center' }}>
            <span className="icon-xs">{ICONS.history}</span> Nhật ký cổng khách hàng gần đây
          </h4>
          <div style={{ display: 'inline-flex', gap: '8px', alignItems: 'center' }}>
            {onViewAuditLog && (
              <button type="button" className="btn-link" onClick={onViewAuditLog}>
                Xem toàn bộ nhật ký hệ thống
              </button>
            )}
            <button
              type="button"
              className="btn-icon-refresh"
              onClick={() => void loadRecent()}
              title="Tải lại nhật ký"
              aria-label="Tải lại nhật ký"
            >
              {ICONS.refresh}
            </button>
          </div>
        </div>
        {recentLoading ? (
          <p className="field-hint">Đang tải nhật ký...</p>
        ) : recentError ? (
          <p className="field-error">{recentError}</p>
        ) : recent.length === 0 ? (
          <p className="field-hint">Chưa có thao tác cấp/khóa tài khoản cổng hay lượt truy cập bị từ chối nào.</p>
        ) : (
          <div className="table-responsive">
            <table className="user-data-table">
              <thead>
                <tr>
                  <th style={headStyle}>Thời điểm</th>
                  <th style={headStyle}>Người thực hiện</th>
                  <th style={headStyle}>Thao tác</th>
                  <th style={headStyle}>Nội dung</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((entry) => (
                  <tr key={entry.id}>
                    <td className="cell-muted" style={{ whiteSpace: 'nowrap', fontSize: '13px' }}>
                      {formatDateTime(entry.performedAt)}
                    </td>
                    <td style={{ fontSize: '13.5px' }}>
                      <strong>{entry.actorUsername ?? 'Hệ thống'}</strong>
                      {entry.actorRole && <div className="cell-muted">{roleLabel(entry.actorRole)}</div>}
                    </td>
                    <td style={{ fontSize: '13.5px' }}>{entry.action}</td>
                    <td className="cell-muted" style={{ fontSize: '13px', overflowWrap: 'anywhere' }}>
                      {entry.detail ?? entry.targetLabel ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <PortalAccountGrantModal
        isOpen={grantOpen}
        customers={customers}
        customersLoading={customersLoading}
        initialCustomerId={customerFilter === '' ? null : customerFilter}
        onClose={() => setGrantOpen(false)}
        onCreated={handleCreated}
      />
      {detailTarget && (
        <PortalAccountDetailModal
          account={detailTarget}
          refreshKey={historyVersion}
          onClose={() => setDetailTarget(null)}
          onToggleStatus={(a) => setStatusTarget(a)}
        />
      )}
      {statusTarget && (
        <PortalAccountStatusModal
          account={statusTarget}
          onClose={() => setStatusTarget(null)}
          onChanged={handleStatusChanged}
          onStale={() => void loadAccounts(customerFilter)}
        />
      )}
    </div>
  );
}
