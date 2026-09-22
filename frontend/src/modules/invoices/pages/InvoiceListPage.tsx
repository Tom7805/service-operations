import { useEffect, useState } from 'react';
import { ICONS } from '../../../components/common/icons';
import { roleLabels } from '../../../utils/roleLabel';
import type { InvoiceDetailRes, InvoiceStatus, PaymentItemRes } from '../types/invoiceTypes';
import { fetchInvoices, getInvoice, InvoicesApiError } from '../api/invoicesApi';
import { fetchPayments, PaymentsApiError } from '../api/paymentsApi';
import PaymentFormModal from '../components/PaymentFormModal';

interface Props {
  currentUserRoles?: string[];
  currentUserName?: string;
}

const STATUS_LABEL: Record<InvoiceStatus, string> = {
  DRAFT: 'Bản nháp',
  ISSUED: 'Đã phát hành',
  PARTIALLY_PAID: 'Thanh toán một phần',
  PAID: 'Đã thanh toán đủ',
  CANCELLED: 'Đã hủy',
};

const STATUS_BADGE_CLASS: Record<InvoiceStatus, string> = {
  DRAFT: 'badge--gray',
  ISSUED: 'badge--blue',
  PARTIALLY_PAID: 'badge--gold',
  PAID: 'badge--green',
  CANCELLED: 'badge--red',
};

const METHOD_LABEL: Record<string, string> = {
  BANK_TRANSFER: 'Chuyển khoản',
  CASH: 'Tiền mặt',
  OTHER: 'Khác',
};

const FILTERS: Array<{ key: 'ALL' | InvoiceStatus; label: string }> = [
  { key: 'ALL', label: 'Tất cả' },
  { key: 'ISSUED', label: 'Đã phát hành' },
  { key: 'PARTIALLY_PAID', label: 'Thanh toán một phần' },
  { key: 'PAID', label: 'Đã thanh toán đủ' },
];

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
 * NCL-10-CN-003 — Ghi nhận thanh toán của khách hàng: Kế toán chọn một hóa đơn đã
 * phát hành (ISSUED/PARTIALLY_PAID) còn số dư, ghi nhận một khoản đã thanh toán;
 * backend tự cập nhật số đã thu/còn lại và trạng thái hóa đơn (PARTIALLY_PAID/PAID).
 * Trang này gộp danh sách hóa đơn + chi tiết + lịch sử thanh toán trên cùng một màn,
 * chuyển bằng "Xem chi tiết" / "Quay lại danh sách" thay vì điều hướng route riêng.
 */
export default function InvoiceListPage({ currentUserRoles = [], currentUserName = 'Người dùng' }: Props) {
  const isAllowed = currentUserRoles.includes('VT-05');

  const [filter, setFilter] = useState<'ALL' | InvoiceStatus>('ALL');
  const [invoices, setInvoices] = useState<InvoiceDetailRes[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);

  const [selected, setSelected] = useState<InvoiceDetailRes | null>(null);
  const [payments, setPayments] = useState<PaymentItemRes[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [paymentsError, setPaymentsError] = useState<string | null>(null);
  const [isPaymentModalOpen, setPaymentModalOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const loadInvoices = () => {
    if (!isAllowed) return;
    setListLoading(true);
    setListError(null);
    fetchInvoices(filter === 'ALL' ? undefined : [filter])
      .then(setInvoices)
      .catch((err) => {
        setListError(err instanceof InvoicesApiError ? err.message : 'Không tải được danh sách hóa đơn.');
      })
      .finally(() => setListLoading(false));
  };

  useEffect(() => {
    loadInvoices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAllowed, filter]);

  const openDetail = (invoiceId: number) => {
    setPaymentsError(null);
    setSelected(null);
    getInvoice(invoiceId)
      .then((invoice) => {
        setSelected(invoice);
        loadPayments(invoiceId);
      })
      .catch((err) => {
        setListError(err instanceof InvoicesApiError ? err.message : 'Không tải được chi tiết hóa đơn.');
      });
  };

  const loadPayments = (invoiceId: number) => {
    setPaymentsLoading(true);
    setPaymentsError(null);
    fetchPayments(invoiceId)
      .then(setPayments)
      .catch((err) => {
        setPaymentsError(err instanceof PaymentsApiError ? err.message : 'Không tải được lịch sử thanh toán.');
      })
      .finally(() => setPaymentsLoading(false));
  };

  if (!isAllowed) {
    return (
      <div className="access-denied-container" data-testid="invoice-list-access-denied">
        <div className="access-denied-card">
          <div className="access-denied-icon">{ICONS.shieldOff}</div>
          <h2>Bạn không có thẩm quyền xem hóa đơn</h2>
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

  if (selected) {
    return (
      <div className="user-management-page">
        {toast && (
          <div className="alert-box alert-box--success" role="status" style={{ marginBottom: '14px' }}>
            <span className="icon-xs">{ICONS.checkCircle}</span> {toast}
          </div>
        )}

        <div className="page-header">
          <div>
            <button
              type="button"
              className="btn"
              onClick={() => {
                setSelected(null);
                setPayments([]);
              }}
              style={{ marginBottom: '10px' }}
            >
              {ICONS.arrowLeft} Quay lại danh sách
            </button>
            <h1 className="page-title">{selected.invoiceCode}</h1>
            <p className="page-subtitle">
              {selected.customerName ?? `Khách hàng #${selected.customerId}`} · Hợp đồng{' '}
              {selected.contractCode ?? `#${selected.contractId}`}
            </p>
          </div>
          {(selected.status === 'ISSUED' || selected.status === 'PARTIALLY_PAID') && (
            <button type="button" className="btn-primary" onClick={() => setPaymentModalOpen(true)}>
              <span className="icon-xs">{ICONS.money}</span> Ghi nhận thanh toán
            </button>
          )}
        </div>

        <div className="user-table-card" style={{ padding: '20px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '12px' }}>
            <span className={`badge ${STATUS_BADGE_CLASS[selected.status]}`}>{STATUS_LABEL[selected.status]}</span>
            <span className="cell-muted">Ngày hóa đơn: {formatDate(selected.invoiceDate)}</span>
          </div>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-card__icon stat-card__icon--purple">{ICONS.money}</div>
              <div>
                <span className="stat-card__label">Giá trị hóa đơn</span>
                <div className="stat-card__value">{formatAmount(selected.totalAmount)}</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-card__icon stat-card__icon--green">{ICONS.checkCircle}</div>
              <div>
                <span className="stat-card__label">Đã thu</span>
                <div className="stat-card__value">{formatAmount(selected.paidAmount)}</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-card__icon stat-card__icon--amber">{ICONS.receipt}</div>
              <div>
                <span className="stat-card__label">Còn phải thu</span>
                <div className="stat-card__value">{formatAmount(selected.remainingAmount)}</div>
              </div>
            </div>
          </div>
          {selected.note && <p className="cell-muted" style={{ marginTop: '12px' }}>Ghi chú: {selected.note}</p>}
        </div>

        <div className="user-table-card" style={{ padding: '20px' }}>
          <h3 style={{ margin: '0 0 12px', fontSize: '15px', fontWeight: 600 }}>Lịch sử thanh toán</h3>
          {paymentsError && <div className="alert-box alert-box--danger">{paymentsError}</div>}
          {paymentsLoading ? (
            <p className="cell-muted">Đang tải lịch sử thanh toán...</p>
          ) : payments.length === 0 ? (
            <p className="cell-muted" data-testid="payment-history-empty">Chưa có khoản thanh toán nào.</p>
          ) : (
            <div className="table-responsive">
              <table className="user-data-table" data-testid="payment-history-table">
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
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatAmount(p.amount)}</td>
                      <td>{METHOD_LABEL[p.method] ?? p.method}</td>
                      <td>{p.note || '—'}</td>
                      <td>{p.createdBy ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {isPaymentModalOpen && (
          <PaymentFormModal
            isOpen={isPaymentModalOpen}
            onClose={() => setPaymentModalOpen(false)}
            invoice={selected}
            currentUserRoles={currentUserRoles}
            onSaved={(payment) => {
              setSelected({
                ...selected,
                paidAmount: payment.paidAmount,
                remainingAmount: payment.remainingAmount,
                status: payment.invoiceStatus,
              });
              loadPayments(selected.id);
              setToast(`Đã ghi nhận thanh toán ${formatAmount(payment.amount)} cho hóa đơn ${selected.invoiceCode}.`);
              window.setTimeout(() => setToast(null), 4500);
            }}
          />
        )}
      </div>
    );
  }

  return (
    <div className="user-management-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Hóa đơn</h1>
          <p className="page-subtitle">Danh sách hóa đơn kèm số đã thu/còn lại — chọn một hóa đơn để ghi nhận thanh toán.</p>
        </div>
      </div>

      <div className="user-table-toolbar" style={{ padding: '0 0 16px' }}>
        <div className="status-tabs" role="tablist" aria-label="Lọc theo trạng thái hóa đơn">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              role="tab"
              aria-selected={filter === f.key}
              className={`status-tab ${filter === f.key ? 'status-tab--active' : ''}`}
              onClick={() => setFilter(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="user-table-card">
        {listError && <div className="alert-box alert-box--danger" style={{ margin: '16px' }}>{listError}</div>}
        {listLoading ? (
          <p className="cell-muted" style={{ padding: '16px' }}>Đang tải danh sách hóa đơn...</p>
        ) : invoices.length === 0 ? (
          <p className="cell-muted" style={{ padding: '16px' }} data-testid="invoice-list-empty">
            Không có hóa đơn nào phù hợp.
          </p>
        ) : (
          <div className="table-responsive">
            <table className="user-data-table" data-testid="invoice-list-table">
              <thead>
                <tr>
                  <th>Mã hóa đơn</th>
                  <th>Khách hàng</th>
                  <th style={{ textAlign: 'right' }}>Giá trị</th>
                  <th style={{ textAlign: 'right' }}>Còn phải thu</th>
                  <th>Trạng thái</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id}>
                    <td>{inv.invoiceCode}</td>
                    <td>{inv.customerName ?? `#${inv.customerId}`}</td>
                    <td style={{ textAlign: 'right' }}>{formatAmount(inv.totalAmount)}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatAmount(inv.remainingAmount)}</td>
                    <td>
                      <span className={`badge ${STATUS_BADGE_CLASS[inv.status]}`}>{STATUS_LABEL[inv.status]}</span>
                    </td>
                    <td>
                      <button type="button" className="btn" onClick={() => openDetail(inv.id)}>
                        Xem chi tiết
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
