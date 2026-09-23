import { useCallback, useEffect, useState } from 'react';
import { ICONS } from '../../../components/common/icons';
import ModalPortal from '../../../components/common/ModalPortal';
import { useBackdropClick } from '../../../hooks/useBackdropClick';
import { getMyTasks, MyTasksApiError } from '../api/myTasksApi';
import type { MyTaskRes } from '../types/myTaskTypes';
import { updateTaskProgress, ProjectsApiError } from '../../projects/api/projectsApi';
import type { TaskStatus } from '../../projects/types/projectTypes';
import type { TimesheetSummaryRes } from '../../timesheets/types/timesheetTypes';
import { getMyWeekTimeEntries, submitWeek, TimesheetsApiError } from '../../timesheets/api/timesheetsApi';
import WeeklyTimesheetGrid from '../../timesheets/components/WeeklyTimesheetGrid';
import TimeEntryPage from '../../timesheets/pages/TimeEntryPage';
import ExpenseListPage from '../../expenses/pages/ExpenseListPage';
import { addDays, formatIsoDate, getMondayOf } from '../../timesheets/utils/weekRange';
import { canSubmitWeek, countDraftEntries } from '../../timesheets/validators/timesheetValidators';

export interface MyWorkPageProps {
  currentUserRoles?: string[];
  currentUserName?: string;
  currentUserId?: number;
}

interface SelectedTask {
  projectId: number;
  taskId: number;
  taskName: string;
}

interface SelectedExpenseProject {
  projectId: number;
  projectName: string;
}

const STATUS_OPTIONS: { value: TaskStatus; label: string }[] = [
  { value: 'TODO', label: 'Chờ thực hiện' },
  { value: 'IN_PROGRESS', label: 'Đang làm' },
  { value: 'WAITING_APPROVAL', label: 'Chờ duyệt' },
  { value: 'DONE', label: 'Hoàn thành' },
];

const statusBadgeConfig: Record<TaskStatus, { label: string; className: string }> = {
  TODO: { label: 'Chờ thực hiện', className: 'wbs-badge--todo' },
  IN_PROGRESS: { label: 'Đang làm', className: 'wbs-badge--progress' },
  WAITING_APPROVAL: { label: 'Chờ duyệt', className: 'wbs-badge--review' },
  DONE: { label: 'Hoàn thành', className: 'wbs-badge--done' },
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('vi-VN');
}

/**
 * "Công việc và giờ công": gộp "Công việc của tôi" (NCL-05-CN-003/004 — danh sách
 * công việc được PM phân công trên mọi dự án + tự đổi trạng thái, không giới hạn
 * vai trò) với "Giờ công của tôi" (NCL-06-CN-001/002 — ghi/nộp giờ công tuần, vẫn
 * chỉ dành cho Nhân viên chuyên môn VT-03 vì backend TimeEntryController chỉ mở
 * cho vai trò này). Một điểm vào duy nhất thay vì hai màn rời rạc và trùng lặp.
 */
export default function MyWorkPage({ currentUserRoles = [], currentUserName = 'Người dùng', currentUserId }: MyWorkPageProps) {
  const canLogTime = currentUserRoles.includes('VT-03');
  // NCL-08-CN-001: Nhân viên chuyên môn ghi nhận chi phí dự án — nhưng modal "Quản lý dự
  // án" (nơi có tab Chi phí) chỉ mở được từ menu "Khách hàng", vốn không dành cho VT-03.
  // Route riêng ngay tại đây (trang họ đang đứng) để VT-03 có lối vào, thay vì đi qua
  // "Quản lý dự án" đủ mọi tab như PM.
  const [selectedExpenseProject, setSelectedExpenseProject] = useState<SelectedExpenseProject | null>(null);

  // ----- Công việc được giao (mọi vai trò) -----
  const [tasks, setTasks] = useState<MyTaskRes[]>([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [tasksError, setTasksError] = useState<string | null>(null);
  const [updatingTaskId, setUpdatingTaskId] = useState<number | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const loadTasks = useCallback(async () => {
    setTasksLoading(true);
    setTasksError(null);
    try {
      const data = await getMyTasks();
      setTasks(data);
    } catch (err) {
      const message =
        err instanceof MyTasksApiError || err instanceof Error ? err.message : 'Không thể tải danh sách công việc.';
      setTasksError(message);
    } finally {
      setTasksLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTasks();
  }, [loadTasks]);

  const handleStatusChange = async (task: MyTaskRes, nextStatus: TaskStatus) => {
    if (nextStatus === task.taskStatus || updatingTaskId != null) return;
    setUpdatingTaskId(task.taskId);
    try {
      await updateTaskProgress(task.projectId, task.taskId, { status: nextStatus });
      setTasks((prev) => prev.map((t) => (t.taskId === task.taskId ? { ...t, taskStatus: nextStatus } : t)));
      showToast(`Đã cập nhật tiến độ "${task.taskName}" thành công`);
    } catch (err) {
      const message =
        err instanceof ProjectsApiError || err instanceof Error ? err.message : 'Không thể cập nhật tiến độ.';
      showToast(message, 'error');
    } finally {
      setUpdatingTaskId(null);
    }
  };

  // ----- Giờ công tuần (chỉ VT-03) -----
  const [weekFrom, setWeekFrom] = useState<string>(() => getMondayOf());
  const weekTo = addDays(weekFrom, 6);
  const isCurrentWeek = weekFrom === getMondayOf();
  const [summaries, setSummaries] = useState<TimesheetSummaryRes[]>([]);
  const [weekLoading, setWeekLoading] = useState(false);
  const [weekError, setWeekError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [selectedTask, setSelectedTask] = useState<SelectedTask | null>(null);
  const [confirmSubmit, setConfirmSubmit] = useState(false);

  const loadWeek = useCallback(async () => {
    if (!canLogTime) return;
    setWeekLoading(true);
    setWeekError(null);
    try {
      const data = await getMyWeekTimeEntries(weekFrom, weekTo);
      setSummaries(data);
    } catch (err) {
      const message =
        err instanceof TimesheetsApiError || err instanceof Error ? err.message : 'Không thể tải bảng giờ công.';
      setWeekError(message);
    } finally {
      setWeekLoading(false);
    }
  }, [canLogTime, weekFrom, weekTo]);

  useEffect(() => {
    void loadWeek();
  }, [loadWeek]);

  const grandTotal = summaries.reduce((sum, s) => sum + (s.totalHours ?? 0), 0);
  const allEntries = summaries.flatMap((s) => s.entries);
  const hasDraft = canSubmitWeek(summaries);
  const draftCount = countDraftEntries(summaries);
  const submitBanner = (() => {
    if (allEntries.length === 0 || hasDraft) return null;
    const hasApproved = allEntries.some((e) => e.status === 'APPROVED');
    const hasSubmitted = allEntries.some((e) => e.status === 'SUBMITTED');
    // Kiểm tra "đang chờ duyệt" TRƯỚC "đã duyệt": sau khi được phép nộp bổ sung việc
    // mới vào một tuần đã duyệt, tuần có thể ở trạng thái hỗn hợp (phần cũ đã duyệt,
    // phần mới vừa nộp) — nếu ưu tiên "đã duyệt" trước sẽ báo sai là xong hết, trong
    // khi PM chưa hề duyệt phần mới.
    if (hasSubmitted) {
      return {
        tone: 'submitted',
        text: hasApproved
          ? 'Một phần giờ công tuần này đã được duyệt, phần còn lại vừa nộp — đang chờ Quản lý dự án duyệt.'
          : 'Đã nộp bảng chấm công tuần này — đang chờ Quản lý dự án duyệt.',
      };
    }
    if (hasApproved) return { tone: 'approved', text: 'Bảng chấm công tuần này đã được Quản lý dự án duyệt.' };
    return { tone: 'rejected', text: 'Bảng chấm công tuần này bị từ chối. Hãy chỉnh sửa giờ công rồi nộp lại.' };
  })();

  const totalDraftHours = summaries.reduce(
    (sum, s) => sum + s.entries.filter((e) => e.status === 'DRAFT').reduce((h, e) => h + e.hours, 0),
    0
  );

  const handleSubmitWeek = async () => {
    if (!hasDraft || submitting) return;

    setConfirmSubmit(false);
    setSubmitting(true);
    try {
      const result = await submitWeek(weekFrom);
      showToast(`Đã nộp bảng chấm công tuần thành công — tổng ${result.totalHours} giờ, đang chờ duyệt.`);
      await loadWeek();
    } catch (err) {
      const message =
        err instanceof TimesheetsApiError || err instanceof Error
          ? err.message
          : 'Không thể nộp bảng chấm công tuần. Vui lòng thử lại.';
      showToast(message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const confirmBackdrop = useBackdropClick(() => setConfirmSubmit(false), submitting);

  if (selectedExpenseProject) {
    return (
      <ExpenseListPage
        projectId={selectedExpenseProject.projectId}
        currentUserRoles={currentUserRoles}
        currentUserId={currentUserId}
        onBack={() => setSelectedExpenseProject(null)}
      />
    );
  }

  if (selectedTask) {
    return (
      <TimeEntryPage
        projectId={selectedTask.projectId}
        taskId={selectedTask.taskId}
        taskName={selectedTask.taskName}
        currentUserRoles={currentUserRoles}
        onBack={() => {
          setSelectedTask(null);
          void loadTasks();
          void loadWeek();
        }}
      />
    );
  }

  return (
    <div className="user-management-page" data-testid="my-work-page">
      <div className="page-header" style={{ marginBottom: '16px' }}>
        <div>
          {/* Menu bên trái và thanh trên cùng của layout đã hiện đúng chữ "Công việc và giờ
              công" rồi — lặp lại y hệt làm tiêu đề trang thứ hai chỉ gây rối mắt. Tiêu đề ở
              đây nói rõ hơn NỘI DUNG cụ thể của trang (giống "Hồ sơ khách hàng" dưới menu
              "Khách hàng"), không nhắc lại tên menu. */}
          <h1 className="page-title">Việc được giao &amp; giờ công tuần</h1>
          <p className="page-subtitle">
            {currentUserName} — đổi trạng thái công việc ngay tại đây
            {canLogTime ? '; bảng giờ công tuần để ghi và nộp ở bên dưới.' : '.'}
          </p>
        </div>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={() => {
            void loadTasks();
            void loadWeek();
          }}
          disabled={tasksLoading || weekLoading}
        >
          {ICONS.refresh} Làm mới
        </button>
      </div>

      {toast && (
        <div className={`alert-box alert-box--${toast.type === 'success' ? 'success' : 'danger'}`} role="alert" style={{ marginBottom: '14px' }}>
          {toast.message}
        </div>
      )}

      {tasksError && (
        <div className="alert-box alert-box--danger" role="alert" data-testid="my-tasks-error" style={{ marginBottom: '14px' }}>
          {tasksError}
        </div>
      )}

      <div className="user-table-card" style={{ padding: '20px', marginBottom: '16px' }}>
        <h3 style={{ margin: '0 0 12px', fontSize: '16px', fontWeight: 700, color: 'var(--ink-strong)' }}>
          Công việc đang được giao
        </h3>

        {tasksLoading ? (
          <div className="table-loading-state" data-testid="my-tasks-loading">
            <span className="spinner-lg" />
            <p style={{ marginTop: '10px' }}>Đang tải danh sách công việc...</p>
          </div>
        ) : tasks.length === 0 ? (
          <div className="table-empty-state" data-testid="my-tasks-empty">
            <div className="table-empty-state__icon">{ICONS.folder}</div>
            <h4 style={{ margin: '0 0 6px', fontSize: '15px', color: 'var(--ink-strong)' }}>Chưa được giao công việc nào</h4>
            <p style={{ margin: 0, color: 'var(--ink-muted)', fontSize: '13.5px' }}>
              Khi Quản lý dự án phân công cho bạn, công việc sẽ xuất hiện ở đây.
            </p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="user-data-table" data-testid="my-tasks-table">
              <thead>
                <tr>
                  <th>Dự án</th>
                  <th>Công việc</th>
                  <th>Khung ngày dự kiến</th>
                  <th>Trạng thái</th>
                  {canLogTime && <th>Giờ công</th>}
                  {canLogTime && <th>Chi phí</th>}
                </tr>
              </thead>
              <tbody>
                {tasks.map((task) => {
                  const badge = statusBadgeConfig[task.taskStatus] || { label: task.taskStatus, className: 'wbs-badge--todo' };
                  const isClosedProject = task.projectStatus === 'CLOSED';
                  return (
                    <tr key={task.taskId} data-testid={`my-task-row-${task.taskId}`}>
                      <td>
                        <div style={{ fontWeight: 500 }}>{task.projectName}</div>
                        <div style={{ fontSize: '12px', color: 'var(--ink-muted)' }}>{task.projectCode}</div>
                      </td>
                      <td>{task.taskName}</td>
                      <td style={{ whiteSpace: 'nowrap', fontSize: '13px', color: 'var(--ink-muted)' }}>
                        {formatDate(task.assignmentStartDate ?? task.expectedStartDate)}
                        {' ➔ '}
                        {formatDate(task.assignmentEndDate ?? task.expectedEndDate)}
                      </td>
                      <td>
                        {isClosedProject ? (
                          <span className={`wbs-badge ${badge.className}`}>{badge.label}</span>
                        ) : (
                          <select
                            className={`form-input status-select status-select--${badge.className.replace('wbs-badge--', '')}`}
                            style={{ width: 'auto', minWidth: '150px' }}
                            value={task.taskStatus}
                            disabled={updatingTaskId === task.taskId}
                            onChange={(e) => void handleStatusChange(task, e.target.value as TaskStatus)}
                            data-testid={`my-task-status-select-${task.taskId}`}
                          >
                            {STATUS_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        )}
                      </td>
                      {canLogTime && (
                        <td>
                          {isClosedProject ? (
                            <span className="field-hint" style={{ fontSize: '12px' }}>
                              —
                            </span>
                          ) : (
                            <button
                              type="button"
                              className="btn btn-primary btn-xs"
                              onClick={() =>
                                setSelectedTask({ projectId: task.projectId, taskId: task.taskId, taskName: task.taskName })
                              }
                              data-testid={`btn-log-time-${task.taskId}`}
                            >
                              {ICONS.clock} Ghi giờ công
                            </button>
                          )}
                        </td>
                      )}
                      {canLogTime && (
                        <td>
                          <button
                            type="button"
                            className="btn btn-secondary btn-xs"
                            onClick={() => setSelectedExpenseProject({ projectId: task.projectId, projectName: task.projectName })}
                            data-testid={`btn-project-expenses-${task.projectId}`}
                          >
                            {ICONS.receipt} Chi phí dự án
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {canLogTime && (
        <>
          {weekError && (
            <div className="alert-box alert-box--danger" role="alert" data-testid="my-timesheet-load-error" style={{ marginBottom: '16px' }}>
              {weekError}
            </div>
          )}

          <div className="user-table-card week-nav">
            <div className="week-nav__switcher">
              <button
                type="button"
                className="icon-btn"
                onClick={() => setWeekFrom((prev) => addDays(prev, -7))}
                aria-label="Tuần trước"
                title="Tuần trước"
                data-testid="btn-week-prev"
              >
                {ICONS.arrowLeft}
              </button>
              <div className="week-nav__label">
                <span className="week-nav__range" data-testid="my-timesheet-week-label">
                  {formatIsoDate(weekFrom)} → {formatIsoDate(weekTo)}
                </span>
                {isCurrentWeek ? (
                  <span className="week-nav__hint">Tuần hiện tại</span>
                ) : (
                  <button type="button" className="week-nav__today-link" onClick={() => setWeekFrom(getMondayOf())} data-testid="btn-week-current">
                    Về tuần hiện tại
                  </button>
                )}
              </div>
              <button
                type="button"
                className="icon-btn"
                onClick={() => setWeekFrom((prev) => addDays(prev, 7))}
                aria-label="Tuần sau"
                title="Tuần sau"
                data-testid="btn-week-next"
              >
                {ICONS.arrowRight}
              </button>
            </div>

            <div className="week-nav__summary">
              <span className="week-nav__total">
                Tổng giờ tuần <strong data-testid="grand-total-hours">{grandTotal}</strong>
              </span>
              {hasDraft && (
                <button type="button" className="btn-primary btn-sm" onClick={() => setConfirmSubmit(true)} disabled={submitting} data-testid="btn-submit-week">
                  {ICONS.checkCircle} {submitting ? 'Đang nộp…' : `Nộp bảng chấm công (${draftCount} dòng)`}
                </button>
              )}
            </div>
          </div>

          {submitBanner && (
            <div className={`status-pill status-pill--${submitBanner.tone}`} style={{ marginBottom: '16px' }} data-testid="submit-week-banner">
              <span className="status-pill__dot" />
              {submitBanner.text}
            </div>
          )}

          <div className="user-table-card" style={{ padding: '20px' }}>
            {weekLoading ? (
              <div className="table-loading-state" data-testid="my-timesheet-table-loading">
                <span className="spinner-lg" />
                <p style={{ marginTop: '10px' }}>Đang nạp bảng giờ công...</p>
              </div>
            ) : (
              // Mở lại một dòng giờ công cụ thể để sửa: dùng đúng nút "Ghi giờ công" ở bảng
              // công việc phía trên, không lặp lại một lối vào thứ hai cho cùng một việc.
              <WeeklyTimesheetGrid weekFrom={weekFrom} weekTo={weekTo} summaries={summaries} />
            )}
          </div>
        </>
      )}

      {confirmSubmit && (
        <ModalPortal>
          <div
            className="modal-backdrop"
            onMouseDown={confirmBackdrop.onMouseDown}
            onClick={confirmBackdrop.onClick}
            role="dialog"
            aria-modal="true"
          >
            <div className="modal-card" style={{ maxWidth: '440px' }}>
              <div className="modal-header">
                <div className="modal-header__title-wrap">
                  <h3 className="modal-title">
                    <span className="modal-title__icon">{ICONS.checkCircle}</span>
                    Nộp bảng chấm công tuần
                  </h3>
                </div>
                <button
                  type="button"
                  className="modal-close"
                  onClick={() => setConfirmSubmit(false)}
                  disabled={submitting}
                  aria-label="Đóng"
                >
                  {ICONS.close}
                </button>
              </div>
              <div className="modal-body">
                <p>
                  Nộp bảng chấm công tuần {formatIsoDate(weekFrom)} → {formatIsoDate(weekTo)} với{' '}
                  <strong>{draftCount}</strong> dòng giờ công (tổng <strong>{totalDraftHours}</strong> giờ)?
                </p>
                <p className="field-hint">
                  Sau khi nộp, bạn sẽ không sửa hoặc xóa được các dòng giờ công của tuần này cho đến khi được duyệt.
                </p>
                <div style={{ marginTop: '16px', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                  <button type="button" className="btn" onClick={() => setConfirmSubmit(false)} disabled={submitting}>
                    Hủy
                  </button>
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={() => void handleSubmitWeek()}
                    disabled={submitting}
                    data-testid="btn-confirm-submit-week"
                  >
                    {submitting ? 'Đang nộp…' : 'Xác nhận nộp'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
}
