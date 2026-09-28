import { useCallback, useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { ICONS } from '../../../components/common/icons';
import { RowActionsMenu } from '../../../components/common/RowActionsMenu';
import { createBillRate, fetchCurrentBillRates, RatesApiError, updateBillRate } from '../api/ratesApi';
import type { BillRateRes, RateUpdatePayload } from '../types/rateTypes';
import RateFormModal from '../components/RateFormModal';
import RateAccessDenied from '../components/RateAccessDenied';
import RateEditModal from '../components/RateEditModal';
import WorkTypeRateStrip from '../components/WorkTypeRateStrip';
import { canManageRates } from '../utils/rateAccess';
import { formatIsoDate, formatVnd, isFutureIso, type RateEditMode } from '../utils/rateFormat';
import PageHeader from '../../../components/common/PageHeader';

interface BillRatePageProps {
  currentUserRoles?: string[];
  currentUserName?: string;
  /** Cho phép nạp sẵn dữ liệu trong test để bỏ qua bước gọi API. */
  initialBillRates?: BillRateRes[];
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
 *
 * Là tab "Bảng giá chung" của khu Đơn giá. Đơn giá riêng theo hợp đồng và hai ô tra cứu nằm ở tab riêng
 * (ContractRatePage, RateLookupPage); hệ số loại giờ thu thành một dải ngay trên bảng (WorkTypeRateStrip).
 */
export default function BillRatePage({
  currentUserRoles = [],
  currentUserName = 'Người dùng',
  initialBillRates,
}: BillRatePageProps) {
  const isAllowed = canManageRates(currentUserRoles);

  const [billRates, setBillRates] = useState<BillRateRes[]>(initialBillRates ?? []);
  const [isLoading, setIsLoading] = useState(!initialBillRates);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editing, setEditing] = useState<BillRateRes | null>(null);

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
          (r) => isFutureIso(r.effectiveFrom) && !fetchedKeys.has(rateKey(r))
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
    const note = isFutureIso(created.effectiveFrom)
      ? ` Có hiệu lực từ ${formatIsoDate(created.effectiveFrom)} — sẽ hiện ở màn hình lập báo giá đúng ngày này.`
      : '';
    showToast(`Đã khai báo đơn giá cho ${created.professionalRole} (${created.level}).${note}`);
  };

  const samePair = (a: BillRateRes, b: BillRateRes) =>
    a.professionalRole === b.professionalRole && a.level === b.level;

  // Sửa thẳng (dòng chưa áp dụng trước hôm nay) hoặc ghi mức mới từ một ngày (dòng đã áp dụng) — xem RateEditModal.
  const handleEditSubmit = async (mode: RateEditMode, payload: RateUpdatePayload) => {
    if (!editing || editing.id == null) return;
    if (mode === 'edit') {
      const updated = await updateBillRate(editing.id, payload);
      setBillRates((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
      showToast(
        `Đã sửa đơn giá ${updated.professionalRole} (${updated.level}): ${formatVnd(updated.dailyRate)}/ngày, hiệu lực từ ${formatIsoDate(updated.effectiveFrom)}.`
      );
      return;
    }
    const created = await createBillRate({
      professionalRole: editing.professionalRole,
      level: editing.level,
      dailyRate: payload.dailyRate,
      effectiveFrom: payload.effectiveFrom,
    });
    setBillRates((prev) => {
      const others = prev.filter((r) => rateKey(r) !== rateKey(created));
      // Bảng chỉ hiện mức ĐANG hiệu lực của mỗi cặp: mức mới có hiệu lực hôm nay thay luôn mức cũ; mức từ ngày
      // sau thì hiện kèm nhãn "Sắp hiệu lực", mức cũ vẫn ở đó tới ngày đó.
      if (isFutureIso(created.effectiveFrom)) return [created, ...others];
      return [created, ...others.filter((r) => !(samePair(r, created) && !isFutureIso(r.effectiveFrom)))];
    });
    showToast(
      `Đã đổi đơn giá ${created.professionalRole} (${created.level}) thành ${formatVnd(created.dailyRate)}/ngày từ ${formatIsoDate(created.effectiveFrom)}. Mức cũ vẫn áp dụng cho giai đoạn trước.`
    );
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
      <RateAccessDenied
        title="Bạn không có thẩm quyền quản lý bảng đơn giá"
        currentUserName={currentUserName}
        currentUserRoles={currentUserRoles}
        testId="bill-rate-access-denied"
      />
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

      <PageHeader
        title="Bảng đơn giá"
        actions={
          <button type="button" className="btn btn-primary" onClick={() => setIsFormOpen(true)}>
            <span className="icon-xs">{ICONS.plus}</span> Khai báo đơn giá
          </button>
        }
      />

      <div className="user-table-card">
        <WorkTypeRateStrip />
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
          <div className="table-responsive" tabIndex={0} aria-label="Bảng đơn giá">
            {/* Không giới hạn chiều cao: bảng vài chục dòng cuộn cùng trang — một thanh cuộn thay vì cuộn lồng
                trong khung 520px (người dùng thấy "cứ sao sao"). */}
            <table className="user-data-table" data-testid="bill-rate-table">
              <thead>
                <tr>
                  <th style={headStyle}>Vai trò chuyên môn</th>
                  <th style={headStyle}>Cấp bậc</th>
                  <th style={{ ...headStyle, textAlign: 'right' }}>Đơn giá / ngày công</th>
                  <th style={headStyle}>Hiệu lực từ</th>
                  <th style={{ ...headStyle, width: '52px' }} aria-label="Thao tác" />
                </tr>
              </thead>
              <tbody>
                {sorted.map((r) => {
                  const future = isFutureIso(r.effectiveFrom);
                  return (
                    <tr key={rateKey(r)}>
                      <td>{r.professionalRole}</td>
                      <td>{r.level}</td>
                      <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono, monospace)' }}>
                        {formatVnd(r.dailyRate)}
                      </td>
                      <td className="cell-muted" style={{ whiteSpace: 'nowrap' }}>
                        {formatIsoDate(r.effectiveFrom)}
                        {future && (
                          <span className="badge badge--gold" style={{ marginLeft: '8px' }}>
                            Sắp hiệu lực
                          </span>
                        )}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {r.id != null && (
                          <RowActionsMenu
                            ariaLabel={`Thao tác với đơn giá ${r.professionalRole} (${r.level})`}
                            actions={[
                              {
                                key: 'edit',
                                label: 'Sửa đơn giá',
                                icon: ICONS.edit,
                                onClick: () => setEditing(r),
                                testId: `bill-rate-edit-${r.id}`,
                              },
                            ]}
                          />
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {!loadError && sorted.length > 0 && (
          <div className="table-footer">
            <span className="table-footer__count">
              Hiển thị <strong>{sorted.length}</strong> / <strong>{billRates.length}</strong> đơn giá
            </span>
          </div>
        )}
      </div>

      <RateEditModal
        rate={editing && editing.id != null ? { ...editing, id: editing.id } : null}
        scopeLabel="Bảng giá chung"
        historyHint="xem lại ở tab Lịch sử thay đổi"
        onClose={() => setEditing(null)}
        onSubmit={handleEditSubmit}
      />

      <RateFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSaved={handleCreated}
        currentUserRoles={currentUserRoles}
      />
    </div>
  );
}
