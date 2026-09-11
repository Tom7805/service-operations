import { useCallback, useEffect, useState } from 'react';
import { ICONS } from '../../../components/common/icons';
import type { ProjectMilestoneRes, WorkBreakdownRes } from '../types/projectTypes';
import { deleteMilestone, getMilestones, ProjectsApiError } from '../api/projectsApi';
import MilestoneFormModal from './MilestoneFormModal';
import MilestoneCompleteModal from './MilestoneCompleteModal';

export interface ProjectMilestoneTimelineProps {
  projectId: number;
  /** Cây công việc của dự án — dùng làm nguồn chọn "hạng mục phải hoàn thành". */
  wbs: WorkBreakdownRes[];
  /** Chỉ Quản lý dự án (VT-02) mới được thao tác (TC-03). */
  canEdit?: boolean;
  isProjectOpen?: boolean;
  onNotify?: (message: string, type?: 'success' | 'error') => void;
}

/** TC-02: nhãn hiển thị cho trạng thái tiến độ tính động từ backend. */
const STATUS_CONFIG: Record<ProjectMilestoneRes['status'], { label: string; className: string }> = {
  DONE: { label: 'Đã hoàn thành', className: 'status-pill--active' },
  ON_TRACK: { label: 'Đúng tiến độ', className: 'status-pill--inactive' },
  LATE: { label: 'Trễ tiến độ', className: 'status-pill--locked' },
};

function formatDate(value: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('vi-VN');
}

function hasAnyTask(items: WorkBreakdownRes[]): boolean {
  return items.some(
    (wp) => (wp.tasks && wp.tasks.length > 0) || (wp.children && hasAnyTask(wp.children))
  );
}

export default function ProjectMilestoneTimeline({
  projectId,
  wbs,
  canEdit = false,
  isProjectOpen = true,
  onNotify,
}: ProjectMilestoneTimelineProps) {
  const [milestones, setMilestones] = useState<ProjectMilestoneRes[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState<ProjectMilestoneRes | null>(null);
  const [completingMilestone, setCompletingMilestone] = useState<ProjectMilestoneRes | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const loadMilestones = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getMilestones(projectId);
      setMilestones(data);
    } catch (err: unknown) {
      const msg =
        err instanceof ProjectsApiError || err instanceof Error
          ? err.message
          : 'Không thể tải danh sách mốc tiến độ.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void loadMilestones();
  }, [loadMilestones]);

  const hasWorkBreakdown = hasAnyTask(wbs);
  const canCreate = canEdit && isProjectOpen;

  const openCreateForm = () => {
    setEditingMilestone(null);
    setIsFormOpen(true);
  };

  const openEditForm = (milestone: ProjectMilestoneRes) => {
    setEditingMilestone(milestone);
    setIsFormOpen(true);
  };

  const handleDelete = async (milestone: ProjectMilestoneRes) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa mốc tiến độ "${milestone.name}" không?`)) {
      return;
    }
    setDeletingId(milestone.id);
    try {
      await deleteMilestone(projectId, milestone.id);
      onNotify?.(`Đã xóa mốc tiến độ "${milestone.name}" thành công`, 'success');
      void loadMilestones();
    } catch (err: unknown) {
      const msg =
        err instanceof ProjectsApiError || err instanceof Error
          ? err.message
          : 'Không thể xóa mốc tiến độ.';
      onNotify?.(msg, 'error');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="user-table-card" style={{ padding: '20px', marginTop: '20px' }} data-testid="milestone-timeline">
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px',
          flexWrap: 'wrap',
          gap: '8px',
        }}
      >
        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#1E293B' }}>
          Mốc tiến độ dự án
        </h3>
        {canCreate && (
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={openCreateForm}
            disabled={!hasWorkBreakdown}
            title={
              !hasWorkBreakdown
                ? 'Dự án chưa có công việc nào trong cây công việc, không thể khai báo mốc tiến độ'
                : undefined
            }
            data-testid="btn-add-milestone"
          >
            + Thêm mốc tiến độ
          </button>
        )}
      </div>

      {!isProjectOpen && (
        <div className="alert-box alert-box--warning" role="alert" style={{ marginBottom: '16px' }}>
          Dự án đã đóng — không thể thêm, sửa hoặc xóa mốc tiến độ.
        </div>
      )}

      {canCreate && !hasWorkBreakdown && (
        <div className="alert-box" role="status" style={{ marginBottom: '16px' }} data-testid="milestone-no-wbs-hint">
          Dự án chưa có công việc nào trong cây công việc — hãy thêm công việc trước khi khai báo mốc
          tiến độ.
        </div>
      )}

      {error && (
        <div
          className="alert-box alert-box--danger"
          role="alert"
          data-testid="milestone-load-error"
          style={{ marginBottom: '16px' }}
        >
          {error}
        </div>
      )}

      {loading ? (
        <div className="table-loading-state" data-testid="milestone-loading">
          <span className="spinner-lg" />
          <p style={{ marginTop: '10px' }}>Đang nạp danh sách mốc tiến độ...</p>
        </div>
      ) : milestones.length === 0 ? (
        <div className="table-empty-state" data-testid="milestone-empty">
          <div className="table-empty-state__icon">{ICONS.calendar}</div>
          <h4 style={{ margin: '0 0 6px', fontSize: '15px', color: '#1E293B' }}>
            Chưa có mốc tiến độ nào
          </h4>
          <p style={{ margin: 0, color: '#64748B', fontSize: '13.5px' }}>
            {canCreate
              ? 'Hãy bấm nút "+ Thêm mốc tiến độ" ở trên để bắt đầu theo dõi tiến độ dự án.'
              : 'Dự án này chưa khai báo mốc tiến độ nào.'}
          </p>
        </div>
      ) : (
        <div className="table-responsive">
          <table className="user-data-table">
            <thead>
              <tr>
                <th>Tên mốc</th>
                <th>Hạng mục phải hoàn thành</th>
                <th style={{ width: '130px' }}>Ngày kế hoạch</th>
                <th style={{ width: '130px' }}>Ngày thực tế</th>
                <th style={{ width: '170px' }}>Trạng thái</th>
                {canEdit && <th style={{ width: '190px' }}></th>}
              </tr>
            </thead>
            <tbody>
              {milestones.map((m) => {
                const status = STATUS_CONFIG[m.status];
                return (
                  <tr key={m.id} data-testid={`milestone-row-${m.id}`}>
                    <td>
                      <strong>{m.name}</strong>
                      {m.description && (
                        <div className="field-hint" style={{ marginTop: '2px' }}>
                          {m.description}
                        </div>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {m.items.map((item) => (
                          <span key={item.taskId} className="badge badge--blue">
                            {item.taskName ?? `#${item.taskId}`}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td>{formatDate(m.plannedDate)}</td>
                    <td>{formatDate(m.actualDate)}</td>
                    <td>
                      <span className={`status-pill ${status.className}`} data-testid={`milestone-status-${m.id}`}>
                        <i className="status-pill__dot" />
                        {status.label}
                        {m.status === 'LATE' && m.daysLate != null ? ` (${m.daysLate} ngày)` : ''}
                      </span>
                    </td>
                    {canEdit && (
                      <td>
                        {isProjectOpen && (
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                            <button
                              type="button"
                              className="btn btn-secondary btn-xs"
                              onClick={() => openEditForm(m)}
                              data-testid={`btn-edit-milestone-${m.id}`}
                            >
                              Sửa
                            </button>
                            {m.status !== 'DONE' && (
                              <button
                                type="button"
                                className="btn btn-secondary btn-xs"
                                onClick={() => setCompletingMilestone(m)}
                                data-testid={`btn-complete-milestone-${m.id}`}
                              >
                                Hoàn thành
                              </button>
                            )}
                            <button
                              type="button"
                              className="btn btn-danger btn-xs"
                              onClick={() => void handleDelete(m)}
                              disabled={deletingId === m.id}
                              data-testid={`btn-delete-milestone-${m.id}`}
                            >
                              Xóa
                            </button>
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <MilestoneFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        projectId={projectId}
        wbs={wbs}
        milestone={editingMilestone}
        onSaved={(saved) => {
          onNotify?.(
            editingMilestone
              ? `Đã cập nhật mốc tiến độ "${saved.name}"`
              : `Đã thêm mốc tiến độ "${saved.name}" thành công`,
            'success'
          );
          void loadMilestones();
        }}
      />

      <MilestoneCompleteModal
        isOpen={completingMilestone !== null}
        onClose={() => setCompletingMilestone(null)}
        projectId={projectId}
        milestone={completingMilestone}
        onSaved={(saved) => {
          onNotify?.(`Đã ghi nhận ngày hoàn thành cho mốc "${saved.name}"`, 'success');
          void loadMilestones();
        }}
      />
    </div>
  );
}
