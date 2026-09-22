import { useCallback, useEffect, useState } from 'react';
import { ICONS } from '../../../components/common/icons';
import ModalPortal from '../../../components/common/ModalPortal';
import { useBackdropClick } from '../../../hooks/useBackdropClick';
import { roleLabels } from '../../../utils/roleLabel';
import ApprovalActionBar from '../components/ApprovalActionBar';
import { getMyApprovalHistory, getPendingTimesheets, TimesheetsApiError } from '../api/timesheetsApi';
import type { PendingTimesheetRes, TimesheetApprovalHistoryRes } from '../types/timesheetTypes';
import { formatIsoDate } from '../utils/weekRange';

export interface TimesheetApprovalPageProps {
  currentUserRoles?: string[];
  currentUserName?: string;
  /** Điều hướng sang "Điều chỉnh giờ công đã duyệt" — nơi tra cứu lại đầy đủ các dòng đã
   * duyệt (kể cả từ những phiên làm việc trước), không chỉ trong phiên hiện tại. */
  onNavigateToAdjustment?: () => void;
}

/**
 * Màn "Duyệt bảng chấm công" của Quản lý dự án (NCL-06-CN-003, kèm từ chối NCL-06-CN-004
 * trên cùng hàng đợi — hai hành động luôn đi cùng nhau trên một bảng chờ duyệt).
 *
 * Duyệt/từ chối luôn theo NGUYÊN BẢNG: `GET /timesheets/pending` chỉ trả tổng hợp
 * (`pendingEntries`/`pendingHours`), không trả danh sách từng dòng để chọn duyệt riêng lẻ —
 * đúng những gì backend hiện có, không suy diễn thêm một endpoint chưa tồn tại.
 */
export default function TimesheetApprovalPage({
  currentUserRoles = [],
  currentUserName = 'Quản lý dự án',
  onNavigateToAdjustment,
}: TimesheetApprovalPageProps) {
  // NCL-06-CN-003/CN-004 TC chung: chỉ Quản lý dự án (VT-02) được duyệt/từ chối.
  const isAllowed = currentUserRoles.includes('VT-02');

  const [pending, setPending] = useState<PendingTimesheetRes[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  // Lịch sử các lần duyệt/từ chối gần nhất của chính PM này — lấy từ máy chủ
  // (`GET /timesheets/approval-history`), không chỉ trong phiên làm việc hiện tại, để PM
  // vẫn tra lại được ngay cả sau khi tải lại trang hoặc đổi thiết bị.
  const [history, setHistory] = useState<TimesheetApprovalHistoryRes[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const historyBackdrop = useBackdropClick(() => setHistoryOpen(false));

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 6000);
  };

  const fetchPending = useCallback(async () => {
    if (!isAllowed) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getPendingTimesheets();
      setPending(data);
    } catch (err) {
      const message =
        err instanceof TimesheetsApiError || err instanceof Error
          ? err.message
          : 'Không thể tải hàng chờ duyệt bảng chấm công.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [isAllowed]);

  const fetchHistory = useCallback(async () => {
    if (!isAllowed) return;
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      const data = await getMyApprovalHistory();
      setHistory(data);
    } catch (err) {
      const message =
        err instanceof TimesheetsApiError || err instanceof Error
          ? err.message
          : 'Không thể tải lịch sử duyệt/từ chối.';
      setHistoryError(message);
    } finally {
      setHistoryLoading(false);
    }
  }, [isAllowed]);

  useEffect(() => {
    void fetchPending();
    void fetchHistory();
  }, [fetchPending, fetchHistory]);

  if (!isAllowed) {
    return (
      <div className="access-denied-container">
        <div className="access-denied-card">
          <div className="access-denied-icon">{ICONS.shieldOff}</div>
          <h2>Bạn không có thẩm quyền truy cập màn hình này</h2>
          <p>
            Chức năng Duyệt bảng chấm công chỉ dành riêng cho vai trò <strong>Quản lý dự án</strong>.
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

  const totalPendingHours = pending.reduce((sum, t) => sum + t.pendingHours, 0);
  const totalPendingEntries = pending.reduce((sum, t) => sum + t.pendingEntries, 0);

  return (
    <div className="user-management-page" data-testid="timesheet-approval-page">
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
          <h1 className="page-title">Duyệt bảng chấm công</h1>
          <p className="page-subtitle">
            Các bảng chấm công tuần đang chờ bạn duyệt hoặc từ chối, thuộc những dự án bạn quản lý.
          </p>
        </div>
        <div className="page-header-actions">
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => setHistoryOpen(true)}>
            <span className="icon-xs">{ICONS.history}</span> Giờ công đã duyệt
          </button>
          <button
            type="button"
            className="btn-icon-refresh"
            onClick={() => {
              void fetchPending();
              void fetchHistory();
            }}
            title="Tải lại"
            aria-label="Tải lại"
            disabled={loading}
          >
            {ICONS.refresh}
          </button>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-card__icon stat-card__icon--blue">{ICONS.clipboardList}</div>
          <div>
            <span className="stat-card__label">Bảng đang chờ duyệt</span>
            <strong className="stat-card__value">{pending.length}</strong>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card__icon stat-card__icon--purple">{ICONS.clock}</div>
          <div>
            <span className="stat-card__label">Tổng dòng chờ duyệt</span>
            <strong className="stat-card__value">{totalPendingEntries}</strong>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card__icon stat-card__icon--amber">{ICONS.chart}</div>
          <div>
            <span className="stat-card__label">Tổng giờ chờ duyệt</span>
            <strong className="stat-card__value">{totalPendingHours}</strong>
          </div>
        </div>
      </div>

      {error && (
        <div className="alert alert--error mb-4" role="alert">
          <span className="alert__icon">{ICONS.alertTriangle}</span>
          <span>{error}</span>
          <button type="button" className="btn-link text-white ml-auto" onClick={fetchPending}>
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
                <th style={{ textAlign: 'right' }}>Tổng giờ tuần</th>
                <th style={{ textAlign: 'right' }}>Dòng chờ duyệt</th>
                <th style={{ textAlign: 'right' }}>Giờ chờ duyệt</th>
                <th>Ngày nộp</th>
                <th style={{ width: '220px' }}></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '40px' }}>
                    Đang tải hàng chờ duyệt…
                  </td>
                </tr>
              ) : pending.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <div className="table-empty-state">
                      <span className="empty-icon">{ICONS.checkCircle}</span>
                      <h3>Không có bảng chấm công nào đang chờ duyệt</h3>
                      <p>Khi nhân viên nộp bảng chấm công tuần thuộc dự án bạn quản lý, bảng sẽ xuất hiện ở đây.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                pending.map((t) => (
                  <tr key={t.timesheetId} data-testid={`pending-row-${t.timesheetId}`}>
                    <td>{t.userName ?? `Nhân sự #${t.userId}`}</td>
                    <td>
                      {formatIsoDate(t.weekStartDate)} → {formatIsoDate(t.weekEndDate)}
                    </td>
                    <td style={{ textAlign: 'right' }}>{t.totalHours} giờ</td>
                    <td style={{ textAlign: 'right' }}>{t.pendingEntries}</td>
                    <td style={{ textAlign: 'right' }}>
                      <strong>{t.pendingHours}</strong> giờ
                    </td>
                    <td>{new Date(t.submittedAt).toLocaleString('vi-VN')}</td>
                    <td>
                      <ApprovalActionBar
                        timesheet={t}
                        onApproved={(result) => {
                          const label = t.userName ?? `Nhân sự #${t.userId}`;
                          const warnings = result.overBudgetWarnings;
                          const base = `Đã duyệt bảng chấm công của ${label} thành công.`;
                          showToast(
                            warnings.length > 0 ? `${base} Cảnh báo: ${warnings.join('; ')}` : base,
                            warnings.length > 0 ? 'error' : 'success'
                          );
                          setPending((prev) => prev.filter((p) => p.timesheetId !== t.timesheetId));
                          void fetchHistory();
                        }}
                        onRejected={(result) => {
                          const label = t.userName ?? `Nhân sự #${t.userId}`;
                          showToast(`Đã từ chối ${result.rejectedEntries} dòng giờ công của ${label} — đã quay về nhập.`, 'success');
                          setPending((prev) => prev.filter((p) => p.timesheetId !== t.timesheetId));
                          void fetchHistory();
                        }}
                        onError={(message) => showToast(message, 'error')}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="table-footer">
          Hiển thị <strong>{pending.length}</strong> bảng chấm công đang chờ duyệt
        </div>
      </div>

      {historyOpen && (
        <ModalPortal>
          <div
            className="modal-backdrop"
            onMouseDown={historyBackdrop.onMouseDown}
            onClick={historyBackdrop.onClick}
            role="dialog"
            aria-modal="true"
          >
            <div className="modal-card" style={{ maxWidth: '800px' }}>
              <div className="modal-header">
                <div className="modal-header__title-wrap">
                  <h3 className="modal-title">
                    <span className="modal-title__icon">{ICONS.history}</span>
                    Giờ công đã duyệt
                  </h3>
                  <p className="field-hint">
                    Các bảng bạn vừa duyệt hoặc từ chối — mất khỏi hàng chờ ở trên vì đã có quyết định, không
                    phải bị xóa; tra lại được ở đây kể cả sau khi tải lại trang.
                    {onNavigateToAdjustment && (
                      <>
                        {' '}
                        Muốn xem đầy đủ từng dòng giờ công đã duyệt để đối chiếu hoặc sửa lại, dùng{' '}
                        <button
                          type="button"
                          className="btn-link"
                          onClick={() => {
                            setHistoryOpen(false);
                            onNavigateToAdjustment();
                          }}
                        >
                          Điều chỉnh giờ công đã duyệt
                        </button>
                        .
                      </>
                    )}
                  </p>
                </div>
                <button type="button" className="modal-close" onClick={() => setHistoryOpen(false)} aria-label="Đóng">
                  {ICONS.close}
                </button>
              </div>
              <div className="modal-body">
                {historyError && (
                  <div className="alert alert--error mb-4" role="alert">
                    <span className="alert__icon">{ICONS.alertTriangle}</span>
                    <span>{historyError}</span>
                    <button type="button" className="btn-link text-white ml-auto" onClick={fetchHistory}>
                      Thử lại
                    </button>
                  </div>
                )}

                <div className="table-responsive">
                  <table className="user-data-table">
                    <thead>
                      <tr>
                        <th>Nhân sự</th>
                        <th>Tuần chấm công</th>
                        <th>Trạng thái</th>
                        <th>Ghi chú</th>
                        <th>Thời điểm xử lý</th>
                      </tr>
                    </thead>
                    <tbody>
                      {historyLoading ? (
                        <tr>
                          <td colSpan={5} style={{ textAlign: 'center', padding: '40px' }}>
                            Đang tải lịch sử xử lý…
                          </td>
                        </tr>
                      ) : history.length === 0 ? (
                        <tr>
                          <td colSpan={5}>
                            <div className="table-empty-state">
                              <span className="empty-icon">{ICONS.history}</span>
                              <h3>Chưa có bảng chấm công nào bạn đã xử lý</h3>
                              <p>Sau khi bạn duyệt hoặc từ chối một bảng ở trên, kết quả sẽ hiện tại đây để đối chiếu lại.</p>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        history.map((h) => (
                          <tr key={h.auditLogId} data-testid={`history-row-${h.auditLogId}`}>
                            <td>{h.userName ?? `Nhân sự #${h.userId}`}</td>
                            <td>
                              {formatIsoDate(h.weekStartDate)} → {formatIsoDate(h.weekEndDate)}
                            </td>
                            <td>
                              <span className={`badge ${h.action === 'APPROVED' ? 'badge--green' : 'badge--red'}`}>
                                {h.action === 'APPROVED' ? 'Đã duyệt' : 'Đã từ chối'}
                              </span>
                            </td>
                            <td style={{ fontSize: '12.5px', color: 'var(--ink-muted)' }}>{h.detail}</td>
                            <td>{new Date(h.performedAt).toLocaleString('vi-VN')}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {history.length > 0 && (
                  <div className="table-footer">
                    Hiển thị <strong>{history.length}</strong> lần xử lý gần nhất
                  </div>
                )}
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
}
