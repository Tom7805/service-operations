import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { useAutoDismiss, useDialogA11y, useIsPhone, useLatestRequest } from '../../projects/components/deliveryUi';
import { EmptyBlock, LoadError, SkeletonTable } from '../../projects/components/DeliveryStates';

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

interface TaskRowProps {
  task: MyTaskRes;
  canLogTime: boolean;
  updating: boolean;
  onStatusChange: (task: MyTaskRes, nextStatus: TaskStatus) => void;
  onLogTime: (task: MyTaskRes) => void;
  onOpenExpenses: (task: MyTaskRes) => void;
}

/**
 * Một hàng công việc — memo để toast/đổi tuần/nạp lại lưới giờ công không vẽ lại cả danh
 * sách. Trên điện thoại hàng tự xếp thành thẻ (`.dl-stack-table`, nhãn lấy từ `data-label`).
 */
const TaskRow = memo(function TaskRow({ task, canLogTime, updating, onStatusChange, onLogTime, onOpenExpenses }: TaskRowProps) {
  const badge = statusBadgeConfig[task.taskStatus] || { label: task.taskStatus, className: 'wbs-badge--todo' };
  const isClosedProject = task.projectStatus === 'CLOSED';
  return (
    <tr data-testid={`my-task-row-${task.taskId}`}>
      <td className="dl-stack-title" data-label="Dự án">
        <span className="dl-cell-strong">{task.projectName}</span>
        <span className="dl-cell-sub dl-cell-code">{task.projectCode}</span>
      </td>
      <td data-label="Công việc">{task.taskName}</td>
      <td className="dl-cell-date" data-label="Khung ngày">
        {formatDate(task.assignmentStartDate ?? task.expectedStartDate)}
        {' ➔ '}
        {formatDate(task.assignmentEndDate ?? task.expectedEndDate)}
      </td>
      <td data-label="Trạng thái">
        {isClosedProject ? (
          <span className={`wbs-badge ${badge.className}`}>{badge.label}</span>
        ) : (
          <select
            className={`form-input dl-select-auto status-select status-select--${badge.className.replace('wbs-badge--', '')}`}
            value={task.taskStatus}
            disabled={updating}
            aria-label={`Trạng thái công việc ${task.taskName}`}
            aria-busy={updating || undefined}
            onChange={(e) => onStatusChange(task, e.target.value as TaskStatus)}
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
        <td data-label={isClosedProject ? 'Giờ công' : undefined}>
          {isClosedProject ? (
            <span className="field-hint" title="Dự án đã đóng — không ghi thêm giờ công">
              —
            </span>
          ) : (
            <button
              type="button"
              className="btn btn-primary btn-xs"
              onClick={() => onLogTime(task)}
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
            onClick={() => onOpenExpenses(task)}
            data-testid={`btn-project-expenses-${task.projectId}`}
          >
            {ICONS.receipt} Chi phí dự án
          </button>
        </td>
      )}
    </tr>
  );
});

const TASK_HEADERS_BASE = ['Dự án', 'Công việc', 'Khung ngày dự kiến', 'Trạng thái'];

/**
 * "Công việc và giờ công": gộp "Công việc của tôi" (NCL-05-CN-003/004 — danh sách
 * công việc được PM phân công trên mọi dự án + tự đổi trạng thái, không giới hạn
 * vai trò) với "Giờ công của tôi" (NCL-06-CN-001/002 — ghi/nộp giờ công tuần, vẫn
 * chỉ dành cho Nhân viên chuyên môn VT-03 vì backend TimeEntryController chỉ mở
 * cho vai trò này). Một điểm vào duy nhất thay vì hai màn rời rạc và trùng lặp.
 */
export default function MyWorkPage({ currentUserRoles = [], currentUserName = 'Người dùng', currentUserId }: MyWorkPageProps) {
  const canLogTime = currentUserRoles.includes('VT-03');
  const isPhone = useIsPhone();
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
  const clearToast = useCallback(() => setToast(null), []);
  useAutoDismiss(toast, clearToast, 4000);

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
  }, []);

  const tasksRequest = useLatestRequest();
  const loadTasks = useCallback(async () => {
    const token = tasksRequest.begin();
    setTasksLoading(true);
    setTasksError(null);
    try {
      const data = await getMyTasks();
      if (!tasksRequest.isLatest(token)) return;
      setTasks(data);
    } catch (err) {
      if (!tasksRequest.isLatest(token)) return;
      const message =
        err instanceof MyTasksApiError || err instanceof Error ? err.message : 'Không thể tải danh sách công việc.';
      setTasksError(message);
    } finally {
      if (tasksRequest.isLatest(token)) setTasksLoading(false);
    }
  }, [tasksRequest]);

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
  // Callback ổn định cho các hàng đã memo — luôn gọi phiên bản handler mới nhất.
  const statusChangeRef = useRef(handleStatusChange);
  statusChangeRef.current = handleStatusChange;
  const onRowStatusChange = useCallback((task: MyTaskRes, next: TaskStatus) => {
    void statusChangeRef.current(task, next);
  }, []);
  const onRowLogTime = useCallback((task: MyTaskRes) => {
    setSelectedTask({ projectId: task.projectId, taskId: task.taskId, taskName: task.taskName });
  }, []);
  const onRowOpenExpenses = useCallback((task: MyTaskRes) => {
    setSelectedExpenseProject({ projectId: task.projectId, projectName: task.projectName });
  }, []);

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

  // Bấm "Tuần trước/Tuần sau" liên tục: chỉ nhận phản hồi của tuần đang xem, bỏ phản hồi đến trễ.
  const weekRequest = useLatestRequest();
  const loadWeek = useCallback(async () => {
    if (!canLogTime) return;
    const token = weekRequest.begin();
    setWeekLoading(true);
    setWeekError(null);
    try {
      const data = await getMyWeekTimeEntries(weekFrom, weekTo);
      if (!weekRequest.isLatest(token)) return;
      setSummaries(data);
    } catch (err) {
      if (!weekRequest.isLatest(token)) return;
      const message =
        err instanceof TimesheetsApiError || err instanceof Error ? err.message : 'Không thể tải bảng giờ công.';
      setWeekError(message);
    } finally {
      if (weekRequest.isLatest(token)) setWeekLoading(false);
    }
  }, [canLogTime, weekFrom, weekTo, weekRequest]);

  useEffect(() => {
    void loadWeek();
  }, [loadWeek]);

  const weekStats = useMemo(() => {
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
    return { grandTotal, hasDraft, draftCount, submitBanner, totalDraftHours };
  }, [summaries]);
  const { grandTotal, hasDraft, draftCount, submitBanner, totalDraftHours } = weekStats;

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

  const closeConfirm = useCallback(() => setConfirmSubmit(false), []);
  const confirmBackdrop = useBackdropClick(closeConfirm, submitting);
  const confirmCardRef = useDialogA11y(confirmSubmit, closeConfirm, submitting);

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

  const taskHeaders = canLogTime ? [...TASK_HEADERS_BASE, 'Giờ công', 'Chi phí'] : TASK_HEADERS_BASE;

  const submitWeekButton = hasDraft ? (
    <button
      type="button"
      className="btn btn-primary btn-sm"
      onClick={() => setConfirmSubmit(true)}
      disabled={submitting}
      data-testid="btn-submit-week"
    >
      {ICONS.checkCircle} {submitting ? 'Đang nộp…' : `Nộp bảng chấm công (${draftCount} dòng)`}
    </button>
  ) : null;

  return (
    <div className="user-management-page dl-page" data-testid="my-work-page">
      <div className="page-header dl-mb-16">
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
        <div className="dl-header-actions">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => {
              void loadTasks();
              void loadWeek();
            }}
            disabled={tasksLoading || weekLoading}
          >
            {ICONS.refresh} {tasksLoading || weekLoading ? 'Đang tải…' : 'Làm mới'}
          </button>
        </div>
      </div>

      {toast && (
        <div
          className={`alert-box alert-box--${toast.type === 'success' ? 'success' : 'danger'}`}
          role={toast.type === 'error' ? 'alert' : 'status'}
          aria-live="polite"
        >
          {toast.message}
        </div>
      )}

      {tasksError && (
        <LoadError
          message={tasksError}
          onRetry={() => void loadTasks()}
          retrying={tasksLoading}
          testId="my-tasks-error"
        />
      )}

      <section className="user-table-card dl-card-pad" aria-labelledby="my-tasks-heading">
        <div className="dl-section-head">
          <h2 id="my-tasks-heading" className="dl-section-title">
            Công việc đang được giao
          </h2>
          {!tasksLoading && tasks.length > 0 && <span className="dl-section-meta">{tasks.length} công việc</span>}
        </div>

        {tasksLoading && tasks.length === 0 ? (
          <SkeletonTable headers={taskHeaders} rows={3} testId="my-tasks-loading" label="Đang tải danh sách công việc…" />
        ) : tasks.length === 0 ? (
          tasksError ? null : (
            <EmptyBlock icon={ICONS.folder} title="Chưa được giao công việc nào" testId="my-tasks-empty">
              Khi Quản lý dự án phân công cho bạn, công việc sẽ xuất hiện ở đây. Bấm “Làm mới” nếu vừa được giao việc.
            </EmptyBlock>
          )
        ) : (
          <div className="table-responsive" aria-busy={tasksLoading || undefined}>
            <table className="user-data-table dl-stack-table" data-testid="my-tasks-table">
              <thead>
                <tr>
                  {taskHeaders.map((h) => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tasks.map((task) => (
                  <TaskRow
                    key={task.taskId}
                    task={task}
                    canLogTime={canLogTime}
                    updating={updatingTaskId === task.taskId}
                    onStatusChange={onRowStatusChange}
                    onLogTime={onRowLogTime}
                    onOpenExpenses={onRowOpenExpenses}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {canLogTime && (
        <>
          {weekError && (
            <LoadError
              message={weekError}
              onRetry={() => void loadWeek()}
              retrying={weekLoading}
              testId="my-timesheet-load-error"
            />
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
              <div className="week-nav__label" aria-live="polite">
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
                Tổng giờ tuần <strong className="dl-num" data-testid="grand-total-hours">{grandTotal}</strong>
              </span>
              {!isPhone && submitWeekButton}
            </div>
          </div>

          {submitBanner && (
            <div className={`status-pill status-pill--${submitBanner.tone} dl-week-banner`} data-testid="submit-week-banner">
              <span className="status-pill__dot" />
              {submitBanner.text}
            </div>
          )}

          <div className="user-table-card dl-card-pad">
            {weekLoading ? (
              <SkeletonTable
                headers={['Công việc', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN', 'Tổng']}
                rows={2}
                testId="my-timesheet-table-loading"
                label="Đang nạp bảng giờ công…"
              />
            ) : (
              // Mở lại một dòng giờ công cụ thể để sửa: dùng đúng nút "Ghi giờ công" ở bảng
              // công việc phía trên, không lặp lại một lối vào thứ hai cho cùng một việc.
              <WeeklyTimesheetGrid weekFrom={weekFrom} weekTo={weekTo} summaries={summaries} />
            )}
          </div>

          {/* Điện thoại: nút nộp tuần dính đáy màn hình, luôn trong tầm ngón cái. */}
          {isPhone && submitWeekButton && <div className="dl-sticky-cta">{submitWeekButton}</div>}
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
            aria-labelledby="my-work-submit-week-title"
            aria-describedby="my-work-submit-week-desc"
          >
            <div className="modal-card dl-modal dl-modal-sm" ref={confirmCardRef}>
              <div className="modal-header">
                <div className="modal-header__title-wrap">
                  <h3 className="modal-title" id="my-work-submit-week-title">
                    <span className="modal-title__icon">{ICONS.checkCircle}</span>
                    Nộp bảng chấm công tuần
                  </h3>
                </div>
                <button
                  type="button"
                  className="modal-close"
                  onClick={closeConfirm}
                  disabled={submitting}
                  aria-label="Đóng"
                >
                  {ICONS.close}
                </button>
              </div>
              <div className="modal-body">
                <p id="my-work-submit-week-desc">
                  Nộp bảng chấm công tuần {formatIsoDate(weekFrom)} → {formatIsoDate(weekTo)} với{' '}
                  <strong>{draftCount}</strong> dòng giờ công (tổng <strong>{totalDraftHours}</strong> giờ)?
                </p>
                <p className="field-hint">
                  Sau khi nộp, bạn sẽ không sửa hoặc xóa được các dòng giờ công của tuần này cho đến khi được duyệt.
                </p>
                <div className="dl-modal-actions dl-modal-actions--plain">
                  <button type="button" className="btn btn-secondary" onClick={closeConfirm} disabled={submitting}>
                    Hủy
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
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
