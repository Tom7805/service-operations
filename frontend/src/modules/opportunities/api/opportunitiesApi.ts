import type {
  ForecastQueryParams,
  Opportunity,
  OpportunityClosePayload,
  RevenueForecastData,
  StageHistoryItem,
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
            : response.status === 404
              ? "RESOURCE_NOT_FOUND"
              : "UNKNOWN_ERROR");

    let message = payload.message;

    if (!message) {
      if (response.status === 403) {
        message =
          "Bạn không có quyền thực hiện thao tác này. Chức năng yêu cầu vai trò Nhân viên kinh doanh (VT-04).";
      } else if (response.status === 401) {
        message = "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.";
      } else if (response.status === 404) {
        message = "Không tìm thấy cơ hội bán hàng.";
      } else if (response.status === 400) {
        message = "Dữ liệu yêu cầu không hợp lệ. Vui lòng kiểm tra lại.";
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
 * NCL-03-CN-005 (TC-01, TC-02, TC-03):
 * Ghi nhận kết quả thắng/thua khi đóng cơ hội (POST /opportunities/{opportunityId}/close).
 * Bắt buộc vai trò Nhân viên kinh doanh (VT-04).
 * Điều kiện: Cơ hội phải đang ở giai đoạn đàm phán (NEGOTIATION) và chưa đóng.
 */
export async function closeOpportunity(
  opportunityId: number,
  payload: OpportunityClosePayload,
): Promise<Opportunity> {
  const url = `${API_BASE_URL}/opportunities/${opportunityId}/close`;
  return requestBackend<Opportunity>(url, {
    method: "POST",
    body: JSON.stringify({
      result: payload.result,
      lossReason: payload.result === "LOST" ? payload.lossReason : undefined,
      reasonDetail: payload.reasonDetail?.trim() || undefined,
      competitorName: payload.competitorName?.trim() || undefined,
    }),
  });
}

/**
 * Lấy lịch sử chuyển giai đoạn của cơ hội (GET /opportunities/{opportunityId}/stage-history).
 */
export async function fetchStageHistory(
  opportunityId: number,
): Promise<StageHistoryItem[]> {
  const url = `${API_BASE_URL}/opportunities/${opportunityId}/stage-history`;
  return requestBackend<StageHistoryItem[]>(url, {
    method: "GET",
  });
}

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
 * NCL-03-CN-004:
 * Lấy báo cáo dự báo doanh thu theo xác suất giai đoạn (GET /opportunities/revenue-forecast).
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
