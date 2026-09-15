import { useCallback, useEffect, useState } from 'react';
import { ICONS } from '../../../components/common/icons';
import type { ProjectRes } from '../../projects/types/projectTypes';
import { getProject, ProjectsApiError } from '../../projects/api/projectsApi';
import type { TimeEntryRes, TimeEntryStatus, TimesheetSummaryRes } from '../types/timesheetTypes';
import { deleteTimeEntry, getMyWeekTimeEntries, TimesheetsApiError } from '../api/timesheetsApi';
import TimeEntryForm from '../components/TimeEntryForm';
import ClosedProjectNotice from '../components/ClosedProjectNotice';
import { addDays, formatIsoDate, getMondayOf } from '../utils/weekRange';

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

function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString('vi-VN');
}

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

  const [weekFrom, setWeekFrom] = useState<string>(() => getMondayOf());
  const weekTo = addDays(weekFrom, 6);

  const [project, setProject] = useState<ProjectRes | null>(initialProject ?? null);
  const [summary, setSummary] = useState<TimesheetSummaryRes | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TimeEntryRes | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const isProjectOpen = project?.status === 'RUNNING';
  const canLog = canView && isProjectOpen;

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const loadData = useCallback(async () => {
    if (!canView) return;
    setLoading(true);
    setError(null);
    try {
      const [projData, weekData] = await Promise.all([
        initialProject ? Promise.resolve(initialProject) : getProject(projectId),
        getMyWeekTimeEntries(weekFrom, weekTo),
      ]);
      setProject(projData);
      setSummary(weekData.find((item) => item.taskId === taskId) ?? null);
    } catch (err: unknown) {
      const msg =
        err instanceof ProjectsApiError || err instanceof TimesheetsApiError || err instanceof Error
          ? err.message
          : 'Không thể tải dữ liệu giờ công.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [projectId, taskId, weekFrom, weekTo, canView, initialProject]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const entries = summary?.entries ?? [];

  const openCreateForm = () => {
    setEditingEntry(null);
    setIsFormOpen(true);
  };

  const openEditForm = (entry: TimeEntryRes) => {
    setEditingEntry(entry);
    setIsFormOpen(true);
  };

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

  if (!canView) {
    return (
      <div className="user-management-page" data-testid="time-entry-forbidden">
        <div className="alert-box alert-box--danger" role="alert">
          Bạn không có quyền ghi giờ công (yêu cầu vai trò Nhân viên chuyên môn VT-03).
        </div>
        {onBack && (
          <button type="button" className="btn btn-secondary" onClick={onBack} style={{ marginTop: '16px' }}>
            {ICONS.arrowLeft} Quay lại
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="user-management-page" data-testid="time-entry-page">
      {toast && (
        <div
          className={`alert-box alert-box--${toast.type === 'success' ? 'success' : 'danger'}`}
          role="alert"
          style={{ marginBottom: '16px' }}
          data-testid="time-entry-toast"
        >
          {toast.message}
        </div>
      )}

      <div className="page-header" style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {onBack && (
            <button
              type="button"
              className="btn btn-secondary btn-sm btn-back"
              onClick={onBack}
              data-testid="btn-back-time-entry"
            >
              {ICONS.arrowLeft} Quay lại
            </button>
          )}
          <div>
            <div className="page-header__kicker">
              <span className="page-header__tag">{ICONS.clock} GIỜ CÔNG</span>
              <span className="page-header__dot" />
              <span className="page-header__meta">{project?.projectCode || `Dự án #${projectId}`}</span>
            </div>
            <h1 className="page-title" style={{ margin: '4px 0' }}>
              {taskName || summary?.taskName || `Công việc #${taskId}`}
            </h1>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={loadData}
            disabled={loading}
            data-testid="btn-reload-time-entries"
          >
            {ICONS.refresh} Tải lại
          </button>
          {canLog && (
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={openCreateForm}
              data-testid="btn-add-time-entry"
            >
              + Ghi giờ công
            </button>
          )}
        </div>
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
          <span data-testid="week-range-label" style={{ fontWeight: 600, fontSize: '13.5px' }}>
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

        {summary && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13.5px' }} data-testid="time-entry-budget-summary">
            <span>
              Tổng giờ tuần: <strong>{summary.totalHours}</strong>
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

      {loading && (
        <div className="alert-box" role="status" style={{ marginBottom: '16px' }} data-testid="time-entry-loading">
          Đang tải dữ liệu giờ công…
        </div>
      )}

      {project && !isProjectOpen && <ClosedProjectNotice project={project} />}

      {error && (
        <div className="alert-box alert-box--danger" role="alert" data-testid="time-entry-load-error" style={{ marginBottom: '16px' }}>
          {error}
        </div>
      )}

      <div className="user-table-card" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#1E293B' }}>Bản ghi giờ công trong tuần</h3>
          <span className="field-hint" style={{ fontSize: '13px' }}>{entries.length} bản ghi</span>
        </div>

        {loading ? (
          <div className="table-loading-state" data-testid="time-entry-table-loading">
            <span className="spinner-lg" />
            <p style={{ marginTop: '10px' }}>Đang nạp bản ghi giờ công...</p>
          </div>
        ) : entries.length === 0 ? (
          <div className="table-empty-state" data-testid="time-entry-empty">
            <div className="table-empty-state__icon">{ICONS.clock}</div>
            <h4 style={{ margin: '0 0 6px', fontSize: '15px', color: '#1E293B' }}>Chưa có bản ghi giờ công nào trong tuần này</h4>
            <p style={{ margin: 0, color: '#64748B', fontSize: '13.5px' }}>
              {canLog
                ? 'Hãy bấm nút "+ Ghi giờ công" ở trên để bắt đầu ghi nhận giờ làm việc cho công việc này.'
                : 'Không có dữ liệu để hiển thị.'}
            </p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="user-data-table">
              <thead>
                <tr>
                  <th style={{ width: '110px' }}>Ngày</th>
                  <th style={{ width: '90px' }}>Số giờ</th>
                  <th>Ghi chú</th>
                  <th style={{ width: '100px' }}>Tính phí</th>
                  <th style={{ width: '120px' }}>Trạng thái</th>
                  <th style={{ width: '150px' }}></th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => {
                  const isDraft = entry.status === 'DRAFT';
                  return (
                    <tr key={entry.id} data-testid={`entry-row-${entry.id}`}>
                      <td>{entry.workDate}</td>
                      <td>{entry.hours}</td>
                      <td>
                        {entry.note || '—'}
                        <div className="field-hint" style={{ marginTop: '2px', fontSize: '11.5px' }}>
                          Tạo lúc {formatDateTime(entry.createdAt)}
                        </div>
                      </td>
                      <td>{entry.billable ? 'Có' : 'Không'}</td>
                      <td>
                        <span className={`status-pill ${STATUS_PILL_CLASS[entry.status]}`} data-testid={`entry-status-${entry.id}`}>
                          <i className="status-pill__dot" />
                          {STATUS_LABEL[entry.status]}
                        </span>
                      </td>
                      <td>
                        {canLog && isDraft && (
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                            <button
                              type="button"
                              className="btn btn-secondary btn-xs"
                              onClick={() => openEditForm(entry)}
                              data-testid={`btn-edit-entry-${entry.id}`}
                            >
                              Sửa
                            </button>
                            <button
                              type="button"
                              className="btn btn-danger btn-xs"
                              onClick={() => void handleDelete(entry)}
                              disabled={deletingId === entry.id}
                              data-testid={`btn-delete-entry-${entry.id}`}
                            >
                              Xóa
                            </button>
                          </div>
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

      <TimeEntryForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        projectId={projectId}
        taskId={taskId}
        taskName={taskName || summary?.taskName || undefined}
        entry={editingEntry}
        existingEntries={entries}
        onSaved={() => {
          showToast(editingEntry ? 'Đã cập nhật giờ công thành công' : 'Đã ghi giờ công thành công');
          void loadData();
        }}
      />
    </div>
  );
}
