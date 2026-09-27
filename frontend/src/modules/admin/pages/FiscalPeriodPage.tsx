import { useCallback, useEffect, useState } from 'react';
import { ICONS } from '../../../components/common/icons';
import { roleLabels } from '../../../utils/roleLabel';
import { AdminApiError, getCurrentFiscalPeriod, getFiscalPeriod } from '../api/companySettingApi';
import FiscalYearOverview from '../components/FiscalYearOverview';
import type { FiscalPeriodRes } from '../types/adminTypes';
import { todayIso } from '../utils/serviceCatalogUtils';
import PageHeader from '../../../components/common/PageHeader';

export const MIN_FISCAL_YEAR = 2000;
export const MAX_FISCAL_YEAR = 2100;

export interface FiscalPeriodPageProps {
  currentUserRoles?: string[];
  /** Chỉ truyền cho Quản trị viên — mở màn cấu hình để đổi tháng bắt đầu năm tài chính. */
  onOpenCompanySettings?: () => void;
}

/**
 * Kỳ tài chính (NCL-15-CN-002 TC-01) — xem năm tài chính được chia thành quý và tháng theo tháng bắt
 * đầu đã cấu hình. Chỉ đọc; mở cho Quản trị viên, Ban giám đốc, Quản lý dự án và Kế toán (người xem báo cáo).
 */
export default function FiscalPeriodPage({ currentUserRoles = [], onOpenCompanySettings }: FiscalPeriodPageProps) {
  const [period, setPeriod] = useState<FiscalPeriodRes | null>(null);
  const [currentYear, setCurrentYear] = useState<number | null>(null);
  const [yearInput, setYearInput] = useState('');
  const [yearError, setYearError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);

  const run = useCallback(async (loader: () => Promise<FiscalPeriodRes>) => {
    setLoading(true);
    setError(null);
    try {
      const data = await loader();
      setPeriod(data);
      setYearInput(String(data.fiscalYear));
      return data;
    } catch (err) {
      if (err instanceof AdminApiError && err.statusCode === 403) setForbidden(true);
      else setError(err instanceof Error ? err.message : 'Không thể tải kỳ tài chính.');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void run(() => getCurrentFiscalPeriod()).then((d) => d && setCurrentYear(d.fiscalYear));
  }, [run]);

  const goTo = (year: number) => {
    if (!Number.isInteger(year) || year < MIN_FISCAL_YEAR || year > MAX_FISCAL_YEAR) {
      setYearError(`Năm tài chính phải trong khoảng ${MIN_FISCAL_YEAR}–${MAX_FISCAL_YEAR}.`);
      return;
    }
    setYearError(null);
    void run(() => getFiscalPeriod(year));
  };

  if (forbidden) {
    return (
      <div className="access-denied-container" data-testid="fiscal-access-denied">
        <div className="access-denied-card">
          <div className="access-denied-icon">{ICONS.shieldOff}</div>
          <h2>Bạn không có thẩm quyền truy cập màn hình này</h2>
          <p>
            Trang này dành cho <strong>Quản trị viên</strong>, <strong>Ban giám đốc</strong>, <strong>Quản lý dự án</strong> và
            <strong>Kế toán</strong>. Lần truy cập đã được ghi vào nhật ký.
          </p>
          <div className="security-log-badge">
            <span className="security-log-badge__item">Vai trò hiện tại: {roleLabels(currentUserRoles) || '—'}</span>
          </div>
        </div>
      </div>
    );
  }

  const year = period?.fiscalYear;

  return (
    <div className="user-management-page fiscal-page" data-testid="fiscal-period-page">
      <PageHeader
        title="Kỳ tài chính"
        meta={
          <span data-testid="fiscal-start-month">
            {period ? `Năm tài chính bắt đầu từ tháng ${period.startMonth}` : '—'}
          </span>
        }
        actions={
          onOpenCompanySettings && (
            <button type="button" className="btn-secondary" onClick={onOpenCompanySettings} data-testid="fiscal-btn-settings">
              {ICONS.settings} Đổi tháng bắt đầu
            </button>
          )
        }
      />

      <form
        className="fiscal-nav"
        onSubmit={(e) => {
          e.preventDefault();
          goTo(Number(yearInput));
        }}
        noValidate
      >
        <button
          type="button"
          className="btn-secondary"
          onClick={() => year && goTo(year - 1)}
          disabled={loading || !year || year <= MIN_FISCAL_YEAR}
          aria-label="Năm tài chính trước"
          data-testid="fiscal-prev"
        >
          {ICONS.arrowLeft}
        </button>
        <label className="fiscal-nav__label" htmlFor="fiscal-year-input">
          Năm tài chính
        </label>
        <input
          id="fiscal-year-input"
          inputMode="numeric"
          className={`form-input fiscal-nav__input ${yearError ? 'form-input--error' : ''}`}
          value={yearInput}
          onChange={(e) => {
            setYearInput(e.target.value);
            setYearError(null);
          }}
          aria-invalid={!!yearError}
          data-testid="fiscal-year-input"
        />
        <button type="submit" className="btn-secondary" disabled={loading} data-testid="fiscal-go">
          Xem
        </button>
        <button
          type="button"
          className="btn-secondary"
          onClick={() => year && goTo(year + 1)}
          disabled={loading || !year || year >= MAX_FISCAL_YEAR}
          aria-label="Năm tài chính sau"
          data-testid="fiscal-next"
        >
          {ICONS.arrowRight}
        </button>
        {currentYear != null && year !== currentYear && (
          <button type="button" className="btn-link" onClick={() => goTo(currentYear)} data-testid="fiscal-current">
            Về năm hiện tại
          </button>
        )}
        {yearError && (
          <p className="field-error fiscal-nav__error" role="alert" data-testid="fiscal-year-error">
            {yearError}
          </p>
        )}
      </form>

      {error && (
        <div className="alert alert--error" role="alert">
          <span className="alert__icon">{ICONS.alertTriangle}</span>
          <span>{error}</span>
        </div>
      )}

      <div className="company-card">
        {loading && !period ? (
          <p className="svc-detail__loading">Đang tải kỳ tài chính…</p>
        ) : period ? (
          <FiscalYearOverview period={period} highlightDate={todayIso()} testIdPrefix="fiscal" />
        ) : null}
      </div>
    </div>
  );
}
