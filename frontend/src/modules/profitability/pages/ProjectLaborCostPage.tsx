import { useCallback, useEffect, useState } from 'react';
import { ICONS } from '../../../components/common/icons';
import MaskedCell from '../../../components/common/MaskedCell';
import { canViewSensitiveData } from '../../../hooks/usePermission';
import type { ProjectRes } from '../../projects/types/projectTypes';
import { getProject, ProjectsApiError } from '../../projects/api/projectsApi';
import type { ProjectLaborCostRes } from '../types/profitabilityTypes';
import { getProjectLaborCost, ProfitabilityApiError } from '../api/profitabilityApi';
import { ReportErrorAlert, ReportSkeleton } from '../../reports/components/ReportStates';

export interface ProjectLaborCostPageProps {
  projectId: number;
  currentUserRoles?: string[];
  onBack?: () => void;
  initialLaborCost?: ProjectLaborCostRes;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
}

function formatHours(hours: number): string {
  return new Intl.NumberFormat('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(hours);
}

/**
 * Màn hình tính giá vốn giờ công của dự án (NCL-09-CN-001).
 *
 * Hiển thị tổng hợp số giờ đã duyệt, tổng giá vốn và danh sách từng dòng giờ công
 * có giá vốn được tính (hours × hourlyRate). Dữ liệu nhạy cảm (hourlyRate, laborCost)
 * được backend masquing khi người dùng không có quyền xem dữ liệu lương/giá vốn —
 * frontend dùng `canViewSensitiveData` để hiển thị bằng MaskedCell.
 *
 * Vì `employeeId` trong response là `Employee.id` (không phải `User.id`), nên không thể
 * dùng `/users/lookup` để giải quyết tên — hiển thị dưới dạng "Mã nhân sự: {id}" thay thế.
 */
export default function ProjectLaborCostPage({
  projectId,
  currentUserRoles = ['VT-01'],
  onBack,
  initialLaborCost,
}: ProjectLaborCostPageProps) {
  // Quyền truy cập màn hình: VT-01, VT-02, VT-05 (khớp @PreAuthorize backend).
  const canViewScreen =
    currentUserRoles.includes('VT-01') ||
    currentUserRoles.includes('VT-02') ||
    currentUserRoles.includes('VT-05');

  // RBAC: Project Manager (VT-02) chỉ được xem Summary Card, không thấy bảng chi tiết nhân sự.
  const isProjectManager = currentUserRoles.includes('VT-02') && !currentUserRoles.includes('VT-01');
  const canViewTableDetail = !isProjectManager;

  const sensitive = canViewSensitiveData(currentUserRoles);

  const [laborCost, setLaborCost] = useState<ProjectLaborCostRes | null>(initialLaborCost ?? null);
  const [loading, setLoading] = useState(!initialLaborCost);
  const [error, setError] = useState<string | null>(null);
  const [project, setProject] = useState<ProjectRes | null>(null);
  const [recalculating, setRecalculating] = useState(false);

  const loadData = useCallback(async () => {
    if (!canViewScreen) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getProjectLaborCost(projectId);
      setLaborCost(data);
    } catch (err) {
      const message =
        err instanceof ProfitabilityApiError || err instanceof ProjectsApiError || err instanceof Error
          ? err.message
          : 'Không thể tải giá vốn giờ công dự án.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [projectId, canViewScreen]);

  useEffect(() => {
    if (!initialLaborCost) {
      void loadData();
    }
  }, [loadData, initialLaborCost]);

  useEffect(() => {
    if (initialLaborCost) return;
    void (async () => {
      try {
        const proj = await getProject(projectId);
        setProject(proj);
      } catch {
        // Không báo lỗi nếu không lấy được thông tin dự án — vẫn hiển thị giá vốn.
      }
    })();
  }, [projectId, initialLaborCost]);

  // Backend tính động giá vốn từ các dòng giờ công APPROVED mỗi lần gọi GET, nên "tính lại"
  // tương đương gọi lại API để lấy kết quả mới nhất (không có endpoint recalculate riêng).
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
      <div className="user-management-page ia-page" data-testid="labor-cost-forbidden">
        <div className="alert-box alert-box--danger" role="alert">
          Bạn không có quyền xem giá vốn giờ công dự án này (yêu cầu vai trò Ban giám đốc
          VT-01, Quản lý dự án VT-02 hoặc Kế toán VT-05).
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
    <div className="user-management-page ia-page" data-testid="labor-cost-page">
      <div className="page-header">
        <div className="ia-head">
          {onBack && (
            <button
              type="button"
              className="btn btn-secondary btn-sm btn-back"
              onClick={onBack}
              data-testid="btn-back-labor-cost"
            >
              {ICONS.arrowLeft} Quay lại
            </button>
          )}
          <div>
            <h1 className="page-title">
              Giá vốn giờ công dự án
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
            data-testid="btn-reload-labor-cost"
          >
            {ICONS.refresh} Tải lại
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={handleRecalculate}
            disabled={recalculating || loading}
            data-testid="btn-recalculate-labor-cost"
          >
            {ICONS.wrench} {recalculating ? 'Đang tính...' : 'Tính lại'}
          </button>
        </div>
      </div>

      {error && (
        <ReportErrorAlert testId="labor-cost-error" message={error} onRetry={() => void loadData()} retryDisabled={loading} />
      )}

      {loading ? (
        <ReportSkeleton testId="labor-cost-loading" label="Đang tải giá vốn giờ công..." kpis={4} tableColumns={6} />
      ) : !laborCost || laborCost.lines.length === 0 ? (
        <div className="table-empty-state" data-testid="labor-cost-empty">
          <div className="table-empty-state__icon">{ICONS.money}</div>
          <h3>Không có dữ liệu</h3>
          <p className="ia-inline-empty">
            Dự án này chưa có giờ công đã duyệt để tính giá vốn.
          </p>
        </div>
      ) : (
        <>
          {laborCost.missingCostEntryCount > 0 && (
            <div
              className="alert-box alert-box--warning"
              role="alert"
              data-testid="labor-cost-missing-alert"
            >
              <strong>Cảnh báo:</strong> Có {laborCost.missingCostEntryCount} dòng giờ công đã duyệt chưa có
              mức chi phí giờ công nội bộ — giá vốn của những dòng này sẽ chưa được tính vào tổng.
            </div>
          )}

          {/* Summary Card: 3 ô luôn hiển thị cho VT-01/VT-02/VT-05, nhưng riêng ô "Tổng giá vốn"
              (tiền) vẫn bị MaskedCell ẩn với VT-02 — chỉ số giờ/số dòng là hiện thật với VT-02. */}
          <div className="stats-grid">
            <div className="stat-card" data-testid="kpi-total-hours">
              <span className="stat-card__label">Tổng giờ đã duyệt</span>
              <strong className="stat-card__value">
                {formatHours(laborCost.totalApprovedHours)}
              </strong>
            </div>
            <div className="stat-card" data-testid="kpi-total-cost">
              <span className="stat-card__label">Tổng giá vốn</span>
              <strong className="stat-card__value stat-card__value--md">
                <MaskedCell canView={sensitive} maskedText="••••••••">
                  {formatCurrency(laborCost.totalLaborCost)}
                </MaskedCell>
              </strong>
            </div>
            <div className="stat-card" data-testid="kpi-lines-count">
              <span className="stat-card__label">Số dòng giờ công</span>
              <strong className="stat-card__value">
                {laborCost.lines.length}
              </strong>
            </div>
          </div>

          {/* RBAC: Ẩn bảng chi tiết cho Project Manager (VT-02) không có VT-01 */}
          {!canViewTableDetail && (
            <div className="alert-box alert-box--info" role="alert" data-testid="table-hidden-notice">
              <strong>Thông báo:</strong> Vai trò Quản lý dự án (VT-02) chỉ được xem tổng số giờ và số dòng giờ
              công. Số tiền giá vốn (đơn giá/giờ, tổng giá vốn) và bảng chi tiết từng nhân sự bị ẩn theo phân
              quyền — chỉ Ban giám đốc (VT-01), Kế toán (VT-05) và Nhân sự (VT-06) được xem số tiền này.
            </div>
          )}

          {canViewTableDetail && (
            <div className="user-table-card ia-card-pad" data-testid="labor-cost-detail-table">
              <div className="ia-section-head">
                <h3 className="ia-section-title">
                  Chi tiết từng dòng giờ công
                </h3>
              </div>

              <div className="table-responsive">
                <table className="user-data-table">
                  <thead>
                    <tr>
                      <th>Ngày công</th>
                      <th>Mã nhân sự</th>
                      <th className="text-right">Số giờ</th>
                      <th className="text-right">Đơn giá/giờ</th>
                      <th className="text-right">Giá vốn</th>
                      <th>Trạng thái dữ liệu</th>
                    </tr>
                  </thead>
                  <tbody>
                    {laborCost.lines.map((line) => (
                      <tr key={line.timeEntryId} data-testid={`labor-cost-line-${line.timeEntryId}`}>
                        <td>{line.workDate}</td>
                        <td>Mã nhân sự: {line.employeeId}</td>
                        <td className="ia-num">{formatHours(line.hours)}</td>
                        <td className="ia-num">
                          <MaskedCell canView={sensitive} maskedText="••••••">
                            {formatCurrency(line.hourlyRate)}
                          </MaskedCell>
                        </td>
                        <td className="ia-num">
                          <MaskedCell canView={sensitive} maskedText="••••••">
                            {formatCurrency(line.laborCost)}
                          </MaskedCell>
                        </td>
                        <td>
                          {line.missingCostData ? (
                            <span className="badge badge--warning" data-testid={`missing-cost-${line.timeEntryId}`}>
                              {ICONS.alertTriangle} Chưa có dữ liệu giá vốn
                            </span>
                          ) : (
                            <span className="badge badge--green" data-testid={`cost-ok-${line.timeEntryId}`}>
                              {ICONS.checkCircle} Có dữ liệu
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
