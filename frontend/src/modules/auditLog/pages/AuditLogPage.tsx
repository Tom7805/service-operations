import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { AuditLogApiError, searchAuditLogs } from '../api/auditLogApi';
import { TARGET_TYPE_LABELS, roleLabel, type AuditLogEntry, type AuditTargetType } from '../types/auditLogTypes';
import { ICONS } from '../../../components/common/icons';
import TableSkeleton from '../../../components/common/TableSkeleton';

interface AuditLogPageProps {
  currentUserRoles?: string[];
  currentUserName?: string;
}

const PAGE_SIZE = 20;

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('vi-VN');
}

export default function AuditLogPage({
  currentUserRoles = ['VT-07'],
  currentUserName = 'Quản trị viên',
}: AuditLogPageProps) {
  const isAdmin = currentUserRoles.includes('VT-07');

  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [usernameInput, setUsernameInput] = useState('');
  const [targetTypeInput, setTargetTypeInput] = useState<AuditTargetType | ''>('');
  const [fromInput, setFromInput] = useState('');
  const [toInput, setToInput] = useState('');

  const [appliedFilters, setAppliedFilters] = useState({
    actorUsername: '',
    targetType: '' as AuditTargetType | '',
    from: '',
    to: '',
  });

  const fetchLogs = useCallback(
    async (targetPage: number) => {
      if (!isAdmin) return;
      setLoading(true);
      setError(null);
      try {
        const result = await searchAuditLogs({
          actorUsername: appliedFilters.actorUsername || undefined,
          targetType: appliedFilters.targetType || undefined,
          from: appliedFilters.from || undefined,
          to: appliedFilters.to || undefined,
          page: targetPage,
          size: PAGE_SIZE,
        });
        setEntries(result.content);
        setPage(result.page);
        setTotalPages(result.totalPages);
        setTotalElements(result.totalElements);
      } catch (err) {
        const message =
          err instanceof AuditLogApiError
            ? err.message
            : err instanceof Error
              ? err.message
              : 'Không thể tải nhật ký thao tác.';
        setError(message);
      } finally {
        setLoading(false);
      }
    },
    [isAdmin, appliedFilters]
  );

  useEffect(() => {
    fetchLogs(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appliedFilters]);

  // Tự lọc sau khi người dùng ngừng thao tác ~400ms — không cần bấm "Tìm kiếm".
  useEffect(() => {
    const timer = setTimeout(() => {
      setAppliedFilters((prev) => {
        const next = {
          actorUsername: usernameInput.trim(),
          targetType: targetTypeInput,
          from: fromInput,
          to: toInput,
        };
        const unchanged =
          prev.actorUsername === next.actorUsername &&
          prev.targetType === next.targetType &&
          prev.from === next.from &&
          prev.to === next.to;
        return unchanged ? prev : next;
      });
    }, 400);
    return () => clearTimeout(timer);
  }, [usernameInput, targetTypeInput, fromInput, toInput]);

  const handleApplyFilters = (e: FormEvent) => {
    e.preventDefault();
    setAppliedFilters({
      actorUsername: usernameInput.trim(),
      targetType: targetTypeInput,
      from: fromInput,
      to: toInput,
    });
  };

  const handleResetFilters = () => {
    setUsernameInput('');
    setTargetTypeInput('');
    setFromInput('');
    setToInput('');
    setAppliedFilters({ actorUsername: '', targetType: '', from: '', to: '' });
  };

  if (!isAdmin) {
    return (
      <div className="access-denied-container">
        <div className="access-denied-card">
          <div className="access-denied-icon">{ICONS.shieldOff}</div>
          <h2>Bạn không có thẩm quyền truy cập màn hình này</h2>
          <p>
            Nhật ký thao tác tổng hợp chỉ dành riêng cho vai trò <strong>Quản trị viên</strong>.
          </p>
          <div className="security-log-badge">
            <span className="security-log-badge__item">Tài khoản: {currentUserName}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="user-management-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Nhật ký thao tác hệ thống</h1>
          <p className="page-subtitle">
            Toàn bộ thao tác nghiệp vụ và lần từ chối truy cập trái phép trên mọi module — lưu trên máy chủ.
          </p>
        </div>
        <button
          type="button"
          className="btn-icon-refresh"
          onClick={() => fetchLogs(page)}
          title="Làm mới dữ liệu"
          aria-label="Làm mới dữ liệu"
        >
          {ICONS.refresh}
        </button>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-card__icon stat-card__icon--blue">{ICONS.clipboardList}</div>
          <div>
            <span className="stat-card__label">Tổng số bản ghi thỏa bộ lọc</span>
            <strong className="stat-card__value">{totalElements}</strong>
          </div>
        </div>
      </div>

      {error && (
        <div className="alert alert--error" role="alert">
          <span className="alert__icon">{ICONS.alertTriangle}</span>
          <span>{error}</span>
          <button type="button" className="btn-secondary text-dark ml-auto" onClick={() => fetchLogs(page)}>
            Thử lại
          </button>
        </div>
      )}

      <form className="user-table-card" onSubmit={handleApplyFilters}>
        <div className="user-table-toolbar">
          <div className="toolbar-filters">
            <div className="filter-group">
              <span className="filter-label">Người thực hiện</span>
              <input
                type="text"
                className="form-input audit-filter-username"
                placeholder="vd: admin"
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
              />
            </div>
            <div className="filter-group">
              <span className="filter-label">Loại đối tượng</span>
              <select
                className="filter-select"
                value={targetTypeInput}
                onChange={(e) => setTargetTypeInput(e.target.value as AuditTargetType | '')}
              >
                <option value="">Tất cả</option>
                {(Object.keys(TARGET_TYPE_LABELS) as AuditTargetType[]).map((code) => (
                  <option key={code} value={code}>
                    {TARGET_TYPE_LABELS[code]}
                  </option>
                ))}
              </select>
            </div>
            <div className="filter-group">
              <span className="filter-label">Từ ngày</span>
              <input
                type="datetime-local"
                className="filter-select"
                value={fromInput}
                onChange={(e) => setFromInput(e.target.value)}
              />
            </div>
            <div className="filter-group">
              <span className="filter-label">Đến ngày</span>
              <input
                type="datetime-local"
                className="filter-select"
                value={toInput}
                onChange={(e) => setToInput(e.target.value)}
              />
            </div>
            <button type="submit" className="btn-primary">
              <span className="icon-sm">{ICONS.search}</span> Tìm kiếm
            </button>
            <button type="button" className="btn-secondary" onClick={handleResetFilters}>
              Đặt lại bộ lọc
            </button>
          </div>
        </div>

        <div className="table-responsive">
          <table className="user-data-table">
            <thead>
              <tr>
                <th>Thời điểm</th>
                <th>Người thực hiện</th>
                <th>Hành động</th>
                <th>Đối tượng</th>
                <th>Chi tiết</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <TableSkeleton columns={5} />
              ) : entries.length === 0 ? (
                <tr>
                  <td colSpan={5}>
                    <div className="table-empty-state">
                      <div className="empty-icon">{ICONS.clipboardList}</div>
                      <h3>Không tìm thấy bản ghi nào</h3>
                      <p>Thử điều chỉnh người thực hiện, loại đối tượng hoặc khoảng thời gian đang lọc.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                entries.map((entry) => (
                  <tr key={entry.id}>
                    <td>{formatDateTime(entry.performedAt)}</td>
                    <td>
                      <span className="user-profile-username">@{entry.actorUsername ?? '—'}</span>
                      {entry.actorRole && (
                        <span className="audit-actor-role">{roleLabel(entry.actorRole)}</span>
                      )}
                    </td>
                    <td>
                      <span className="role-chip" title={entry.action}>{entry.action}</span>
                    </td>
                    {/* Đối tượng: bản ghi nghiệp vụ cụ thể HOẶC tên chức năng (sự kiện bảo mật); trống
                        (VD lần từ chối truy cập không nhận diện được chức năng) -> ghi rõ bằng lời thay
                        vì để trống/dấu gạch ngang trông như thiếu dữ liệu. */}
                    {entry.targetLabel ? (
                      <td><span className="cell-dept" title={entry.targetLabel}>{entry.targetLabel}</span></td>
                    ) : (
                      <td><span className="cell-muted">Không có</span></td>
                    )}
                    <td className="audit-detail-cell" title={entry.detail ?? undefined}>{entry.detail || '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="table-footer table-footer--paginated">
          <span>
            Trang {totalPages === 0 ? 0 : page + 1}/{totalPages} — {totalElements} bản ghi
          </span>
          <div className="table-footer__pagination">
            <button type="button" className="btn-secondary" disabled={page <= 0 || loading} onClick={() => fetchLogs(page - 1)}>
              <span className="icon-sm">{ICONS.arrowLeft}</span> Trang trước
            </button>
            <button
              type="button"
              className="btn-secondary"
              disabled={page + 1 >= totalPages || loading}
              onClick={() => fetchLogs(page + 1)}
            >
              Trang sau <span className="icon-sm">{ICONS.arrowRight}</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
