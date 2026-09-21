import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { ICONS } from '../../../components/common/icons';
import type { MarginAlertThresholdRes } from '../types/profitabilityTypes';
import { getMarginAlertThreshold, ProfitabilityApiError, setMarginAlertThreshold } from '../api/profitabilityApi';

export interface MarginAlertThresholdPageProps {
  currentUserRoles?: string[];
  onBack?: () => void;
}

function formatPercent(ratio: number): string {
  return new Intl.NumberFormat('vi-VN', { style: 'percent', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(
    ratio
  );
}

function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString('vi-VN');
}

/**
 * Màn hình cấu hình ngưỡng cảnh báo dự án âm biên (NCL-09-CN-004).
 *
 * Ngưỡng là cấu hình TOÀN CÔNG TY (không theo từng dự án). Mỗi lần "Tính lại" biên lợi
 * nhuận của một dự án (NCL-09-CN-003), hệ thống tự so `marginRate` với ngưỡng này và gửi
 * thông báo trong ứng dụng cho quản lý dự án + toàn bộ Ban giám đốc nếu thấp hơn — thông
 * báo đọc qua "Thông báo" (chuông) sẵn có, màn này chỉ quản lý CON SỐ ngưỡng.
 *
 * Quyền: VT-01, VT-02, VT-05 đều xem được ngưỡng hiện hành; CHỈ VT-01 (Ban giám đốc)
 * được đặt/đổi ngưỡng (TC-03) — vai trò khác thấy màn hình ở chế độ chỉ xem.
 */
export default function MarginAlertThresholdPage({
  currentUserRoles = ['VT-01'],
  onBack,
}: MarginAlertThresholdPageProps) {
  const canViewScreen =
    currentUserRoles.includes('VT-01') ||
    currentUserRoles.includes('VT-02') ||
    currentUserRoles.includes('VT-05');
  const canEdit = currentUserRoles.includes('VT-01');

  const [threshold, setThreshold] = useState<MarginAlertThresholdRes | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [inputValue, setInputValue] = useState('');
  const [fieldError, setFieldError] = useState<string | undefined>(undefined);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!canViewScreen) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getMarginAlertThreshold();
      setThreshold(data);
      setInputValue(data.minMarginRate === null ? '' : String(Number((data.minMarginRate * 100).toFixed(4))));
    } catch (err) {
      const message =
        err instanceof ProfitabilityApiError || err instanceof Error
          ? err.message
          : 'Không thể tải ngưỡng cảnh báo âm biên.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [canViewScreen]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      if (!canEdit) return;

      setFieldError(undefined);
      setSuccessMessage(null);

      const trimmed = inputValue.trim();
      if (trimmed === '') {
        setFieldError('Ngưỡng biên lợi nhuận tối thiểu không được để trống');
        return;
      }
      const percentValue = Number(trimmed);
      if (Number.isNaN(percentValue)) {
        setFieldError('Ngưỡng biên lợi nhuận phải là một số');
        return;
      }
      if (percentValue < -100 || percentValue > 100) {
        setFieldError('Ngưỡng biên lợi nhuận không hợp lệ (từ -100% đến 100%)');
        return;
      }

      setSaving(true);
      setError(null);
      try {
        const updated = await setMarginAlertThreshold({ minMarginRate: percentValue / 100 });
        setThreshold(updated);
        setSuccessMessage('Đã cập nhật ngưỡng cảnh báo âm biên.');
      } catch (err) {
        const message =
          err instanceof ProfitabilityApiError || err instanceof Error
            ? err.message
            : 'Không thể lưu ngưỡng cảnh báo âm biên.';
        if (err instanceof ProfitabilityApiError && err.fieldErrors && err.fieldErrors.length > 0) {
          setFieldError(err.fieldErrors[0].message);
        } else {
          setError(message);
        }
      } finally {
        setSaving(false);
      }
    },
    [canEdit, inputValue]
  );

  if (!canViewScreen) {
    return (
      <div className="user-management-page" data-testid="margin-threshold-forbidden">
        <div className="alert-box alert-box--danger" role="alert">
          Bạn không có quyền xem ngưỡng cảnh báo âm biên (yêu cầu vai trò Ban giám đốc VT-01,
          Quản lý dự án VT-02 hoặc Kế toán VT-05).
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
    <div className="user-management-page" data-testid="margin-threshold-page">
      <div className="page-header" style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {onBack && (
            <button
              type="button"
              className="btn btn-secondary btn-sm btn-back"
              onClick={onBack}
              data-testid="btn-back-margin-threshold"
            >
              {ICONS.arrowLeft} Quay lại
            </button>
          )}
          <div>
            <div className="page-header__kicker">
              <span className="page-header__tag">{ICONS.alertTriangle} CẢNH BÁO ÂM BIÊN</span>
            </div>
            <h1 className="page-title" style={{ margin: '4px 0' }}>
              Ngưỡng cảnh báo dự án âm biên
            </h1>
            <p className="page-subtitle">
              Áp dụng cho toàn bộ dự án trong công ty. Khi biên lợi nhuận của một dự án thấp hơn
              ngưỡng này, hệ thống tự động thông báo cho quản lý dự án và Ban giám đốc.
            </p>
          </div>
        </div>

        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={loadData}
          disabled={loading}
          data-testid="btn-reload-margin-threshold"
        >
          {ICONS.refresh} Tải lại
        </button>
      </div>

      {error && (
        <div
          className="alert-box alert-box--danger"
          role="alert"
          style={{ marginBottom: '16px' }}
          data-testid="margin-threshold-error"
        >
          {error}
        </div>
      )}

      {loading ? (
        <div className="table-loading-state" data-testid="margin-threshold-loading">
          <span className="spinner-lg" />
          <p style={{ marginTop: '10px' }}>Đang tải ngưỡng cảnh báo...</p>
        </div>
      ) : (
        <div className="user-table-card" style={{ padding: '20px', maxWidth: '520px' }}>
          {threshold && threshold.minMarginRate !== null ? (
            <div style={{ marginBottom: '20px' }} data-testid="margin-threshold-current">
              <div style={{ fontSize: '13.5px', color: 'var(--ink-muted)', marginBottom: '8px' }}>Ngưỡng hiện hành</div>
              <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--ink-strong)' }}>
                {formatPercent(threshold.minMarginRate)}
              </div>
              {threshold.updatedBy && threshold.updatedAt && (
                <p style={{ margin: '6px 0 0', color: 'var(--ink-muted)', fontSize: '13.5px' }}>
                  Cập nhật lần cuối bởi <strong>{threshold.updatedBy}</strong> lúc{' '}
                  {formatDateTime(threshold.updatedAt)}
                </p>
              )}
            </div>
          ) : (
            <div
              className="alert-box alert-box--warning"
              role="status"
              style={{ marginBottom: '20px' }}
              data-testid="margin-threshold-unset"
            >
              Chưa thiết lập ngưỡng — hệ thống hiện KHÔNG cảnh báo dự án âm biên nào.
            </div>
          )}

          {successMessage && (
            <div
              className="alert-box alert-box--success"
              role="status"
              style={{ marginBottom: '16px' }}
              data-testid="margin-threshold-success"
            >
              {successMessage}
            </div>
          )}

          {canEdit ? (
            <form onSubmit={handleSubmit} noValidate data-testid="margin-threshold-form">
              <label className="form-label" htmlFor="margin-threshold-input">
                Ngưỡng biên lợi nhuận tối thiểu (%) <span className="field-required">*</span>
              </label>
              <input
                id="margin-threshold-input"
                type="number"
                step="0.01"
                min={-100}
                max={100}
                className={`form-input ${fieldError ? 'form-input--error' : ''}`}
                value={inputValue}
                onChange={(e) => {
                  setInputValue(e.target.value);
                  setFieldError(undefined);
                  setSuccessMessage(null);
                }}
                disabled={saving}
                placeholder="Ví dụ: 15"
                data-testid="margin-threshold-input"
              />
              {fieldError && (
                <p
                  className="field-error"
                  data-testid="error-margin-threshold"
                  style={{ color: 'var(--pale-red-fg)', fontSize: '13.5px', marginTop: '4px' }}
                >
                  {fieldError}
                </p>
              )}
              <button
                type="submit"
                className="btn btn-primary btn-sm"
                disabled={saving}
                style={{ marginTop: '16px' }}
                data-testid="btn-save-margin-threshold"
              >
                {ICONS.save} {saving ? 'Đang lưu...' : 'Lưu ngưỡng'}
              </button>
            </form>
          ) : (
            <div
              className="alert-box alert-box--info"
              role="status"
              data-testid="margin-threshold-readonly-notice"
            >
              <strong>Thông báo:</strong> Chỉ Ban giám đốc (VT-01) được đặt/đổi ngưỡng này. Vai trò
              của bạn chỉ có quyền xem.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
