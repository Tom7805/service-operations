import { useCallback, useEffect, useState } from 'react';
import { ICONS } from '../../../components/common/icons';
import { roleLabels } from '../../../utils/roleLabel';
import type { ReceivableAgingRes } from '../types/invoiceTypes';
import { fetchReceivableAging, InvoicesApiError } from '../api/invoicesApi';

interface Props {
  currentUserRoles?: string[];
  currentUserName?: string;
  /** Không bắt buộc: chưa có màn chi tiết hóa đơn trên nhánh này thì bỏ trống, cột
   *  thao tác "Xem" tự ẩn thay vì trỏ tới một trang không tồn tại. */
  onOpenInvoice?: (invoiceId: number) => void;
}

const BUCKET_TONE: Record<string, string> = {
  DAYS_1_30: 'stat-card__icon--amber',
  DAYS_31_60: 'stat-card__icon--blue',
  DAYS_61_90: 'stat-card__icon--purple',
  OVER_90: 'stat-card__icon--red',
};

function formatAmount(value: number | null | undefined): string {
  if (value == null) return '—';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value);
}

function formatDate(value?: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString('vi-VN');
}

/**
 * NCL-10-CN-004 — Báo cáo tuổi nợ: hóa đơn quá hạn gộp theo 4 nhóm ngày (1-30,
 * 31-60, 61-90, >90). Backend LUÔN trả đủ 4 nhóm kể cả rỗng nên UI không cần tự
 * suy ra nhóm nào thiếu — chỉ việc render đúng những gì trả về. Chỉ đọc, không
 * đổi dữ liệu (ghi nhận thanh toán ở NCL-10-CN-003 tự làm hóa đơn rời khỏi đây).
 */
export default function ReceivableAgingPage({ currentUserRoles = [], currentUserName = 'Người dùng', onOpenInvoice }: Props) {
  const isAllowed = currentUserRoles.includes('VT-05');

  const [aging, setAging] = useState<ReceivableAgingRes | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const data = await fetchReceivableAging();
      setAging(data);
    } catch (err) {
      setLoadError(err instanceof InvoicesApiError ? err.message : 'Không tải được báo cáo tuổi nợ.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAllowed) {
      setIsLoading(false);
      return;
    }
    void load();
  }, [isAllowed, load]);

  if (!isAllowed) {
    return (
      <div className="access-denied-container" data-testid="receivable-aging-access-denied">
        <div className="access-denied-card">
          <div className="access-denied-icon">{ICONS.shieldOff}</div>
          <h2>Bạn không có thẩm quyền xem báo cáo tuổi nợ</h2>
          <p>Chức năng này chỉ dành riêng cho <strong>Kế toán</strong> (VT-05).</p>
          <div className="security-log-badge">
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
      <div className="page-header">
        <div>
          <h1 className="page-title">Báo cáo tuổi nợ</h1>
          <p className="page-subtitle">Hóa đơn quá hạn thanh toán, gộp theo số ngày quá hạn.</p>
        </div>
        <button type="button" className="btn-icon-refresh" onClick={() => void load()} title="Tải lại" aria-label="Tải lại báo cáo tuổi nợ">
          {ICONS.refresh}
        </button>
      </div>

      {isLoading ? (
        <div className="table-loading-state">
          <div className="spinner-lg" />
          <p>Đang tải báo cáo tuổi nợ...</p>
        </div>
      ) : loadError ? (
        <div className="table-error-state" role="alert">
          <div className="table-error-state__icon">{ICONS.alertTriangle}</div>
          <div className="table-error-state__body">
            <h3>Không tải được báo cáo tuổi nợ</h3>
            <p>{loadError}</p>
          </div>
          <button type="button" className="btn btn-secondary" onClick={() => void load()}>Thử lại</button>
        </div>
      ) : aging ? (
        <>
          <div className="stats-grid" style={{ marginBottom: '16px' }}>
            <div className="stat-card">
              <div className="stat-card__icon stat-card__icon--red">{ICONS.alertTriangle}</div>
              <div>
                <span className="stat-card__label">Tổng hóa đơn quá hạn</span>
                <div className="stat-card__value">{aging.totalInvoiceCount}</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-card__icon stat-card__icon--amber">{ICONS.money}</div>
              <div>
                <span className="stat-card__label">Tổng còn phải thu</span>
                <div className="stat-card__value">{formatAmount(aging.totalRemainingAmount)}</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-card__icon stat-card__icon--purple">{ICONS.clock}</div>
              <div>
                <span className="stat-card__label">Tính tại ngày</span>
                <div className="stat-card__value">{formatDate(aging.asOfDate)}</div>
              </div>
            </div>
          </div>

          {aging.totalInvoiceCount === 0 && (
            <div className="table-empty-state" data-testid="receivable-aging-empty">
              <div className="table-empty-state__icon">{ICONS.checkCircle}</div>
              <h3>Không có công nợ quá hạn</h3>
              <p>Mọi hóa đơn đều trong hạn hoặc đã thu đủ.</p>
            </div>
          )}

          {aging.buckets.map((bucket) => (
            <div key={bucket.bucket} className="user-table-card" style={{ marginBottom: '16px' }} data-testid={`aging-bucket-${bucket.bucket}`}>
              <div className="page-header" style={{ padding: '16px 16px 0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div className={`stat-card__icon ${BUCKET_TONE[bucket.bucket] ?? 'stat-card__icon--purple'}`}>
                    {ICONS.clock}
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600 }}>{bucket.label}</h3>
                    <p className="field-hint" style={{ margin: 0 }}>
                      {bucket.invoiceCount} hóa đơn · {formatAmount(bucket.remainingAmount)}
                    </p>
                  </div>
                </div>
              </div>
              {bucket.invoices.length === 0 ? (
                <div className="table-empty-state" data-testid={`aging-bucket-empty-${bucket.bucket}`}>
                  <div className="table-empty-state__icon">{ICONS.checkCircle}</div>
                  <h3>Không có hóa đơn nào ở nhóm này</h3>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="user-data-table" data-testid={`aging-bucket-table-${bucket.bucket}`}>
                    <thead>
                      <tr>
                        <th>Mã hóa đơn</th>
                        <th>Hợp đồng</th>
                        <th>Khách hàng</th>
                        <th style={{ textAlign: 'right' }}>Còn lại</th>
                        <th>Hạn thanh toán</th>
                        <th style={{ textAlign: 'right' }}>Số ngày quá hạn</th>
                        {onOpenInvoice && <th />}
                      </tr>
                    </thead>
                    <tbody>
                      {bucket.invoices.map((inv) => (
                        <tr key={inv.id}>
                          <td style={{ fontFamily: 'var(--font-mono, monospace)', fontWeight: 600 }}>{inv.invoiceCode}</td>
                          <td>{inv.contractCode || '—'}</td>
                          <td>{inv.customerName || '—'}</td>
                          <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatAmount(inv.remainingAmount)}</td>
                          <td className="cell-muted">{formatDate(inv.dueDate)}</td>
                          <td style={{ textAlign: 'right' }}>{inv.daysOverdue}</td>
                          {onOpenInvoice && (
                            <td style={{ textAlign: 'right' }}>
                              <button
                                type="button"
                                className="btn-icon-refresh"
                                onClick={() => onOpenInvoice(inv.id)}
                                aria-label={`Xem hóa đơn ${inv.invoiceCode}`}
                              >
                                {ICONS.eye}
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </>
      ) : null}
    </div>
  );
}
