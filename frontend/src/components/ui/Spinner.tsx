interface SpinnerProps {
  /** `sm` (14px, theo màu chữ — dùng TRONG nút đang gửi) hoặc `lg` (32px). */
  size?: 'sm' | 'lg';
  /** Nhãn cho trình đọc màn hình; bỏ trống khi chữ cạnh spinner đã nói "Đang…". */
  label?: string;
  className?: string;
}

/**
 * Vòng quay — DESIGN.md chỉ cho phép dùng BÊN TRONG nút đang gửi ("thao tác đang chạy").
 * Nội dung sắp hiện ra thì dùng khung xương (`Skeleton` / `TableSkeleton`), không dùng cái này.
 */
export default function Spinner({ size = 'sm', label, className = '' }: SpinnerProps) {
  return (
    <span
      className={`spinner-${size} ${className}`.trim()}
      role={label ? 'status' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    />
  );
}
