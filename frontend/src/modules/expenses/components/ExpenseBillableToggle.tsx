import { useState } from 'react';
import { ICONS } from '../../../components/common/icons';
import { updateExpenseBillable, ExpensesApiError } from '../api/expensesApi';
import type { ExpenseRes } from '../types/expenseTypes';

interface ExpenseBillableToggleProps {
  expense: ExpenseRes;
  onUpdated: (result: ExpenseRes) => void;
  onError: (message: string) => void;
}

/**
 * Nút đánh dấu / bỏ đánh dấu tính lại chi phí cho khách hàng (NCL-08-CN-003).
 *
 * Chỉ hoạt động trên phiếu đã `APPROVED` — nút bị vô hiệu hóa (kèm chú thích) với phiếu
 * đang chờ duyệt hoặc đã bị từ chối. `PUT /expenses/{id}/billable` là idempotent nên bấm
 * lại cùng trạng thái không tạo thêm thay đổi dữ liệu; lỗi `INVALID_STATE` (ví dụ phiếu đã
 * nằm trong hóa đơn khi bỏ đánh dấu) được hiển thị qua `onError` để người dùng biết lý do.
 */
export default function ExpenseBillableToggle({ expense, onUpdated, onError }: ExpenseBillableToggleProps) {
  const [submitting, setSubmitting] = useState(false);

  const canToggle = expense.status === 'APPROVED';

  const handleToggle = async () => {
    if (!canToggle || submitting) return;
    const nextBillable = !expense.billable;
    setSubmitting(true);
    try {
      const result = await updateExpenseBillable(expense.id, { billable: nextBillable });
      onUpdated(result);
    } catch (err) {
      onError(
        err instanceof ExpensesApiError || err instanceof Error
          ? err.message
          : 'Không thể cập nhật trạng thái tính lại cho khách hàng. Vui lòng thử lại.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!canToggle) {
    return (
      <span className="field-hint" data-testid={`billable-disabled-${expense.id}`}>
        Chỉ áp dụng với phiếu đã duyệt
      </span>
    );
  }

  return (
    <button
      type="button"
      className={expense.billable ? 'btn-secondary btn-xs' : 'btn-primary btn-xs'}
      onClick={() => void handleToggle()}
      disabled={submitting}
      data-testid={`btn-toggle-billable-${expense.id}`}
      aria-pressed={expense.billable}
      title={
        expense.billable
          ? 'Bỏ đánh dấu tính lại chi phí này cho khách hàng'
          : 'Đánh dấu tính lại chi phí này cho khách hàng'
      }
    >
      {submitting ? 'Đang cập nhật…' : expense.billable ? <>{ICONS.close} Bỏ đánh dấu</> : <>{ICONS.tag} Tính cho KH</>}
    </button>
  );
}
