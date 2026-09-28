import type { Tab } from '../../../layouts/menuConfig';
import type { NotificationRes } from '../types/notificationTypes';

/**
 * Nơi cần mở khi người dùng bấm vào một thông báo (NCL-14-CN-001 TC-02).
 * - `TAB`: chuyển sang một màn hình của App, kèm id bản ghi nếu màn hình đó là trang chi tiết.
 * - `TASK`: mở thẳng tới công việc (vd cảnh báo vượt ngân sách) — App tự tìm dự án chứa công việc
 *   rồi mở cấu trúc công việc của dự án đó, tô sáng đúng dòng công việc.
 * - `PROJECT_WBS`: mở cấu trúc công việc/mốc tiến độ của một dự án.
 * - `NONE`: không có bản ghi để mở (bản tổng hợp, cảnh báo bảo mật) — chỉ đánh dấu đã đọc.
 */
export type NotificationDestination =
  | { kind: 'TAB'; tab: Tab; recordId?: number; label: string }
  | { kind: 'TASK'; taskId: number; label: string }
  | { kind: 'PROJECT_WBS'; projectId: number; label: string }
  | { kind: 'NONE' };

/**
 * Suy ra đích điều hướng từ `targetType` + `referenceId` (xem bảng ở api-contract, mục NCL-14-CN-001).
 * Không dựa vào `referenceType` vì ở một số loại thông báo đó là khóa chống gửi trùng (QTN-27).
 */
export function resolveNotificationDestination(n: NotificationRes): NotificationDestination {
  const id = n.referenceId ?? undefined;
  switch (n.targetType) {
    case 'TASK':
      return id != null
        ? { kind: 'TASK', taskId: id, label: 'công việc liên quan' }
        : { kind: 'TAB', tab: 'MY_WORK', label: 'Công việc và giờ công' };
    case 'TIMESHEET':
      // PM nhận "bảng chấm công mới cần duyệt"; nhân viên nhận "bị từ chối"/"nhắc nộp" cho bảng của chính mình.
      return n.type === 'TIMESHEET_SUBMITTED'
        ? { kind: 'TAB', tab: 'TIMESHEET_APPROVAL', label: 'Duyệt bảng chấm công' }
        : { kind: 'TAB', tab: 'MY_WORK', label: 'Công việc và giờ công' };
    case 'PROJECT':
      if (id == null) return { kind: 'NONE' };
      return n.type === 'NEGATIVE_MARGIN_ALERT'
        ? { kind: 'TAB', tab: 'PROJECT_MARGIN', recordId: id, label: 'Biên lợi nhuận dự án' }
        : { kind: 'PROJECT_WBS', projectId: id, label: 'dự án liên quan' };
    case 'INVOICE':
      return id != null
        ? { kind: 'TAB', tab: 'INVOICE_DETAIL', recordId: id, label: 'Chi tiết hóa đơn' }
        : { kind: 'TAB', tab: 'INVOICES', label: 'Hóa đơn' };
    case 'INVOICE_PROPOSAL':
      return { kind: 'TAB', tab: 'INVOICES', label: 'Hóa đơn' };
    case 'ACCEPTANCE_CERTIFICATE':
      return id != null
        ? { kind: 'TAB', tab: 'ACCEPTANCE_DETAIL', recordId: id, label: 'Chi tiết phiếu nghiệm thu' }
        : { kind: 'TAB', tab: 'ACCEPTANCES', label: 'Nghiệm thu' };
    case 'CONTRACT':
      return id != null
        ? { kind: 'TAB', tab: 'CONTRACT_DETAIL', recordId: id, label: 'Chi tiết hợp đồng' }
        : { kind: 'TAB', tab: 'CONTRACTS', label: 'Hợp đồng' };
    case 'EXPENSE':
      return { kind: 'TAB', tab: 'EXPENSE_APPROVAL', label: 'Duyệt chi phí' };
    case 'NONE':
    default:
      return { kind: 'NONE' };
  }
}

/** Thông báo có dẫn tới một bản ghi cụ thể hay không — để hiển thị gợi ý "Mở …" trên dòng. */
export function hasNotificationTarget(n: NotificationRes): boolean {
  return resolveNotificationDestination(n).kind !== 'NONE';
}
