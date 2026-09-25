import type {
  BillRateCreatePayload,
  BillRateHistoryRes,
  BillRateRes,
  ContractBillRateCreatePayload,
  ContractBillRateRes,
  ResolveBillRateQuery,
  ResolveContractBillRateQuery,
  ResolvedContractBillRateRes,
  ResolvedTimeEntryRateRes,
  TimeEntryLookupCandidateRes,
  TimeEntryLookupEmployeeRes,
  WorkTypeRateFactorPayload,
  WorkTypeRateFactorRes,
} from '../types/rateTypes';
import { httpFetch } from '../../../utils/http';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api/v1';

export class RatesApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode?: number,
    public readonly fieldErrors?: Array<{ field: string; message: string }>
  ) {
    super(message);
    this.name = 'RatesApiError';
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
    response = await httpFetch(url, { ...options, headers });
  } catch {
    throw new RatesApiError(
      'NETWORK_ERROR',
      `Không thể kết nối đến máy chủ Backend (${API_BASE_URL}). Vui lòng kiểm tra lại dịch vụ máy chủ.`,
      503
    );
  }

  const payload = await response.json().catch(() => ({}));

  if (!response.ok || payload.success === false) {
    const code = payload.errorCode || payload.code || (response.status === 403 ? 'FORBIDDEN' : 'UNKNOWN_ERROR');
    let message = payload.message || 'Đã có lỗi xảy ra khi gọi dịch vụ máy chủ Backend.';
    if (payload.fieldErrors && payload.fieldErrors.length > 0) {
      const firstFieldErr = payload.fieldErrors[0];
      message = `${firstFieldErr.message} (${firstFieldErr.field})`;
    } else if (response.status === 403) {
      message = 'Bạn không có quyền thực hiện thao tác này.';
    } else if (response.status === 401) {
      message = 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
    }
    throw new RatesApiError(code, message, response.status, payload.fieldErrors);
  }

  return payload.data as T;
}

/**
 * POST /bill-rates — khai báo một dòng đơn giá (vai trò chuyên môn + cấp bậc +
 * đơn giá theo ngày + ngày hiệu lực). Chỉ Kế toán (VT-05) hoặc Quản trị viên
 * (VT-07); vai trò khác nhận 403 (được backend ghi vào Nhật ký hệ thống).
 * Trùng `(professionalRole, level, effectiveFrom)` trả về 409 DUPLICATE_DATA.
 */
export async function createBillRate(payload: BillRateCreatePayload): Promise<BillRateRes> {
  return requestBackend<BillRateRes>(`${API_BASE_URL}/bill-rates`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/**
 * GET /bill-rates/current — danh sách mỗi cặp (vai trò, cấp bậc) đang có đơn giá
 * hiệu lực tính đến hôm nay. Đơn giá vừa khai báo với `effectiveFrom` trong
 * tương lai sẽ KHÔNG xuất hiện ở đây cho tới đúng ngày hiệu lực — đây là chủ đích
 * (QTN-15), không phải lỗi tải lại danh sách.
 */
export async function fetchCurrentBillRates(): Promise<BillRateRes[]> {
  return requestBackend<BillRateRes[]>(`${API_BASE_URL}/bill-rates/current`, {
    method: 'GET',
  });
}

/**
 * GET /bill-rates/resolve — tra đúng dòng đơn giá có hiệu lực tại một ngày phát
 * sinh cụ thể (`asOf`), dùng khi tính lại doanh thu cho giờ công đã ghi nhận
 * trong quá khứ để không bị ảnh hưởng bởi lần tăng giá sau ngày đó (NCL-07-CN-002,
 * QTN-15). Backend chọn dòng có `effectiveFrom` gần nhất nhưng không vượt quá
 * `asOf`. 404 nghĩa là chưa từng có đơn giá cho vai trò/cấp bậc đó tại thời điểm
 * này — không phải lỗi hệ thống, message backend đã đủ rõ để hiển thị thẳng.
 */
export async function resolveBillRate(query: ResolveBillRateQuery): Promise<BillRateRes> {
  const url = new URL(`${API_BASE_URL}/bill-rates/resolve`);
  url.searchParams.set('professionalRole', query.professionalRole);
  url.searchParams.set('level', query.level);
  url.searchParams.set('asOf', query.asOf);
  return requestBackend<BillRateRes>(url.toString(), { method: 'GET' });
}

/**
 * GET /contracts/{contractId}/bill-rates — danh sách đơn giá riêng đã khai báo
 * cho một hợp đồng cụ thể, mới nhất trước (NCL-07-CN-003). 404 nếu không tìm
 * thấy hợp đồng với `contractId` đó.
 */
export async function fetchContractBillRates(contractId: number): Promise<ContractBillRateRes[]> {
  return requestBackend<ContractBillRateRes[]>(`${API_BASE_URL}/contracts/${contractId}/bill-rates`, {
    method: 'GET',
  });
}

/**
 * POST /contracts/{contractId}/bill-rates — khai báo mức giá đàm phán riêng
 * cho một hợp đồng, ưu tiên hơn bảng đơn giá chung công ty khi tính doanh thu
 * (NCL-07-CN-003, QTN-16). Trùng `(professionalRole, level, effectiveFrom)`
 * trong cùng hợp đồng trả về 409 DUPLICATE_DATA.
 */
export async function createContractBillRate(
  contractId: number,
  payload: ContractBillRateCreatePayload
): Promise<ContractBillRateRes> {
  return requestBackend<ContractBillRateRes>(`${API_BASE_URL}/contracts/${contractId}/bill-rates`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/**
 * GET /contracts/{contractId}/bill-rates/resolve — đơn giá áp dụng cho hợp
 * đồng tại một ngày phát sinh, đã áp quy tắc ưu tiên QTN-16: ưu tiên đơn giá
 * riêng hợp đồng, không có thì tự rơi về đơn giá chung công ty. `404` nếu
 * không tìm thấy hợp đồng, hoặc không có đơn giá hợp lệ (chung lẫn riêng) tại
 * mốc `asOf` — không phải lỗi hệ thống.
 */
export async function resolveContractBillRate(
  contractId: number,
  query: ResolveContractBillRateQuery
): Promise<ResolvedContractBillRateRes> {
  const url = new URL(`${API_BASE_URL}/contracts/${contractId}/bill-rates/resolve`);
  url.searchParams.set('professionalRole', query.professionalRole);
  url.searchParams.set('level', query.level);
  url.searchParams.set('asOf', query.asOf);
  return requestBackend<ResolvedContractBillRateRes>(url.toString(), { method: 'GET' });
}

/**
 * GET /timesheet-entries/{entryId}/bill-rate/resolve?level=... — đơn giá áp
 * dụng cho một dòng giờ công cụ thể (NCL-07-CN-005). Endpoint tổng hợp: chỉ
 * cần `entryId` + `level` (cấp bậc, không tự suy ra được từ hồ sơ nhân sự) —
 * backend tự suy ra vai trò, hợp đồng và ngày phát sinh (= `workDate` của
 * dòng), áp quy tắc ưu tiên QTN-16 rồi nhân hệ số theo `workType`
 * (NCL-07-CN-006) để ra `appliedDailyRate`. `404` nếu không tìm thấy dòng giờ
 * công/hồ sơ nhân sự, hoặc chưa có đơn giá hay hệ số hợp lệ tại thời điểm đó
 * — không phải lỗi hệ thống.
 */
export async function resolveTimeEntryBillRate(entryId: number, level: string): Promise<ResolvedTimeEntryRateRes> {
  const url = new URL(`${API_BASE_URL}/timesheet-entries/${entryId}/bill-rate/resolve`);
  url.searchParams.set('level', level);
  return requestBackend<ResolvedTimeEntryRateRes>(url.toString(), { method: 'GET' });
}

/**
 * GET /timesheet-entries/lookup-employees — danh sách nhân sự đã từng có dòng giờ công được
 * duyệt, để chọn trước khi xem các dòng giờ công của người đó (NCL-07-CN-005) — thay vì phải
 * tự biết trước "ID dòng giờ công".
 */
export async function fetchTimeEntryLookupEmployees(): Promise<TimeEntryLookupEmployeeRes[]> {
  return requestBackend<TimeEntryLookupEmployeeRes[]>(`${API_BASE_URL}/timesheet-entries/lookup-employees`, {
    method: 'GET',
  });
}

/**
 * GET /timesheet-entries/lookup-candidates?userId — danh sách dòng giờ công đã duyệt của một
 * nhân sự đã chọn, để chọn trực tiếp trước khi tra đơn giá (NCL-07-CN-005).
 */
export async function fetchTimeEntryLookupCandidates(userId: number): Promise<TimeEntryLookupCandidateRes[]> {
  const url = new URL(`${API_BASE_URL}/timesheet-entries/lookup-candidates`);
  url.searchParams.set('userId', String(userId));
  return requestBackend<TimeEntryLookupCandidateRes[]>(url.toString(), { method: 'GET' });
}

/**
 * GET /work-type-rates — hệ số nhân đơn giá hiện tại của cả 4 loại hình công
 * việc, sắp theo tên loại hình (NCL-07-CN-006). Cho phép cả Nhân viên chuyên
 * môn (VT-03) xem, ngoài Kế toán/Quản trị viên.
 */
export async function fetchWorkTypeRates(): Promise<WorkTypeRateFactorRes[]> {
  return requestBackend<WorkTypeRateFactorRes[]>(`${API_BASE_URL}/work-type-rates`, { method: 'GET' });
}

/**
 * POST /work-type-rates — khai báo/cập nhật hệ số cho một loại hình công
 * việc. LUÔN GHI ĐÈ giá trị cũ nếu loại hình đó đã có hệ số (không giữ lịch
 * sử theo ngày hiệu lực). Chỉ Kế toán (VT-05) hoặc Quản trị viên (VT-07).
 */
export async function upsertWorkTypeRate(payload: WorkTypeRateFactorPayload): Promise<WorkTypeRateFactorRes> {
  return requestBackend<WorkTypeRateFactorRes>(`${API_BASE_URL}/work-type-rates`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/**
 * GET /bill-rates/history?professionalRole&level — toàn bộ các mốc đơn giá
 * đã từng khai báo cho một cặp (vai trò, cấp bậc), giúp Kế toán giải trình vì
 * sao doanh thu giữa hai kỳ khác nhau (NCL-07-CN-007). `404` nghĩa là vai
 * trò/cấp bậc đó chưa từng có đơn giá nào được khai báo — không phải lỗi hệ
 * thống, khác với `entries` chỉ có 1 mốc (`everChanged: false`, vẫn trả 200).
 */
export async function fetchBillRateHistory(professionalRole: string, level: string): Promise<BillRateHistoryRes> {
  const url = new URL(`${API_BASE_URL}/bill-rates/history`);
  url.searchParams.set('professionalRole', professionalRole);
  url.searchParams.set('level', level);
  return requestBackend<BillRateHistoryRes>(url.toString(), { method: 'GET' });
}
