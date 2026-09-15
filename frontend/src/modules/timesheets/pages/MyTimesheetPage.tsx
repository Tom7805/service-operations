import { useCallback, useEffect, useMemo, useState } from 'react';
import { getMyWeek, submitWeek, TimesheetApiError } from '../api/timesheetsApi';
import WeeklyTimesheetGrid from '../components/WeeklyTimesheetGrid';
import type { TimesheetSummary } from '../types/timesheetTypes';
import { canSubmitWeek, countDraftEntries, isWeekEmpty } from '../validators/timesheetValidators';
import { formatWeekRangeLabel, isCurrentWeek, shiftWeek, weekRangeOf } from '../utils/weekRange';
import { ICONS } from '../../../components/common/icons';
import { roleLabels } from '../../../utils/roleLabel';

interface MyTimesheetPageProps {
  currentUserRoles?: string[];
  currentUserName?: string;
}

type WeekBanner = {
  tone: 'submitted' | 'approved' | 'rejected';
  text: string;
} | null;

export default function MyTimesheetPage({
  currentUserRoles = [],
  currentUserName = 'Nhân viên',
}: MyTimesheetPageProps) {
  // NCL-06-CN-002 TC-04: chỉ Nhân viên chuyên môn (VT-03) được nộp bảng chấm công của chính mình.
  const isAllowed = currentUserRoles.includes('VT-03');

  const [anchorDate, setAnchorDate] = useState<Date>(() => new Date());
  const week = useMemo(() => weekRangeOf(anchorDate), [anchorDate]);

  const [summaries, setSummaries] = useState<TimesheetSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 5000);
  };

  const fetchWeek = useCallback(async () => {
    if (!isAllowed) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getMyWeek(week.weekFrom, week.weekTo);
      setSummaries(data);
    } catch (err) {
      const message =
        err instanceof TimesheetApiError ? err.message : 'Không thể tải lưới giờ công của tuần này.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [isAllowed, week.weekFrom, week.weekTo]);

  useEffect(() => {
    fetchWeek();
  }, [fetchWeek]);

  if (!isAllowed) {
    return (
      <div className="access-denied-container">
        <div className="access-denied-card">
          <div className="access-denied-icon">{ICONS.shieldOff}</div>
          <h2>Bạn không có thẩm quyền truy cập màn hình này</h2>
          <p>
            Chức năng Chấm công của tôi chỉ dành riêng cho vai trò <strong>Nhân viên chuyên môn</strong>.
            Hệ thống đã ghi lại lần truy cập bị từ chối này vào nhật ký bảo mật.
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

  const allEntries = summaries.flatMap((s) => s.entries);
  const hasDraft = canSubmitWeek(summaries);
  const draftCount = countDraftEntries(summaries);
  const weekIsEmpty = isWeekEmpty(summaries);
  const totalHours = summaries.reduce((sum, s) => sum + s.totalHours, 0);

  const banner: WeekBanner = (() => {
    if (allEntries.length === 0 || hasDraft) return null;
    const hasApproved = allEntries.some((e) => e.status === 'APPROVED');
    const hasSubmitted = allEntries.some((e) => e.status === 'SUBMITTED');
    if (hasApproved) return { tone: 'approved', text: 'Bảng chấm công tuần này đã được Quản lý dự án duyệt.' };
    if (hasSubmitted) {
      return { tone: 'submitted', text: 'Đã nộp bảng chấm công tuần này — đang chờ Quản lý dự án duyệt.' };
    }
    return { tone: 'rejected', text: 'Bảng chấm công tuần này bị từ chối. Hãy chỉnh sửa giờ công rồi nộp lại.' };
  })();

  const handleSubmit = async () => {
    if (!hasDraft || submitting) return;
    const confirmed = window.confirm(
      `Nộp bảng chấm công tuần ${formatWeekRangeLabel(week.weekFrom, week.weekTo)} với ${draftCount} `
        + `dòng giờ công (tổng ${totalHours.toFixed(2).replace(/\.00$/, '')} giờ)?\n\n`
        + 'Sau khi nộp, bạn sẽ không sửa hoặc xóa được các dòng giờ công của tuần này cho đến khi được duyệt.'
    );
    if (!confirmed) return;

    setSubmitting(true);
    try {
      const result = await submitWeek(week.weekFrom);
      const hours = Number(result.totalHours).toFixed(2).replace(/\.00$/, '');
      showToast(`Đã nộp bảng chấm công tuần thành công — tổng ${hours} giờ, đang chờ duyệt.`, 'success');
      await fetchWeek();
    } catch (err) {
      const message =
        err instanceof TimesheetApiError ? err.message : 'Không thể nộp bảng chấm công tuần. Vui lòng thử lại.';
      showToast(message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

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
          <h1 className="page-title">Chấm công của tôi</h1>
          <p className="page-subtitle">
            Xem giờ công đã ghi trong tuần và nộp bảng chấm công tuần cho Quản lý dự án duyệt.
          </p>
        </div>
        {hasDraft && (
          <div className="page-header-actions">
            <button type="button" className="btn-primary btn-lg" onClick={handleSubmit} disabled={submitting}>
              <span className="btn-icon">{ICONS.checkCircle}</span>
              {submitting ? 'Đang nộp…' : `Nộp bảng chấm công (${draftCount} dòng)`}
            </button>
          </div>
        )}
      </div>

      <div className="timesheet-week-nav">
        <button
          type="button"
          className="icon-btn"
          title="Tuần trước"
          aria-label="Xem tuần trước"
          onClick={() => setAnchorDate((d) => shiftWeek(d, -1))}
        >
          {ICONS.arrowLeft}
        </button>
        <span className="timesheet-week-nav__label">
          Tuần {formatWeekRangeLabel(week.weekFrom, week.weekTo)}
        </span>
        <button
          type="button"
          className="icon-btn"
          title="Tuần sau"
          aria-label="Xem tuần sau"
          onClick={() => setAnchorDate((d) => shiftWeek(d, 1))}
        >
          {ICONS.arrowRight}
        </button>
        {!isCurrentWeek(week.weekFrom) && (
          <button type="button" className="btn-secondary timesheet-week-nav__today" onClick={() => setAnchorDate(new Date())}>
            Tuần này
          </button>
        )}
      </div>

      {banner && (
        <div className={`status-pill status-pill--${banner.tone}`} style={{ marginBottom: 16 }}>
          <span className="status-pill__dot" />
          {banner.text}
        </div>
      )}

      {error && (
        <div className="alert alert--error mb-4" role="alert">
          <span className="alert__icon">{ICONS.alertTriangle}</span>
          <span>{error}</span>
          <button type="button" className="btn-link text-white ml-auto" onClick={fetchWeek}>
            Thử lại
          </button>
        </div>
      )}

      <WeeklyTimesheetGrid summaries={summaries} days={week.days} loading={loading} />

      {!loading && !weekIsEmpty && !hasDraft && !banner && (
        <p className="timesheet-grid__budget" style={{ marginTop: 12 }}>
          Không còn dòng giờ công nào ở trạng thái đang nhập để nộp trong tuần này.
        </p>
      )}
    </div>
  );
}
