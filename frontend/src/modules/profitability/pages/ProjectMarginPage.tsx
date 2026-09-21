import { useCallback, useEffect, useState } from 'react';
import { ICONS } from '../../../components/common/icons';
import MaskedCell from '../../../components/common/MaskedCell';
import { canViewSensitiveData } from '../../../hooks/usePermission';
import type { ProjectRes } from '../../projects/types/projectTypes';
import { getProject, ProjectsApiError } from '../../projects/api/projectsApi';
import type { ProjectMarginRes } from '../types/profitabilityTypes';
import { getProjectMargin, ProfitabilityApiError } from '../api/profitabilityApi';

export interface ProjectMarginPageProps {
  projectId: number;
  currentUserRoles?: string[];
  onBack?: () => void;
  initialMargin?: ProjectMarginRes;
}

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
 * Màn hình hiển thị biên lợi nhuận gộp thời gian thực của dự án (NCL-09-CN-003).
 *
 * Biên lợi nhuận được backend tính động mỗi lần đọc: `totalCost = laborCost +
 * projectExpenseCost + subcontractorCost`, `grossProfit = recognizedRevenue - totalCost`,
 * `marginRate = grossProfit / recognizedRevenue` (`null` khi doanh thu bằng 0).
 *
 * Cho phép VT-01 (Ban giám đốc), VT-02 (Quản lý dự án), VT-05 (Kế toán) xem màn hình.
 * Các trường tổng hợp (doanh thu, chi phí, lợi nhuận, tỷ suất) hiển thị cho MỌI vai trò
 * xem được màn hình — chỉ riêng `hourlyRate`/`laborCost` trong từng dòng của bảng "Chi
 * tiết giá vốn giờ công" mới bị che với Quản lý dự án (VT-02, không có quyền xem dữ liệu
 * lương QTN-02), theo đúng cơ chế `@MaskSensitive(COST)` của backend.
 *
 * Vì `employeeId` trong response là `Employee.id` (không phải `User.id`), nên không thể
 * dùng `/users/lookup` để giải quyết tên — hiển thị dưới dạng "Mã nhân sự: {id}" thay thế.
 */
export default function ProjectMarginPage({
  projectId,
  currentUserRoles = ['VT-01'],
  onBack,
  initialMargin,
}: ProjectMarginPageProps) {
  // Quyền truy cập màn hình: VT-01, VT-02, VT-05 (khớp @PreAuthorize backend).
  const canViewScreen =
    currentUserRoles.includes('VT-01') ||
    currentUserRoles.includes('VT-02') ||
    currentUserRoles.includes('VT-05');

  // QTN-02: chỉ VT-01/VT-05/VT-06 xem được hourlyRate/laborCost thật trong từng dòng.
  const sensitive = canViewSensitiveData(currentUserRoles);

  const [margin, setMargin] = useState<ProjectMarginRes | null>(initialMargin ?? null);
  const [loading, setLoading] = useState(!initialMargin);
  const [error, setError] = useState<string | null>(null);
  const [project, setProject] = useState<ProjectRes | null>(null);
  const [recalculating, setRecalculating] = useState(false);

  const loadData = useCallback(async () => {
    if (!canViewScreen) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getProjectMargin(projectId);
      setMargin(data);
    } catch (err) {
      const message =
        err instanceof ProfitabilityApiError || err instanceof ProjectsApiError || err instanceof Error
          ? err.message
          : 'Không thể tải biên lợi nhuận dự án.';
      setError(message);
      setMargin(null);
    } finally {
      setLoading(false);
    }
  }, [projectId, canViewScreen]);

  useEffect(() => {
    if (!initialMargin) {
      void loadData();
    }
  }, [loadData, initialMargin]);

  useEffect(() => {
    if (initialMargin) return;
    void (async () => {
      try {
        const proj = await getProject(projectId);
        setProject(proj);
      } catch {
        // Không báo lỗi nếu không lấy được thông tin dự án — vẫn hiển thị biên lợi nhuận.
      }
    })();
  }, [projectId, initialMargin]);

  // Backend tính động biên lợi nhuận mỗi lần gọi GET, nên "tính lại" tương đương gọi
  // lại API để lấy kết quả mới nhất (không có endpoint recalculate riêng).
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
      <div className="user-management-page" data-testid="margin-forbidden">
        <div className="alert-box alert-box--danger" role="alert">
          Bạn không có quyền xem biên lợi nhuận dự án này (yêu cầu vai trò Ban giám đốc
          VT-01, Quản lý dự án VT-02 hoặc Kế toán VT-05).
        </div>
        {onBack && (
          <button type="button" className="btn btn-secondary" onClick={onBack} style={{ marginTop: '16px' }}>
            {ICONS.arrowLeft} Quay lại
          </button>
        )}
      </div>
    );
  }

  const grossProfitClass = margin && margin.grossProfit < 0 ? 'text-danger' : 'text-success';

  return (
    <div className="user-management-page" data-testid="margin-page">
      <div className="page-header" style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {onBack && (
            <button
              type="button"
              className="btn btn-secondary btn-sm btn-back"
              onClick={onBack}
              data-testid="btn-back-margin"
            >
              {ICONS.arrowLeft} Quay lại
            </button>
          )}
          <div>
            <div className="page-header__kicker">
              <span className="page-header__tag">{ICONS.chart} BIÊN LỢI NHUẬN</span>
              <span className="page-header__dot" />
              <span className="page-header__meta">{project?.projectCode || `Mã: ${projectId}`}</span>
            </div>
            <h1 className="page-title" style={{ margin: '4px 0' }}>
              Biên lợi nhuận thời gian thực
            </h1>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={loadData}
            disabled={loading}
            data-testid="btn-reload-margin"
          >
            {ICONS.refresh} Tải lại
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={handleRecalculate}
            disabled={recalculating || loading}
            data-testid="btn-recalculate-margin"
          >
            {ICONS.wrench} {recalculating ? 'Đang tính...' : 'Tính lại'}
          </button>
        </div>
      </div>

      {error && (
        <div
          className="alert-box alert-box--danger"
          role="alert"
          style={{ marginBottom: '16px' }}
          data-testid="margin-error"
        >
          {error}
        </div>
      )}

      {loading ? (
        <div className="table-loading-state" data-testid="margin-loading">
          <span className="spinner-lg" />
          <p style={{ marginTop: '10px' }}>Đang tải biên lợi nhuận...</p>
        </div>
      ) : !margin ? (
        !error && (
          <div className="table-empty-state" data-testid="margin-empty">
            <div className="table-empty-state__icon">{ICONS.chart}</div>
            <h4 style={{ margin: '0 0 6px', fontSize: '15px', color: 'var(--ink-strong)' }}>Không có dữ liệu</h4>
            <p style={{ margin: 0, color: 'var(--ink-muted)', fontSize: '13.5px' }}>
              Dự án này chưa có đủ dữ liệu để tính biên lợi nhuận.
            </p>
          </div>
        )
      ) : (
        <>
          {(margin.missingCostEntryCount > 0 || margin.missingRateEntryCount > 0) && (
            <div
              className="alert-box alert-box--warning"
              role="alert"
              style={{ marginBottom: '16px' }}
              data-testid="margin-missing-alert"
            >
              <strong>Cảnh báo:</strong>{' '}
              {margin.missingCostEntryCount > 0 && (
                <>Có {margin.missingCostEntryCount} dòng giờ công chưa có mức chi phí nội bộ. </>
              )}
              {margin.missingRateEntryCount > 0 && (
                <>Có {margin.missingRateEntryCount} dòng giờ công chưa tra được đơn giá bán. </>
              )}
              Các dòng này chưa được cộng vào tổng chi phí/doanh thu bên dưới.
            </div>
          )}

          {/* Bảng chỉ số doanh thu & chi phí thành phần — hiển thị cho mọi vai trò xem được màn hình. */}
          <div className="stats-grid">
            <div className="stat-card" data-testid="kpi-revenue">
              <span className="stat-card__label">Doanh thu ghi nhận</span>
              <strong className="stat-card__value stat-card__value--md">{formatCurrency(margin.recognizedRevenue)}</strong>
            </div>
            <div className="stat-card" data-testid="kpi-labor-cost">
              <span className="stat-card__label">Giá vốn giờ công</span>
              <strong className="stat-card__value stat-card__value--md">{formatCurrency(margin.laborCost)}</strong>
            </div>
            <div className="stat-card" data-testid="kpi-project-expense">
              <span className="stat-card__label">Chi phí dự án</span>
              <strong className="stat-card__value stat-card__value--md">{formatCurrency(margin.projectExpenseCost)}</strong>
            </div>
            <div className="stat-card" data-testid="kpi-subcontractor-cost">
              <span className="stat-card__label">Chi phí thuê ngoài</span>
              <strong className="stat-card__value stat-card__value--md">{formatCurrency(margin.subcontractorCost)}</strong>
            </div>
            <div className="stat-card" data-testid="kpi-total-cost">
              <span className="stat-card__label">Tổng chi phí</span>
              <strong className="stat-card__value stat-card__value--md">{formatCurrency(margin.totalCost)}</strong>
            </div>
          </div>

          {/* Kết quả — lợi nhuận gộp & tỷ suất, màu ngữ nghĩa theo dấu (xanh lãi / đỏ lỗ). */}
          <div className="stats-grid">
            <div className="stat-card" data-testid="kpi-gross-profit">
              <span className="stat-card__label">Lợi nhuận gộp</span>
              <strong className={`stat-card__value stat-card__value--md ${grossProfitClass}`}>
                {formatCurrency(margin.grossProfit)}
              </strong>
            </div>
            <div className="stat-card" data-testid="kpi-margin-rate">
              <span className="stat-card__label">Tỷ suất lợi nhuận</span>
              <strong className={`stat-card__value ${grossProfitClass}`}>
                {margin.marginRate === null ? '—' : formatPercent(margin.marginRate)}
              </strong>
            </div>
          </div>
          {/* Chi tiết giá vốn giờ công — hourlyRate/laborCost bị che với VT-02 (QTN-02). */}
          <div className="user-table-card" style={{ padding: '20px', marginBottom: '20px' }} data-testid="margin-labor-cost-table">
            <div style={{ marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--ink-strong)' }}>
                Chi tiết giá vốn giờ công
              </h3>
            </div>

            {margin.laborCostLines.length === 0 ? (
              <p style={{ margin: 0, color: 'var(--ink-muted)', fontSize: '13.5px' }} data-testid="margin-labor-cost-empty">
                Dự án này chưa có giờ công đã duyệt để tính giá vốn.
              </p>
            ) : (
              <div className="table-responsive">
                <table className="user-data-table">
                  <thead>
                    <tr>
                      <th>Ngày công</th>
                      <th>Mã nhân sự</th>
                      <th style={{ textAlign: 'right' }}>Số giờ</th>
                      <th style={{ textAlign: 'right' }}>Đơn giá/giờ</th>
                      <th style={{ textAlign: 'right' }}>Giá vốn</th>
                      <th>Trạng thái dữ liệu</th>
                    </tr>
                  </thead>
                  <tbody>
                    {margin.laborCostLines.map((line) => (
                      <tr key={line.timeEntryId} data-testid={`margin-labor-cost-line-${line.timeEntryId}`}>
                        <td>{line.workDate}</td>
                        <td>Mã nhân sự: {line.employeeId}</td>
                        <td style={{ textAlign: 'right' }}>{formatHours(line.hours)}</td>
                        <td style={{ textAlign: 'right' }}>
                          <MaskedCell canView={sensitive} maskedText="••••••">
                            {formatCurrency(line.hourlyRate)}
                          </MaskedCell>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <MaskedCell canView={sensitive} maskedText="••••••">
                            {formatCurrency(line.laborCost)}
                          </MaskedCell>
                        </td>
                        <td>
                          {line.missingCostData ? (
                            <span className="badge badge--gold" data-testid={`missing-cost-${line.timeEntryId}`}>
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
            )}
          </div>

          {/* Chi tiết doanh thu ghi nhận — không có trường nào bị che ở đây. */}
          <div className="user-table-card" style={{ padding: '20px' }} data-testid="margin-revenue-table">
            <div style={{ marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--ink-strong)' }}>
                Chi tiết doanh thu ghi nhận
              </h3>
            </div>

            {margin.revenueLines.length === 0 ? (
              <p style={{ margin: 0, color: 'var(--ink-muted)', fontSize: '13.5px' }} data-testid="margin-revenue-empty">
                Dự án này chưa có giờ công đã duyệt và tính phí để ghi nhận doanh thu.
              </p>
            ) : (
              <div className="table-responsive">
                <table className="user-data-table">
                  <thead>
                    <tr>
                      <th>Ngày công</th>
                      <th>Mã nhân sự</th>
                      <th style={{ textAlign: 'right' }}>Số giờ</th>
                      <th style={{ textAlign: 'right' }}>Đơn giá/giờ</th>
                      <th style={{ textAlign: 'right' }}>Doanh thu</th>
                      <th>Tính phí</th>
                      <th>Trạng thái dữ liệu</th>
                    </tr>
                  </thead>
                  <tbody>
                    {margin.revenueLines.map((line) => (
                      <tr key={line.timeEntryId} data-testid={`margin-revenue-line-${line.timeEntryId}`}>
                        <td>{line.workDate}</td>
                        <td>Mã nhân sự: {line.employeeId}</td>
                        <td style={{ textAlign: 'right' }}>{formatHours(line.hours)}</td>
                        <td style={{ textAlign: 'right' }}>{formatCurrency(line.appliedRate)}</td>
                        <td style={{ textAlign: 'right' }}>{formatCurrency(line.lineRevenue)}</td>
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
                            <span className="badge badge--gold" data-testid={`missing-rate-${line.timeEntryId}`}>
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
        </>
      )}
    </div>
  );
}
