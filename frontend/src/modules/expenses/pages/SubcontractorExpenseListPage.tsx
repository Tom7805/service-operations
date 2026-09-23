import { useCallback, useEffect, useState } from 'react';
import { ICONS } from '../../../components/common/icons';
import type { ProjectRes } from '../../projects/types/projectTypes';
import { getProject, ProjectsApiError } from '../../projects/api/projectsApi';
import { getProjectSubcontractorExpenses, ExpensesApiError } from '../api/expensesApi';
import SubcontractorExpenseFormModal from '../components/SubcontractorExpenseFormModal';
import type { SubcontractorExpenseRes } from '../types/expenseTypes';
import { EXPENSE_STATUS_LABELS, EXPENSE_STATUS_PILL_CLASS } from '../types/expenseTypes';

export interface SubcontractorExpenseListPageProps {
  projectId: number;
  currentUserRoles?: string[];
  onBack?: () => void;
  initialProject?: ProjectRes;
  initialExpenses?: SubcontractorExpenseRes[];
}

function formatAmount(amount: number): string {
  return new Intl.NumberFormat('vi-VN').format(amount) + ' đ';
}

/**
 * Màn "Chi phí thuê ngoài" của Quản lý dự án (NCL-08-CN-004). VT-02 ghi nhận chi phí thuê
 * nhà thầu phụ cho dự án đang `RUNNING`; phiếu tạo mới ở trạng thái `SUBMITTED`, chờ Kế toán
 * (VT-05) duyệt/từ chối ở một màn hình khác (ngoài phạm vi story này).
 */
export default function SubcontractorExpenseListPage({
  projectId,
  currentUserRoles = ['VT-02'],
  onBack,
  initialProject,
  initialExpenses,
}: SubcontractorExpenseListPageProps) {
  // Quyền xem khớp backend GET /projects/{id}/subcontractor-expenses: VT-02, VT-05.
  const canView = currentUserRoles.includes('VT-02') || currentUserRoles.includes('VT-05');
  // Quyền ghi nhận (NCL-08-CN-004): chỉ Quản lý dự án.
  const canCreate = currentUserRoles.includes('VT-02');

  const [project, setProject] = useState<ProjectRes | null>(initialProject ?? null);
  const [expenses, setExpenses] = useState<SubcontractorExpenseRes[]>(initialExpenses ?? []);
  const [loading, setLoading] = useState(!initialProject || !initialExpenses);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const isProjectOpen = project?.status === 'RUNNING';
  const canOpenForm = canCreate && isProjectOpen;

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 6000);
  };

  const loadData = useCallback(async () => {
    if (!canView) return;
    setLoading(true);
    setError(null);
    try {
      const [projData, expenseData] = await Promise.all([
        getProject(projectId),
        getProjectSubcontractorExpenses(projectId),
      ]);
      setProject(projData);
      setExpenses(expenseData);
    } catch (err) {
      const message =
        err instanceof ExpensesApiError || err instanceof ProjectsApiError || err instanceof Error
          ? err.message
          : 'Không thể tải danh sách chi phí thuê ngoài.';
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

  if (!canView) {
    return (
      <div className="user-management-page" data-testid="subcontractor-expense-forbidden">
        <div className="alert-box alert-box--danger" role="alert">
          Bạn không có quyền xem chi phí thuê ngoài của dự án này (yêu cầu vai trò Quản lý dự
          án VT-02 hoặc Kế toán VT-05).
        </div>
        {onBack && (
          <button type="button" className="btn btn-secondary" onClick={onBack} style={{ marginTop: '16px' }}>
            {ICONS.arrowLeft} Quay lại
          </button>
        )}
      </div>
    );
  }

  const totalAmount = expenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="user-management-page" data-testid="subcontractor-expense-page">
      {toast && (
        <div
          className={`alert-box alert-box--${toast.type === 'success' ? 'success' : 'danger'}`}
          role="status"
          style={{ marginBottom: '16px' }}
          data-testid="subcontractor-expense-toast"
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
              data-testid="btn-back-subcontractor-expenses"
            >
              {ICONS.arrowLeft} Quay lại
            </button>
          )}
          <div>
            <div className="page-header__kicker">
              <span className="page-header__tag">{ICONS.briefcase} CHI PHÍ THUÊ NGOÀI</span>
              <span className="page-header__dot" />
              <span className="page-header__meta">{project?.projectCode || `Mã: ${projectId}`}</span>
            </div>
            <h1 className="page-title" style={{ margin: '4px 0' }}>
              Chi phí thuê ngoài
            </h1>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={loadData}
            disabled={loading}
            data-testid="btn-reload-subcontractor-expenses"
          >
            {ICONS.refresh} Tải lại
          </button>
          {canCreate && (
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => setIsFormOpen(true)}
              disabled={!canOpenForm}
              title={!isProjectOpen ? 'Dự án đã đóng hoặc tạm dừng, không thể ghi nhận thêm chi phí' : undefined}
              data-testid="btn-add-subcontractor-expense"
            >
              + Ghi nhận chi phí thuê ngoài
            </button>
          )}
        </div>
      </div>

      {project && !isProjectOpen && canCreate && (
        <div
          className="alert-box alert-box--warning"
          role="alert"
          data-testid="subcontractor-expense-project-closed-alert"
          style={{ marginBottom: '16px' }}
        >
          Dự án đã đóng hoặc tạm dừng (trạng thái: {project.status}). Không thể ghi nhận thêm chi phí thuê
          ngoài cho dự án này.
        </div>
      )}

      {error && (
        <div className="alert-box alert-box--danger" role="alert" data-testid="subcontractor-expense-error" style={{ marginBottom: '16px' }}>
          {error}
        </div>
      )}

      <div className="user-table-card" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--ink-strong)' }}>
            Danh sách chi phí thuê ngoài
          </h3>
          <span className="field-hint" style={{ fontSize: '13px' }}>
            {expenses.length} phiếu · Tổng: <strong>{formatAmount(totalAmount)}</strong>
          </span>
        </div>

        {loading ? (
          <div className="table-loading-state" data-testid="subcontractor-expense-loading">
            <span className="spinner-lg" />
            <p style={{ marginTop: '10px' }}>Đang tải danh sách chi phí thuê ngoài...</p>
          </div>
        ) : expenses.length === 0 ? (
          <div className="table-empty-state" data-testid="subcontractor-expense-empty">
            <div className="table-empty-state__icon">{ICONS.briefcase}</div>
            <h4 style={{ margin: '0 0 6px', fontSize: '15px', color: 'var(--ink-strong)' }}>Chưa có chi phí thuê ngoài nào</h4>
            <p style={{ margin: 0, color: 'var(--ink-muted)', fontSize: '13.5px' }}>
              {canOpenForm
                ? 'Hãy bấm nút "+ Ghi nhận chi phí thuê ngoài" ở trên để bắt đầu.'
                : 'Dự án này chưa ghi nhận chi phí thuê ngoài nào.'}
            </p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="user-data-table">
              <thead>
                <tr>
                  <th>Nhà thầu</th>
                  <th>Phạm vi công việc</th>
                  <th style={{ textAlign: 'right' }}>Số tiền</th>
                  <th>Kỳ phát sinh</th>
                  <th>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((expense) => (
                  <tr key={expense.id} data-testid={`subcontractor-expense-row-${expense.id}`}>
                    <td>
                      <strong>{expense.contractorName}</strong>
                    </td>
                    <td style={{ maxWidth: '320px', whiteSpace: 'normal' }}>{expense.workScope}</td>
                    <td style={{ textAlign: 'right' }}>
                      <strong>{formatAmount(expense.amount)}</strong>
                    </td>
                    <td>{expense.incurredPeriod}</td>
                    <td>
                      <span
                        className={`status-pill ${EXPENSE_STATUS_PILL_CLASS[expense.status]}`}
                        data-testid={`subcontractor-expense-status-${expense.id}`}
                      >
                        <i className="status-pill__dot" />
                        {EXPENSE_STATUS_LABELS[expense.status]}
                      </span>
                      {expense.status === 'REJECTED' && expense.rejectReason && (
                        <div className="field-hint" style={{ marginTop: '4px', fontSize: '11.5px' }}>
                          Lý do: {expense.rejectReason}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <SubcontractorExpenseFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        projectId={projectId}
        onSaved={(newExpense) => {
          showToast(`Đã ghi nhận chi phí thuê ngoài "${newExpense.contractorName}" thành công`);
          void loadData();
        }}
      />
    </div>
  );
}
