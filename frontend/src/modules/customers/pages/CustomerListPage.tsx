import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  createCustomer,
  createCustomerWithOverride,
  fetchCustomers,
  CustomerApiError,
} from '../api/customersApi';
import CustomerFormModal from '../components/CustomerFormModal';
import CustomerTable from '../components/CustomerTable';
import CustomerDetailPage from './CustomerDetailPage';
import type {
  Customer,
  CustomerCreatePayload,
  CustomerCreateWithOverridePayload,
} from '../types/customerTypes';

interface CustomerListPageProps {
  currentUserRoles?: string[];
  currentUserName?: string;
  initialCustomers?: Customer[];
  onNavigateDetail?: (customer: Customer) => void;
}

export default function CustomerListPage({
  currentUserRoles = ['VT-04'],
  currentUserName = 'Người dùng',
  initialCustomers = [],
  onNavigateDetail,
}: CustomerListPageProps) {
  // NCL-02-CN-001: Chỉ Nhân viên kinh doanh (VT-04) hoặc Quản lý dự án (VT-02) được phép thao tác.
  const isAllowed = currentUserRoles.includes('VT-04') || currentUserRoles.includes('VT-02');

  const [customers, setCustomers] = useState<Customer[]>(initialCustomers);
  const [isLoading, setIsLoading] = useState(initialCustomers.length === 0);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [industryFilter, setIndustryFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<{
    text: string;
    type: 'success' | 'error' | 'info';
    customerCode?: string;
  } | null>(null);

  const showToast = (
    text: string,
    type: 'success' | 'error' | 'info' = 'success',
    customerCode?: string
  ) => {
    setToastMessage({ text, type, customerCode });
    setTimeout(() => {
      setToastMessage(null);
    }, 6000);
  };

  // NCL-02-CN-001 (bước D/P): tải danh sách hồ sơ khách hàng đã lưu trong hệ thống từ Backend.
  const loadCustomers = useCallback(async () => {
    if (!isAllowed) return;
    setIsLoading(true);
    setLoadError(null);
    try {
      const data = await fetchCustomers();
      setCustomers(data);
    } catch (err) {
      const message =
        err instanceof CustomerApiError
          ? err.message
          : err instanceof Error
          ? err.message
          : 'Không thể tải danh sách hồ sơ khách hàng từ máy chủ.';
      setLoadError(message);
    } finally {
      setIsLoading(false);
    }
  }, [isAllowed]);

  useEffect(() => {
    // Cho phép truyền sẵn danh sách (test / preload) — khi đó bỏ qua lần gọi API khởi tạo.
    if (initialCustomers.length > 0) {
      setIsLoading(false);
      return;
    }
    loadCustomers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadCustomers]);

  const handleCreateCustomer = async (payload: CustomerCreatePayload) => {
    try {
      const newCustomer = await createCustomer(payload);
      setCustomers((prev) => [newCustomer, ...prev]);
      showToast(
        `Tạo hồ sơ khách hàng "${newCustomer.name}" thành công!`,
        'success',
        newCustomer.code
      );
      return newCustomer;
    } catch (err) {
      const message =
        err instanceof CustomerApiError
          ? err.message
          : err instanceof Error
          ? err.message
          : 'Không thể tạo hồ sơ khách hàng.';
      showToast(message, 'error');
      throw err;
    }
  };

  const handleCreateCustomerWithOverride = async (
    payload: CustomerCreateWithOverridePayload
  ) => {
    try {
      const newCustomer = await createCustomerWithOverride(payload);
      setCustomers((prev) => [newCustomer, ...prev]);
      showToast(
        `Tạo hồ sơ khách hàng "${newCustomer.name}" thành công (Đã ghi nhận lý do bỏ qua cảnh báo)!`,
        'success',
        newCustomer.code
      );
      return newCustomer;
    } catch (err) {
      const message =
        err instanceof CustomerApiError
          ? err.message
          : err instanceof Error
          ? err.message
          : 'Không thể tạo hồ sơ khách hàng.';
      showToast(message, 'error');
      throw err;
    }
  };

  // Lọc danh sách theo từ khóa tìm kiếm và ngành nghề
  const filteredCustomers = useMemo(() => {
    return customers.filter((cust) => {
      const matchSearch =
        !searchTerm.trim() ||
        cust.name.toLowerCase().includes(searchTerm.toLowerCase().trim()) ||
        cust.code.toLowerCase().includes(searchTerm.toLowerCase().trim()) ||
        (cust.taxCode && cust.taxCode.toLowerCase().includes(searchTerm.toLowerCase().trim())) ||
        (cust.phone && cust.phone.toLowerCase().includes(searchTerm.toLowerCase().trim())) ||
        (cust.industry && cust.industry.toLowerCase().includes(searchTerm.toLowerCase().trim())) ||
        (cust.address && cust.address.toLowerCase().includes(searchTerm.toLowerCase().trim()));

      const matchIndustry =
        !industryFilter || (cust.industry && cust.industry.toLowerCase() === industryFilter.toLowerCase());

      return matchSearch && matchIndustry;
    });
  }, [customers, searchTerm, industryFilter]);

  // Danh sách ngành nghề duy nhất để làm filter
  const uniqueIndustries = useMemo(() => {
    const list = customers
      .map((c) => c.industry?.trim())
      .filter((ind): ind is string => Boolean(ind));
    return Array.from(new Set(list));
  }, [customers]);

  // TC-03: Từ chối truy cập nếu không có vai trò VT-04 hoặc VT-02
  if (!isAllowed) {
    return (
      <div className="access-denied-container" data-testid="access-denied-view">
        <div className="access-denied-card">
          <div className="access-denied-icon">🚫</div>
          <span className="eyebrow text-danger">Từ chối quyền truy cập (403 FORBIDDEN)</span>
          <h2>Bạn không có thẩm quyền tạo & quản lý hồ sơ khách hàng</h2>
          <p>
            Theo quy định phân quyền bảo mật (<strong>NCL-02-CN-001</strong>), chức năng Tạo hồ sơ khách hàng chỉ dành riêng cho{' '}
            <strong>Nhân viên kinh doanh (VT-04)</strong> hoặc <strong>Quản lý dự án (VT-02)</strong>.
            Hệ thống đã ghi lại lần từ chối truy cập này vào nhật ký bảo mật (Audit Log).
          </p>
          <div className="security-log-badge">
            <span>🛡️ Thời điểm ghi nhận: {new Date().toLocaleString('vi-VN')}</span>
            <span>Tài khoản: {currentUserName}</span>
            <span>Vai trò tài khoản: {currentUserRoles.join(', ')}</span>
          </div>
        </div>
      </div>
    );
  }

  const handleSelectCustomer = (customer: Customer) => {
    if (onNavigateDetail) {
      onNavigateDetail(customer);
    } else {
      setSelectedCustomer(customer);
    }
  };

  // Nếu đang chọn một khách hàng, hiển thị trang chi tiết & quản lý người liên hệ
  if (selectedCustomer) {
    return (
      <CustomerDetailPage
        customer={selectedCustomer}
        currentUserRoles={currentUserRoles}
        currentUserName={currentUserName}
        onBack={() => setSelectedCustomer(null)}
      />
    );
  }

  return (
    <div className="customer-management-page user-management-page">
      {/* Toast thông báo nổi bật */}
      {toastMessage && (
        <div
          className={`toast-notification toast-notification--${toastMessage.type}`}
          role="alert"
          aria-live="polite"
        >
          <div className="toast-notification__content">
            <span className="toast-notification__icon">
              {toastMessage.type === 'success' ? '✅' : toastMessage.type === 'error' ? '❌' : 'ℹ️'}
            </span>
            <div className="toast-notification__text">
              <p>{toastMessage.text}</p>
              {toastMessage.customerCode && (
                <div className="toast-customer-code">
                  <span>Mã khách hàng tự sinh:</span>
                  <strong>{toastMessage.customerCode}</strong>
                </div>
              )}
            </div>
          </div>
          <button
            type="button"
            className="toast-notification__close"
            onClick={() => setToastMessage(null)}
            aria-label="Đóng thông báo"
          >
            ✕
          </button>
        </div>
      )}

      {/* Header trang */}
      <div className="page-header">
        <div>
          <div className="breadcrumb">
            <span>Trang chủ</span> <span>/</span> <span>Khách hàng</span> <span>/</span>{' '}
            <span className="active">Hồ sơ khách hàng</span>
          </div>
          <h1 className="page-title">Hồ sơ khách hàng</h1>
          <p className="page-subtitle">
            Tạo mới và quản lý danh mục hồ sơ khách hàng doanh nghiệp, kết nối hợp đồng và các dự án dịch vụ.
          </p>
        </div>
        <div>
          <button
            type="button"
            className="btn btn-primary btn-create-customer"
            onClick={() => setIsModalOpen(true)}
            data-testid="btn-open-create-customer"
          >
            <span>+</span>
            <span>Tạo hồ sơ khách hàng</span>
          </button>
        </div>
      </div>

      {/* Thẻ thống kê KPI */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-card__icon stat-card__icon--blue">🏢</div>
          <div>
            <span className="stat-card__label">Tổng hồ sơ khách hàng</span>
            <div className="stat-card__value">{customers.length}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card__icon stat-card__icon--green">✨</div>
          <div>
            <span className="stat-card__label">Hồ sơ tạo trong phiên</span>
            <div className="stat-card__value text-success">
              {customers.filter((c) => c.createdAt && new Date(c.createdAt).toDateString() === new Date().toDateString()).length}
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card__icon stat-card__icon--purple">🛡️</div>
          <div>
            <span className="stat-card__label">Vai trò thực hiện</span>
            <div className="stat-card__value" style={{ fontSize: '16px' }}>
              {currentUserRoles.includes('VT-04') ? 'Kinh doanh (VT-04)' : 'Quản lý dự án (VT-02)'}
            </div>
          </div>
        </div>
      </div>

      {/* Bảng danh sách & Toolbar */}
      <div className="user-table-card customer-table-card">
        <div className="user-table-toolbar">
          <div className="search-box">
            <span className="search-box__icon" aria-hidden="true">🔍</span>
            <input
              type="text"
              className="search-box__input"
              placeholder="Tìm theo tên KH, mã KH (KH-xxxxxx), MST, SĐT..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              aria-label="Tìm kiếm khách hàng"
            />
            {searchTerm && (
              <button
                type="button"
                className="search-box__clear"
                onClick={() => setSearchTerm('')}
                aria-label="Xóa từ khóa tìm kiếm"
              >
                ✕
              </button>
            )}
          </div>

          <div className="toolbar-filters">
            {uniqueIndustries.length > 0 && (
              <div className="filter-group">
                <label htmlFor="industry-filter" className="filter-label">
                  Ngành nghề:
                </label>
                <select
                  id="industry-filter"
                  className="filter-select"
                  value={industryFilter}
                  onChange={(e) => setIndustryFilter(e.target.value)}
                >
                  <option value="">Tất cả ngành nghề ({uniqueIndustries.length})</option>
                  {uniqueIndustries.map((ind) => (
                    <option key={ind} value={ind}>
                      {ind}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <button
              type="button"
              className="btn-icon-refresh"
              title="Tải lại danh sách & làm mới bộ lọc"
              onClick={() => {
                setSearchTerm('');
                setIndustryFilter('');
                loadCustomers();
              }}
              aria-label="Tải lại danh sách khách hàng"
              data-testid="btn-reload-customers"
            >
              🔄
            </button>
          </div>
        </div>

        {loadError && !isLoading && (
          <div className="table-error-state" role="alert" data-testid="customer-load-error">
            <div className="table-error-state__icon">⚠️</div>
            <div className="table-error-state__body">
              <h3>Không tải được danh sách hồ sơ khách hàng</h3>
              <p>{loadError}</p>
            </div>
            <button type="button" className="btn btn-secondary" onClick={loadCustomers}>
              Thử lại
            </button>
          </div>
        )}

        {!loadError && (
          <CustomerTable
            customers={filteredCustomers}
            loading={isLoading}
            canCreate={isAllowed}
            onOpenCreate={() => setIsModalOpen(true)}
            onNavigateDetail={handleSelectCustomer}
          />
        )}

        <div className="table-footer">
          <span>
            {isLoading
              ? 'Đang tải danh sách hồ sơ khách hàng...'
              : (
                <>
                  Hiển thị <strong>{filteredCustomers.length}</strong> / <strong>{customers.length}</strong> hồ sơ khách hàng
                </>
              )}
          </span>
        </div>
      </div>

      {/* Modal tạo hồ sơ khách hàng */}
      <CustomerFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleCreateCustomer}
        onOverrideSubmit={handleCreateCustomerWithOverride}
      />
    </div>
  );
}


