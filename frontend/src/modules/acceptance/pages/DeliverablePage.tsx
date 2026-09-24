import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { ICONS } from '../../../components/common/icons';
import { roleLabels } from '../../../utils/roleLabel';
import { getWorkBreakdown } from '../../projects/api/projectsApi';
import type { ProjectRes } from '../../projects/types/projectTypes';
import type { WorkBreakdownRes } from '../../projects/types/taskTypes';
import { checkDeliverableAccess, fetchDeliverables, getDeliverable } from '../api/acceptanceApi';
import DeliverableFormModal from '../components/DeliverableFormModal';
import DeliverableVersionList from '../components/DeliverableVersionList';
import DeliverableVersionModal from '../components/DeliverableVersionModal';
import { DELIVERABLE_TYPE_LABEL, type DeliverableRes, type DeliverableVersionRes } from '../types/acceptanceTypes';
import { flattenWorkPackages } from '../utils/workPackageTree';

interface Props {
  currentUserRoles?: string[];
  currentUserName?: string;
  currentUserId?: number;
  projects: ProjectRes[];
  selectedProjectId: number | null;
  onSelectProject: (projectId: number | null) => void;
}

function formatDate(value?: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString('vi-VN');
}

function formatDateTime(value?: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleString('vi-VN');
}

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
 * NCL-12-CN-004 — Quản lý sản phẩm bàn giao và phiên bản (Quản lý dự án, VT-02).
 *
 * PM chọn dự án mình phụ trách → khai báo sản phẩm bàn giao cho từng hạng mục, mỗi lần giao cho khách hàng
 * thì "Bàn giao phiên bản" để lưu phiên bản mới (ngày, người nhận, tệp) mà không đụng tới phiên bản cũ (TC-01);
 * trùng số phiên bản bị báo và yêu cầu đặt số khác (TC-02). Lịch sử phiên bản ghi người thực hiện + thời điểm
 * (TC-04). Người không phải QLDA bị từ chối và lần từ chối được backend ghi nhật ký (TC-03). Phiên bản mới nhất
 * của từng sản phẩm là nội dung được đưa vào phiếu nghiệm thu (NCL-12-CN-001).
 */
export default function DeliverablePage({
  currentUserRoles = [],
  currentUserName = 'Người dùng',
  currentUserId,
  projects,
  selectedProjectId,
  onSelectProject,
}: Props) {
  const isAllowed = currentUserRoles.includes('VT-02');

  useEffect(() => {
    if (isAllowed) return;
    checkDeliverableAccess().catch(() => undefined);
  }, [isAllowed]);

  const managedProjects = useMemo(
    () => projects.filter((p) => currentUserId == null || p.projectManagerId === currentUserId),
    [projects, currentUserId]
  );
  const project = managedProjects.find((p) => p.id === selectedProjectId) ?? null;
  const projectClosed = project?.status === 'CLOSED';
  const projectLabel = project ? `${project.projectCode} — ${project.name}` : '';

  const [tree, setTree] = useState<WorkBreakdownRes[]>([]);
  const [deliverables, setDeliverables] = useState<DeliverableRes[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [wpFilter, setWpFilter] = useState<number | ''>('');
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [highlightVersionId, setHighlightVersionId] = useState<number | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [versionTarget, setVersionTarget] = useState<DeliverableRes | null>(null);

  const load = useCallback(async (projectId: number) => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const [wbs, list] = await Promise.all([getWorkBreakdown(projectId), fetchDeliverables(projectId)]);
      setTree(wbs);
      setDeliverables(list);
    } catch (err) {
      setTree([]);
      setDeliverables([]);
      setLoadError(err instanceof Error && err.message ? err.message : 'Không tải được sản phẩm bàn giao của dự án.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    setNotice(null);
    setExpanded(new Set());
    setWpFilter('');
    if (!isAllowed || selectedProjectId == null || !project) {
      setTree([]);
      setDeliverables([]);
      return;
    }
    void load(selectedProjectId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAllowed, selectedProjectId, project?.id, load]);

  const workPackages = useMemo(() => flattenWorkPackages(tree), [tree]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return deliverables.filter(
      (d) =>
        (wpFilter === '' || d.workPackageId === wpFilter) &&
        (!q || d.name.toLowerCase().includes(q) || (d.latestVersion?.versionNo ?? '').toLowerCase().includes(q))
    );
  }, [deliverables, wpFilter, search]);

  const totalVersions = deliverables.reduce((sum, d) => sum + d.versionCount, 0);
  const notDelivered = deliverables.filter((d) => d.versionCount === 0).length;

  const toggle = (id: number) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const handleCreated = (d: DeliverableRes) => {
    setCreateOpen(false);
    setDeliverables((prev) => [d, ...prev]);
    setNotice(`Đã khai báo sản phẩm "${d.name}" cho hạng mục ${d.workPackageName}. Bấm "Bàn giao phiên bản" khi giao cho khách hàng.`);
  };

  const handleVersionCreated = async (target: DeliverableRes, version: DeliverableVersionRes) => {
    setVersionTarget(null);
    setHighlightVersionId(version.id);
    setExpanded((prev) => new Set(prev).add(target.id));
    const kept = target.versions.length;
    setNotice(
      `Đã lưu phiên bản ${version.versionNo} của "${target.name}"` +
        (kept > 0 ? ` — ${kept} phiên bản trước vẫn được giữ nguyên.` : '.') +
        (version.latest ? '' : ' Phiên bản này có ngày bàn giao cũ hơn nên không phải bản mới nhất.')
    );
    try {
      const fresh = await getDeliverable(target.id);
      setDeliverables((prev) => prev.map((d) => (d.id === fresh.id ? fresh : d)));
    } catch {
      if (selectedProjectId != null) void load(selectedProjectId);
    }
  };

  if (!isAllowed) {
    return (
      <div className="access-denied-container" data-testid="deliverable-access-denied">
        <div className="access-denied-card">
          <div className="access-denied-icon">{ICONS.shieldOff}</div>
          <h2>Bạn không có thẩm quyền quản lý sản phẩm bàn giao</h2>
          <p>
            Theo quy tắc phân quyền, chức năng quản lý sản phẩm bàn giao và phiên bản chỉ dành cho{' '}
            <strong>Quản lý dự án</strong> (VT-02) phụ trách dự án. Hệ thống đã ghi lại lần từ chối truy cập này vào
            nhật ký hệ thống.
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

  return (
    <div className="user-management-page">
      {notice && (
        <div className="alert-box alert-box--success" role="status" data-testid="deliverable-notice">
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
            <span className="page-header__tag">{ICONS.document} BÀN GIAO</span>
            <span className="page-header__dot" />
            <span className="page-header__meta">{project ? project.projectCode : 'CHƯA CHỌN DỰ ÁN'}</span>
          </div>
          <h1 className="page-title">Sản phẩm bàn giao và phiên bản</h1>
          <p className="page-subtitle">
            Khai báo sản phẩm bàn giao theo hạng mục và ghi nhận từng lần bàn giao để biết đã giao gì, cho ai, lúc nào.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => setCreateOpen(true)}
          disabled={!project || projectClosed || isLoading || !!loadError || workPackages.length === 0}
          data-testid="deliverable-open-create"
        >
          <span className="icon-xs">{ICONS.plus}</span> Khai báo sản phẩm
        </button>
      </div>

      <div className="user-table-card" style={{ padding: '16px 20px', marginBottom: '16px' }}>
        <div className="filter-group" style={{ flexWrap: 'wrap' }}>
          <label htmlFor="deliverable-project" className="filter-label">Dự án:</label>
          <select
            id="deliverable-project"
            className="filter-select"
            style={{ minWidth: '320px' }}
            value={project ? project.id : ''}
            onChange={(e) => onSelectProject(e.target.value ? Number(e.target.value) : null)}
            data-testid="deliverable-project-select"
          >
            <option value="">-- Chọn dự án bạn phụ trách --</option>
            {managedProjects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.projectCode} — {p.name}
                {p.status === 'CLOSED' ? ' (đã đóng)' : ''}
              </option>
            ))}
          </select>
          {project && (
            <button
              type="button"
              className="btn-icon-refresh"
              onClick={() => void load(project.id)}
              title="Tải lại"
              aria-label="Tải lại sản phẩm bàn giao"
            >
              {ICONS.refresh}
            </button>
          )}
        </div>
        {managedProjects.length === 0 && (
          <p className="field-hint" style={{ marginTop: '8px' }}>
            Bạn chưa phụ trách dự án nào — chỉ Quản lý dự án của dự án mới quản lý được sản phẩm bàn giao.
          </p>
        )}
        {projectClosed && (
          <div className="alert-box alert-box--warning" style={{ marginTop: '12px', marginBottom: 0 }}>
            <span className="alert-box__icon">{ICONS.lock}</span>
            <div className="alert-box__content">
              Dự án đã đóng — chỉ tra cứu được lịch sử bàn giao, không thêm sản phẩm/phiên bản mới.
            </div>
          </div>
        )}
      </div>

      {!project ? (
        <div className="user-table-card">
          <div className="table-empty-state" data-testid="deliverable-no-project">
            <div className="table-empty-state__icon">{ICONS.folder}</div>
            <h3>Chưa chọn dự án</h3>
            <p>Chọn một dự án bạn phụ trách để quản lý sản phẩm bàn giao.</p>
          </div>
        </div>
      ) : isLoading ? (
        <div className="user-table-card">
          <div className="table-loading-state">
            <div className="spinner-lg" />
            <p>Đang tải sản phẩm bàn giao...</p>
          </div>
        </div>
      ) : loadError ? (
        <div className="user-table-card">
          <div className="table-error-state" role="alert">
            <div className="table-error-state__icon">{ICONS.alertTriangle}</div>
            <div className="table-error-state__body">
              <h3>Không tải được sản phẩm bàn giao</h3>
              <p>{loadError}</p>
            </div>
            <button type="button" className="btn btn-secondary" onClick={() => void load(project.id)}>
              Thử lại
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-card__icon stat-card__icon--purple">{ICONS.document}</div>
              <div>
                <span className="stat-card__label">Sản phẩm bàn giao</span>
                <div className="stat-card__value">{deliverables.length}</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-card__icon stat-card__icon--blue">{ICONS.history}</div>
              <div>
                <span className="stat-card__label">Phiên bản đã bàn giao</span>
                <div className="stat-card__value" data-testid="deliverable-total-versions">{totalVersions}</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-card__icon stat-card__icon--amber">{ICONS.clock}</div>
              <div>
                <span className="stat-card__label">Chưa bàn giao lần nào</span>
                <div className="stat-card__value">{notDelivered}</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-card__icon stat-card__icon--green">{ICONS.tree}</div>
              <div>
                <span className="stat-card__label">Hạng mục</span>
                <div className="stat-card__value">{workPackages.length}</div>
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
                  placeholder="Tìm theo tên sản phẩm hoặc số phiên bản..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  aria-label="Tìm sản phẩm bàn giao"
                />
              </div>
              <div className="toolbar-filters">
                <div className="filter-group">
                  <label htmlFor="deliverable-wp-filter" className="filter-label">Hạng mục:</label>
                  <select
                    id="deliverable-wp-filter"
                    className="filter-select"
                    value={wpFilter}
                    onChange={(e) => setWpFilter(e.target.value ? Number(e.target.value) : '')}
                  >
                    <option value="">Tất cả hạng mục</option>
                    {workPackages.map((wp) => (
                      <option key={wp.id} value={wp.id}>
                        {`${'  '.repeat(wp.depth)}${wp.name}`}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {workPackages.length === 0 ? (
              <div className="table-empty-state">
                <div className="table-empty-state__icon">{ICONS.tree}</div>
                <h3>Dự án chưa có hạng mục</h3>
                <p>Sản phẩm bàn giao gắn với hạng mục — tạo hạng mục ở cây công việc (WBS) của dự án trước.</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="table-empty-state" data-testid="deliverable-empty">
                <div className="table-empty-state__icon">{ICONS.document}</div>
                <h3>{deliverables.length === 0 ? 'Chưa có sản phẩm bàn giao nào' : 'Không có sản phẩm khớp bộ lọc'}</h3>
                <p>
                  {deliverables.length === 0
                    ? 'Bấm "Khai báo sản phẩm" để thêm sản phẩm bàn giao cho một hạng mục.'
                    : 'Thử đổi từ khóa tìm kiếm hoặc hạng mục.'}
                </p>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="user-data-table" data-testid="deliverable-table">
                  <thead>
                    <tr>
                      <th style={headStyle}>Sản phẩm</th>
                      <th style={headStyle}>Hạng mục</th>
                      <th style={headStyle}>Phiên bản mới nhất</th>
                      <th style={{ ...headStyle, textAlign: 'right' }}>Số phiên bản</th>
                      <th style={headStyle}>Khai báo</th>
                      <th style={{ ...headStyle, textAlign: 'right' }}>Hành động</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((d) => {
                      const isOpen = expanded.has(d.id);
                      return (
                        <Fragment key={d.id}>
                          <tr data-testid={`deliverable-row-${d.id}`}>
                            <td>
                              <div style={{ fontWeight: 600 }}>{d.name}</div>
                              <div className="cell-muted" style={{ fontSize: '12.5px' }}>
                                {DELIVERABLE_TYPE_LABEL[d.deliverableType] ?? d.deliverableType}
                                {d.description ? ` · ${d.description}` : ''}
                              </div>
                            </td>
                            <td>{d.workPackageName}</td>
                            <td>
                              {d.latestVersion ? (
                                <>
                                  <span className="badge badge--blue">{d.latestVersion.versionNo}</span>
                                  <div className="cell-muted" style={{ fontSize: '12.5px' }}>
                                    {formatDate(d.latestVersion.deliveredDate)} · {d.latestVersion.receiverName}
                                  </div>
                                </>
                              ) : (
                                <span className="badge badge--gray">Chưa bàn giao</span>
                              )}
                            </td>
                            <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono, monospace)' }}>{d.versionCount}</td>
                            <td className="cell-muted" style={{ fontSize: '12.5px', whiteSpace: 'nowrap' }}>
                              {d.createdBy || '—'}
                              <div>{formatDateTime(d.createdAt)}</div>
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <div style={{ display: 'inline-flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                                <button
                                  type="button"
                                  className="btn btn-secondary"
                                  onClick={() => toggle(d.id)}
                                  aria-expanded={isOpen}
                                  data-testid={`deliverable-toggle-${d.id}`}
                                >
                                  <span className="icon-xs">{ICONS.history}</span> {isOpen ? 'Ẩn lịch sử' : 'Lịch sử phiên bản'}
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-primary"
                                  onClick={() => setVersionTarget(d)}
                                  disabled={projectClosed}
                                  data-testid={`deliverable-new-version-${d.id}`}
                                >
                                  <span className="icon-xs">{ICONS.upload}</span> Bàn giao phiên bản
                                </button>
                              </div>
                            </td>
                          </tr>
                          {isOpen && (
                            <tr className="deliverable-history-row" data-testid={`deliverable-history-${d.id}`}>
                              <td colSpan={6}>
                                <DeliverableVersionList versions={d.versions} highlightId={highlightVersionId} />
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {project && (
        <DeliverableFormModal
          isOpen={createOpen}
          projectId={project.id}
          projectLabel={projectLabel}
          workPackages={workPackages}
          existing={deliverables}
          initialWorkPackageId={wpFilter === '' ? null : wpFilter}
          onClose={() => setCreateOpen(false)}
          onCreated={handleCreated}
        />
      )}
      {versionTarget && (
        <DeliverableVersionModal
          isOpen
          deliverable={versionTarget}
          onClose={() => setVersionTarget(null)}
          onCreated={(v) => void handleVersionCreated(versionTarget, v)}
        />
      )}
    </div>
  );
}
