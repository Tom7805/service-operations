import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ICONS } from '../../../components/common/icons';
import { roleLabels } from '../../../utils/roleLabel';
import { AdminApiError, getCompanySettings, updateCompanySettings } from '../api/companySettingApi';
import FiscalYearOverview from '../components/FiscalYearOverview';
import type { CompanySettingRes } from '../types/adminTypes';
import {
  computeFiscalYear,
  CURRENCY_OPTIONS,
  fiscalYearOf,
  formFromSetting,
  MAX_ADDRESS,
  MAX_COMPANY_NAME,
  MONTH_LABELS,
  sameForm,
  toRequest,
  validateCompanyForm,
  type CompanyForm,
} from '../utils/companySettingUtils';
import { formatDateTime, mapFieldErrors, todayIso, type FieldErrors } from '../utils/serviceCatalogUtils';

export interface CompanySettingPageProps {
  currentUserRoles?: string[];
  /** Mở Nhật ký hệ thống để tra lịch sử thay đổi cấu hình (TC-04). */
  onViewAuditLog?: () => void;
  /** Mở màn Kỳ tài chính để xem chi tiết các năm. */
  onViewFiscalPeriods?: () => void;
}

/**
 * Cấu hình thông tin công ty và kỳ tài chính (NCL-15-CN-002) — một bộ cấu hình duy nhất cho toàn
 * hệ thống. Chỉ Quản trị viên (VT-07); luôn gọi API thật để vai trò khác nhận 403 và backend ghi nhật
 * ký lần từ chối (TC-03). Backend ghi các trường đã đổi vào Nhật ký hệ thống sau mỗi lần lưu (TC-04).
 */
export default function CompanySettingPage({ currentUserRoles = [], onViewAuditLog, onViewFiscalPeriods }: CompanySettingPageProps) {
  const [saved, setSaved] = useState<CompanySettingRes | null>(null);
  const [form, setForm] = useState<CompanyForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ message, type });
    toastTimer.current = setTimeout(() => setToast(null), 5000);
  };
  useEffect(
    () => () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    },
    []
  );

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await getCompanySettings();
      setSaved(data);
      setForm(formFromSetting(data));
      setErrors({});
      setForbidden(false);
    } catch (err) {
      if (err instanceof AdminApiError && err.statusCode === 403) setForbidden(true);
      else setLoadError(err instanceof Error ? err.message : 'Không thể tải cấu hình công ty.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const savedForm = saved ? formFromSetting(saved) : null;
  const dirty = !!form && !!savedForm && (!saved?.configured || !sameForm(form, savedForm));

  useEffect(() => {
    if (!dirty || !saved?.configured) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty, saved?.configured]);

  if (forbidden) {
    return (
      <div className="access-denied-container" data-testid="company-access-denied">
        <div className="access-denied-card">
          <div className="access-denied-icon">{ICONS.shieldOff}</div>
          <h2>Bạn không có thẩm quyền truy cập màn hình này</h2>
          <p>
            Cấu hình thông tin công ty và kỳ tài chính chỉ dành cho <strong>Quản trị viên</strong>. Lần truy cập này đã được
            ghi vào nhật ký hệ thống.
          </p>
          <div className="security-log-badge">
            <span className="security-log-badge__item">Vai trò hiện tại: {roleLabels(currentUserRoles) || '—'}</span>
          </div>
        </div>
      </div>
    );
  }

  const set = <K extends keyof CompanyForm>(key: K, value: CompanyForm[K]) => {
    setForm((f) => (f ? { ...f, [key]: value } : f));
    setErrors((e) => ({ ...e, [key]: '' }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form || saving) return;
    const v = validateCompanyForm(form);
    if (Object.keys(v).length > 0) {
      setErrors(v);
      // TC-02: đưa con trỏ về ô tên công ty để bổ sung ngay.
      if (v.companyName) nameRef.current?.focus();
      return;
    }
    setSaving(true);
    try {
      const prevStart = saved?.fiscalYearStartMonth;
      const res = await updateCompanySettings(toRequest(form));
      setSaved(res);
      setForm(formFromSetting(res));
      setErrors({});
      const startChanged = prevStart !== undefined && prevStart !== res.fiscalYearStartMonth;
      showToast(
        startChanged
          ? `Đã lưu cấu hình công ty. Báo cáo theo năm/quý từ nay chia kỳ bắt đầu từ tháng ${res.fiscalYearStartMonth}.`
          : 'Đã lưu cấu hình công ty.'
      );
    } catch (err) {
      if (err instanceof AdminApiError && err.statusCode === 403) {
        setForbidden(true);
      } else if (err instanceof AdminApiError && err.fieldErrors.length > 0) {
        const mapped = mapFieldErrors(err.fieldErrors);
        if (mapped.companyName) {
          mapped.companyName = 'Nhập tên công ty — tên được in trên báo giá, hóa đơn và báo cáo.';
          nameRef.current?.focus();
        }
        setErrors(mapped);
      } else {
        showToast(err instanceof Error ? err.message : 'Không thể lưu cấu hình công ty.', 'error');
      }
    } finally {
      setSaving(false);
    }
  };

  const today = todayIso();
  const previewYear = form ? fiscalYearOf(today, form.fiscalYearStartMonth) : 0;
  const preview = form ? computeFiscalYear(previewYear, form.fiscalYearStartMonth) : null;
  const startChanged = !!saved?.configured && !!form && form.fiscalYearStartMonth !== saved.fiscalYearStartMonth;

  const err = (field: string) =>
    errors[field] ? (
      <p className="field-error" id={`company-${field}-error`} role="alert" data-testid={`company-error-${field}`}>
        {errors[field]}
      </p>
    ) : null;

  return (
    <div className="user-management-page company-page" data-testid="company-setting-page">
      <div className="page-header">
        <div>
          <div className="page-header__kicker">
            <span className="page-header__tag">{ICONS.building} CẤU HÌNH</span>
            <span className="page-header__dot" />
            <span className="page-header__meta">DÙNG CHUNG TOÀN HỆ THỐNG</span>
          </div>
          <h1 className="page-title">Thông tin công ty và kỳ tài chính</h1>
          <p className="page-subtitle">
            Tên công ty, mã số thuế và tiền tệ in trên báo giá, hóa đơn; tháng bắt đầu năm tài chính quyết định cách các báo
            cáo theo năm và theo quý chia kỳ.
          </p>
        </div>
        <div className="page-header__actions">
          {onViewFiscalPeriods && (
            <button type="button" className="btn-secondary" onClick={onViewFiscalPeriods} data-testid="company-btn-fiscal">
              {ICONS.calendar} Xem kỳ tài chính
            </button>
          )}
          {onViewAuditLog && (
            <button type="button" className="btn-secondary" onClick={onViewAuditLog} data-testid="company-btn-audit">
              {ICONS.clipboardList} Nhật ký hệ thống
            </button>
          )}
        </div>
      </div>

      {loadError ? (
        <div className="alert alert--error" role="alert">
          <span className="alert__icon">{ICONS.alertTriangle}</span>
          <span>{loadError}</span>
          <button type="button" className="btn-link ml-auto" onClick={() => void load()} data-testid="company-retry">
            Thử lại
          </button>
        </div>
      ) : loading || !form || !saved ? (
        <div className="user-table-card">
          <div className="notif-panel__empty" aria-live="polite">
            <p>Đang tải cấu hình…</p>
          </div>
        </div>
      ) : (
        <form className="company-layout" onSubmit={handleSubmit} noValidate data-testid="company-form">
          <div className="company-main">
            {!saved.configured && (
              <div className="company-banner" role="status" data-testid="company-not-configured">
                {ICONS.info}
                <span>
                  <strong>Chưa khai báo thông tin công ty.</strong> Hệ thống đang dùng giá trị mặc định (VND, năm tài chính
                  bắt đầu tháng 1, 22 ngày công/tháng). Hãy nhập tên công ty rồi bấm “Lưu cấu hình”.
                </span>
              </div>
            )}

            <section className="company-card" aria-labelledby="company-sec-info">
              <h2 className="company-card__title" id="company-sec-info">
                Thông tin công ty
              </h2>
              <div className="form-group">
                <label className="form-label" htmlFor="company-name">
                  Tên công ty <span className="field-required">*</span>
                </label>
                <input
                  id="company-name"
                  ref={nameRef}
                  className={`form-input ${errors.companyName ? 'form-input--error' : ''}`}
                  value={form.companyName}
                  maxLength={MAX_COMPANY_NAME}
                  onChange={(e) => set('companyName', e.target.value)}
                  placeholder="Công ty TNHH …"
                  aria-invalid={!!errors.companyName}
                  aria-describedby={errors.companyName ? 'company-companyName-error' : undefined}
                  disabled={saving}
                  data-testid="company-input-name"
                />
                {err('companyName')}
              </div>
              <div className="company-grid">
                <div className="form-group">
                  <label className="form-label" htmlFor="company-tax">
                    Mã số thuế
                  </label>
                  <input
                    id="company-tax"
                    inputMode="numeric"
                    className={`form-input ${errors.taxCode ? 'form-input--error' : ''}`}
                    value={form.taxCode}
                    onChange={(e) => set('taxCode', e.target.value)}
                    placeholder="0101234567 hoặc 0101234567-001"
                    aria-invalid={!!errors.taxCode}
                    disabled={saving}
                    data-testid="company-input-tax"
                  />
                  {err('taxCode')}
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="company-phone">
                    Số điện thoại
                  </label>
                  <input
                    id="company-phone"
                    type="tel"
                    className={`form-input ${errors.phone ? 'form-input--error' : ''}`}
                    value={form.phone}
                    onChange={(e) => set('phone', e.target.value)}
                    placeholder="02438123456"
                    aria-invalid={!!errors.phone}
                    disabled={saving}
                    data-testid="company-input-phone"
                  />
                  {err('phone')}
                </div>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="company-email">
                  Email liên hệ
                </label>
                <input
                  id="company-email"
                  type="email"
                  className={`form-input ${errors.email ? 'form-input--error' : ''}`}
                  value={form.email}
                  onChange={(e) => set('email', e.target.value)}
                  placeholder="lienhe@congty.vn"
                  aria-invalid={!!errors.email}
                  disabled={saving}
                  data-testid="company-input-email"
                />
                {err('email')}
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="company-address">
                  Địa chỉ
                </label>
                <textarea
                  id="company-address"
                  rows={2}
                  className={`form-input ${errors.address ? 'form-input--error' : ''}`}
                  value={form.address}
                  maxLength={MAX_ADDRESS}
                  onChange={(e) => set('address', e.target.value)}
                  disabled={saving}
                  data-testid="company-input-address"
                />
                {err('address')}
              </div>
            </section>

            <section className="company-card" aria-labelledby="company-sec-fiscal">
              <h2 className="company-card__title" id="company-sec-fiscal">
                Tiền tệ và kỳ tài chính
              </h2>
              <div className="company-grid company-grid--3">
                <div className="form-group">
                  <label className="form-label" htmlFor="company-currency">
                    Đơn vị tiền tệ <span className="field-required">*</span>
                  </label>
                  <select
                    id="company-currency"
                    className="form-select"
                    value={form.currency}
                    onChange={(e) => set('currency', e.target.value as CompanyForm['currency'])}
                    disabled={saving}
                    data-testid="company-input-currency"
                  >
                    {CURRENCY_OPTIONS.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="company-fiscal-start">
                    Tháng bắt đầu năm tài chính <span className="field-required">*</span>
                  </label>
                  <select
                    id="company-fiscal-start"
                    className={`form-select ${errors.fiscalYearStartMonth ? 'form-input--error' : ''}`}
                    value={form.fiscalYearStartMonth}
                    onChange={(e) => set('fiscalYearStartMonth', Number(e.target.value))}
                    disabled={saving}
                    data-testid="company-input-fiscal-start"
                  >
                    {MONTH_LABELS.map((label, i) => (
                      <option key={label} value={i + 1}>
                        {label}
                      </option>
                    ))}
                  </select>
                  {err('fiscalYearStartMonth')}
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="company-days">
                    Ngày công chuẩn / tháng <span className="field-required">*</span>
                  </label>
                  <input
                    id="company-days"
                    inputMode="numeric"
                    className={`form-input ${errors.standardWorkingDaysPerMonth ? 'form-input--error' : ''}`}
                    value={form.standardWorkingDaysPerMonth}
                    onChange={(e) => set('standardWorkingDaysPerMonth', e.target.value)}
                    aria-invalid={!!errors.standardWorkingDaysPerMonth}
                    disabled={saving}
                    data-testid="company-input-days"
                  />
                  {err('standardWorkingDaysPerMonth')}
                </div>
              </div>
            </section>
          </div>

          <aside className="company-side" aria-labelledby="company-preview-title">
            <div className="company-card">
              <h2 className="company-card__title" id="company-preview-title">
                Xem trước cách chia kỳ
              </h2>
              {startChanged && (
                <p className="company-change" data-testid="company-fiscal-change">
                  Sau khi lưu, báo cáo theo năm/quý chia kỳ từ <strong>tháng {form.fiscalYearStartMonth}</strong> thay vì tháng{' '}
                  {saved.fiscalYearStartMonth}. Dữ liệu đã ghi nhận không bị thay đổi.
                </p>
              )}
              {preview && <FiscalYearOverview period={preview} highlightDate={today} compact testIdPrefix="company-preview" />}
            </div>
          </aside>

          <div className={`pref-actionbar company-actionbar ${dirty ? 'pref-actionbar--dirty' : ''}`}>
            <span className="pref-actionbar__status" data-testid="company-status">
              {dirty && saved.configured
                ? 'Có thay đổi chưa lưu'
                : saved.updatedAt
                  ? `Cập nhật lần cuối bởi ${saved.updatedBy ?? '—'} lúc ${formatDateTime(saved.updatedAt)}`
                  : 'Chưa lưu cấu hình lần nào'}
            </span>
            <div className="pref-actionbar__buttons">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  setForm(savedForm);
                  setErrors({});
                }}
                disabled={!dirty || saving || !saved.configured}
                data-testid="company-reset"
              >
                Hoàn tác
              </button>
              <button type="submit" className="btn-primary" disabled={!dirty || saving} data-testid="company-save">
                {ICONS.save} {saving ? 'Đang lưu…' : 'Lưu cấu hình'}
              </button>
            </div>
          </div>
        </form>
      )}

      {toast &&
        createPortal(
          <div className={`toast-notification toast-notification--${toast.type}`} role="alert" aria-live="polite">
            <div className="toast-notification__content">
              <span className="toast-notification__icon">
                {toast.type === 'success' ? ICONS.checkCircle : ICONS.alertTriangle}
              </span>
              <span className="toast-notification__text">{toast.message}</span>
            </div>
            <button type="button" className="toast-notification__close" onClick={() => setToast(null)} aria-label="Đóng thông báo">
              <span className="icon-sm">{ICONS.close}</span>
            </button>
          </div>,
          document.body
        )}
    </div>
  );
}
