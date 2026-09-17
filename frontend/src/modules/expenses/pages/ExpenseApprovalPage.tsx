import { useCallback, useEffect, useState } from 'react';
import { ICONS } from '../../../components/common/icons';
import { roleLabels } from '../../../utils/roleLabel';
import ExpenseApprovalActionBar from '../components/ExpenseApprovalActionBar';
import { getPendingExpenses, ExpensesApiError } from '../api/expensesApi';
import type { ExpenseRes } from '../types/expenseTypes';
import { EXPENSE_TYPE_LABELS } from '../types/expenseTypes';

export interface ExpenseApprovalPageProps {
  currentUserRoles?: string[];
  currentUserName?: string;
}

function formatAmount(amount: number): string {
  return new Intl.NumberFormat('vi-VN').format(amount) + ' đ';
}

/**
 * Màn "Duyệt chi phí dự án" của Kế toán (NCL-08-CN-002). Kế toán (`VT-05`) xem hàng chờ
 * duyệt, duyệt hoặc từ chối từng phiếu chi phí. Phiếu được duyệt là dữ liệu được phép đưa
 * vào giá vốn dự án; phiếu từ chối giữ nguyên dữ liệu gốc và lưu lý do để người tạo (NCL-08-
 * CN-001) sửa và nộp lại.
 *
 * `GET /expenses/pending` trả về từng phiếu riêng lẻ (khác với hàng chờ duyệt bảng chấm
 * công), nên duyệt/từ chối luôn thao tác theo TỪNG PHIẾU một, không theo nhóm.
 */
export default function ExpenseApprovalPage({
  currentUserRoles = [],
  currentUserName = 'Kế toán',
}: ExpenseApprovalPageProps) {
  // NCL-08-CN-002 TC chung: chỉ Kế toán (VT-05) được duyệt/từ chối chi phí.
  const isAllowed = currentUserRoles.includes('VT-05');

  const [pending, setPending] = useState<ExpenseRes[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 6000);
  };

  const fetchPending = useCallback(async () => {
    if (!isAllowed) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getPendingExpenses();
      setPending(data);
    } catch (err) {
      const message =
        err instanceof ExpensesApiError || err instanceof Error
          ? err.message
          : 'Không thể tải hàng chờ duyệt chi phí.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [isAllowed]);

  useEffect(() => {
    void fetchPending();
  }, [fetchPending]);

  if (!isAllowed) {
    return (
      <div className="access-denied-container">
        <div className="access-denied-card">
          <div className="access-denied-icon">{ICONS.shieldOff}</div>
          <h2>Bạn không có thẩm quyền truy cập màn hình này</h2>
          <p>
            Chức năng Duyệt chi phí dự án chỉ dành riêng cho vai trò <strong>Kế toán</strong>. Hệ thống đã ghi
            lại lần truy cập bị từ chối này vào nhật ký bảo mật.
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

  const totalPendingAmount = pending.reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="user-management-page" data-testid="expense-approval-page">
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
          <h1 className="page-title">Duyệt chi phí dự án</h1>
          <p className="page-subtitle">
            Các phiếu chi phí đang chờ bạn duyệt hoặc từ chối. Phiếu được duyệt sẽ được tính vào giá vốn dự án.
          </p>
        </div>
        <div className="page-header-actions">
          <button type="button" className="btn-icon-refresh" onClick={fetchPending} title="Tải lại" aria-label="Tải lại" disabled={loading}>
            {ICONS.refresh}
          </button>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-card__icon stat-card__icon--blue">{ICONS.clipboardList}</div>
          <div>
            <span className="stat-card__label">Phiếu đang chờ duyệt</span>
            <strong className="stat-card__value">{pending.length}</strong>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card__icon stat-card__icon--amber">{ICONS.money}</div>
          <div>
            <span className="stat-card__label">Tổng số tiền chờ duyệt</span>
            <strong className="stat-card__value">{formatAmount(totalPendingAmount)}</strong>
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
                <th>Mã phiếu</th>
                <th>Dự án</th>
                <th>Loại chi phí</th>
                <th style={{ textAlign: 'right' }}>Số tiền</th>
                <th>Ngày phát sinh</th>
                <th>Mô tả</th>
                <th>Chứng từ</th>
                <th style={{ width: '220px' }}></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '40px' }}>
                    Đang tải hàng chờ duyệt…
                  </td>
                </tr>
              ) : pending.length === 0 ? (
                <tr>
                  <td colSpan={8}>
                    <div className="table-empty-state">
                      <span className="empty-icon">{ICONS.checkCircle}</span>
                      <h3>Không có phiếu chi phí nào đang chờ duyệt</h3>
                      <p>Khi nhân viên chuyên môn ghi nhận chi phí phát sinh của dự án, phiếu sẽ xuất hiện ở đây.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                pending.map((expense) => (
                  <tr key={expense.id} data-testid={`pending-row-${expense.id}`}>
                    <td>#{expense.id}</td>
                    <td>Dự án #{expense.projectId}</td>
                    <td>{EXPENSE_TYPE_LABELS[expense.type]}</td>
                    <td style={{ textAlign: 'right' }}>
                      <strong>{formatAmount(expense.amount)}</strong>
                    </td>
                    <td>{expense.expenseDate}</td>
                    <td style={{ maxWidth: '260px', whiteSpace: 'normal' }}>{expense.description}</td>
                    <td>
                      {expense.receiptUrl ? (
                        <a href={expense.receiptUrl} target="_blank" rel="noreferrer">
                          {ICONS.link} Xem chứng từ
                        </a>
                      ) : (
                        <span className="text-muted">Không có</span>
                      )}
                    </td>
                    <td>
                      <ExpenseApprovalActionBar
                        expense={expense}
                        onApproved={(result) => {
                          showToast(`Đã duyệt phiếu chi phí #${result.id} thành công.`, 'success');
                          setPending((prev) => prev.filter((p) => p.id !== expense.id));
                        }}
                        onRejected={(result) => {
                          showToast(`Đã từ chối phiếu chi phí #${result.id}.`, 'success');
                          setPending((prev) => prev.filter((p) => p.id !== expense.id));
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
          Hiển thị <strong>{pending.length}</strong> phiếu chi phí đang chờ duyệt
        </div>
      </div>
    </div>
  );
}
