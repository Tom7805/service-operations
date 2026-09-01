import { useState, useEffect } from 'react';
import type {
  Customer,
  CustomerSegmentPayload,
  CustomerSegmentFormErrors,
} from '../types/customerTypes';
import { ICONS } from '../../../components/common/icons';
import { COMPANY_SIZE_OPTIONS, CUSTOMER_PRIORITY_OPTIONS } from '../types/customerTypes';
import { validateCustomerSegment } from '../validators/customerValidators';

interface CustomerSegmentModalProps {
  isOpen: boolean;
  customer: Customer | null;
  onClose: () => void;
  onSubmit: (payload: CustomerSegmentPayload) => Promise<void>;
}

const EMPTY_FORM: CustomerSegmentPayload = {
  industry: '',
  companySize: '',
  priority: '',
};

/** Gộp giá trị hiện có của khách hàng (nếu khác danh mục gợi ý) vào danh sách lựa chọn. */
function buildOptionList(preset: readonly string[], currentValue?: string | null): string[] {
  const trimmed = currentValue?.trim();
  if (trimmed && !preset.includes(trimmed)) {
    return [trimmed, ...preset];
  }
  return [...preset];
}

/**
 * NCL-02-CN-005 (TC-01): Biểu mẫu gán ngành nghề, quy mô công ty và mức độ ưu tiên cho khách hàng.
 */
export default function CustomerSegmentModal({
  isOpen,
  customer,
  onClose,
  onSubmit,
}: CustomerSegmentModalProps) {
  const [formData, setFormData] = useState<CustomerSegmentPayload>(EMPTY_FORM);
  const [errors, setErrors] = useState<CustomerSegmentFormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setFormData({
        industry: customer?.industry ?? '',
        companySize: customer?.companySize ?? '',
        priority: customer?.priority ?? '',
      });
      setErrors({});
      setServerError(null);
      setIsSubmitting(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, customer?.id]);

  if (!isOpen || !customer) return null;

  const companySizeOptions = buildOptionList(COMPANY_SIZE_OPTIONS, customer.companySize);
  const priorityOptions = buildOptionList(CUSTOMER_PRIORITY_OPTIONS, customer.priority);

  const handleChange = (field: keyof CustomerSegmentPayload, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
    if (serverError) {
      setServerError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationErrors = validateCustomerSegment(formData);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsSubmitting(true);
    setServerError(null);

    try {
      await onSubmit(formData);
      onClose();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Đã có lỗi xảy ra khi lưu phân nhóm khách hàng.';
      setServerError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose} data-testid="customer-segment-modal">
      <div
        className="modal-card modal-card--md segment-modal-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="segment-modal-title"
      >
        <div className="modal-header">
          <div>
            <span className="modal-eyebrow">NCL-02-CN-005 · Phân nhóm khách hàng</span>
            <h2 id="segment-modal-title" className="modal-title">
              Gán phân nhóm khách hàng
            </h2>
            <p className="modal-subtitle-text">
              Khách hàng: <strong>{customer.name}</strong> ({customer.code})
            </p>
          </div>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Đóng cửa sổ">
            {ICONS.close}
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="modal-body">
            {serverError && (
              <div className="alert alert--error" role="alert" data-testid="segment-form-server-error">
                <span className="alert__icon">{ICONS.alertTriangle}</span>
                <div>{serverError}</div>
              </div>
            )}

            <div className="form-grid">
              {/* Ngành nghề */}
              <div className="form-field form-field--full">
                <label htmlFor="segment-industry" className="form-label">
                  Ngành nghề <span className="req">*</span>
                </label>
                <input
                  id="segment-industry"
                  type="text"
                  className={`form-input ${errors.industry ? 'form-input--error' : ''}`}
                  placeholder="VD: Công nghệ thông tin, Tài chính, Xây dựng..."
                  value={formData.industry}
                  onChange={(e) => handleChange('industry', e.target.value)}
                  autoFocus
                  disabled={isSubmitting}
                />
                {errors.industry && (
                  <span className="field-error" role="alert">
                    {errors.industry}
                  </span>
                )}
              </div>

              {/* Quy mô công ty */}
              <div className="form-field">
                <label htmlFor="segment-companySize" className="form-label">
                  Quy mô công ty <span className="req">*</span>
                </label>
                <select
                  id="segment-companySize"
                  className={`form-select ${errors.companySize ? 'form-input--error' : ''}`}
                  value={formData.companySize}
                  onChange={(e) => handleChange('companySize', e.target.value)}
                  disabled={isSubmitting}
                >
                  <option value="">-- Chọn quy mô --</option>
                  {companySizeOptions.map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
                {errors.companySize && (
                  <span className="field-error" role="alert">
                    {errors.companySize}
                  </span>
                )}
              </div>

              {/* Mức độ ưu tiên */}
              <div className="form-field">
                <label htmlFor="segment-priority" className="form-label">
                  Mức độ ưu tiên <span className="req">*</span>
                </label>
                <select
                  id="segment-priority"
                  className={`form-select ${errors.priority ? 'form-input--error' : ''}`}
                  value={formData.priority}
                  onChange={(e) => handleChange('priority', e.target.value)}
                  disabled={isSubmitting}
                >
                  <option value="">-- Chọn mức độ ưu tiên --</option>
                  {priorityOptions.map((level) => (
                    <option key={level} value={level}>
                      {level}
                    </option>
                  ))}
                </select>
                {errors.priority && (
                  <span className="field-error" role="alert">
                    {errors.priority}
                  </span>
                )}
                <span className="field-hint">
                  Dùng để ưu tiên nguồn lực chăm sóc và lọc báo cáo theo nhóm khách hàng trọng điểm.
                </span>
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSubmitting}>
              Hủy bỏ
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting}
              data-testid="btn-submit-segment"
            >
              {isSubmitting ? (
                <>
                  <span className="spinner-sm" />
                  <span>Đang lưu...</span>
                </>
              ) : (
                <>
                  <span>✓</span>
                  <span>Lưu phân nhóm</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
