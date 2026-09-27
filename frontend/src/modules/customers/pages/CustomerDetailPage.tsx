import { useState } from 'react';
import type {
  Customer,
  CustomerContact,
  CustomerCreatePayload,
  CustomerUpdateWithOverridePayload,
} from '../types/customerTypes';
import ContactList from '../components/ContactList';
import CustomerOverviewPanel from '../components/CustomerOverviewPanel';
import CustomerSegmentPanel from '../components/CustomerSegmentPanel';
import CustomerFormModal from '../components/CustomerFormModal';
import { updateCustomer, updateCustomerWithOverride } from '../api/customersApi';
import { ICONS } from '../../../components/common/icons';
import PageHeader from '../../../components/common/PageHeader';

type CustomerDetailTab = 'CONTACTS' | 'SEGMENT' | 'SUMMARY' | 'OVERVIEW';

interface CustomerDetailPageProps {
  customer?: Customer;
  customerId?: number;
  currentUserRoles?: string[];
  currentUserName?: string;
  currentUserId?: number;
  onBack: () => void;
  initialContacts?: CustomerContact[];
  onCustomerUpdated?: (updated: Customer) => void;
  // NCL-02-CN-005: cho phép mở thẳng tab "Phân nhóm" từ nút thao tác nhanh ở danh sách.
  initialTab?: CustomerDetailTab;
  /** Từ "Lịch sử hợp tác": mở thẳng trang dự án / cơ hội (App điều hướng). */
  onOpenProject?: (projectId: number) => void;
  onOpenOpportunity?: (opportunityId: number) => void;
}

export default function CustomerDetailPage({
  customer: propCustomer,
  customerId: propCustomerId,
  currentUserRoles = ['VT-04'],
  currentUserName = 'Người dùng',
  currentUserId,
  onBack,
  initialContacts,
  onCustomerUpdated,
  initialTab,
  onOpenProject,
  onOpenOpportunity,
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

  const [activeTab, setActiveTab] = useState<CustomerDetailTab>(
    // PM (VT-02) khong quan ly nguoi lien he (NCL-02-CN-003) -> mac dinh mo Ho so tong hop (NCL-02-CN-004).
    initialTab ?? (currentUserRoles.includes('VT-04') ? 'CONTACTS' : 'SUMMARY')
  );
  const [copiedCode, setCopiedCode] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);

  const isMerged = customer.status === 'MERGED';

  const applyEdited = (updated: Customer) => {
    setCustomer((prev) => ({ ...prev, ...updated }));
    onCustomerUpdated?.(updated);
  };

  const handleEditSubmit = async (payload: CustomerCreatePayload) => {
    const updated = await updateCustomer(customer.id, payload);
    applyEdited(updated);
    return updated;
  };

  const handleEditOverrideSubmit = async (payload: CustomerUpdateWithOverridePayload) => {
    const updated = await updateCustomerWithOverride(customer.id, payload);
    applyEdited(updated);
    return updated;
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code).then(() => {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    });
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
      <PageHeader
        back={{ label: 'Khách hàng', onClick: onBack, testId: 'btn-back-to-customers' }}
        title={customer.name}
        meta={
          <span className="customer-code-pill customer-code-pill--lg">
            <span>{customer.code}</span>
            <button
              type="button"
              className="btn-copy-code"
              title="Sao chép mã khách hàng"
              onClick={() => handleCopyCode(customer.code)}
              aria-label={`Sao chép mã ${customer.code}`}
            >
              {copiedCode ? <span className="icon-sm">{ICONS.check}</span> : <span className="icon-sm">{ICONS.copy}</span>}
            </button>
          </span>
        }
        actions={
          !isMerged && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsEditOpen(true)}
              data-testid="btn-edit-customer"
            >
              <span className="icon-sm">{ICONS.edit}</span>
              Sửa hồ sơ
            </button>
          )
        }
      />

      {isMerged && (
        <div className="alert-box alert-box--warning" role="status" data-testid="customer-merged-notice">
          <span className="alert-box__icon">{ICONS.info}</span>
          <div className="alert-box__content">
            <strong>Hồ sơ đã được gộp</strong>
            <p>
              Hồ sơ này đã gộp vào hồ sơ {customer.mergedIntoId ? `#${customer.mergedIntoId}` : 'khác'} và chỉ còn để
              tra cứu — không thể chỉnh sửa, phân nhóm hay thay đổi người liên hệ.
            </p>
          </div>
        </div>
      )}

      {/* Thẻ thông tin tổng quan doanh nghiệp */}
      <div className="customer-overview-card">

        <div className="customer-meta-grid">
          <div className="meta-item">
            <span className="meta-item__label">Ngành nghề</span>
            <div className="meta-item__value">
              {customer.industry || <span className="cell-muted">—</span>}
            </div>
          </div>

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
            <span className="meta-item__label">Điện thoại</span>
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
            <span className="meta-item__label">Địa chỉ</span>
            <div className="meta-item__value address-text">
              <span className="icon-xs">{ICONS.pin}</span> {customer.address || '—'}
            </div>
          </div>

          <div className="meta-item">
            <span className="meta-item__label">Ngày tạo</span>
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
          <span>Người liên hệ</span>
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
          <span>Lịch sử hợp tác</span>
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
            readOnly={isMerged}
          />
        )}

        {activeTab === 'SEGMENT' && (
          <CustomerSegmentPanel
            customer={customer}
            currentUserRoles={currentUserRoles}
            currentUserName={currentUserName}
            onSegmentUpdated={handleSegmentUpdated}
            readOnly={isMerged}
          />
        )}

        {activeTab === 'SUMMARY' && (
          <CustomerOverviewPanel
            customerId={customer.id}
            customerName={customer.name}
            currentUserRoles={currentUserRoles}
            currentUserId={currentUserId}
            onOpenProject={onOpenProject}
            onOpenOpportunity={onOpenOpportunity}
          />
        )}

        {activeTab === 'OVERVIEW' && (
          <div className="overview-tab-pane user-table-card" style={{ padding: '24px' }}>
            <div className="form-grid">
              <div className="form-field">
                <span className="form-label">Tên pháp nhân</span>
                <p style={{ fontWeight: 600, color: 'var(--ink-strong)', margin: 0 }}>{customer.name}</p>
              </div>
              <div className="form-field">
                <span className="form-label">Mã khách hàng</span>
                <p style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--ink-strong)', margin: 0 }}>
                  {customer.code}
                </p>
              </div>
              <div className="form-field">
                <span className="form-label">Mã số thuế</span>
                <p style={{ margin: 0 }}>{customer.taxCode || '—'}</p>
              </div>
              <div className="form-field">
                <span className="form-label">Ngành nghề</span>
                <p style={{ margin: 0 }}>{customer.industry || '—'}</p>
              </div>
              <div className="form-field">
                <span className="form-label">Quy mô</span>
                <p style={{ margin: 0 }}>{customer.companySize || '—'}</p>
              </div>
              <div className="form-field">
                <span className="form-label">Mức độ ưu tiên</span>
                <p style={{ margin: 0 }}>{customer.priority || '—'}</p>
              </div>
              <div className="form-field form-field--full">
                <span className="form-label">Địa chỉ đăng ký</span>
                <p style={{ margin: 0 }}>{customer.address || '—'}</p>
              </div>
            </div>
          </div>
        )}

      </div>

      <CustomerFormModal
        isOpen={isEditOpen}
        mode="edit"
        initialCustomer={customer}
        onClose={() => setIsEditOpen(false)}
        onSubmit={handleEditSubmit}
        onOverrideSubmit={handleEditOverrideSubmit}
      />
    </div>
  );
}

