import { ICONS } from '../../../components/common/icons';
import { PORTAL_PROJECT_STATUS_LABEL, type PortalProjectRes, type PortalProjectStatus } from '../types/portalTypes';
import PortalProgressBar, { formatPortalDate } from './PortalProgressBar';

interface Props {
  project: PortalProjectRes;
  onOpen: (projectId: number) => void;
}

/** Thẻ tổng quan một dự án trên cổng: tiến độ công việc, mốc, mốc kế tiếp (NCL-13-CN-002-TC-01). */
export default function PortalProjectCard({ project, onOpen }: Props) {
  const closed = project.status === 'CLOSED';
  return (
    <article className={`portal-project-card${closed ? ' portal-project-card--closed' : ''}`} data-testid={`portal-project-card-${project.id}`}>
      <div className="portal-project-card__head">
        <span className="portal-project-card__code">{project.projectCode}</span>
        <span className={`badge ${closed ? 'badge--gray' : 'badge--green'}`}>
          {PORTAL_PROJECT_STATUS_LABEL[project.status as PortalProjectStatus] ?? project.status}
        </span>
      </div>
      <h3 className="portal-project-card__name">{project.name}</h3>
      <p className="portal-project-card__meta">
        {project.projectManagerName ? `Quản lý dự án: ${project.projectManagerName}` : 'Chưa có quản lý dự án'}
        {project.contractCode ? ` · Hợp đồng ${project.contractCode}` : ''}
      </p>

      <div className="portal-project-card__progress">
        <div className="portal-project-card__progress-head">
          <span>Hoàn thành công việc</span>
          <strong>{project.progressPercent}%</strong>
        </div>
        <PortalProgressBar percent={project.progressPercent} label={`Tiến độ dự án ${project.projectCode}`} />
        <span className="portal-project-card__sub">
          {project.totalTasks === 0 ? 'Chưa có công việc nào' : `${project.doneTasks}/${project.totalTasks} công việc đã xong`}
        </span>
      </div>

      <dl className="portal-project-card__facts">
        <div>
          <dt>Thời gian</dt>
          <dd>
            {formatPortalDate(project.startDate)} – {formatPortalDate(project.expectedEndDate)}
          </dd>
        </div>
        <div>
          <dt>Mốc tiến độ</dt>
          <dd>
            {project.doneMilestones}/{project.totalMilestones} đã xong
            {project.lateMilestones > 0 && (
              <span className="badge badge--red" style={{ marginLeft: '6px' }} data-testid={`portal-project-late-${project.id}`}>
                {project.lateMilestones} mốc trễ
              </span>
            )}
          </dd>
        </div>
        <div className="portal-project-card__facts-full">
          <dt>Mốc kế tiếp</dt>
          <dd>
            {project.nextMilestoneName
              ? `${project.nextMilestoneName} · ${formatPortalDate(project.nextMilestoneDate)}`
              : closed || project.totalMilestones > 0
                ? 'Đã hoàn thành tất cả các mốc'
                : 'Chưa lập mốc tiến độ'}
          </dd>
        </div>
      </dl>

      <button
        type="button"
        className="btn btn-primary portal-project-card__action"
        onClick={() => onOpen(project.id)}
        data-testid={`portal-project-open-${project.id}`}
      >
        Xem tiến độ chi tiết <span className="icon-xs">{ICONS.arrowRight}</span>
      </button>
    </article>
  );
}
