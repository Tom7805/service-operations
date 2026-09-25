import { useCallback, useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import { ICONS } from '../../../components/common/icons';
import { fetchPortalInvoice, PortalApiError } from '../api/portalApi';
import PortalProgressBar, { formatPortalDate } from '../components/PortalProgressBar';
import {
  PORTAL_INVOICE_STATUS_LABEL,
  PORTAL_PAYMENT_METHOD_LABEL,
  type PortalInvoiceDetail,
  type PortalInvoiceStatus,
  type PortalPaymentMethod,
} from '../types/portalTypes';
import { formatPortalMoney } from '../utils/portalFormat';
import { INVOICE_STATUS_TONE } from './PortalInvoicePage';

interface Props {
  invoiceId: number;
  onBack: () => void;
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
 * NCL-13-CN-004 — chi tiết một hóa đơn trên cổng: các dòng hóa đơn, các lần thanh toán đã ghi nhận, số còn phải trả và
 * hạn thanh toán. Hóa đơn của khách hàng khác/hóa đơn nháp/mã không tồn tại → màn từ chối, backend ghi nhật ký (TC-02).
 */
export default function PortalInvoiceDetailPage({ invoiceId, onBack }: Props) {
  const [data, setData] = useState<PortalInvoiceDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<{ forbidden: boolean; message: string } | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      setData(await fetchPortalInvoice(invoiceId));
    } catch (err) {
      setData(null);
      setError({
        forbidden: err instanceof PortalApiError && err.statusCode === 403,
        message: err instanceof Error && err.message ? err.message : 'Không tải được hóa đơn.',
      });
    } finally {
      setIsLoading(false);
    }
  }, [invoiceId]);

  useEffect(() => {
    void load();
  }, [load]);

  const backButton = (
    <button type="button" className="btn btn-secondary" onClick={onBack} data-testid="portal-invoice-back">
      <span className="icon-xs">{ICONS.arrowLeft}</span> Danh sách hóa đơn
    </button>
  );

  if (isLoading) {
    return (
      <div className="portal-page">
        <div className="mb-4">{backButton}</div>
        <div className="user-table-card">
          <div className="table-loading-state">
            <div className="spinner-lg" />
            <p>Đang tải hóa đơn...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error?.forbidden) {
    return (
      <div className="access-denied-container" data-testid="portal-invoice-forbidden">
        <div className="access-denied-card">
          <div className="access-denied-icon">{ICONS.shieldOff}</div>
          <h2>Bạn không có quyền xem hóa đơn này</h2>
          <p>
            Hóa đơn không thuộc công ty bạn, chưa được phát hành hoặc không tồn tại. Tài khoản cổng chỉ xem được hóa đơn
            của chính khách hàng mình. Lần truy cập này đã được ghi vào nhật ký hệ thống.
          </p>
          <div className="security-log-badge">
            <span className="security-log-badge__item">
              {ICONS.shield} Thời điểm ghi nhận: {new Date().toLocaleString('vi-VN')}
            </span>
            <span className="security-log-badge__item">Mã hóa đơn yêu cầu: {invoiceId}</span>
          </div>
          <div style={{ marginTop: '20px' }}>{backButton}</div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="portal-page">
        <div className="mb-4">{backButton}</div>
        <div className="user-table-card">
          <div className="table-error-state" role="alert">
            <div className="table-error-state__icon">{ICONS.alertTriangle}</div>
            <div className="table-error-state__body">
              <h3>Không tải được hóa đơn</h3>
              <p>{error?.message}</p>
            </div>
            <button type="button" className="btn btn-secondary" onClick={() => void load()}>
              Thử lại
            </button>
          </div>
        </div>
      </div>
    );
  }

  const { invoice, lines, payments } = data;
  const status = invoice.status as PortalInvoiceStatus;
  const cancelled = invoice.status === 'CANCELLED';
  const total = Number(invoice.totalAmount) || 0;
  const paidPercent = total > 0 ? (Number(invoice.paidAmount) / total) * 100 : 0;

  return (
    <div className="portal-page" data-testid="portal-invoice-detail">
      <div className="mb-4">{backButton}</div>

      <div className="page-header">
        <div>
          <div className="page-header__kicker">
            <span className="page-header__tag">{ICONS.receipt} HÓA ĐƠN</span>
            <span className="page-header__dot" />
            <span className="page-header__meta">{invoice.contractCode ? `HỢP ĐỒNG ${invoice.contractCode}` : '—'}</span>
          </div>
          <h1 className="page-title" style={{ fontFamily: 'var(--font-mono, monospace)' }}>{invoice.invoiceCode}</h1>
          <p className="page-subtitle">
            Ngày hóa đơn {formatPortalDate(invoice.invoiceDate)} · Hạn thanh toán {formatPortalDate(invoice.dueDate)}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignSelf: 'flex-start' }}>
          <span className={`badge ${INVOICE_STATUS_TONE[status] ?? 'badge--gray'} portal-status-lg`} data-testid="portal-invoice-status">
            {PORTAL_INVOICE_STATUS_LABEL[status] ?? invoice.status}
          </span>
          {invoice.overdue && <span className="badge badge--red portal-status-lg">Quá hạn {invoice.daysOverdue} ngày</span>}
        </div>
      </div>

      {invoice.overdue ? (
        <div className="alert-box alert-box--danger alert-box--inline" data-testid="portal-invoice-overdue">
          <span className="alert-box__icon">{ICONS.alertTriangle}</span>
          <div className="alert-box__content">
            Hóa đơn đã quá hạn <strong>{invoice.daysOverdue} ngày</strong>, còn phải trả{' '}
            <strong>{formatPortalMoney(invoice.remainingAmount)}</strong>. Nếu đã thanh toán, vui lòng gửi chứng từ cho kế
            toán để được ghi nhận.
          </div>
        </div>
      ) : cancelled ? (
        <div className="alert-box alert-box--warning" data-testid="portal-invoice-cancelled">
          <span className="alert-box__icon">{ICONS.info}</span>
          <div className="alert-box__content">Hóa đơn đã bị hủy — không cần thanh toán.</div>
        </div>
      ) : null}

      <div className="user-table-card portal-overview">
        <div className="portal-overview__progress">
          <div className="portal-project-card__progress-head">
            <span>Đã thanh toán</span>
            <strong>{Math.round(paidPercent)}%</strong>
          </div>
          <PortalProgressBar percent={paidPercent} label="Tỷ lệ đã thanh toán" />
          <span className="portal-project-card__sub">
            {payments.length === 0 ? 'Chưa ghi nhận lần thanh toán nào' : `${payments.length} lần thanh toán đã ghi nhận`}
          </span>
        </div>
        <dl className="portal-overview__facts">
          <div>
            <dt>Tổng tiền</dt>
            <dd>{formatPortalMoney(invoice.totalAmount)}</dd>
          </div>
          <div>
            <dt>Đã trả</dt>
            <dd>{formatPortalMoney(invoice.paidAmount)}</dd>
          </div>
          <div>
            <dt>Còn phải trả</dt>
            <dd className={invoice.overdue ? 'text-danger' : ''} data-testid="portal-invoice-remaining">
              {formatPortalMoney(invoice.remainingAmount)}
            </dd>
          </div>
          <div>
            <dt>Hạn thanh toán</dt>
            <dd>{formatPortalDate(invoice.dueDate)}</dd>
          </div>
        </dl>
      </div>

      <div className="portal-two-col">
        <section className="user-table-card portal-section" data-testid="portal-invoice-lines">
          <div className="portal-section__head">
            <h2>
              <span className="icon-xs">{ICONS.clipboardList}</span> Nội dung hóa đơn
            </h2>
          </div>
          {lines.length === 0 ? (
            <p className="field-hint portal-section__empty">Hóa đơn không có dòng chi tiết.</p>
          ) : (
            <table className="user-data-table">
              <thead>
                <tr>
                  <th style={headStyle}>Diễn giải</th>
                  <th style={{ ...headStyle, textAlign: 'right' }}>Số tiền</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((l, idx) => (
                  <tr key={idx}>
                    <td style={{ overflowWrap: 'anywhere' }}>{l.description}</td>
                    <td className="portal-money-cell">{formatPortalMoney(l.amount)}</td>
                  </tr>
                ))}
                <tr className="portal-total-row">
                  <td>Tổng cộng</td>
                  <td className="portal-money-cell">{formatPortalMoney(invoice.totalAmount)}</td>
                </tr>
              </tbody>
            </table>
          )}
        </section>

        <section className="user-table-card portal-section" data-testid="portal-invoice-payments">
          <div className="portal-section__head">
            <h2>
              <span className="icon-xs">{ICONS.money}</span> Lịch sử thanh toán
            </h2>
          </div>
          {payments.length === 0 ? (
            <p className="field-hint portal-section__empty">Chưa ghi nhận lần thanh toán nào cho hóa đơn này.</p>
          ) : (
            <table className="user-data-table">
              <thead>
                <tr>
                  <th style={headStyle}>Ngày</th>
                  <th style={headStyle}>Hình thức</th>
                  <th style={{ ...headStyle, textAlign: 'right' }}>Số tiền</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p, idx) => (
                  <tr key={idx}>
                    <td>{formatPortalDate(p.paymentDate)}</td>
                    <td>{PORTAL_PAYMENT_METHOD_LABEL[p.method as PortalPaymentMethod] ?? p.method ?? '—'}</td>
                    <td className="portal-money-cell">{formatPortalMoney(p.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>

      <p className="field-hint portal-footnote">
        {ICONS.info} Số liệu thanh toán do kế toán ghi nhận. Lượt xem của bạn được ghi nhận trong nhật ký cổng khách hàng.
      </p>
    </div>
  );
}
