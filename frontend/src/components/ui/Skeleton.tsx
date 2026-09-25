import type { CSSProperties } from 'react';

interface SkeletonProps {
  /** `text` (thanh 11px), `pill`, `avatar` (34px vuông) hoặc `block` (khối tuỳ cao). */
  variant?: 'text' | 'pill' | 'avatar' | 'block';
  width?: CSSProperties['width'];
  height?: CSSProperties['height'];
  className?: string;
}

const VARIANT_CLASS: Record<NonNullable<SkeletonProps['variant']>, string> = {
  text: 'skeleton-text',
  pill: 'skeleton-pill',
  avatar: 'skeleton-avatar',
  block: 'skeleton-card',
};

/**
 * Một mảnh khung xương (`.skeleton`) — luôn `aria-hidden`; nơi dùng tự đặt một thông báo
 * `role="status"` ("Đang tải…") như `TableSkeleton` đã làm.
 */
export default function Skeleton({ variant = 'text', width, height, className = '' }: SkeletonProps) {
  const style = width !== undefined || height !== undefined ? { width, height } : undefined;
  return <div aria-hidden="true" className={`skeleton ${VARIANT_CLASS[variant]} ${className}`.trim()} style={style} />;
}
