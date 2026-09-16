import { useCallback, useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { ICONS } from '../../../components/common/icons';
import { roleLabels } from '../../../utils/roleLabel';
import { fetchCurrentBillRates, RatesApiError } from '../api/ratesApi';
import type { BillRateRes } from '../types/rateTypes';
import RateFormModal from '../components/RateFormModal';
import RateResolveLookup from '../components/RateResolveLookup';
import ContractRateManager from '../components/ContractRateManager';

interface BillRatePageProps {
  currentUserRoles?: string[];
  currentUserName?: string;
  /** Cho phép nạp sẵn dữ liệu trong test để bỏ qua bước gọi API. */
  initialBillRates?: BillRateRes[];
}

function formatDailyRate(value: number): string {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(
    value
  );
}

function formatDate(value: string): string {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString('vi-VN');
}

function isFutureEffective(effectiveFrom: string): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(effectiveFrom);
  return !Number.isNaN(d.getTime()) && d.getTime() > today.getTime();
}

function rateKey(r: Pick<BillRateRes, 'professionalRole' | 'level' | 'effectiveFrom'>): string {
  return `${r.professionalRole}__${r.level}__${r.effectiveFrom}`;
}

const headStyle: CSSProperties = {
  padding: '12px 16px',
  fontFamily: 'var(--font-mono, monospace)',
  fontSize: '12px',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: 'var(--track-caps)',
  color: 'var(--ink-muted)',
  whiteSpace: 'nowrap',
};

/**
 * NCL-07-CN-001 — "Bảng đơn giá theo vai trò": Kế toán (VT-05) hoặc Quản trị
 * viên (VT-07) khai báo đơn giá theo NGÀY công cho từng cặp (vai trò chuyên
 * môn, cấp bậc), có hiệu lực từ một ngày cụ thể. Đơn giá này được
 * `NCL-03-CN-003` (Lập báo giá) tra cứu theo TÊN VAI TRÒ khi tính
 * `amount = workDays * dailyRate` — màn hình này không đổi ngữ nghĩa đó.
 */
export default function BillRatePage({
  currentUserRoles = [],
  currentUserName = 'Người dùng',
  initialBillRates,
}: BillRatePageProps) {
  const isAllowed = currentUserRoles.includes('VT-05') || currentUserRoles.includes('VT-07');

  const [billRates, setBillRates] = useState<BillRateRes[]>(initialBillRates ?? []);
  const [isLoading, setIsLoading] = useState(!initialBillRates);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToast({ text, type });
    window.setTimeout(() => setToast(null), 4500);
  };

  const loadBillRates = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const data = await fetchCurrentBillRates();
      // Giữ lại các dòng vừa khai báo trong phiên này có ngày hiệu lực trong
      // tương lai — GET /bill-rates/current chỉ trả về đơn giá hiệu lực TÍNH
      // ĐẾN HÔM NAY (chủ đích, QTN-15) nên nếu không giữ lại, Kế toán vừa
      // khai báo xong sẽ tưởng thao tác thất bại vì "biến mất" khỏi bảng.
      setBillRates((prev) => {
        const fetchedKeys = new Set(data.map(rateKey));
        const stillPendingFuture = prev.filter(
          (r) => isFutureEffective(r.effectiveFrom) && !fetchedKeys.has(rateKey(r))
        );
        return [...stillPendingFuture, ...data];
      });
    } catch (err) {
      if (err instanceof RatesApiError && err.statusCode === 403) {
        // Trang đã hiển thị màn từ chối quyền phía trên; không cần banner đỏ.
        setBillRates([]);
      } else {
        setLoadError(
          err instanceof RatesApiError ? err.message : 'Không tải được bảng đơn giá. Vui lòng thử lại.'
        );
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (initialBillRates || !isAllowed) {
      setIsLoading(false);
      return;
    }
    void loadBillRates();
  }, [initialBillRates, isAllowed, loadBillRates]);

  const handleCreated = (created: BillRateRes) => {
    setBillRates((prev) => [created, ...prev.filter((r) => rateKey(r) !== rateKey(created))]);
    const note = isFutureEffective(created.effectiveFrom)
      ? ` Có hiệu lực từ ${formatDate(created.effectiveFrom)} — sẽ hiện ở màn hình lập báo giá đúng ngày này.`
      : '';
    showToast(`Đã khai báo đơn giá cho ${created.professionalRole} (${created.level}).${note}`);
  };

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return billRates;
    return billRates.filter(
      (r) => r.professionalRole.toLowerCase().includes(q) || r.level.toLowerCase().includes(q)
    );
  }, [billRates, searchTerm]);

  const sorted = useMemo(
    () =>
      [...filtered].sort((a, b) => {
        if (a.professionalRole !== b.professionalRole) return a.professionalRole.localeCompare(b.professionalRole);
        if (a.level !== b.level) return a.level.localeCompare(b.level);
        return b.effectiveFrom.localeCompare(a.effectiveFrom);
      }),
    [filtered]
  );

  // NCL-07-CN-001 (TC-03): từ chối quyền cho vai trò khác Kế toán/Quản trị viên.
  if (!isAllowed) {
    return (
      <div className="access-denied-container" data-testid="bill-rate-access-denied">
        <div className="access-denied-card">
          <div className="access-denied-icon">{ICONS.shieldOff}</div>
          <h2>Bạn không có thẩm quyền quản lý bảng đơn giá</h2>
          <p>
            Chỉ <strong>Kế toán</strong> (VT-05) hoặc <strong>Quản trị viên</strong> (VT-07) được khai báo bảng
            đơn giá theo vai trò. Hệ thống đã ghi lại lần từ chối truy cập này vào Nhật ký hệ thống.
          </p>
          <div className="security-log-badge">
            <span className="security-log-badge__item">
              {ICONS.shield} Thời điểm ghi nhận: {new Date().toLocaleString('vi-VN')}
            </span>
            <span className="security-log-badge__item">Tài khoản: {currentUserName}</span>
            <span className="security-log-badge__item">
              Vai trò tài khoản: {roleLabels(currentUserRoles) || '(không xác định)'}
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="user-management-page">
      {toast && (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: 'fixed',
            top: '20px',
            right: '24px',
            zIndex: 1050,
            padding: '12px 20px',
            background: toast.type === 'success' ? 'var(--pale-green-bg)' : 'var(--pale-red-bg)',
            color: toast.type === 'success' ? 'var(--pale-green-fg)' : 'var(--pale-red-fg)',
            border: `1px solid ${
              toast.type === 'success' ? 'rgba(52, 101, 56, 0.25)' : 'rgba(159, 47, 45, 0.25)'
            }`,
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '14px',
            fontWeight: 500,
            maxWidth: '420px',
          }}
        >
          <span>{toast.type === 'success' ? ICONS.checkCircle : ICONS.alertTriangle}</span>
          <span>{toast.text}</span>
        </div>
      )}

      <div className="page-header">
        <div>
          <h1 className="page-title">Bảng đơn giá theo vai trò</h1>
          <p className="page-subtitle">
            Khai báo đơn giá theo NGÀY công cho từng vai trò chuyên môn và cấp bậc — dùng để lập báo giá
            (Cơ hội bán hàng) tự động tra cứu theo tên vai trò.
          </p>
        </div>
        <div>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setIsFormOpen(true)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
          >
            <span className="icon-xs">{ICONS.plus}</span> Khai báo đơn giá
          </button>
        </div>
      </div>

      <div className="user-table-card">
        <div className="user-table-toolbar">
          <div className="search-box">
            <span className="search-box__icon" aria-hidden="true">
              {ICONS.search}
            </span>
            <input
              type="text"
              className="search-box__input"
              placeholder="Tìm theo vai trò chuyên môn hoặc cấp bậc..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              aria-label="Tìm kiếm đơn giá"
            />
            {searchTerm && (
              <button
                type="button"
                className="search-box__clear"
                onClick={() => setSearchTerm('')}
                aria-label="Xóa từ khóa tìm kiếm"
              >
                {ICONS.close}
              </button>
            )}
          </div>

          <div className="toolbar-filters">
            <button
              type="button"
              className="btn-icon-refresh"
              onClick={() => void loadBillRates()}
              title="Tải lại bảng đơn giá"
              aria-label="Tải lại bảng đơn giá"
            >
              {ICONS.refresh}
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="table-loading-state">
            <div className="spinner-lg" />
            <p>Đang tải bảng đơn giá...</p>
          </div>
        ) : loadError ? (
          <div className="table-error-state" role="alert">
            <div className="table-error-state__icon">{ICONS.alertTriangle}</div>
            <div className="table-error-state__body">
              <h3>Không tải được bảng đơn giá</h3>
              <p>{loadError}</p>
            </div>
            <button type="button" className="btn btn-secondary" onClick={() => void loadBillRates()}>
              Thử lại
            </button>
          </div>
        ) : sorted.length === 0 ? (
          <div className="table-empty-state" data-testid="bill-rate-empty">
            <div className="table-empty-state__icon">{ICONS.money}</div>
            <h3>{billRates.length === 0 ? 'Chưa có đơn giá nào' : 'Không có đơn giá khớp bộ lọc'}</h3>
            <p>
              {billRates.length === 0
                ? 'Bấm "Khai báo đơn giá" để thêm dòng đầu tiên cho một vai trò chuyên môn.'
                : 'Thử đổi từ khóa tìm kiếm.'}
            </p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="user-data-table" data-testid="bill-rate-table">
              <thead>
                <tr>
                  <th style={headStyle}>Vai trò chuyên môn</th>
                  <th style={headStyle}>Cấp bậc</th>
                  <th style={{ ...headStyle, textAlign: 'right' }}>Đơn giá / ngày công</th>
                  <th style={headStyle}>Hiệu lực từ</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((r) => {
                  const future = isFutureEffective(r.effectiveFrom);
                  return (
                    <tr key={rateKey(r)}>
                      <td>{r.professionalRole}</td>
                      <td>{r.level}</td>
                      <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono, monospace)' }}>
                        {formatDailyRate(r.dailyRate)}
                      </td>
                      <td className="cell-muted" style={{ whiteSpace: 'nowrap' }}>
                        {formatDate(r.effectiveFrom)}
                        {future && (
                          <span className="badge badge--gold" style={{ marginLeft: '8px' }}>
                            Sắp hiệu lực
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="customer-summary-scope-note cell-muted" style={{ marginTop: '12px' }}>
        <span className="icon-xs">{ICONS.info}</span> Không được khai báo trùng cùng một vai trò + cấp bậc cho
        cùng ngày hiệu lực. Mỗi lần khai báo thành công đều được ghi vào Nhật ký hệ thống (người thực hiện ·
        nội dung · thời điểm).
      </p>

      <RateResolveLookup />

      <ContractRateManager currentUserRoles={currentUserRoles} />

      <RateFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSaved={handleCreated}
        currentUserRoles={currentUserRoles}
      />
    </div>
  );
}
