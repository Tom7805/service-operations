import { useCallback, useEffect, useMemo, useState } from 'react';
import { getAllProjects } from '../api/projectsApi';
import type { ProjectRes } from '../types/projectTypes';
import { ICONS } from '../../../components/common/icons';
import PageHeader from '../../../components/common/PageHeader';
import TableSkeleton from '../../../components/common/TableSkeleton';
import RowActionsMenu, { type RowAction } from '../../../components/common/RowActionsMenu';

interface ProjectListPageProps {
  currentUserRoles: string[];
  /** Bấm vào một dự án — màn cha quyết định mở đâu (trang dự án, hay Lợi nhuận với vai trò chỉ xem số liệu). */
  onOpen: (project: ProjectRes) => void;
  /** Lối tắt sang Nghiệm thu với dự án đã chọn sẵn (chỉ vai trò được lập phiếu). */
  onOpenAcceptance?: (project: ProjectRes) => void;
  /** Lối tắt sang Lợi nhuận dự án với dự án đã chọn sẵn. */
  onOpenProfit?: (project: ProjectRes) => void;
}

type StatusFilter = 'RUNNING' | 'CLOSED' | 'ALL';

/** yyyy-MM-dd → dd/MM/yyyy (không qua Date để tránh lệch múi giờ). */
function formatDay(iso: string | null | undefined): string {
  if (!iso) return '—';
  const [y, m, d] = iso.slice(0, 10).split('-');
  return y && m && d ? `${d}/${m}/${y}` : iso;
}

function todayIso(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** Tìm không phân biệt dấu tiếng Việt: "trien khai" khớp "Triển khai". */
function fold(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
}

/**
 * Danh sách dự án — điểm vào của mọi việc theo dự án (công việc, nghiệm thu, lợi nhuận).
 *
 * Trước đây hệ thống không có màn hình này: muốn mở một dự án phải đi Khách hàng → Lịch sử hợp tác →
 * Dự án, và ở Nghiệm thu / Lợi nhuận phải tự chọn lại dự án. Danh sách theo cùng mẫu "danh sách gọn"
 * của Nhân sự, Khách hàng, Hợp đồng: mỗi hàng một dòng, bấm cả hàng để mở, menu ⋮ chỉ hiện khi rê chuột.
 * Backend đã lọc theo phạm vi dữ liệu (quản lý dự án chỉ thấy dự án trong phạm vi của mình).
 */
export default function ProjectListPage({ currentUserRoles, onOpen, onOpenAcceptance, onOpenProfit }: ProjectListPageProps) {
  const [projects, setProjects] = useState<ProjectRes[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('RUNNING');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setProjects(await getAllProjects());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không tải được danh sách dự án.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const today = todayIso();
  const counts = useMemo(
    () => ({
      RUNNING: projects.filter((p) => p.status === 'RUNNING').length,
      CLOSED: projects.filter((p) => p.status !== 'RUNNING').length,
      ALL: projects.length,
    }),
    [projects],
  );

  const visible = useMemo(() => {
    const term = fold(search.trim());
    return projects.filter((p) => {
      if (status === 'RUNNING' && p.status !== 'RUNNING') return false;
      if (status === 'CLOSED' && p.status === 'RUNNING') return false;
      if (!term) return true;
      return [p.name, p.projectCode, p.customerName ?? '', p.projectManagerName ?? ''].some((v) => fold(v).includes(term));
    });
  }, [projects, search, status]);

  const actionsFor = (p: ProjectRes): RowAction[] => {
    const actions: RowAction[] = [{ key: 'open', label: 'Mở dự án', icon: ICONS.folder, onClick: () => onOpen(p) }];
    if (onOpenAcceptance) actions.push({ key: 'acceptance', label: 'Nghiệm thu', icon: ICONS.check, onClick: () => onOpenAcceptance(p) });
    if (onOpenProfit) actions.push({ key: 'profit', label: 'Lợi nhuận', icon: ICONS.percent, onClick: () => onOpenProfit(p) });
    return actions;
  };

  // Kế toán chỉ xem số liệu: bấm vào dự án mở thẳng Lợi nhuận, menu chỉ còn một mục — không cần menu.
  const showActions = currentUserRoles.some((r) => r === 'VT-01' || r === 'VT-02');

  const filters: Array<{ key: StatusFilter; label: string }> = [
    { key: 'RUNNING', label: 'Đang thực hiện' },
    { key: 'CLOSED', label: 'Đã đóng' },
    { key: 'ALL', label: 'Tất cả' },
  ];

  return (
    <div className="user-management-page">
      <PageHeader title="Dự án" />

      <div className="user-table-card">
        <div className="user-table-toolbar">
          <div className="search-box">
            <svg className="search-box__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <input
              type="text"
              className="search-box__input"
              placeholder="Tìm dự án, mã dự án, khách hàng"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Tìm dự án"
            />
            {search && (
              <button type="button" className="search-box__clear" onClick={() => setSearch('')} aria-label="Xóa tìm kiếm">
                {ICONS.close}
              </button>
            )}
          </div>
          <div className="toolbar-filters">
            <div className="status-tabs" role="group" aria-label="Lọc theo trạng thái">
              {filters.map((f) => (
                <button
                  key={f.key}
                  type="button"
                  className={`status-tab ${status === f.key ? 'status-tab--active' : ''}`}
                  aria-pressed={status === f.key}
                  onClick={() => setStatus(f.key)}
                >
                  {f.label} <span className="status-tab__count">{counts[f.key]}</span>
                </button>
              ))}
            </div>
            <button type="button" className="btn-icon-refresh" onClick={() => void load()} title="Tải lại" aria-label="Tải lại danh sách dự án">
              {ICONS.refresh}
            </button>
          </div>
        </div>

        {error && (
          <div className="alert alert--error" role="alert" style={{ margin: '0 20px 12px' }}>
            <span className="alert__icon">{ICONS.alertTriangle}</span>
            <span>{error}</span>
          </div>
        )}

        <div className="table-responsive">
          <table className="user-data-table list-table" data-testid="project-list">
            <thead>
              <tr>
                <th style={{ width: '34%' }}>Dự án</th>
                <th style={{ width: '24%' }}>Khách hàng</th>
                <th className="list-table__hide-sm" style={{ width: '17%' }}>Quản lý dự án</th>
                <th className="list-table__hide-sm" style={{ width: '12%' }}>Kết thúc dự kiến</th>
                <th style={{ width: '13%' }}>Trạng thái</th>
                <th className="list-table__actions">
                  <span className="visually-hidden">Thao tác</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <TableSkeleton columns={6} rows={5} />
              ) : visible.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: 'var(--ink-muted)' }}>
                    {projects.length === 0
                      ? 'Chưa có dự án nào. Dự án được tạo từ hợp đồng đã ký.'
                      : 'Không có dự án khớp bộ lọc.'}
                  </td>
                </tr>
              ) : (
                visible.map((p) => {
                  const running = p.status === 'RUNNING';
                  const overdue = running && Boolean(p.expectedEndDate) && p.expectedEndDate.slice(0, 10) < today;
                  return (
                    <tr key={p.id} className="list-table__row" onClick={() => onOpen(p)} data-testid={`project-row-${p.id}`}>
                      <td>
                        <div className="user-profile-meta">
                          <button
                            type="button"
                            className="list-table__title"
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpen(p);
                            }}
                            title={p.name}
                          >
                            {p.name}
                          </button>
                          <span className="list-table__sub">{p.projectCode}</span>
                        </div>
                      </td>
                      <td>
                        <span className="list-table__clip" title={p.customerName ?? undefined}>
                          {p.customerName || '—'}
                        </span>
                      </td>
                      <td className="list-table__hide-sm">
                        <span className="list-table__clip" title={p.projectManagerName ?? undefined}>
                          {p.projectManagerName || '—'}
                        </span>
                      </td>
                      <td className="list-table__muted list-table__hide-sm">{formatDay(p.expectedEndDate)}</td>
                      <td>
                        {!running ? (
                          <span className="list-status list-status--off">Đã đóng</span>
                        ) : overdue ? (
                          <span className="list-status list-status--danger" title="Đã qua ngày kết thúc dự kiến">Quá hạn</span>
                        ) : (
                          <span className="list-status list-status--on">Đang thực hiện</span>
                        )}
                      </td>
                      <td className="list-table__actions" onClick={(e) => e.stopPropagation()}>
                        {showActions && <RowActionsMenu ariaLabel={`Thao tác với ${p.name}`} actions={actionsFor(p)} />}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="table-footer">
          Hiển thị <strong>{visible.length}</strong> / <strong>{projects.length}</strong> dự án
        </div>
      </div>
    </div>
  );
}
