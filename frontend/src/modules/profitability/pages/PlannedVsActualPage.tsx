import { useCallback, useEffect, useState } from 'react';
import { ICONS } from '../../../components/common/icons';
import type { ProjectRes } from '../../projects/types/projectTypes';
import { getProject, ProjectsApiError } from '../../projects/api/projectsApi';
import type { PlannedVsActualMarginRes } from '../types/profitabilityTypes';
import { getPlannedVsActualMargin, ProfitabilityApiError } from '../api/profitabilityApi';
import { ReportErrorAlert, ReportSkeleton } from '../../reports/components/ReportStates';

export interface PlannedVsActualPageProps {
  projectId: number;
  currentUserRoles?: string[];
  onBack?: () => void;
  initialMargin?: PlannedVsActualMarginRes;
}

/** Số giờ chuẩn đi làm trong một ngày công (dùng để quy đổi ngày → giờ). */
const HOURS_PER_DAY = 8;

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
}

/** Định dạng phần trăm; trả `—` khi giá trị null (không thể tính được). */
function formatPercent(value: number | null | undefined): string {
  if (value == null) return '—';
  return new Intl.NumberFormat('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value) + ' %';
}

/** Định dạng phần trăm có dấu +/− ở phía trước (dùng cho chênh lệch điểm phần trăm). */
function formatPercentSigned(value: number | null | undefined): string {
  if (value == null) return '—';
  const sign = value >= 0 ? '+' : '';
  return sign + formatPercent(value);
}

function formatHoursSigned(value: number | null | undefined): string {
  if (value == null) return '—';
  const sign = value >= 0 ? '+' : '';
  return sign + formatNumber(value);
}

interface ComparisonCardProps {
  label: string;
  planned: string;
  actual: string;
  testId: string;
}

/**
 * Thẻ so sánh một cặp giá trị Dự kiến vs Thực tế. Dùng cho doanh thu, chi phí, lợi nhuận và biên %.
 */
function ComparisonCard({ label, planned, actual, testId }: ComparisonCardProps) {
  return (
    <div className="stat-card" data-testid={testId}>
      <span className="stat-card__label">{label}</span>
      <dl className="ia-compare">
        <div className="ia-compare__row">
          <dt className="ia-sub">Dự kiến</dt>
          <dd className="ia-compare__planned">{planned}</dd>
        </div>
        <div className="ia-compare__row">
          <dt className="ia-sub">Thực tế</dt>
          <dd className="ia-compare__actual">{actual}</dd>
        </div>
      </dl>
    </div>
  );
}

/**
 * Component hiển thị nội dung so sánh khi đã có dữ liệu.
 * Tách riêng để tránh lồng IIFE trong JSX ternary.
 */
function PlannedVsActualContent({ data }: { data: PlannedVsActualMarginRes }) {
  const plannedHours = data.plannedWorkDays * HOURS_PER_DAY;

  return (
    <>
      {/* Nguồn dữ liệu kế hoạch */}
      <div
        className="alert-box alert-box--info"
        role="status"
        data-testid="quote-source"
      >
        So sánh dựa trên báo giá <strong>#{data.quoteId}</strong> (phiên bản {data.quoteVersion})
        — biên dự kiến tính từ doanh thu báo giá; biên thực tế tính từ giờ công đã duyệt.
      </div>

      {/* Cảnh báo dữ liệu thiếu */}
      {data.missingPlannedCostItemCount > 0 && (
        <div
          className="alert-box alert-box--warning"
          role="alert"
          data-testid="missing-planned-cost-alert"
        >
          <strong>Cảnh báo:</strong> Có {data.missingPlannedCostItemCount} dòng báo giá chưa ước tính
          được chi phí dự kiến (chưa có nhân sự giữ vai trò này).
        </div>
      )}
      {data.missingActualCostEntryCount > 0 && (
        <div
          className="alert-box alert-box--warning"
          role="alert"
          data-testid="missing-actual-cost-alert"
        >
          <strong>Cảnh báo:</strong> Có {data.missingActualCostEntryCount} dòng giờ công đã duyệt chưa
          có chi phí giờ công nội bộ nên chưa tính vào chi phí thực tế.
        </div>
      )}
      {data.missingActualRevenueEntryCount > 0 && (
        <div
          className="alert-box alert-box--warning"
          role="alert"
          data-testid="missing-actual-revenue-alert"
        >
          <strong>Cảnh báo:</strong> Có {data.missingActualRevenueEntryCount} dòng giờ công đã duyệt chưa
          tra được đơn giá doanh thu nên chưa tính vào doanh thu thực tế.
        </div>
      )}

      {/* So sánh KPI: doanh thu / chi phí / lợi nhuận / biên % */}
      <div className="stats-grid" data-testid="margin-comparison-kpis">
        <ComparisonCard
          label="Doanh thu"
          planned={formatCurrency(data.plannedRevenue)}
          actual={formatCurrency(data.actualRevenue)}
          testId="kpi-revenue"
        />
        <ComparisonCard
          label="Chi phí"
          planned={formatCurrency(data.plannedCost)}
          actual={formatCurrency(data.actualCost)}
          testId="kpi-cost"
        />
        <ComparisonCard
          label="Lợi nhuận"
          planned={formatCurrency(data.plannedMargin)}
          actual={formatCurrency(data.actualMargin)}
          testId="kpi-margin"
        />
        <ComparisonCard
          label="Biên lợi nhuận"
          planned={formatPercent(data.plannedMarginPercent)}
          actual={formatPercent(data.actualMarginPercent)}
          testId="kpi-margin-percent"
        />
      </div>

      {/* Chênh lệch biên lợi nhuận (điểm phần trăm) */}
      <div className="stats-grid">
        <div className="stat-card" data-testid="margin-gap">
          <span className="stat-card__label">Chênh lệch so với dự kiến</span>
          <strong
            className={`stat-card__value ${
              data.marginGapPercentPoints == null
                ? ''
                : data.marginGapPercentPoints >= 0
                  ? 'text-success'
                  : 'text-danger'
            }`}
          >
            {formatPercentSigned(data.marginGapPercentPoints)}
          </strong>
          <span className="field-hint">(thực tế − dự kiến, tính bằng điểm phần trăm)</span>
        </div>
      </div>

      {/* Chênh lệch số giờ công */}
      <div
        className="user-table-card ia-card-pad ia-section"
        data-testid="hours-comparison"
      >
        <h3 className="ia-section-title ia-mb-12">
          So sánh số giờ công và chi phí giờ
        </h3>
        <div className="ia-metric-row">
          <div data-testid="planned-hours">
            <div className="ia-sub">Dự kiến</div>
            <div className="ia-metric ia-compare__planned">
              {formatNumber(plannedHours)} giờ ({formatNumber(data.plannedWorkDays)} ngày)
            </div>
          </div>
          <div data-testid="actual-hours">
            <div className="ia-sub">Thực tế</div>
            <div className="ia-metric">
              {formatNumber(data.actualHours)} giờ
            </div>
          </div>
          <div data-testid="hours-variance">
            <div className="ia-sub">Chênh lệch</div>
            <div className={`ia-metric ${data.hoursVarianceVsPlanned >= 0 ? 'ia-sub--bad' : 'ia-sub--good'}`}>
              {formatHoursSigned(data.hoursVarianceVsPlanned)} giờ
            </div>
          </div>
        </div>
      </div>

      {/* Nguyên nhân chênh lệch */}
      {data.gapReasons && data.gapReasons.length > 0 && (
        <div
          className="user-table-card ia-card-pad ia-section"
          data-testid="gap-reasons"
        >
          <h3 className="ia-section-title ia-mb-12">
            Nguyên nhân chênh lệch
          </h3>
          <ul className="ia-reason-list">
            {data.gapReasons.map((reason, index) => (
              <li key={index} data-testid={`gap-reason-${index}`}>
                {reason}
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}

/**
 * So sánh biên lợi nhuận dự kiến (lúc báo giá) với biên lợi nhuận thực tế của dự án (NCL-09-CN-006).
 *
 * Hiển thị số liệu tổng hợp cấp dự án: doanh thu/chi phí/lãi/biên dự kiến vs thực tế, chênh lệch
 * điểm phần trăm, chênh lệch giờ công và danh sách nguyên nhân chênh lệch. Vì response chỉ là số
 * liệu tổng hợp (không định danh nhân sự) nên **không** áp dụng che dữ liệu QTN-02 — frontend
 * hiển thị trực tiếp (khác với `labor-cost` dòng `LaborCostLineRes`).
 *
 * **Quyền**: chỉ VT-02 (Quản lý dự án). Vai trò khác được frontend từ chối ngay (phòng khi người dùng
 * truy cập trực tiếp); backend cũng trả `403 FORBIDDEN` + ghi nhật ký truy cập MARGIN (QTN-01/QTN-03).
 */
export default function PlannedVsActualPage({
  projectId,
  currentUserRoles = ['VT-02'],
  onBack,
  initialMargin,
}: PlannedVsActualPageProps) {
  // RBAC theo chính xác user story: chỉ VT-02 (Quản lý dự án) được xem.
  const canViewScreen = currentUserRoles.includes('VT-02');

  const [data, setData] = useState<PlannedVsActualMarginRes | null>(initialMargin ?? null);
  const [loading, setLoading] = useState(!initialMargin);
  const [error, setError] = useState<string | null>(null);
  // TC-02: dự án (qua hợp đồng) chưa gắn báo giá nào → 404 RESOURCE_NOT_FOUND.
  const [notFound, setNotFound] = useState(false);
  const [project, setProject] = useState<ProjectRes | null>(null);

  const loadData = useCallback(async () => {
    if (!canViewScreen) return;
    setLoading(true);
    setError(null);
    setNotFound(false);
    try {
      const result = await getPlannedVsActualMargin(projectId);
      setData(result);
    } catch (err) {
      if (err instanceof ProfitabilityApiError) {
        if (err.code === 'RESOURCE_NOT_FOUND') {
          // Không phải lỗi hệ thống — đây trạng thái "chưa có báo giá" (TC-02).
          setNotFound(true);
        } else {
          setError(err.message);
        }
      } else if (err instanceof ProjectsApiError) {
        setError(err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Không thể tải dữ liệu so sánh biên lợi nhuận.');
      }
    } finally {
      setLoading(false);
    }
  }, [projectId, canViewScreen]);

  useEffect(() => {
    if (!initialMargin) {
      void loadData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadData, initialMargin]);

  useEffect(() => {
    if (initialMargin) return;
    void (async () => {
      try {
        const proj = await getProject(projectId);
        setProject(proj);
      } catch {
        // Không báo lỗi nếu không lấy được thông tin dự án — vẫn hiển thị số liệu so sánh.
      }
    })();
  }, [projectId, initialMargin]);

  if (!canViewScreen) {
    return (
      <div className="user-management-page ia-page" data-testid="planned-vs-actual-forbidden">
        <div className="alert-box alert-box--danger" role="alert">
          Bạn không có quyền xem so sánh biên lợi nhuận dự kiến với thực tế của dự án này
          (yêu cầu vai trò Quản lý dự án VT-02).
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
    <div className="user-management-page ia-page" data-testid="planned-vs-actual-page">
      <div className="page-header">
        <div className="ia-head">
          {onBack && (
            <button
              type="button"
              className="btn btn-secondary btn-sm btn-back"
              onClick={onBack}
              data-testid="btn-back-planned-vs-actual"
            >
              {ICONS.arrowLeft} Quay lại
            </button>
          )}
          <div>
            <h1 className="page-title">Biên lợi nhuận dự kiến vs thực tế</h1>
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
            data-testid="btn-reload-planned-vs-actual"
          >
            {ICONS.refresh} Tải lại
          </button>
        </div>
      </div>

      {error && (
        <ReportErrorAlert testId="planned-vs-actual-error" message={error} onRetry={() => void loadData()} retryDisabled={loading} />
      )}

      {loading ? (
        <ReportSkeleton testId="planned-vs-actual-loading" label="Đang tải so sánh biên lợi nhuận..." kpis={4} chart tableColumns={0} />
      ) : notFound ? (
        <div className="table-empty-state" data-testid="planned-vs-actual-not-found">
          <div className="table-empty-state__icon">{ICONS.info}</div>
          <h3>Chưa có báo giá gắn dự án</h3>
          <p className="ia-inline-empty">
            Dự án chưa có báo giá nào gắn kèm (qua hợp đồng) để so sánh biên lợi nhuận dự kiến với thực tế.
          </p>
        </div>
      ) : !data ? (
        <div className="table-empty-state" data-testid="planned-vs-actual-empty">
          <div className="table-empty-state__icon">{ICONS.chart}</div>
          <h3>Không có dữ liệu</h3>
          <p className="ia-inline-empty">
            Dự án này chưa có dữ liệu biên lợi nhuận để so sánh.
          </p>
        </div>
) : (
        <PlannedVsActualContent data={data} />
      )}
    </div>
  );
}
