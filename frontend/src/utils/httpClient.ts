/**
 * Shared fetch client: injects the bearer token, parses the backend's
 * `{ success, data, message, errorCode, fieldErrors }` envelope, and throws
 * a caller-supplied error type on failure. Extracted so new API modules
 * (e.g. opportunitiesApi) don't have to re-implement this per module.
 */

export interface ApiErrorLike extends Error {
  code: string;
  statusCode?: number;
  fieldErrors?: Array<{ field: string; message: string }>;
}

export interface ApiErrorConstructor<E extends ApiErrorLike> {
  new (
    code: string,
    message: string,
    statusCode?: number,
    fieldErrors?: Array<{ field: string; message: string }>
  ): E;
}

/** Trả về thông điệp mặc định theo mã HTTP khi backend không kèm `message`. */
export type DefaultMessageResolver = (statusCode: number) => string;

export async function requestBackend<T, E extends ApiErrorLike>(
  url: string,
  ErrorType: ApiErrorConstructor<E>,
  resolveDefaultMessage: DefaultMessageResolver,
  options: RequestInit = {}
): Promise<T> {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(url, { ...options, headers });
  } catch {
    throw new ErrorType(
      'NETWORK_ERROR',
      'Không thể kết nối đến máy chủ Backend. Vui lòng kiểm tra lại dịch vụ máy chủ.',
      503
    );
  }

  const payload = await response.json().catch(() => ({}));

  if (!response.ok || payload.success === false) {
    const code = payload.errorCode || payload.code || (response.status === 403 ? 'FORBIDDEN' : 'UNKNOWN_ERROR');
    let message = payload.message || resolveDefaultMessage(response.status);

    if (payload.fieldErrors && payload.fieldErrors.length > 0) {
      const firstFieldErr = payload.fieldErrors[0];
      message = `${firstFieldErr.message} (${firstFieldErr.field})`;
    }

    throw new ErrorType(code, message, response.status, payload.fieldErrors);
  }

  return payload.data as T;
}
