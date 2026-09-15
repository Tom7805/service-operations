import { useState } from 'react';
import { ICONS } from '../../../components/common/icons';
import { roleLabels } from '../../../utils/roleLabel';
import AdjustmentModal from '../components/AdjustmentModal';
import { getAdjustmentHistory, TimesheetsApiError } from '../api/timesheetsApi';
import type { AdjustmentTraceRes } from '../types/timesheetTypes';

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
 * Backend không có endpoint liệt kê tất cả công việc/dòng giờ công APPROVED của PM để duyệt
 * chọn — tra cứu theo đúng cặp Dự án/Công việc (giống cách `GET /projects/{id}/tasks/{id}/
 * adjustments` yêu cầu), rồi mới tạo điều chỉnh mới cho một dòng cụ thể trong công việc đó.
 * Đúng những gì backend hiện có, không suy diễn thêm một endpoint chưa tồn tại.
 */
export default function TimesheetAdjustmentPage({
  currentUserRoles = [],
  currentUserName = 'Quản lý dự án',
}: TimesheetAdjustmentPageProps) {
  // NCL-06-CN-005 TC-02: chỉ Quản lý dự án (VT-02) được điều chỉnh.
  const isAllowed = currentUserRoles.includes('VT-02');

  const [projectIdInput, setProjectIdInput] = useState('');
  const [taskIdInput, setTaskIdInput] = useState('');
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [activeTask, setActiveTask] = useState<{ projectId: number; taskId: number } | null>(null);
  const [history, setHistory] = useState<AdjustmentTraceRes[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 6000);
  };

  const handleLookup = async () => {
    const projectId = Number(projectIdInput);
    const taskId = Number(taskIdInput);
    if (!Number.isInteger(projectId) || projectId <= 0 || !Number.isInteger(taskId) || taskId <= 0) {
      setLookupError('Vui lòng nhập mã dự án và mã công việc hợp lệ (số nguyên dương).');
      return;
    }

    setLoading(true);
    setLookupError(null);
    try {
      const data = await getAdjustmentHistory(projectId, taskId);
      setHistory(data);
      setActiveTask({ projectId, taskId });
    } catch (err) {
      setActiveTask(null);
      setHistory([]);
      const message =
        err instanceof TimesheetsApiError || err instanceof Error
          ? err.message
          : 'Không thể tải lịch sử điều chỉnh.';
      setLookupError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleAdjusted = (trace: AdjustmentTraceRes) => {
    setHistory((prev) => [trace, ...prev]);
    setModalOpen(false);
    showToast(
      `Đã điều chỉnh dòng #${trace.originalEntry?.id} thành công — số giờ đúng: ${formatHours(
        trace.correctedEntry?.hours
      )} giờ.`,
      'success'
    );
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

      <div className="user-table-card" style={{ padding: '20px', marginBottom: '16px' }}>
        <h3 style={{ margin: '0 0 12px', fontSize: '16px', fontWeight: 700 }}>Tra cứu công việc</h3>
        <div className="form-grid">
          <div>
            <label className="form-label" htmlFor="lookup-project-id">
              Mã dự án (Project ID)
            </label>
            <input
              id="lookup-project-id"
              type="number"
              min={1}
              className="form-input"
              placeholder="Ví dụ: 1"
              value={projectIdInput}
              onChange={(e) => setProjectIdInput(e.target.value)}
              data-testid="lookup-project-id"
            />
          </div>
          <div>
            <label className="form-label" htmlFor="lookup-task-id">
              Mã công việc (Task ID)
            </label>
            <input
              id="lookup-task-id"
              type="number"
              min={1}
              className="form-input"
              placeholder="Ví dụ: 20"
              value={taskIdInput}
              onChange={(e) => setTaskIdInput(e.target.value)}
              data-testid="lookup-task-id"
            />
          </div>
        </div>
        <div style={{ marginTop: '12px' }}>
          <button type="button" className="btn-primary" onClick={handleLookup} disabled={loading} data-testid="btn-lookup">
            {loading ? 'Đang tải…' : 'Xem lịch sử điều chỉnh'}
          </button>
        </div>

        {lookupError && (
          <div className="alert alert--error mb-4" role="alert" style={{ marginTop: '12px' }}>
            <span className="alert__icon">{ICONS.alertTriangle}</span>
            <span>{lookupError}</span>
          </div>
        )}
      </div>

      {activeTask && (
        <div className="user-table-card">
          <div className="user-table-toolbar">
            <div>
              <strong>
                Dự án #{activeTask.projectId} — Công việc #{activeTask.taskId}
              </strong>
            </div>
            <button
              type="button"
              className="btn-primary"
              onClick={() => setModalOpen(true)}
              data-testid="btn-open-adjustment-modal"
            >
              <span className="btn-icon">+</span> Điều chỉnh giờ công
            </button>
          </div>

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
                {history.length === 0 ? (
                  <tr>
                    <td colSpan={6}>
                      <div className="table-empty-state">
                        <span className="empty-icon">{ICONS.history}</span>
                        <h3>Chưa có điều chỉnh nào cho công việc này</h3>
                        <p>Bấm "Điều chỉnh giờ công" để tạo bút toán đảo đầu tiên.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  history.map((trace) => (
                    <tr key={trace.adjustmentId} data-testid={`adjustment-row-${trace.adjustmentId}`}>
                      <td>
                        #{trace.originalEntry?.id} · {formatHours(trace.originalEntry?.hours)} giờ
                      </td>
                      <td>
                        #{trace.reversalEntry?.id} · {formatHours(trace.reversalEntry?.hours)} giờ
                      </td>
                      <td>
                        <strong>
                          #{trace.correctedEntry?.id} · {formatHours(trace.correctedEntry?.hours)} giờ
                        </strong>
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

      {modalOpen && activeTask && (
        <AdjustmentModal
          projectId={activeTask.projectId}
          taskId={activeTask.taskId}
          onClose={() => setModalOpen(false)}
          onAdjusted={handleAdjusted}
        />
      )}
    </div>
  );
}
