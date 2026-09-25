import { useCallback, useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { ICONS } from '../../../components/common/icons';
import { fetchPortalAcceptances } from '../api/portalApi';
import {
  PORTAL_ACCEPTANCE_LIST_STATUS_LABEL,
  type PortalAcceptanceStatus,
  type PortalAcceptanceSummary,
} from '../types/portalTypes';
import { formatPortalDateTime, formatPortalMoney } from '../utils/portalFormat';

interface Props {
  /** Lọc sẵn theo dự án (mở từ trang tiến độ dự án). */
  projectId?: number | null;
  onChangeProject: (projectId: number | null) => void;
  onOpen: (certificateId: number) => void;
}

type StatusFilter = 'ALL' | PortalAcceptanceStatus;

export const ACCEPTANCE_STATUS_TONE: Record<PortalAcceptanceStatus, string> = {
  PENDING_CONFIRMATION: 'badge--orange',
  ACCEPTED: 'badge--green',
  NEEDS_REVISION: 'badge--purple',
};

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
 * NCL-13-CN-003 — danh sách phiếu nghiệm thu của các dự án của khách hàng. Phiếu chờ khách hàng xác nhận được đưa lên
 * đầu và mở sẵn bộ lọc "Chờ bạn xác nhận" khi có; bấm một phiếu để xem nội dung và xác nhận/từ chối.
 */
export default function PortalAcceptancePage({ projectId = null, onChangeProject, onOpen }: Props) {
  const [items, setItems] = useState<PortalAcceptanceSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');

  const load = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      // Lấy toàn bộ phiếu (lọc dự án phía giao diện) để bộ chọn dự án và số đếm luôn đầy đủ.
      const list = await fetchPortalAcceptances();
      setItems(list);
      if (list.some((a) => a.awaitingDecision)) setStatusFilter('PENDING_CONFIRMATION');
    } catch (err) {
      setItems([]);
      setLoadError(err instanceof Error && err.message ? err.message : 'Không tải được phiếu nghiệm thu.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const projects = useMemo(() => {
    const map = new Map<number, string>();
    items.forEach((a) => map.set(a.projectId, `${a.projectCode} — ${a.projectName}`));
    return [...map.entries()];
  }, [items]);

  const inProject = useMemo(() => items.filter((a) => projectId == null || a.projectId === projectId), [items, projectId]);
  const count = (s: PortalAcceptanceStatus) => inProject.filter((a) => a.status === s).length;

  const visible = useMemo(
    () =>
      [...inProject]
        .filter((a) => statusFilter === 'ALL' || a.status === statusFilter)
        .sort((a, b) => Number(b.awaitingDecision) - Number(a.awaitingDecision)),
    [inProject, statusFilter]
  );

  const projectLabel = projects.find(([id]) => id === projectId)?.[1];

  return (
    <div className="portal-page">
      <div className="page-header">
        <div>
          <div className="page-header__kicker">
            <span className="page-header__tag">{ICONS.checkCircle} NGHIỆM THU</span>
            <span className="page-header__dot" />
            <span className="page-header__meta">{projectLabel ?? 'TẤT CẢ DỰ ÁN'}</span>
          </div>
          <h1 className="page-title">Phiếu nghiệm thu</h1>
          <p className="page-subtitle">
            Xem nội dung các phiếu nghiệm thu và xác nhận hoặc từ chối ngay trên cổng — không cần ký giấy gửi qua lại.
          </p>
        </div>
        <button type="button" className="btn btn-secondary" onClick={() => void load()} disabled={isLoading}>
          <span className="icon-xs">{ICONS.refresh}</span> Làm mới
        </button>
      </div>

      {isLoading ? (
        <div className="user-table-card">
          <div className="table-loading-state">
            <div className="spinner-lg" />
            <p>Đang tải phiếu nghiệm thu...</p>
          </div>
        </div>
      ) : loadError ? (
        <div className="user-table-card">
          <div className="table-error-state" role="alert">
            <div className="table-error-state__icon">{ICONS.alertTriangle}</div>
            <div className="table-error-state__body">
              <h3>Không tải được phiếu nghiệm thu</h3>
              <p>{loadError}</p>
            </div>
            <button type="button" className="btn btn-secondary" onClick={() => void load()}>
              Thử lại
            </button>
          </div>
        </div>
      ) : (
        <>
          {count('PENDING_CONFIRMATION') > 0 && (
            <div className="alert-box alert-box--warning alert-box--inline" data-testid="portal-acceptance-pending-banner">
              <span className="alert-box__icon">{ICONS.bell}</span>
              <div className="alert-box__content">
                Bạn có <strong>{count('PENDING_CONFIRMATION')}</strong> phiếu nghiệm thu đang chờ xác nhận. Việc xác nhận
                sớm giúp mốc thanh toán được mở đúng hạn.
              </div>
            </div>
          )}

          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-card__icon stat-card__icon--amber">{ICONS.clock}</div>
              <div>
                <span className="stat-card__label">Chờ bạn xác nhận</span>
                <div className="stat-card__value" data-testid="portal-acceptance-pending-count">{count('PENDING_CONFIRMATION')}</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-card__icon stat-card__icon--green">{ICONS.checkCircle}</div>
              <div>
                <span className="stat-card__label">Đã nghiệm thu</span>
                <div className="stat-card__value">{count('ACCEPTED')}</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-card__icon stat-card__icon--purple">{ICONS.edit}</div>
              <div>
                <span className="stat-card__label">Đang chỉnh sửa theo góp ý</span>
                <div className="stat-card__value">{count('NEEDS_REVISION')}</div>
              </div>
            </div>
          </div>

          <div className="user-table-card">
            <div className="user-table-toolbar">
              <div className="filter-group">
                <label htmlFor="portal-acceptance-project" className="filter-label">Dự án:</label>
                <select
                  id="portal-acceptance-project"
                  className="filter-select"
                  style={{ maxWidth: '320px' }}
                  value={projectId ?? ''}
                  onChange={(e) => onChangeProject(e.target.value ? Number(e.target.value) : null)}
                  data-testid="portal-acceptance-project"
                >
                  <option value="">Tất cả dự án</option>
                  {projects.map(([id, label]) => (
                    <option key={id} value={id}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="status-tabs" role="tablist" aria-label="Lọc phiếu theo trạng thái">
                {(
                  [
                    ['ALL', 'Tất cả', inProject.length],
                    ['PENDING_CONFIRMATION', 'Chờ xác nhận', count('PENDING_CONFIRMATION')],
                    ['NEEDS_REVISION', 'Đang chỉnh sửa', count('NEEDS_REVISION')],
                    ['ACCEPTED', 'Đã nghiệm thu', count('ACCEPTED')],
                  ] as const
                ).map(([key, label, n]) => (
                  <button
                    key={key}
                    type="button"
                    role="tab"
                    aria-selected={statusFilter === key}
                    className={`status-tab ${statusFilter === key ? 'status-tab--active' : ''}`}
                    onClick={() => setStatusFilter(key)}
                    data-testid={`portal-acceptance-tab-${key}`}
                  >
                    {label} ({n})
                  </button>
                ))}
              </div>
            </div>

            {visible.length === 0 ? (
              <div className="table-empty-state" data-testid="portal-acceptance-empty">
                <div className="table-empty-state__icon">{ICONS.clipboardList}</div>
                <h3>{items.length === 0 ? 'Chưa có phiếu nghiệm thu nào' : 'Không có phiếu khớp bộ lọc'}</h3>
                <p>
                  {items.length === 0
                    ? 'Khi quản lý dự án lập phiếu nghiệm thu cho một hạng mục, phiếu sẽ hiện ở đây để bạn xác nhận.'
                    : 'Thử đổi dự án hoặc trạng thái.'}
                </p>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="user-data-table" data-testid="portal-acceptance-table">
                  <thead>
                    <tr>
                      <th style={headStyle}>Phiếu</th>
                      <th style={headStyle}>Dự án / hạng mục</th>
                      <th style={{ ...headStyle, textAlign: 'right' }}>Giá trị</th>
                      <th style={headStyle}>Trạng thái</th>
                      <th style={headStyle}>Cập nhật</th>
                      <th style={{ ...headStyle, textAlign: 'right' }}>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map((a) => (
                      <tr
                        key={a.id}
                        className={a.awaitingDecision ? 'portal-acceptance-row--pending' : ''}
                        data-testid={`portal-acceptance-row-${a.id}`}
                      >
                        <td>
                          <div style={{ fontWeight: 600 }}>{a.title}</div>
                          <div className="cell-muted" style={{ fontSize: '12.5px', fontFamily: 'var(--font-mono, monospace)' }}>
                            {a.certificateCode}
                            {a.revisionNo > 1 ? ` · lần gửi ${a.revisionNo}` : ''}
                          </div>
                        </td>
                        <td>
                          <div>{a.projectName}</div>
                          <div className="cell-muted" style={{ fontSize: '12.5px' }}>
                            {a.projectCode}
                            {a.workPackageName ? ` · ${a.workPackageName}` : ''}
                          </div>
                        </td>
                        <td style={{ textAlign: 'right', whiteSpace: 'nowrap', fontFamily: 'var(--font-mono, monospace)' }}>
                          {formatPortalMoney(a.acceptedValue)}
                        </td>
                        <td>
                          <span className={`badge ${ACCEPTANCE_STATUS_TONE[a.status as PortalAcceptanceStatus] ?? 'badge--gray'}`}>
                            {PORTAL_ACCEPTANCE_LIST_STATUS_LABEL[a.status as PortalAcceptanceStatus] ?? a.status}
                          </span>
                        </td>
                        <td className="cell-muted" style={{ fontSize: '12.5px', whiteSpace: 'nowrap' }}>
                          {formatPortalDateTime(a.confirmedAt ?? a.updatedAt ?? a.createdAt)}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            type="button"
                            className={`btn ${a.awaitingDecision ? 'btn-primary' : 'btn-secondary'}`}
                            onClick={() => onOpen(a.id)}
                            data-testid={`portal-acceptance-open-${a.id}`}
                          >
                            {a.awaitingDecision ? 'Xem & duyệt' : 'Xem phiếu'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
