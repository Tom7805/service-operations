import { useCallback, useEffect, useState } from 'react';
import { ICONS } from '../../../components/common/icons';
import { roleLabels } from '../../../utils/roleLabel';
import { fetchMyTasks, updateTaskProgress, ProjectsApiError } from '../api/projectsApi';
import type { MyTaskRes, TaskStatus } from '../types/projectTypes';

interface MyTasksPageProps {
  currentUserRoles?: string[];
  currentUserName?: string;
}

/** Khớp enum TaskStatus phía backend — thứ tự cũng là thứ tự hiển thị trong ô chọn trạng thái. */
const STATUS_OPTIONS: { value: TaskStatus; label: string }[] = [
  { value: 'TODO', label: 'Chờ thực hiện' },
  { value: 'IN_PROGRESS', label: 'Đang làm' },
  { value: 'WAITING_APPROVAL', label: 'Chờ duyệt' },
  { value: 'DONE', label: 'Hoàn thành' },
];

const STATUS_BADGE_CLASS: Record<TaskStatus, string> = {
  TODO: 'wbs-badge--todo',
  IN_PROGRESS: 'wbs-badge--progress',
  WAITING_APPROVAL: 'wbs-badge--review',
  DONE: 'wbs-badge--done',
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('vi-VN');
}

/**
 * NCL-05-CN-004: "Việc của tôi" — nơi người được phân công (thường là VT-03) tự xem các
 * công việc mình đang phụ trách (ở mọi dự án) và đổi trạng thái tiến độ. Backend vẫn là
 * chốt chặn thật: chỉ người có tên trong bảng phân công của đúng công việc đó mới đổi được.
 */
export default function MyTasksPage({
  currentUserRoles = ['VT-03'],
  currentUserName = 'Nhân viên',
}: MyTasksPageProps) {
  const isAllowed =
    currentUserRoles.includes('VT-03') ||
    currentUserRoles.includes('VT-02') ||
    currentUserRoles.includes('VT-01');

  const [tasks, setTasks] = useState<MyTaskRes[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingTaskId, setUpdatingTaskId] = useState<number | null>(null);
  const [rowError, setRowError] = useState<Record<number, string>>({});
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const loadTasks = useCallback(async () => {
    if (!isAllowed) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchMyTasks();
      setTasks(data);
    } catch (err) {
      setError(
        err instanceof ProjectsApiError ? err.message : 'Không thể tải danh sách công việc được giao.'
      );
    } finally {
      setLoading(false);
    }
  }, [isAllowed]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const handleChangeStatus = async (task: MyTaskRes, nextStatus: TaskStatus) => {
    if (nextStatus === task.status) return;
    setUpdatingTaskId(task.taskId);
    setRowError((prev) => ({ ...prev, [task.taskId]: '' }));
    try {
      const updated = await updateTaskProgress(task.projectId, task.taskId, { status: nextStatus });
      setTasks((prev) =>
        prev.map((t) => (t.taskId === task.taskId ? { ...t, status: updated.status } : t))
      );
      setToastMessage(`Đã đổi trạng thái công việc "${task.taskName}" thành công`);
      setTimeout(() => setToastMessage(null), 4000);
    } catch (err) {
      const message =
        err instanceof ProjectsApiError ? err.message : 'Không thể cập nhật tiến độ công việc.';
      setRowError((prev) => ({ ...prev, [task.taskId]: message }));
    } finally {
      setUpdatingTaskId(null);
    }
  };

  if (!isAllowed) {
    return (
      <div className="access-denied-container">
        <div className="access-denied-card">
          <div className="access-denied-icon">{ICONS.shieldOff}</div>
          <h2>Bạn không có thẩm quyền truy cập màn hình này</h2>
          <p>
            Màn hình "Việc của tôi" dành cho nhân viên đang được phân công công việc trong dự án
            (<strong>Nhân viên chuyên môn</strong>, <strong>Quản lý dự án</strong>, <strong>Ban giám đốc</strong>).
          </p>
          <div className="security-log-badge">
            <span className="security-log-badge__item">{ICONS.shield} Thời điểm: {new Date().toLocaleString('vi-VN')}</span>
            <span className="security-log-badge__item">Tài khoản: {currentUserName}</span>
            <span className="security-log-badge__item">Vai trò hiện tại: {roleLabels(currentUserRoles)}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="user-management-page">
      {toastMessage && (
        <div className="toast-banner toast-banner--success" role="status">
          <span className="toast-banner__icon">{ICONS.checkCircle}</span>
          <span>{toastMessage}</span>
          <button type="button" className="toast-banner__close" aria-label="Đóng thông báo" onClick={() => setToastMessage(null)}>
            {ICONS.close}
          </button>
        </div>
      )}

      <div className="page-header">
        <div>
          <h1 className="page-title">Việc của tôi</h1>
          <p className="page-subtitle">
            Danh sách công việc bạn đang được phân công ở mọi dự án — đổi trạng thái ngay khi tiến độ thay đổi.
          </p>
        </div>
      </div>

      {error && (
        <div className="alert alert--error mb-4" role="alert">
          <span className="alert__icon">{ICONS.alertTriangle}</span>
          <span>{error}</span>
          <button type="button" className="btn-link text-white ml-auto" onClick={loadTasks}>
            Thử lại
          </button>
        </div>
      )}

      <div className="user-table-card">
        {loading ? (
          <div className="table-empty-state" style={{ padding: '36px 20px', textAlign: 'center' }}>
            <p style={{ margin: 0, color: '#64748B' }}>Đang tải danh sách công việc…</p>
          </div>
        ) : tasks.length === 0 ? (
          <div className="table-empty-state" data-testid="my-tasks-empty" style={{ padding: '36px 20px', textAlign: 'center' }}>
            <div className="table-empty-state__icon" style={{ fontSize: '36px', color: '#94A3B8', marginBottom: '8px' }}>
              {ICONS.clipboardList}
            </div>
            <h4 style={{ margin: '0 0 6px', fontSize: '15px', color: '#1E293B' }}>Bạn chưa được giao công việc nào</h4>
            <p style={{ margin: 0, color: '#64748B', fontSize: '13.5px' }}>
              Khi Quản lý dự án phân công một công việc cho bạn, công việc đó sẽ xuất hiện ở đây.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="user-data-table" data-testid="my-tasks-table">
              <thead>
                <tr>
                  <th>Dự án</th>
                  <th>Công việc</th>
                  <th>Ngày dự kiến</th>
                  <th>Trạng thái</th>
                  <th>Đổi trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((task) => {
                  const badgeClass = STATUS_BADGE_CLASS[task.status] ?? 'wbs-badge--todo';
                  return (
                    <tr key={task.taskId} data-testid={`my-task-row-${task.taskId}`}>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <strong>{task.projectName ?? `#${task.projectId}`}</strong>
                          {task.projectCode && <span className="cell-muted">{task.projectCode}</span>}
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span>{task.taskName}</span>
                          {task.description && <span className="cell-muted">{task.description}</span>}
                        </div>
                      </td>
                      <td>
                        {formatDate(task.expectedStartDate)} → {formatDate(task.expectedEndDate)}
                      </td>
                      <td>
                        <span className={`wbs-badge ${badgeClass}`}>
                          {STATUS_OPTIONS.find((o) => o.value === task.status)?.label ?? task.status}
                        </span>
                      </td>
                      <td>
                        <select
                          className="form-input"
                          value={task.status}
                          disabled={updatingTaskId === task.taskId}
                          onChange={(e) => handleChangeStatus(task, e.target.value as TaskStatus)}
                          data-testid={`my-task-status-select-${task.taskId}`}
                        >
                          {STATUS_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                        {rowError[task.taskId] && (
                          <p
                            className="field-error"
                            data-testid={`my-task-error-${task.taskId}`}
                            style={{ color: '#DC2626', fontSize: '12px', marginTop: '4px' }}
                          >
                            {rowError[task.taskId]}
                          </p>
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
    </div>
  );
}
