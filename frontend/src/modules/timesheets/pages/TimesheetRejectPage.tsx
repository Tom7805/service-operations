import { useCallback, useEffect, useState } from 'react';
import { ICONS } from '../../../components/common/icons';
import ModalPortal from '../../../components/common/ModalPortal';
import { useBackdropClick } from '../../../hooks/useBackdropClick';
import { roleLabels } from '../../../utils/roleLabel';
import RejectActionButton from '../components/RejectActionButton';
import { getMyApprovalHistory, getPendingTimesheets, TimesheetsApiError } from '../api/timesheetsApi';
import type { PendingTimesheetRes, TimesheetApprovalHistoryRes } from '../types/timesheetTypes';
import { formatIsoDate } from '../utils/weekRange';
import { useDialogA11y } from '../../projects/components/deliveryUi';

export interface TimesheetRejectPageProps {
  currentUserRoles?: string[];
  currentUserName?: string;
}

/**
 * Màn "Từ chối bảng chấm công" của Quản lý dự án (NCL-06-CN-004) — màn hình riêng, chỉ có
 * hành động từ chối (không có nút duyệt), tách khỏi `TimesheetApprovalPage` theo yêu cầu
 * của story này.
 *
 * Dùng chung nguồn dữ liệu `GET /timesheets/pending` với màn duyệt — backend không có
 * endpoint hàng chờ riêng cho "chỉ những bảng cần từ chối", vì một bảng SUBMITTED luôn có
 * thể được duyệt HOẶC từ chối, tùy PM quyết định sau khi xem lại; đúng những gì backend
 * hiện có, không suy diễn thêm một trạng thái/endpoint chưa tồn tại.
 */
export default function TimesheetRejectPage({
  currentUserRoles = [],
  currentUserName = 'Quản lý dự án',
}: TimesheetRejectPageProps) {
  // NCL-06-CN-004 TC chung với NCL-06-CN-003: chỉ Quản lý dự án (VT-02) được từ chối.
  const isAllowed = currentUserRoles.includes('VT-02');

  const [pending, setPending] = useState<PendingTimesheetRes[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  // Lịch sử các lần từ chối gần nhất của chính PM này — lấy từ máy chủ
  // (`GET /timesheets/approval-history`, lọc còn REJECTED), không chỉ trong phiên làm việc
  // hiện tại, để PM vẫn tra lại được ngay cả sau khi tải lại trang hoặc đổi thiết bị.
  const [rejected, setRejected] = useState<TimesheetApprovalHistoryRes[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const historyBackdrop = useBackdropClick(() => setHistoryOpen(false));
  const dialogRef = useDialogA11y(historyOpen, () => setHistoryOpen(false), false);

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
      setRejected(data.filter((h) => h.action === 'REJECTED'));
    } catch (err) {
      const message =
        err instanceof TimesheetsApiError || err instanceof Error
          ? err.message
          : 'Không thể tải lịch sử từ chối.';
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
            Chức năng Từ chối bảng chấm công chỉ dành riêng cho vai trò <strong>Quản lý dự án</strong>.
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
    <div className="user-management-page" data-testid="timesheet-reject-page">
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
          <h1 className="page-title">Từ chối bảng chấm công</h1>
          <p className="page-subtitle">
            Các bảng chấm công tuần đang chờ duyệt, thuộc những dự án bạn quản lý — từ chối bảng nào không
            hợp lệ để nhân viên sửa lại và nộp lại.
          </p>
        </div>
        <div className="page-header__actions">
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => setHistoryOpen(true)}>
            <span className="icon-xs">{ICONS.history}</span> Lịch sử từ chối
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
                <th style={{ width: '140px' }}></th>
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
                    <td style={{ textAlign: 'right' }}>
                      <RejectActionButton
                        timesheet={t}
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
            <div ref={dialogRef} className="modal-card dl-modal" style={{ maxWidth: '760px' }}>
              <div className="modal-header">
                <div className="modal-header__title-wrap">
                  <h3 className="modal-title">
                    <span className="modal-title__icon">{ICONS.history}</span>
                    Lịch sử từ chối
                  </h3>
                  <p className="field-hint">
                    Các bảng bạn đã từ chối — mất khỏi hàng chờ ở trên vì đã có quyết định, không phải bị xóa;
                    tra lại được ở đây kể cả sau khi tải lại trang. Nhân viên đã nhận lại bảng ở trạng thái
                    nhập để sửa và nộp lại.
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
                        <th>Lý do / ghi chú</th>
                        <th>Thời điểm xử lý</th>
                      </tr>
                    </thead>
                    <tbody>
                      {historyLoading ? (
                        <tr>
                          <td colSpan={4} style={{ textAlign: 'center', padding: '40px' }}>
                            Đang tải lịch sử từ chối…
                          </td>
                        </tr>
                      ) : rejected.length === 0 ? (
                        <tr>
                          <td colSpan={4}>
                            <div className="table-empty-state">
                              <span className="empty-icon">{ICONS.history}</span>
                              <h3>Chưa từ chối bảng nào</h3>
                              <p>Sau khi bạn từ chối một bảng ở trên, kết quả sẽ hiện tại đây để đối chiếu lại.</p>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        rejected.map((r) => (
                          <tr key={r.auditLogId} data-testid={`rejected-row-${r.timesheetId}`}>
                            <td>{r.userName ?? `Nhân sự #${r.userId}`}</td>
                            <td>
                              {formatIsoDate(r.weekStartDate)} → {formatIsoDate(r.weekEndDate)}
                            </td>
                            <td style={{ fontSize: '12.5px', color: 'var(--ink-muted)' }}>{r.detail}</td>
                            <td>{new Date(r.performedAt).toLocaleString('vi-VN')}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {rejected.length > 0 && (
                  <div className="table-footer">
                    Hiển thị <strong>{rejected.length}</strong> lần từ chối gần nhất
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
