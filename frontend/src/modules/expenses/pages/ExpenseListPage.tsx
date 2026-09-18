import { useCallback, useEffect, useState } from 'react';
import { ICONS } from '../../../components/common/icons';
import type { ProjectRes } from '../../projects/types/projectTypes';
import { getProject, ProjectsApiError } from '../../projects/api/projectsApi';
import { getProjectExpenses, ExpensesApiError } from '../api/expensesApi';
import ExpenseBillableToggle from '../components/ExpenseBillableToggle';
import ExpenseFormModal from '../components/ExpenseFormModal';
import type { ExpenseRes } from '../types/expenseTypes';
import { EXPENSE_STATUS_LABELS, EXPENSE_STATUS_PILL_CLASS, EXPENSE_TYPE_LABELS } from '../types/expenseTypes';

export interface ExpenseListPageProps {
  projectId: number;
  currentUserRoles?: string[];
  /** Id tài khoản đang đăng nhập — dùng để chỉ cho phép người tạo sửa & nộp lại phiếu của
   * chính mình (NCL-08-CN-001). Không truyền thì ẩn hẳn nút "Sửa & nộp lại". */
  currentUserId?: number;
  onBack?: () => void;
  initialProject?: ProjectRes;
  initialExpenses?: ExpenseRes[];
}

function formatAmount(amount: number): string {
  return new Intl.NumberFormat('vi-VN').format(amount) + ' đ';
}

/**
 * Danh sách chi phí của một dự án, dùng cho:
 * - NCL-08-CN-001: Nhân viên chuyên môn (`VT-03`) ghi nhận chi phí mới, sửa & nộp lại phiếu
 *   bị từ chối của chính mình.
 * - NCL-08-CN-003: Quản lý dự án (`VT-02`) đánh dấu/bỏ đánh dấu chi phí `APPROVED` tính lại
 *   cho khách hàng.
 * - Xem chung (không thao tác) cho Kế toán (`VT-05`) — khớp quyền `GET
 *   /projects/{projectId}/expenses` phía backend.
 */
export default function ExpenseListPage({
  projectId,
  currentUserRoles = ['VT-02'],
  currentUserId,
  onBack,
  initialProject,
  initialExpenses,
}: ExpenseListPageProps) {
  // Quyền xem khớp backend: VT-02, VT-03, VT-05 (không gồm VT-01).
  const canView =
    currentUserRoles.includes('VT-02') ||
    currentUserRoles.includes('VT-03') ||
    currentUserRoles.includes('VT-05');
  // Quyền đánh dấu tính lại cho khách hàng (NCL-08-CN-003): chỉ Quản lý dự án.
  const canMarkBillable = currentUserRoles.includes('VT-02');
  // Quyền ghi nhận / sửa & nộp lại (NCL-08-CN-001): chỉ Nhân viên chuyên môn.
  const canRecord = currentUserRoles.includes('VT-03');

  const [project, setProject] = useState<ProjectRes | null>(initialProject ?? null);
  const [expenses, setExpenses] = useState<ExpenseRes[]>(initialExpenses ?? []);
  const [loading, setLoading] = useState(!initialProject || !initialExpenses);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ExpenseRes | null>(null);

  const isProjectOpen = project?.status === 'RUNNING';
  const canOpenCreateForm = canRecord && isProjectOpen;

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 6000);
  };

  const loadData = useCallback(async () => {
    if (!canView) return;
    setLoading(true);
    setError(null);
    try {
      const [projData, expenseData] = await Promise.all([getProject(projectId), getProjectExpenses(projectId)]);
      setProject(projData);
      setExpenses(expenseData);
    } catch (err) {
      const message =
        err instanceof ExpensesApiError || err instanceof ProjectsApiError || err instanceof Error
          ? err.message
          : 'Không thể tải danh sách chi phí dự án.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [projectId, canView]);

  useEffect(() => {
    if (!initialProject || !initialExpenses) {
      void loadData();
    }
  }, [loadData, initialProject, initialExpenses]);

  const openCreateForm = () => {
    setEditingExpense(null);
    setIsFormOpen(true);
  };

  const openEditForm = (expense: ExpenseRes) => {
    setEditingExpense(expense);
    setIsFormOpen(true);
  };

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
              <span className="page-header__meta">{project?.projectCode || `Mã: ${projectId}`}</span>
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
          {canRecord && (
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={openCreateForm}
              disabled={!canOpenCreateForm}
              title={!isProjectOpen ? 'Dự án đã đóng hoặc tạm dừng, không thể ghi nhận thêm chi phí' : undefined}
              data-testid="btn-add-expense"
            >
              + Ghi nhận chi phí
            </button>
          )}
        </div>
      </div>

      {project && !isProjectOpen && canRecord && (
        <div className="alert-box alert-box--warning" role="alert" data-testid="expense-project-closed-alert" style={{ marginBottom: '16px' }}>
          Dự án đã đóng hoặc tạm dừng (trạng thái: {project.status}). Không thể ghi nhận thêm chi phí cho dự
          án này.
        </div>
      )}

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
              {canOpenCreateForm
                ? 'Hãy bấm nút "+ Ghi nhận chi phí" ở trên để bắt đầu.'
                : 'Dự án này chưa ghi nhận phiếu chi phí nào.'}
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
                  {(canMarkBillable || canRecord) && <th style={{ width: '150px' }}></th>}
                </tr>
              </thead>
              <tbody>
                {expenses.map((expense) => {
                  const canEditThis =
                    canRecord && expense.status === 'REJECTED' && currentUserId != null && expense.userId === currentUserId;
                  return (
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
                        {expense.status === 'REJECTED' && expense.rejectReason && (
                          <div className="field-hint" style={{ marginTop: '4px', fontSize: '11.5px' }}>
                            Lý do: {expense.rejectReason}
                          </div>
                        )}
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
                      {(canMarkBillable || canRecord) && (
                        <td>
                          {canMarkBillable && (
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
                          )}
                          {canEditThis && (
                            <button
                              type="button"
                              className="btn-secondary btn-xs"
                              onClick={() => openEditForm(expense)}
                              data-testid={`btn-edit-expense-${expense.id}`}
                            >
                              {ICONS.edit} Sửa & nộp lại
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ExpenseFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        projectId={projectId}
        expense={editingExpense}
        onSaved={(saved) => {
          showToast(
            editingExpense
              ? `Đã nộp lại phiếu chi phí #${saved.id} thành công.`
              : `Đã ghi nhận phiếu chi phí #${saved.id} thành công.`
          );
          void loadData();
        }}
      />
    </div>
  );
}
