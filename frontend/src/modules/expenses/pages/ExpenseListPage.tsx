import { useCallback, useEffect, useState } from 'react';
import { ICONS } from '../../../components/common/icons';
import { getProjectExpenses, ExpensesApiError } from '../api/expensesApi';
import ExpenseBillableToggle from '../components/ExpenseBillableToggle';
import type { ExpenseRes } from '../types/expenseTypes';
import { EXPENSE_STATUS_LABELS, EXPENSE_STATUS_PILL_CLASS, EXPENSE_TYPE_LABELS } from '../types/expenseTypes';

export interface ExpenseListPageProps {
  projectId: number;
  currentUserRoles?: string[];
  onBack?: () => void;
  initialExpenses?: ExpenseRes[];
}

function formatAmount(amount: number): string {
  return new Intl.NumberFormat('vi-VN').format(amount) + ' đ';
}

/**
 * Danh sách chi phí của một dự án, dùng cho:
 * - NCL-08-CN-003: Quản lý dự án (`VT-02`) đánh dấu/bỏ đánh dấu chi phí `APPROVED` tính lại
 *   cho khách hàng.
 * - Xem chung (không thao tác) cho Nhân viên chuyên môn (`VT-03`) và Kế toán (`VT-05`) —
 *   khớp quyền `GET /projects/{projectId}/expenses` phía backend.
 */
export default function ExpenseListPage({
  projectId,
  currentUserRoles = ['VT-02'],
  onBack,
  initialExpenses,
}: ExpenseListPageProps) {
  // Quyền xem khớp backend: VT-02, VT-03, VT-05 (không gồm VT-01).
  const canView =
    currentUserRoles.includes('VT-02') ||
    currentUserRoles.includes('VT-03') ||
    currentUserRoles.includes('VT-05');
  // Quyền đánh dấu tính lại cho khách hàng (NCL-08-CN-003): chỉ Quản lý dự án.
  const canMarkBillable = currentUserRoles.includes('VT-02');

  const [expenses, setExpenses] = useState<ExpenseRes[]>(initialExpenses ?? []);
  const [loading, setLoading] = useState(!initialExpenses);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 6000);
  };

  const loadData = useCallback(async () => {
    if (!canView) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getProjectExpenses(projectId);
      setExpenses(data);
    } catch (err) {
      const message =
        err instanceof ExpensesApiError || err instanceof Error
          ? err.message
          : 'Không thể tải danh sách chi phí dự án.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [projectId, canView]);

  useEffect(() => {
    if (!initialExpenses) {
      void loadData();
    }
  }, [loadData, initialExpenses]);

  if (!canView) {
    return (
      <div className="user-management-page" data-testid="expense-list-forbidden">
        <div className="alert-box alert-box--danger" role="alert">
          Bạn không có quyền xem chi phí của dự án này (yêu cầu vai trò Quản lý dự án VT-02,
          Nhân viên chuyên môn VT-03 hoặc Kế toán VT-05).
        </div>
        {onBack && (
          <button type="button" className="btn btn-secondary" onClick={onBack} style={{ marginTop: '16px' }}>
            {ICONS.arrowLeft} Quay lại
          </button>
        )}
      </div>
    );
  }

  const billableTotal = expenses
    .filter((e) => e.status === 'APPROVED' && e.billable)
    .reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="user-management-page" data-testid="expense-list-page">
      {toast && (
        <div
          className={`alert-box alert-box--${toast.type === 'success' ? 'success' : 'danger'}`}
          role="status"
          style={{ marginBottom: '16px' }}
          data-testid="expense-list-toast"
        >
          {toast.text}
        </div>
      )}

      <div className="page-header" style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {onBack && (
            <button
              type="button"
              className="btn btn-secondary btn-sm btn-back"
              onClick={onBack}
              data-testid="btn-back-expenses"
            >
              {ICONS.arrowLeft} Quay lại
            </button>
          )}
          <div>
            <div className="page-header__kicker">
              <span className="page-header__tag">{ICONS.receipt} CHI PHÍ DỰ ÁN</span>
              <span className="page-header__dot" />
              <span className="page-header__meta">Dự án #{projectId}</span>
            </div>
            <h1 className="page-title" style={{ margin: '4px 0' }}>
              Chi phí dự án
            </h1>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={loadData}
            disabled={loading}
            data-testid="btn-reload-expenses"
          >
            {ICONS.refresh} Tải lại
          </button>
        </div>
      </div>

      {canMarkBillable && (
        <div className="alert-box" role="note" style={{ marginBottom: '16px' }} data-testid="expense-billable-hint">
          Chỉ phiếu chi phí đã <strong>được duyệt</strong> mới có thể đánh dấu hoặc bỏ đánh dấu tính lại cho
          khách hàng. Phiếu đã nằm trong hóa đơn không thể bỏ đánh dấu.
        </div>
      )}

      {error && (
        <div className="alert-box alert-box--danger" role="alert" data-testid="expense-list-error" style={{ marginBottom: '16px' }}>
          {error}
        </div>
      )}

      <div className="user-table-card" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#1E293B' }}>
            Danh sách phiếu chi phí
          </h3>
          <span className="field-hint" style={{ fontSize: '13px' }}>
            {expenses.length} phiếu · Tổng tính cho KH: <strong>{formatAmount(billableTotal)}</strong>
          </span>
        </div>

        {loading ? (
          <div className="table-loading-state" data-testid="expense-list-loading">
            <span className="spinner-lg" />
            <p style={{ marginTop: '10px' }}>Đang tải danh sách chi phí...</p>
          </div>
        ) : expenses.length === 0 ? (
          <div className="table-empty-state" data-testid="expense-list-empty">
            <div className="table-empty-state__icon">{ICONS.receipt}</div>
            <h4 style={{ margin: '0 0 6px', fontSize: '15px', color: '#1E293B' }}>Chưa có chi phí nào</h4>
            <p style={{ margin: 0, color: '#64748B', fontSize: '13.5px' }}>
              Dự án này chưa ghi nhận phiếu chi phí nào.
            </p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="user-data-table">
              <thead>
                <tr>
                  <th>Mã phiếu</th>
                  <th>Loại chi phí</th>
                  <th style={{ textAlign: 'right' }}>Số tiền</th>
                  <th>Ngày phát sinh</th>
                  <th>Mô tả</th>
                  <th>Trạng thái</th>
                  <th>Tính cho khách hàng</th>
                  {canMarkBillable && <th style={{ width: '150px' }}></th>}
                </tr>
              </thead>
              <tbody>
                {expenses.map((expense) => (
                  <tr key={expense.id} data-testid={`expense-row-${expense.id}`}>
                    <td>#{expense.id}</td>
                    <td>{EXPENSE_TYPE_LABELS[expense.type]}</td>
                    <td style={{ textAlign: 'right' }}>
                      <strong>{formatAmount(expense.amount)}</strong>
                    </td>
                    <td>{expense.expenseDate}</td>
                    <td style={{ maxWidth: '260px', whiteSpace: 'normal' }}>{expense.description}</td>
                    <td>
                      <span className={`status-pill ${EXPENSE_STATUS_PILL_CLASS[expense.status]}`} data-testid={`expense-status-${expense.id}`}>
                        <i className="status-pill__dot" />
                        {EXPENSE_STATUS_LABELS[expense.status]}
                      </span>
                    </td>
                    <td>
                      {expense.billable ? (
                        <span className="badge badge--green" data-testid={`expense-billable-${expense.id}`}>
                          {ICONS.checkCircle} Có
                        </span>
                      ) : (
                        <span className="badge" data-testid={`expense-billable-${expense.id}`}>
                          Không
                        </span>
                      )}
                    </td>
                    {canMarkBillable && (
                      <td>
                        <ExpenseBillableToggle
                          expense={expense}
                          onUpdated={(result) => {
                            setExpenses((prev) => prev.map((e) => (e.id === result.id ? result : e)));
                            showToast(
                              result.billable
                                ? `Đã đánh dấu phiếu #${result.id} tính lại cho khách hàng.`
                                : `Đã bỏ đánh dấu tính lại cho khách hàng của phiếu #${result.id}.`,
                              'success'
                            );
                          }}
                          onError={(message) => showToast(message, 'error')}
                        />
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
