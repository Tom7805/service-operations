import { useCallback, useEffect, useState } from 'react';
import { ICONS } from '../../../components/common/icons';
import type { TimeEntryTaskRes, TimesheetSummaryRes } from '../types/timesheetTypes';
import { getMyRunningTasks, getMyWeekTimeEntries, submitWeek, TimesheetsApiError } from '../api/timesheetsApi';
import WeeklyTimesheetGrid from '../components/WeeklyTimesheetGrid';
import TimeEntryPage from './TimeEntryPage';
import { addDays, formatIsoDate, getMondayOf } from '../utils/weekRange';
import { canSubmitWeek, countDraftEntries } from '../validators/timesheetValidators';

export interface MyTimesheetPageProps {
  currentUserRoles?: string[];
  currentUserName?: string;
}

interface SelectedTask {
  projectId: number;
  taskId: number;
  taskName: string;
}

/**
 * Màn "Giờ công của tôi" — điểm vào tự thân cho NCL-06-CN-001: liệt kê công việc đang được
 * giao (nguồn `GET /me/time-entry-tasks`) để chọn ghi giờ mới, xem lưới giờ công tuần, và
 * mở đúng công việc (biết `projectId` từ chính danh sách trên) để xem/sửa/xoá qua
 * `TimeEntryPage` — không cần điều hướng toàn cục bên ngoài truyền `projectId` vào.
 */
export default function MyTimesheetPage({ currentUserRoles = ['VT-03'] }: MyTimesheetPageProps) {
  // Toàn bộ endpoint chỉ dành cho Nhân viên chuyên môn (VT-03) (NCL-06-CN-001).
  const canView = currentUserRoles.includes('VT-03');

  const [weekFrom, setWeekFrom] = useState<string>(() => getMondayOf());
  const weekTo = addDays(weekFrom, 6);

  const [tasks, setTasks] = useState<TimeEntryTaskRes[]>([]);
  const [summaries, setSummaries] = useState<TimesheetSummaryRes[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<SelectedTask | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 5000);
  };

  const loadData = useCallback(async () => {
    if (!canView) return;
    setLoading(true);
    setError(null);
    try {
      const [tasksData, weekData] = await Promise.all([
        getMyRunningTasks(),
        getMyWeekTimeEntries(weekFrom, weekTo),
      ]);
      setTasks(tasksData);
      setSummaries(weekData);
    } catch (err: unknown) {
      const msg =
        err instanceof TimesheetsApiError || err instanceof Error ? err.message : 'Không thể tải bảng giờ công.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [weekFrom, weekTo, canView]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const grandTotal = summaries.reduce((sum, s) => sum + (s.totalHours ?? 0), 0);

  // Với các công việc CÒN được giao & dự án còn RUNNING, ta biết được projectId (từ danh
  // sách `tasks`) nên có thể mở thẳng TimeEntryPage cho dòng đó trong lưới tuần. Công việc đã
  // bị thu hồi/đóng dự án sau khi ghi (hiếm) vẫn hiển thị trong lưới nhưng không mở được nữa.
  const projectIdByTaskId = new Map(tasks.map((t) => [t.taskId, t.projectId]));

  // NCL-06-CN-002: chỉ bật nút "Nộp bảng" khi tuần có ít nhất một dòng DRAFT — trạng thái
  // khác (đã nộp/đã duyệt) thì ẩn nút để tránh gọi rồi mới nhận lỗi (theo tài liệu API).
  const allEntries = summaries.flatMap((s) => s.entries);
  const hasDraft = canSubmitWeek(summaries);
  const draftCount = countDraftEntries(summaries);
  const submitBanner = (() => {
    if (allEntries.length === 0 || hasDraft) return null;
    const hasApproved = allEntries.some((e) => e.status === 'APPROVED');
    const hasSubmitted = allEntries.some((e) => e.status === 'SUBMITTED');
    if (hasApproved) return { tone: 'approved', text: 'Bảng chấm công tuần này đã được Quản lý dự án duyệt.' };
    if (hasSubmitted) {
      return { tone: 'submitted', text: 'Đã nộp bảng chấm công tuần này — đang chờ Quản lý dự án duyệt.' };
    }
    return { tone: 'rejected', text: 'Bảng chấm công tuần này bị từ chối. Hãy chỉnh sửa giờ công rồi nộp lại.' };
  })();

  const handleSubmitWeek = async () => {
    if (!hasDraft || submitting) return;
    const totalDraftHours = summaries.reduce(
      (sum, s) => sum + s.entries.filter((e) => e.status === 'DRAFT').reduce((h, e) => h + e.hours, 0),
      0
    );
    const confirmed = window.confirm(
      `Nộp bảng chấm công tuần ${formatIsoDate(weekFrom)} → ${formatIsoDate(weekTo)} với ${draftCount} `
        + `dòng giờ công (tổng ${totalDraftHours} giờ)?\n\n`
        + 'Sau khi nộp, bạn sẽ không sửa hoặc xóa được các dòng giờ công của tuần này cho đến khi được duyệt.'
    );
    if (!confirmed) return;

    setSubmitting(true);
    try {
      const result = await submitWeek(weekFrom);
      showToast(`Đã nộp bảng chấm công tuần thành công — tổng ${result.totalHours} giờ, đang chờ duyệt.`, 'success');
      await loadData();
    } catch (err: unknown) {
      const msg =
        err instanceof TimesheetsApiError || err instanceof Error
          ? err.message
          : 'Không thể nộp bảng chấm công tuần. Vui lòng thử lại.';
      showToast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (!canView) {
    return (
      <div className="user-management-page" data-testid="my-timesheet-forbidden">
        <div className="alert-box alert-box--danger" role="alert">
          Bạn không có quyền xem bảng giờ công (yêu cầu vai trò Nhân viên chuyên môn VT-03).
        </div>
      </div>
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
          void loadData();
        }}
      />
    );
  }

  return (
    <div className="user-management-page" data-testid="my-timesheet-page">
      {toast && (
        <div className={`toast-banner toast-banner--${toast.type}`} role="status" data-testid="submit-week-toast">
          <span className="toast-banner__icon">{toast.type === 'success' ? ICONS.checkCircle : ICONS.alertTriangle}</span>
          <span>{toast.text}</span>
          <button type="button" className="toast-banner__close" aria-label="Đóng thông báo" onClick={() => setToast(null)}>
            {ICONS.close}
          </button>
        </div>
      )}

      <div className="page-header" style={{ marginBottom: '16px' }}>
        <div>
          <div className="page-header__kicker">
            <span className="page-header__tag">{ICONS.clock} GIỜ CÔNG CỦA TÔI</span>
            <span className="page-header__dot" />
            <span className="page-header__meta">BẢNG GIỜ CÔNG TUẦN</span>
          </div>
          <h1 className="page-title" style={{ margin: '4px 0' }}>Giờ công của tôi</h1>
          <p className="page-subtitle">
            Chọn một công việc đang được giao để ghi giờ mới, hoặc xem lại giờ công đã ghi trong tuần bên dưới.
          </p>
        </div>

        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={loadData}
          disabled={loading}
          data-testid="btn-reload-my-timesheet"
        >
          {ICONS.refresh} Tải lại
        </button>
      </div>

      {error && (
        <div className="alert-box alert-box--danger" role="alert" data-testid="my-timesheet-load-error" style={{ marginBottom: '16px' }}>
          {error}
        </div>
      )}

      <div className="user-table-card" style={{ padding: '20px', marginBottom: '16px' }}>
        <h3 style={{ margin: '0 0 12px', fontSize: '16px', fontWeight: 700, color: 'var(--ink-strong)' }}>
          Công việc đang được giao
        </h3>

        {loading ? (
          <div className="table-loading-state" data-testid="my-tasks-loading">
            <span className="spinner-lg" />
            <p style={{ marginTop: '10px' }}>Đang nạp danh sách công việc...</p>
          </div>
        ) : tasks.length === 0 ? (
          <div className="table-empty-state" data-testid="my-tasks-empty">
            <div className="table-empty-state__icon">{ICONS.clock}</div>
            <h4 style={{ margin: '0 0 6px', fontSize: '15px', color: 'var(--ink-strong)' }}>
              Chưa được giao công việc nào trong dự án đang chạy
            </h4>
            <p style={{ margin: 0, color: 'var(--ink-muted)', fontSize: '13.5px' }}>
              Liên hệ Quản lý dự án để được giao công việc trước khi ghi giờ công.
            </p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="user-data-table">
              <thead>
                <tr>
                  <th>Dự án</th>
                  <th>Công việc</th>
                  <th style={{ width: '130px' }}></th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((t) => (
                  <tr key={t.taskId} data-testid={`my-task-row-${t.taskId}`}>
                    <td>{t.projectName}</td>
                    <td>{t.taskName}</td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-primary btn-xs"
                        onClick={() =>
                          setSelectedTask({ projectId: t.projectId, taskId: t.taskId, taskName: t.taskName })
                        }
                        data-testid={`btn-log-time-${t.taskId}`}
                      >
                        {ICONS.clock} Ghi giờ công
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="user-table-card" style={{ padding: '16px 20px', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            className="btn btn-secondary btn-xs"
            onClick={() => setWeekFrom((prev) => addDays(prev, -7))}
            data-testid="btn-week-prev"
          >
            ← Tuần trước
          </button>
          <span data-testid="my-timesheet-week-label" style={{ fontWeight: 600, fontSize: '13.5px' }}>
            Tuần {formatIsoDate(weekFrom)} → {formatIsoDate(weekTo)}
          </span>
          <button
            type="button"
            className="btn btn-secondary btn-xs"
            onClick={() => setWeekFrom((prev) => addDays(prev, 7))}
            data-testid="btn-week-next"
          >
            Tuần sau →
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-xs"
            onClick={() => setWeekFrom(getMondayOf())}
            data-testid="btn-week-current"
          >
            Tuần này
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '13.5px' }}>
            Tổng giờ tuần: <strong data-testid="grand-total-hours">{grandTotal}</strong>
          </span>
          {hasDraft && (
            <button
              type="button"
              className="btn-primary"
              onClick={handleSubmitWeek}
              disabled={submitting}
              data-testid="btn-submit-week"
            >
              {ICONS.checkCircle} {submitting ? 'Đang nộp…' : `Nộp bảng chấm công (${draftCount} dòng)`}
            </button>
          )}
        </div>
      </div>

      {submitBanner && (
        <div
          className={`status-pill status-pill--${submitBanner.tone}`}
          style={{ marginBottom: '16px' }}
          data-testid="submit-week-banner"
        >
          <span className="status-pill__dot" />
          {submitBanner.text}
        </div>
      )}

      <div className="user-table-card" style={{ padding: '20px' }}>
        {loading ? (
          <div className="table-loading-state" data-testid="my-timesheet-table-loading">
            <span className="spinner-lg" />
            <p style={{ marginTop: '10px' }}>Đang nạp bảng giờ công...</p>
          </div>
        ) : (
          <>
            <WeeklyTimesheetGrid weekFrom={weekFrom} weekTo={weekTo} summaries={summaries} />
            {summaries.length > 0 && (
              <div style={{ marginTop: '14px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {summaries.map((s) => {
                  const projectId = projectIdByTaskId.get(s.taskId);
                  if (projectId == null) return null;
                  return (
                    <button
                      key={s.taskId}
                      type="button"
                      className="btn btn-secondary btn-xs"
                      onClick={() =>
                        setSelectedTask({ projectId, taskId: s.taskId, taskName: s.taskName ?? `#${s.taskId}` })
                      }
                      data-testid={`btn-open-task-${s.taskId}`}
                    >
                      Xem/sửa "{s.taskName || `#${s.taskId}`}"
                    </button>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
