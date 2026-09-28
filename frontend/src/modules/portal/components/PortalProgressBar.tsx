interface Props {
  percent: number;
  /** Nhãn cho trình đọc màn hình. */
  label: string;
  size?: 'sm' | 'md';
}

/** Thanh tiến độ 0–100% dùng chung trên cổng (dự án, hạng mục). */
export default function PortalProgressBar({ percent, label, size = 'md' }: Props) {
  const value = Math.max(0, Math.min(100, Math.round(Number.isFinite(percent) ? percent : 0)));
  return (
    <div
      className={`portal-progress portal-progress--${size}`}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={value}
    >
      <div className={`portal-progress__bar${value === 100 ? ' portal-progress__bar--done' : ''}`} style={{ width: `${value}%` }} />
    </div>
  );
}

export function formatPortalDate(value?: string | null): string {
  if (!value) return '—';
  const d = new Date(`${value.length === 10 ? `${value}T00:00:00` : value}`);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString('vi-VN');
}
