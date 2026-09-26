import type { FiscalPeriodRes } from '../types/adminTypes';
import { monthLabel } from '../utils/companySettingUtils';
import { formatDate } from '../utils/serviceCatalogUtils';

export interface FiscalYearOverviewProps {
  period: FiscalPeriodRes;
  /** yyyy-MM-dd — tô sáng quý/tháng chứa ngày này (thường là hôm nay). */
  highlightDate?: string;
  /** Ẩn lưới 12 tháng (dùng cho phần xem trước gọn trên form). */
  compact?: boolean;
  testIdPrefix?: string;
}

const within = (d: string | undefined, start: string, end: string) => !!d && d >= start && d <= end;

/** Cách chia một năm tài chính thành 4 quý và 12 kỳ tháng (NCL-15-CN-002 TC-01). */
export default function FiscalYearOverview({ period, highlightDate, compact = false, testIdPrefix = 'fy' }: FiscalYearOverviewProps) {
  return (
    <div className="fy-overview" data-testid={`${testIdPrefix}-overview`}>
      <div className="fy-overview__range" data-testid={`${testIdPrefix}-range`}>
        Năm tài chính <strong>{period.fiscalYear}</strong>: {formatDate(period.startDate)} → {formatDate(period.endDate)}
      </div>
      <ol className="fy-quarters" aria-label={`Các quý của năm tài chính ${period.fiscalYear}`}>
        {period.quarters.map((q) => {
          const current = within(highlightDate, q.startDate, q.endDate);
          return (
            <li
              key={q.quarter}
              className={`fy-quarter ${current ? 'fy-quarter--current' : ''}`}
              aria-current={current ? 'true' : undefined}
              data-testid={`${testIdPrefix}-q${q.quarter}`}
            >
              <span className="fy-quarter__name">
                Quý {q.quarter}
                {current && <span className="fy-quarter__now">Hiện tại</span>}
              </span>
              <span className="fy-quarter__range">
                {monthLabel(q.startDate.slice(0, 7))} – {monthLabel(q.endDate.slice(0, 7))}
              </span>
              <span className="fy-quarter__dates">
                {formatDate(q.startDate)} → {formatDate(q.endDate)}
              </span>
            </li>
          );
        })}
      </ol>
      {!compact && (
        <ol className="fy-months" aria-label="Các kỳ tháng">
          {period.months.map((m) => {
            const current = within(highlightDate, m.startDate, m.endDate);
            return (
              <li key={m.period} className={`fy-month ${current ? 'fy-month--current' : ''}`} data-testid={`${testIdPrefix}-m${m.period}`}>
                <span className="fy-month__period">Kỳ {m.period}</span>
                <span className="fy-month__label">{monthLabel(m.yearMonth)}</span>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
