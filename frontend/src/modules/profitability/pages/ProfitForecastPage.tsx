import { useCallback, useEffect, useState } from 'react';
import { ICONS } from '../../../components/common/icons';
import type { ProjectRes } from '../../projects/types/projectTypes';
import { getProject } from '../../projects/api/projectsApi';
import type { ProfitForecastRes } from '../types/profitabilityTypes';
import { getProfitForecast, ProfitabilityApiError } from '../api/profitabilityApi';
import { ReportErrorAlert, ReportSkeleton } from '../../reports/components/ReportStates';

export interface ProfitForecastPageProps {
  projectId: number;
  currentUserRoles?: string[];
  onBack?: () => void;
  initialForecast?: ProfitForecastRes;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
}

/** Định dạng phần trăm; trả `—` khi giá trị null (không thể tính được). */
function formatPercent(value: number | null | undefined): string {
  if (value == null) return '—';
  return `${formatNumber(value)} %`;
}

/** Chênh lệch điểm phần trăm có dấu +/− phía trước. */
function formatPercentSigned(value: number | null | undefined): string {
  if (value == null) return '—';
  return `${value >= 0 ? '+' : ''}${formatPercent(value)}`;
}

interface ComparisonCardProps {
  label: string;
  actual: string;
  forecast: string;
  testId: string;
  /** Sắc thái ngữ nghĩa của giá trị dự báo (lãi/lỗ); mặc định là màu thống kê trung tính. */
  forecastTone?: 'good' | 'bad';
}

/** Thẻ so sánh một cặp giá trị Hiện tại vs Dự báo khi kết thúc. */
function ComparisonCard({ label, actual, forecast, testId, forecastTone }: ComparisonCardProps) {
  const forecastClass = forecastTone === 'bad' ? 'ia-sub--bad' : forecastTone === 'good' ? 'ia-sub--good' : 'ia-compare__planned';
  return (
    <div className="stat-card" data-testid={testId}>
      <span className="stat-card__label">{label}</span>
      <dl className="ia-compare">
        <div className="ia-compare__row">
          <dt className="ia-sub">Hiện tại</dt>
          <dd className="ia-compare__actual">{actual}</dd>
        </div>
        <div className="ia-compare__row">
          <dt className="ia-sub">Dự báo khi kết thúc</dt>
          <dd className={`ia-compare__actual ${forecastClass}`}>{forecast}</dd>
        </div>
      </dl>
    </div>
  );
}

/** Nội dung dự báo khi đã có dữ liệu — tách riêng để tránh lồng IIFE trong JSX ternary. */
function ProfitForecastContent({ data }: { data: ProfitForecastRes }) {
  const usedPercent = data.budgetHours > 0 ? (data.actualHours / data.budgetHours) * 100 : null;
  const forecastNegative = data.forecastMargin < 0;
  const gapClass =
    data.marginVariancePercentPoints == null ? '' : data.marginVariancePercentPoints >= 0 ? 'text-success' : 'text-danger';

  return (
    <>
      {/* TC-02: nguy cơ lỗ */}
      {data.riskOfLoss && (
        <div className="alert-box alert-box--danger" role="alert" data-testid="risk-of-loss-alert">
          <strong>Nguy cơ lỗ:</strong> biên lợi nhuận dự báo khi kết thúc dự án âm ({formatCurrency(data.forecastMargin)}).
          Cân nhắc siết lại phạm vi hoặc đàm phán lại giá trị hợp đồng.
        </div>
      )}

      {/* TC-02: đã vượt ngân sách → cách ước tính phần còn lại */}
      {data.overBudget && (
        <div className="alert-box alert-box--warning" role="alert" data-testid="over-budget-alert">
          <strong>Đã vượt ngân sách giờ công:</strong> {formatNumber(data.actualHours)} / {formatNumber(data.budgetHours)} giờ.
          Phần còn lại được ước tính theo tốc độ tiêu hao thực tế
          {data.taskCompletionRate != null && <> (tỷ lệ hoàn thành công việc {formatNumber(data.taskCompletionRate * 100)} %)</>}.
        </div>
      )}

      {data.warnings.length > 0 && (
        <div className="alert-box alert-box--info" role="status" data-testid="forecast-warnings">
          <ul className="ia-reason-list ia-reason-list--inherit">
            {data.warnings.map((warning, index) => (
              <li key={index} data-testid={`forecast-warning-${index}`}>
                {warning}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Giờ công: ngân sách / đã dùng / còn lại */}
      <div className="user-table-card ia-card-pad ia-section" data-testid="hours-forecast">
        <h3 className="ia-section-title ia-mb-12">Giờ công đến khi kết thúc</h3>
        <div className="ia-metric-row">
          <div data-testid="budget-hours">
            <div className="ia-sub">Ngân sách giờ</div>
            <div className="ia-metric">{formatNumber(data.budgetHours)} giờ</div>
          </div>
          <div data-testid="actual-hours">
            <div className="ia-sub">Đã dùng</div>
            <div className={`ia-metric${data.overBudget ? ' ia-sub--bad' : ''}`}>
              {formatNumber(data.actualHours)} giờ
            </div>
          </div>
          <div data-testid="remaining-hours">
            <div className="ia-sub">Còn lại (ước tính)</div>
            <div className="ia-metric ia-compare__planned">{formatNumber(data.remainingHours)} giờ</div>
          </div>
          <div data-testid="estimated-total-hours">
            <div className="ia-sub">Tổng giờ khi kết thúc</div>
            <div className="ia-metric">
              {formatNumber(data.estimatedTotalHoursAtCompletion)} giờ
            </div>
          </div>
        </div>
        {usedPercent != null && (
          <div className="ia-mt-16" data-testid="budget-usage">
            <div className="ia-sub ia-mb-6" id="budget-usage-label">
              Đã dùng {formatNumber(usedPercent)} % ngân sách giờ
            </div>
            <div
              className={`ia-progress${data.overBudget ? ' ia-progress--over' : ''}`}
              role="progressbar"
              aria-labelledby="budget-usage-label"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(Math.min(usedPercent, 100))}
            >
              <div className="ia-progress__fill" style={{ width: `${Math.min(usedPercent, 100)}%` }} />
            </div>
          </div>
        )}
      </div>

      {/* Doanh thu / chi phí / lợi nhuận / biên: hiện tại vs dự báo */}
      <div className="stats-grid" data-testid="forecast-kpis">
        <ComparisonCard label="Doanh thu" actual={formatCurrency(data.actualRevenue)} forecast={formatCurrency(data.forecastRevenue)} testId="kpi-revenue" />
        <ComparisonCard label="Giá vốn" actual={formatCurrency(data.actualCost)} forecast={formatCurrency(data.forecastCost)} testId="kpi-cost" />
        <ComparisonCard
          label="Lợi nhuận"
          actual={formatCurrency(data.actualMargin)}
          forecast={formatCurrency(data.forecastMargin)}
          testId="kpi-margin"
          forecastTone={forecastNegative ? 'bad' : 'good'}
        />
        <ComparisonCard
          label="Biên lợi nhuận"
          actual={formatPercent(data.actualMarginPercent)}
          forecast={formatPercent(data.forecastMarginPercent)}
          testId="kpi-margin-percent"
          forecastTone={forecastNegative ? 'bad' : 'good'}
        />
      </div>

      {/* Chênh lệch giữa biên dự báo và biên hiện tại */}
      <div className="stats-grid">
        <div className="stat-card" data-testid="margin-variance">
          <span className="stat-card__label">Biên dự báo so với biên hiện tại</span>
          <strong className={`stat-card__value ${gapClass}`}>{formatPercentSigned(data.marginVariancePercentPoints)}</strong>
          <span className="field-hint">(dự báo − hiện tại, tính bằng điểm phần trăm)</span>
        </div>
      </div>
    </>
  );
}

/**
 * Dự báo lợi nhuận của dự án tới khi kết thúc (NCL-09-CN-007).
 *
 * - TC-01: dự án chưa vượt ngân sách → giá vốn dự kiến theo phần giờ còn lại (ngân sách − đã dùng) và biên dự báo.
 * - TC-02: đã vượt ngân sách → phần còn lại ngoại suy theo tốc độ tiêu hao thực tế + cảnh báo nguy cơ lỗ.
 * - TC-03: chỉ VT-02 (Quản lý dự án); vai trò khác bị từ chối ngay ở frontend, còn backend trả `403 FORBIDDEN`
 *   và ghi nhật ký từ chối (QTN-01/QTN-03).
 *
 * Response chỉ là số liệu tổng hợp cấp dự án nên không áp dụng che dữ liệu QTN-02.
 */
export default function ProfitForecastPage({
  projectId,
  currentUserRoles = ['VT-02'],
  onBack,
  initialForecast,
}: ProfitForecastPageProps) {
  const canViewScreen = currentUserRoles.includes('VT-02');

  const [data, setData] = useState<ProfitForecastRes | null>(initialForecast ?? null);
  const [loading, setLoading] = useState(!initialForecast);
  const [error, setError] = useState<string | null>(null);
  const [project, setProject] = useState<ProjectRes | null>(null);

  const loadData = useCallback(async () => {
    if (!canViewScreen) return;
    setLoading(true);
    setError(null);
    try {
      setData(await getProfitForecast(projectId));
    } catch (err) {
      setData(null);
      if (err instanceof ProfitabilityApiError || err instanceof Error) {
        setError(err.message);
      } else {
        setError('Không thể tải dự báo lợi nhuận của dự án.');
      }
    } finally {
      setLoading(false);
    }
  }, [projectId, canViewScreen]);

  useEffect(() => {
    if (!initialForecast) {
      void loadData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadData, initialForecast]);

  useEffect(() => {
    if (initialForecast || !canViewScreen) return;
    void (async () => {
      try {
        setProject(await getProject(projectId));
      } catch {
        // Không báo lỗi nếu không lấy được thông tin dự án — vẫn hiển thị số liệu dự báo.
      }
    })();
  }, [projectId, initialForecast, canViewScreen]);

  if (!canViewScreen) {
    return (
      <div className="user-management-page ia-page" data-testid="profit-forecast-forbidden">
        <div className="alert-box alert-box--danger" role="alert">
          Bạn không có quyền xem dự báo lợi nhuận tới khi kết thúc dự án (yêu cầu vai trò Quản lý dự án VT-02).
        </div>
        {onBack && (
          <button type="button" className="btn btn-secondary ia-denied-back" onClick={onBack}>
            {ICONS.arrowLeft} Quay lại
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="user-management-page ia-page" data-testid="profit-forecast-page">
      <div className="page-header">
        <div className="ia-head">
          {onBack && (
            <button type="button" className="btn btn-secondary btn-sm btn-back" onClick={onBack} data-testid="btn-back-profit-forecast">
              {ICONS.arrowLeft} Quay lại
            </button>
          )}
          <div>
            <h1 className="page-title">Dự báo lợi nhuận tới khi kết thúc dự án</h1>
            <p className="page-subtitle" data-testid="project-code">{project?.projectCode || `Mã: ${projectId}`}</p>
            {project?.name && (
              <p className="page-subtitle">
                {project.name}
              </p>
            )}
          </div>
        </div>

        <div className="page-header__actions">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => void loadData()}
            disabled={loading}
            data-testid="btn-reload-profit-forecast"
          >
            {ICONS.refresh} Tải lại
          </button>
        </div>
      </div>

      {error && (
        <ReportErrorAlert testId="profit-forecast-error" message={error} onRetry={() => void loadData()} retryDisabled={loading} />
      )}

      {loading ? (
        <ReportSkeleton testId="profit-forecast-loading" label="Đang tải dự báo lợi nhuận..." kpis={4} chart tableColumns={0} />
      ) : !data ? (
        !error && (
          <div className="table-empty-state" data-testid="profit-forecast-empty">
            <div className="table-empty-state__icon">{ICONS.chart}</div>
            <h3>Không có dữ liệu</h3>
            <p className="ia-inline-empty">Dự án này chưa có dữ liệu để dự báo lợi nhuận.</p>
          </div>
        )
      ) : (
        <ProfitForecastContent data={data} />
      )}
    </div>
  );
}
