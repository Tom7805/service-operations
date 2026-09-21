import { useCallback, useState, type FormEvent } from 'react';
import { ICONS } from '../../../components/common/icons';
import type { MarginByEmployeeRes } from '../types/profitabilityTypes';
import { getMarginByEmployee, ProfitabilityApiError } from '../api/profitabilityApi';

export interface MarginByEmployeePageProps {
  currentUserRoles?: string[];
  onBack?: () => void;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
}

function formatHours(hours: number): string {
  return new Intl.NumberFormat('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(hours);
}

/** `marginPercent` backend trả sẵn dạng đã nhân 100 (60.00 = 60%) — chỉ định dạng số, không nhân lại. */
function formatMarginPercent(percent: number | null): string {
  if (percent === null) return '—';
  return `${new Intl.NumberFormat('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(percent)}%`;
}

function firstDayOfMonthISO(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Báo cáo biên lợi nhuận theo nhân sự (NCL-09-CN-005, TC-02).
 *
 * Gộp doanh thu ghi nhận và giá vốn giờ công của mọi dòng giờ công đã duyệt (`APPROVED`) có
 * `workDate` trong kỳ `from`..`to`, theo từng nhân sự thực hiện (trên mọi dự án).
 *
 * Chỉ Ban giám đốc (VT-01) được xem báo cáo này — vai trò khác (kể cả Quản lý dự án VT-02)
 * nhận `403 FORBIDDEN` (TC-02 của story: dữ liệu chi phí/biên lợi nhuận theo từng nhân sự
 * nhạy cảm hơn dữ liệu theo khách hàng).
 */
export default function MarginByEmployeePage({
  currentUserRoles = ['VT-01'],
  onBack,
}: MarginByEmployeePageProps) {
  const canViewScreen = currentUserRoles.includes('VT-01');

  const [fromInput, setFromInput] = useState(firstDayOfMonthISO());
  const [toInput, setToInput] = useState(todayISO());
  const [fieldError, setFieldError] = useState<string | undefined>(undefined);

  const [report, setReport] = useState<MarginByEmployeeRes | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const loadReport = useCallback(async (from: string, to: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await getMarginByEmployee(from, to);
      setReport(data);
      setHasSearched(true);
    } catch (err) {
      const message =
        err instanceof ProfitabilityApiError || err instanceof Error
          ? err.message
          : 'Không thể tải báo cáo biên lợi nhuận theo nhân sự.';
      setError(message);
      setReport(null);
    } finally {
      setLoading(false);
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
      void loadReport(fromInput, toInput);
    },
    [fromInput, toInput, loadReport]
  );

  if (!canViewScreen) {
    return (
      <div className="user-management-page" data-testid="margin-by-employee-forbidden">
        <div className="alert-box alert-box--danger" role="alert">
          Bạn không có quyền xem báo cáo biên lợi nhuận theo nhân sự (chỉ dành cho Ban giám đốc
          VT-01).
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
    <div className="user-management-page" data-testid="margin-by-employee-page">
      <div className="page-header" style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {onBack && (
            <button
              type="button"
              className="btn btn-secondary btn-sm btn-back"
              onClick={onBack}
              data-testid="btn-back-margin-by-employee"
            >
              {ICONS.arrowLeft} Quay lại
            </button>
          )}
          <div>
            <div className="page-header__kicker">
              <span className="page-header__tag">{ICONS.users} BIÊN LỢI NHUẬN THEO NHÂN SỰ</span>
            </div>
            <h1 className="page-title" style={{ margin: '4px 0' }}>
              Báo cáo biên lợi nhuận theo nhân sự
            </h1>
            <p className="page-subtitle">
              Gộp doanh thu ghi nhận và giá vốn giờ công đã duyệt của mọi dự án theo từng nhân sự
              thực hiện trong kỳ.
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} noValidate className="user-table-card" style={{ padding: '20px', marginBottom: '16px' }}>
        <div className="toolbar-filters" style={{ display: 'flex', alignItems: 'flex-end', gap: '16px', flexWrap: 'wrap' }}>
          <div className="filter-group">
            <label className="filter-label" htmlFor="margin-employee-from">
              Từ ngày <span className="field-required">*</span>
            </label>
            <input
              id="margin-employee-from"
              type="date"
              className="form-input"
              style={{ height: 38 }}
              value={fromInput}
              onChange={(e) => setFromInput(e.target.value)}
              disabled={loading}
              data-testid="margin-employee-from-input"
            />
          </div>
          <div className="filter-group">
            <label className="filter-label" htmlFor="margin-employee-to">
              Đến ngày <span className="field-required">*</span>
            </label>
            <input
              id="margin-employee-to"
              type="date"
              className="form-input"
              style={{ height: 38 }}
              value={toInput}
              onChange={(e) => setToInput(e.target.value)}
              disabled={loading}
              data-testid="margin-employee-to-input"
            />
          </div>
          <button type="submit" className="btn btn-primary btn-sm" disabled={loading} data-testid="btn-view-margin-by-employee">
            {ICONS.search} {loading ? 'Đang tải...' : 'Xem báo cáo'}
          </button>
        </div>
        {fieldError && (
          <p className="field-error" data-testid="error-margin-by-employee" style={{ color: '#DC2626', fontSize: '13px', marginTop: '8px' }}>
            {fieldError}
          </p>
        )}
      </form>

      {error && (
        <div className="alert-box alert-box--danger" role="alert" style={{ marginBottom: '16px' }} data-testid="margin-by-employee-error">
          {error}
        </div>
      )}

      {loading ? (
        <div className="table-loading-state" data-testid="margin-by-employee-loading">
          <span className="spinner-lg" />
          <p style={{ marginTop: '10px' }}>Đang tải báo cáo...</p>
        </div>
      ) : !hasSearched ? (
        !error && (
          <div className="table-empty-state" data-testid="margin-by-employee-prompt">
            <div className="table-empty-state__icon">{ICONS.users}</div>
            <p style={{ margin: 0, color: '#64748B', fontSize: '13.5px' }}>
              Chọn khoảng thời gian rồi bấm "Xem báo cáo" để xem biên lợi nhuận theo nhân sự.
            </p>
          </div>
        )
      ) : (
        report && (
          <>
            {(report.missingCostEntryCount > 0 || report.missingRevenueEntryCount > 0) && (
              <div className="alert-box alert-box--warning" role="alert" style={{ marginBottom: '16px' }} data-testid="margin-by-employee-missing-alert">
                <strong>Cảnh báo:</strong>{' '}
                {report.missingCostEntryCount > 0 && <>Có {report.missingCostEntryCount} dòng giờ công chưa có chi phí hiệu lực. </>}
                {report.missingRevenueEntryCount > 0 && <>Có {report.missingRevenueEntryCount} dòng giờ công tính phí chưa có đơn giá hiệu lực. </>}
                Các dòng này không được cộng vào tổng bên dưới.
              </div>
            )}

            <div className="kpi-row" style={{ display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
              <div className="kpi-card" style={{ flex: '1', minWidth: '180px', padding: '20px', border: '1px solid #E2E8F0', borderRadius: '8px', background: '#FFF' }} data-testid="kpi-total-revenue">
                <div style={{ fontSize: '13px', color: '#64748B', marginBottom: '8px' }}>Tổng doanh thu</div>
                <div style={{ fontSize: '24px', fontWeight: 700, color: '#1E293B' }}>{formatCurrency(report.totalRevenue)}</div>
              </div>
              <div className="kpi-card" style={{ flex: '1', minWidth: '180px', padding: '20px', border: '1px solid #E2E8F0', borderRadius: '8px', background: '#FFF' }} data-testid="kpi-total-cost">
                <div style={{ fontSize: '13px', color: '#64748B', marginBottom: '8px' }}>Tổng giá vốn</div>
                <div style={{ fontSize: '24px', fontWeight: 700, color: '#1E293B' }}>{formatCurrency(report.totalCost)}</div>
              </div>
              <div className="kpi-card" style={{ flex: '1', minWidth: '180px', padding: '20px', border: '1px solid #E2E8F0', borderRadius: '8px', background: '#FFF' }} data-testid="kpi-total-margin">
                <div style={{ fontSize: '13px', color: '#64748B', marginBottom: '8px' }}>Tổng biên lợi nhuận</div>
                <div style={{ fontSize: '24px', fontWeight: 700, color: report.totalMargin < 0 ? '#B91C1C' : '#15803D' }}>{formatCurrency(report.totalMargin)}</div>
              </div>
              <div className="kpi-card" style={{ flex: '1', minWidth: '180px', padding: '20px', border: '1px solid #E2E8F0', borderRadius: '8px', background: '#FFF' }} data-testid="kpi-total-margin-percent">
                <div style={{ fontSize: '13px', color: '#64748B', marginBottom: '8px' }}>Tỷ suất lợi nhuận</div>
                <div style={{ fontSize: '24px', fontWeight: 700, color: report.totalMargin < 0 ? '#B91C1C' : '#15803D' }}>{formatMarginPercent(report.totalMarginPercent)}</div>
              </div>
            </div>

            <div className="user-table-card" style={{ padding: '20px' }} data-testid="margin-by-employee-table">
              <div style={{ marginBottom: '16px' }}>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#1E293B' }}>Chi tiết theo nhân sự</h3>
              </div>

              {report.lines.length === 0 ? (
                <p style={{ margin: 0, color: '#64748B', fontSize: '13.5px' }} data-testid="margin-by-employee-empty">
                  Không có giờ công đã duyệt nào trong kỳ đã chọn.
                </p>
              ) : (
                <div className="table-responsive">
                  <table className="user-data-table">
                    <thead>
                      <tr>
                        <th>Nhân sự</th>
                        <th>Vai trò chuyên môn</th>
                        <th style={{ textAlign: 'right' }}>Số giờ đã duyệt</th>
                        <th style={{ textAlign: 'right' }}>Doanh thu</th>
                        <th style={{ textAlign: 'right' }}>Giá vốn</th>
                        <th style={{ textAlign: 'right' }}>Biên lợi nhuận</th>
                        <th style={{ textAlign: 'right' }}>Tỷ suất</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.lines.map((line) => (
                        <tr key={line.employeeId} data-testid={`margin-by-employee-line-${line.employeeId}`}>
                          <td>{line.employeeName}</td>
                          <td>{line.professionalRole || '—'}</td>
                          <td style={{ textAlign: 'right' }}>{formatHours(line.approvedHours)}</td>
                          <td style={{ textAlign: 'right' }}>{formatCurrency(line.revenue)}</td>
                          <td style={{ textAlign: 'right' }}>{formatCurrency(line.cost)}</td>
                          <td style={{ textAlign: 'right', color: line.margin < 0 ? '#B91C1C' : '#1E293B' }}>{formatCurrency(line.margin)}</td>
                          <td style={{ textAlign: 'right' }}>{formatMarginPercent(line.marginPercent)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )
      )}
    </div>
  );
}
