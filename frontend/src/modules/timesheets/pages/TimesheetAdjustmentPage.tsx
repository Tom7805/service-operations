import { useEffect, useMemo, useState } from 'react';
import { ICONS } from '../../../components/common/icons';
import { roleLabels } from '../../../utils/roleLabel';
import AdjustmentModal from '../components/AdjustmentModal';
import { getAdjustableEntries, getAdjustmentHistory, TimesheetsApiError } from '../api/timesheetsApi';
import { getActiveUsersLookup } from '../../users/api/usersApi';
import type { AdjustableEntryRes, AdjustmentTraceRes } from '../types/timesheetTypes';

export interface TimesheetAdjustmentPageProps {
  currentUserRoles?: string[];
  currentUserName?: string;
}

function formatHours(hours: number | undefined): string {
  if (hours == null) return '—';
  return Number(hours.toFixed(2)).toString();
}

/**
 * Màn "Điều chỉnh giờ công đã duyệt" của Quản lý dự án (NCL-06-CN-005).
 *
 * PM chọn thẳng dòng cần sửa từ bảng "Dòng giờ công có thể điều chỉnh"
 * (`GET /timesheets/adjustable-entries` — chỉ dòng APPROVED, còn là dòng gốc, chưa từng
 * điều chỉnh, thuộc các dự án của chính PM) thay vì phải tự biết trước Project ID/Task ID/
 * Entry ID. Sau khi bấm "Điều chỉnh" trên một dòng, có thể xem lại lịch sử điều chỉnh của
 * đúng công việc đó (`GET /projects/{id}/tasks/{id}/adjustments`).
 */
export default function TimesheetAdjustmentPage({
  currentUserRoles = [],
  currentUserName = 'Quản lý dự án',
}: TimesheetAdjustmentPageProps) {
  // NCL-06-CN-005 TC-02: chỉ Quản lý dự án (VT-02) được điều chỉnh.
  const isAllowed = currentUserRoles.includes('VT-02');

  const [entries, setEntries] = useState<AdjustableEntryRes[]>([]);
  const [entriesLoading, setEntriesLoading] = useState(false);
  const [entriesError, setEntriesError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  // Tên nhân sự theo mã (userId → họ tên) — chỉ để hiển thị đẹp hơn "Nhân sự #14" trên bảng,
  // không ảnh hưởng dữ liệu gửi API. Lỗi khi tải (ví dụ mạng chập chờn) không chặn màn hình,
  // chỉ rớt về hiển thị mã như trước.
  const [userNames, setUserNames] = useState<Map<number, string>>(new Map());

  useEffect(() => {
    if (!isAllowed) return;
    getActiveUsersLookup()
      .then((users) => setUserNames(new Map(users.map((u) => [u.id, u.fullName]))))
      .catch(() => {
        /* bỏ qua — bảng vẫn dùng được, chỉ hiện "Nhân sự #id" thay vì tên */
      });
  }, [isAllowed]);

  const employeeLabel = (userId: number) => userNames.get(userId) ?? `Nhân sự #${userId}`;

  const [selectedEntry, setSelectedEntry] = useState<AdjustableEntryRes | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const [historyTask, setHistoryTask] = useState<{ projectId: number; taskId: number; taskName: string } | null>(
    null
  );
  const [history, setHistory] = useState<AdjustmentTraceRes[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 6000);
  };

  const loadEntries = async () => {
    setEntriesLoading(true);
    setEntriesError(null);
    try {
      const data = await getAdjustableEntries();
      setEntries(data);
    } catch (err) {
      const message =
        err instanceof TimesheetsApiError || err instanceof Error
          ? err.message
          : 'Không thể tải danh sách dòng giờ công có thể điều chỉnh.';
      setEntriesError(message);
    } finally {
      setEntriesLoading(false);
    }
  };

  useEffect(() => {
    if (isAllowed) {
      loadEntries();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAllowed]);

  const filteredEntries = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter(
      (e) =>
        e.projectName.toLowerCase().includes(q) ||
        e.taskName.toLowerCase().includes(q) ||
        String(e.projectId).includes(q) ||
        String(e.taskId).includes(q) ||
        String(e.userId).includes(q)
    );
  }, [entries, search]);

  const openAdjustModal = (entry: AdjustableEntryRes) => {
    setSelectedEntry(entry);
    setModalOpen(true);
  };

  const loadHistory = async (projectId: number, taskId: number, taskName: string) => {
    setHistoryTask({ projectId, taskId, taskName });
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      const data = await getAdjustmentHistory(projectId, taskId);
      setHistory(data);
    } catch (err) {
      setHistory([]);
      const message =
        err instanceof TimesheetsApiError || err instanceof Error
          ? err.message
          : 'Không thể tải lịch sử điều chỉnh.';
      setHistoryError(message);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleAdjusted = (trace: AdjustmentTraceRes) => {
    setModalOpen(false);
    showToast(
      `Đã điều chỉnh dòng #${trace.originalEntry?.id} thành công — số giờ đúng: ${formatHours(
        trace.correctedEntry?.hours
      )} giờ.`,
      'success'
    );
    // Dòng vừa điều chỉnh không còn đủ điều kiện điều chỉnh tiếp — bỏ khỏi danh sách chọn
    // ngay trên giao diện, không cần tải lại toàn bộ danh sách.
    if (selectedEntry) {
      setEntries((prev) => prev.filter((e) => e.entryId !== selectedEntry.entryId));
      loadHistory(selectedEntry.projectId, selectedEntry.taskId, selectedEntry.taskName);
    }
    setSelectedEntry(null);
  };

  if (!isAllowed) {
    return (
      <div className="access-denied-container">
        <div className="access-denied-card">
          <div className="access-denied-icon">{ICONS.shieldOff}</div>
          <h2>Bạn không có thẩm quyền truy cập màn hình này</h2>
          <p>
            Chức năng Điều chỉnh giờ công đã duyệt chỉ dành riêng cho vai trò <strong>Quản lý dự án</strong>.
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

  return (
    <div className="user-management-page" data-testid="timesheet-adjustment-page">
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
          <h1 className="page-title">Điều chỉnh giờ công đã duyệt</h1>
          <p className="page-subtitle">
            Giờ công đã duyệt là bất biến — muốn sửa phải đi qua bút toán đảo: hệ thống tự sinh một dòng đảo
            và một dòng sửa, giữ nguyên dòng gốc để tra cứu lại được.
          </p>
        </div>
      </div>

      <div className="user-table-card">
        <div className="user-table-toolbar">
          <div>
            <strong>Dòng giờ công có thể điều chỉnh</strong>
            <p className="text-muted font-sm" style={{ margin: '4px 0 0' }}>
              Chỉ hiện dòng đã duyệt, còn là dòng gốc và thuộc dự án bạn quản lý.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input
              type="text"
              className="form-input"
              placeholder="Tìm theo dự án, công việc, mã..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ minWidth: '240px' }}
              data-testid="adjustable-entries-search"
            />
            <button
              type="button"
              className="btn-secondary"
              onClick={loadEntries}
              disabled={entriesLoading}
              data-testid="btn-refresh-entries"
            >
              {entriesLoading ? 'Đang tải…' : 'Làm mới'}
            </button>
          </div>
        </div>

        {entriesError && (
          <div className="alert alert--error mb-4" role="alert" style={{ margin: '0 20px 16px' }}>
            <span className="alert__icon">{ICONS.alertTriangle}</span>
            <span>{entriesError}</span>
          </div>
        )}

        <div className="table-responsive">
          <table className="user-data-table">
            <thead>
              <tr>
                <th>Dự án</th>
                <th>Công việc</th>
                <th>Nhân sự</th>
                <th>Ngày</th>
                <th>Số giờ</th>
                <th>Ghi chú</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {entriesLoading ? (
                <tr>
                  <td colSpan={7}>
                    <div className="table-empty-state">
                      <span className="empty-icon">{ICONS.history}</span>
                      <h3>Đang tải…</h3>
                    </div>
                  </td>
                </tr>
              ) : filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <div className="table-empty-state">
                      <span className="empty-icon">{ICONS.checkCircle}</span>
                      <h3>{entries.length === 0 ? 'Không có dòng giờ công nào cần điều chỉnh' : 'Không tìm thấy kết quả phù hợp'}</h3>
                      <p>
                        {entries.length === 0
                          ? 'Mọi dòng giờ công đã duyệt thuộc dự án bạn quản lý hiện đều đúng, hoặc đã được điều chỉnh trước đó.'
                          : 'Thử một từ khoá tìm kiếm khác.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredEntries.map((entry) => (
                  <tr key={entry.entryId} data-testid={`adjustable-entry-row-${entry.entryId}`}>
                    <td title={`Mã dự án #${entry.projectId}`}>{entry.projectName}</td>
                    <td title={`Mã công việc #${entry.taskId}`}>{entry.taskName}</td>
                    <td>{employeeLabel(entry.userId)}</td>
                    <td>{new Date(entry.workDate).toLocaleDateString('vi-VN')}</td>
                    <td>
                      <strong>{formatHours(entry.hours)} giờ</strong>
                    </td>
                    <td>{entry.note || '—'}</td>
                    <td style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => loadHistory(entry.projectId, entry.taskId, entry.taskName)}
                        data-testid={`btn-view-history-${entry.entryId}`}
                      >
                        Lịch sử
                      </button>
                      <button
                        type="button"
                        className="btn-primary"
                        onClick={() => openAdjustModal(entry)}
                        data-testid={`btn-adjust-${entry.entryId}`}
                      >
                        Điều chỉnh
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="table-footer">
          Hiển thị <strong>{filteredEntries.length}</strong> / {entries.length} dòng có thể điều chỉnh
        </div>
      </div>

      {historyTask && (
        <div className="user-table-card" style={{ marginTop: '16px' }}>
          <div className="user-table-toolbar">
            <div title={`Mã dự án #${historyTask.projectId} · Mã công việc #${historyTask.taskId}`}>
              <strong>Lịch sử điều chỉnh — {historyTask.taskName}</strong>
            </div>
            <button type="button" className="btn-secondary" onClick={() => setHistoryTask(null)}>
              Đóng
            </button>
          </div>

          {historyError && (
            <div className="alert alert--error mb-4" role="alert" style={{ margin: '0 20px 16px' }}>
              <span className="alert__icon">{ICONS.alertTriangle}</span>
              <span>{historyError}</span>
            </div>
          )}

          <div className="table-responsive">
            <table className="user-data-table">
              <thead>
                <tr>
                  <th>Dòng gốc</th>
                  <th>Dòng đảo</th>
                  <th>Dòng sửa</th>
                  <th>Lý do</th>
                  <th>Người điều chỉnh</th>
                  <th>Thời điểm</th>
                </tr>
              </thead>
              <tbody>
                {historyLoading ? (
                  <tr>
                    <td colSpan={6}>
                      <div className="table-empty-state">
                        <span className="empty-icon">{ICONS.history}</span>
                        <h3>Đang tải…</h3>
                      </div>
                    </td>
                  </tr>
                ) : history.length === 0 ? (
                  <tr>
                    <td colSpan={6}>
                      <div className="table-empty-state">
                        <span className="empty-icon">{ICONS.history}</span>
                        <h3>Chưa có điều chỉnh nào cho công việc này</h3>
                      </div>
                    </td>
                  </tr>
                ) : (
                  history.map((trace) => (
                    <tr key={trace.adjustmentId} data-testid={`adjustment-row-${trace.adjustmentId}`}>
                      <td title={`Mã dòng #${trace.originalEntry?.id}`}>
                        {formatHours(trace.originalEntry?.hours)} giờ
                      </td>
                      <td title={`Mã dòng #${trace.reversalEntry?.id}`}>
                        {formatHours(trace.reversalEntry?.hours)} giờ
                      </td>
                      <td title={`Mã dòng #${trace.correctedEntry?.id}`}>
                        <strong>{formatHours(trace.correctedEntry?.hours)} giờ</strong>
                      </td>
                      <td>{trace.reason}</td>
                      <td>{trace.adjustedBy ?? '—'}</td>
                      <td>{new Date(trace.adjustedAt).toLocaleString('vi-VN')}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="table-footer">
            Hiển thị <strong>{history.length}</strong> lần điều chỉnh
          </div>
        </div>
      )}

      {modalOpen && selectedEntry && (
        <AdjustmentModal
          projectId={selectedEntry.projectId}
          taskId={selectedEntry.taskId}
          presetEntry={selectedEntry}
          employeeName={employeeLabel(selectedEntry.userId)}
          onClose={() => {
            setModalOpen(false);
            setSelectedEntry(null);
          }}
          onAdjusted={handleAdjusted}
        />
      )}
    </div>
  );
}
