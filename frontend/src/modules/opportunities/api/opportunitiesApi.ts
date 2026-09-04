import type {
  ForecastQueryParams,
  RevenueForecastData,
} from "../types/opportunityTypes";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080/api/v1";

export class OpportunityApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode?: number,
    public readonly fieldErrors?: Array<{ field: string; message: string }>,
  ) {
    super(message);
    this.name = "OpportunityApiError";
  }
}

async function requestBackend<T>(
  url: string,
  options: RequestInit = {},
): Promise<T> {
  const token =
    localStorage.getItem("token") || sessionStorage.getItem("token");
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((options.headers as Record<string, string>) || {}),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(url, { ...options, headers });
  } catch {
    throw new OpportunityApiError(
      "NETWORK_ERROR",
      "Không thể kết nối đến máy chủ Backend. Vui lòng kiểm tra lại dịch vụ máy chủ.",
      503,
    );
  }

  const payload = await response.json().catch(() => ({}));

  if (!response.ok || payload.success === false) {
    const code =
      payload.errorCode ||
      payload.code ||
      (response.status === 403
        ? "FORBIDDEN"
        : response.status === 401
          ? "UNAUTHORIZED"
          : response.status === 400
            ? "VALIDATION_ERROR"
            : "UNKNOWN_ERROR");

    let message = payload.message;

    if (!message) {
      if (response.status === 403) {
        message =
          "Bạn không có quyền xem báo cáo dự báo doanh thu. Chức năng yêu cầu vai trò Ban giám đốc (VT-01) hoặc Nhân viên kinh doanh (VT-04).";
      } else if (response.status === 401) {
        message = "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.";
      } else if (response.status === 400) {
        message =
          "Khoảng ngày lọc không hợp lệ. Ngày bắt đầu không được sau ngày kết thúc.";
      } else {
        message = "Đã có lỗi xảy ra khi gọi dịch vụ máy chủ Backend.";
      }
    }

    if (payload.fieldErrors && payload.fieldErrors.length > 0) {
      const firstFieldErr = payload.fieldErrors[0];
      message = `${firstFieldErr.message} (${firstFieldErr.field})`;
    }

    throw new OpportunityApiError(
      code,
      message,
      response.status,
      payload.fieldErrors,
    );
  }

  return payload.data as T;
}

/**
 * Chuẩn hóa tham số ngày về định dạng YYYY-MM-DD cho Spring Boot LocalDate.
 * Nếu người dùng truyền 'YYYY-MM', bổ sung ngày đầu/cuối tháng.
 */
function normalizeDateParam(val?: string, isEnd = false): string | undefined {
  if (!val || !val.trim()) return undefined;
  const trimmed = val.trim();
  if (/^\d{4}-\d{2}$/.test(trimmed)) {
    if (isEnd) {
      const [year, month] = trimmed.split("-").map(Number);
      const lastDay = new Date(year, month, 0).getDate();
      return `${trimmed}-${String(lastDay).padStart(2, "0")}`;
    }
    return `${trimmed}-01`;
  }
  return trimmed;
}

/**
 * NCL-03-CN-004 (TC-01, TC-02, TC-03):
 * Lấy báo cáo dự báo doanh thu theo xác suất giai đoạn (GET /opportunities/revenue-forecast).
 * Quyền yêu cầu: Ban giám đốc (VT-01) hoặc Nhân viên kinh doanh (VT-04).
 */
export async function fetchRevenueForecast(
  params?: ForecastQueryParams,
): Promise<RevenueForecastData> {
  const url = new URL(`${API_BASE_URL}/opportunities/revenue-forecast`);

  const fromFormatted = normalizeDateParam(params?.from, false);
  const toFormatted = normalizeDateParam(params?.to, true);

  if (fromFormatted) {
    url.searchParams.set("from", fromFormatted);
  }
  if (toFormatted) {
    url.searchParams.set("to", toFormatted);
  }

  return requestBackend<RevenueForecastData>(url.toString(), {
    method: "GET",
  });
}
