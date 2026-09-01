import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { AuditLogApiError, searchSensitiveAccessLogs } from '../api/auditLogApi';
import {
  ACCESS_ACTION_LABELS,
  DATA_TYPE_LABELS,
  type SensitiveAccessAction,
  type SensitiveAccessLogEntry,
  type SensitiveDataTypeCode,
} from '../types/auditLogTypes';
import { ICONS } from '../../../components/common/icons';
import TableSkeleton from '../../../components/common/TableSkeleton';

interface SensitiveAccessLogPageProps {
  currentUserRoles?: string[];
  currentUserName?: string;
}

const PAGE_SIZE = 20;

const ACTION_BADGE_CLASS: Record<SensitiveAccessAction, string> = {
  VIEW: 'badge--blue',
  EXPORT: 'badge--gold',
  DENIED: 'badge--red',
};

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('vi-VN');
}

export default function SensitiveAccessLogPage({
  currentUserRoles = ['VT-07'],
  currentUserName = 'Quản trị viên',
}: SensitiveAccessLogPageProps) {
  // NCL-01-CN-006-TC-03: chỉ Quản trị viên (VT-07) được truy cập màn hình này.
  const isAdmin = currentUserRoles.includes('VT-07');

  const [entries, setEntries] = useState<SensitiveAccessLogEntry[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [usernameInput, setUsernameInput] = useState('');
  const [dataTypeInput, setDataTypeInput] = useState<SensitiveDataTypeCode | ''>('');
  const [fromInput, setFromInput] = useState('');
  const [toInput, setToInput] = useState('');

  const [appliedFilters, setAppliedFilters] = useState({
    username: '',
    dataType: '' as SensitiveDataTypeCode | '',
    from: '',
    to: '',
  });

  const fetchLogs = useCallback(
    async (targetPage: number) => {
      if (!isAdmin) return;
      setLoading(true);
      setError(null);
      try {
        const result = await searchSensitiveAccessLogs({
          username: appliedFilters.username || undefined,
          dataType: appliedFilters.dataType || undefined,
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
              : 'Không thể tải nhật ký truy cập dữ liệu nhạy cảm.';
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
      username: usernameInput.trim(),
      dataType: dataTypeInput,
      from: fromInput,
      to: toInput,
    });
  };

  const handleResetFilters = () => {
    setUsernameInput('');
    setDataTypeInput('');
    setFromInput('');
    setToInput('');
    setAppliedFilters({ username: '', dataType: '', from: '', to: '' });
  };

  // TC-03: từ chối truy cập nếu không phải Quản trị viên.
  if (!isAdmin) {
    return (
      <div className="access-denied-container">
        <div className="access-denied-card">
          <div className="access-denied-icon">{ICONS.shieldOff}</div>
          <span className="eyebrow text-danger">Từ chối truy cập (Access Denied)</span>
          <h2>Bạn không có thẩm quyền truy cập màn hình này</h2>
          <p>
            Chức năng tra cứu nhật ký truy cập dữ liệu nhạy cảm chỉ dành riêng cho vai trò{' '}
            <strong>Quản trị viên</strong>. Hệ thống đã ghi nhận lần truy cập trái phép này vào
            nhật ký bảo mật phía máy chủ.
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

  const deniedCount = entries.filter((e) => e.action === 'DENIED').length;
  const exportCount = entries.filter((e) => e.action === 'EXPORT').length;

  return (
    <div className="user-management-page">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Nhật ký truy cập dữ liệu nhạy cảm</h1>
          <p className="page-subtitle">
            Tra cứu toàn bộ lượt xem, xuất và các lần bị từ chối truy cập dữ liệu lương, chi phí, giá vốn
            và biên lợi nhuận trong hệ thống.
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

      {/* KPI Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-card__icon stat-card__icon--blue">{ICONS.clipboardList}</div>
          <div>
            <span className="stat-card__label">Tổng số bản ghi thỏa bộ lọc</span>
            <strong className="stat-card__value">{totalElements}</strong>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card__icon stat-card__icon--purple">{ICONS.download}</div>
          <div>
            <span className="stat-card__label">Lượt xuất dữ liệu (trang này)</span>
            <strong className="stat-card__value">{exportCount}</strong>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card__icon stat-card__icon--red">{ICONS.shieldOff}</div>
          <div>
            <span className="stat-card__label">Lượt bị từ chối (trang này)</span>
            <strong className="stat-card__value text-danger">{deniedCount}</strong>
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

      {/* Bộ lọc — TC-01 */}
      <form className="user-table-card" onSubmit={handleApplyFilters}>
        <div className="user-table-toolbar">
          <div className="toolbar-filters">
            <div className="filter-group">
              <span className="filter-label">Tài khoản</span>
              <input
                type="text"
                className="form-input"
                style={{ height: 38, width: 180 }}
                placeholder="vd: nhansu"
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
              />
            </div>
            <div className="filter-group">
              <span className="filter-label">Loại dữ liệu</span>
              <select
                className="filter-select"
                value={dataTypeInput}
                onChange={(e) => setDataTypeInput(e.target.value as SensitiveDataTypeCode | '')}
              >
                <option value="">Tất cả</option>
                {(Object.keys(DATA_TYPE_LABELS) as SensitiveDataTypeCode[]).map((code) => (
                  <option key={code} value={code}>
                    {DATA_TYPE_LABELS[code]}
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

        {/* Bảng kết quả */}
        <div className="table-responsive">
          <table className="user-data-table">
            <thead>
              <tr>
                <th>Thời điểm</th>
                <th>Tài khoản</th>
                <th>Hành động</th>
                <th>Loại dữ liệu</th>
                <th>Đối tượng</th>
                <th>Địa chỉ IP</th>
                <th>Chi tiết</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <TableSkeleton columns={7} />
              ) : entries.length === 0 ? (
                <tr>
                  {/* TC-02: không có bản ghi nào thỏa bộ lọc */}
                  <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: '#787774' }}>
                    Không tìm thấy nhật ký truy cập nào thỏa bộ lọc đã chọn.
                  </td>
                </tr>
              ) : (
                entries.map((entry) => (
                  <tr key={entry.id}>
                    <td>{formatDateTime(entry.accessedAt)}</td>
                    <td>
                      <span className="user-profile-username">@{entry.username}</span>
                    </td>
                    <td>
                      <span className={`user-tag ${ACTION_BADGE_CLASS[entry.action]}`}>
                        {ACCESS_ACTION_LABELS[entry.action]}
                      </span>
                    </td>
                    <td>{DATA_TYPE_LABELS[entry.dataType]}</td>
                    <td className="cell-dept">{entry.targetRef ?? '—'}</td>
                    <td>
                      <span className="user-profile-username">{entry.ipAddress ?? '—'}</span>
                    </td>
                    <td className="cell-email">{entry.detail ?? '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Phân trang */}
        <div className="table-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>
            Trang {totalPages === 0 ? 0 : page + 1}/{totalPages} — {totalElements} bản ghi
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              className="btn-secondary"
              disabled={page <= 0 || loading}
              onClick={() => fetchLogs(page - 1)}
            >
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
