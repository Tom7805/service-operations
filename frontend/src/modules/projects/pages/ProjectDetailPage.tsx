import { useEffect, useMemo, useState } from 'react';
import { getAssignableUsers } from '../../employees/api/employeesApi';
import type { AssignableUser } from '../../employees/types/employeeTypes';
import { ICONS } from '../../../components/common/icons';
import TaskAssignModal from '../components/TaskAssignModal';
import { assignTaskToStaff, getProjectWorkBreakdown, getTaskAssignments } from '../api/tasksApi';
import type { Task, TaskAssignment, TaskAssignmentPayload, WorkBreakdownNode } from '../types/taskTypes';
import { TASK_STATUS_LABELS } from '../types/taskTypes';

interface ProjectDetailPageProps {
  projectId?: number;
  currentUserRoles?: string[];
  currentUserName?: string;
  onBack?: () => void;
}

function flattenTasks(nodes: WorkBreakdownNode[]): Task[] {
  return nodes.flatMap((node) => [...node.tasks, ...flattenTasks(node.children)]);
}

export default function ProjectDetailPage({
  projectId = 1,
  currentUserRoles = ['VT-02'],
  currentUserName = 'Quản lý dự án',
  onBack,
}: ProjectDetailPageProps) {
  const canManageAssignments = currentUserRoles.includes('VT-02');
  const canViewProject = currentUserRoles.includes('VT-02') || currentUserRoles.includes('VT-01') || currentUserRoles.includes('VT-03');
  const [workBreakdown, setWorkBreakdown] = useState<WorkBreakdownNode[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [selectedAssignments, setSelectedAssignments] = useState<TaskAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [staffList, setStaffList] = useState<AssignableUser[]>([]);
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const flattenedTasks = useMemo(() => flattenTasks(workBreakdown), [workBreakdown]);

  useEffect(() => {
    if (!canViewProject) return;

    getProjectWorkBreakdown(projectId)
      .then((data) => setWorkBreakdown(data))
      .catch((err) => {
        const message = err instanceof Error ? err.message : 'Không thể tải cấu trúc công việc dự án.';
        setError(message);
      })
      .finally(() => setLoading(false));

    getAssignableUsers()
      .then((list) => setStaffList(list))
      .catch(() => setStaffList([]));
  }, [canViewProject, projectId]);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleOpenAssign = async (task: Task) => {
    setSelectedTask(task);
    try {
      const assignments = await getTaskAssignments(projectId, task.id);
      setSelectedAssignments(assignments);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Không thể tải danh sách nhân sự đã giao.';
      setError(message);
      setSelectedAssignments([]);
    }
  };

  const handleAssignmentSubmit = async (payload: TaskAssignmentPayload) => {
    if (!selectedTask) return;

    try {
      const nextAssignments = await assignTaskToStaff(projectId, selectedTask.id, payload);
      setSelectedAssignments(nextAssignments);
      showToast('Đã cập nhật người được giao cho công việc.', 'success');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Không thể phân công nhân sự cho công việc.';
      showToast(message, 'error');
      throw err;
    }
  };

  if (!canViewProject) {
    return (
      <div className="access-denied-container">
        <div className="access-denied-card">
          <div className="access-denied-icon">{ICONS.shieldOff}</div>
          <h2>Bạn không có thẩm quyền truy cập màn hình này</h2>
          <p>
            Chức năng <strong>Quản lý dự án</strong> cần vai trò <strong>Quản lý dự án (VT-02)</strong>.
            Tài khoản hiện tại: {currentUserName}.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="user-management-page">
      {toast && (
        <div className={`toast-banner toast-banner--${toast.type}`} role="status">
          <span className="toast-banner__icon">{toast.type === 'success' ? ICONS.checkCircle : ICONS.alertTriangle}</span>
          <span>{toast.text}</span>
          <button type="button" className="toast-banner__close" aria-label="Đóng thông báo" onClick={() => setToast(null)}>
            {ICONS.close}
          </button>
        </div>
      )}

      <div className="page-header">
        <div>
          <div className="breadcrumb">
            {onBack && (
              <button type="button" className="breadcrumb-btn" onClick={onBack}>
                <span className="icon-sm">{ICONS.arrowLeft}</span> Về danh sách
              </button>
            )}
          </div>
          <h1 className="page-title">Quản lý dự án</h1>
          <p className="page-subtitle">Theo dõi công việc, phân công nhân sự và kiểm tra lịch hoàn thành dự kiến.</p>
        </div>
      </div>

      {error && (
        <div className="alert alert--error mb-4" role="alert">
          <span className="alert__icon">{ICONS.alertTriangle}</span>
          <div>{error}</div>
        </div>
      )}

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-card__icon stat-card__icon--blue">{ICONS.briefcase}</div>
          <div>
            <span className="stat-card__label">Dự án</span>
            <strong className="stat-card__value">#{projectId}</strong>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card__icon stat-card__icon--green">{ICONS.clipboardList}</div>
          <div>
            <span className="stat-card__label">Tổng công việc</span>
            <strong className="stat-card__value">{flattenedTasks.length}</strong>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="empty-state">
          <p>Đang tải cấu trúc công việc...</p>
        </div>
      ) : (
        <div className="user-table-card">
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Công việc</th>
                  <th>Trạng thái</th>
                  <th>Ngày dự kiến</th>
                  <th>Người được giao</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {flattenedTasks.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="empty-state-cell">
                      Chưa có công việc nào trong dự án.
                    </td>
                  </tr>
                ) : (
                  flattenedTasks.map((task) => {
                    const assignedPeople = selectedTask?.id === task.id ? selectedAssignments : [];
                    return (
                      <tr key={task.id}>
                        <td>
                          <div className="cell-title">{task.name}</div>
                          <small className="cell-meta">{task.description || 'Không có mô tả'}</small>
                        </td>
                        <td>
                          <span className="status-badge status-badge--neutral">{TASK_STATUS_LABELS[task.status] ?? task.status}</span>
                        </td>
                        <td>
                          {task.expectedStartDate || task.expectedEndDate ? (
                            <span>
                              {task.expectedStartDate || '—'}
                              <br />
                              {task.expectedEndDate || '—'}
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td>
                          {assignedPeople.length > 0 ? (
                            <div className="stacked-inline-list">
                              {assignedPeople.map((person) => (
                                <span key={person.id} className="pill-chip">
                                  {person.fullName}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="cell-muted">Chưa phân công</span>
                          )}
                        </td>
                        <td>
                          {canManageAssignments ? (
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={() => handleOpenAssign(task)}
                            >
                              <span className="btn-icon">{ICONS.userCheck}</span>
                              Giao việc
                            </button>
                          ) : (
                            <span className="cell-muted">Chỉ xem</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <TaskAssignModal
        isOpen={Boolean(selectedTask)}
        projectId={projectId}
        task={selectedTask}
        assignments={selectedAssignments}
        staffList={staffList}
        onClose={() => {
          setSelectedTask(null);
          setSelectedAssignments([]);
        }}
        onSubmit={handleAssignmentSubmit}
      />
    </div>
  );
}
