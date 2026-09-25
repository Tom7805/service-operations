import type { ReactNode } from 'react';

interface EmptyStateProps {
  /** Câu nói điều gì đang trống — viết sentence case, không dấu chấm cuối. */
  title: string;
  /** Một câu hướng dẫn bước tiếp theo (vd. "Bấm Thêm mới để tạo bản ghi đầu tiên."). */
  description?: ReactNode;
  /** Icon Phosphor từ `ICONS` (components/common/icons) — tuỳ chọn. */
  icon?: ReactNode;
  /** Nút hành động (thường là `.btn btn-primary btn-sm`). */
  action?: ReactNode;
  className?: string;
  'data-testid'?: string;
}

/**
 * Trạng thái rỗng dùng chung — dựng đúng markup `.table-empty-state` mà các trang đang viết tay,
 * để trang mới không phải chép lại bốn dòng JSX giống hệt nhau.
 */
export default function EmptyState({
  title,
  description,
  icon,
  action,
  className = '',
  'data-testid': testId,
}: EmptyStateProps) {
  return (
    <div className={`table-empty-state ${className}`.trim()} data-testid={testId}>
      {icon ? <div className="table-empty-state__icon" aria-hidden="true">{icon}</div> : null}
      <h3>{title}</h3>
      {description ? <p>{description}</p> : null}
      {action}
    </div>
  );
}
