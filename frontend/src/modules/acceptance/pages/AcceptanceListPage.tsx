import { useCallback, useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { ICONS } from '../../../components/common/icons';
import { roleLabels } from '../../../utils/roleLabel';
import { getWorkBreakdown } from '../../projects/api/projectsApi';
import type { ProjectRes } from '../../projects/types/projectTypes';
import type { WorkBreakdownRes } from '../../projects/types/taskTypes';
import { checkAcceptanceAccess, fetchProjectAcceptances } from '../api/acceptanceApi';
import AcceptanceFormModal from '../components/AcceptanceFormModal';
import {
  ACCEPTANCE_STATUS_META,
  type AcceptanceCertificateRes,
  type AcceptanceDetailRes,
} from '../types/acceptanceTypes';
import {
  acceptanceStateOf,
  flattenWorkPackages,
  type WorkPackageAcceptanceState,
} from '../utils/workPackageTree';

interface Props {
  currentUserRoles?: string[];
  currentUserName?: string;
  currentUserId?: number;
  projects: ProjectRes[];
  selectedProjectId: number | null;
  onSelectProject: (projectId: number | null) => void;
  onOpenCertificate: (certificateId: number) => void;
}

const WP_STATE_META: Record<WorkPackageAcceptanceState, { label: string; badge: string }> = {
  READY: { label: 'Đủ điều kiện nghiệm thu', badge: 'badge--green' },
  UNFINISHED: { label: 'Còn công việc dang dở', badge: 'badge--gold' },
  EMPTY: { label: 'Chưa có công việc', badge: 'badge--gray' },
  HAS_CERTIFICATE: { label: 'Đã có phiếu', badge: 'badge--blue' },
  BRANCH_CERTIFICATE: { label: 'Nhánh đã có phiếu', badge: 'badge--gray' },
};

function formatAmount(value: number | null | undefined): string {
  if (value == null) return '—';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value);
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
 * NCL-12-CN-001 — Màn hình "Nghiệm thu hạng mục" của Quản lý dự án (VT-02).
 *
 * PM chọn một dự án mình phụ trách → thấy mọi hạng mục (cây WBS trải phẳng) kèm tình trạng nghiệm
 * thu tính sẵn, lập phiếu cho hạng mục đã xong (AcceptanceFormModal) và xem các phiếu đã lập của dự
 * án. Người không phải Quản lý dự án bị từ chối và lần từ chối được backend ghi nhật ký (TC-03).
 */
export default function AcceptanceListPage({
  currentUserRoles = [],
  currentUserName = 'Người dùng',
  currentUserId,
  projects,
  selectedProjectId,
  onSelectProject,
  onOpenCertificate,
}: Props) {
  const isAllowed = currentUserRoles.includes('VT-02');

  // TC-03: luôn có một request thật khi người không đủ vai trò mở chức năng, để backend ghi nhật ký.
  useEffect(() => {
    if (isAllowed) return;
    checkAcceptanceAccess().catch(() => {
      // Kết quả không quan trọng — màn hình từ chối đã hiển thị theo vai trò.
    });
  }, [isAllowed]);

  // QTN-01: PM chỉ thao tác trên dự án mình là người quản lý — không liệt kê dự án của người khác.
  const managedProjects = useMemo(
    () => projects.filter((p) => currentUserId == null || p.projectManagerId === currentUserId),
    [projects, currentUserId]
  );
  const project = managedProjects.find((p) => p.id === selectedProjectId) ?? null;
  const projectClosed = project?.status === 'CLOSED';
  const projectLabel = project ? `${project.projectCode} — ${project.name}` : '';

  const [tree, setTree] = useState<WorkBreakdownRes[]>([]);
  const [certificates, setCertificates] = useState<AcceptanceCertificateRes[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalWorkPackageId, setModalWorkPackageId] = useState<number | null>(null);
  const [created, setCreated] = useState<AcceptanceDetailRes | null>(null);

  const load = useCallback(async (projectId: number) => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const [wbs, certs] = await Promise.all([getWorkBreakdown(projectId), fetchProjectAcceptances(projectId)]);
      setTree(wbs);
      setCertificates(certs);
    } catch (err) {
      setTree([]);
      setCertificates([]);
      setLoadError(
        err instanceof Error && err.message ? err.message : 'Không tải được dữ liệu nghiệm thu của dự án.'
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    setCreated(null);
    if (!isAllowed || selectedProjectId == null || !project) {
      setTree([]);
      setCertificates([]);
      return;
    }
    void load(selectedProjectId);
    // `project` đổi tham chiếu mỗi lần App nạp lại danh sách dự án — chỉ cần nạp lại khi đổi dự án.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAllowed, selectedProjectId, project?.id, load]);

  const workPackages = useMemo(() => flattenWorkPackages(tree), [tree]);
  const rows = useMemo(
    () => workPackages.map((wp) => ({ wp, ...acceptanceStateOf(wp, certificates) })),
    [workPackages, certificates]
  );
  const readyCount = rows.filter((r) => r.state === 'READY').length;
  const unfinishedCount = rows.filter((r) => r.state === 'UNFINISHED').length;

  const openModal = (workPackageId: number | null) => {
    setModalWorkPackageId(workPackageId);
    setModalOpen(true);
  };

  const handleCreated = (certificate: AcceptanceDetailRes) => {
    setModalOpen(false);
    setCreated(certificate);
    if (selectedProjectId != null) void load(selectedProjectId);
  };

  if (!isAllowed) {
    return (
      <div className="access-denied-container" data-testid="acceptance-access-denied">
        <div className="access-denied-card">
          <div className="access-denied-icon">{ICONS.shieldOff}</div>
          <h2>Bạn không có thẩm quyền lập phiếu nghiệm thu</h2>
          <p>
            Theo quy tắc phân quyền, chức năng lập phiếu nghiệm thu hạng mục chỉ dành cho{' '}
            <strong>Quản lý dự án</strong> (VT-02) phụ trách dự án. Hệ thống đã ghi lại lần từ chối truy cập
            này vào nhật ký hệ thống.
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
      {created && (
        <div className="alert-box alert-box--success" role="status" data-testid="acceptance-created-banner">
          <span className="alert-box__icon">{ICONS.checkCircle}</span>
          <div className="alert-box__content">
            <strong>Đã lập phiếu nghiệm thu {created.certificateCode}</strong>
            Phiếu gồm {created.tasks.length} công việc, {created.deliverables.length} sản phẩm bàn giao, giá trị{' '}
            {formatAmount(created.acceptedValue)} — đang ở trạng thái{' '}
            {ACCEPTANCE_STATUS_META[created.status]?.label ?? created.status}.{' '}
            <button type="button" className="btn-link" onClick={() => onOpenCertificate(created.id)}>
              Xem phiếu
            </button>
          </div>
          <button type="button" className="modal-close" onClick={() => setCreated(null)} aria-label="Ẩn thông báo">
            {ICONS.close}
          </button>
        </div>
      )}

      <div className="page-header">
        <div>
          <div className="page-header__kicker">
            <span className="page-header__tag">{ICONS.clipboardList} NGHIỆM THU</span>
            <span className="page-header__dot" />
            <span className="page-header__meta">{project ? project.projectCode : 'CHƯA CHỌN DỰ ÁN'}</span>
          </div>
          <h1 className="page-title">Lập phiếu nghiệm thu hạng mục</h1>
          <p className="page-subtitle">
            Chọn hạng mục đã hoàn thành toàn bộ công việc để lập phiếu, làm căn cứ đề nghị khách hàng xác nhận.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => openModal(null)}
          disabled={!project || projectClosed || isLoading || !!loadError}
          data-testid="acceptance-open-create"
        >
          <span className="icon-xs">{ICONS.plus}</span> Lập phiếu nghiệm thu
        </button>
      </div>

      <div className="user-table-card" style={{ padding: '16px 20px', marginBottom: '16px' }}>
        <div className="filter-group" style={{ flexWrap: 'wrap' }}>
          <label htmlFor="acceptance-project" className="filter-label">Dự án:</label>
          <select
            id="acceptance-project"
            className="filter-select"
            style={{ minWidth: '320px' }}
            value={project ? project.id : ''}
            onChange={(e) => onSelectProject(e.target.value ? Number(e.target.value) : null)}
            data-testid="acceptance-project-select"
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
              aria-label="Tải lại dữ liệu nghiệm thu"
            >
              {ICONS.refresh}
            </button>
          )}
        </div>
        {managedProjects.length === 0 && (
          <p className="field-hint" style={{ marginTop: '8px' }}>
            Bạn chưa phụ trách dự án nào — chỉ Quản lý dự án của dự án mới lập được phiếu nghiệm thu.
          </p>
        )}
        {projectClosed && (
          <div className="alert-box alert-box--warning" style={{ marginTop: '12px', marginBottom: 0 }}>
            <span className="alert-box__icon">{ICONS.lock}</span>
            <div className="alert-box__content">Dự án đã đóng — chỉ xem được phiếu đã lập, không lập phiếu mới.</div>
          </div>
        )}
      </div>

      {!project ? (
        <div className="user-table-card">
          <div className="table-empty-state" data-testid="acceptance-no-project">
            <div className="table-empty-state__icon">{ICONS.folder}</div>
            <h3>Chưa chọn dự án</h3>
            <p>Chọn một dự án bạn phụ trách để xem các hạng mục và lập phiếu nghiệm thu.</p>
          </div>
        </div>
      ) : isLoading ? (
        <div className="user-table-card">
          <div className="table-loading-state">
            <div className="spinner-lg" />
            <p>Đang tải hạng mục và phiếu nghiệm thu...</p>
          </div>
        </div>
      ) : loadError ? (
        <div className="user-table-card">
          <div className="table-error-state" role="alert">
            <div className="table-error-state__icon">{ICONS.alertTriangle}</div>
            <div className="table-error-state__body">
              <h3>Không tải được dữ liệu nghiệm thu</h3>
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
              <div className="stat-card__icon stat-card__icon--purple">{ICONS.tree}</div>
              <div>
                <span className="stat-card__label">Hạng mục</span>
                <div className="stat-card__value">{workPackages.length}</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-card__icon stat-card__icon--green">{ICONS.checkCircle}</div>
              <div>
                <span className="stat-card__label">Đủ điều kiện nghiệm thu</span>
                <div className="stat-card__value" data-testid="acceptance-ready-count">{readyCount}</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-card__icon stat-card__icon--amber">{ICONS.clock}</div>
              <div>
                <span className="stat-card__label">Còn công việc dang dở</span>
                <div className="stat-card__value">{unfinishedCount}</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-card__icon stat-card__icon--blue">{ICONS.clipboardList}</div>
              <div>
                <span className="stat-card__label">Phiếu đã lập</span>
                <div className="stat-card__value">{certificates.length}</div>
              </div>
            </div>
          </div>

          <div className="user-table-card" style={{ marginBottom: '16px' }}>
            <div className="page-header" style={{ padding: '16px 16px 0' }}>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600 }}>Hạng mục của dự án</h3>
            </div>
            {rows.length === 0 ? (
              <div className="table-empty-state" data-testid="acceptance-wp-empty">
                <div className="table-empty-state__icon">{ICONS.tree}</div>
                <h3>Dự án chưa có hạng mục nào</h3>
                <p>Tạo hạng mục và công việc ở cây công việc (WBS) của dự án trước khi nghiệm thu.</p>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="user-data-table" data-testid="acceptance-wp-table">
                  <thead>
                    <tr>
                      <th style={headStyle}>Hạng mục</th>
                      <th style={headStyle}>Công việc hoàn thành</th>
                      <th style={headStyle}>Tình trạng nghiệm thu</th>
                      <th style={{ ...headStyle, textAlign: 'right' }}>Hành động</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(({ wp, state, certificate }) => {
                      const meta = WP_STATE_META[state];
                      const pct = wp.totalTasks > 0 ? Math.round((wp.doneTasks / wp.totalTasks) * 100) : 0;
                      return (
                        <tr key={wp.id} data-testid={`acceptance-wp-row-${wp.id}`}>
                          <td style={{ paddingLeft: `${16 + wp.depth * 20}px` }}>
                            {wp.depth > 0 && <span className="cell-muted">└ </span>}
                            <span style={{ fontWeight: wp.depth === 0 ? 600 : 500 }}>{wp.name}</span>
                          </td>
                          <td style={{ minWidth: '180px' }}>
                            <div className="acceptance-progress acceptance-progress--inline">
                              <div className="acceptance-progress__track">
                                <div
                                  className={`acceptance-progress__bar ${pct === 100 ? 'acceptance-progress__bar--done' : ''}`}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <span className="cell-muted">
                                {wp.doneTasks}/{wp.totalTasks}
                              </span>
                            </div>
                          </td>
                          <td>
                            <span className={`badge ${meta.badge}`}>{meta.label}</span>
                            {certificate && (
                              <span className="cell-muted" style={{ marginLeft: '8px', fontFamily: 'var(--font-mono, monospace)' }}>
                                {certificate.certificateCode}
                              </span>
                            )}
                          </td>
                          <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                            {certificate ? (
                              <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={() => onOpenCertificate(certificate.id)}
                              >
                                Xem phiếu
                              </button>
                            ) : (
                              <button
                                type="button"
                                className={state === 'READY' ? 'btn btn-primary' : 'btn btn-secondary'}
                                onClick={() => openModal(wp.id)}
                                disabled={projectClosed}
                                data-testid={`acceptance-wp-create-${wp.id}`}
                              >
                                {state === 'READY' ? 'Lập phiếu' : 'Kiểm tra điều kiện'}
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="user-table-card">
            <div className="page-header" style={{ padding: '16px 16px 0' }}>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600 }}>Phiếu nghiệm thu đã lập</h3>
            </div>
            {certificates.length === 0 ? (
              <div className="table-empty-state" data-testid="acceptance-cert-empty">
                <div className="table-empty-state__icon">{ICONS.clipboardList}</div>
                <h3>Chưa có phiếu nghiệm thu nào</h3>
                <p>Lập phiếu cho hạng mục đã hoàn thành toàn bộ công việc để bắt đầu.</p>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="user-data-table" data-testid="acceptance-cert-table">
                  <thead>
                    <tr>
                      <th style={headStyle}>Mã phiếu</th>
                      <th style={headStyle}>Hạng mục</th>
                      <th style={headStyle}>Tiêu đề</th>
                      <th style={{ ...headStyle, textAlign: 'right' }}>Giá trị</th>
                      <th style={headStyle}>Trạng thái</th>
                      <th style={headStyle}>Người lập</th>
                      <th style={headStyle}>Thời điểm lập</th>
                    </tr>
                  </thead>
                  <tbody>
                    {certificates.map((c) => {
                      const status = ACCEPTANCE_STATUS_META[c.status] ?? { label: c.status, badge: 'badge--gray' };
                      return (
                        <tr
                          key={c.id}
                          onClick={() => onOpenCertificate(c.id)}
                          style={{ cursor: 'pointer' }}
                          data-testid={`acceptance-cert-row-${c.id}`}
                        >
                          <td style={{ fontFamily: 'var(--font-mono, monospace)', fontWeight: 600 }}>{c.certificateCode}</td>
                          <td>{c.workPackageName}</td>
                          <td>{c.title}</td>
                          <td style={{ textAlign: 'right' }}>{formatAmount(c.acceptedValue)}</td>
                          <td>
                            <span className={`badge ${status.badge}`}>{status.label}</span>
                            {c.revisionNo > 1 && <span className="cell-muted"> · lần {c.revisionNo}</span>}
                          </td>
                          <td className="cell-muted">{c.createdBy || '—'}</td>
                          <td className="cell-muted">{formatDateTime(c.createdAt)}</td>
                        </tr>
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
        <AcceptanceFormModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          onCreated={handleCreated}
          projectId={project.id}
          projectLabel={projectLabel}
          projectClosed={projectClosed}
          workPackages={workPackages}
          initialWorkPackageId={modalWorkPackageId}
          currentUserRoles={currentUserRoles}
        />
      )}
    </div>
  );
}
