import { useEffect, useRef, useState, type FormEvent, type ChangeEvent } from 'react';
import type {
  Opportunity,
  OpportunityCreatePayload,
  OpportunityFormErrors,
  CustomerOption,
} from '../types/opportunityTypes';
import {
  validateOpportunityCreate,
  formatVNDInput,
  parseVNDInput,
  convertVNDToWords,
  OPPORTUNITY_LIMITS,
} from '../validators/opportunityValidators';
import {
  createOpportunity,
  fetchCustomersForSelect,
  OpportunityApiError,
} from '../api/opportunitiesApi';
import { ICONS } from '../../../components/common/icons';

interface OpportunityFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (createdOpportunity: Opportunity) => void;
  initialCustomerId?: number;
  initialCustomerList?: CustomerOption[];
}

export default function OpportunityFormModal({
  isOpen,
  onClose,
  onSuccess,
  initialCustomerId,
  initialCustomerList,
}: OpportunityFormModalProps) {
  const [name, setName] = useState('');
  const [customerId, setCustomerId] = useState<number | ''>(initialCustomerId ?? '');
  const [formattedValue, setFormattedValue] = useState('');
  const [expectedCloseDate, setExpectedCloseDate] = useState('');

  const [customers, setCustomers] = useState<CustomerOption[]>(initialCustomerList ?? []);
  const [loadingCustomers, setLoadingCustomers] = useState(false);

  const [errors, setErrors] = useState<OpportunityFormErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const nameInputRef = useRef<HTMLInputElement>(null);

  // Tải danh sách khách hàng nếu chưa có sẵn
  useEffect(() => {
    if (!isOpen) return;

    if (initialCustomerList && initialCustomerList.length > 0) {
      setCustomers(initialCustomerList);
      return;
    }

    let isMounted = true;
    setLoadingCustomers(true);
    fetchCustomersForSelect()
      .then((data) => {
        if (isMounted) {
          setCustomers(data);
        }
      })
      .finally(() => {
        if (isMounted) {
          setLoadingCustomers(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, initialCustomerList]);

  // Reset form & focus vào ô tên cơ hội khi mở modal
  useEffect(() => {
    if (isOpen) {
      setName('');
      setCustomerId(initialCustomerId ?? '');
      setFormattedValue('');
      setExpectedCloseDate('');
      setErrors({});
      setServerError(null);
      setSubmitting(false);

      const timer = setTimeout(() => {
        nameInputRef.current?.focus();
      }, 60);
      return () => clearTimeout(timer);
    }
  }, [isOpen, initialCustomerId]);

  // Hỗ trợ phím Escape để đóng modal khi không submitting
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !submitting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, submitting, onClose]);

  if (!isOpen) return null;

  const rawExpectedValue = parseVNDInput(formattedValue);
  const wordsValue = convertVNDToWords(rawExpectedValue);

  const handleNameChange = (e: ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setName(val);
    if (errors.name) {
      setErrors((prev) => ({ ...prev, name: undefined }));
    }
  };

  const handleCustomerChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value ? Number(e.target.value) : '';
    setCustomerId(val);
    if (errors.customerId) {
      setErrors((prev) => ({ ...prev, customerId: undefined }));
    }
  };

  const handleValueChange = (e: ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    const formatted = formatVNDInput(val);
    setFormattedValue(formatted);
    if (errors.expectedValue) {
      setErrors((prev) => ({ ...prev, expectedValue: undefined }));
    }
  };

  const handleCloseDateChange = (e: ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setExpectedCloseDate(val);
    if (errors.expectedCloseDate) {
      setErrors((prev) => ({ ...prev, expectedCloseDate: undefined }));
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setServerError(null);

    const payload: OpportunityCreatePayload = {
      name: name.trim(),
      customerId: typeof customerId === 'number' ? customerId : 0,
      expectedValue: formattedValue.trim() === '' ? (undefined as unknown as number) : rawExpectedValue,
      expectedCloseDate: expectedCloseDate ? expectedCloseDate : null,
      ownerId: null,
    };

    // Client-side validation
    const validationErrors = validateOpportunityCreate(payload);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setSubmitting(true);

    try {
      const created = await createOpportunity(payload);
      if (onSuccess) {
        onSuccess(created);
      }
      onClose();
    } catch (err) {
      if (err instanceof OpportunityApiError) {
        if (err.fieldErrors && err.fieldErrors.length > 0) {
          const fieldMap: OpportunityFormErrors = {};
          err.fieldErrors.forEach((fe) => {
            if (fe.field === 'name') fieldMap.name = fe.message;
            if (fe.field === 'customerId') fieldMap.customerId = fe.message;
            if (fe.field === 'expectedValue') fieldMap.expectedValue = fe.message;
            if (fe.field === 'expectedCloseDate') fieldMap.expectedCloseDate = fe.message;
          });
          setErrors(fieldMap);
        }
        setServerError(err.message);
      } else if (err instanceof Error) {
        setServerError(err.message);
      } else {
        setServerError('Không thể tạo cơ hội bán hàng. Vui lòng thử lại sau.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting) {
          onClose();
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="opportunity-modal-title"
    >
      <div className="modal-card" style={{ maxWidth: '640px' }}>
        <div className="modal-header">
          <div className="modal-header__title-wrap">
            <h3 id="opportunity-modal-title" className="modal-title">
              <span className="modal-title__icon" aria-hidden="true">
                {ICONS.target}
              </span>
              Tạo cơ hội bán hàng
            </h3>
            <p className="field-hint" style={{ marginTop: '4px' }}>
              Khởi tạo cơ hội kinh doanh mới gắn với hồ sơ khách hàng đã có trong hệ thống.
            </p>
          </div>
          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            disabled={submitting}
            aria-label="Đóng cửa sổ"
          >
            {ICONS.close}
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="modal-body">
            {serverError && (
              <div
                className="alert-box alert-box--danger"
                role="alert"
                style={{
                  marginBottom: '16px',
                  padding: '12px 14px',
                  background: 'var(--pale-red-bg)',
                  color: 'var(--pale-red-fg)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid rgba(159, 47, 45, 0.2)',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px',
                  fontSize: '13.5px',
                  lineHeight: '1.5',
                }}
              >
                <span style={{ flexShrink: 0, marginTop: '2px' }}>{ICONS.alertTriangle}</span>
                <div>
                  <strong>Thông báo:</strong> {serverError}
                </div>
              </div>
            )}

            {/* Thông tin quy tắc nghiệp vụ */}
            <div
              style={{
                marginBottom: '18px',
                padding: '10px 14px',
                background: 'var(--surface-sunken)',
                border: '1px solid var(--line)',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                fontSize: '13px',
                color: 'var(--ink-soft)',
              }}
            >
              <span style={{ flexShrink: 0, color: 'var(--ink-muted)' }}>{ICONS.info}</span>
              <span>
                Cơ hội mới luôn tự động bắt đầu ở giai đoạn <strong>Tiếp cận</strong> (<code>APPROACH</code>)
                và trạng thái <strong>Đang xử lý</strong> (<code>OPEN</code>) theo quy định QTN-06.
              </span>
            </div>

            <div className="form-grid">
              {/* Tên cơ hội */}
              <div className="form-field--full">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label htmlFor="opportunity-name" className="form-label" style={{ marginBottom: 0 }}>
                    Tên cơ hội <span className="req">*</span>
                  </label>
                  <span
                    style={{
                      fontSize: '11px',
                      fontFamily: 'var(--font-mono, monospace)',
                      color: name.length > OPPORTUNITY_LIMITS.NAME_MAX_LENGTH ? 'var(--pale-red-fg)' : 'var(--ink-muted)',
                    }}
                  >
                    {name.length}/{OPPORTUNITY_LIMITS.NAME_MAX_LENGTH}
                  </span>
                </div>
                <input
                  ref={nameInputRef}
                  id="opportunity-name"
                  type="text"
                  className={`form-input ${errors.name ? 'form-input--error' : ''}`}
                  placeholder="Ví dụ: Triển khai giải pháp ERP cho Công ty TNHH ABC"
                  value={name}
                  onChange={handleNameChange}
                  disabled={submitting}
                  maxLength={OPPORTUNITY_LIMITS.NAME_MAX_LENGTH + 20}
                  aria-invalid={Boolean(errors.name)}
                  aria-describedby={errors.name ? 'opportunity-name-error' : undefined}
                />
                {errors.name && (
                  <span id="opportunity-name-error" className="field-error" role="alert">
                    {errors.name}
                  </span>
                )}
              </div>

              {/* Khách hàng */}
              <div className="form-field--full">
                <label htmlFor="opportunity-customer" className="form-label">
                  Khách hàng <span className="req">*</span>
                </label>
                <select
                  id="opportunity-customer"
                  className={`form-select ${errors.customerId ? 'form-input--error' : ''}`}
                  value={customerId}
                  onChange={handleCustomerChange}
                  disabled={submitting || loadingCustomers}
                  aria-invalid={Boolean(errors.customerId)}
                  aria-describedby={errors.customerId ? 'opportunity-customer-error' : undefined}
                >
                  <option value="">
                    {loadingCustomers ? 'Đang tải danh sách khách hàng...' : '-- Chọn khách hàng có hồ sơ --'}
                  </option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      [{c.code}] {c.name}
                    </option>
                  ))}
                </select>
                {errors.customerId && (
                  <span id="opportunity-customer-error" className="field-error" role="alert">
                    {errors.customerId}
                  </span>
                )}
                {!errors.customerId && customers.length === 0 && !loadingCustomers && (
                  <span className="field-hint">
                    Chưa tìm thấy khách hàng nào. Vui lòng tạo hồ sơ khách hàng trước (NCL-02-CN-001).
                  </span>
                )}
              </div>

              {/* Giá trị dự kiến */}
              <div>
                <label htmlFor="opportunity-value" className="form-label">
                  Giá trị dự kiến (VNĐ) <span className="req">*</span>
                </label>
                <input
                  id="opportunity-value"
                  type="text"
                  inputMode="numeric"
                  className={`form-input ${errors.expectedValue ? 'form-input--error' : ''}`}
                  placeholder="Ví dụ: 500.000.000"
                  value={formattedValue}
                  onChange={handleValueChange}
                  disabled={submitting}
                  style={{ fontFamily: 'var(--font-mono, monospace)', letterSpacing: '0.02em' }}
                  aria-invalid={Boolean(errors.expectedValue)}
                  aria-describedby={errors.expectedValue ? 'opportunity-value-error' : undefined}
                />
                {errors.expectedValue && (
                  <span id="opportunity-value-error" className="field-error" role="alert">
                    {errors.expectedValue}
                  </span>
                )}
                {wordsValue && !errors.expectedValue && (
                  <span
                    className="field-hint"
                    style={{
                      marginTop: '5px',
                      color: 'var(--ink-soft)',
                      fontStyle: 'italic',
                      fontSize: '12.5px',
                      lineHeight: '1.4',
                    }}
                  >
                    Bằng chữ: {wordsValue}
                  </span>
                )}
              </div>

              {/* Ngày dự kiến chốt */}
              <div>
                <label htmlFor="opportunity-close-date" className="form-label">
                  Ngày dự kiến chốt
                </label>
                <input
                  id="opportunity-close-date"
                  type="date"
                  className={`form-input ${errors.expectedCloseDate ? 'form-input--error' : ''}`}
                  value={expectedCloseDate}
                  onChange={handleCloseDateChange}
                  disabled={submitting}
                  aria-invalid={Boolean(errors.expectedCloseDate)}
                  aria-describedby={errors.expectedCloseDate ? 'opportunity-close-date-error' : undefined}
                />
                {errors.expectedCloseDate && (
                  <span id="opportunity-close-date-error" className="field-error" role="alert">
                    {errors.expectedCloseDate}
                  </span>
                )}
                {!errors.expectedCloseDate && (
                  <span className="field-hint">Tùy chọn: Thời hạn dự kiến ký kết hoặc hoàn tất</span>
                )}
              </div>

              {/* Giai đoạn & Trạng thái khởi tạo */}
              <div className="form-field--full">
                <label className="form-label" style={{ color: 'var(--ink-muted)' }}>
                  Giai đoạn & trạng thái mặc định
                </label>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '8px 12px',
                    background: 'var(--surface-alt)',
                    border: '1px solid var(--line)',
                    borderRadius: 'var(--radius-md)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '12.5px', color: 'var(--ink-muted)' }}>Giai đoạn:</span>
                    <span
                      style={{
                        padding: '2px 8px',
                        background: 'var(--pale-green-bg)',
                        color: 'var(--pale-green-fg)',
                        borderRadius: '999px',
                        fontSize: '12px',
                        fontWeight: 600,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <span
                        style={{
                          width: '6px',
                          height: '6px',
                          borderRadius: '50%',
                          background: 'currentColor',
                        }}
                      />
                      Tiếp cận (APPROACH)
                    </span>
                  </div>
                  <span style={{ color: 'var(--line)' }}>|</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '12.5px', color: 'var(--ink-muted)' }}>Trạng thái:</span>
                    <span
                      style={{
                        padding: '2px 8px',
                        background: 'var(--pale-blue-bg)',
                        color: 'var(--pale-blue-fg)',
                        borderRadius: '999px',
                        fontSize: '12px',
                        fontWeight: 600,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <span
                        style={{
                          width: '6px',
                          height: '6px',
                          borderRadius: '50%',
                          background: 'currentColor',
                        }}
                      />
                      Đang xử lý (OPEN)
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={submitting}
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting}
              style={{ minWidth: '160px' }}
            >
              {submitting ? (
                <>
                  <span className="spinner-sm" aria-hidden="true" />
                  <span>Đang khởi tạo...</span>
                </>
              ) : (
                <>
                  <span className="icon-sm">{ICONS.save}</span>
                  <span>Tạo cơ hội bán hàng</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
