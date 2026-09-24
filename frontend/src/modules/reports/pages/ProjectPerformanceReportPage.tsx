import { useCallback, useEffect, useMemo, useState } from 'react';
import { ICONS } from '../../../components/common/icons';
import MaskedCell from '../../../components/common/MaskedCell';
import { getProjectPerformanceReport, ReportsApiError } from '../api/reportsApi';
import type {
  MaskedCost,
  ProjectPerformanceReportRes,
  ProjectPerformanceRes,
  ProjectPerformanceStatus,
} from '../types/projectPerformanceReportTypes';

export interface ProjectPerformanceReportPageProps {
  currentUserRoles?: string[];
  onBack?: () => void;
  onViewProject?: (projectId: number, projectName: string) => void;
}

const CONTRACT_TYPE_LABELS: Record<string, string> = {
  TIME_AND_MATERIAL: 'Theo giờ công & vật tư',
  FIXED_PRICE: 'Trọn gói (giá cố định)',
  MAINTENANCE: 'Bảo trì định kỳ',
  MILESTONE: 'Theo mốc thanh toán',
};

function contractTypeLabel(value: string): string {
  return CONTRACT_TYPE_LABELS[value] ?? value;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
}

function formatHours(hours: number | null): string {
  if (hours == null) return '—';
  return `${new Intl.NumberFormat('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(hours)} giờ`;
}

/** `*Percent`/`*PercentPoints` đã là số phần trăm 2 chữ số (backend không gửi phân số). */
function formatPercent(value: number | null): string {
  if (value == null) return '—';
  return `${new Intl.NumberFormat('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)}%`;
}

function formatPercentSigned(value: number | null): string {
  if (value == null) return '—';
  const sign = value >= 0 ? '+' : '';
  return `${sign}${formatPercent(value)}`;
}

function formatHoursSigned(value: number | null): string {
  if (value == null) return '—';
  const sign = value >= 0 ? '+' : '';
  return `${sign}${formatHours(value)}`;
}

/** `plannedCost`/`actualCost`/`hoursVarianceCostImpact` luôn là `"***"` với Quản lý dự án (QTN-02). */
function CostCell({ value }: { value: MaskedCost | null }) {
  if (value === null) return <span style={{ color: 'var(--ink-faint)' }}>—</span>;
  if (value === '***') {
    return (
      <MaskedCell canView={false} maskedText="***">
        {value}
      </MaskedCell>
    );
  }
  return <span>{formatCurrency(value)}</span>;
}

/**
 * Báo cáo hiệu quả theo dự án (NCL-11-CN-003) — so kế hoạch trong báo giá với thực tế tính đến hiện
 * tại (toàn thời gian dự án, không giới hạn theo kỳ) theo ba cặp: giờ công, doanh thu/giá trị hợp
 * đồng, biên lợi nhuận. Chỉ Quản lý dự án (VT-02) được xem — vai trò khác nhận `403 FORBIDDEN`
 * (TC-03), khớp `@PreAuthorize` của `ProjectPerformanceReportController`. Chỉ thấy dự án mình phụ
 * trách (QTN-01); các trường giá vốn luôn bị che (`"***"`, QTN-02).
 */
export default function ProjectPerformanceReportPage({
  currentUserRoles = ['VT-02'],
  onBack,
  onViewProject,
}: ProjectPerformanceReportPageProps) {
  const canViewScreen = currentUserRoles.includes('VT-02');

  const [statusFilter, setStatusFilter] = useState<ProjectPerformanceStatus | ''>('');
  const [onlyOverPlannedHours, setOnlyOverPlannedHours] = useState(false);
  const [onlyBelowPlannedMargin, setOnlyBelowPlannedMargin] = useState(false);

  const [report, setReport] = useState<ProjectPerformanceReportRes | null>(null);
  const [loading, setLoading] = useState(canViewScreen);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadReport = useCallback(
    async (isManualRefresh = false) => {
      if (!canViewScreen) return;
      if (isManualRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        const data = await getProjectPerformanceReport(statusFilter || undefined);
        setReport(data);
      } catch (err) {
        const message =
          err instanceof ReportsApiError || err instanceof Error
            ? err.message
            : 'Không thể tải báo cáo hiệu quả theo dự án.';
        setError(message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [canViewScreen, statusFilter]
  );

  useEffect(() => {
    void loadReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, canViewScreen]);

  const filteredProjects = useMemo(() => {
    let projects = report?.projects ?? [];
    if (onlyOverPlannedHours) projects = projects.filter((p) => (p.hoursVariance ?? 0) > 0);
    if (onlyBelowPlannedMargin) projects = projects.filter((p) => (p.marginGapPercentPoints ?? 0) < 0);
    return projects;
  }, [report, onlyOverPlannedHours, onlyBelowPlannedMargin]);

  if (!canViewScreen) {
    return (
      <div className="access-denied-container" data-testid="project-performance-access-denied">
        <div className="access-denied-card">
          <div className="access-denied-icon">{ICONS.shieldOff}</div>
          <h2>Bạn không có thẩm quyền truy cập màn hình này</h2>
          <p>
            Báo cáo hiệu quả theo dự án chỉ dành riêng cho vai trò <strong>Quản lý dự án</strong>.
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
    <div className="user-management-page" data-testid="project-performance-page">
      <div className="page-header" style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {onBack && (
            <button
              type="button"
              className="btn btn-secondary btn-sm btn-back"
              onClick={onBack}
              data-testid="btn-back-project-performance"
            >
              {ICONS.arrowLeft} Quay lại
            </button>
          )}
          <div>
            <h1 className="page-title" style={{ margin: '4px 0' }}>
              Báo cáo hiệu quả theo dự án
            </h1>
            <p className="page-subtitle">
              So kế hoạch trong báo giá với thực tế tính đến hiện tại của các dự án bạn quản lý — giờ
              công, doanh thu và biên lợi nhuận.
            </p>
          </div>
        </div>
        <div className="page-header__actions">
          <button
            type="button"
            className="btn-primary"
            onClick={() => loadReport(true)}
            disabled={loading || refreshing}
            data-testid="btn-refresh-project-performance"
          >
            {refreshing ? <span className="spinner-sm" aria-hidden="true" /> : ICONS.refresh}{' '}
            {refreshing ? 'Đang tải lại...' : 'Làm mới'}
          </button>
        </div>
      </div>

      <div className="user-table-card" style={{ padding: '20px', marginBottom: '16px' }}>
        <div className="toolbar-filters" style={{ display: 'flex', alignItems: 'flex-end', gap: '16px', flexWrap: 'wrap' }}>
          <div className="filter-group">
            <label className="filter-label" htmlFor="project-performance-status">
              Trạng thái dự án
            </label>
            <select
              id="project-performance-status"
              className="form-input"
              style={{ height: 38 }}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as ProjectPerformanceStatus | '')}
              disabled={loading}
              data-testid="project-performance-status-filter"
            >
              <option value="">Tất cả</option>
              <option value="RUNNING">Đang chạy</option>
              <option value="CLOSED">Đã đóng</option>
            </select>
          </div>
        </div>
      </div>

      {error && (
        <div className="alert-box alert-box--danger" role="alert" style={{ marginBottom: '16px', justifyContent: 'space-between' }} data-testid="project-performance-error">
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {ICONS.alertTriangle} {error}
          </span>
          <button type="button" className="btn-secondary" onClick={() => loadReport()}>
            Thử lại
          </button>
        </div>
      )}

      {loading ? (
        <div data-testid="project-performance-loading" role="status" aria-label="Đang tải báo cáo...">
          <div className="skeleton" style={{ height: '88px', marginBottom: '24px' }} />
          <div className="skeleton" style={{ height: '240px' }} />
        </div>
      ) : report ? (
        <>
          <div className="stats-grid" data-testid="project-performance-kpi-grid">
            <div className="stat-card" data-testid="kpi-project-count">
              <span className="stat-card__label">
                <span className="stat-card__icon stat-card__icon--blue">{ICONS.briefcase}</span>
                Tổng dự án
              </span>
              <span className="stat-card__value">{report.projectCount.toLocaleString('vi-VN')}</span>
            </div>
            <div className="stat-card" data-testid="kpi-without-plan-count">
              <span className="stat-card__label">
                <span className="stat-card__icon stat-card__icon--purple">{ICONS.info}</span>
                Thiếu báo giá
              </span>
              <span className="stat-card__value">{report.projectsWithoutPlanCount.toLocaleString('vi-VN')}</span>
            </div>
            <button
              type="button"
              className="stat-card"
              data-testid="kpi-over-planned-hours-count"
              onClick={() => setOnlyOverPlannedHours((v) => !v)}
              style={{ textAlign: 'left', cursor: 'pointer' }}
              title="Lọc danh sách chỉ hiện dự án vượt giờ kế hoạch"
            >
              <span className="stat-card__label">
                <span className="stat-card__icon stat-card__icon--amber">{ICONS.clock}</span>
                Vượt giờ kế hoạch
              </span>
              <span className={`stat-card__value ${report.overPlannedHoursProjectCount > 0 ? 'text-warning' : ''}`}>
                {report.overPlannedHoursProjectCount.toLocaleString('vi-VN')}
              </span>
            </button>
            <button
              type="button"
              className="stat-card"
              data-testid="kpi-below-planned-margin-count"
              onClick={() => setOnlyBelowPlannedMargin((v) => !v)}
              style={{ textAlign: 'left', cursor: 'pointer' }}
              title="Lọc danh sách chỉ hiện dự án dưới biên kế hoạch"
            >
              <span className="stat-card__label">
                <span className="stat-card__icon stat-card__icon--red">{ICONS.alertTriangle}</span>
                Dưới biên kế hoạch
              </span>
              <span className={`stat-card__value ${report.belowPlannedMarginProjectCount > 0 ? 'text-danger' : ''}`}>
                {report.belowPlannedMarginProjectCount.toLocaleString('vi-VN')}
              </span>
            </button>
          </div>

          {(onlyOverPlannedHours || onlyBelowPlannedMargin) && (
            <div className="toolbar-filters" style={{ marginBottom: '12px', gap: '8px' }} data-testid="project-performance-active-filters">
              {onlyOverPlannedHours && (
                <button type="button" className="pipeline-stalled-chip" onClick={() => setOnlyOverPlannedHours(false)}>
                  Vượt giờ kế hoạch {ICONS.close}
                </button>
              )}
              {onlyBelowPlannedMargin && (
                <button type="button" className="pipeline-stalled-chip" onClick={() => setOnlyBelowPlannedMargin(false)}>
                  Dưới biên kế hoạch {ICONS.close}
                </button>
              )}
            </div>
          )}

          <div className="user-table-card" data-testid="project-performance-table">
            <div className="forecast-table-head">
              <h2 className="forecast-table-head__title">Chi tiết theo dự án</h2>
              <span className="forecast-table-head__count">Hiển thị {filteredProjects.length}/{report.projects.length} dự án</span>
            </div>

            {report.projects.length === 0 ? (
              <div className="table-empty-state" data-testid="project-performance-empty">
                <div className="table-empty-state__icon">{ICONS.briefcase}</div>
                <h3>Bạn chưa quản lý dự án nào</h3>
                <p>Chưa có dự án nào gán bạn làm Quản lý dự án để lên báo cáo hiệu quả.</p>
              </div>
            ) : filteredProjects.length === 0 ? (
              <div className="table-empty-state" data-testid="project-performance-no-match">
                <div className="table-empty-state__icon">{ICONS.search}</div>
                <h3>Không có dự án phù hợp bộ lọc</h3>
                <p>Bỏ bớt bộ lọc phía trên để xem lại toàn bộ danh sách.</p>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="user-data-table">
                  <thead>
                    <tr>
                      <th>Dự án</th>
                      <th>Hợp đồng</th>
                      <th style={{ textAlign: 'right' }}>Giờ công (DK / TT)</th>
                      <th style={{ textAlign: 'right' }}>Doanh thu (HĐ / Ghi nhận)</th>
                      <th style={{ textAlign: 'right' }}>Biên LN (DK / TT)</th>
                      <th style={{ textAlign: 'right' }}>Chi phí (DK / TT)</th>
                      <th>Cảnh báo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProjects.map((p) => (
                      <ProjectPerformanceRow key={p.projectId} project={p} onViewProject={onViewProject} />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}

function ProjectPerformanceRow({
  project: p,
  onViewProject,
}: {
  project: ProjectPerformanceRes;
  onViewProject?: (projectId: number, projectName: string) => void;
}) {
  const missingCount = p.missingPlannedCostItemCount + p.missingActualCostEntryCount + p.missingActualRevenueEntryCount;

  return (
    <tr data-testid={`project-performance-row-${p.projectId}`}>
      <td>
        {onViewProject ? (
          <button
            type="button"
            className="pipeline-stalled-chip"
            onClick={() => onViewProject(p.projectId, p.projectName)}
            style={{ marginBottom: '4px' }}
          >
            {p.projectCode}
            <span aria-hidden="true">{ICONS.arrowRight}</span>
          </button>
        ) : (
          <strong>{p.projectCode}</strong>
        )}
        <div style={{ fontSize: '13px', color: 'var(--ink-strong)' }}>{p.projectName}</div>
        <span className={`status-pill ${p.status === 'RUNNING' ? 'status-pill--active' : 'status-pill--inactive'}`} style={{ marginTop: '4px' }}>
          {p.status === 'RUNNING' ? 'Đang chạy' : 'Đã đóng'}
        </span>
        {!p.planAvailable && (
          <div style={{ marginTop: '4px' }}>
            <span className="badge badge--warning">Thiếu báo giá</span>
          </div>
        )}
      </td>
      <td>
        <div className="mono-cell">{p.contractCode}</div>
        <div style={{ fontSize: '12.5px', color: 'var(--ink-faint)' }}>{contractTypeLabel(p.contractType)}</div>
      </td>
      <td style={{ textAlign: 'right' }}>
        <div style={{ fontSize: '12.5px', color: 'var(--ink-faint)' }}>DK: {formatHours(p.plannedHours)}</div>
        <div className="mono-cell">TT: {formatHours(p.actualHours)}</div>
        <div
          style={{
            fontSize: '12.5px',
            color: p.hoursVariance != null && p.hoursVariance > 0 ? 'var(--pale-red-fg)' : 'var(--pale-green-fg)',
          }}
        >
          {formatHoursSigned(p.hoursVariance)} ({formatPercentSigned(p.hoursVariancePercent)})
        </div>
      </td>
      <td style={{ textAlign: 'right' }}>
        <div style={{ fontSize: '12.5px', color: 'var(--ink-faint)' }}>HĐ: {formatCurrency(p.contractValue)}</div>
        <div className="mono-cell">Ghi nhận: {formatCurrency(p.recognizedRevenue)}</div>
        <div style={{ fontSize: '12.5px', color: 'var(--ink-faint)' }}>{formatPercent(p.revenueToContractPercent)} hợp đồng</div>
      </td>
      <td style={{ textAlign: 'right' }}>
        <div style={{ fontSize: '12.5px', color: 'var(--ink-faint)' }}>DK: {formatPercent(p.plannedMarginPercent)}</div>
        <div className="mono-cell">TT: {formatPercent(p.actualMarginPercent)}</div>
        <div
          style={{
            fontSize: '12.5px',
            color:
              p.marginGapPercentPoints == null ? 'var(--ink-faint)' : p.marginGapPercentPoints < 0 ? 'var(--pale-red-fg)' : 'var(--pale-green-fg)',
          }}
        >
          {formatPercentSigned(p.marginGapPercentPoints)} điểm
        </div>
      </td>
      <td style={{ textAlign: 'right' }}>
        <div style={{ fontSize: '12.5px', color: 'var(--ink-faint)' }}>
          DK: <CostCell value={p.plannedCost} />
        </div>
        <div>
          TT: <CostCell value={p.actualCost} />
        </div>
      </td>
      <td>
        {p.warnings.length === 0 && missingCount === 0 ? (
          <span style={{ color: 'var(--ink-faint)' }}>—</span>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxWidth: '260px' }}>
            {p.warnings.map((w, i) => (
              <span
                key={i}
                data-testid={`project-performance-warning-${p.projectId}-${i}`}
                style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', fontSize: '12.5px', color: 'var(--pale-yellow-fg)' }}
              >
                {ICONS.alertTriangle} {w}
              </span>
            ))}
            {missingCount > 0 && (
              <span className="badge badge--warning" data-testid={`project-performance-missing-${p.projectId}`}>
                Thiếu {missingCount} dữ liệu chi phí/doanh thu
              </span>
            )}
          </div>
        )}
      </td>
    </tr>
  );
}
