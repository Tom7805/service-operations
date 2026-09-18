import { useCallback, useEffect, useState } from 'react';
import { ICONS } from '../../../components/common/icons';
import MaskedCell from '../../../components/common/MaskedCell';
import { canViewSensitiveData } from '../../../hooks/usePermission';
import type { ProjectRes } from '../../projects/types/projectTypes';
import { getProject, ProjectsApiError } from '../../projects/api/projectsApi';
import type { ProjectLaborCostRes } from '../types/profitabilityTypes';
import { getProjectLaborCost, ProfitabilityApiError } from '../api/profitabilityApi';

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

  // Handler tính lại giá vốn — gọi API backend khi có endpoint (TODO).
  const handleRecalculate = useCallback(async () => {
    setRecalculating(true);
    try {
      console.log('[NCL-09-CN-001] Yêu cầu tính lại giá vốn cho projectId:', projectId);
      // TODO: Gọi POST /projects/{projectId}/profitability/labor-cost/recalculate khi backend hỗ trợ.
      await new Promise((r) => setTimeout(r, 500));
      await loadData();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Không thể tính lại giá vốn giờ công.';
      setError(message);
    } finally {
      setRecalculating(false);
    }
  }, [projectId, loadData]);

  // Handler xem lịch sử thay đổi — mở modal hoặc chuyển trang khi có route (TODO).
  const handleHistoryClick = useCallback(() => {
    console.log('[NCL-09-CN-001] Mở lịch sử thay đổi giá vốn cho projectId:', projectId);
    // TODO: Mở modal lịch sử hoặc navigate('/projects/:projectId/labor-cost/history').
  }, [projectId]);

  if (!canViewScreen) {
    return (
      <div className="user-management-page" data-testid="labor-cost-forbidden">
        <div className="alert-box alert-box--danger" role="alert">
          Bạn không có quyền xem giá vốn giờ công dự án này (yêu cầu vai trò Ban giám đốc
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

  return (
    <div className="user-management-page" data-testid="labor-cost-page">
      <div className="page-header" style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
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
            <div className="page-header__kicker">
              <span className="page-header__tag">{ICONS.money} GIÁ VỐN GIỜ CÔNG</span>
              <span className="page-header__dot" />
              <span className="page-header__meta">{project?.projectCode || `Mã: ${projectId}`}</span>
            </div>
            <h1 className="page-title" style={{ margin: '4px 0' }}>
              Giá vốn giờ công dự án
            </h1>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
            disabled={recalculating || !laborCost}
            data-testid="btn-recalculate-labor-cost"
          >
            {ICONS.wrench} {recalculating ? 'Đang tính...' : 'Tính lại'}
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleHistoryClick}
            data-testid="btn-history-labor-cost"
          >
            {ICONS.history} Lịch sử
          </button>
        </div>
      </div>

      {error && (
        <div
          className="alert-box alert-box--danger"
          role="alert"
          style={{ marginBottom: '16px' }}
          data-testid="labor-cost-error"
        >
          {error}
        </div>
      )}

      {loading ? (
        <div className="table-loading-state" data-testid="labor-cost-loading">
          <span className="spinner-lg" />
          <p style={{ marginTop: '10px' }}>Đang tải giá vốn giờ công...</p>
        </div>
      ) : !laborCost || laborCost.lines.length === 0 ? (
        <div className="table-empty-state" data-testid="labor-cost-empty">
          <div className="table-empty-state__icon">{ICONS.money}</div>
          <h4 style={{ margin: '0 0 6px', fontSize: '15px', color: '#1E293B' }}>Không có dữ liệu</h4>
          <p style={{ margin: 0, color: '#64748B', fontSize: '13.5px' }}>
            Dự án này chưa có giờ công đã duyệt để tính giá vốn.
          </p>
        </div>
      ) : (
        <>
          {laborCost.missingCostEntryCount > 0 && (
            <div
              className="alert-box alert-box--warning"
              role="alert"
              style={{ marginBottom: '16px' }}
              data-testid="labor-cost-missing-alert"
            >
              <strong>Cảnh báo:</strong> Có {laborCost.missingCostEntryCount} dòng giờ công đã duyệt chưa có
              mức chi phí giờ công nội bộ — giá vốn của những dòng này sẽ chưa được tính vào tổng.
            </div>
          )}

          {/* Summary Card: luôn hiển thị cho cả VT-01, VT-02, VT-05 */}
          <div
            className="kpi-row"
            style={{ display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}
          >
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
              data-testid="kpi-total-hours"
            >
              <div style={{ fontSize: '13px', color: '#64748B', marginBottom: '8px' }}>Tổng giờ đã duyệt</div>
              <div style={{ fontSize: '28px', fontWeight: 700, color: '#1E293B' }}>
                {formatHours(laborCost.totalApprovedHours)}
              </div>
            </div>
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
              data-testid="kpi-total-cost"
            >
              <div style={{ fontSize: '13px', color: '#64748B', marginBottom: '8px' }}>Tổng giá vốn</div>
              <div style={{ fontSize: '28px', fontWeight: 700, color: '#1E293B' }}>
                <MaskedCell canView={sensitive} maskedText="••••••••">
                  {formatCurrency(laborCost.totalLaborCost)}
                </MaskedCell>
              </div>
            </div>
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
              data-testid="kpi-lines-count"
            >
              <div style={{ fontSize: '13px', color: '#64748B', marginBottom: '8px' }}>Số dòng giờ công</div>
              <div style={{ fontSize: '28px', fontWeight: 700, color: '#1E293B' }}>
                {laborCost.lines.length}
              </div>
            </div>
          </div>

          {/* RBAC: Ẩn bảng chi tiết cho Project Manager (VT-02) không có VT-01 */}
          {!canViewTableDetail && (
            <div className="alert-box alert-box--info" role="alert" style={{ marginBottom: '16px' }} data-testid="table-hidden-notice">
              <strong>Thông báo:</strong> Vai trò Quản lý dự án (VT-02) chỉ được xem tổng hợp giá vốn.
              Bảng chi tiết từng nhân sự được ẩn theo phân quyền.
            </div>
          )}

          {canViewTableDetail && (
            <div className="user-table-card" style={{ padding: '20px' }} data-testid="labor-cost-detail-table">
              <div style={{ marginBottom: '16px' }}>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#1E293B' }}>
                  Chi tiết từng dòng giờ công
                </h3>
              </div>

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
                    {laborCost.lines.map((line) => (
                      <tr key={line.timeEntryId} data-testid={`labor-cost-line-${line.timeEntryId}`}>
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
