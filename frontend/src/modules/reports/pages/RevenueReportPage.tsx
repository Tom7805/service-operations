import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { getMonthlyRevenue, ReportsApiError } from '../api/reportsApi';
import {
  CONTRACT_TYPE_LABELS,
  CONTRACT_TYPE_ORDER,
  type ContractType,
  type MonthlyRevenueReportRes,
  type MonthlyRevenueRes,
} from '../types/reportTypes';
import { ICONS } from '../../../components/common/icons';
import { getCurrentFiscalPeriod, getFiscalPeriod } from '../../admin/api/companySettingApi';
import type { FiscalPeriodRes } from '../../admin/types/adminTypes';
import PageHeader from '../../../components/common/PageHeader';

interface RevenueReportPageProps {
  currentUserRoles?: string[];
}

/** Bảng màu phân loại tham chiếu (4 ô đầu, thứ tự cố định — đã kiểm cho cột chồng liền kề). Màu theo loại hợp đồng,
 *  không theo thứ hạng, nên lọc kỳ không làm đổi màu của một loại. */
const SERIES_COLOR: Record<ContractType, string> = {
  TIME_AND_MATERIAL: '#2a78d6',
  FIXED_PRICE: '#eb6834',
  MAINTENANCE: '#1baf7a',
  MILESTONE: '#eda100',
};

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

function minMonth(a: string, b: string): string {
  return a < b ? a : b;
}

/** Bảo vệ khi máy chủ trả dữ liệu không đúng dạng kỳ tài chính. */
function isFiscalPeriod(value: unknown): value is FiscalPeriodRes {
  const v = value as FiscalPeriodRes | null;
  return !!v && typeof v.fiscalYear === 'number' && Array.isArray(v.months) && v.months.length === 12 && Array.isArray(v.quarters);
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
  // NCL-15-CN-002 TC-01: báo cáo theo năm chia kỳ theo tháng bắt đầu năm tài chính đã cấu hình.
  const [fiscal, setFiscal] = useState<FiscalPeriodRes | null>(null);
  const [currentFiscalYear, setCurrentFiscalYear] = useState<number | null>(null);
  const [fiscalReady, setFiscalReady] = useState(false);
  const [fiscalLoading, setFiscalLoading] = useState(false);

  useEffect(() => {
    if (!isAllowed) return;
    let cancelled = false;
    void getCurrentFiscalPeriod()
      .then((fy) => {
        if (cancelled || !isFiscalPeriod(fy)) return;
        setFiscal(fy);
        setCurrentFiscalYear(fy.fiscalYear);
        // Mặc định: từ đầu năm tài chính hiện tại tới tháng này.
        const next = { from: fy.months[0].yearMonth, to: minMonth(currentMonth(), fy.months[11].yearMonth) };
        setDraft(next);
        setPeriod(next);
      })
      .catch(() => {
        // Chưa lấy được kỳ tài chính → giữ mặc định theo năm dương lịch, báo cáo vẫn xem được.
      })
      .finally(() => {
        if (!cancelled) setFiscalReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [isAllowed]);

  function applyRange(from: string, to: string) {
    const next = { from, to };
    setPeriodError(null);
    setDraft(next);
    setPeriod(next);
  }

  async function pickFiscalYear(year: number) {
    if (fiscal?.fiscalYear === year) return applyRange(fiscal.months[0].yearMonth, fiscal.months[11].yearMonth);
    setFiscalLoading(true);
    try {
      const fy = await getFiscalPeriod(year);
      if (!isFiscalPeriod(fy)) return;
      setFiscal(fy);
      applyRange(fy.months[0].yearMonth, fy.months[11].yearMonth);
    } catch (err) {
      setPeriodError(err instanceof Error ? err.message : 'Không tải được kỳ tài chính.');
    } finally {
      setFiscalLoading(false);
    }
  }

  const load = useCallback(async () => {
    if (!isAllowed || !fiscalReady) return;
    setLoading(true);
    setError(null);
    try {
      setData(await getMonthlyRevenue(period.from, period.to));
    } catch (err) {
      setData(null);
      setError(
        err instanceof ReportsApiError && err.code === 'FORBIDDEN'
          ? 'Bạn không có quyền xem báo cáo doanh thu.'
          : err instanceof Error
            ? err.message
            : 'Không tải được báo cáo.'
      );
    } finally {
      setLoading(false);
    }
  }, [isAllowed, fiscalReady, period]);

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
      <div className="user-management-page">
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
    <div className="user-management-page">
      <PageHeader title="Doanh thu theo tháng" />

      <form onSubmit={applyPeriod} noValidate
        style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'flex-end', marginBottom: '16px' }}>
        <div>
          <label className="form-label" htmlFor="revenue-from">Từ tháng</label>
          <input id="revenue-from" type="month" className="form-input" value={draft.from}
            onChange={(e) => setDraft((d) => ({ ...d, from: e.target.value }))} />
        </div>
        <div>
          <label className="form-label" htmlFor="revenue-to">Đến tháng</label>
          <input id="revenue-to" type="month" className={`form-input ${periodError ? 'form-input--error' : ''}`}
            value={draft.to} onChange={(e) => setDraft((d) => ({ ...d, to: e.target.value }))} />
        </div>
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? 'Đang tải…' : 'Xem báo cáo'}
        </button>
        {periodError && <small className="field-error" style={{ flexBasis: '100%' }}>{periodError}</small>}
      </form>

      {fiscal && (
        <div className="fiscal-quickpick" role="group" aria-label="Chọn nhanh theo kỳ tài chính" data-testid="revenue-fiscal-quickpick">
          <span className="fiscal-quickpick__label">
            {ICONS.calendar} Năm tài chính {fiscal.fiscalYear} (từ T{fiscal.startMonth}):
          </span>
          {currentFiscalYear === fiscal.fiscalYear && (
            <button
              type="button"
              className={`notif-chip ${period.from === fiscal.months[0].yearMonth && period.to === minMonth(currentMonth(), fiscal.months[11].yearMonth) ? 'notif-chip--active' : ''}`}
              onClick={() => applyRange(fiscal.months[0].yearMonth, minMonth(currentMonth(), fiscal.months[11].yearMonth))}
              disabled={loading}
              data-testid="revenue-fy-ytd"
            >
              Từ đầu năm đến nay
            </button>
          )}
          <button
            type="button"
            className={`notif-chip ${period.from === fiscal.months[0].yearMonth && period.to === fiscal.months[11].yearMonth ? 'notif-chip--active' : ''}`}
            onClick={() => applyRange(fiscal.months[0].yearMonth, fiscal.months[11].yearMonth)}
            disabled={loading}
            data-testid="revenue-fy-full"
          >
            Cả năm
          </button>
          {fiscal.quarters.map((q) => {
            const from = q.startDate.slice(0, 7);
            const to = q.endDate.slice(0, 7);
            return (
              <button
                key={q.quarter}
                type="button"
                className={`notif-chip ${period.from === from && period.to === to ? 'notif-chip--active' : ''}`}
                onClick={() => applyRange(from, to)}
                disabled={loading}
                title={`${from} → ${to}`}
                data-testid={`revenue-fy-q${q.quarter}`}
              >
                Quý {q.quarter}
              </button>
            );
          })}
          <span className="fiscal-quickpick__sep" aria-hidden="true" />
          <button
            type="button"
            className="btn-link"
            onClick={() => void pickFiscalYear(fiscal.fiscalYear - 1)}
            disabled={loading || fiscalLoading}
            data-testid="revenue-fy-prev"
          >
            ← Năm {fiscal.fiscalYear - 1}
          </button>
          {currentFiscalYear != null && fiscal.fiscalYear !== currentFiscalYear && (
            <button
              type="button"
              className="btn-link"
              onClick={() => void pickFiscalYear(currentFiscalYear)}
              disabled={loading || fiscalLoading}
              data-testid="revenue-fy-current"
            >
              Năm nay
            </button>
          )}
        </div>
      )}

      {error && (
        <div className="alert-box alert-box--danger" role="alert">
          <span className="icon-xs">{ICONS.alertTriangle}</span> {error}
        </div>
      )}

      {loading && !data && <p className="field-hint">Đang tải báo cáo…</p>}

      {data && !data.hasData && (
        <div className="alert-box alert-box--info" role="status" data-testid="revenue-empty">
          <span className="icon-xs">{ICONS.info}</span> Không có dữ liệu doanh thu trong kỳ{' '}
          {monthLabel(data.fromMonth)} – {monthLabel(data.toMonth)}.
        </div>
      )}

      {data && data.hasData && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px',
            marginBottom: '16px' }}>
            <div className="user-table-card" style={{ padding: '14px 16px' }}>
              <div className="field-hint">Tổng doanh thu kỳ</div>
              <div style={{ fontSize: '22px', fontWeight: 600 }} data-testid="revenue-total">{vnd.format(data.totalRevenue)}</div>
            </div>
            <div className="user-table-card" style={{ padding: '14px 16px' }}>
              <div className="field-hint">Cùng kỳ năm trước</div>
              <div style={{ fontSize: '22px', fontWeight: 600 }}>{vnd.format(data.previousYearTotalRevenue)}</div>
            </div>
            <div className="user-table-card" style={{ padding: '14px 16px' }}>
              <div className="field-hint">Thay đổi so với năm trước</div>
              <div style={{ fontSize: '22px', fontWeight: 600 }}>{formatChange(data.totalChangePercent)}</div>
            </div>
          </div>

          {data.warnings.map((warning) => (
            <div key={warning} className="alert-box alert-box--warning" role="note" style={{ marginBottom: '8px' }}>
              <span className="icon-xs">{ICONS.alertTriangle}</span> {warning}
            </div>
          ))}

          <div className="user-table-card" style={{ padding: '16px', marginBottom: '16px', position: 'relative' }}>
            <div role="list" aria-label="Chú giải" style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', marginBottom: '10px' }}>
              {CONTRACT_TYPE_ORDER.map((type) => (
                <span key={type} role="listitem" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
                  <span aria-hidden style={{ width: 10, height: 10, borderRadius: 2, background: SERIES_COLOR[type] }} />
                  {CONTRACT_TYPE_LABELS[type]}
                </span>
              ))}
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
                <span aria-hidden style={{ width: 14, height: 2, background: 'var(--ink, #0b0b0b)' }} />
                Cùng tháng năm trước
              </span>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <svg width={chartWidth} height={CHART_HEIGHT + 28} role="img"
                aria-label="Biểu đồ cột chồng doanh thu theo tháng và loại hợp đồng" onMouseLeave={() => setHovered(null)}>
                {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
                  <g key={ratio}>
                    <line x1={AXIS_LEFT} x2={chartWidth} y1={y(yMax * ratio)} y2={y(yMax * ratio)}
                      stroke="var(--line)" strokeWidth={1} />
                    <text x={AXIS_LEFT - 6} y={y(yMax * ratio) + 4} textAnchor="end" fontSize="11" fill="var(--ink-faint)">
                      {compact.format(yMax * ratio)}
                    </text>
                  </g>
                ))}
                {months.map((month, index) => {
                  const x = AXIS_LEFT + index * SLOT_WIDTH + (SLOT_WIDTH - BAR_WIDTH) / 2;
                  let base = 0;
                  return (
                    <g key={month.month} onMouseEnter={() => setHovered(index)} data-testid="revenue-bar">
                      {/* Vùng bắt chuột rộng hơn cột để dễ trỏ. */}
                      <rect x={AXIS_LEFT + index * SLOT_WIDTH} y={0} width={SLOT_WIDTH} height={CHART_HEIGHT}
                        fill={hovered === index ? 'var(--surface-sunken)' : 'transparent'} />
                      {CONTRACT_TYPE_ORDER.map((type) => {
                        const value = Math.max(month.byContractType[type] ?? 0, 0);
                        if (value === 0) return null;
                        const top = y(base + value);
                        const height = y(base) - top;
                        base += value;
                        // Khe 2px màu nền giữa các đoạn chồng.
                        return (
                          <rect key={type} x={x} y={top} width={BAR_WIDTH} height={Math.max(height - 2, 1)}
                            fill={SERIES_COLOR[type]} />
                        );
                      })}
                      {month.previousYearRevenue > 0 && (
                        <line x1={x - 4} x2={x + BAR_WIDTH + 4} y1={y(month.previousYearRevenue)}
                          y2={y(month.previousYearRevenue)} stroke="var(--ink-strong)" strokeWidth={2} />
                      )}
                      <text x={x + BAR_WIDTH / 2} y={CHART_HEIGHT + 18} textAnchor="middle" fontSize="11" fill="var(--ink-muted)">
                        {monthLabel(month.month)}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>

            {hoveredMonth && (
              <div role="tooltip" data-testid="revenue-tooltip" style={{
                position: 'absolute', top: 48, left: Math.min(AXIS_LEFT + (hovered ?? 0) * SLOT_WIDTH + SLOT_WIDTH + 24, chartWidth - 180),
                background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 8, padding: '10px 12px',
                boxShadow: '0 4px 16px rgba(0,0,0,0.08)', fontSize: 13, minWidth: 200, pointerEvents: 'none' }}>
                <strong>{monthLabel(hoveredMonth.month)}</strong>
                {CONTRACT_TYPE_ORDER.map((type) => (
                  <div key={type} style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                    <span><span aria-hidden style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2,
                      background: SERIES_COLOR[type], marginRight: 6 }} />{CONTRACT_TYPE_LABELS[type]}</span>
                    <span>{vnd.format(hoveredMonth.byContractType[type] ?? 0)}</span>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, borderTop: '1px solid var(--line)',
                  marginTop: 6, paddingTop: 6 }}>
                  <span>Tổng</span><strong>{vnd.format(hoveredMonth.revenue)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                  <span>Năm trước</span><span>{vnd.format(hoveredMonth.previousYearRevenue)} ({formatChange(hoveredMonth.changePercent)})</span>
                </div>
              </div>
            )}
          </div>

          <div className="user-table-card" style={{ overflowX: 'auto' }}>
            <table className="user-data-table" data-testid="revenue-table">
              <thead>
                <tr>
                  <th>Tháng</th>
                  {CONTRACT_TYPE_ORDER.map((type) => <th key={type} style={{ textAlign: 'right' }}>{CONTRACT_TYPE_LABELS[type]}</th>)}
                  <th style={{ textAlign: 'right' }}>Tổng</th>
                  <th style={{ textAlign: 'right' }}>Cùng tháng năm trước</th>
                  <th style={{ textAlign: 'right' }}>Thay đổi</th>
                </tr>
              </thead>
              <tbody>
                {months.map((month) => (
                  <tr key={month.month}>
                    <td>{monthLabel(month.month)}</td>
                    {CONTRACT_TYPE_ORDER.map((type) => (
                      <td key={type} style={{ textAlign: 'right' }}>{vnd.format(month.byContractType[type] ?? 0)}</td>
                    ))}
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>{vnd.format(month.revenue)}</td>
                    <td style={{ textAlign: 'right' }}>{vnd.format(month.previousYearRevenue)}</td>
                    <td style={{ textAlign: 'right' }}>{formatChange(month.changePercent)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
