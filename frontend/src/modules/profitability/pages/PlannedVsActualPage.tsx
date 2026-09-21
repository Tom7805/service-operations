import { useCallback, useEffect, useState } from 'react';
import { ICONS } from '../../../components/common/icons';
import type { ProjectRes } from '../../projects/types/projectTypes';
import { getProject, ProjectsApiError } from '../../projects/api/projectsApi';
import type { PlannedVsActualMarginRes } from '../types/profitabilityTypes';
import { getPlannedVsActualMargin, ProfitabilityApiError } from '../api/profitabilityApi';

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
    <div
      className="kpi-card"
      style={{
        flex: '1',
        minWidth: '180px',
        padding: '20px',
        border: '1px solid #E2E8F0',
        borderRadius: '8px',
        background: '#FFF',
      }}
      data-testid={testId}
    >
      <div style={{ fontSize: '13px', color: '#64748B', marginBottom: '12px', fontWeight: 600 }}>{label}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '12px', color: '#94A3B8' }}>Dự kiến</span>
          <span style={{ fontSize: '14px', fontWeight: 600, color: '#0EA5E9' }}>{planned}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '12px', color: '#94A3B8' }}>Thực tế</span>
          <span style={{ fontSize: '14px', fontWeight: 600, color: '#1E293B' }}>{actual}</span>
        </div>
      </div>
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
        style={{ marginBottom: '16px' }}
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
          style={{ marginBottom: '12px' }}
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
          style={{ marginBottom: '12px' }}
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
          style={{ marginBottom: '12px' }}
          data-testid="missing-actual-revenue-alert"
        >
          <strong>Cảnh báo:</strong> Có {data.missingActualRevenueEntryCount} dòng giờ công đã duyệt chưa
          tra được đơn giá doanh thu nên chưa tính vào doanh thu thực tế.
        </div>
      )}

      {/* So sánh KPI: doanh thu / chi phí / lợi nhuận / biên % */}
      <div
        data-testid="margin-comparison-kpis"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
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
      <div
        className="kpi-card"
        style={{
          padding: '20px',
          border: '1px solid #E2E8F0',
          borderRadius: '8px',
          background: '#FFF',
          marginBottom: '24px',
        }}
        data-testid="margin-gap"
      >
        <div style={{ fontSize: '13px', color: '#64748B', marginBottom: '8px', fontWeight: 600 }}>
          Chênh lệch so với dự kiến
        </div>
        <div
          style={{
            fontSize: '28px',
            fontWeight: 700,
            color:
              data.marginGapPercentPoints == null
                ? '#1E293B'
                : data.marginGapPercentPoints >= 0
                  ? '#16A34A'
                  : '#DC2626',
          }}
        >
          {formatPercentSigned(data.marginGapPercentPoints)}
        </div>
        <div style={{ fontSize: '12px', color: '#94A3B8', marginTop: '4px' }}>
          (thực tế − dự kiến, tính bằng điểm phần trăm)
        </div>
      </div>

      {/* Chênh lệch số giờ công */}
      <div
        className="user-table-card"
        style={{ padding: '20px', marginBottom: '24px' }}
        data-testid="hours-comparison"
      >
        <h3 style={{ margin: '0 0 12px', fontSize: '15px', fontWeight: 700, color: '#1E293B' }}>
          So sánh số giờ công và chi phí giờ
        </h3>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '16px',
          }}
        >
          <div data-testid="planned-hours">
            <div style={{ fontSize: '12px', color: '#94A3B8' }}>Dự kiến</div>
            <div style={{ fontSize: '16px', fontWeight: 600, color: '#0EA5E9' }}>
              {formatNumber(plannedHours)} giờ ({formatNumber(data.plannedWorkDays)} ngày)
            </div>
          </div>
          <div data-testid="actual-hours">
            <div style={{ fontSize: '12px', color: '#94A3B8' }}>Thực tế</div>
            <div style={{ fontSize: '16px', fontWeight: 600, color: '#1E293B' }}>
              {formatNumber(data.actualHours)} giờ
            </div>
          </div>
          <div data-testid="hours-variance">
            <div style={{ fontSize: '12px', color: '#94A3B8' }}>Chênh lệch</div>
            <div
              style={{
                fontSize: '16px',
                fontWeight: 600,
                color: data.hoursVarianceVsPlanned >= 0 ? '#DC2626' : '#16A34A',
              }}
            >
              {formatHoursSigned(data.hoursVarianceVsPlanned)} giờ
            </div>
          </div>
        </div>
      </div>

      {/* Nguyên nhân chênh lệch */}
      {data.gapReasons && data.gapReasons.length > 0 && (
        <div
          className="user-table-card"
          style={{ padding: '20px', marginBottom: '16px' }}
          data-testid="gap-reasons"
        >
          <h3 style={{ margin: '0 0 12px', fontSize: '15px', fontWeight: 700, color: '#1E293B' }}>
            Nguyên nhân chênh lệch
          </h3>
          <ul style={{ margin: 0, paddingLeft: '20px', color: '#1E293B', fontSize: '13.5px' }}>
            {data.gapReasons.map((reason, index) => (
              <li key={index} style={{ marginBottom: '4px' }} data-testid={`gap-reason-${index}`}>
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
      <div className="user-management-page" data-testid="planned-vs-actual-forbidden">
        <div className="alert-box alert-box--danger" role="alert">
          Bạn không có quyền xem so sánh biên lợi nhuận dự kiến với thực tế của dự án này
          (yêu cầu vai trò Quản lý dự án VT-02).
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
    <div className="user-management-page" data-testid="planned-vs-actual-page">
      <div className="page-header" style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
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
            <div className="page-header__kicker">
              <span className="page-header__tag">{ICONS.chart} SO SÁNH BIÊN LỢI NHUẬN</span>
              <span className="page-header__dot" />
              <span className="page-header__meta">{project?.projectCode || `Mã: ${projectId}`}</span>
            </div>
            <h1 className="page-title" style={{ margin: '4px 0' }}>Biên lợi nhuận dự kiến vs thực tế</h1>
            {project?.name && (
              <p className="page-subtitle" style={{ margin: 0, color: '#64748B', fontSize: '13.5px' }}>
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
            data-testid="btn-reload-planned-vs-actual"
          >
            {ICONS.refresh} Tải lại
          </button>
        </div>
      </div>

      {error && (
        <div
          className="alert-box alert-box--danger"
          role="alert"
          style={{ marginBottom: '16px' }}
          data-testid="planned-vs-actual-error"
        >
          {error}
        </div>
      )}

      {loading ? (
        <div className="table-loading-state" data-testid="planned-vs-actual-loading">
          <span className="spinner-lg" />
          <p style={{ marginTop: '10px' }}>Đang tải so sánh biên lợi nhuận...</p>
        </div>
      ) : notFound ? (
        <div className="table-empty-state" data-testid="planned-vs-actual-not-found" style={{ padding: '32px' }}>
          <div className="table-empty-state__icon">{ICONS.info}</div>
          <h4 style={{ margin: '0 0 6px', fontSize: '15px', color: '#1E293B' }}>Chưa có báo giá gắn dự án</h4>
          <p style={{ margin: 0, color: '#64748B', fontSize: '13.5px' }}>
            Dự án chưa có báo giá nào gắn kèm (qua hợp đồng) để so sánh biên lợi nhuận dự kiến với thực tế.
          </p>
        </div>
      ) : !data ? (
        <div className="table-empty-state" data-testid="planned-vs-actual-empty" style={{ padding: '32px' }}>
          <div className="table-empty-state__icon">{ICONS.chart}</div>
          <h4 style={{ margin: '0 0 6px', fontSize: '15px', color: '#1E293B' }}>Không có dữ liệu</h4>
          <p style={{ margin: 0, color: '#64748B', fontSize: '13.5px' }}>
            Dự án này chưa có dữ liệu biên lợi nhuận để so sánh.
          </p>
        </div>
) : (
        <PlannedVsActualContent data={data} />
      )}
    </div>
  );
}
