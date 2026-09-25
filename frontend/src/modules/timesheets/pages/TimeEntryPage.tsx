import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ICONS } from '../../../components/common/icons';
import type { ProjectRes } from '../../projects/types/projectTypes';
import { getProject, ProjectsApiError } from '../../projects/api/projectsApi';
import type { TimeEntryRes, TimeEntryStatus, TimesheetSummaryRes } from '../types/timesheetTypes';
import { deleteTimeEntry, getMyWeekTimeEntries, submitWeek, TimesheetsApiError } from '../api/timesheetsApi';
import TimeEntryForm from '../components/TimeEntryForm';
import ClosedProjectNotice from '../components/ClosedProjectNotice';
import TimerWidget from '../components/TimerWidget';
import { addDays, formatIsoDate, getMondayOf } from '../utils/weekRange';
import { useAutoDismiss, useIsPhone, useLatestRequest } from '../../projects/components/deliveryUi';
import { EmptyBlock, LoadError, SkeletonTable } from '../../projects/components/DeliveryStates';

export interface TimeEntryPageProps {
  projectId: number;
  taskId: number;
  taskName?: string;
  currentUserRoles?: string[];
  onBack?: () => void;
  initialProject?: ProjectRes;
}

const STATUS_LABEL: Record<TimeEntryStatus, string> = {
  DRAFT: 'Nháp',
  SUBMITTED: 'Đã nộp',
  APPROVED: 'Đã duyệt',
  REJECTED: 'Bị từ chối',
};

const STATUS_PILL_CLASS: Record<TimeEntryStatus, string> = {
  DRAFT: 'status-pill--inactive',
  SUBMITTED: 'status-pill--locked',
  APPROVED: 'status-pill--active',
  REJECTED: 'status-pill--locked',
};

const ENTRY_HEADERS = ['Ngày', 'Số giờ', 'Ghi chú', 'Tính phí', 'Trạng thái', ''];

function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString('vi-VN');
}

interface EntryRowProps {
  entry: TimeEntryRes;
  canLog: boolean;
  deleting: boolean;
  onEdit: (entry: TimeEntryRes) => void;
  onDelete: (entry: TimeEntryRes) => void;
}

/** Một dòng giờ công — memo để toast/mở form không vẽ lại cả bảng. Trên điện thoại xếp thành thẻ. */
const EntryRow = memo(function EntryRow({ entry, canLog, deleting, onEdit, onDelete }: EntryRowProps) {
  const isDraft = entry.status === 'DRAFT';
  return (
    <tr data-testid={`entry-row-${entry.id}`}>
      <td className="dl-stack-title dl-num dl-cell-strong" data-label="Ngày">
        {entry.workDate}
      </td>
      <td className="dl-num" data-label="Số giờ">
        {entry.hours}
      </td>
      <td data-label="Ghi chú">
        <span>
          {entry.note || '—'}
          <span className="dl-cell-sub">Tạo lúc {formatDateTime(entry.createdAt)}</span>
        </span>
      </td>
      <td data-label="Tính phí">{entry.billable ? 'Có' : 'Không'}</td>
      <td data-label="Trạng thái">
        <span className={`status-pill ${STATUS_PILL_CLASS[entry.status]}`} data-testid={`entry-status-${entry.id}`}>
          <i className="status-pill__dot" />
          {STATUS_LABEL[entry.status]}
        </span>
      </td>
      <td>
        {canLog && isDraft && (
          <div className="dl-row-actions">
            <button
              type="button"
              className="btn btn-secondary btn-xs"
              onClick={() => onEdit(entry)}
              aria-label={`Sửa giờ công ngày ${entry.workDate}`}
              data-testid={`btn-edit-entry-${entry.id}`}
            >
              Sửa
            </button>
            <button
              type="button"
              className="btn btn-danger btn-xs"
              onClick={() => onDelete(entry)}
              disabled={deleting}
              aria-label={`Xóa giờ công ngày ${entry.workDate}`}
              data-testid={`btn-delete-entry-${entry.id}`}
            >
              {deleting ? 'Đang xóa…' : 'Xóa'}
            </button>
          </div>
        )}
      </td>
    </tr>
  );
});

export default function TimeEntryPage({
  projectId,
  taskId,
  taskName,
  currentUserRoles = ['VT-03'],
  onBack,
  initialProject,
}: TimeEntryPageProps) {
  // Toàn bộ endpoint ghi giờ công chỉ dành cho Nhân viên chuyên môn (VT-03) (NCL-06-CN-001).
  const canView = currentUserRoles.includes('VT-03');
  const isPhone = useIsPhone();

  const [weekFrom, setWeekFrom] = useState<string>(() => getMondayOf());
  const weekTo = addDays(weekFrom, 6);
  const isCurrentWeek = weekFrom === getMondayOf();

  const [project, setProject] = useState<ProjectRes | null>(initialProject ?? null);
  const [summary, setSummary] = useState<TimesheetSummaryRes | null>(null);
  // Toàn bộ công việc trong tuần (không chỉ công việc đang xem) — cần để biết có bao nhiêu dòng
  // Nháp trên cả tuần khi nộp bảng chấm công ngay tại đây, vì "Nộp bảng chấm công" luôn nộp
  // nguyên tuần của nhân sự (mọi dự án/công việc), không chỉ riêng công việc đang xem.
  const [weekSummaries, setWeekSummaries] = useState<TimesheetSummaryRes[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TimeEntryRes | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const isProjectOpen = project?.status === 'RUNNING';
  const canLog = canView && isProjectOpen;

  const clearToast = useCallback(() => setToast(null), []);
  useAutoDismiss(toast, clearToast, 4000);
  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
  }, []);

  // Bấm "Tuần trước/Tuần sau" liên tục: chỉ nhận phản hồi của lần tải mới nhất.
  const request = useLatestRequest();
  const loadData = useCallback(async () => {
    if (!canView) return;
    const token = request.begin();
    setLoading(true);
    setError(null);
    try {
      const [projData, weekData] = await Promise.all([
        initialProject ? Promise.resolve(initialProject) : getProject(projectId),
        getMyWeekTimeEntries(weekFrom, weekTo),
      ]);
      if (!request.isLatest(token)) return;
      setProject(projData);
      setSummary(weekData.find((item) => item.taskId === taskId) ?? null);
      setWeekSummaries(weekData);
    } catch (err: unknown) {
      if (!request.isLatest(token)) return;
      const msg =
        err instanceof ProjectsApiError || err instanceof TimesheetsApiError || err instanceof Error
          ? err.message
          : 'Không thể tải dữ liệu giờ công.';
      setError(msg);
    } finally {
      if (request.isLatest(token)) setLoading(false);
    }
  }, [projectId, taskId, weekFrom, weekTo, canView, initialProject, request]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const entries = useMemo(() => summary?.entries ?? [], [summary]);

  // Tổng giờ đã ghi theo từng ngày, gộp TẤT CẢ công việc trong tuần — dùng để cảnh báo trước
  // khi chọn ngày, vì trần "không quá 12 giờ/ngày" tính trên toàn bộ công việc, không chỉ riêng
  // công việc đang xem (khác với việc phát hiện trùng ngày, chỉ xét trong cùng công việc).
  const dailyHoursMap = useMemo(
    () =>
      weekSummaries
        .flatMap((s) => s.entries)
        .filter((e) => e.status !== 'REJECTED')
        .reduce<Record<string, number>>((acc, e) => {
          acc[e.workDate] = (acc[e.workDate] ?? 0) + e.hours;
          return acc;
        }, {}),
    [weekSummaries]
  );

  const { draftCountInWeek, draftHoursInWeek } = useMemo(() => {
    const draftEntriesInWeek = weekSummaries.flatMap((s) => s.entries.filter((e) => e.status === 'DRAFT'));
    return {
      draftCountInWeek: draftEntriesInWeek.length,
      draftHoursInWeek: draftEntriesInWeek.reduce((sum, e) => sum + e.hours, 0),
    };
  }, [weekSummaries]);

  const handleSubmitWeek = async () => {
    if (draftCountInWeek === 0 || submitting) return;
    const confirmed = window.confirm(
      `Nộp bảng chấm công tuần ${formatIsoDate(weekFrom)} → ${formatIsoDate(weekTo)} với ${draftCountInWeek} `
        + `dòng giờ công (tổng ${draftHoursInWeek} giờ) — gồm cả các công việc khác trong tuần?\n\n`
        + 'Sau khi nộp, bạn sẽ không sửa hoặc xóa được các dòng giờ công của tuần này cho đến khi được duyệt.'
    );
    if (!confirmed) return;

    setSubmitting(true);
    try {
      const result = await submitWeek(weekFrom);
      showToast(`Đã nộp bảng chấm công tuần thành công — tổng ${result.totalHours} giờ, đang chờ duyệt.`, 'success');
      void loadData();
    } catch (err: unknown) {
      const msg = err instanceof TimesheetsApiError || err instanceof Error
        ? err.message
        : 'Không thể nộp bảng chấm công tuần. Vui lòng thử lại.';
      showToast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const openCreateForm = () => {
    setEditingEntry(null);
    setIsFormOpen(true);
  };

  const openEditForm = useCallback((entry: TimeEntryRes) => {
    setEditingEntry(entry);
    setIsFormOpen(true);
  }, []);

  const handleDelete = async (entry: TimeEntryRes) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa bản ghi giờ công ngày ${entry.workDate} không?`)) {
      return;
    }
    setDeletingId(entry.id);
    try {
      await deleteTimeEntry(projectId, taskId, entry.id);
      showToast('Đã xóa bản ghi giờ công thành công');
      void loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể xóa bản ghi giờ công.';
      showToast(msg, 'error');
    } finally {
      setDeletingId(null);
    }
  };
  // Callback ổn định cho các hàng đã memo — luôn gọi handler mới nhất.
  const deleteRef = useRef(handleDelete);
  deleteRef.current = handleDelete;
  const onRowDelete = useCallback((entry: TimeEntryRes) => {
    void deleteRef.current(entry);
  }, []);
  const closeForm = useCallback(() => setIsFormOpen(false), []);

  if (!canView) {
    return (
      <div className="user-management-page dl-page" data-testid="time-entry-forbidden">
        <div className="alert-box alert-box--danger" role="alert">
          Bạn không có quyền ghi giờ công (yêu cầu vai trò Nhân viên chuyên môn VT-03).
        </div>
        {onBack && (
          <button type="button" className="btn btn-secondary dl-mt-16" onClick={onBack}>
            {ICONS.arrowLeft} Quay lại
          </button>
        )}
      </div>
    );
  }

  const submitWeekButton =
    canView && draftCountInWeek > 0 ? (
      <button
        type="button"
        className={`btn ${canLog ? 'btn-secondary' : 'btn-primary'} btn-sm`}
        onClick={handleSubmitWeek}
        disabled={submitting}
        data-testid="btn-submit-week-from-task"
        title="Nộp toàn bộ giờ công Nháp của tuần này (mọi công việc), không chỉ riêng công việc đang xem"
      >
        {ICONS.checkCircle} {submitting ? 'Đang nộp…' : `Nộp bảng chấm công (${draftCountInWeek} dòng)`}
      </button>
    ) : null;

  const addEntryButton = canLog ? (
    <button type="button" className="btn btn-primary btn-sm" onClick={openCreateForm} data-testid="btn-add-time-entry">
      + Ghi giờ công
    </button>
  ) : null;

  return (
    <div className="user-management-page dl-page" data-testid="time-entry-page">
      {toast && (
        <div
          className={`alert-box alert-box--${toast.type === 'success' ? 'success' : 'danger'}`}
          role={toast.type === 'error' ? 'alert' : 'status'}
          aria-live="polite"
          data-testid="time-entry-toast"
        >
          {toast.message}
        </div>
      )}

      <div className="task-page-header">
        {onBack && (
          <div className="task-page-header__top">
            <button
              type="button"
              className="btn btn-secondary btn-sm btn-back"
              onClick={onBack}
              data-testid="btn-back-time-entry"
            >
              {ICONS.arrowLeft} Quay lại
            </button>
          </div>
        )}

        <div className="task-page-header__main">
          <div>
            <h1 className="page-title task-title dl-task-title">
              {taskName || summary?.taskName || `Công việc #${taskId}`}
            </h1>
            <p className="page-subtitle dl-task-subtitle">
              {ICONS.clock}
              <span>
                Ghi giờ công · {project?.name || `Dự án #${projectId}`} ·{' '}
                <span className="dl-cell-code">{project?.projectCode || `#${projectId}`}</span>
              </span>
            </p>
          </div>

          <div className="page-header__actions dl-header-actions">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={loadData}
              disabled={loading}
              data-testid="btn-reload-time-entries"
            >
              {ICONS.refresh} {loading ? 'Đang tải…' : 'Tải lại'}
            </button>
            {!isPhone && submitWeekButton}
            {!isPhone && addEntryButton}
          </div>
        </div>
      </div>

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
            <span className="week-nav__range" data-testid="week-range-label">
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

        {summary && (
          <div className="week-nav__summary" data-testid="time-entry-budget-summary">
            <span className="week-nav__total">
              Tổng giờ tuần <strong className="dl-num">{summary.totalHours}</strong>
            </span>
            {summary.budgetHours != null && (
              <span className={`badge ${summary.overBudgetWarning ? 'badge--pink' : 'badge--green'}`} data-testid="time-entry-usage-badge">
                {(( summary.usageRatio ?? 0) * 100).toFixed(0)}% ngân sách ({summary.budgetHours} giờ)
                {summary.overBudgetWarning ? ' — gần/đã vượt!' : ''}
              </span>
            )}
          </div>
        )}
      </div>

      {project && !isProjectOpen && <ClosedProjectNotice project={project} />}

      {error && <LoadError message={error} onRetry={() => void loadData()} retrying={loading} testId="time-entry-load-error" />}

      {!loading && (
        <TimerWidget
          projectId={projectId}
          taskId={taskId}
          canStart={canLog}
          onStopped={(createdEntry) => {
            showToast(`Đã dừng đồng hồ — tạo bản ghi giờ công ${createdEntry.hours} giờ thành công.`);
            void loadData();
          }}
          onError={(message) => showToast(message, 'error')}
        />
      )}

      <section className="user-table-card dl-card-pad" aria-labelledby="time-entry-list-heading">
        <div className="dl-section-head">
          <h2 id="time-entry-list-heading" className="dl-section-title">
            Bản ghi giờ công trong tuần
          </h2>
          <span className="dl-section-meta">{entries.length} bản ghi</span>
        </div>

        {loading ? (
          <SkeletonTable
            headers={ENTRY_HEADERS}
            rows={3}
            testId="time-entry-table-loading"
            label="Đang nạp bản ghi giờ công…"
          />
        ) : entries.length === 0 ? (
          <EmptyBlock
            icon={ICONS.clock}
            title="Chưa có bản ghi giờ công nào trong tuần này"
            testId="time-entry-empty"
          >
            {canLog
              ? 'Hãy bấm nút "+ Ghi giờ công" ở trên để bắt đầu ghi nhận giờ làm việc cho công việc này.'
              : 'Không có dữ liệu để hiển thị.'}
          </EmptyBlock>
        ) : (
          <div className="table-responsive">
            <table className="user-data-table dl-stack-table dl-entry-table">
              <thead>
                <tr>
                  <th className="dl-col-date">Ngày</th>
                  <th className="dl-col-hours">Số giờ</th>
                  <th>Ghi chú</th>
                  <th className="dl-col-billable">Tính phí</th>
                  <th className="dl-col-status">Trạng thái</th>
                  <th className="dl-col-actions">
                    <span className="dl-sr-only">Thao tác</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <EntryRow
                    key={entry.id}
                    entry={entry}
                    canLog={canLog}
                    deleting={deletingId === entry.id}
                    onEdit={openEditForm}
                    onDelete={onRowDelete}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Điện thoại: hành động chính dính đáy màn hình, luôn trong tầm ngón cái. */}
      {isPhone && (submitWeekButton || addEntryButton) && (
        <div className="dl-sticky-cta">
          {submitWeekButton}
          {addEntryButton}
        </div>
      )}

      <TimeEntryForm
        isOpen={isFormOpen}
        onClose={closeForm}
        projectId={projectId}
        taskId={taskId}
        taskName={taskName || summary?.taskName || undefined}
        entry={editingEntry}
        existingEntries={entries}
        dailyHoursMap={dailyHoursMap}
        weekFrom={weekFrom}
        weekTo={weekTo}
        onSaved={() => {
          showToast(editingEntry ? 'Đã cập nhật giờ công thành công' : 'Đã ghi giờ công thành công');
          void loadData();
        }}
      />
    </div>
  );
}
