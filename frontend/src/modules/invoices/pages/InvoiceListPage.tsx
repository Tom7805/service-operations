import { useCallback, useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { ICONS } from '../../../components/common/icons';
import RowActionsMenu, { type RowAction } from '../../../components/common/RowActionsMenu';
import { roleLabels } from '../../../utils/roleLabel';
import type { InvoiceDetailRes, InvoiceStatus } from '../types/invoiceTypes';
import { fetchInvoices, InvoicesApiError } from '../api/invoicesApi';

interface Props {
  currentUserRoles?: string[];
  currentUserName?: string;
  onOpenInvoice: (invoiceId: number) => void;
  initialInvoices?: InvoiceDetailRes[];
}

const STATUS_META: Record<InvoiceStatus, { label: string; badge: string }> = {
  DRAFT: { label: 'Nháp', badge: 'badge--gray' },
  ISSUED: { label: 'Đã xuất', badge: 'badge--blue' },
  PARTIALLY_PAID: { label: 'Thanh toán một phần', badge: 'badge--gold' },
  PAID: { label: 'Đã thanh toán', badge: 'badge--green' },
  CANCELLED: { label: 'Đã hủy', badge: 'badge--red' },
};

const STATUS_FILTERS: Array<{ value: string; label: string }> = [
  { value: 'ALL', label: 'Tất cả trạng thái' },
  { value: 'DRAFT', label: 'Nháp' },
  { value: 'ISSUED', label: 'Đã xuất' },
  { value: 'PARTIALLY_PAID', label: 'Thanh toán một phần' },
  { value: 'PAID', label: 'Đã thanh toán' },
  { value: 'CANCELLED', label: 'Đã hủy' },
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
 * NCL-10-CN-002/003 — Danh sách hóa đơn dành cho Kế toán (VT-05). Hóa đơn chỉ được
 * sinh ra từ mốc thanh toán hợp đồng (ContractMilestonesModal), đề xuất hóa đơn
 * (InvoiceProposalPage) hoặc lịch định kỳ (RecurringInvoicePage) — trang này không
 * có nút "Tạo hóa đơn" tay vì backend không có endpoint tạo hóa đơn tự do.
 */
export default function InvoiceListPage({
  currentUserRoles = [],
  currentUserName = 'Người dùng',
  onOpenInvoice,
  initialInvoices,
}: Props) {
  const isAllowed = currentUserRoles.includes('VT-05');

  const [invoices, setInvoices] = useState<InvoiceDetailRes[]>(initialInvoices ?? []);
  const [isLoading, setIsLoading] = useState(!initialInvoices);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const loadInvoices = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const data = await fetchInvoices();
      setInvoices(data);
    } catch (err) {
      if (err instanceof InvoicesApiError && err.statusCode === 403) {
        setInvoices([]);
      } else {
        setLoadError(
          err instanceof InvoicesApiError ? err.message : 'Không tải được danh sách hóa đơn. Vui lòng thử lại.'
        );
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (initialInvoices || !isAllowed) {
      setIsLoading(false);
      return;
    }
    void loadInvoices();
  }, [initialInvoices, isAllowed, loadInvoices]);

  const rowActions = (inv: InvoiceDetailRes): RowAction[] => [
    {
      key: 'view',
      label: 'Xem chi tiết',
      icon: ICONS.eye,
      onClick: () => onOpenInvoice(inv.id),
      testId: `invoice-action-view-${inv.id}`,
    },
  ];

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return invoices.filter((inv) => {
      const matchSearch =
        !q ||
        inv.invoiceCode.toLowerCase().includes(q) ||
        (inv.contractCode ?? '').toLowerCase().includes(q) ||
        (inv.customerName ?? '').toLowerCase().includes(q);
      const matchStatus = statusFilter === 'ALL' || inv.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [invoices, searchTerm, statusFilter]);

  const stats = useMemo(
    () => ({
      total: invoices.length,
      unpaid: invoices.filter((i) => i.status === 'ISSUED' || i.status === 'PARTIALLY_PAID').length,
      paid: invoices.filter((i) => i.status === 'PAID').length,
      remainingTotal: invoices.reduce((sum, i) => sum + (i.remainingAmount ?? 0), 0),
    }),
    [invoices]
  );

  if (!isAllowed) {
    return (
      <div className="access-denied-container" data-testid="invoice-access-denied">
        <div className="access-denied-card">
          <div className="access-denied-icon">{ICONS.shieldOff}</div>
          <h2>Bạn không có thẩm quyền quản lý hóa đơn</h2>
          <p>
            Theo quy tắc phân quyền, toàn bộ nghiệp vụ hóa đơn (lập hóa đơn, ghi nhận thanh toán,
            đề xuất hóa đơn, hóa đơn định kỳ, nhắc thu nợ) chỉ dành riêng cho <strong>Kế toán</strong> (VT-05).
            Hệ thống đã ghi lại lần từ chối truy cập này vào nhật ký bảo mật (Audit Log).
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
      <p className="page-subtitle" style={{ marginBottom: '16px' }}>
        Toàn bộ hóa đơn đã lập từ mốc thanh toán hợp đồng, đề xuất hóa đơn hoặc lịch định kỳ.
      </p>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-card__icon stat-card__icon--purple">{ICONS.receipt}</div>
          <div>
            <span className="stat-card__label">Tổng hóa đơn</span>
            <div className="stat-card__value">{stats.total}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card__icon stat-card__icon--amber">{ICONS.clock}</div>
          <div>
            <span className="stat-card__label">Chưa thu đủ</span>
            <div className="stat-card__value">{stats.unpaid}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card__icon stat-card__icon--green">{ICONS.checkCircle}</div>
          <div>
            <span className="stat-card__label">Đã thanh toán</span>
            <div className="stat-card__value">{stats.paid}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card__icon stat-card__icon--blue">{ICONS.money}</div>
          <div>
            <span className="stat-card__label">Tổng còn phải thu</span>
            <div className="stat-card__value">{formatAmount(stats.remainingTotal)}</div>
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
              placeholder="Tìm theo mã hóa đơn, mã hợp đồng hoặc tên khách hàng..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              aria-label="Tìm kiếm hóa đơn"
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
            <div className="filter-group">
              <label htmlFor="invoice-status-filter" className="filter-label">Trạng thái:</label>
              <select
                id="invoice-status-filter"
                className="filter-select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                {STATUS_FILTERS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <button
              type="button"
              className="btn-icon-refresh"
              onClick={() => void loadInvoices()}
              title="Tải lại danh sách hóa đơn"
              aria-label="Tải lại danh sách hóa đơn"
            >
              {ICONS.refresh}
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="table-loading-state">
            <div className="spinner-lg" />
            <p>Đang tải danh sách hóa đơn...</p>
          </div>
        ) : loadError ? (
          <div className="table-error-state" role="alert">
            <div className="table-error-state__icon">{ICONS.alertTriangle}</div>
            <div className="table-error-state__body">
              <h3>Không tải được danh sách hóa đơn</h3>
              <p>{loadError}</p>
            </div>
            <button type="button" className="btn btn-secondary" onClick={() => void loadInvoices()}>
              Thử lại
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="table-empty-state" data-testid="invoice-empty">
            <div className="table-empty-state__icon">{ICONS.receipt}</div>
            <h3>{invoices.length === 0 ? 'Chưa có hóa đơn nào' : 'Không có hóa đơn khớp bộ lọc'}</h3>
            <p>
              {invoices.length === 0
                ? 'Lập hóa đơn từ mốc thanh toán hợp đồng (trang Hợp đồng), đề xuất hóa đơn hoặc lịch định kỳ để bắt đầu.'
                : 'Thử đổi từ khóa tìm kiếm hoặc bộ lọc trạng thái.'}
            </p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="user-data-table" data-testid="invoice-table">
              <thead>
                <tr>
                  <th style={headStyle}>Mã hóa đơn</th>
                  <th style={headStyle}>Hợp đồng</th>
                  <th style={headStyle}>Khách hàng</th>
                  <th style={{ ...headStyle, textAlign: 'right' }}>Tổng tiền</th>
                  <th style={{ ...headStyle, textAlign: 'right' }}>Đã thu</th>
                  <th style={{ ...headStyle, textAlign: 'right' }}>Còn lại</th>
                  <th style={headStyle}>Hạn thanh toán</th>
                  <th style={headStyle}>Trạng thái</th>
                  <th style={{ ...headStyle, textAlign: 'right' }}>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((inv) => {
                  const status = STATUS_META[inv.status] ?? { label: inv.status, badge: 'badge--gray' };
                  return (
                    <tr key={inv.id}>
                      <td style={{ fontFamily: 'var(--font-mono, monospace)', fontWeight: 600 }}>
                        {inv.invoiceCode}
                      </td>
                      <td>{inv.contractCode || '—'}</td>
                      <td>{inv.customerName || '—'}</td>
                      <td style={{ textAlign: 'right' }}>{formatAmount(inv.totalAmount)}</td>
                      <td style={{ textAlign: 'right' }}>{formatAmount(inv.paidAmount)}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatAmount(inv.remainingAmount)}</td>
                      <td className="cell-muted">{formatDate(inv.dueDate)}</td>
                      <td>
                        <span className={`badge ${status.badge}`}>{status.label}</span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <RowActionsMenu
                          ariaLabel={`Thao tác hóa đơn ${inv.invoiceCode}`}
                          actions={rowActions(inv)}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
