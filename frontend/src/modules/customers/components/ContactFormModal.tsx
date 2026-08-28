import { useState, useEffect } from 'react';
import type { CustomerContactPayload, CustomerContactFormErrors } from '../types/customerTypes';
import { validateCustomerContact } from '../validators/customerValidators';

interface ContactFormModalProps {
  isOpen: boolean;
  customerName?: string;
  onClose: () => void;
  onSubmit: (payload: CustomerContactPayload) => Promise<void>;
}

export default function ContactFormModal({
  isOpen,
  customerName,
  onClose,
  onSubmit,
}: ContactFormModalProps) {
  const [formData, setFormData] = useState<CustomerContactPayload>({
    fullName: '',
    title: '',
    email: '',
    phone: '',
    isPrimary: false,
  });

  const [errors, setErrors] = useState<CustomerContactFormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setFormData({
        fullName: '',
        title: '',
        email: '',
        phone: '',
        isPrimary: false,
      });
      setErrors({});
      setServerError(null);
      setIsSubmitting(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleChange = (
    field: keyof CustomerContactPayload,
    value: string | boolean
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field as keyof CustomerContactFormErrors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
    if (serverError) {
      setServerError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationErrors = validateCustomerContact(formData);
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
        err instanceof Error ? err.message : 'Đã có lỗi xảy ra khi lưu người liên hệ.';
      setServerError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose} data-testid="contact-form-modal">
      <div
        className="modal-card modal-card--md contact-modal-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="contact-modal-title"
      >
        <div className="modal-header">
          <div>
            <span className="modal-eyebrow">NCL-02-CN-003 · Danh bạ khách hàng</span>
            <h2 id="contact-modal-title" className="modal-title">
              Thêm người liên hệ mới
            </h2>
            {customerName && (
              <p className="modal-subtitle-text">
                Khách hàng: <strong>{customerName}</strong>
              </p>
            )}
          </div>
          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            aria-label="Đóng cửa sổ"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="modal-body">
            {serverError && (
              <div className="alert alert--error" role="alert" data-testid="contact-form-server-error">
                <span>⚠️</span>
                <div>{serverError}</div>
              </div>
            )}

            <div className="form-grid">
              {/* Họ tên người liên hệ */}
              <div className="form-field form-field--full">
                <label htmlFor="contact-fullName" className="form-label">
                  Họ và tên người liên hệ <span className="req">*</span>
                </label>
                <input
                  id="contact-fullName"
                  type="text"
                  className={`form-input ${errors.fullName ? 'form-input--error' : ''}`}
                  placeholder="VD: Nguyễn Văn An"
                  value={formData.fullName}
                  onChange={(e) => handleChange('fullName', e.target.value)}
                  autoFocus
                  disabled={isSubmitting}
                />
                {errors.fullName && (
                  <span className="field-error" role="alert">
                    {errors.fullName}
                  </span>
                )}
              </div>

              {/* Chức danh / Vị trí */}
              <div className="form-field">
                <label htmlFor="contact-title" className="form-label">
                  Chức danh / Vị trí
                </label>
                <input
                  id="contact-title"
                  type="text"
                  className={`form-input ${errors.title ? 'form-input--error' : ''}`}
                  placeholder="VD: Giám đốc mua hàng, PM..."
                  value={formData.title || ''}
                  onChange={(e) => handleChange('title', e.target.value)}
                  disabled={isSubmitting}
                />
                {errors.title && (
                  <span className="field-error" role="alert">
                    {errors.title}
                  </span>
                )}
              </div>

              {/* Số điện thoại */}
              <div className="form-field">
                <label htmlFor="contact-phone" className="form-label">
                  Số điện thoại liên lạc
                </label>
                <input
                  id="contact-phone"
                  type="tel"
                  className={`form-input ${errors.phone ? 'form-input--error' : ''}`}
                  placeholder="VD: 0912 345 678"
                  value={formData.phone || ''}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  disabled={isSubmitting}
                />
                {errors.phone && (
                  <span className="field-error" role="alert">
                    {errors.phone}
                  </span>
                )}
              </div>

              {/* Thư điện tử (Email) */}
              <div className="form-field form-field--full">
                <label htmlFor="contact-email" className="form-label">
                  Thư điện tử (Email)
                </label>
                <input
                  id="contact-email"
                  type="email"
                  className={`form-input ${errors.email ? 'form-input--error' : ''}`}
                  placeholder="VD: an.nguyen@congty.vn"
                  value={formData.email || ''}
                  onChange={(e) => handleChange('email', e.target.value)}
                  disabled={isSubmitting}
                />
                {errors.email && (
                  <span className="field-error" role="alert">
                    {errors.email}
                  </span>
                )}
                <span className="field-hint">
                  Dùng để gửi thông báo tự động, trao đổi hợp đồng và biên bản dịch vụ.
                </span>
              </div>

              {/* Checkbox Đặt làm đầu mối chính (TC-01, TC-02) */}
              <div className="form-field form-field--full">
                <label className="primary-contact-checkbox-card">
                  <input
                    type="checkbox"
                    id="contact-isPrimary"
                    checked={formData.isPrimary}
                    onChange={(e) => handleChange('isPrimary', e.target.checked)}
                    disabled={isSubmitting}
                  />
                  <div className="primary-contact-checkbox-label">
                    <div className="primary-contact-badge-title">
                      <span className="badge-star-icon">⭐</span>
                      <strong>Đặt làm Người liên hệ đầu mối chính</strong>
                    </div>
                    <p>
                      Đầu mối chính sẽ luôn hiển thị ở vị trí đầu tiên trong danh bạ. Nếu khách hàng đã có đầu mối chính khác, hệ thống sẽ tự động chuyển người cũ thành đầu mối phụ.
                    </p>
                  </div>
                </label>
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting}
              data-testid="btn-submit-contact"
            >
              {isSubmitting ? (
                <>
                  <span className="spinner-sm" />
                  <span>Đang lưu...</span>
                </>
              ) : (
                <>
                  <span>✓</span>
                  <span>Lưu người liên hệ</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

