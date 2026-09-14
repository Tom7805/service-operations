import { useCallback, useEffect, useState } from 'react';
import { ICONS } from '../../../components/common/icons';
import type { TimeEntryTaskRes, TimesheetSummaryRes } from '../types/timesheetTypes';
import { getMyRunningTasks, getMyWeekTimeEntries, TimesheetsApiError } from '../api/timesheetsApi';
import WeeklyTimesheetGrid from '../components/WeeklyTimesheetGrid';
import TimeEntryPage from './TimeEntryPage';
import { addDays, formatIsoDate, getMondayOf } from '../utils/weekRange';

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
        <h3 style={{ margin: '0 0 12px', fontSize: '16px', fontWeight: 700, color: '#1E293B' }}>
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
            <h4 style={{ margin: '0 0 6px', fontSize: '15px', color: '#1E293B' }}>
              Chưa được giao công việc nào trong dự án đang chạy
            </h4>
            <p style={{ margin: 0, color: '#64748B', fontSize: '13.5px' }}>
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

        <span style={{ fontSize: '13.5px' }}>
          Tổng giờ tuần: <strong data-testid="grand-total-hours">{grandTotal}</strong>
        </span>
      </div>

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
