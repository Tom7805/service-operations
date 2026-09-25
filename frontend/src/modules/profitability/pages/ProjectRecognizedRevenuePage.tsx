import { useCallback, useEffect, useState } from 'react';
import { ICONS } from '../../../components/common/icons';
import type { ProjectRes } from '../../projects/types/projectTypes';
import { getProject, ProjectsApiError } from '../../projects/api/projectsApi';
import type { ContractType, RecognitionMethod, RecognizedRevenueRes } from '../types/profitabilityTypes';
import { getProjectRecognizedRevenue, ProfitabilityApiError } from '../api/profitabilityApi';
import { ReportSkeleton } from '../../reports/components/ReportStates';

export interface ProjectRecognizedRevenuePageProps {
  projectId: number;
  currentUserRoles?: string[];
  onBack?: () => void;
  initialRevenue?: RecognizedRevenueRes;
}

const CONTRACT_TYPE_LABELS: Record<ContractType, string> = {
  TIME_AND_MATERIAL: 'Theo giờ công & vật tư',
  FIXED_PRICE: 'Trọn gói (giá cố định)',
  MAINTENANCE: 'Bảo trì định kỳ',
  MILESTONE: 'Theo mốc thanh toán',
};

const RECOGNITION_METHOD_LABELS: Record<RecognitionMethod, string> = {
  HOURLY: 'Theo giờ công đã duyệt',
  PERCENTAGE_OF_COMPLETION: 'Theo tỷ lệ hoàn thành công việc',
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
}

function formatHours(hours: number): string {
  return new Intl.NumberFormat('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(hours);
}

function formatPercent(ratio: number): string {
  return new Intl.NumberFormat('vi-VN', { style: 'percent', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(
    ratio
  );
}

/**
 * Màn hình tính doanh thu ghi nhận của dự án (NCL-09-CN-002).
 *
 * Doanh thu được backend tính động theo đúng loại hợp đồng (`Contract.contractType`):
 * - `HOURLY` (hợp đồng theo giờ): tổng hợp từ các dòng giờ công đã duyệt & tính phí,
 *   hiển thị thêm bảng chi tiết từng dòng.
 * - `PERCENTAGE_OF_COMPLETION` (hợp đồng trọn gói): giá trị hợp đồng nhân tỷ lệ hoàn
 *   thành công việc, không có bảng chi tiết theo dòng giờ công.
 *
 * Chỉ Ban giám đốc (VT-01) và Kế toán (VT-05) được xem — không có luồng masking từng
 * phần như NCL-09-CN-001, vì hai vai trò còn lại đều không được cấp quyền màn hình này.
 *
 * Vì `employeeId` trong response là `Employee.id` (không phải `User.id`), nên không thể
 * dùng `/users/lookup` để giải quyết tên — hiển thị dưới dạng "Mã nhân sự: {id}" thay thế.
 */
export default function ProjectRecognizedRevenuePage({
  projectId,
  currentUserRoles = ['VT-01'],
  onBack,
  initialRevenue,
}: ProjectRecognizedRevenuePageProps) {
  // Quyền truy cập màn hình: chỉ VT-01, VT-05 (khớp @PreAuthorize backend, TC-04).
  const canViewScreen = currentUserRoles.includes('VT-01') || currentUserRoles.includes('VT-05');

  const [revenue, setRevenue] = useState<RecognizedRevenueRes | null>(initialRevenue ?? null);
  const [loading, setLoading] = useState(!initialRevenue);
  const [error, setError] = useState<string | null>(null);
  const [unsupported, setUnsupported] = useState(false);
  const [project, setProject] = useState<ProjectRes | null>(null);
  const [recalculating, setRecalculating] = useState(false);

  const loadData = useCallback(async () => {
    if (!canViewScreen) return;
    setLoading(true);
    setError(null);
    setUnsupported(false);
    try {
      const data = await getProjectRecognizedRevenue(projectId);
      setRevenue(data);
    } catch (err) {
      const message =
        err instanceof ProfitabilityApiError || err instanceof ProjectsApiError || err instanceof Error
          ? err.message
          : 'Không thể tải doanh thu ghi nhận dự án.';
      setError(message);
      setUnsupported(err instanceof ProfitabilityApiError && err.code === 'INVALID_STATE');
      setRevenue(null);
    } finally {
      setLoading(false);
    }
  }, [projectId, canViewScreen]);

  useEffect(() => {
    if (!initialRevenue) {
      void loadData();
    }
  }, [loadData, initialRevenue]);

  useEffect(() => {
    if (initialRevenue) return;
    void (async () => {
      try {
        const proj = await getProject(projectId);
        setProject(proj);
      } catch {
        // Không báo lỗi nếu không lấy được thông tin dự án — vẫn hiển thị doanh thu.
      }
    })();
  }, [projectId, initialRevenue]);

  // Backend tính động doanh thu mỗi lần gọi GET, nên "tính lại" tương đương gọi lại
  // API để lấy kết quả mới nhất (không có endpoint recalculate riêng).
  const handleRecalculate = useCallback(async () => {
    setRecalculating(true);
    try {
      await loadData();
    } finally {
      setRecalculating(false);
    }
  }, [loadData]);

  if (!canViewScreen) {
    return (
      <div className="user-management-page ia-page" data-testid="revenue-forbidden">
        <div className="alert-box alert-box--danger" role="alert">
          Bạn không có quyền xem doanh thu ghi nhận dự án này (yêu cầu vai trò Ban giám đốc
          VT-01 hoặc Kế toán VT-05).
        </div>
        {onBack && (
          <button type="button" className="btn btn-secondary ia-denied-back" onClick={onBack}>
            {ICONS.arrowLeft} Quay lại
          </button>
        )}
      </div>
    );
  }

  const isHourly = revenue?.recognitionMethod === 'HOURLY';
  const isCompletion = revenue?.recognitionMethod === 'PERCENTAGE_OF_COMPLETION';

  return (
    <div className="user-management-page ia-page" data-testid="revenue-page">
      <div className="page-header">
        <div className="ia-head">
          {onBack && (
            <button
              type="button"
              className="btn btn-secondary btn-sm btn-back"
              onClick={onBack}
              data-testid="btn-back-revenue"
            >
              {ICONS.arrowLeft} Quay lại
            </button>
          )}
          <div>
            <h1 className="page-title">
              Doanh thu ghi nhận dự án
            </h1>
            <p className="page-subtitle" data-testid="project-code">{project?.projectCode || `Mã: ${projectId}`}</p>
          </div>
        </div>

        <div className="page-header__actions">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={loadData}
            disabled={loading}
            data-testid="btn-reload-revenue"
          >
            {ICONS.refresh} Tải lại
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={handleRecalculate}
            disabled={recalculating || loading}
            data-testid="btn-recalculate-revenue"
          >
            {ICONS.wrench} {recalculating ? 'Đang tính...' : 'Tính lại'}
          </button>
        </div>
      </div>

      {error && (
        <div
          className={`alert-box ${unsupported ? 'alert-box--warning' : 'alert-box--danger'}`}
          role="alert"
          data-testid="revenue-error"
        >
          {error}
        </div>
      )}

      {loading ? (
        <ReportSkeleton testId="revenue-loading" label="Đang tải doanh thu ghi nhận..." kpis={4} tableColumns={7} />
      ) : !revenue ? (
        !error && (
          <div className="table-empty-state" data-testid="revenue-empty">
            <div className="table-empty-state__icon">{ICONS.chart}</div>
            <h3>Không có dữ liệu</h3>
            <p className="ia-inline-empty">
              Dự án này chưa có dữ liệu để tính doanh thu ghi nhận.
            </p>
          </div>
        )
      ) : (
        <>
          <div
            className="alert-box alert-box--info"
            role="status"
            data-testid="revenue-contract-info"
          >
            <strong>Loại hợp đồng:</strong> {CONTRACT_TYPE_LABELS[revenue.contractType]}
            <span className="ia-sep" aria-hidden="true">·</span>
            <strong>Phương thức ghi nhận:</strong> {RECOGNITION_METHOD_LABELS[revenue.recognitionMethod]}
          </div>

          {isHourly && revenue.missingRateEntryCount > 0 && (
            <div
              className="alert-box alert-box--warning"
              role="alert"
              data-testid="revenue-missing-alert"
            >
              <strong>Cảnh báo:</strong> Có {revenue.missingRateEntryCount} dòng giờ công đã duyệt và tính phí
              chưa tra được đơn giá áp dụng — doanh thu của những dòng này chưa được tính vào tổng.
            </div>
          )}

          <div className="stats-grid">
            <div className="stat-card" data-testid="kpi-total-revenue">
              <span className="stat-card__label">Tổng doanh thu ghi nhận</span>
              <strong className="stat-card__value stat-card__value--md">
                {formatCurrency(revenue.totalRecognizedRevenue)}
              </strong>
            </div>

            {isHourly && (
              <>
                <div className="stat-card" data-testid="kpi-total-hours">
                  <span className="stat-card__label">Tổng giờ tính phí</span>
                  <strong className="stat-card__value">
                    {formatHours(revenue.totalBillableHours ?? 0)}
                  </strong>
                </div>
                <div className="stat-card" data-testid="kpi-excluded-lines">
                  <span className="stat-card__label">Dòng không tính phí</span>
                  <strong className="stat-card__value">
                    {revenue.excludedLineCount}
                  </strong>
                </div>
              </>
            )}

            {isCompletion && (
              <>
                <div className="stat-card" data-testid="kpi-completion-rate">
                  <span className="stat-card__label">Tỷ lệ hoàn thành</span>
                  <strong className="stat-card__value">
                    {formatPercent(revenue.completionRate ?? 0)}
                  </strong>
                </div>
                <div className="stat-card" data-testid="kpi-tasks">
                  <span className="stat-card__label">Công việc hoàn thành</span>
                  <strong className="stat-card__value">
                    {revenue.doneTaskCount ?? 0}/{revenue.totalTaskCount ?? 0}
                  </strong>
                </div>
              </>
            )}
          </div>

          {isHourly && (
            <div className="user-table-card ia-card-pad" data-testid="revenue-detail-table">
              <div className="ia-section-head">
                <h3 className="ia-section-title">
                  Chi tiết từng dòng giờ công
                </h3>
              </div>

              {revenue.lines.length === 0 ? (
                <p className="ia-inline-empty" data-testid="revenue-lines-empty">
                  Dự án này chưa có giờ công đã duyệt để tính doanh thu.
                </p>
              ) : (
                <div className="table-responsive">
                  <table className="user-data-table">
                    <thead>
                      <tr>
                        <th>Ngày công</th>
                        <th>Mã nhân sự</th>
                        <th className="text-right">Số giờ</th>
                        <th className="text-right">Đơn giá/giờ</th>
                        <th className="text-right">Doanh thu</th>
                        <th>Tính phí</th>
                        <th>Trạng thái dữ liệu</th>
                      </tr>
                    </thead>
                    <tbody>
                      {revenue.lines.map((line) => (
                        <tr key={line.timeEntryId} data-testid={`revenue-line-${line.timeEntryId}`}>
                          <td>{line.workDate}</td>
                          <td>Mã nhân sự: {line.employeeId}</td>
                          <td className="ia-num">{formatHours(line.hours)}</td>
                          <td className="ia-num">{formatCurrency(line.appliedRate)}</td>
                          <td className="ia-num">{formatCurrency(line.lineRevenue)}</td>
                          <td>
                            {line.billable ? (
                              <span className="badge badge--green" data-testid={`billable-${line.timeEntryId}`}>
                                {ICONS.checkCircle} Tính phí
                              </span>
                            ) : (
                              <span className="badge badge--gray" data-testid={`excluded-${line.timeEntryId}`}>
                                Không tính phí
                              </span>
                            )}
                          </td>
                          <td>
                            {line.missingRateData ? (
                              <span
                                className="badge badge--gold"
                                data-testid={`missing-rate-${line.timeEntryId}`}
                              >
                                {ICONS.alertTriangle} Chưa có đơn giá
                              </span>
                            ) : (
                              <span className="badge badge--green" data-testid={`rate-ok-${line.timeEntryId}`}>
                                {ICONS.checkCircle} Có dữ liệu
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
