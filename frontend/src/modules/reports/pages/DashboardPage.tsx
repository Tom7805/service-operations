import { useCallback, useState, type FormEvent } from 'react';
import { ICONS } from '../../../components/common/icons';
import { getDashboardSummary, ReportsApiError } from '../api/reportsApi';
import type { DashboardSummaryRes } from '../types/reportTypes';
import DashboardKpiRow from '../components/DashboardKpiRow';

export interface DashboardPageProps {
  currentUserRoles?: string[];
  currentUserName?: string;
  onBack?: () => void;
  /** Mở báo cáo biên lợi nhuận để xem cụ thể dự án nào đang âm biên. */
  onViewNegativeMarginProjects?: () => void;
  /** Mở danh sách hóa đơn để xử lý các hóa đơn quá hạn. */
  onViewOverdueInvoices?: () => void;
}

function firstDayOfMonthISO(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Bảng điều khiển vận hành (NCL-11-CN-001) — 5 chỉ số chính của kỳ chọn cho Ban giám đốc:
 * doanh thu ghi nhận, tỷ suất biên lợi nhuận bình quân, tỷ lệ giờ tính phí, số dự án âm
 * biên và số hóa đơn quá hạn. Chỉ Ban giám đốc (VT-01) được xem — vai trò khác nhận
 * `403 FORBIDDEN` (TC-03), khớp `@PreAuthorize` ở `DashboardController`. Kỳ không có dữ
 * liệu (TC-02) vẫn trả `200` với mọi chỉ số bằng 0, không phải lỗi.
 */
export default function DashboardPage({
  currentUserRoles = ['VT-01'],
  onBack,
  onViewNegativeMarginProjects,
  onViewOverdueInvoices,
}: DashboardPageProps) {
  const canViewScreen = currentUserRoles.includes('VT-01');

  const [fromInput, setFromInput] = useState(firstDayOfMonthISO());
  const [toInput, setToInput] = useState(todayISO());
  const [fieldError, setFieldError] = useState<string | undefined>(undefined);

  const [summary, setSummary] = useState<DashboardSummaryRes | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const loadSummary = useCallback(async (from: string, to: string, isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const data = await getDashboardSummary(from, to);
      setSummary(data);
      setHasSearched(true);
    } catch (err) {
      const message =
        err instanceof ReportsApiError || err instanceof Error
          ? err.message
          : 'Không thể tải bảng điều khiển vận hành.';
      setError(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const handleSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      setFieldError(undefined);
      if (!fromInput || !toInput) {
        setFieldError('Vui lòng chọn đầy đủ "Từ ngày" và "Đến ngày"');
        return;
      }
      if (fromInput > toInput) {
        setFieldError('"Từ ngày" phải không sau "Đến ngày"');
        return;
      }
      void loadSummary(fromInput, toInput);
    },
    [fromInput, toInput, loadSummary]
  );

  if (!canViewScreen) {
    return (
      <div className="access-denied-container" data-testid="dashboard-access-denied">
        <div className="access-denied-card">
          <div className="access-denied-icon">{ICONS.shieldOff}</div>
          <h2>Bạn không có thẩm quyền truy cập màn hình này</h2>
          <p>
            Bảng điều khiển vận hành chỉ dành riêng cho vai trò <strong>Ban giám đốc</strong>.
          </p>
          {onBack && (
            <button type="button" className="btn btn-secondary" onClick={onBack} style={{ marginTop: '16px' }}>
              {ICONS.arrowLeft} Quay lại
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="user-management-page" data-testid="dashboard-page">
      <div className="page-header" style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {onBack && (
            <button
              type="button"
              className="btn btn-secondary btn-sm btn-back"
              onClick={onBack}
              data-testid="btn-back-dashboard"
            >
              {ICONS.arrowLeft} Quay lại
            </button>
          )}
          <div>
            <h1 className="page-title" style={{ margin: '4px 0' }}>
              Bảng điều khiển vận hành
            </h1>
            <p className="page-subtitle">
              Doanh thu, biên lợi nhuận, tỷ lệ giờ tính phí và cảnh báo vận hành của kỳ chọn.
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} noValidate className="user-table-card" style={{ padding: '20px', marginBottom: '16px' }}>
        <div className="toolbar-filters" style={{ display: 'flex', alignItems: 'flex-end', gap: '16px', flexWrap: 'wrap' }}>
          <div className="filter-group">
            <label className="filter-label" htmlFor="dashboard-from">
              Từ ngày <span className="field-required">*</span>
            </label>
            <input
              id="dashboard-from"
              type="date"
              className="form-input"
              style={{ height: 38 }}
              value={fromInput}
              onChange={(e) => setFromInput(e.target.value)}
              disabled={loading || refreshing}
              data-testid="dashboard-from-input"
            />
          </div>
          <div className="filter-group">
            <label className="filter-label" htmlFor="dashboard-to">
              Đến ngày <span className="field-required">*</span>
            </label>
            <input
              id="dashboard-to"
              type="date"
              className="form-input"
              style={{ height: 38 }}
              value={toInput}
              onChange={(e) => setToInput(e.target.value)}
              disabled={loading || refreshing}
              data-testid="dashboard-to-input"
            />
          </div>
          <button
            type="submit"
            className="btn btn-primary btn-sm"
            disabled={loading || refreshing}
            data-testid="btn-view-dashboard"
          >
            {ICONS.search} {loading ? 'Đang tải...' : 'Xem bảng điều khiển'}
          </button>
          {hasSearched && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => loadSummary(fromInput, toInput, true)}
              disabled={loading || refreshing}
              data-testid="btn-refresh-dashboard"
            >
              {refreshing ? <span className="spinner-sm" aria-hidden="true" /> : ICONS.refresh}{' '}
              {refreshing ? 'Đang tải lại...' : 'Làm mới'}
            </button>
          )}
        </div>
        {fieldError && (
          <p className="field-error" data-testid="error-dashboard" style={{ color: 'var(--pale-red-fg)', fontSize: '13.5px', marginTop: '8px' }}>
            {fieldError}
          </p>
        )}
      </form>

      {error && (
        <div className="alert-box alert-box--danger" role="alert" style={{ marginBottom: '16px', justifyContent: 'space-between' }} data-testid="dashboard-error">
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {ICONS.alertTriangle} {error}
          </span>
          <button type="button" className="btn-secondary" onClick={() => loadSummary(fromInput, toInput)}>
            Thử lại
          </button>
        </div>
      )}

      {loading ? (
        <div data-testid="dashboard-loading" role="status" aria-label="Đang tải bảng điều khiển...">
          <div className="skeleton" style={{ height: '88px', marginBottom: '24px' }} />
          <div className="skeleton" style={{ height: '160px' }} />
        </div>
      ) : !hasSearched ? (
        !error && (
          <div className="table-empty-state" data-testid="dashboard-prompt">
            <div className="table-empty-state__icon">{ICONS.chart}</div>
            <p style={{ margin: 0, color: 'var(--ink-muted)', fontSize: '13.5px' }}>
              Chọn khoảng thời gian rồi bấm "Xem bảng điều khiển" để xem các chỉ số vận hành.
            </p>
          </div>
        )
      ) : (
        summary && (
          <>
            {(summary.missingCostEntryCount > 0 || summary.missingRevenueEntryCount > 0) && (
              <div className="alert-box alert-box--warning" role="alert" style={{ marginBottom: '16px' }} data-testid="dashboard-missing-alert">
                <strong>Cảnh báo:</strong>{' '}
                {summary.missingCostEntryCount > 0 && (
                  <>Có {summary.missingCostEntryCount} dòng giờ công đã duyệt thiếu đơn giá vốn. </>
                )}
                {summary.missingRevenueEntryCount > 0 && (
                  <>Có {summary.missingRevenueEntryCount} dòng giờ công tính phí thiếu đơn giá bán. </>
                )}
                Doanh thu và biên lợi nhuận hiển thị có thể thấp hơn thực tế.
              </div>
            )}

            {summary.kpis.recognizedRevenue === 0 &&
              summary.kpis.negativeMarginProjectCount === 0 &&
              summary.kpis.overdueInvoiceCount === 0 && (
                <div className="alert-box" role="status" style={{ marginBottom: '16px' }} data-testid="dashboard-no-data-note">
                  {ICONS.info} Kỳ đã chọn chưa có dữ liệu giờ công/hóa đơn nào — mọi chỉ số hiển thị bằng 0.
                </div>
              )}

            <DashboardKpiRow
              kpis={summary.kpis}
              onViewNegativeMarginProjects={onViewNegativeMarginProjects}
              onViewOverdueInvoices={onViewOverdueInvoices}
            />

            <p style={{ margin: 0, color: 'var(--ink-faint)', fontSize: '12.5px' }} data-testid="dashboard-period-note">
              Kỳ: {summary.from} → {summary.to}
            </p>
          </>
        )
      )}
    </div>
  );
}
