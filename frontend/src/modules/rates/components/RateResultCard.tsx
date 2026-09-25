import type { ReactNode } from 'react';

export const STANDARD_HOURS_PER_DAY = 8;

export function formatVnd(value: number): string {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 2 }).format(value);
}

export function formatRateDate(value: string): string {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString('vi-VN');
}

export interface RateFact {
  label: string;
  value: ReactNode;
}

export interface RateLedgerRow {
  label: string;
  value: string;
  total?: boolean;
}

interface Props {
  testId: string;
  eyebrow?: string;
  title: string;
  level?: string;
  badges?: Array<{ label: string; tone: 'blue' | 'gray' | 'gold' }>;
  dailyRate: number;
  facts: RateFact[];
  ledger?: RateLedgerRow[];
  footnote?: string;
}

/** Bản ghi kết quả tra đơn giá: số tiền nổi bật, các thông tin đi kèm và (tuỳ chọn) cách tính từng bước. */
export default function RateResultCard({
  testId,
  eyebrow = 'Đơn giá áp dụng',
  title,
  level,
  badges = [],
  dailyRate,
  facts,
  ledger,
  footnote,
}: Props) {
  return (
    <section className="rate-card" role="status" data-testid={testId}>
      <header className="rate-card__head">
        <div>
          <div className="rate-card__eyebrow">{eyebrow}</div>
          <h3 className="rate-card__title">
            {title}
            {level && <span className="rate-card__level">{level}</span>}
          </h3>
          {badges.length > 0 && (
            <div className="rate-card__badges">
              {badges.map((b) => (
                <span key={b.label} className={`badge badge--${b.tone}`}>
                  {b.label}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="rate-card__amount">
          <div>
            <span className="rate-card__figure">{formatVnd(dailyRate)}</span>
            <span className="rate-card__unit">/ ngày công</span>
          </div>
          <div className="rate-card__sub">
            ≈ {formatVnd(dailyRate / STANDARD_HOURS_PER_DAY)} / giờ (chia {STANDARD_HOURS_PER_DAY} giờ)
          </div>
        </div>
      </header>

      <dl className="rate-card__facts">
        {facts.map((f) => (
          <div key={f.label} className="rate-card__fact">
            <dt>{f.label}</dt>
            <dd>{f.value}</dd>
          </div>
        ))}
      </dl>

      {ledger && ledger.length > 0 && (
        <div className="rate-card__ledger" aria-label="Cách tính">
          {ledger.map((row) => (
            <div key={row.label} className={`rate-card__ledger-row ${row.total ? 'rate-card__ledger-row--total' : ''}`}>
              <span>{row.label}</span>
              <span className="rate-card__num">{row.value}</span>
            </div>
          ))}
        </div>
      )}

      {footnote && <footer className="rate-card__foot">{footnote}</footer>}
    </section>
  );
}
