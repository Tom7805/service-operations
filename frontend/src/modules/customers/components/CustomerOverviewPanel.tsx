import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { fetchCustomerOverview, CustomerApiError } from '../api/customersApi';
import type {
  CustomerOverview,
  CustomerOverviewItem,
  CustomerOverviewSectionKey,
} from '../types/customerTypes';

interface CustomerOverviewPanelProps {
  customerId: number;
  customerName: string;
  currentUserRoles?: string[];
  /** Cho phép trang cha ghi một dòng vào luồng nhật ký hiển thị mỗi lần tải xong (đối chiếu Audit Log Backend - TC-03). */
  onLoaded?: (info: { at: string; itemCount: number }) => void;
  /** Bơm sẵn dữ liệu cho kiểm thử — khi có, panel bỏ qua lần gọi API khởi tạo. */
  initialOverview?: CustomerOverview;
}

type SectionMeta = {
  key: CustomerOverviewSectionKey;
  label: string;
  icon: string;
  emptyHint: string;
};

const SECTIONS: SectionMeta[] = [
  { key: 'opportunities', label: 'Cơ hội bán hàng', icon: '🎯', emptyHint: 'Chưa có cơ hội nào gắn với khách hàng này.' },
  { key: 'contracts', label: 'Hợp đồng', icon: '📄', emptyHint: 'Chưa có hợp đồng nào được ký với khách hàng này.' },
  { key: 'projects', label: 'Dự án', icon: '📁', emptyHint: 'Chưa có dự án nào được mở cho khách hàng này.' },
  { key: 'invoices', label: 'Hóa đơn', icon: '🧾', emptyHint: 'Chưa phát hành hóa đơn nào cho khách hàng này.' },
  { key: 'receivables', label: 'Công nợ phải thu', icon: '💰', emptyHint: 'Khách hàng này hiện không có công nợ phải thu.' },
];

const currencyFormatter = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0,
});

function formatAmount(value: number | null): string {
  if (value == null || Number.isNaN(value)) return '—';
  return currencyFormatter.format(value);
}

function formatDate(value: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function statusClass(status: string | null): string {
  const s = (status ?? '').toUpperCase();
  if (['WON', 'ACTIVE', 'PAID', 'DONE', 'COMPLETED', 'SIGNED', 'RUNNING'].some((k) => s.includes(k))) {
    return 'status-pill status-pill--active';
  }
  if (['LOST', 'CANCELLED', 'OVERDUE', 'CLOSED', 'REJECTED'].some((k) => s.includes(k))) {
    return 'status-pill status-pill--locked';
  }
  return 'status-pill';
}

export default function CustomerOverviewPanel({
  customerId,
  customerName,
  currentUserRoles = ['VT-04'],
  onLoaded,
  initialOverview,
}: CustomerOverviewPanelProps) {
  const [overview, setOverview] = useState<CustomerOverview | null>(initialOverview ?? null);
  const [isLoading, setIsLoading] = useState(!initialOverview);
  const [errorKind, setErrorKind] = useState<'none' | 'forbidden' | 'notFound' | 'generic'>('none');
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Giữ tham chiếu ổn định để callback của trang cha không làm effect chạy lại vô hạn.
  const onLoadedRef = useRef(onLoaded);
  onLoadedRef.current = onLoaded;

  const loadOverview = useCallback(async () => {
    setIsLoading(true);
    setErrorKind('none');
    setErrorMessage('');
    try {
      const data = await fetchCustomerOverview(customerId);
      setOverview(data);
      const count =
        data.opportunities.length +
        data.contracts.length +
        data.projects.length +
        data.invoices.length +
        data.receivables.length;
      onLoadedRef.current?.({ at: new Date().toLocaleString('vi-VN'), itemCount: count });
    } catch (err) {
      const status = err instanceof CustomerApiError ? err.statusCode : undefined;
      if (status === 403) {
        setErrorKind('forbidden');
      } else if (status === 404) {
        setErrorKind('notFound');
      } else {
        setErrorKind('generic');
        setErrorMessage(
          err instanceof CustomerApiError
            ? err.message
            : err instanceof Error
            ? err.message
            : 'Không thể tải hồ sơ tổng hợp của khách hàng từ máy chủ.'
        );
      }
    } finally {
      setIsLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    if (initialOverview) {
      setIsLoading(false);
      return;
    }
    loadOverview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadOverview]);

  // TC-01: gộp toàn bộ nhóm thành một dòng thời gian duy nhất, sắp theo ngày tăng dần.
  const timeline = useMemo(() => {
    if (!overview) return [];
    const rows: Array<{ section: SectionMeta; item: CustomerOverviewItem }> = [];
    SECTIONS.forEach((section) => {
      overview[section.key].forEach((item) => rows.push({ section, item }));
    });
    return rows.sort((a, b) => {
      const da = a.item.date ? new Date(a.item.date).getTime() : Number.POSITIVE_INFINITY;
      const db = b.item.date ? new Date(b.item.date).getTime() : Number.POSITIVE_INFINITY;
      return da - db;
    });
  }, [overview]);

  const totals = useMemo(() => {
    if (!overview) return null;
    const sum = (items: CustomerOverviewItem[]) =>
      items.reduce((acc, it) => acc + (it.amount ?? 0), 0);
    return {
      opportunities: overview.opportunities.length,
      contracts: overview.contracts.length,
      contractValue: sum(overview.contracts),
      projects: overview.projects.length,
      invoices: overview.invoices.length,
      receivableValue: sum(overview.receivables),
    };
  }, [overview]);

  const isEmpty =
    !!overview &&
    timeline.length === 0;

  // ----- Trạng thái tải -----
  if (isLoading) {
    return (
      <div className="user-table-card customer-summary-panel" data-testid="customer-summary-loading">
        <div className="table-loading-state">
          <div className="spinner-lg" />
          <p>Đang tải hồ sơ tổng hợp của khách hàng...</p>
        </div>
      </div>
    );
  }

  // ----- Trạng thái lỗi -----
  if (errorKind === 'forbidden') {
    return (
      <div className="user-table-card customer-summary-panel" data-testid="customer-summary-forbidden">
        <div className="table-error-state">
          <div className="table-error-state__icon">🔒</div>
          <div className="table-error-state__body">
            <h3>Bạn không có quyền xem hồ sơ tổng hợp của khách hàng này</h3>
            <p>
              Theo quy tắc phân quyền (<strong>QTN-01</strong>), chức năng này chỉ dành cho{' '}
              <strong>Nhân viên kinh doanh (VT-04)</strong> hoặc <strong>Quản lý dự án (VT-02)</strong>, và chỉ
              trong phạm vi dữ liệu được phân. Hệ thống đã ghi lại lần từ chối truy cập này.
            </p>
            <p className="cell-muted">Vai trò hiện tại: {currentUserRoles.join(', ') || '(không xác định)'}</p>
          </div>
        </div>
      </div>
    );
  }

  if (errorKind === 'notFound') {
    return (
      <div className="user-table-card customer-summary-panel" data-testid="customer-summary-notfound">
        <div className="table-empty-state">
          <div className="table-empty-state__icon">🔍</div>
          <h3>Không tìm thấy hồ sơ khách hàng</h3>
          <p>Hồ sơ khách hàng này có thể đã bị gộp hoặc xóa khỏi hệ thống.</p>
        </div>
      </div>
    );
  }

  if (errorKind === 'generic') {
    return (
      <div className="user-table-card customer-summary-panel" data-testid="customer-summary-error">
        <div className="table-error-state" role="alert">
          <div className="table-error-state__icon">⚠️</div>
          <div className="table-error-state__body">
            <h3>Không tải được hồ sơ tổng hợp</h3>
            <p>{errorMessage}</p>
          </div>
          <button type="button" className="btn btn-secondary" onClick={loadOverview}>
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  // ----- Thành công -----
  return (
    <div className="user-table-card customer-summary-panel" data-testid="customer-summary-panel">
      <div className="customer-summary-toolbar">
        <div>
          <h3 className="customer-summary-title">Hồ sơ tổng hợp — {customerName}</h3>
          <p className="customer-summary-subtitle">
            Toàn cảnh cơ hội, hợp đồng, dự án, hóa đơn và công nợ của khách hàng theo dòng thời gian.
          </p>
        </div>
        <button
          type="button"
          className="btn-icon-refresh"
          onClick={loadOverview}
          title="Tải lại hồ sơ tổng hợp từ máy chủ"
          data-testid="btn-reload-summary"
          aria-label="Tải lại hồ sơ tổng hợp"
        >
          🔄
        </button>
      </div>

      {/* Dải chỉ số nhanh */}
      {totals && (
        <div className="stats-grid customer-summary-stats">
          <div className="stat-card">
            <div className="stat-card__icon stat-card__icon--blue">🎯</div>
            <div>
              <span className="stat-card__label">Cơ hội bán hàng</span>
              <div className="stat-card__value">{totals.opportunities}</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-card__icon stat-card__icon--purple">📄</div>
            <div>
              <span className="stat-card__label">Hợp đồng · Tổng giá trị</span>
              <div className="stat-card__value" style={{ fontSize: '15px' }}>
                {totals.contracts} · {formatAmount(totals.contractValue)}
              </div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-card__icon stat-card__icon--green">📁</div>
            <div>
              <span className="stat-card__label">Dự án</span>
              <div className="stat-card__value">{totals.projects}</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-card__icon stat-card__icon--blue">🧾</div>
            <div>
              <span className="stat-card__label">Hóa đơn</span>
              <div className="stat-card__value">{totals.invoices}</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-card__icon stat-card__icon--red">💰</div>
            <div>
              <span className="stat-card__label">Công nợ phải thu</span>
              <div className="stat-card__value text-warning" style={{ fontSize: '15px' }}>
                {formatAmount(totals.receivableValue)}
              </div>
            </div>
          </div>
        </div>
      )}

      {isEmpty ? (
        <div className="table-empty-state" data-testid="customer-summary-empty" style={{ marginTop: '8px' }}>
          <div className="table-empty-state__icon">🗂️</div>
          <h3>Chưa phát sinh dữ liệu hợp tác</h3>
          <p>
            Khách hàng này chưa có cơ hội, hợp đồng, dự án, hóa đơn hay công nợ nào trong phạm vi bạn được xem.
            Bảng tổng hợp sẽ tự cập nhật khi các nghiệp vụ liên quan được tạo.
          </p>
        </div>
      ) : (
        <>
          {/* Dòng thời gian hợp nhất (TC-01) */}
          <div className="customer-summary-section">
            <h4 className="customer-summary-section__title">🕒 Dòng thời gian hợp tác</h4>
            <ol className="customer-timeline" data-testid="customer-summary-timeline">
              {timeline.map(({ section, item }) => (
                <li key={`${section.key}-${item.id}`} className="customer-timeline__item">
                  <span className="customer-timeline__date">{formatDate(item.date)}</span>
                  <span className={`customer-timeline__tag customer-timeline__tag--${section.key}`}>
                    {section.icon} {section.label}
                  </span>
                  <span className="customer-timeline__name">
                    {item.name || '(không có tên)'}
                    {item.code && <span className="customer-timeline__code"> · {item.code}</span>}
                  </span>
                  {item.status && <span className={statusClass(item.status)}>{item.status}</span>}
                  <span className="customer-timeline__amount">{formatAmount(item.amount)}</span>
                </li>
              ))}
            </ol>
          </div>

          {/* Từng nhóm chi tiết */}
          {SECTIONS.map((section) => {
            const items = overview![section.key];
            return (
              <div
                key={section.key}
                className="customer-summary-section"
                data-testid={`customer-summary-section-${section.key}`}
              >
                <h4 className="customer-summary-section__title">
                  {section.icon} {section.label} <span className="cell-muted">({items.length})</span>
                </h4>
                {items.length === 0 ? (
                  <p className="customer-summary-section__empty cell-muted">{section.emptyHint}</p>
                ) : (
                  <div className="table-responsive">
                    <table className="user-data-table">
                      <thead>
                        <tr>
                          <th style={{ width: '120px' }}>Ngày</th>
                          <th style={{ width: '140px' }}>Mã</th>
                          <th>Tên</th>
                          <th style={{ width: '140px' }}>Trạng thái</th>
                          <th style={{ width: '160px', textAlign: 'right' }}>Giá trị</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((item) => (
                          <tr key={item.id}>
                            <td>{formatDate(item.date)}</td>
                            <td>{item.code || '—'}</td>
                            <td>{item.name || '—'}</td>
                            <td>
                              {item.status ? (
                                <span className={statusClass(item.status)}>{item.status}</span>
                              ) : (
                                <span className="cell-muted">—</span>
                              )}
                            </td>
                            <td style={{ textAlign: 'right' }}>{formatAmount(item.amount)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </>
      )}

      <p className="customer-summary-scope-note cell-muted">
        ℹ️ Dữ liệu hiển thị nằm trong phạm vi truy cập của bạn theo vai trò và nhánh tổ chức được phân (QTN-01).
        Mỗi lần mở hồ sơ tổng hợp đều được hệ thống ghi vào nhật ký (người thực hiện · nội dung · thời điểm).
      </p>
    </div>
  );
}
