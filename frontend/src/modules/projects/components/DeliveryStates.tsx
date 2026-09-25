import type { ReactNode } from 'react';
import { ICONS } from '../../../components/common/icons';

/** Khối báo lỗi tải dữ liệu kèm nút "Thử lại" — dùng chung cho nhóm trang delivery. */
export function LoadError({
  message,
  onRetry,
  retrying = false,
  testId,
}: {
  message: ReactNode;
  onRetry?: () => void;
  retrying?: boolean;
  testId?: string;
}) {
  return (
    <div className="dl-error" role="alert" data-testid={testId}>
      <span className="dl-error__text">{message}</span>
      {onRetry && (
        <button type="button" className="btn btn-secondary btn-sm" onClick={onRetry} disabled={retrying}>
          {ICONS.refresh} {retrying ? 'Đang thử lại…' : 'Thử lại'}
        </button>
      )}
    </div>
  );
}

/** Trạng thái rỗng: nói rõ vì sao trống và bước tiếp theo nên làm gì. */
export function EmptyBlock({
  icon,
  title,
  children,
  action,
  testId,
  compact = false,
}: {
  icon?: ReactNode;
  title: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
  testId?: string;
  compact?: boolean;
}) {
  return (
    <div className={`table-empty-state${compact ? ' dl-empty-compact' : ''}`} data-testid={testId}>
      {icon && (
        <div className="table-empty-state__icon" aria-hidden="true">
          {icon}
        </div>
      )}
      <h4 className="dl-empty-title">{title}</h4>
      {children && <p className="dl-empty-text">{children}</p>}
      {action}
    </div>
  );
}

const SKELETON_WIDTHS = ['72%', '54%', '84%', '46%', '66%', '38%', '78%'];

/** Khung xương dạng bảng, giữ đúng tiêu đề cột thật để bố cục không nhảy khi dữ liệu về. */
export function SkeletonTable({
  headers,
  rows = 4,
  testId,
  label = 'Đang tải dữ liệu…',
}: {
  headers: string[];
  rows?: number;
  testId?: string;
  label?: string;
}) {
  return (
    <div className="table-responsive" data-testid={testId} aria-busy="true">
      <table className="user-data-table">
        <thead>
          <tr>
            {headers.map((h, i) => (
              <th key={i}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, r) => (
            <tr key={r} aria-hidden="true" className="skeleton-row">
              {headers.map((__, c) => (
                <td key={c}>
                  <div className="skeleton skeleton-text" style={{ width: SKELETON_WIDTHS[(r + c) % SKELETON_WIDTHS.length] }} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <span className="dl-sr-only" role="status">
        {label}
      </span>
    </div>
  );
}
