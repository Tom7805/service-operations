import { memo, type ReactNode } from 'react';
import { ICONS } from '../../../components/common/icons';

/**
 * Trạng thái dùng chung cho nhóm trang báo cáo / biên lợi nhuận / quản trị.
 *
 * Khung xương dựng ĐÚNG bố cục của trang thật (dải chỉ số → khối biểu đồ → bảng) để khi
 * dữ liệu về, trang không nhảy — thay cho một khối xám cao cố định hay con quay tròn.
 */

const SKELETON_WIDTHS = ['72%', '54%', '84%', '46%', '66%', '38%', '78%'];

interface ReportSkeletonProps {
  /** data-testid của vùng đang tải — giữ nguyên testid cũ của từng trang. */
  testId?: string;
  /** Nhãn cho trình đọc màn hình. */
  label?: string;
  /** Số ô chỉ số; 0 = không có dải chỉ số. */
  kpis?: number;
  /** Có khối biểu đồ hay không. */
  chart?: boolean;
  /** Số cột và số hàng của bảng; `tableColumns = 0` = không có bảng. */
  tableColumns?: number;
  tableRows?: number;
}

export const ReportSkeleton = memo(function ReportSkeleton({
  testId,
  label = 'Đang tải báo cáo...',
  kpis = 3,
  chart = false,
  tableColumns = 5,
  tableRows = 6,
}: ReportSkeletonProps) {
  return (
    <div className="ia-skeleton" data-testid={testId} role="status" aria-label={label} aria-busy="true">
      {kpis > 0 && (
        <div className="stats-grid ia-skeleton__kpis" aria-hidden="true">
          {Array.from({ length: kpis }).map((_, i) => (
            <div key={i} className="stat-card">
              <span className="skeleton skeleton-text ia-skeleton__kpi-label" />
              <span className="skeleton ia-skeleton__kpi-value" />
            </div>
          ))}
        </div>
      )}
      {chart && <div className="skeleton ia-skeleton__chart" aria-hidden="true" />}
      {tableColumns > 0 && (
        <div className="user-table-card ia-skeleton__table" aria-hidden="true">
          <div className="ia-skeleton__row ia-skeleton__row--head" style={{ ['--ia-cols' as string]: tableColumns }}>
            {Array.from({ length: tableColumns }).map((_, c) => (
              <span key={c} className="skeleton skeleton-text skeleton-text--sm" style={{ width: '48%' }} />
            ))}
          </div>
          {Array.from({ length: tableRows }).map((_, r) => (
            <div key={r} className="ia-skeleton__row" style={{ ['--ia-cols' as string]: tableColumns }}>
              {Array.from({ length: tableColumns }).map((__, c) => (
                <span
                  key={c}
                  className="skeleton skeleton-text"
                  style={{ width: SKELETON_WIDTHS[(r + c) % SKELETON_WIDTHS.length] }}
                />
              ))}
            </div>
          ))}
        </div>
      )}
      <span className="ia-sr-only">{label}</span>
    </div>
  );
});

interface ReportErrorAlertProps {
  message: ReactNode;
  onRetry?: () => void;
  testId?: string;
  retryDisabled?: boolean;
}

/** Khối lỗi có nút "Thử lại" — lỗi mạng tạm thời không bắt người dùng tải lại cả trang. */
export function ReportErrorAlert({ message, onRetry, testId, retryDisabled }: ReportErrorAlertProps) {
  return (
    <div className="alert-box alert-box--danger ia-alert" role="alert" data-testid={testId}>
      <span className="ia-alert__msg">
        <span className="ia-alert__icon" aria-hidden="true">
          {ICONS.alertTriangle}
        </span>
        <span>{message}</span>
      </span>
      {onRetry && (
        <button type="button" className="btn-secondary ia-alert__retry" onClick={onRetry} disabled={retryDisabled}>
          {ICONS.refresh} Thử lại
        </button>
      )}
    </div>
  );
}
