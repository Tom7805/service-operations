import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import {
  createCustomer,
  createCustomerWithOverride,
  updateCustomer,
  updateCustomerWithOverride,
  fetchCustomersPage,
  CustomerApiError,
} from '../api/customersApi';
import CustomerFormModal from '../components/CustomerFormModal';
import CustomerTable from '../components/CustomerTable';
import CustomerDetailPage from './CustomerDetailPage';
import { roleLabels } from '../../../utils/roleLabel';
import { ICONS } from '../../../components/common/icons';
import Pagination from '../../../components/common/Pagination';
import { useDebounce } from '../../../hooks/useDebounce';
import { useServerPagedList } from '../../../hooks/usePagination';
import type {
  Customer,
  CustomerCreatePayload,
  CustomerCreateWithOverridePayload,
  CustomerUpdateWithOverridePayload,
} from '../types/customerTypes';

interface CustomerListPageProps {
  currentUserRoles?: string[];
  currentUserName?: string;
  currentUserId?: number;
  onNavigateDetail?: (customer: Customer) => void;
}

export default function CustomerListPage({
  currentUserRoles = ['VT-04'],
  currentUserName = 'Người dùng',
  currentUserId,
  onNavigateDetail,
}: CustomerListPageProps) {
  // NCL-02-CN-001: Chỉ Nhân viên kinh doanh (VT-04) hoặc Quản lý dự án (VT-02) được phép thao tác.
  const isAllowed = currentUserRoles.includes('VT-04') || currentUserRoles.includes('VT-02');

  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [detailInitialTab, setDetailInitialTab] = useState<'CONTACTS' | 'SEGMENT'>('CONTACTS');
  const [searchTerm, setSearchTerm] = useState('');
  const [industryFilter, setIndustryFilter] = useState('');
  // NCL-02-CN-005 (TC-01, TC-02): lọc danh mục khách hàng theo quy mô và mức độ ưu tiên đã gán.
  const [companySizeFilter, setCompanySizeFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  // Hồ sơ đang được chỉnh sửa (mở CustomerFormModal ở chế độ 'edit').
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [toastMessage, setToastMessage] = useState<{
    text: string;
    type: 'success' | 'error' | 'info';
    customerCode?: string;
  } | null>(null);

  // Một bộ hẹn giờ duy nhất: toast mới huỷ hẹn giờ của toast cũ (không bị đóng sớm),
  // và huỷ khi rời trang để không set state sau unmount.
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
  }, []);

  const showToast = (
    text: string,
    type: 'success' | 'error' | 'info' = 'success',
    customerCode?: string
  ) => {
    setToastMessage({ text, type, customerCode });
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 6000);
  };

  // NCL-02-CN-005 (TC-01): tìm kiếm + lọc theo ngành nghề, quy mô, mức độ ưu tiên — chạy ở máy chủ.
  // Từ khoá chờ 300ms sau lần gõ cuối mới gửi, để gõ liên tục không bắn một yêu cầu mỗi ký tự.
  const debouncedSearch = useDebounce(searchTerm.trim(), 300);
  const filters = useMemo(
    () => ({
      keyword: debouncedSearch,
      industry: industryFilter,
      companySize: companySizeFilter,
      priority: priorityFilter,
    }),
    [debouncedSearch, industryFilter, companySizeFilter, priorityFilter]
  );

  // NCL-02-CN-001 (bước D/P): danh sách hồ sơ khách hàng phân trang phía máy chủ — mỗi lần chỉ
  // tải đúng một trang thay vì toàn bộ danh mục; phản hồi cũ về muộn không đè dữ liệu mới.
  const list = useServerPagedList({ filters, fetchPage: fetchCustomersPage, enabled: isAllowed });
  const customers = list.items;
  const summary = list.summary;
  const isLoading = list.isLoading;
  const loadCustomers = list.reload;
  const loadError = list.error
    ? list.error instanceof CustomerApiError || list.error instanceof Error
      ? list.error.message
      : 'Không thể tải danh sách hồ sơ khách hàng từ máy chủ.'
    : null;

  // Hồ sơ mới luôn đứng đầu danh sách (mới nhất trước) → về trang đầu và tải lại để thấy ngay,
  // kèm số liệu tổng hợp đã cập nhật.
  const showNewestFirst = () => {
    list.setPage(0);
    list.reload();
  };

  const handleCreateCustomer = async (payload: CustomerCreatePayload) => {
    try {
      const newCustomer = await createCustomer(payload);
      showNewestFirst();
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
      showNewestFirst();
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

  const applyCustomerUpdate = (updated: Customer) => {
    list.updateItems((prev) => prev.map((c) => (c.id === updated.id ? { ...c, ...updated } : c)));
  };

  const handleUpdateCustomer = async (payload: CustomerCreatePayload) => {
    if (!editingCustomer) return;
    try {
      const updated = await updateCustomer(editingCustomer.id, payload);
      applyCustomerUpdate(updated);
      showToast(`Đã cập nhật hồ sơ khách hàng "${updated.name}".`, 'success', updated.code);
      return updated;
    } catch (err) {
      const message =
        err instanceof CustomerApiError
          ? err.message
          : err instanceof Error
          ? err.message
          : 'Không thể cập nhật hồ sơ khách hàng.';
      showToast(message, 'error');
      throw err;
    }
  };

  const handleUpdateCustomerWithOverride = async (payload: CustomerUpdateWithOverridePayload) => {
    if (!editingCustomer) return;
    try {
      const updated = await updateCustomerWithOverride(editingCustomer.id, payload);
      applyCustomerUpdate(updated);
      showToast(
        `Đã cập nhật hồ sơ khách hàng "${updated.name}" (Đã ghi nhận lý do bỏ qua cảnh báo).`,
        'success',
        updated.code
      );
      return updated;
    } catch (err) {
      const message =
        err instanceof CustomerApiError
          ? err.message
          : err instanceof Error
          ? err.message
          : 'Không thể cập nhật hồ sơ khách hàng.';
      showToast(message, 'error');
      throw err;
    }
  };

  // Số liệu tổng hợp và giá trị cho các ô lọc do máy chủ tính trên TOÀN BỘ hồ sơ trong phạm vi
  // người xem (không chỉ trang đang hiển thị).
  const totalCustomers = summary?.total ?? 0;
  const createdTodayCount = summary?.createdToday ?? 0;
  const uniqueIndustries = summary?.industries ?? [];
  // NCL-02-CN-005: danh sách quy mô và mức độ ưu tiên đã được gán, dùng làm bộ lọc
  const uniqueCompanySizes = summary?.companySizes ?? [];
  const uniquePriorities = summary?.priorities ?? [];

  const hasActiveSegmentFilter = Boolean(industryFilter || companySizeFilter || priorityFilter);
  const hasActiveFilter = Boolean(debouncedSearch) || hasActiveSegmentFilter;
  // Có hồ sơ trong phạm vi nhưng không hồ sơ nào khớp bộ lọc hiện tại.
  const noFilterMatch =
    list.hasLoaded && !isLoading && hasActiveFilter && list.totalElements === 0 && totalCustomers > 0;

  const clearAllFilters = () => {
    setSearchTerm('');
    setIndustryFilter('');
    setCompanySizeFilter('');
    setPriorityFilter('');
  };

  // Callback ổn định cho các hàng memo của CustomerTable.
  const handleSelectCustomer = useCallback(
    (customer: Customer, tab: 'CONTACTS' | 'SEGMENT' = 'CONTACTS') => {
      if (onNavigateDetail) {
        onNavigateDetail(customer);
      } else {
        setDetailInitialTab(tab);
        setSelectedCustomer(customer);
      }
    },
    [onNavigateDetail]
  );

  // NCL-02-CN-005 (TC-01): mở thẳng tab "Phân nhóm" từ nút thao tác nhanh trên bảng danh sách.
  const handleOpenSegment = useCallback(
    (customer: Customer) => handleSelectCustomer(customer, 'SEGMENT'),
    [handleSelectCustomer]
  );
  const openCreateModal = useCallback(() => setIsModalOpen(true), []);

  // TC-03: Từ chối truy cập nếu không có vai trò VT-04 hoặc VT-02
  if (!isAllowed) {
    return (
      <div className="access-denied-container" data-testid="access-denied-view">
        <div className="access-denied-card">
          <div className="access-denied-icon">{ICONS.shieldOff}</div>
          <h2>Bạn không có thẩm quyền tạo & quản lý hồ sơ khách hàng</h2>
          <p>
            Theo quy định phân quyền bảo mật, chức năng Tạo hồ sơ khách hàng chỉ dành riêng cho{' '}
            <strong>Nhân viên kinh doanh</strong> hoặc <strong>Quản lý dự án</strong>.
            Hệ thống đã ghi lại lần từ chối truy cập này vào nhật ký bảo mật (Audit Log).
          </p>
          <div className="security-log-badge">
            <span className="security-log-badge__item">{ICONS.shield} Thời điểm ghi nhận: {new Date().toLocaleString('vi-VN')}</span>
            <span className="security-log-badge__item">Tài khoản: {currentUserName}</span>
            <span className="security-log-badge__item">Vai trò tài khoản: {roleLabels(currentUserRoles)}</span>
          </div>
        </div>
      </div>
    );
  }


  // NCL-02-CN-005: đồng bộ nhãn phân nhóm mới nhất từ trang chi tiết trở lại danh sách.
  const handleCustomerUpdated = (updated: Customer) => {
    list.updateItems((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
  };

  // Nếu đang chọn một khách hàng, hiển thị trang chi tiết & quản lý người liên hệ
  if (selectedCustomer) {
    return (
      <CustomerDetailPage
        customer={selectedCustomer}
        currentUserRoles={currentUserRoles}
        currentUserName={currentUserName}
        currentUserId={currentUserId}
        onBack={() => setSelectedCustomer(null)}
        initialTab={detailInitialTab}
        onCustomerUpdated={handleCustomerUpdated}
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
              {toastMessage.type === 'success' ? ICONS.checkCircle : toastMessage.type === 'error' ? ICONS.alertTriangle : ICONS.info}
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
            <span className="icon-sm">{ICONS.close}</span>
          </button>
        </div>
      )}

      {/* Header trang */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Hồ sơ khách hàng</h1>
          <p className="page-subtitle">Tạo mới và quản lý danh mục khách hàng doanh nghiệp.</p>
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
          <div className="stat-card__icon stat-card__icon--blue">{ICONS.building}</div>
          <div>
            <span className="stat-card__label">Tổng hồ sơ khách hàng</span>
            <div className="stat-card__value" data-testid="customer-total-count">{totalCustomers}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card__icon stat-card__icon--green">{ICONS.spark}</div>
          <div>
            <span className="stat-card__label">Hồ sơ tạo trong phiên</span>
            <div className="stat-card__value text-success">
              {createdTodayCount}
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card__icon stat-card__icon--purple">{ICONS.shield}</div>
          <div>
            <span className="stat-card__label">Vai trò thực hiện</span>
            <div className="stat-card__value sl-stat-sm">
              {currentUserRoles.includes('VT-04') ? 'Nhân viên kinh doanh' : 'Quản lý dự án'}
            </div>
          </div>
        </div>
      </div>

      {/* Bảng danh sách & Toolbar */}
      <div className="user-table-card customer-table-card">
        <div className="user-table-toolbar">
          <div className="search-box">
            <span className="search-box__icon" aria-hidden="true">{ICONS.search}</span>
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
                {ICONS.close}
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

            {/* NCL-02-CN-005 (TC-01): lọc theo quy mô công ty đã gán */}
            {uniqueCompanySizes.length > 0 && (
              <div className="filter-group">
                <label htmlFor="company-size-filter" className="filter-label">
                  Quy mô:
                </label>
                <select
                  id="company-size-filter"
                  className="filter-select"
                  value={companySizeFilter}
                  onChange={(e) => setCompanySizeFilter(e.target.value)}
                >
                  <option value="">Tất cả quy mô ({uniqueCompanySizes.length})</option>
                  {uniqueCompanySizes.map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* NCL-02-CN-005 (TC-01): lọc theo mức độ ưu tiên đã gán */}
            {uniquePriorities.length > 0 && (
              <div className="filter-group">
                <label htmlFor="priority-filter" className="filter-label">
                  Ưu tiên:
                </label>
                <select
                  id="priority-filter"
                  className="filter-select"
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                >
                  <option value="">Tất cả mức ưu tiên ({uniquePriorities.length})</option>
                  {uniquePriorities.map((level) => (
                    <option key={level} value={level}>
                      {level}
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
                clearAllFilters();
                loadCustomers();
              }}
              aria-label="Tải lại danh sách khách hàng"
              data-testid="btn-reload-customers"
            >
              {ICONS.refresh}
            </button>
          </div>
        </div>

        {loadError && !isLoading && (
          <div className="table-error-state" role="alert" data-testid="customer-load-error">
            <div className="table-error-state__icon">{ICONS.alertTriangle}</div>
            <div className="table-error-state__body">
              <h3>Không tải được danh sách hồ sơ khách hàng</h3>
              <p>{loadError}</p>
            </div>
            <button type="button" className="btn btn-secondary" onClick={loadCustomers}>
              Thử lại
            </button>
          </div>
        )}

        {/* NCL-02-CN-005 (TC-02): không có khách hàng nào thuộc nhóm được lọc */}
        {!loadError && noFilterMatch && (
          <div className="table-empty-state" data-testid="segment-filter-empty-state">
            <div className="table-empty-state__icon">{ICONS.search}</div>
            <h3>Không có kết quả phù hợp</h3>
            <p>
              Không tìm thấy khách hàng nào khớp với từ khóa hoặc nhóm đã chọn
              {hasActiveSegmentFilter ? ' (ngành nghề / quy mô / mức độ ưu tiên).' : '.'} Vui lòng thử
              từ khóa khác hoặc bỏ bớt bộ lọc.
            </p>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={clearAllFilters}
              data-testid="btn-clear-segment-filters"
            >
              Xóa toàn bộ bộ lọc
            </button>
          </div>
        )}

        {!loadError && !noFilterMatch && (
          // Đang tải trang khác: giữ bảng cũ (mờ đi) thay vì nháy về khung xương.
          <div className={list.hasLoaded && isLoading ? 'is-refreshing' : undefined} aria-busy={isLoading}>
            <CustomerTable
              customers={customers}
              loading={isLoading && !list.hasLoaded}
              canCreate={isAllowed}
              onOpenCreate={openCreateModal}
              onNavigateDetail={handleSelectCustomer}
              canManageSegment={isAllowed}
              onOpenSegment={handleOpenSegment}
              canEdit={isAllowed}
              onEdit={setEditingCustomer}
            />
          </div>
        )}

        {!loadError &&
          (list.hasLoaded ? (
            <Pagination
              page={list.page}
              totalPages={list.totalPages}
              totalElements={list.totalElements}
              pageSize={list.pageSize}
              itemLabel="hồ sơ khách hàng"
              loading={isLoading}
              onPageChange={list.setPage}
              testIdPrefix="customer-pagination"
            />
          ) : (
            <div className="table-footer">
              <span aria-live="polite">Đang tải danh sách hồ sơ khách hàng...</span>
            </div>
          ))}
      </div>

      {/* Modal tạo hồ sơ khách hàng */}
      <CustomerFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleCreateCustomer}
        onOverrideSubmit={handleCreateCustomerWithOverride}
      />

      {/* Modal chỉnh sửa hồ sơ khách hàng */}
      <CustomerFormModal
        isOpen={editingCustomer !== null}
        mode="edit"
        initialCustomer={editingCustomer}
        onClose={() => setEditingCustomer(null)}
        onSubmit={handleUpdateCustomer}
        onOverrideSubmit={handleUpdateCustomerWithOverride}
      />
    </div>
  );
}


