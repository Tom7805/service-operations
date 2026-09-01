import { useEffect, useRef, useState, type FormEvent, type ChangeEvent } from 'react';
import type {
  Customer,
  CustomerCreatePayload,
  CustomerCreateWithOverridePayload,
  CustomerFormErrors,
  DuplicateCandidate,
} from '../types/customerTypes';
import { validateCustomerCreate, CUSTOMER_VALIDATION_LIMITS } from '../validators/customerValidators';
import {
  checkCustomerDuplicate,
  createCustomerWithOverride,
  CustomerApiError,
} from '../api/customersApi';
import DuplicateWarningModal from './DuplicateWarningModal';
import { ICONS } from '../../../components/common/icons';

interface CustomerFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: CustomerCreatePayload) => Promise<Customer | void>;
  onOverrideSubmit?: (payload: CustomerCreateWithOverridePayload) => Promise<Customer | void>;
}

export default function CustomerFormModal({
  isOpen,
  onClose,
  onSubmit,
  onOverrideSubmit,
}: CustomerFormModalProps) {
  const [name, setName] = useState('');
  const [taxCode, setTaxCode] = useState('');
  const [phone, setPhone] = useState('');
  const [industry, setIndustry] = useState('');
  const [address, setAddress] = useState('');

  const [errors, setErrors] = useState<CustomerFormErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Trạng thái kiểm tra trùng lặp (NCL-02-CN-002)
  const [duplicateCandidates, setDuplicateCandidates] = useState<DuplicateCandidate[]>([]);
  const [isDuplicateModalOpen, setIsDuplicateModalOpen] = useState(false);
  const [isOverriding, setIsOverriding] = useState(false);

  const nameInputRef = useRef<HTMLInputElement>(null);

  // Reset form và focus vào ô Tên khi mở modal
  useEffect(() => {
    if (isOpen) {
      setName('');
      setTaxCode('');
      setPhone('');
      setIndustry('');
      setAddress('');
      setErrors({});
      setServerError(null);
      setSubmitting(false);
      setDuplicateCandidates([]);
      setIsDuplicateModalOpen(false);
      setIsOverriding(false);

      const timer = setTimeout(() => {
        nameInputRef.current?.focus();
      }, 80);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Xử lý phím Escape để đóng modal khi không mở modal con và không submitting
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isDuplicateModalOpen && !submitting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isDuplicateModalOpen, submitting, onClose]);

  if (!isOpen) return null;

  const currentPayload: CustomerCreatePayload = {
    name: name.trim(),
    taxCode: taxCode.trim() || undefined,
    phone: phone.trim() || undefined,
    industry: industry.trim() || undefined,
    address: address.trim() || undefined,
  };

  const handleNameChange = (e: ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setName(val);
    if (errors.name) {
      const fieldErrors = validateCustomerCreate({ name: val, taxCode, phone, industry, address });
      setErrors((prev) => ({ ...prev, name: fieldErrors.name }));
    }
  };

  const handleTaxCodeChange = (e: ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setTaxCode(val);
    if (errors.taxCode) {
      const fieldErrors = validateCustomerCreate({ name, taxCode: val, phone, industry, address });
      setErrors((prev) => ({ ...prev, taxCode: fieldErrors.taxCode }));
    }
  };

  const handlePhoneChange = (e: ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setPhone(val);
    if (errors.phone) {
      const fieldErrors = validateCustomerCreate({ name, taxCode, phone: val, industry, address });
      setErrors((prev) => ({ ...prev, phone: fieldErrors.phone }));
    }
  };

  const handleIndustryChange = (e: ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setIndustry(val);
    if (errors.industry) {
      const fieldErrors = validateCustomerCreate({ name, taxCode, phone, industry: val, address });
      setErrors((prev) => ({ ...prev, industry: fieldErrors.industry }));
    }
  };

  const handleAddressChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setAddress(val);
    if (errors.address) {
      const fieldErrors = validateCustomerCreate({ name, taxCode, phone, industry, address: val });
      setErrors((prev) => ({ ...prev, address: fieldErrors.address }));
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setServerError(null);

    const validationErrors = validateCustomerCreate({
      name,
      taxCode,
      phone,
      industry,
      address,
    });

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setSubmitting(true);
    try {
      // NCL-02-CN-002: Luồng kiểm tra chống trùng trước khi submit thật
      const candidates = await checkCustomerDuplicate(currentPayload);

      if (candidates && candidates.length > 0) {
        // Có hồ sơ nghi trùng -> Mở modal cảnh báo để người dùng đối chiếu
        setDuplicateCandidates(candidates);
        setIsDuplicateModalOpen(true);
        setSubmitting(false);
        return;
      }

      // Không có hồ sơ nghi trùng -> Tiến hành tạo hồ sơ bình thường (TC-03)
      await onSubmit(currentPayload);
      onClose();
    } catch (err) {
      if (err instanceof CustomerApiError) {
        if (err.code === 'DUPLICATE_DATA' || err.statusCode === 409) {
          // Trường hợp backend tự chặn 409 -> mở cảnh báo trùng
          setDuplicateCandidates((prev) =>
            prev.length > 0
              ? prev
              : [
                  {
                    id: 0,
                    code: 'KH-UNKNOWN',
                    name: currentPayload.name,
                    similarity: 0.95,
                    matchedFields: ['ten'],
                  },
                ]
          );
          setIsDuplicateModalOpen(true);
        } else {
          setServerError(err.message);
        }
      } else if (err instanceof Error) {
        setServerError(err.message);
      } else {
        setServerError('Không thể tạo hồ sơ khách hàng. Vui lòng thử lại sau.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Xử lý khi người dùng xác nhận bỏ qua cảnh báo trùng và nhập lý do (TC-02)
  const handleConfirmOverride = async (reason: string) => {
    setIsOverriding(true);
    try {
      const overridePayload: CustomerCreateWithOverridePayload = {
        customer: currentPayload,
        override: { reason },
      };

      if (onOverrideSubmit) {
        await onOverrideSubmit(overridePayload);
      } else {
        await createCustomerWithOverride(overridePayload);
      }

      setIsDuplicateModalOpen(false);
      onClose();
    } catch (err) {
      throw err;
    } finally {
      setIsOverriding(false);
    }
  };

  return (
    <>
      <div
        className="modal-backdrop"
        onClick={(e) => {
          if (e.target === e.currentTarget && !submitting && !isDuplicateModalOpen) {
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
              <span className="modal-header__icon" aria-hidden="true">
                {ICONS.building}
              </span>
              <div>
                <h3 id="modal-title" className="modal-title">
                  Tạo hồ sơ khách hàng mới
                </h3>
                <p className="modal-subtitle">
                  Nhập thông tin doanh nghiệp/đối tác. Mã khách hàng (KH-xxxxxx) sẽ được hệ thống
                  cấp tự động sau khi lưu.
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
              {ICONS.close}
            </button>
          </div>

          <form onSubmit={handleSubmit} noValidate className="modal-form">
            <div className="modal-body">
              {serverError && (
                <div className="alert-box alert-box--danger" role="alert">
                  <span className="alert-box__icon">{ICONS.alertTriangle}</span>
                  <div className="alert-box__content">
                    <strong>Đã xảy ra lỗi:</strong>
                    <p>{serverError}</p>
                  </div>
                </div>
              )}

              {/* Thông tin mã khách hàng sinh tự động */}
              <div className="info-callout">
                <span className="info-callout__icon">{ICONS.info}</span>
                <div className="info-callout__text">
                  <strong>Quy tắc mã hồ sơ:</strong> Hệ thống tự động cấp phát mã định danh duy
                  nhất (ví dụ: <code className="customer-code-badge">KH-xxxxxx</code>) và tích hợp
                  tính năng tự động phát hiện hồ sơ trùng lặp.
                </div>
              </div>

              {/* Trường: Tên khách hàng */}
              <div className="form-group">
                <div className="form-label-row">
                  <label htmlFor="customer-name" className="form-label required">
                    Tên khách hàng
                  </label>
                  <span
                    className={`char-counter ${
                      name.length > CUSTOMER_VALIDATION_LIMITS.NAME_MAX_LENGTH
                        ? 'char-counter--overflow'
                        : ''
                    }`}
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

              {/* Hàng đôi: Mã số thuế & Số điện thoại */}
              <div className="form-row-2col">
                {/* Trường: Mã số thuế */}
                <div className="form-group">
                  <div className="form-label-row">
                    <label htmlFor="customer-taxCode" className="form-label">
                      Mã số thuế
                    </label>
                    <span
                      className={`char-counter ${
                        taxCode.length > CUSTOMER_VALIDATION_LIMITS.TAX_CODE_MAX_LENGTH
                          ? 'char-counter--overflow'
                          : ''
                      }`}
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

                {/* Trường: Số điện thoại (NCL-02-CN-002) */}
                <div className="form-group">
                  <div className="form-label-row">
                    <label htmlFor="customer-phone" className="form-label">
                      Số điện thoại liên hệ
                    </label>
                    <span
                      className={`char-counter ${
                        phone.length > CUSTOMER_VALIDATION_LIMITS.PHONE_MAX_LENGTH
                          ? 'char-counter--overflow'
                          : ''
                      }`}
                    >
                      {phone.length}/{CUSTOMER_VALIDATION_LIMITS.PHONE_MAX_LENGTH}
                    </span>
                  </div>
                  <input
                    id="customer-phone"
                    name="phone"
                    type="tel"
                    className={`form-input ${errors.phone ? 'form-input--error' : ''}`}
                    placeholder="Ví dụ: 0243123456 hoặc 0987654321"
                    value={phone}
                    onChange={handlePhoneChange}
                    disabled={submitting}
                    maxLength={CUSTOMER_VALIDATION_LIMITS.PHONE_MAX_LENGTH + 5}
                    aria-invalid={Boolean(errors.phone)}
                    aria-describedby={errors.phone ? 'customer-phone-error' : undefined}
                  />
                  {errors.phone && (
                    <p id="customer-phone-error" className="field-error-text" role="alert">
                      {errors.phone}
                    </p>
                  )}
                </div>
              </div>

              {/* Trường: Lĩnh vực / Ngành nghề */}
              <div className="form-group">
                <div className="form-label-row">
                  <label htmlFor="customer-industry" className="form-label">
                    Lĩnh vực / Ngành nghề
                  </label>
                  <span
                    className={`char-counter ${
                      industry.length > CUSTOMER_VALIDATION_LIMITS.INDUSTRY_MAX_LENGTH
                        ? 'char-counter--overflow'
                        : ''
                    }`}
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
                    className={`char-counter ${
                      address.length > CUSTOMER_VALIDATION_LIMITS.ADDRESS_MAX_LENGTH
                        ? 'char-counter--overflow'
                        : ''
                    }`}
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
                    <span>Đang kiểm tra & lưu hồ sơ...</span>
                  </>
                ) : (
                  <>
                    <span className="icon-sm">{ICONS.save}</span>
                    <span>Lưu hồ sơ khách hàng</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Modal cảnh báo chống trùng hồ sơ (NCL-02-CN-002) */}
      <DuplicateWarningModal
        isOpen={isDuplicateModalOpen}
        currentPayload={currentPayload}
        candidates={duplicateCandidates}
        onBackToEdit={() => setIsDuplicateModalOpen(false)}
        onConfirmOverride={handleConfirmOverride}
        isLoading={isOverriding}
      />
    </>
  );
}

