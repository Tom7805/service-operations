import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { AuditLogApiError, searchAuditLogs } from '../api/auditLogApi';
import { TARGET_TYPE_LABELS, type AuditLogEntry, type AuditTargetType } from '../types/auditLogTypes';
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
          <span className="eyebrow text-danger">Từ chối truy cập (Access Denied)</span>
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
          <p className="page-subtitle">Toàn bộ thao tác tài khoản, phân quyền, xác thực hai bước — lưu trên máy chủ.</p>
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
        <div className="stat-card">
          <div className="stat-card__icon stat-card__icon--purple">{ICONS.history}</div>
          <div>
            <span className="stat-card__label">Số trang</span>
            <strong className="stat-card__value">{totalPages}</strong>
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
                className="form-input"
                style={{ height: 38, width: 180 }}
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
                <th>Loại đối tượng</th>
                <th>Đối tượng</th>
                <th>Chi tiết</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <TableSkeleton columns={6} />
              ) : entries.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: '#787774' }}>
                    Không tìm thấy bản ghi nào thỏa bộ lọc đã chọn.
                  </td>
                </tr>
              ) : (
                entries.map((entry) => (
                  <tr key={entry.id}>
                    <td>{formatDateTime(entry.performedAt)}</td>
                    <td>
                      <span className="user-profile-username">@{entry.actorUsername ?? '—'}</span>
                    </td>
                    <td>
                      <span className="role-chip">{entry.action}</span>
                    </td>
                    <td>{TARGET_TYPE_LABELS[entry.targetType]}</td>
                    <td className="cell-dept">{entry.targetLabel ?? '—'}</td>
                    <td className="cell-email">{entry.detail ?? '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="table-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>
            Trang {totalPages === 0 ? 0 : page + 1}/{totalPages} — {totalElements} bản ghi
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="btn-secondary" disabled={page <= 0 || loading} onClick={() => fetchLogs(page - 1)}>
              ← Trang trước
            </button>
            <button
              type="button"
              className="btn-secondary"
              disabled={page + 1 >= totalPages || loading}
              onClick={() => fetchLogs(page + 1)}
            >
              Trang sau →
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
