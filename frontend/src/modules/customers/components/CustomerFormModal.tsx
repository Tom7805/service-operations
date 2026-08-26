import { useEffect, useRef, useState, type FormEvent, type ChangeEvent } from 'react';
import type { Customer, CustomerCreatePayload, CustomerFormErrors } from '../types/customerTypes';
import { validateCustomerCreate, CUSTOMER_VALIDATION_LIMITS } from '../validators/customerValidators';
import { CustomerApiError } from '../api/customersApi';

interface CustomerFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: CustomerCreatePayload) => Promise<Customer | void>;
}

export default function CustomerFormModal({ isOpen, onClose, onSubmit }: CustomerFormModalProps) {
  const [name, setName] = useState('');
  const [taxCode, setTaxCode] = useState('');
  const [industry, setIndustry] = useState('');
  const [address, setAddress] = useState('');

  const [errors, setErrors] = useState<CustomerFormErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const nameInputRef = useRef<HTMLInputElement>(null);

  // Reset form và focus vào ô Tên khi mở modal
  useEffect(() => {
    if (isOpen) {
      setName('');
      setTaxCode('');
      setIndustry('');
      setAddress('');
      setErrors({});
      setServerError(null);
      setSubmitting(false);

      const timer = setTimeout(() => {
        nameInputRef.current?.focus();
      }, 80);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Xử lý phím Escape để đóng modal
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

  const handleNameChange = (e: ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setName(val);
    if (errors.name) {
      const fieldErrors = validateCustomerCreate({ name: val, taxCode, industry, address });
      setErrors((prev) => ({ ...prev, name: fieldErrors.name }));
    }
  };

  const handleTaxCodeChange = (e: ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setTaxCode(val);
    if (errors.taxCode) {
      const fieldErrors = validateCustomerCreate({ name, taxCode: val, industry, address });
      setErrors((prev) => ({ ...prev, taxCode: fieldErrors.taxCode }));
    }
  };

  const handleIndustryChange = (e: ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setIndustry(val);
    if (errors.industry) {
      const fieldErrors = validateCustomerCreate({ name, taxCode, industry: val, address });
      setErrors((prev) => ({ ...prev, industry: fieldErrors.industry }));
    }
  };

  const handleAddressChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setAddress(val);
    if (errors.address) {
      const fieldErrors = validateCustomerCreate({ name, taxCode, industry, address: val });
      setErrors((prev) => ({ ...prev, address: fieldErrors.address }));
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setServerError(null);

    const payload: CustomerCreatePayload = {
      name,
      taxCode: taxCode || undefined,
      industry: industry || undefined,
      address: address || undefined,
    };

    const validationErrors = validateCustomerCreate(payload);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit(payload);
      onClose();
    } catch (err) {
      if (err instanceof CustomerApiError) {
        setServerError(err.message);
      } else if (err instanceof Error) {
        setServerError(err.message);
      } else {
        setServerError('Không thể tạo hồ sơ khách hàng. Vui lòng thử lại sau.');
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
      aria-labelledby="modal-title"
    >
      <div className="modal-card customer-modal-card">
        <div className="modal-header">
          <div className="modal-header__title-wrap">
            <span className="modal-header__icon" aria-hidden="true">🏢</span>
            <div>
              <h3 id="modal-title" className="modal-title">Tạo hồ sơ khách hàng mới</h3>
              <p className="modal-subtitle">
                Nhập thông tin doanh nghiệp/đối tác. Mã khách hàng (KH-xxxxxx) sẽ được hệ thống sinh tự động.
              </p>
            </div>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            disabled={submitting}
            aria-label="Đóng cửa sổ"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="modal-form">
          <div className="modal-body">
            {serverError && (
              <div className="alert-box alert-box--danger" role="alert">
                <span className="alert-box__icon">⚠️</span>
                <div className="alert-box__content">
                  <strong>Đã xảy ra lỗi:</strong>
                  <p>{serverError}</p>
                </div>
              </div>
            )}

            {/* Thông tin mã khách hàng sinh tự động */}
            <div className="info-callout">
              <span className="info-callout__icon">ℹ️</span>
              <div className="info-callout__text">
                <strong>Quy tắc mã hồ sơ:</strong> Hệ thống tự động cấp phát mã định danh duy nhất (ví dụ: <code className="customer-code-badge">KH-xxxxxx</code>) sau khi ghi nhận thành công.
              </div>
            </div>

            {/* Trường: Tên khách hàng */}
            <div className="form-group">
              <div className="form-label-row">
                <label htmlFor="customer-name" className="form-label required">
                  Tên khách hàng
                </label>
                <span
                  className={`char-counter ${name.length > CUSTOMER_VALIDATION_LIMITS.NAME_MAX_LENGTH ? 'char-counter--overflow' : ''}`}
                >
                  {name.length}/{CUSTOMER_VALIDATION_LIMITS.NAME_MAX_LENGTH}
                </span>
              </div>
              <input
                ref={nameInputRef}
                id="customer-name"
                name="name"
                type="text"
                className={`form-input ${errors.name ? 'form-input--error' : ''}`}
                placeholder="Ví dụ: Công ty TNHH Giải pháp Phần mềm ABC"
                value={name}
                onChange={handleNameChange}
                disabled={submitting}
                maxLength={CUSTOMER_VALIDATION_LIMITS.NAME_MAX_LENGTH + 10}
                aria-invalid={Boolean(errors.name)}
                aria-describedby={errors.name ? 'customer-name-error' : undefined}
              />
              {errors.name && (
                <p id="customer-name-error" className="field-error-text" role="alert">
                  {errors.name}
                </p>
              )}
            </div>

            {/* Trường: Mã số thuế */}
            <div className="form-group">
              <div className="form-label-row">
                <label htmlFor="customer-taxCode" className="form-label">
                  Mã số thuế
                </label>
                <span
                  className={`char-counter ${taxCode.length > CUSTOMER_VALIDATION_LIMITS.TAX_CODE_MAX_LENGTH ? 'char-counter--overflow' : ''}`}
                >
                  {taxCode.length}/{CUSTOMER_VALIDATION_LIMITS.TAX_CODE_MAX_LENGTH}
                </span>
              </div>
              <input
                id="customer-taxCode"
                name="taxCode"
                type="text"
                className={`form-input ${errors.taxCode ? 'form-input--error' : ''}`}
                placeholder="Ví dụ: 0101234567 hoặc 0101234567-001"
                value={taxCode}
                onChange={handleTaxCodeChange}
                disabled={submitting}
                maxLength={CUSTOMER_VALIDATION_LIMITS.TAX_CODE_MAX_LENGTH + 10}
                aria-invalid={Boolean(errors.taxCode)}
                aria-describedby={errors.taxCode ? 'customer-taxCode-error' : undefined}
              />
              {errors.taxCode && (
                <p id="customer-taxCode-error" className="field-error-text" role="alert">
                  {errors.taxCode}
                </p>
              )}
            </div>

            {/* Trường: Lĩnh vực / Ngành nghề */}
            <div className="form-group">
              <div className="form-label-row">
                <label htmlFor="customer-industry" className="form-label">
                  Lĩnh vực / Ngành nghề
                </label>
                <span
                  className={`char-counter ${industry.length > CUSTOMER_VALIDATION_LIMITS.INDUSTRY_MAX_LENGTH ? 'char-counter--overflow' : ''}`}
                >
                  {industry.length}/{CUSTOMER_VALIDATION_LIMITS.INDUSTRY_MAX_LENGTH}
                </span>
              </div>
              <input
                id="customer-industry"
                name="industry"
                type="text"
                className={`form-input ${errors.industry ? 'form-input--error' : ''}`}
                placeholder="Ví dụ: Công nghệ thông tin, Viễn thông, Logistics..."
                value={industry}
                onChange={handleIndustryChange}
                disabled={submitting}
                maxLength={CUSTOMER_VALIDATION_LIMITS.INDUSTRY_MAX_LENGTH + 10}
                aria-invalid={Boolean(errors.industry)}
                aria-describedby={errors.industry ? 'customer-industry-error' : undefined}
              />
              {errors.industry && (
                <p id="customer-industry-error" className="field-error-text" role="alert">
                  {errors.industry}
                </p>
              )}
            </div>

            {/* Trường: Địa chỉ */}
            <div className="form-group">
              <div className="form-label-row">
                <label htmlFor="customer-address" className="form-label">
                  Địa chỉ trụ sở / Chi nhánh
                </label>
                <span
                  className={`char-counter ${address.length > CUSTOMER_VALIDATION_LIMITS.ADDRESS_MAX_LENGTH ? 'char-counter--overflow' : ''}`}
                >
                  {address.length}/{CUSTOMER_VALIDATION_LIMITS.ADDRESS_MAX_LENGTH}
                </span>
              </div>
              <textarea
                id="customer-address"
                name="address"
                rows={3}
                className={`form-textarea ${errors.address ? 'form-input--error' : ''}`}
                placeholder="Ví dụ: Tầng 12, Tòa nhà Landmark 72, Phạm Hùng, Nam Từ Liêm, Hà Nội"
                value={address}
                onChange={handleAddressChange}
                disabled={submitting}
                maxLength={CUSTOMER_VALIDATION_LIMITS.ADDRESS_MAX_LENGTH + 20}
                aria-invalid={Boolean(errors.address)}
                aria-describedby={errors.address ? 'customer-address-error' : undefined}
              />
              {errors.address && (
                <p id="customer-address-error" className="field-error-text" role="alert">
                  {errors.address}
                </p>
              )}
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
              className="btn btn-primary btn-submit-customer"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <span className="spinner-sm" aria-hidden="true" />
                  <span>Đang lưu hồ sơ...</span>
                </>
              ) : (
                <>
                  <span>💾</span>
                  <span>Lưu hồ sơ khách hàng</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
