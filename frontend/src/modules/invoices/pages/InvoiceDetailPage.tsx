import { useCallback, useEffect, useState } from 'react';
import { ICONS } from '../../../components/common/icons';
import { roleLabels } from '../../../utils/roleLabel';
import type { DunningLogRes, InvoiceDetailRes, InvoiceStatus, PaymentItemRes } from '../types/invoiceTypes';
import { fetchDunningLogs, getInvoice, InvoicesApiError } from '../api/invoicesApi';
import { fetchPayments, PaymentsApiError } from '../api/paymentsApi';
import PaymentFormModal from '../components/PaymentFormModal';

interface Props {
  invoiceId: number;
  onBack: () => void;
  currentUserRoles?: string[];
  currentUserName?: string;
}

const STATUS_META: Record<InvoiceStatus, { label: string; badge: string }> = {
  DRAFT: { label: 'Nháp', badge: 'badge--gray' },
  ISSUED: { label: 'Đã xuất', badge: 'badge--blue' },
  PARTIALLY_PAID: { label: 'Thanh toán một phần', badge: 'badge--gold' },
  PAID: { label: 'Đã thanh toán', badge: 'badge--green' },
  CANCELLED: { label: 'Đã hủy', badge: 'badge--red' },
};

const METHOD_LABEL: Record<string, string> = {
  BANK_TRANSFER: 'Chuyển khoản',
  CASH: 'Tiền mặt',
  OTHER: 'Khác',
};

const DUNNING_STAGE_LABEL: Record<string, string> = {
  UPCOMING_3_DAYS: 'Nhắc trước hạn 3 ngày',
  DUE_TODAY: 'Đến hạn hôm nay',
  OVERDUE: 'Quá hạn',
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

function formatDateTime(value?: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleString('vi-VN');
}

/**
 * NCL-10-CN-003/006 — Chi tiết một hóa đơn: thông tin chung, lịch sử thanh toán
 * (ghi nhận mới qua PaymentFormModal) và lịch sử nhắc thu nợ (chỉ đọc — việc CHẠY
 * nhắc nợ là job nền/RecurringInvoicePage's sibling `POST /dunning/run`, không có
 * nút chạy tay ở đây vì đây là trang xem MỘT hóa đơn, không phải toàn bộ công nợ).
 */
export default function InvoiceDetailPage({ invoiceId, onBack, currentUserRoles = [], currentUserName = 'Người dùng' }: Props) {
  const isAllowed = currentUserRoles.includes('VT-05');

  const [invoice, setInvoice] = useState<InvoiceDetailRes | null>(null);
  const [payments, setPayments] = useState<PaymentItemRes[]>([]);
  const [dunningLogs, setDunningLogs] = useState<DunningLogRes[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const [inv, pays, logs] = await Promise.all([
        getInvoice(invoiceId),
        fetchPayments(invoiceId),
        fetchDunningLogs(invoiceId),
      ]);
      setInvoice(inv);
      setPayments(pays);
      setDunningLogs(logs);
    } catch (err) {
      setLoadError(
        err instanceof InvoicesApiError || err instanceof PaymentsApiError
          ? err.message
          : 'Không tải được thông tin hóa đơn. Vui lòng thử lại.'
      );
    } finally {
      setIsLoading(false);
    }
  }, [invoiceId]);

  useEffect(() => {
    if (!isAllowed) {
      setIsLoading(false);
      return;
    }
    void load();
  }, [isAllowed, load]);

  if (!isAllowed) {
    return (
      <div className="access-denied-container" data-testid="invoice-detail-access-denied">
        <div className="access-denied-card">
          <div className="access-denied-icon">{ICONS.shieldOff}</div>
          <h2>Bạn không có thẩm quyền xem chi tiết hóa đơn</h2>
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
      {toast && (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: 'fixed', top: '20px', right: '24px', zIndex: 1050,
            padding: '12px 20px', background: 'var(--pale-green-bg)', color: 'var(--pale-green-fg)',
            border: '1px solid rgba(52, 101, 56, 0.25)', borderRadius: 'var(--radius-md)',
            display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', fontWeight: 500,
          }}
        >
          <span>{ICONS.checkCircle}</span>
          <span>{toast}</span>
        </div>
      )}

      <div className="page-header">
        <div>
          <button type="button" className="btn-icon-refresh" onClick={onBack} aria-label="Quay lại danh sách hóa đơn" style={{ marginBottom: '8px' }}>
            {ICONS.arrowLeft}
          </button>
          <h1 className="page-title">{invoice ? invoice.invoiceCode : 'Chi tiết hóa đơn'}</h1>
          {invoice && (
            <p className="page-subtitle">
              {invoice.contractCode || '—'} · {invoice.customerName || '—'}
            </p>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="table-loading-state">
          <div className="spinner-lg" />
          <p>Đang tải chi tiết hóa đơn...</p>
        </div>
      ) : loadError ? (
        <div className="table-error-state" role="alert">
          <div className="table-error-state__icon">{ICONS.alertTriangle}</div>
          <div className="table-error-state__body">
            <h3>Không tải được chi tiết hóa đơn</h3>
            <p>{loadError}</p>
          </div>
          <button type="button" className="btn btn-secondary" onClick={() => void load()}>Thử lại</button>
        </div>
      ) : invoice ? (
        <>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-card__icon stat-card__icon--purple">{ICONS.receipt}</div>
              <div>
                <span className="stat-card__label">Tổng tiền</span>
                <div className="stat-card__value">{formatAmount(invoice.totalAmount)}</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-card__icon stat-card__icon--green">{ICONS.checkCircle}</div>
              <div>
                <span className="stat-card__label">Đã thu</span>
                <div className="stat-card__value">{formatAmount(invoice.paidAmount)}</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-card__icon stat-card__icon--amber">{ICONS.money}</div>
              <div>
                <span className="stat-card__label">Còn lại</span>
                <div className="stat-card__value">{formatAmount(invoice.remainingAmount)}</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-card__icon stat-card__icon--blue">{ICONS.clock}</div>
              <div>
                <span className="stat-card__label">Hạn thanh toán</span>
                <div className="stat-card__value" style={{ fontSize: '18px' }}>{formatDate(invoice.dueDate)}</div>
              </div>
            </div>
          </div>

          <div className="user-table-card" style={{ padding: '20px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <span className={`badge ${STATUS_META[invoice.status]?.badge ?? 'badge--gray'}`}>
                  {STATUS_META[invoice.status]?.label ?? invoice.status}
                </span>
                {invoice.note && <p className="field-hint" style={{ marginTop: '8px' }}>{invoice.note}</p>}
              </div>
              {invoice.status !== 'PAID' && invoice.status !== 'CANCELLED' && (
                <button type="button" className="btn btn-primary" onClick={() => setIsPaymentOpen(true)}>
                  <span className="icon-xs">{ICONS.money}</span> Ghi nhận thanh toán
                </button>
              )}
            </div>
          </div>

          <div className="user-table-card" style={{ marginBottom: '16px' }}>
            <div className="page-header" style={{ padding: '16px 16px 0' }}>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600 }}>Lịch sử thanh toán</h3>
            </div>
            {payments.length === 0 ? (
              <div className="table-empty-state" data-testid="payment-empty">
                <div className="table-empty-state__icon">{ICONS.money}</div>
                <h3>Chưa ghi nhận khoản thanh toán nào</h3>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="user-data-table">
                  <thead>
                    <tr>
                      <th>Ngày thanh toán</th>
                      <th style={{ textAlign: 'right' }}>Số tiền</th>
                      <th>Phương thức</th>
                      <th>Ghi chú</th>
                      <th>Người ghi nhận</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((p) => (
                      <tr key={p.id}>
                        <td>{formatDate(p.paymentDate)}</td>
                        <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono, monospace)' }}>{formatAmount(p.amount)}</td>
                        <td>{METHOD_LABEL[p.method] ?? p.method}</td>
                        <td className="cell-muted">{p.note || '—'}</td>
                        <td className="cell-muted">{p.createdBy || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="user-table-card">
            <div className="page-header" style={{ padding: '16px 16px 0' }}>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600 }}>Lịch sử nhắc thu nợ</h3>
            </div>
            {dunningLogs.length === 0 ? (
              <div className="table-empty-state" data-testid="dunning-empty">
                <div className="table-empty-state__icon">{ICONS.bell}</div>
                <h3>Chưa có nhắc thu nợ nào cho hóa đơn này</h3>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="user-data-table">
                  <thead>
                    <tr>
                      <th>Thời điểm gửi</th>
                      <th>Mức nhắc</th>
                      <th style={{ textAlign: 'right' }}>Số ngày quá hạn</th>
                      <th style={{ textAlign: 'right' }}>Còn lại lúc gửi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dunningLogs.map((log) => (
                      <tr key={log.id}>
                        <td>{formatDateTime(log.sentAt)}</td>
                        <td>{DUNNING_STAGE_LABEL[log.stage] ?? log.stage}</td>
                        <td style={{ textAlign: 'right' }}>{log.daysOverdue}</td>
                        <td style={{ textAlign: 'right' }}>{formatAmount(log.remainingAmount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <PaymentFormModal
            isOpen={isPaymentOpen}
            onClose={() => setIsPaymentOpen(false)}
            invoice={invoice}
            currentUserRoles={currentUserRoles}
            onSaved={(payment) => {
              setInvoice((prev) =>
                prev
                  ? { ...prev, paidAmount: payment.paidAmount, remainingAmount: payment.remainingAmount, status: payment.invoiceStatus }
                  : prev
              );
              setPayments((prev) => [
                { id: payment.id, amount: payment.amount, paymentDate: payment.paymentDate, method: payment.method, note: payment.note, createdBy: payment.createdBy, createdAt: payment.createdAt },
                ...prev,
              ]);
              setIsPaymentOpen(false);
              setToast(`Đã ghi nhận thanh toán ${formatAmount(payment.amount)}.`);
              window.setTimeout(() => setToast(null), 4500);
            }}
          />
        </>
      ) : null}
    </div>
  );
}
