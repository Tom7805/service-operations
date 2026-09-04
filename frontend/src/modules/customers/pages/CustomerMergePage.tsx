import { useEffect, useRef, useState } from 'react';
import { fetchCustomers, previewCustomerMerge, mergeCustomers, CustomerApiError } from '../api/customersApi';
import { validateCustomerMergeSelection } from '../validators/customerValidators';
import { ICONS } from '../../../components/common/icons';
import type {
  Customer,
  CustomerMergePreview,
  CustomerMergeFormErrors,
} from '../types/customerTypes';

interface CustomerMergePageProps {
  currentUserRoles?: string[];
  currentUserName?: string;
}

/**
 * Ô tìm kiếm khách hàng theo tên/mã KH-xxxxxx — hỗ trợ chọn nhanh thay vì phải nhớ ID nội bộ.
 * Chọn xong sẽ điền ID vào ô nhập bên dưới (vẫn giữ nguyên để có thể gõ tay ID khi cần).
 */
function CustomerSearchPicker({
  id,
  onSelect,
  disabled,
}: {
  id: string;
  onSelect: (customer: Customer) => void;
  disabled?: boolean;
}) {
  const [keyword, setKeyword] = useState('');
  const [results, setResults] = useState<Customer[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const trimmed = keyword.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const data = await fetchCustomers(trimmed);
        setResults(data.filter((c) => c.status !== 'MERGED').slice(0, 8));
        setIsOpen(true);
      } catch {
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [keyword]);

  return (
    <div className="customer-search-picker" style={{ position: 'relative', marginBottom: '8px' }}>
      <input
        id={id}
        type="text"
        className="form-input"
        placeholder="Tìm theo tên hoặc mã KH-xxxxxx..."
        value={keyword}
        onChange={(e) => setKeyword(e.target.value)}
        onFocus={() => results.length > 0 && setIsOpen(true)}
        disabled={disabled}
        autoComplete="off"
      />
      {isSearching && <span className="field-hint">Đang tìm...</span>}
      {isOpen && results.length > 0 && (
        <ul
          className="customer-search-picker__list"
          role="listbox"
          style={{
            position: 'absolute',
            zIndex: 10,
            background: 'var(--card-bg, #fff)',
            border: '1px solid var(--border-color, #ddd)',
            borderRadius: '8px',
            width: '100%',
            maxHeight: '220px',
            overflowY: 'auto',
            margin: '4px 0 0',
            padding: '4px',
            listStyle: 'none',
            boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
          }}
        >
          {results.map((customer) => (
            <li key={customer.id}>
              <button
                type="button"
                className="customer-search-picker__item"
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '8px 10px',
                  background: 'transparent',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                }}
                onClick={() => {
                  onSelect(customer);
                  setKeyword(`${customer.code} — ${customer.name}`);
                  setIsOpen(false);
                }}
              >
                <strong>{customer.code}</strong> — {customer.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function CustomerSummaryCard({
  title,
  hint,
  customer,
  tone,
}: {
  title: string;
  hint: string;
  customer: Customer;
  tone: 'target' | 'source';
}) {
  return (
    <div className={`merge-preview-card merge-preview-card--${tone}`} data-testid={`merge-preview-${tone}`}>
      <span className={`merge-preview-card__badge merge-preview-card__badge--${tone}`}>{title}</span>
      <h3 className="merge-preview-card__name">{customer.name}</h3>
      <p className="merge-preview-card__hint">{hint}</p>
      <div className="customer-meta-grid" style={{ marginTop: '14px' }}>
        <div className="meta-item">
          <span className="meta-item__label">Mã khách hàng</span>
          <span className="customer-code-pill">{customer.code}</span>
        </div>
        <div className="meta-item">
          <span className="meta-item__label">Mã số thuế</span>
          <span className="meta-item__value">{customer.taxCode || '—'}</span>
        </div>
        <div className="meta-item">
          <span className="meta-item__label">Số điện thoại</span>
          <span className="meta-item__value">{customer.phone || '—'}</span>
        </div>
        <div className="meta-item">
          <span className="meta-item__label">Ngành nghề</span>
          <span className="meta-item__value">{customer.industry || '—'}</span>
        </div>
      </div>
    </div>
  );
}

/**
 * NCL-02-CN-006 — Gộp hai hồ sơ khách hàng trùng.
 * Chỉ Quản trị viên (VT-07) được thực hiện: chọn hồ sơ "giữ lại" và hồ sơ "bị gộp", xem trước ảnh hưởng
 * rồi xác nhận gộp — toàn bộ dữ liệu liên quan hiện có của hồ sơ bị gộp được chuyển về hồ sơ giữ lại và
 * hồ sơ bị gộp chuyển sang trạng thái "Đã gộp" (TC-01, TC-02).
 */
export default function CustomerMergePage({
  currentUserRoles = ['VT-07'],
  currentUserName = 'Người dùng',
}: CustomerMergePageProps) {
  // NCL-02-CN-006 / TC-03: chỉ Quản trị viên (VT-07) được gộp hồ sơ khách hàng.
  const isAllowed = currentUserRoles.includes('VT-07');

  const [targetIdInput, setTargetIdInput] = useState('');
  const [sourceIdInput, setSourceIdInput] = useState('');
  const [errors, setErrors] = useState<CustomerMergeFormErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);

  const [preview, setPreview] = useState<CustomerMergePreview | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isMerging, setIsMerging] = useState(false);
  const [mergeResult, setMergeResult] = useState<Customer | null>(null);

  const [toastMessage, setToastMessage] = useState<{
    text: string;
    type: 'success' | 'error' | 'info';
  } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 6000);
  };

  const resetForm = () => {
    setTargetIdInput('');
    setSourceIdInput('');
    setErrors({});
    setServerError(null);
    setPreview(null);
    setMergeResult(null);
  };

  // TC-01: Xem trước ảnh hưởng trước khi gộp thật — không làm thay đổi dữ liệu.
  const handlePreview = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetCustomerId = Number(targetIdInput);
    const sourceCustomerId = Number(sourceIdInput);

    const validationErrors = validateCustomerMergeSelection(
      targetIdInput ? targetCustomerId : null,
      sourceIdInput ? sourceCustomerId : null
    );
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors({});
    setServerError(null);
    setMergeResult(null);
    setIsPreviewing(true);
    try {
      const result = await previewCustomerMerge({ targetCustomerId, sourceCustomerId });
      setPreview(result);
    } catch (err) {
      const message =
        err instanceof CustomerApiError
          ? err.message
          : err instanceof Error
          ? err.message
          : 'Không thể xem trước ảnh hưởng của thao tác gộp.';
      setServerError(message);
      setPreview(null);
    } finally {
      setIsPreviewing(false);
    }
  };

  // TC-01, TC-02: Thực hiện gộp thật — luôn gộp, không chặn theo dữ liệu liên quan của hồ sơ bị gộp.
  const handleConfirmMerge = async () => {
    if (!preview) return;
    setIsMerging(true);
    setServerError(null);
    try {
      const target = await mergeCustomers({
        targetCustomerId: preview.targetCustomer.id,
        sourceCustomerId: preview.sourceCustomer.id,
      });
      setMergeResult(target);
      setPreview(null);

      // Nhật ký thao tác do backend ghi vào Nhật ký hệ thống (/audit-logs).
      showToast(
        `Gộp hồ sơ khách hàng thành công! "${preview.sourceCustomer.code}" đã chuyển sang trạng thái Đã gộp.`,
        'success'
      );
    } catch (err) {
      const message =
        err instanceof CustomerApiError
          ? err.message
          : err instanceof Error
          ? err.message
          : 'Không thể thực hiện gộp hồ sơ khách hàng.';
      setServerError(message);
      showToast(message, 'error');
    } finally {
      setIsMerging(false);
    }
  };

  // TC-03: Kiểm tra quyền truy cập (chỉ VT-07 được phép)
  if (!isAllowed) {
    return (
      <div className="access-denied-container" data-testid="merge-access-denied">
        <div className="access-denied-card">
          <div className="access-denied-icon">{ICONS.shieldOff}</div>
          <h2>Bạn không có thẩm quyền gộp hồ sơ khách hàng</h2>
          <p>
            Theo quy định phân quyền bảo mật (<strong>NCL-02-CN-006 · TC-03</strong>), chức năng Gộp hồ sơ khách
            hàng trùng chỉ dành riêng cho <strong>Quản trị viên (VT-07)</strong>. Hệ thống đã ghi lại lần từ chối
            truy cập này vào nhật ký bảo mật (Audit Log).
          </p>
          <div className="security-log-badge">
            <span className="security-log-badge__item">{ICONS.shield} Thời điểm ghi nhận: {new Date().toLocaleString('vi-VN')}</span>
            <span className="security-log-badge__item">Tài khoản: {currentUserName}</span>
            <span className="security-log-badge__item">Vai trò tài khoản: {currentUserRoles.join(', ')}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="customer-merge-page user-management-page">
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
            <span className="toast-notification__text">{toastMessage.text}</span>
          </div>
          <button
            type="button"
            className="toast-notification__close"
            onClick={() => setToastMessage(null)}
            aria-label="Đóng thông báo"
          >
            {ICONS.close}
          </button>
        </div>
      )}

      <div className="page-header">
        <div>
          <h1 className="page-title">Gộp hai hồ sơ khách hàng trùng</h1>
          <p className="page-subtitle">Chuyển dữ liệu từ hồ sơ bị gộp về hồ sơ giữ lại.</p>
        </div>
      </div>

      <div className="user-table-card customer-table-card" style={{ padding: '24px' }}>
        <form onSubmit={handlePreview} noValidate>
          {serverError && (
            <div className="alert alert--error" role="alert" data-testid="merge-server-error">
              <span className="alert__icon">{ICONS.alertTriangle}</span>
              <div>{serverError}</div>
            </div>
          )}
          {errors.general && (
            <div className="alert alert--error" role="alert">
              <span className="alert__icon">{ICONS.alertTriangle}</span>
              <div>{errors.general}</div>
            </div>
          )}

          <div className="form-grid">
            <div className="form-field">
              <label htmlFor="merge-target-id" className="form-label">
                ID hồ sơ giữ lại <span className="req">*</span>
              </label>
              <CustomerSearchPicker
                id="merge-target-search"
                disabled={isPreviewing || isMerging}
                onSelect={(customer) => setTargetIdInput(String(customer.id))}
              />
              <input
                id="merge-target-id"
                type="number"
                min={1}
                className={`form-input ${errors.targetCustomerId ? 'form-input--error' : ''}`}
                placeholder="VD: 1"
                value={targetIdInput}
                onChange={(e) => setTargetIdInput(e.target.value)}
                disabled={isPreviewing || isMerging}
              />
              {errors.targetCustomerId && (
                <span className="field-error" role="alert">
                  {errors.targetCustomerId}
                </span>
              )}
              <span className="field-hint">
                Tìm và chọn ở ô phía trên, hoặc gõ tay ID nội bộ của hồ sơ chính — sẽ nhận toàn bộ dữ liệu liên quan.
              </span>
            </div>

            <div className="form-field">
              <label htmlFor="merge-source-id" className="form-label">
                ID hồ sơ bị gộp <span className="req">*</span>
              </label>
              <CustomerSearchPicker
                id="merge-source-search"
                disabled={isPreviewing || isMerging}
                onSelect={(customer) => setSourceIdInput(String(customer.id))}
              />
              <input
                id="merge-source-id"
                type="number"
                min={1}
                className={`form-input ${errors.sourceCustomerId ? 'form-input--error' : ''}`}
                placeholder="VD: 2"
                value={sourceIdInput}
                onChange={(e) => setSourceIdInput(e.target.value)}
                disabled={isPreviewing || isMerging}
              />
              {errors.sourceCustomerId && (
                <span className="field-error" role="alert">
                  {errors.sourceCustomerId}
                </span>
              )}
              <span className="field-hint">Hồ sơ phụ — sẽ chuyển sang trạng thái "Đã gộp" sau khi xác nhận.</span>
            </div>
          </div>

          <div className="modal-footer" style={{ padding: '16px 0 0', justifyContent: 'flex-start' }}>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isPreviewing || isMerging}
              data-testid="btn-preview-merge"
            >
              {isPreviewing ? (
                <>
                  <span className="spinner-sm" />
                  <span>Đang xem trước...</span>
                </>
              ) : (
                <>
                  <span className="icon-sm">{ICONS.search}</span>
                  <span>Xem trước ảnh hưởng</span>
                </>
              )}
            </button>
            {(preview || mergeResult) && (
              <button type="button" className="btn btn-secondary" onClick={resetForm} disabled={isMerging}>
                Làm lại từ đầu
              </button>
            )}
          </div>
        </form>

        {/* TC-01: Xem trước ảnh hưởng trước khi gộp thật */}
        {preview && (
          <div className="merge-preview-section" data-testid="merge-preview-section">
            <div className="merge-preview-columns">
              <CustomerSummaryCard
                title="Hồ sơ giữ lại"
                hint="Sẽ nhận toàn bộ dữ liệu liên quan của hồ sơ bên cạnh."
                customer={preview.targetCustomer}
                tone="target"
              />
              <span className="merge-preview-arrow" aria-hidden="true">
                <span className="icon-sm">{ICONS.arrowLeft}</span>
              </span>
              <CustomerSummaryCard
                title="Hồ sơ bị gộp"
                hint='Sẽ chuyển sang trạng thái "Đã gộp" ngay sau khi xác nhận.'
                customer={preview.sourceCustomer}
                tone="source"
              />
            </div>

            <div className="alert alert--warning" data-testid="merge-related-record-count">
              <span className="alert__icon">{ICONS.alertTriangle}</span>
              <div>
                Có <strong>{preview.relatedRecordCount}</strong> bản ghi liên quan của hồ sơ bị gộp (nhật ký khách
                hàng, lý do bỏ qua cảnh báo trùng) sẽ được chuyển về hồ sơ giữ lại và giữ dấu vết nguồn gốc.
              </div>
            </div>

            <div className="modal-footer" style={{ padding: '16px 0 0', justifyContent: 'flex-start' }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleConfirmMerge}
                disabled={isMerging}
                data-testid="btn-confirm-merge"
              >
                {isMerging ? (
                  <>
                    <span className="spinner-sm" />
                    <span>Đang gộp...</span>
                  </>
                ) : (
                  <>
                    <span className="icon-sm">{ICONS.check}</span>
                    <span>Xác nhận gộp</span>
                  </>
                )}
              </button>
              <button type="button" className="btn btn-secondary" onClick={resetForm} disabled={isMerging}>
                Hủy bỏ
              </button>
            </div>
          </div>
        )}

        {/* Kết quả sau khi gộp thành công */}
        {mergeResult && (
          <div className="alert alert--success" data-testid="merge-success-result" style={{ marginTop: '20px' }}>
            <span className="alert__icon">{ICONS.checkCircle}</span>
            <div>
              Đã gộp thành công. Hồ sơ giữ lại <strong>{mergeResult.code}</strong> ({mergeResult.name}) hiện đã
              nhận toàn bộ dữ liệu liên quan từ hồ sơ bị gộp.
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
