import { useCallback, useEffect, useMemo, useState } from 'react';
import { ICONS } from '../../../components/common/icons';
import { fetchPortalProjects } from '../api/portalApi';
import PortalProjectCard from '../components/PortalProjectCard';
import type { PortalProjectRes } from '../types/portalTypes';

interface Props {
  customerName: string;
  onOpenProject: (projectId: number) => void;
  /** Số phiếu nghiệm thu chờ khách hàng xác nhận (NCL-13-CN-003). */
  pendingAcceptances?: number;
  onOpenAcceptances?: () => void;
}

type StatusFilter = 'RUNNING' | 'CLOSED' | 'ALL';

/**
 * NCL-13-CN-002 — danh sách dự án của chính khách hàng trên cổng (TC-01): tiến độ công việc, mốc tiến độ và mốc kế
 * tiếp của từng dự án. Backend chỉ trả dự án của khách hàng gắn với tài khoản cổng (QTN-26) và ghi nhật ký mỗi lượt
 * xem (TC-05).
 */
export default function PortalDashboardPage({
  customerName,
  onOpenProject,
  pendingAcceptances = 0,
  onOpenAcceptances,
}: Props) {
  const [projects, setProjects] = useState<PortalProjectRes[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('RUNNING');
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const list = await fetchPortalProjects();
      setProjects(list);
      // Chưa có dự án đang chạy thì mở sẵn "Tất cả" để khách hàng vẫn thấy dự án đã kết thúc.
      if (!list.some((p) => p.status === 'RUNNING')) setStatusFilter('ALL');
    } catch (err) {
      setProjects([]);
      setLoadError(err instanceof Error && err.message ? err.message : 'Không tải được danh sách dự án.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const running = projects.filter((p) => p.status === 'RUNNING');
  const closedCount = projects.length - running.length;
  const lateMilestones = running.reduce((sum, p) => sum + p.lateMilestones, 0);
  const avgProgress = running.length
    ? Math.round(running.reduce((sum, p) => sum + p.progressPercent, 0) / running.length)
    : 0;

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return projects.filter(
      (p) =>
        (statusFilter === 'ALL' || p.status === statusFilter) &&
        (!q || p.name.toLowerCase().includes(q) || p.projectCode.toLowerCase().includes(q))
    );
  }, [projects, statusFilter, search]);

  return (
    <div className="portal-page">
      <div className="page-header">
        <div>
          <div className="page-header__kicker">
            <span className="page-header__tag">{ICONS.folder} DỰ ÁN CỦA BẠN</span>
            <span className="page-header__dot" />
            <span className="page-header__meta">{customerName}</span>
          </div>
          <h1 className="page-title">Tiến độ dự án</h1>
          <p className="page-subtitle">
            Theo dõi tỷ lệ hoàn thành, các mốc tiến độ và sản phẩm đã bàn giao của những dự án bạn đã thuê.
          </p>
        </div>
        <button type="button" className="btn btn-secondary" onClick={() => void load()} disabled={isLoading}>
          <span className="icon-xs">{ICONS.refresh}</span> Làm mới
        </button>
      </div>

      {pendingAcceptances > 0 && onOpenAcceptances && (
        <div className="alert-box alert-box--warning alert-box--inline" data-testid="portal-dashboard-pending">
          <span className="alert-box__icon">{ICONS.bell}</span>
          <div className="alert-box__content">
            Bạn có <strong>{pendingAcceptances}</strong> phiếu nghiệm thu đang chờ xác nhận.{' '}
            <button type="button" className="btn-link" onClick={onOpenAcceptances} style={{ padding: 0 }}>
              Xem và duyệt ngay
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="user-table-card">
          <div className="table-loading-state" data-testid="portal-projects-loading">
            <div className="spinner-lg" />
            <p>Đang tải dự án của bạn...</p>
          </div>
        </div>
      ) : loadError ? (
        <div className="user-table-card">
          <div className="table-error-state" role="alert">
            <div className="table-error-state__icon">{ICONS.alertTriangle}</div>
            <div className="table-error-state__body">
              <h3>Không tải được danh sách dự án</h3>
              <p>{loadError}</p>
            </div>
            <button type="button" className="btn btn-secondary" onClick={() => void load()}>
              Thử lại
            </button>
          </div>
        </div>
      ) : projects.length === 0 ? (
        <div className="table-empty-state" data-testid="portal-projects-empty">
          <div className="table-empty-state__icon">{ICONS.folder}</div>
          <h3>Chưa có dự án nào</h3>
          <p>Khi dự án của bạn được khởi tạo, tiến độ sẽ hiển thị tại đây. Cần hỗ trợ, vui lòng liên hệ quản lý dự án.</p>
        </div>
      ) : (
        <>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-card__icon stat-card__icon--blue">{ICONS.folder}</div>
              <div>
                <span className="stat-card__label">Đang thực hiện</span>
                <div className="stat-card__value" data-testid="portal-stat-running">{running.length}</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-card__icon stat-card__icon--green">{ICONS.chart}</div>
              <div>
                <span className="stat-card__label">Tiến độ trung bình</span>
                <div className="stat-card__value">{avgProgress}%</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-card__icon stat-card__icon--red">{ICONS.alertTriangle}</div>
              <div>
                <span className="stat-card__label">Mốc đang trễ</span>
                <div className="stat-card__value" data-testid="portal-stat-late">{lateMilestones}</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-card__icon stat-card__icon--purple">{ICONS.checkCircle}</div>
              <div>
                <span className="stat-card__label">Đã kết thúc</span>
                <div className="stat-card__value">{closedCount}</div>
              </div>
            </div>
          </div>

          <div className="portal-toolbar">
            <div className="search-box">
              <span className="search-box__icon" aria-hidden="true">{ICONS.search}</span>
              <input
                type="text"
                className="search-box__input"
                placeholder="Tìm theo tên hoặc mã dự án..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Tìm dự án"
              />
            </div>
            <div className="status-tabs" role="tablist" aria-label="Lọc dự án theo trạng thái">
              {(
                [
                  ['RUNNING', 'Đang thực hiện', running.length],
                  ['CLOSED', 'Đã kết thúc', closedCount],
                  ['ALL', 'Tất cả', projects.length],
                ] as const
              ).map(([key, label, count]) => (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={statusFilter === key}
                  className={`status-tab ${statusFilter === key ? 'status-tab--active' : ''}`}
                  onClick={() => setStatusFilter(key)}
                  data-testid={`portal-projects-tab-${key}`}
                >
                  {label} ({count})
                </button>
              ))}
            </div>
          </div>

          {visible.length === 0 ? (
            <div className="table-empty-state" data-testid="portal-projects-no-match">
              <div className="table-empty-state__icon">{ICONS.search}</div>
              <h3>Không có dự án khớp bộ lọc</h3>
              <p>Thử đổi từ khóa tìm kiếm hoặc trạng thái dự án.</p>
            </div>
          ) : (
            <div className="portal-project-grid" data-testid="portal-project-grid">
              {visible.map((p) => (
                <PortalProjectCard key={p.id} project={p} onOpen={onOpenProject} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
