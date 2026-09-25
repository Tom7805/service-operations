import { useCallback, useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { ICONS } from '../../../components/common/icons';
import { fetchPortalProjectProgress, PortalApiError } from '../api/portalApi';
import PortalProgressBar, { formatPortalDate } from '../components/PortalProgressBar';
import {
  PORTAL_ACCEPTANCE_STATUS_LABEL,
  PORTAL_DELIVERABLE_TYPE_LABEL,
  PORTAL_MILESTONE_STATUS_LABEL,
  PORTAL_PROJECT_STATUS_LABEL,
  type PortalAcceptanceStatus,
  type PortalDeliverableType,
  type PortalMilestoneStatus,
  type PortalProjectProgressRes,
  type PortalProjectStatus,
  type PortalWorkPackageProgress,
} from '../types/portalTypes';

interface Props {
  /** Mã dự án lấy từ đường dẫn — có thể là dự án của khách hàng khác nếu khách hàng tự nhập (TC-02). */
  projectId: number;
  onBack: () => void;
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

const MILESTONE_TONE: Record<PortalMilestoneStatus, string> = {
  DONE: 'badge--green',
  ON_TRACK: 'badge--blue',
  LATE: 'badge--red',
};

const ACCEPTANCE_TONE: Record<PortalAcceptanceStatus, string> = {
  PENDING_CONFIRMATION: 'badge--orange',
  ACCEPTED: 'badge--green',
  NEEDS_REVISION: 'badge--purple',
};

/** Sắp hạng mục theo cây (cha trước, con ngay sau, thụt lề theo cấp), giữ thứ tự backend trả về trong mỗi cấp. */
export function orderWorkPackages(items: PortalWorkPackageProgress[]): Array<PortalWorkPackageProgress & { depth: number }> {
  const ids = new Set(items.map((w) => w.id));
  const children = new Map<number | null, PortalWorkPackageProgress[]>();
  items.forEach((w) => {
    const parent = w.parentId != null && ids.has(w.parentId) ? w.parentId : null;
    children.set(parent, [...(children.get(parent) ?? []), w]);
  });
  const result: Array<PortalWorkPackageProgress & { depth: number }> = [];
  const visit = (parent: number | null, depth: number) => {
    (children.get(parent) ?? []).forEach((w) => {
      result.push({ ...w, depth });
      if (depth < 20) visit(w.id, depth + 1);
    });
  };
  visit(null, 0);
  return result;
}

/**
 * NCL-13-CN-002 — tiến độ chi tiết một dự án trên cổng: tỷ lệ hoàn thành từng hạng mục, mốc tiến độ (đã xong/đúng
 * hạn/trễ) và sản phẩm đã bàn giao. Chỉ hiển thị các trường dành cho khách hàng — không có ghi chú/mô tả nội bộ (TC-03).
 * Dự án của khách hàng khác hoặc mã không tồn tại → màn từ chối, backend ghi nhật ký lần từ chối (TC-02); mỗi lượt xem
 * thành công cũng được ghi nhật ký (TC-05).
 */
export default function PortalProjectDetailPage({ projectId, onBack }: Props) {
  const [data, setData] = useState<PortalProjectProgressRes | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<{ forbidden: boolean; message: string } | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      setData(await fetchPortalProjectProgress(projectId));
    } catch (err) {
      setData(null);
      const forbidden = err instanceof PortalApiError && err.statusCode === 403;
      setError({
        forbidden,
        message: err instanceof Error && err.message ? err.message : 'Không tải được tiến độ dự án.',
      });
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void load();
  }, [load]);

  const workPackages = useMemo(() => orderWorkPackages(data?.workPackages ?? []), [data]);

  const backButton = (
    <button type="button" className="btn btn-secondary" onClick={onBack} data-testid="portal-detail-back">
      <span className="icon-xs">{ICONS.arrowLeft}</span> Danh sách dự án
    </button>
  );

  if (isLoading) {
    return (
      <div className="portal-page">
        <div className="mb-4">{backButton}</div>
        <div className="user-table-card">
          <div className="table-loading-state">
            <div className="spinner-lg" />
            <p>Đang tải tiến độ dự án...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error?.forbidden) {
    return (
      <div className="access-denied-container" data-testid="portal-project-forbidden">
        <div className="access-denied-card">
          <div className="access-denied-icon">{ICONS.shieldOff}</div>
          <h2>Bạn không có quyền xem dự án này</h2>
          <p>
            Dự án bạn đang mở không thuộc danh sách dự án của công ty bạn hoặc không tồn tại. Tài khoản cổng chỉ xem được
            dữ liệu của chính khách hàng mình. Lần truy cập này đã được ghi vào nhật ký hệ thống.
          </p>
          <div className="security-log-badge">
            <span className="security-log-badge__item">
              {ICONS.shield} Thời điểm ghi nhận: {new Date().toLocaleString('vi-VN')}
            </span>
            <span className="security-log-badge__item">Mã dự án yêu cầu: {projectId}</span>
          </div>
          <div style={{ marginTop: '20px' }}>{backButton}</div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="portal-page">
        <div className="mb-4">{backButton}</div>
        <div className="user-table-card">
          <div className="table-error-state" role="alert">
            <div className="table-error-state__icon">{ICONS.alertTriangle}</div>
            <div className="table-error-state__body">
              <h3>Không tải được tiến độ dự án</h3>
              <p>{error?.message}</p>
            </div>
            <button type="button" className="btn btn-secondary" onClick={() => void load()}>
              Thử lại
            </button>
          </div>
        </div>
      </div>
    );
  }

  const { project, milestones, deliverables } = data;
  const closed = project.status === 'CLOSED';
  const lateCount = milestones.filter((m) => m.status === 'LATE').length;

  return (
    <div className="portal-page" data-testid="portal-project-detail">
      <div className="mb-4">{backButton}</div>

      <div className="page-header">
        <div>
          <div className="page-header__kicker">
            <span className="page-header__tag">{ICONS.folder} {project.projectCode}</span>
            <span className="page-header__dot" />
            <span className="page-header__meta">
              {PORTAL_PROJECT_STATUS_LABEL[project.status as PortalProjectStatus] ?? project.status}
            </span>
          </div>
          <h1 className="page-title">{project.name}</h1>
          <p className="page-subtitle">
            {project.projectManagerName ? `Quản lý dự án: ${project.projectManagerName}` : 'Chưa có quản lý dự án'}
            {project.contractCode ? ` · Hợp đồng ${project.contractCode}` : ''} · {formatPortalDate(project.startDate)} –{' '}
            {formatPortalDate(project.expectedEndDate)}
          </p>
        </div>
        <button type="button" className="btn btn-secondary" onClick={() => void load()}>
          <span className="icon-xs">{ICONS.refresh}</span> Làm mới
        </button>
      </div>

      <div className="user-table-card portal-overview">
        <div className="portal-overview__progress">
          <div className="portal-project-card__progress-head">
            <span>Tỷ lệ hoàn thành công việc</span>
            <strong data-testid="portal-detail-progress">{project.progressPercent}%</strong>
          </div>
          <PortalProgressBar percent={project.progressPercent} label="Tiến độ toàn dự án" />
          <span className="portal-project-card__sub">
            {project.totalTasks === 0 ? 'Chưa có công việc nào' : `${project.doneTasks}/${project.totalTasks} công việc đã xong`}
          </span>
        </div>
        <dl className="portal-overview__facts">
          <div>
            <dt>Mốc tiến độ</dt>
            <dd>
              {project.doneMilestones}/{project.totalMilestones} đã xong
            </dd>
          </div>
          <div>
            <dt>Mốc đang trễ</dt>
            <dd className={lateCount > 0 ? 'text-danger' : ''}>{lateCount}</dd>
          </div>
          <div>
            <dt>Mốc kế tiếp</dt>
            <dd>
              {project.nextMilestoneName
                ? `${project.nextMilestoneName} · ${formatPortalDate(project.nextMilestoneDate)}`
                : closed || project.totalMilestones > 0
                  ? 'Đã hoàn thành tất cả'
                  : '—'}
            </dd>
          </div>
          <div>
            <dt>Sản phẩm đã bàn giao</dt>
            <dd>{deliverables.length}</dd>
          </div>
        </dl>
      </div>

      {/* Mốc tiến độ */}
      <section className="user-table-card portal-section" data-testid="portal-detail-milestones">
        <div className="portal-section__head">
          <h2>
            <span className="icon-xs">{ICONS.calendar}</span> Mốc tiến độ
          </h2>
        </div>
        {milestones.length === 0 ? (
          <p className="field-hint portal-section__empty">Dự án chưa lập mốc tiến độ.</p>
        ) : (
          <ol className="portal-milestones">
            {milestones.map((m) => {
              const status = m.status as PortalMilestoneStatus;
              return (
                <li key={m.id} className={`portal-milestone portal-milestone--${String(m.status).toLowerCase()}`} data-testid={`portal-milestone-${m.id}`}>
                  <span className="portal-milestone__dot" aria-hidden="true">
                    {m.status === 'DONE' ? ICONS.check : m.status === 'LATE' ? ICONS.alertTriangle : ICONS.clock}
                  </span>
                  <div className="portal-milestone__body">
                    <div className="portal-milestone__title">
                      <strong>{m.name}</strong>
                      <span className={`badge ${MILESTONE_TONE[status] ?? 'badge--gray'}`}>
                        {PORTAL_MILESTONE_STATUS_LABEL[status] ?? m.status}
                        {m.status === 'LATE' && m.daysLate ? ` ${m.daysLate} ngày` : ''}
                      </span>
                    </div>
                    <span className="portal-milestone__dates">
                      Kế hoạch: {formatPortalDate(m.plannedDate)}
                      {m.actualDate ? ` · Hoàn thành: ${formatPortalDate(m.actualDate)}` : ''}
                    </span>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </section>

      {/* Hạng mục */}
      <section className="user-table-card portal-section" data-testid="portal-detail-work-packages">
        <div className="portal-section__head">
          <h2>
            <span className="icon-xs">{ICONS.tree}</span> Tỷ lệ hoàn thành theo hạng mục
          </h2>
        </div>
        {workPackages.length === 0 ? (
          <p className="field-hint portal-section__empty">Dự án chưa chia hạng mục.</p>
        ) : (
          <div className="table-responsive">
            <table className="user-data-table">
              <thead>
                <tr>
                  <th style={headStyle}>Hạng mục</th>
                  <th style={{ ...headStyle, minWidth: '200px' }}>Hoàn thành</th>
                  <th style={headStyle}>Nghiệm thu</th>
                </tr>
              </thead>
              <tbody>
                {workPackages.map((w) => (
                  <tr key={w.id} data-testid={`portal-wp-${w.id}`}>
                    <td>
                      <span style={{ paddingLeft: `${w.depth * 20}px`, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        {w.depth > 0 && <span className="cell-muted" aria-hidden="true">└</span>}
                        <span style={{ fontWeight: w.depth === 0 ? 600 : 400 }}>{w.name}</span>
                      </span>
                    </td>
                    <td>
                      <div className="portal-wp-progress">
                        <PortalProgressBar percent={w.progressPercent} label={`Tiến độ hạng mục ${w.name}`} size="sm" />
                        <span className="portal-wp-progress__value">{w.progressPercent}%</span>
                      </div>
                      <span className="portal-project-card__sub">
                        {w.totalTasks === 0 ? 'Chưa có công việc' : `${w.doneTasks}/${w.totalTasks} công việc`}
                      </span>
                    </td>
                    <td>
                      {w.acceptanceStatus ? (
                        <span className={`badge ${ACCEPTANCE_TONE[w.acceptanceStatus as PortalAcceptanceStatus] ?? 'badge--gray'}`}>
                          {PORTAL_ACCEPTANCE_STATUS_LABEL[w.acceptanceStatus as PortalAcceptanceStatus] ?? w.acceptanceStatus}
                        </span>
                      ) : (
                        <span className="cell-muted">Chưa nghiệm thu</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Sản phẩm đã bàn giao */}
      <section className="user-table-card portal-section" data-testid="portal-detail-deliverables">
        <div className="portal-section__head">
          <h2>
            <span className="icon-xs">{ICONS.document}</span> Sản phẩm đã bàn giao
          </h2>
        </div>
        {deliverables.length === 0 ? (
          <p className="field-hint portal-section__empty">Chưa có sản phẩm nào được bàn giao.</p>
        ) : (
          <div className="table-responsive">
            <table className="user-data-table">
              <thead>
                <tr>
                  <th style={headStyle}>Sản phẩm</th>
                  <th style={headStyle}>Hạng mục</th>
                  <th style={headStyle}>Phiên bản mới nhất</th>
                  <th style={headStyle}>Ngày bàn giao</th>
                  <th style={{ ...headStyle, textAlign: 'right' }}>Số lần bàn giao</th>
                </tr>
              </thead>
              <tbody>
                {deliverables.map((d) => (
                  <tr key={d.deliverableId} data-testid={`portal-deliverable-${d.deliverableId}`}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{d.name}</div>
                      <div className="cell-muted" style={{ fontSize: '12.5px' }}>
                        {PORTAL_DELIVERABLE_TYPE_LABEL[d.deliverableType as PortalDeliverableType] ?? d.deliverableType ?? '—'}
                        {d.latestFileUrl ? ` · ${d.latestFileUrl.split('/').pop()}` : ''}
                      </div>
                    </td>
                    <td>{d.workPackageName ?? '—'}</td>
                    <td>{d.latestVersionNo ? <span className="badge badge--blue">{d.latestVersionNo}</span> : '—'}</td>
                    <td>{formatPortalDate(d.latestDeliveredDate)}</td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono, monospace)' }}>{d.versionCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <p className="field-hint portal-footnote">
        {ICONS.info} Số liệu cập nhật theo thời gian thực từ hệ thống quản lý dự án. Lượt xem của bạn được ghi nhận trong
        nhật ký cổng khách hàng.
      </p>
    </div>
  );
}
