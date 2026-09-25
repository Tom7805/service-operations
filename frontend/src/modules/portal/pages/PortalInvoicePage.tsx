import { useCallback, useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { ICONS } from '../../../components/common/icons';
import { fetchPortalInvoices, fetchPortalInvoiceSummary } from '../api/portalApi';
import { formatPortalDate } from '../components/PortalProgressBar';
import {
  PORTAL_INVOICE_STATUS_LABEL,
  type PortalDebtSummary,
  type PortalInvoice,
  type PortalInvoiceStatus,
} from '../types/portalTypes';
import { formatPortalMoney } from '../utils/portalFormat';

interface Props {
  onOpen: (invoiceId: number) => void;
}

type Filter = 'ALL' | 'OUTSTANDING' | 'OVERDUE' | 'PAID' | 'CANCELLED';

export const INVOICE_STATUS_TONE: Record<PortalInvoiceStatus, string> = {
  ISSUED: 'badge--blue',
  PARTIALLY_PAID: 'badge--orange',
  PAID: 'badge--green',
  CANCELLED: 'badge--gray',
};

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

const isOutstanding = (i: PortalInvoice) => i.status !== 'CANCELLED' && Number(i.remainingAmount) > 0;

/**
 * NCL-13-CN-004 — hóa đơn và công nợ của khách hàng trên cổng (TC-01): tổng đã xuất/đã trả/còn phải trả, số quá hạn,
 * hạn thanh toán gần nhất; danh sách hóa đơn đã phát hành kèm trạng thái thanh toán, số đã trả, số còn lại và hạn.
 * Backend chỉ trả hóa đơn của chính khách hàng (QTN-26) và ghi nhật ký mỗi lượt xem (TC-04).
 */
export default function PortalInvoicePage({ onOpen }: Props) {
  const [invoices, setInvoices] = useState<PortalInvoice[]>([]);
  const [summary, setSummary] = useState<PortalDebtSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('ALL');
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const [list, debt] = await Promise.all([fetchPortalInvoices(), fetchPortalInvoiceSummary()]);
      setInvoices(list);
      setSummary(debt);
    } catch (err) {
      setInvoices([]);
      setSummary(null);
      setLoadError(err instanceof Error && err.message ? err.message : 'Không tải được hóa đơn.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const counts = useMemo(
    () => ({
      ALL: invoices.length,
      OUTSTANDING: invoices.filter(isOutstanding).length,
      OVERDUE: invoices.filter((i) => i.overdue).length,
      PAID: invoices.filter((i) => i.status === 'PAID').length,
      CANCELLED: invoices.filter((i) => i.status === 'CANCELLED').length,
    }),
    [invoices]
  );

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return invoices.filter((i) => {
      const byFilter =
        filter === 'ALL' ||
        (filter === 'OUTSTANDING' && isOutstanding(i)) ||
        (filter === 'OVERDUE' && i.overdue) ||
        (filter === 'PAID' && i.status === 'PAID') ||
        (filter === 'CANCELLED' && i.status === 'CANCELLED');
      return byFilter && (!q || i.invoiceCode.toLowerCase().includes(q) || (i.contractCode ?? '').toLowerCase().includes(q));
    });
  }, [invoices, filter, search]);

  return (
    <div className="portal-page">
      <div className="page-header">
        <div>
          <div className="page-header__kicker">
            <span className="page-header__tag">{ICONS.receipt} HÓA ĐƠN</span>
            <span className="page-header__dot" />
            <span className="page-header__meta">{summary?.customerName ?? 'CÔNG NỢ CỦA BẠN'}</span>
          </div>
          <h1 className="page-title">Hóa đơn và công nợ</h1>
          <p className="page-subtitle">
            Theo dõi các hóa đơn đã phát hành, số đã thanh toán, số còn phải trả và hạn thanh toán để chủ động thu xếp.
          </p>
        </div>
        <button type="button" className="btn btn-secondary" onClick={() => void load()} disabled={isLoading}>
          <span className="icon-xs">{ICONS.refresh}</span> Làm mới
        </button>
      </div>

      {isLoading ? (
        <div className="user-table-card">
          <div className="table-loading-state">
            <div className="spinner-lg" />
            <p>Đang tải hóa đơn...</p>
          </div>
        </div>
      ) : loadError ? (
        <div className="user-table-card">
          <div className="table-error-state" role="alert">
            <div className="table-error-state__icon">{ICONS.alertTriangle}</div>
            <div className="table-error-state__body">
              <h3>Không tải được hóa đơn và công nợ</h3>
              <p>{loadError}</p>
            </div>
            <button type="button" className="btn btn-secondary" onClick={() => void load()}>
              Thử lại
            </button>
          </div>
        </div>
      ) : (
        <>
          {summary && summary.overdueInvoiceCount > 0 && (
            <div className="alert-box alert-box--danger alert-box--inline" data-testid="portal-invoice-overdue-banner">
              <span className="alert-box__icon">{ICONS.alertTriangle}</span>
              <div className="alert-box__content">
                Có <strong>{summary.overdueInvoiceCount}</strong> hóa đơn đã quá hạn thanh toán với tổng số tiền{' '}
                <strong>{formatPortalMoney(summary.totalOverdue)}</strong>. Vui lòng thu xếp thanh toán hoặc liên hệ kế toán
                nếu đã chuyển khoản.
              </div>
            </div>
          )}

          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-card__icon stat-card__icon--blue">{ICONS.receipt}</div>
              <div>
                <span className="stat-card__label">Tổng đã xuất hóa đơn</span>
                <div className="stat-card__value portal-money" data-testid="portal-invoice-total">
                  {formatPortalMoney(summary?.totalInvoiced ?? 0)}
                </div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-card__icon stat-card__icon--green">{ICONS.checkCircle}</div>
              <div>
                <span className="stat-card__label">Đã thanh toán</span>
                <div className="stat-card__value portal-money">{formatPortalMoney(summary?.totalPaid ?? 0)}</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-card__icon stat-card__icon--amber">{ICONS.money}</div>
              <div>
                <span className="stat-card__label">Còn phải trả</span>
                <div className="stat-card__value portal-money" data-testid="portal-invoice-outstanding">
                  {formatPortalMoney(summary?.totalOutstanding ?? 0)}
                </div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-card__icon stat-card__icon--red">{ICONS.calendar}</div>
              <div>
                <span className="stat-card__label">Hạn thanh toán gần nhất</span>
                <div className="stat-card__value portal-money" data-testid="portal-invoice-next-due">
                  {summary?.nextDueDate ? formatPortalDate(summary.nextDueDate) : '—'}
                </div>
                {summary?.nextDueDate && (
                  <span className="portal-project-card__sub">{formatPortalMoney(summary.nextDueAmount)}</span>
                )}
              </div>
            </div>
          </div>

          <div className="user-table-card">
            <div className="user-table-toolbar">
              <div className="search-box">
                <span className="search-box__icon" aria-hidden="true">{ICONS.search}</span>
                <input
                  type="text"
                  className="search-box__input"
                  placeholder="Tìm theo số hóa đơn hoặc hợp đồng..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  aria-label="Tìm hóa đơn"
                />
              </div>
              <div className="status-tabs" role="tablist" aria-label="Lọc hóa đơn">
                {(
                  [
                    ['ALL', 'Tất cả'],
                    ['OUTSTANDING', 'Còn phải trả'],
                    ['OVERDUE', 'Quá hạn'],
                    ['PAID', 'Đã thanh toán'],
                    ['CANCELLED', 'Đã hủy'],
                  ] as const
                ).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    role="tab"
                    aria-selected={filter === key}
                    className={`status-tab ${filter === key ? 'status-tab--active' : ''}`}
                    onClick={() => setFilter(key)}
                    data-testid={`portal-invoice-tab-${key}`}
                  >
                    {label} ({counts[key]})
                  </button>
                ))}
              </div>
            </div>

            {visible.length === 0 ? (
              <div className="table-empty-state" data-testid="portal-invoice-empty">
                <div className="table-empty-state__icon">{ICONS.receipt}</div>
                <h3>{invoices.length === 0 ? 'Chưa có hóa đơn nào' : 'Không có hóa đơn khớp bộ lọc'}</h3>
                <p>
                  {invoices.length === 0
                    ? 'Hóa đơn sẽ hiện ở đây sau khi được phát hành cho công ty bạn.'
                    : 'Thử đổi bộ lọc hoặc từ khóa tìm kiếm.'}
                </p>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="user-data-table" data-testid="portal-invoice-table">
                  <thead>
                    <tr>
                      <th style={headStyle}>Hóa đơn</th>
                      <th style={headStyle}>Ngày / hạn thanh toán</th>
                      <th style={{ ...headStyle, textAlign: 'right' }}>Tổng tiền</th>
                      <th style={{ ...headStyle, textAlign: 'right' }}>Đã trả</th>
                      <th style={{ ...headStyle, textAlign: 'right' }}>Còn phải trả</th>
                      <th style={headStyle}>Trạng thái</th>
                      <th style={{ ...headStyle, textAlign: 'right' }}>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map((i) => (
                      <tr
                        key={i.id}
                        className={i.overdue ? 'portal-invoice-row--overdue' : ''}
                        data-testid={`portal-invoice-row-${i.id}`}
                      >
                        <td>
                          <div style={{ fontWeight: 600, fontFamily: 'var(--font-mono, monospace)', fontSize: '13.5px' }}>
                            {i.invoiceCode}
                          </div>
                          <div className="cell-muted" style={{ fontSize: '12.5px' }}>
                            {i.contractCode ? `Hợp đồng ${i.contractCode}` : '—'}
                          </div>
                        </td>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          <div>{formatPortalDate(i.invoiceDate)}</div>
                          <div className={i.overdue ? 'text-danger' : 'cell-muted'} style={{ fontSize: '12.5px' }}>
                            Hạn: {formatPortalDate(i.dueDate)}
                            {i.overdue ? ` · quá ${i.daysOverdue} ngày` : ''}
                          </div>
                        </td>
                        <td className="portal-money-cell">{formatPortalMoney(i.totalAmount)}</td>
                        <td className="portal-money-cell">{formatPortalMoney(i.paidAmount)}</td>
                        <td className="portal-money-cell" style={{ fontWeight: 600 }}>
                          {formatPortalMoney(i.remainingAmount)}
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                            <span className={`badge ${INVOICE_STATUS_TONE[i.status as PortalInvoiceStatus] ?? 'badge--gray'}`}>
                              {PORTAL_INVOICE_STATUS_LABEL[i.status as PortalInvoiceStatus] ?? i.status}
                            </span>
                            {i.overdue && <span className="badge badge--red">Quá hạn</span>}
                          </div>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => onOpen(i.id)}
                            data-testid={`portal-invoice-open-${i.id}`}
                          >
                            Chi tiết
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
