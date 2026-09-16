import { useCallback, useEffect, useState } from 'react';
import { ICONS } from '../../../components/common/icons';
import { roleLabels } from '../../../utils/roleLabel';
import { getUnsubmittedTimesheets, remindUnsubmittedTimesheetsNow, TimesheetsApiError } from '../api/timesheetsApi';
import type { UnsubmittedTimesheetRes } from '../types/timesheetTypes';
import { addDays, formatIsoDate, getMondayOf } from '../utils/weekRange';

export interface UnsubmittedTimesheetsPageProps {
  currentUserRoles?: string[];
  currentUserName?: string;
}

/**
 * Màn "Nhân sự chưa nộp bảng chấm công" (NCL-06-CN-009). Việc nhắc nộp tự động vẫn chạy
 * hằng tuần ở backend (`TimesheetReminderScheduler`) và hiển thị qua chuông thông báo (xem
 * `NotificationCenterPage`); nút "Gửi nhắc ngay" ở đây gọi lại đúng cơ chế đó theo yêu cầu
 * (POST /timesheets/unsubmitted/remind) nên vẫn tuân thủ QTN-27 — không gửi trùng trong
 * cùng tuần cho người đã được nhắc.
 */
export default function UnsubmittedTimesheetsPage({
  currentUserRoles = [],
  currentUserName = 'Người dùng',
}: UnsubmittedTimesheetsPageProps) {
  // NCL-06-CN-009 TC-03: PM xem nhân sự dự án mình quản lý; nhân viên tự tra cứu chính mình.
  const isAllowed = currentUserRoles.includes('VT-02') || currentUserRoles.includes('VT-03');

  const [weekStart, setWeekStart] = useState(() => getMondayOf());
  const [result, setResult] = useState<UnsubmittedTimesheetRes[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reminding, setReminding] = useState(false);
  const [remindMessage, setRemindMessage] = useState<string | null>(null);

  const fetchUnsubmitted = useCallback(async () => {
    if (!isAllowed) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getUnsubmittedTimesheets(weekStart);
      setResult(data);
    } catch (err) {
      setResult(null);
      const message =
        err instanceof TimesheetsApiError || err instanceof Error ? err.message : 'Không thể tra cứu danh sách.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [isAllowed, weekStart]);

  useEffect(() => {
    void fetchUnsubmitted();
  }, [fetchUnsubmitted]);

  const handleRemindNow = useCallback(async () => {
    setReminding(true);
    setRemindMessage(null);
    setError(null);
    try {
      const reminded = await remindUnsubmittedTimesheetsNow(weekStart);
      setRemindMessage(
        reminded > 0
          ? `Đã gửi thông báo nhắc nộp cho ${reminded} nhân sự.`
          : 'Không có ai cần nhắc thêm — mọi người đã được nhắc trong tuần này hoặc đã nộp đủ.',
      );
    } catch (err) {
      const message =
        err instanceof TimesheetsApiError || err instanceof Error ? err.message : 'Không thể gửi nhắc lúc này.';
      setError(message);
    } finally {
      setReminding(false);
    }
  }, [weekStart]);

  if (!isAllowed) {
    return (
      <div className="access-denied-container">
        <div className="access-denied-card">
          <div className="access-denied-icon">{ICONS.shieldOff}</div>
          <h2>Bạn không có thẩm quyền truy cập màn hình này</h2>
          <p>
            Chức năng tra cứu nhân sự chưa nộp bảng chấm công chỉ dành cho vai trò{' '}
            <strong>Quản lý dự án</strong> hoặc <strong>Nhân viên chuyên môn</strong>. Hệ thống đã ghi lại lần
            truy cập bị từ chối này vào nhật ký bảo mật.
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

  const weekEnd = addDays(weekStart, 6);

  return (
    <div className="user-management-page" data-testid="unsubmitted-timesheets-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Nhân sự chưa nộp bảng chấm công</h1>
          <p className="page-subtitle">
            Tra cứu theo tuần. Việc nhắc nộp chạy tự động vào Chủ Nhật hằng tuần — bấm "Gửi nhắc ngay" nếu
            muốn gửi thông báo cho danh sách này ngay bây giờ.
          </p>
        </div>
        <button
          type="button"
          className="btn-primary"
          onClick={handleRemindNow}
          disabled={reminding || loading || !result || result.length === 0}
        >
          {reminding ? 'Đang gửi…' : 'Gửi nhắc ngay'}
        </button>
      </div>

      {remindMessage && (
        <div className="alert alert--success mb-4" role="status">
          <span className="alert__icon">{ICONS.checkCircle}</span>
          <span>{remindMessage}</span>
        </div>
      )}

      <div className="timesheet-week-nav">
        <button
          type="button"
          className="icon-btn"
          title="Tuần trước"
          aria-label="Xem tuần trước"
          onClick={() => setWeekStart((d) => addDays(d, -7))}
        >
          {ICONS.arrowLeft}
        </button>
        <span className="timesheet-week-nav__label" data-testid="unsubmitted-week-label">
          Tuần {formatIsoDate(weekStart)} → {formatIsoDate(weekEnd)}
        </span>
        <button
          type="button"
          className="icon-btn"
          title="Tuần sau"
          aria-label="Xem tuần sau"
          onClick={() => setWeekStart((d) => addDays(d, 7))}
        >
          {ICONS.arrowRight}
        </button>
        <button type="button" className="btn-secondary timesheet-week-nav__today" onClick={() => setWeekStart(getMondayOf())}>
          Tuần này
        </button>
        <button type="button" className="btn-icon-refresh" onClick={fetchUnsubmitted} title="Tải lại" aria-label="Tải lại" disabled={loading}>
          {ICONS.refresh}
        </button>
      </div>

      {error && (
        <div className="alert alert--error mb-4" role="alert">
          <span className="alert__icon">{ICONS.alertTriangle}</span>
          <span>{error}</span>
          <button type="button" className="btn-link text-white ml-auto" onClick={fetchUnsubmitted}>
            Thử lại
          </button>
        </div>
      )}

      <div className="user-table-card">
        <div className="table-responsive">
          <table className="user-data-table">
            <thead>
              <tr>
                <th>Nhân sự</th>
                <th>Tuần chấm công</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={2} style={{ textAlign: 'center', padding: '40px' }}>
                    Đang tra cứu…
                  </td>
                </tr>
              ) : !result || result.length === 0 ? (
                <tr>
                  <td colSpan={2}>
                    <div className="table-empty-state">
                      <span className="empty-icon">{ICONS.checkCircle}</span>
                      <h3>Không còn ai chưa nộp bảng chấm công</h3>
                      <p>Mọi nhân sự thuộc phạm vi của bạn đều đã nộp bảng chấm công tuần này.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                result.map((r) => (
                  <tr key={r.userId} data-testid={`unsubmitted-row-${r.userId}`}>
                    <td>{r.userName ?? `Nhân sự #${r.userId}`}</td>
                    <td>
                      {formatIsoDate(r.weekStartDate)} → {formatIsoDate(r.weekEndDate)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="table-footer">
          Hiển thị <strong>{result?.length ?? 0}</strong> nhân sự chưa nộp
        </div>
      </div>
    </div>
  );
}
