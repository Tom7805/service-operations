import type {
  ExpenseBillableReq,
  ExpenseCreateReq,
  ExpenseRejectReq,
  ExpenseRes,
  OverheadAllocationRes,
  OverheadAllocationRunReq,
  SubcontractorExpenseCreateReq,
  SubcontractorExpenseRes,
} from '../types/expenseTypes';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api/v1';

export class ExpensesApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode?: number,
    public readonly fieldErrors?: Array<{ field: string; message: string }>
  ) {
    super(message);
    this.name = 'ExpensesApiError';
  }
}

async function requestBackend<T>(url: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };

  if (token) headers['Authorization'] = `Bearer ${token}`;

  let response: Response;
  try {
    response = await fetch(url, { ...options, headers });
  } catch {
    throw new ExpensesApiError('NETWORK_ERROR', `Không thể kết nối đến máy chủ Backend (${API_BASE_URL}).`, 503);
  }

  const payload = await response.json().catch(() => ({}));

  if (!response.ok || payload.success === false) {
    const code = payload.errorCode || payload.code || (response.status === 403 ? 'FORBIDDEN' : 'UNKNOWN_ERROR');
    let message = payload.message || 'Đã có lỗi xảy ra khi gọi dịch vụ máy chủ Backend.';
    if (response.status === 403) message = payload.message || 'Bạn không có quyền thực hiện thao tác này.';
    if (response.status === 401) message = 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
    if (payload.fieldErrors && payload.fieldErrors.length > 0) {
      const first = payload.fieldErrors[0];
      message = `${first.message} (${first.field})`;
    }
    throw new ExpensesApiError(code, message, response.status, payload.fieldErrors);
  }

  return payload.data as T;
}

/**
 * NCL-08-CN-001: ghi nhận một phiếu chi phí phát sinh của dự án. Chỉ Nhân viên chuyên môn
 * (VT-03) và dự án phải đang `RUNNING` — nếu không, backend trả `400 INVALID_STATE`. Phiếu
 * tạo mới luôn ở trạng thái `SUBMITTED`, chờ Kế toán duyệt (NCL-08-CN-002).
 * POST /projects/{projectId}/expenses
 */
export async function createExpense(projectId: number, payload: ExpenseCreateReq): Promise<ExpenseRes> {
  return requestBackend<ExpenseRes>(`${API_BASE_URL}/projects/${projectId}/expenses`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/**
 * NCL-08-CN-001: sửa và nộp lại một phiếu chi phí đang ở trạng thái `REJECTED`. Chỉ người
 * tạo phiếu (VT-03) mới được sửa — backend trả `403 FORBIDDEN` nếu không phải chủ phiếu và
 * `400 INVALID_STATE` nếu phiếu không ở trạng thái `REJECTED`. Nộp lại chuyển phiếu về
 * `SUBMITTED` và xóa thông tin từ chối cũ.
 * PUT /expenses/{expenseId}
 */
export async function updateRejectedExpense(expenseId: number, payload: ExpenseCreateReq): Promise<ExpenseRes> {
  return requestBackend<ExpenseRes>(`${API_BASE_URL}/expenses/${expenseId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

/**
 * NCL-08-CN-002: hàng chờ duyệt của Kế toán (VT-05) — các phiếu chi phí đang `SUBMITTED`,
 * sắp xếp theo ngày phát sinh tăng dần rồi tới mã phiếu.
 * GET /expenses/pending
 */
export async function getPendingExpenses(): Promise<ExpenseRes[]> {
  return requestBackend<ExpenseRes[]>(`${API_BASE_URL}/expenses/pending`, {
    method: 'GET',
  });
}

/**
 * NCL-08-CN-002: duyệt một phiếu chi phí đang `SUBMITTED`. Không cần request body.
 * Phiếu chuyển sang `APPROVED`, chỉ phiếu `APPROVED` được tính vào giá vốn dự án.
 * POST /expenses/{expenseId}/approve
 */
export async function approveExpense(expenseId: number): Promise<ExpenseRes> {
  return requestBackend<ExpenseRes>(`${API_BASE_URL}/expenses/${expenseId}/approve`, {
    method: 'POST',
  });
}

/**
 * NCL-08-CN-002: từ chối một phiếu chi phí đang `SUBMITTED` — `reason` bắt buộc. Phiếu giữ
 * nguyên dữ liệu gốc và lưu lý do để người tạo sửa, nộp lại.
 * POST /expenses/{expenseId}/reject
 */
export async function rejectExpense(expenseId: number, payload: ExpenseRejectReq): Promise<ExpenseRes> {
  return requestBackend<ExpenseRes>(`${API_BASE_URL}/expenses/${expenseId}/reject`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/**
 * Danh sách chi phí của một dự án — dành cho Quản lý dự án (VT-02), Nhân viên chuyên môn
 * (VT-03) và Kế toán (VT-05). Dùng làm màn xem/đánh dấu tính lại cho khách hàng (NCL-08-CN-003).
 * GET /projects/{projectId}/expenses
 */
export async function getProjectExpenses(projectId: number): Promise<ExpenseRes[]> {
  return requestBackend<ExpenseRes[]>(`${API_BASE_URL}/projects/${projectId}/expenses`, {
    method: 'GET',
  });
}

/**
 * NCL-08-CN-003: đánh dấu/bỏ đánh dấu một phiếu chi phí `APPROVED` là tính lại cho khách
 * hàng. Chỉ Quản lý dự án (VT-02). Idempotent — gửi lại cùng giá trị không tạo thêm thay đổi
 * dữ liệu ngoài bản ghi audit. Backend trả `400 INVALID_STATE` nếu phiếu chưa duyệt hoặc nếu
 * bỏ đánh dấu một phiếu đã nằm trong hóa đơn.
 * PUT /expenses/{expenseId}/billable
 */
export async function updateExpenseBillable(expenseId: number, payload: ExpenseBillableReq): Promise<ExpenseRes> {
  return requestBackend<ExpenseRes>(`${API_BASE_URL}/expenses/${expenseId}/billable`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

/**
 * NCL-08-CN-004: ghi nhận một phiếu chi phí thuê ngoài (nhà thầu phụ) cho dự án. Chỉ Quản
 * lý dự án (VT-02) và dự án phải đang `RUNNING` — nếu không, backend trả `400 INVALID_STATE`.
 * Phiếu tạo mới luôn ở trạng thái `SUBMITTED`, chờ Kế toán duyệt.
 * POST /projects/{projectId}/subcontractor-expenses
 */
export async function createSubcontractorExpense(
  projectId: number,
  payload: SubcontractorExpenseCreateReq
): Promise<SubcontractorExpenseRes> {
  return requestBackend<SubcontractorExpenseRes>(`${API_BASE_URL}/projects/${projectId}/subcontractor-expenses`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/**
 * Danh sách chi phí thuê ngoài của một dự án — dành cho Quản lý dự án (VT-02) và Kế toán
 * (VT-05). Dùng làm màn xem của Quản lý dự án (NCL-08-CN-004); duyệt/từ chối của Kế toán
 * nằm ngoài phạm vi màn hình này.
 * GET /projects/{projectId}/subcontractor-expenses
 */
export async function getProjectSubcontractorExpenses(projectId: number): Promise<SubcontractorExpenseRes[]> {
  return requestBackend<SubcontractorExpenseRes[]>(`${API_BASE_URL}/projects/${projectId}/subcontractor-expenses`, {
    method: 'GET',
  });
}

/**
 * NCL-08-CN-002: hàng chờ duyệt chi phí thuê ngoài của Kế toán (VT-05) — CN-004 (ghi nhận
 * chi phí thuê ngoài) phụ thuộc trực tiếp vào story này để đưa phiếu vào giá vốn dự án, nên
 * cùng dùng chung màn "Duyệt chi phí dự án" với chi phí nội bộ.
 * GET /subcontractor-expenses/pending
 */
export async function getPendingSubcontractorExpenses(): Promise<SubcontractorExpenseRes[]> {
  return requestBackend<SubcontractorExpenseRes[]>(`${API_BASE_URL}/subcontractor-expenses/pending`, {
    method: 'GET',
  });
}

/**
 * NCL-08-CN-002: duyệt một phiếu chi phí thuê ngoài đang `SUBMITTED`. Không cần request body.
 * POST /subcontractor-expenses/{expenseId}/approve
 */
export async function approveSubcontractorExpense(expenseId: number): Promise<SubcontractorExpenseRes> {
  return requestBackend<SubcontractorExpenseRes>(`${API_BASE_URL}/subcontractor-expenses/${expenseId}/approve`, {
    method: 'POST',
  });
}

/**
 * NCL-08-CN-002: từ chối một phiếu chi phí thuê ngoài đang `SUBMITTED` — `reason` bắt buộc.
 * POST /subcontractor-expenses/{expenseId}/reject
 */
export async function rejectSubcontractorExpense(
  expenseId: number,
  payload: ExpenseRejectReq
): Promise<SubcontractorExpenseRes> {
  return requestBackend<SubcontractorExpenseRes>(`${API_BASE_URL}/subcontractor-expenses/${expenseId}/reject`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/**
 * NCL-08-CN-005: chạy phân bổ chi phí chung cho kỳ (tháng) theo tỷ trọng giờ công đã duyệt
 * của từng dự án trong kỳ. Chỉ Kế toán (VT-05). Mỗi kỳ chỉ được phân bổ một lần — chạy lại
 * cho kỳ đã phân bổ nhận `400 DUPLICATE_DATA`; kỳ chưa có giờ công nào được duyệt nhận
 * `400 INVALID_STATE`. Không có endpoint đọc lại lịch sử — kết quả chỉ trả về ngay sau khi
 * chạy (đã được ghi Nhật ký hệ thống ở backend).
 * POST /overhead-allocations/run
 */
export async function runOverheadAllocation(payload: OverheadAllocationRunReq): Promise<OverheadAllocationRes> {
  return requestBackend<OverheadAllocationRes>(`${API_BASE_URL}/overhead-allocations/run`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
