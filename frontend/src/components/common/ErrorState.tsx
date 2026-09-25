import type { ReactNode } from 'react';

interface ErrorStateProps {
  /** Điều gì không làm được, vd. "Không tải được danh sách hợp đồng". */
  title: string;
  /** Chi tiết lỗi (thông điệp từ API) — tuỳ chọn. */
  message?: ReactNode;
  /** Icon Phosphor từ `ICONS` (thường là `ICONS.alertTriangle`) — tuỳ chọn. */
  icon?: ReactNode;
  /** Có truyền thì hiện nút "Thử lại". */
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
  'data-testid'?: string;
}

/**
 * Khối lỗi tải dữ liệu dùng chung — đúng markup `.table-error-state` các trang đang viết tay,
 * có `role="alert"` để trình đọc màn hình báo ngay khi lỗi xuất hiện.
 */
export default function ErrorState({
  title,
  message,
  icon,
  onRetry,
  retryLabel = 'Thử lại',
  className = '',
  'data-testid': testId,
}: ErrorStateProps) {
  return (
    <div className={`table-error-state ${className}`.trim()} role="alert" data-testid={testId}>
      {icon ? <div className="table-error-state__icon" aria-hidden="true">{icon}</div> : null}
      <div className="table-error-state__body">
        <h3>{title}</h3>
        {message ? <p>{message}</p> : null}
      </div>
      {onRetry ? (
        <button type="button" className="btn btn-secondary" onClick={onRetry}>
          {retryLabel}
        </button>
      ) : null}
    </div>
  );
}
