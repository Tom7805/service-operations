import { useCallback, useEffect, useState } from 'react';
import { ICONS } from '../../../components/common/icons';
import type { ProjectRes } from '../../projects/types/projectTypes';
import { getProject } from '../../projects/api/projectsApi';
import type { ProfitForecastRes } from '../types/profitabilityTypes';
import { getProfitForecast, ProfitabilityApiError } from '../api/profitabilityApi';

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
  forecastColor?: string;
}

/** Thẻ so sánh một cặp giá trị Hiện tại vs Dự báo khi kết thúc. */
function ComparisonCard({ label, actual, forecast, testId, forecastColor = 'var(--pale-blue-fg)' }: ComparisonCardProps) {
  return (
    <div className="stat-card" data-testid={testId}>
      <span className="stat-card__label">{label}</span>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '12.5px', color: 'var(--ink-faint)' }}>Hiện tại</span>
          <span style={{ fontSize: '14.5px', fontWeight: 600, color: 'var(--ink-strong)' }}>{actual}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '12.5px', color: 'var(--ink-faint)' }}>Dự báo khi kết thúc</span>
          <span style={{ fontSize: '14.5px', fontWeight: 600, color: forecastColor }}>{forecast}</span>
        </div>
      </div>
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
        <div className="alert-box alert-box--danger" role="alert" style={{ marginBottom: '12px' }} data-testid="risk-of-loss-alert">
          <strong>Nguy cơ lỗ:</strong> biên lợi nhuận dự báo khi kết thúc dự án âm ({formatCurrency(data.forecastMargin)}).
          Cân nhắc siết lại phạm vi hoặc đàm phán lại giá trị hợp đồng.
        </div>
      )}

      {/* TC-02: đã vượt ngân sách → cách ước tính phần còn lại */}
      {data.overBudget && (
        <div className="alert-box alert-box--warning" role="alert" style={{ marginBottom: '12px' }} data-testid="over-budget-alert">
          <strong>Đã vượt ngân sách giờ công:</strong> {formatNumber(data.actualHours)} / {formatNumber(data.budgetHours)} giờ.
          Phần còn lại được ước tính theo tốc độ tiêu hao thực tế
          {data.taskCompletionRate != null && <> (tỷ lệ hoàn thành công việc {formatNumber(data.taskCompletionRate * 100)} %)</>}.
        </div>
      )}

      {data.warnings.length > 0 && (
        <div className="alert-box alert-box--info" role="status" style={{ marginBottom: '16px' }} data-testid="forecast-warnings">
          <ul style={{ margin: 0, paddingLeft: '20px' }}>
            {data.warnings.map((warning, index) => (
              <li key={index} data-testid={`forecast-warning-${index}`}>
                {warning}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Giờ công: ngân sách / đã dùng / còn lại */}
      <div className="user-table-card" style={{ padding: '20px', marginBottom: '24px' }} data-testid="hours-forecast">
        <h3 style={{ margin: '0 0 12px', fontSize: '15px', fontWeight: 700, color: 'var(--ink-strong)' }}>Giờ công đến khi kết thúc</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '16px' }}>
          <div data-testid="budget-hours">
            <div style={{ fontSize: '12.5px', color: 'var(--ink-faint)' }}>Ngân sách giờ</div>
            <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--ink-strong)' }}>{formatNumber(data.budgetHours)} giờ</div>
          </div>
          <div data-testid="actual-hours">
            <div style={{ fontSize: '12.5px', color: 'var(--ink-faint)' }}>Đã dùng</div>
            <div style={{ fontSize: '16px', fontWeight: 600, color: data.overBudget ? 'var(--pale-red-fg)' : 'var(--ink-strong)' }}>
              {formatNumber(data.actualHours)} giờ
            </div>
          </div>
          <div data-testid="remaining-hours">
            <div style={{ fontSize: '12.5px', color: 'var(--ink-faint)' }}>Còn lại (ước tính)</div>
            <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--pale-blue-fg)' }}>{formatNumber(data.remainingHours)} giờ</div>
          </div>
          <div data-testid="estimated-total-hours">
            <div style={{ fontSize: '12.5px', color: 'var(--ink-faint)' }}>Tổng giờ khi kết thúc</div>
            <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--ink-strong)' }}>
              {formatNumber(data.estimatedTotalHoursAtCompletion)} giờ
            </div>
          </div>
        </div>
        {usedPercent != null && (
          <div style={{ marginTop: '16px' }} data-testid="budget-usage">
            <div style={{ fontSize: '12.5px', color: 'var(--ink-faint)', marginBottom: '6px' }}>
              Đã dùng {formatNumber(usedPercent)} % ngân sách giờ
            </div>
            <div style={{ height: '8px', borderRadius: 'var(--radius-sm)', background: 'var(--line)', overflow: 'hidden' }}>
              <div
                style={{
                  width: `${Math.min(usedPercent, 100)}%`,
                  height: '100%',
                  background: data.overBudget ? 'var(--pale-red-fg)' : 'var(--pale-blue-fg)',
                }}
              />
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
          forecastColor={forecastNegative ? 'var(--pale-red-fg)' : 'var(--pale-green-fg)'}
        />
        <ComparisonCard
          label="Biên lợi nhuận"
          actual={formatPercent(data.actualMarginPercent)}
          forecast={formatPercent(data.forecastMarginPercent)}
          testId="kpi-margin-percent"
          forecastColor={forecastNegative ? 'var(--pale-red-fg)' : 'var(--pale-green-fg)'}
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
      <div className="user-management-page" data-testid="profit-forecast-forbidden">
        <div className="alert-box alert-box--danger" role="alert">
          Bạn không có quyền xem dự báo lợi nhuận tới khi kết thúc dự án (yêu cầu vai trò Quản lý dự án VT-02).
        </div>
        {onBack && (
          <button type="button" className="btn btn-secondary" onClick={onBack} style={{ marginTop: '16px' }}>
            {ICONS.arrowLeft} Quay lại
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="user-management-page" data-testid="profit-forecast-page">
      <div className="page-header" style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {onBack && (
            <button type="button" className="btn btn-secondary btn-sm btn-back" onClick={onBack} data-testid="btn-back-profit-forecast">
              {ICONS.arrowLeft} Quay lại
            </button>
          )}
          <div>
            <h1 className="page-title" style={{ margin: '4px 0' }}>Dự báo lợi nhuận tới khi kết thúc dự án</h1>
            <p className="page-subtitle" data-testid="project-code">{project?.projectCode || `Mã: ${projectId}`}</p>
            {project?.name && (
              <p className="page-subtitle" style={{ margin: 0, color: 'var(--ink-muted)', fontSize: '13.5px' }}>
                {project.name}
              </p>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
        <div className="alert-box alert-box--danger" role="alert" style={{ marginBottom: '16px' }} data-testid="profit-forecast-error">
          {error}
        </div>
      )}

      {loading ? (
        <div data-testid="profit-forecast-loading" role="status" aria-label="Đang tải dự báo lợi nhuận...">
            <div className="skeleton" style={{ height: '88px', marginBottom: '24px' }} />
            <div className="skeleton" style={{ height: '240px' }} />
          </div>
      ) : !data ? (
        !error && (
          <div className="table-empty-state" data-testid="profit-forecast-empty" style={{ padding: '32px' }}>
            <div className="table-empty-state__icon">{ICONS.chart}</div>
            <h4 style={{ margin: '0 0 6px', fontSize: '15px', color: 'var(--ink-strong)' }}>Không có dữ liệu</h4>
            <p style={{ margin: 0, color: 'var(--ink-muted)', fontSize: '13.5px' }}>Dự án này chưa có dữ liệu để dự báo lợi nhuận.</p>
          </div>
        )
      ) : (
        <ProfitForecastContent data={data} />
      )}
    </div>
  );
}
