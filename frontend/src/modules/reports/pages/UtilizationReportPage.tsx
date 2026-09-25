import { useCallback, useMemo, useRef, useState, type FormEvent } from 'react';
import { ICONS } from '../../../components/common/icons';
import { getUtilizationReport, ReportsApiError } from '../api/reportsApi';
import type { UtilizationReportRes } from '../types/utilizationReportTypes';
import { ReportErrorAlert, ReportSkeleton } from '../components/ReportStates';

export interface UtilizationReportPageProps {
  currentUserRoles?: string[];
  onBack?: () => void;
}

const twoDecimalFormatter = new Intl.NumberFormat('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function formatHours(hours: number): string {
  return twoDecimalFormatter.format(hours);
}

/** `ratio` backend trả dạng phân số (0.7500 = 75%) — nhân 100 khi hiển thị; `null` khi thiếu giờ chuẩn. */
function formatRatio(ratio: number | null): string {
  if (ratio === null) return '—';
  return `${twoDecimalFormatter.format(ratio * 100)}%`;
}

const MISSING_STANDARD_HINT = 'Không có giờ chuẩn nhưng có giờ tính phí — có thể do nhập sai ngày vào làm/nghỉ việc';

/** Ô tỷ lệ: con số là thông tin chính, thanh mảnh bên cạnh giúp quét nhanh cả cột.
 *  Vượt 100% (làm quá giờ chuẩn) chuyển sang màu cảnh báo — màu mang nghĩa, kèm con số. */
function RatioCell({ ratio, flagOver = false }: { ratio: number | null; flagOver?: boolean }) {
  if (ratio === null) {
    return <span className="ia-dash">{formatRatio(ratio)}</span>;
  }
  const over = flagOver && ratio > 1;
  return (
    <span className={`ia-meter${over ? ' ia-meter--over' : ''}`}>
      <span className="ia-meter__value">{formatRatio(ratio)}</span>
      <span className="ia-meter__track" aria-hidden="true">
        <span className="ia-meter__fill" style={{ ['--ia-ratio' as string]: Math.max(0, Math.min(ratio, 1)) }} />
      </span>
    </span>
  );
}

function firstDayOfMonthISO(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Báo cáo tỷ lệ giờ tính phí (NCL-11-CN-002) — giờ tính phí ÷ giờ làm việc chuẩn (QTN-23) của kỳ chọn,
 * theo toàn công ty, từng bộ phận và từng người. Chỉ Ban giám đốc (VT-01) được xem — vai trò khác nhận
 * `403 FORBIDDEN` (TC-04), khớp `@PreAuthorize` của `UtilizationReportController`. Người đang làm việc
 * trong kỳ nhưng chưa ghi giờ nào vẫn hiện với tỷ lệ 0% (TC-03), không bị ẩn khỏi báo cáo.
 */
export default function UtilizationReportPage({ currentUserRoles = ['VT-01'], onBack }: UtilizationReportPageProps) {
  const canViewScreen = currentUserRoles.includes('VT-01');

  const [fromInput, setFromInput] = useState(firstDayOfMonthISO());
  const [toInput, setToInput] = useState(todayISO());
  const [fieldError, setFieldError] = useState<string | undefined>(undefined);
  const [employeeSearch, setEmployeeSearch] = useState('');

  const [report, setReport] = useState<UtilizationReportRes | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  /** Chỉ phản hồi của lần gọi mới nhất được ghi vào trang (bấm "Xem" liên tiếp với kỳ khác nhau). */
  const requestIdRef = useRef(0);

  const loadReport = useCallback(async (from: string, to: string) => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError(null);
    try {
      const data = await getUtilizationReport(from, to);
      if (requestId !== requestIdRef.current) return;
      setReport(data);
      setHasSearched(true);
    } catch (err) {
      if (requestId !== requestIdRef.current) return;
      const message =
        err instanceof ReportsApiError || err instanceof Error
          ? err.message
          : 'Không thể tải báo cáo tỷ lệ giờ tính phí.';
      setError(message);
      setReport(null);
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
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

  const filteredEmployees = useMemo(() => {
    const employees = report?.employees ?? [];
    const keyword = employeeSearch.trim().toLowerCase();
    if (!keyword) return employees;
    return employees.filter(
      (e) =>
        e.fullName.toLowerCase().includes(keyword) ||
        (e.professionalRole ?? '').toLowerCase().includes(keyword) ||
        (e.departmentName ?? '').toLowerCase().includes(keyword)
    );
  }, [report, employeeSearch]);

  if (!canViewScreen) {
    return (
      <div className="access-denied-container" data-testid="utilization-report-access-denied">
        <div className="access-denied-card">
          <div className="access-denied-icon">{ICONS.shieldOff}</div>
          <h2>Bạn không có thẩm quyền truy cập màn hình này</h2>
          <p>
            Báo cáo tỷ lệ giờ tính phí chỉ dành riêng cho vai trò <strong>Ban giám đốc</strong>.
          </p>
          {onBack && (
            <button type="button" className="btn btn-secondary ia-denied-back" onClick={onBack}>
              {ICONS.arrowLeft} Quay lại
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="user-management-page ia-page" data-testid="utilization-report-page">
      <div className="page-header">
        <div className="ia-head">
          {onBack && (
            <button
              type="button"
              className="btn btn-secondary btn-sm btn-back"
              onClick={onBack}
              data-testid="btn-back-utilization-report"
            >
              {ICONS.arrowLeft} Quay lại
            </button>
          )}
          <div>
            <h1 className="page-title">
              Báo cáo tỷ lệ giờ tính phí
            </h1>
            <p className="page-subtitle">
              Giờ tính phí đã duyệt so với giờ làm việc chuẩn của kỳ, theo toàn công ty, từng bộ phận và
              từng người.
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} noValidate className="user-table-card ia-filter-card" aria-busy={loading}>
        <div className="toolbar-filters">
          <div className="filter-group">
            <label className="filter-label" htmlFor="utilization-from">
              Từ ngày <span className="field-required">*</span>
            </label>
            <input
              id="utilization-from"
              type="date"
              className="form-input"
              value={fromInput}
              onChange={(e) => setFromInput(e.target.value)}
              aria-invalid={fieldError ? true : undefined}
              aria-describedby={fieldError ? 'error-utilization-report' : undefined}
              disabled={loading}
              data-testid="utilization-from-input"
            />
          </div>
          <div className="filter-group">
            <label className="filter-label" htmlFor="utilization-to">
              Đến ngày <span className="field-required">*</span>
            </label>
            <input
              id="utilization-to"
              type="date"
              className="form-input"
              value={toInput}
              onChange={(e) => setToInput(e.target.value)}
              aria-invalid={fieldError ? true : undefined}
              aria-describedby={fieldError ? 'error-utilization-report' : undefined}
              disabled={loading}
              data-testid="utilization-to-input"
            />
          </div>
          <button type="submit" className="btn btn-primary btn-sm" disabled={loading} data-testid="btn-view-utilization-report">
            {ICONS.search} {loading ? 'Đang tải...' : 'Xem báo cáo'}
          </button>
        </div>
        {fieldError && (
          <p className="ia-field-error" id="error-utilization-report" role="alert" data-testid="error-utilization-report">
            {fieldError}
          </p>
        )}
      </form>

      {error && (
        <ReportErrorAlert
          testId="utilization-report-error"
          message={error}
          onRetry={() => loadReport(fromInput, toInput)}
          retryDisabled={loading}
        />
      )}

      {loading ? (
        <ReportSkeleton testId="utilization-report-loading" kpis={3} tableColumns={5} tableRows={5} />
      ) : !hasSearched ? (
        !error && (
          <div className="table-empty-state" data-testid="utilization-report-prompt">
            <div className="table-empty-state__icon">{ICONS.users}</div>
            <h3>Chưa chọn kỳ báo cáo</h3>
            <p>Chọn khoảng thời gian rồi bấm "Xem báo cáo" để xem tỷ lệ giờ tính phí.</p>
          </div>
        )
      ) : (
        report && (
          <>
            {report.unlistedBillableHours > 0 && (
              <div className="alert-box alert-box--warning" role="alert" data-testid="utilization-unlisted-alert">
                <strong>Lưu ý:</strong> Có {formatHours(report.unlistedBillableHours)} giờ tính phí đã duyệt
                thuộc các tài khoản chưa có hồ sơ nhân sự hoặc không làm việc ngày nào trong kỳ — không được
                gộp vào các số liệu bên dưới.
              </div>
            )}

            <div className="stats-grid" data-testid="utilization-kpi-grid">
              <div className="stat-card" data-testid="kpi-total-billable-hours">
                <span className="stat-card__label">
                  <span className="stat-card__icon stat-card__icon--green">{ICONS.clock}</span>
                  Tổng giờ tính phí
                </span>
                <strong className="stat-card__value stat-card__value--md">{formatHours(report.totalBillableHours)}</strong>
              </div>
              <div className="stat-card" data-testid="kpi-total-standard-hours">
                <span className="stat-card__label">
                  <span className="stat-card__icon stat-card__icon--blue">{ICONS.calendar}</span>
                  Tổng giờ chuẩn
                </span>
                <strong className="stat-card__value stat-card__value--md">{formatHours(report.totalStandardHours)}</strong>
              </div>
              <div className="stat-card" data-testid="kpi-total-ratio">
                <span className="stat-card__label">
                  <span className="stat-card__icon stat-card__icon--purple">{ICONS.chart}</span>
                  Tỷ lệ toàn công ty
                </span>
                <strong className="stat-card__value">{formatRatio(report.totalRatio)}</strong>
              </div>
            </div>

            <div className="user-table-card ia-card-pad ia-section" data-testid="utilization-department-table">
              <div className="ia-section-head">
                <h3 className="ia-section-title">Theo bộ phận</h3>
              </div>

              {report.departments.length === 0 ? (
                <p className="ia-inline-empty" data-testid="utilization-department-empty">
                  Không có bộ phận nào có giờ công trong kỳ đã chọn.
                </p>
              ) : (
                <div className="table-responsive">
                  <table className="user-data-table">
                    <thead>
                      <tr>
                        <th>Bộ phận</th>
                        <th className="text-right">Số nhân sự</th>
                        <th className="text-right">Giờ tính phí</th>
                        <th className="text-right">Giờ chuẩn</th>
                        <th className="text-right">Tỷ lệ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.departments.map((d) => (
                        <tr key={d.departmentId ?? 'unassigned'} data-testid={`utilization-department-row-${d.departmentId ?? 'unassigned'}`}>
                          <td>{d.departmentName}</td>
                          <td className="ia-num">{d.employeeCount.toLocaleString('vi-VN')}</td>
                          <td className="ia-num">{formatHours(d.billableHours)}</td>
                          <td className="ia-num">{formatHours(d.standardHours)}</td>
                          <td className="ia-num" title={d.ratio === null ? MISSING_STANDARD_HINT : undefined}>
                            <RatioCell ratio={d.ratio} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="user-table-card ia-card-pad" data-testid="utilization-employee-table">
              <div className="ia-section-head">
                <h3 className="ia-section-title">Theo từng người</h3>
                <input
                  type="search"
                  className="form-input ia-search"
                  aria-label="Tìm nhân sự theo tên, vai trò, bộ phận"
                  placeholder="Tìm theo tên, vai trò, bộ phận..."
                  value={employeeSearch}
                  onChange={(e) => setEmployeeSearch(e.target.value)}
                  data-testid="utilization-employee-search"
                />
              </div>

              {report.employees.length === 0 ? (
                <p className="ia-inline-empty" data-testid="utilization-employee-empty">
                  Không có nhân sự nào làm việc trong kỳ đã chọn.
                </p>
              ) : filteredEmployees.length === 0 ? (
                <p className="ia-inline-empty" data-testid="utilization-employee-no-match">
                  Không tìm thấy nhân sự phù hợp với từ khóa "{employeeSearch}".
                </p>
              ) : (
                <div className="table-responsive">
                  <table className="user-data-table">
                    <thead>
                      <tr>
                        <th>Họ tên</th>
                        <th>Vai trò</th>
                        <th>Bộ phận</th>
                        <th className="text-right">Giờ tính phí</th>
                        <th className="text-right">Giờ chuẩn</th>
                        <th className="text-right">Tỷ lệ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredEmployees.map((e) => (
                        <tr key={e.employeeId} data-testid={`utilization-employee-row-${e.employeeId}`}>
                          <td>{e.fullName}</td>
                          <td>{e.professionalRole ?? '—'}</td>
                          <td>{e.departmentName ?? 'Chưa gán bộ phận'}</td>
                          <td className="ia-num">{formatHours(e.billableHours)}</td>
                          <td className="ia-num">{formatHours(e.standardHours)}</td>
                          <td className="ia-num" title={e.ratio === null ? MISSING_STANDARD_HINT : undefined}>
                            <RatioCell ratio={e.ratio} flagOver />
                          </td>
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
