import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { getMonthlyRevenue, ReportsApiError } from '../api/reportsApi';
import {
  CONTRACT_TYPE_LABELS,
  CONTRACT_TYPE_ORDER,
  type MonthlyRevenueReportRes,
  type MonthlyRevenueRes,
} from '../types/reportTypes';
import { ICONS } from '../../../components/common/icons';
import { ReportErrorAlert, ReportSkeleton } from '../components/ReportStates';

interface RevenueReportPageProps {
  currentUserRoles?: string[];
}

/* Màu loại hợp đồng nằm ở insight-admin.css (`.ia-series--<LOẠI>` trong `.ia-revenue`). Màu theo loại
 * hợp đồng, không theo thứ hạng, nên lọc kỳ không làm đổi màu của một loại. */

const MAX_MONTHS = 36;
const CHART_HEIGHT = 240;
const BAR_WIDTH = 22;
const SLOT_WIDTH = 44;
const AXIS_LEFT = 56;

const vnd = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 });
const compact = new Intl.NumberFormat('vi-VN', { notation: 'compact', maximumFractionDigits: 1 });

function monthLabel(month: string): string {
  const [year, m] = month.split('-');
  return `T${Number(m)}/${year}`;
}

function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function monthsBetween(from: string, to: string): number {
  const [fy, fm] = from.split('-').map(Number);
  const [ty, tm] = to.split('-').map(Number);
  return (ty - fy) * 12 + (tm - fm) + 1;
}

function formatChange(value: number | null): string {
  if (value == null) return '—';
  return `${value > 0 ? '+' : ''}${value.toLocaleString('vi-VN', { maximumFractionDigits: 2 })}%`;
}

/** Trục y: làm tròn lên mốc đẹp (1, 2, 5 × 10^n) để vạch lưới đọc được. */
function niceMax(value: number): number {
  if (value <= 0) return 1;
  const pow = 10 ** Math.floor(Math.log10(value));
  const step = [1, 2, 5, 10].find((s) => s * pow >= value) ?? 10;
  return step * pow;
}

/** NCL-11-CN-005 — Báo cáo doanh thu theo tháng. Ban giám đốc (VT-01) và Kế toán (VT-05) được xem (TC-03). */
export default function RevenueReportPage({ currentUserRoles = [] }: RevenueReportPageProps) {
  const isAllowed = currentUserRoles.includes('VT-01') || currentUserRoles.includes('VT-05');

  const [draft, setDraft] = useState(() => ({ from: `${new Date().getFullYear()}-01`, to: currentMonth() }));
  const [period, setPeriod] = useState(draft);
  const [periodError, setPeriodError] = useState<string | null>(null);
  const [data, setData] = useState<MonthlyRevenueReportRes | null>(null);
  const [loading, setLoading] = useState(isAllowed);
  const [error, setError] = useState<string | null>(null);
  const [hovered, setHovered] = useState<number | null>(null);

  /** Chỉ phản hồi của lần gọi mới nhất được ghi vào trang — đổi kỳ liên tiếp thì phản hồi cũ bị bỏ. */
  const requestIdRef = useRef(0);

  const load = useCallback(async () => {
    if (!isAllowed) return;
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError(null);
    try {
      const res = await getMonthlyRevenue(period.from, period.to);
      if (requestId !== requestIdRef.current) return;
      setData(res);
    } catch (err) {
      if (requestId !== requestIdRef.current) return;
      setData(null);
      setError(
        err instanceof ReportsApiError && err.code === 'FORBIDDEN'
          ? 'Bạn không có quyền xem báo cáo doanh thu.'
          : err instanceof Error
            ? err.message
            : 'Không tải được báo cáo.'
      );
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, [isAllowed, period]);

  useEffect(() => {
    void load();
  }, [load]);

  function applyPeriod(event: FormEvent) {
    event.preventDefault();
    if (!draft.from || !draft.to) return setPeriodError('Chọn đủ tháng bắt đầu và tháng kết thúc.');
    if (draft.from > draft.to) return setPeriodError('Tháng kết thúc không được trước tháng bắt đầu.');
    if (monthsBetween(draft.from, draft.to) > MAX_MONTHS) {
      return setPeriodError(`Mỗi lần xem tối đa ${MAX_MONTHS} tháng.`);
    }
    setPeriodError(null);
    setPeriod({ ...draft });
  }

  const yMax = useMemo(
    () => niceMax(Math.max(0, ...(data?.months ?? []).flatMap((m) => [m.revenue, m.previousYearRevenue]))),
    [data]
  );

  if (!isAllowed) {
    return (
      <div className="user-management-page ia-page">
        <div className="alert-box alert-box--danger" role="alert">
          <span className="icon-xs">{ICONS.lock}</span> Chỉ Ban giám đốc hoặc Kế toán được xem báo cáo doanh thu.
        </div>
      </div>
    );
  }

  const months = data?.months ?? [];
  const chartWidth = AXIS_LEFT + Math.max(months.length, 1) * SLOT_WIDTH + 8;
  const y = (value: number) => CHART_HEIGHT - (Math.max(value, 0) / yMax) * CHART_HEIGHT;
  const hoveredMonth: MonthlyRevenueRes | null = hovered == null ? null : months[hovered] ?? null;

  return (
    <div className="user-management-page ia-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Doanh thu theo tháng</h1>
          <p className="page-subtitle">
            Doanh thu ghi nhận từ giờ công tính phí đã duyệt, tách theo loại hợp đồng và so với cùng kỳ năm trước.
          </p>
        </div>
      </div>

      <form onSubmit={applyPeriod} noValidate className="ia-filter-form" aria-busy={loading}>
        <div>
          <label className="form-label" htmlFor="revenue-from">Từ tháng</label>
          <input id="revenue-from" type="month" className="form-input" value={draft.from}
            onChange={(e) => setDraft((d) => ({ ...d, from: e.target.value }))} />
        </div>
        <div>
          <label className="form-label" htmlFor="revenue-to">Đến tháng</label>
          <input id="revenue-to" type="month" className={`form-input ${periodError ? 'form-input--error' : ''}`}
            aria-invalid={periodError ? true : undefined}
            aria-describedby={periodError ? 'revenue-period-error' : undefined}
            value={draft.to} onChange={(e) => setDraft((d) => ({ ...d, to: e.target.value }))} />
        </div>
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? 'Đang tải…' : 'Xem báo cáo'}
        </button>
        {periodError && <small className="field-error" id="revenue-period-error">{periodError}</small>}
      </form>

      {error && <ReportErrorAlert message={error} onRetry={() => void load()} retryDisabled={loading} />}

      {loading && !data && (
        <ReportSkeleton label="Đang tải báo cáo…" kpis={3} chart tableColumns={8} tableRows={4} />
      )}

      {data && !data.hasData && (
        <div className="alert-box alert-box--info" role="status" data-testid="revenue-empty">
          <span className="icon-xs">{ICONS.info}</span> Không có dữ liệu doanh thu trong kỳ{' '}
          {monthLabel(data.fromMonth)} – {monthLabel(data.toMonth)}.
        </div>
      )}

      {data && data.hasData && (
        <>
          <div className="stats-grid">
            <div className="stat-card">
              <span className="stat-card__label">Tổng doanh thu kỳ</span>
              <span className="stat-card__value stat-card__value--md" data-testid="revenue-total">{vnd.format(data.totalRevenue)}</span>
            </div>
            <div className="stat-card">
              <span className="stat-card__label">Cùng kỳ năm trước</span>
              <span className="stat-card__value stat-card__value--md">{vnd.format(data.previousYearTotalRevenue)}</span>
            </div>
            <div className="stat-card">
              <span className="stat-card__label">Thay đổi so với năm trước</span>
              <span
                className={`stat-card__value stat-card__value--md${
                  data.totalChangePercent != null && data.totalChangePercent < 0 ? ' text-danger' : ''
                }`}
              >
                {formatChange(data.totalChangePercent)}
              </span>
            </div>
          </div>

          {data.warnings.map((warning) => (
            <div key={warning} className="alert-box alert-box--warning" role="note">
              <span className="icon-xs">{ICONS.alertTriangle}</span> {warning}
            </div>
          ))}

          <div className="user-table-card ia-chart-card ia-revenue">
            <ul aria-label="Chú giải" className="ia-legend">
              {CONTRACT_TYPE_ORDER.map((type) => (
                <li key={type} className="ia-legend__item">
                  <span aria-hidden className={`ia-legend__swatch ia-series--${type}`} />
                  {CONTRACT_TYPE_LABELS[type]}
                </li>
              ))}
              <li className="ia-legend__item">
                <span aria-hidden className="ia-legend__line" />
                Cùng tháng năm trước
              </li>
            </ul>

            <div className="ia-chart-scroll">
              <svg width={chartWidth} height={CHART_HEIGHT + 28} role="group"
                aria-label="Biểu đồ cột chồng doanh thu theo tháng và loại hợp đồng" onMouseLeave={() => setHovered(null)}>
                {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
                  <g key={ratio} aria-hidden="true">
                    <line x1={AXIS_LEFT} x2={chartWidth} y1={y(yMax * ratio)} y2={y(yMax * ratio)} className="ia-chart-grid" />
                    <text x={AXIS_LEFT - 6} y={y(yMax * ratio) + 4} textAnchor="end" className="ia-chart-axis">
                      {compact.format(yMax * ratio)}
                    </text>
                  </g>
                ))}
                {months.map((month, index) => {
                  const x = AXIS_LEFT + index * SLOT_WIDTH + (SLOT_WIDTH - BAR_WIDTH) / 2;
                  let base = 0;
                  return (
                    // Mỗi cột nhận focus bằng bàn phím và chạm được trên điện thoại — tooltip không
                    // chỉ dành cho người dùng chuột.
                    <g key={month.month} onMouseEnter={() => setHovered(index)} data-testid="revenue-bar"
                      className="ia-chart-slot" tabIndex={0} role="img"
                      aria-label={`${monthLabel(month.month)}: ${vnd.format(month.revenue)}`}
                      onFocus={() => setHovered(index)} onBlur={() => setHovered(null)}
                      onClick={() => setHovered((h) => (h === index ? null : index))}>
                      {/* Vùng bắt chuột rộng hơn cột để dễ trỏ. */}
                      <rect x={AXIS_LEFT + index * SLOT_WIDTH} y={0} width={SLOT_WIDTH} height={CHART_HEIGHT}
                        className={`ia-chart-hit${hovered === index ? ' ia-chart-hit--active' : ''}`} />
                      {CONTRACT_TYPE_ORDER.map((type) => {
                        const value = Math.max(month.byContractType[type] ?? 0, 0);
                        if (value === 0) return null;
                        const top = y(base + value);
                        const height = y(base) - top;
                        base += value;
                        // Khe 2px màu nền giữa các đoạn chồng.
                        return (
                          <rect key={type} x={x} y={top} width={BAR_WIDTH} height={Math.max(height - 2, 1)}
                            className={`ia-series--${type}`} />
                        );
                      })}
                      {month.previousYearRevenue > 0 && (
                        <line x1={x - 4} x2={x + BAR_WIDTH + 4} y1={y(month.previousYearRevenue)}
                          y2={y(month.previousYearRevenue)} className="ia-chart-prev" />
                      )}
                      <text x={x + BAR_WIDTH / 2} y={CHART_HEIGHT + 18} textAnchor="middle" className="ia-chart-axis">
                        {monthLabel(month.month)}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>

            {hoveredMonth && (
              <div role="tooltip" data-testid="revenue-tooltip" className="ia-tooltip" style={{
                left: Math.max(16, Math.min(AXIS_LEFT + (hovered ?? 0) * SLOT_WIDTH + SLOT_WIDTH + 24, chartWidth - 180)) }}>
                <strong>{monthLabel(hoveredMonth.month)}</strong>
                {CONTRACT_TYPE_ORDER.map((type) => (
                  <div key={type} className="ia-tooltip__row">
                    <span><span aria-hidden className={`ia-legend__swatch ia-series--${type}`} />{CONTRACT_TYPE_LABELS[type]}</span>
                    <span>{vnd.format(hoveredMonth.byContractType[type] ?? 0)}</span>
                  </div>
                ))}
                <div className="ia-tooltip__row ia-tooltip__row--total">
                  <span>Tổng</span><strong>{vnd.format(hoveredMonth.revenue)}</strong>
                </div>
                <div className="ia-tooltip__row">
                  <span>Năm trước</span><span>{vnd.format(hoveredMonth.previousYearRevenue)} ({formatChange(hoveredMonth.changePercent)})</span>
                </div>
              </div>
            )}
          </div>

          <div className="user-table-card ia-table-card">
            <div className="table-responsive">
              <table className="user-data-table" data-testid="revenue-table">
                <thead>
                  <tr>
                    <th>Tháng</th>
                    {CONTRACT_TYPE_ORDER.map((type) => <th key={type} className="text-right">{CONTRACT_TYPE_LABELS[type]}</th>)}
                    <th className="text-right">Tổng</th>
                    <th className="text-right">Cùng tháng năm trước</th>
                    <th className="text-right">Thay đổi</th>
                  </tr>
                </thead>
                <tbody>
                  {months.map((month) => (
                    <tr key={month.month}>
                      <td>{monthLabel(month.month)}</td>
                      {CONTRACT_TYPE_ORDER.map((type) => (
                        <td key={type} className="ia-num">{vnd.format(month.byContractType[type] ?? 0)}</td>
                      ))}
                      <td className="ia-num ia-strong">{vnd.format(month.revenue)}</td>
                      <td className="ia-num">{vnd.format(month.previousYearRevenue)}</td>
                      <td className={`ia-num${month.changePercent != null && month.changePercent < 0 ? ' text-danger' : ''}`}>
                        {formatChange(month.changePercent)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
