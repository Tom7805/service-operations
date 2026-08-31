import { useState } from 'react';
import type { Customer, CustomerContact, ContactAuditItem } from '../types/customerTypes';
import ContactList from '../components/ContactList';
import CustomerOverviewPanel from '../components/CustomerOverviewPanel';
import CustomerSegmentPanel from '../components/CustomerSegmentPanel';
import { ICONS } from '../../../components/common/icons';

type CustomerDetailTab = 'CONTACTS' | 'SEGMENT' | 'SUMMARY' | 'OVERVIEW' | 'AUDIT';

interface CustomerDetailPageProps {
  customer?: Customer;
  customerId?: number;
  currentUserRoles?: string[];
  currentUserName?: string;
  onBack: () => void;
  initialContacts?: CustomerContact[];
  onCustomerUpdated?: (updated: Customer) => void;
  // NCL-02-CN-005: cho phép mở thẳng tab "Phân nhóm" từ nút thao tác nhanh ở danh sách.
  initialTab?: CustomerDetailTab;
}

export default function CustomerDetailPage({
  customer: propCustomer,
  customerId: propCustomerId,
  currentUserRoles = ['VT-04'],
  currentUserName = 'Người dùng',
  onBack,
  initialContacts,
  onCustomerUpdated,
  initialTab = 'CONTACTS',
}: CustomerDetailPageProps) {
  const [customer, setCustomer] = useState<Customer>(
    propCustomer || {
      id: propCustomerId || 1,
      code: 'KH-000001',
      name: 'Công ty Cổ phần Công nghệ ABC',
      taxCode: '0101234567',
      phone: '0243 123 4567',
      industry: 'Công nghệ thông tin & Viễn thông',
      address: 'Tầng 8, Tòa nhà Landmark 72, Nam Từ Liêm, Hà Nội',
      createdAt: '2026-08-27T08:30:00',
    }
  );

  const [activeTab, setActiveTab] = useState<CustomerDetailTab>(initialTab);
  const [auditLogs, setAuditLogs] = useState<ContactAuditItem[]>([]);
  const [copiedCode, setCopiedCode] = useState(false);

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code).then(() => {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    });
  };

  const handleAuditLogged = (log: ContactAuditItem) => {
    setAuditLogs((prev) => [log, ...prev]);
  };

  // NCL-02-CN-005 (TC-01): đồng bộ nhãn phân nhóm mới nhất vào hồ sơ chi tiết và trả về danh sách.
  const handleSegmentUpdated = (updated: Customer) => {
    setCustomer(updated);
    onCustomerUpdated?.(updated);
  };

  const formatDate = (isoString?: string) => {
    if (!isoString) return '—';
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString('vi-VN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="customer-detail-page user-management-page" data-testid="customer-detail-page">
      {/* Header trang chi tiết */}
      <div className="page-header customer-detail-header">
        <div>
          <div className="breadcrumb">
            <button type="button" className="breadcrumb-btn" onClick={onBack}>
              ← Khách hàng
            </button>
            <span>/</span>
            <span>Hồ sơ khách hàng</span>
            <span>/</span>
            <span className="active">{customer.code}</span>
          </div>

          <div className="customer-title-row">
            <h1 className="page-title">{customer.name}</h1>
            <div className="customer-code-pill customer-code-pill--lg">
              <span>{customer.code}</span>
              <button
                type="button"
                className="btn-copy-code"
                title="Sao chép mã khách hàng"
                onClick={() => handleCopyCode(customer.code)}
                aria-label={`Sao chép mã ${customer.code}`}
              >
                {copiedCode ? '✓' : <span className="icon-sm">{ICONS.copy}</span>}
              </button>
            </div>
          </div>
          <p className="page-subtitle">
            Hồ sơ doanh nghiệp, kênh liên hệ điều hành và thông tin hợp đồng dự án.
          </p>
        </div>

        <div>
          <button
            type="button"
            className="btn btn-secondary btn-back"
            onClick={onBack}
            data-testid="btn-back-to-customers"
          >
            <span>← Quay lại danh sách</span>
          </button>
        </div>
      </div>

      {/* Thẻ thông tin tổng quan doanh nghiệp */}
      <div className="customer-overview-card">
        <div className="customer-overview-header">
          <div className="overview-brand-icon">{ICONS.building}</div>
          <div className="overview-title-meta">
            <h3>{customer.name}</h3>
            <span className="customer-industry-badge">
              <span className="icon-xs">{ICONS.tag}</span> {customer.industry || 'Chưa xác định ngành nghề'}
            </span>
          </div>
        </div>

        <div className="customer-meta-grid">
          <div className="meta-item">
            <span className="meta-item__label">Mã số thuế</span>
            <div className="meta-item__value">
              {customer.taxCode ? (
                <span className="taxcode-badge">{customer.taxCode}</span>
              ) : (
                <span className="cell-muted">—</span>
              )}
            </div>
          </div>

          <div className="meta-item">
            <span className="meta-item__label">Số điện thoại hotline</span>
            <div className="meta-item__value">
              {customer.phone ? (
                <a href={`tel:${customer.phone}`} className="contact-link">
                  <span className="icon-xs">{ICONS.phone}</span> {customer.phone}
                </a>
              ) : (
                <span className="cell-muted">—</span>
              )}
            </div>
          </div>

          <div className="meta-item meta-item--wide">
            <span className="meta-item__label">Địa chỉ trụ sở chính</span>
            <div className="meta-item__value address-text">
              <span className="icon-xs">{ICONS.pin}</span> {customer.address || 'Chưa cập nhật địa chỉ'}
            </div>
          </div>

          <div className="meta-item">
            <span className="meta-item__label">Thời gian tạo hồ sơ</span>
            <div className="meta-item__value cell-date">
              <span className="icon-xs">{ICONS.calendar}</span> {formatDate(customer.createdAt)}
            </div>
          </div>
        </div>
      </div>

      {/* Thanh Tabs chuyển đổi nội dung */}
      <div className="customer-tabs-bar">
        <button
          type="button"
          className={`customer-tab-btn ${activeTab === 'CONTACTS' ? 'customer-tab-btn--active' : ''}`}
          onClick={() => setActiveTab('CONTACTS')}
          data-testid="tab-btn-contacts"
        >
          <span className="tab-icon">{ICONS.users}</span>
          <span>Người liên hệ (Contacts)</span>
        </button>

        <button
          type="button"
          className={`customer-tab-btn ${activeTab === 'SEGMENT' ? 'customer-tab-btn--active' : ''}`}
          onClick={() => setActiveTab('SEGMENT')}
          data-testid="tab-btn-segment"
        >
          <span className="tab-icon">{ICONS.tag}</span>
          <span>Phân nhóm</span>
        </button>

        <button
          type="button"
          className={`customer-tab-btn ${activeTab === 'SUMMARY' ? 'customer-tab-btn--active' : ''}`}
          onClick={() => setActiveTab('SUMMARY')}
          data-testid="tab-btn-summary"
        >
          <span className="tab-icon">{ICONS.chart}</span>
          <span>Hồ sơ tổng hợp</span>
        </button>

        <button
          type="button"
          className={`customer-tab-btn ${activeTab === 'OVERVIEW' ? 'customer-tab-btn--active' : ''}`}
          onClick={() => setActiveTab('OVERVIEW')}
          data-testid="tab-btn-overview"
        >
          <span className="tab-icon">{ICONS.building}</span>
          <span>Hồ sơ chi tiết</span>
        </button>

        <button
          type="button"
          className={`customer-tab-btn ${activeTab === 'AUDIT' ? 'customer-tab-btn--active' : ''}`}
          onClick={() => setActiveTab('AUDIT')}
          data-testid="tab-btn-audit"
        >
          <span className="tab-icon">{ICONS.shield}</span>
          <span>Nhật ký kiểm toán {auditLogs.length > 0 && `(${auditLogs.length})`}</span>
        </button>
      </div>

      {/* Nội dung tương ứng với từng Tab */}
      <div className="customer-tab-content">
        {activeTab === 'CONTACTS' && (
          <ContactList
            customerId={customer.id}
            customerName={customer.name}
            currentUserRoles={currentUserRoles}
            currentUserName={currentUserName}
            initialContacts={initialContacts}
            onAuditLogged={handleAuditLogged}
          />
        )}

        {activeTab === 'SEGMENT' && (
          <CustomerSegmentPanel
            customer={customer}
            currentUserRoles={currentUserRoles}
            currentUserName={currentUserName}
            onSegmentUpdated={handleSegmentUpdated}
            onAuditLogged={handleAuditLogged}
          />
        )}

        {activeTab === 'SUMMARY' && (
          <CustomerOverviewPanel
            customerId={customer.id}
            customerName={customer.name}
            currentUserRoles={currentUserRoles}
            onLoaded={({ at, itemCount }) =>
              handleAuditLogged({
                id: `overview-${Date.now()}`,
                action: 'Xem hồ sơ tổng hợp',
                actor: currentUserName,
                timestamp: at,
                detail: `Đã mở hồ sơ tổng hợp của khách hàng ${customer.code} — tải ${itemCount} bản ghi liên quan`,
              })
            }
          />
        )}

        {activeTab === 'OVERVIEW' && (
          <div className="overview-tab-pane user-table-card" style={{ padding: '24px' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '17px', color: '#0f172a' }}>
              Thông tin hành chính doanh nghiệp
            </h3>
            <div className="form-grid">
              <div className="form-field">
                <span className="form-label">Tên pháp nhân đầy đủ:</span>
                <p style={{ fontWeight: 600, color: '#0f172a', margin: 0 }}>{customer.name}</p>
              </div>
              <div className="form-field">
                <span className="form-label">Mã khách hàng tự sinh:</span>
                <p style={{ fontFamily: 'monospace', fontWeight: 700, color: '#059669', margin: 0 }}>
                  {customer.code}
                </p>
              </div>
              <div className="form-field">
                <span className="form-label">Mã số doanh nghiệp / MST:</span>
                <p style={{ margin: 0 }}>{customer.taxCode || '—'}</p>
              </div>
              <div className="form-field">
                <span className="form-label">Ngành nghề kinh doanh:</span>
                <p style={{ margin: 0 }}>{customer.industry || '—'}</p>
              </div>
              <div className="form-field">
                <span className="form-label">Quy mô công ty:</span>
                <p style={{ margin: 0 }}>{customer.companySize || '—'}</p>
              </div>
              <div className="form-field">
                <span className="form-label">Mức độ ưu tiên:</span>
                <p style={{ margin: 0 }}>{customer.priority || '—'}</p>
              </div>
              <div className="form-field form-field--full">
                <span className="form-label">Địa chỉ đăng ký kinh doanh:</span>
                <p style={{ margin: 0 }}>{customer.address || '—'}</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'AUDIT' && (
          <div className="audit-tab-pane user-table-card" style={{ padding: '24px' }}>
            <div className="audit-log-header">
              <h3 className="audit-log-title" style={{ fontSize: '17px' }}>
                <span className="audit-log-title__icon">{ICONS.shield}</span> Toàn bộ nhật ký kiểm toán khách hàng (TC-04)
              </h3>
              <span className="badge-pulse">Bảo mật chuẩn ISO 27001</span>
            </div>
            {auditLogs.length === 0 ? (
              <div className="table-empty-state" style={{ padding: '30px' }}>
                <div className="table-empty-state__icon">{ICONS.clipboardList}</div>
                <h4>Chưa có thao tác nào trong phiên này</h4>
                <p>Các hành động thêm người liên hệ, thay đổi đầu mối chính sẽ được ghi nhận tại đây.</p>
              </div>
            ) : (
              <div className="audit-log-list" style={{ marginTop: '16px' }}>
                {auditLogs.map((log) => (
                  <div key={log.id} className="audit-log-item">
                    <span className="audit-log-icon">{ICONS.checkCircle}</span>
                    <div className="audit-log-meta">
                      <div className="audit-log-row">
                        <span>
                          Người thực hiện: <strong className="highlight-username">{log.actor}</strong>
                        </span>
                        <span className="audit-log-time">{log.timestamp}</span>
                      </div>
                      <div className="audit-log-details">{log.detail}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

