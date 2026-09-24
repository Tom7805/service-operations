import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { ICONS } from '../../../components/common/icons';
import ModalPortal from '../../../components/common/ModalPortal';
import { useBackdropClick } from '../../../hooks/useBackdropClick';
import { createPayment, PaymentsApiError } from '../api/paymentsApi';
import type { InvoiceDetailRes, PaymentMethod, PaymentRes } from '../types/invoiceTypes';
import { validatePaymentForm } from '../validators/invoiceValidators';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: (payment: PaymentRes) => void;
  invoice: InvoiceDetailRes;
  currentUserRoles?: string[];
}

const METHOD_OPTIONS: Array<{ value: PaymentMethod; label: string }> = [
  { value: 'BANK_TRANSFER', label: 'Chuyển khoản' },
  { value: 'CASH', label: 'Tiền mặt' },
  { value: 'OTHER', label: 'Khác' },
];

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Định dạng chuỗi chữ số thô thành có dấu chấm phân cách hàng nghìn kiểu vi-VN. */
function formatVnAmount(rawDigits: string): string {
  if (!rawDigits) return '';
  return Number(rawDigits).toLocaleString('vi-VN');
}

/**
 * NCL-10-CN-003 — Ghi nhận một khoản khách hàng đã thanh toán cho một hóa đơn.
 * Backend tự tính lại paidAmount/remainingAmount/status (PARTIALLY_PAID nếu còn thiếu,
 * PAID nếu đủ) và trả về ngay trong response, nên không cần gọi lại getInvoice.
 */
export default function PaymentFormModal({ isOpen, onClose, onSaved, invoice, currentUserRoles = [] }: Props) {
  const isAllowed = currentUserRoles.includes('VT-05');
  const [amount, setAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(todayIso());
  const [method, setMethod] = useState<PaymentMethod>('BANK_TRANSFER');
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const backdrop = useBackdropClick(onClose, submitting);

  // Mỗi lần mở modal (kể cả mở lại để ghi đợt thanh toán tiếp theo cho cùng hóa đơn) đều phải
  // xóa sạch dữ liệu của lần ghi trước — nếu không, số tiền/ghi chú cũ vẫn còn nguyên trên form.
  useEffect(() => {
    if (!isOpen) return;
    setAmount('');
    setPaymentDate(todayIso());
    setMethod('BANK_TRANSFER');
    setNote('');
    setErrors({});
    setSaveError(null);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSaveError(null);

    const result = validatePaymentForm({ amount, paymentDate, method }, invoice.remainingAmount);
    setErrors(result.errors);
    if (!result.isValid) return;

    setSubmitting(true);
    try {
      const payment = await createPayment(invoice.id, {
        amount: Number(amount),
        paymentDate,
        method,
        note: note.trim() || null,
      });
      onSaved?.(payment);
      onClose();
    } catch (err) {
      setSaveError(err instanceof PaymentsApiError ? err.message : 'Không thể ghi nhận thanh toán. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ModalPortal>
      <div
        className="modal-backdrop"
        onMouseDown={backdrop.onMouseDown}
        onClick={backdrop.onClick}
        role="dialog"
        aria-modal="true"
        aria-labelledby="payment-form-modal-title"
      >
        <div className="modal-card" style={{ width: 'min(100%, 480px)' }}>
          <div className="modal-header">
            <div className="modal-header__title-wrap">
              <h3 id="payment-form-modal-title" className="modal-title">
                <span className="modal-title__icon">{ICONS.money}</span>
                Ghi nhận thanh toán
              </h3>
              <p className="field-hint">
                {invoice.invoiceCode} · Còn lại {invoice.remainingAmount.toLocaleString('vi-VN')} đ
              </p>
            </div>
            <button type="button" className="modal-close" onClick={onClose} disabled={submitting} aria-label="Đóng">
              {ICONS.close}
            </button>
          </div>

          <div className="modal-body">
            {!isAllowed && (
              <div className="alert-box alert-box--danger">Chức năng yêu cầu vai trò Kế toán (VT-05).</div>
            )}
            {isAllowed && saveError && (
              <div className="alert-box alert-box--danger" role="alert">{saveError}</div>
            )}

            {isAllowed && (
              <form onSubmit={(e) => void handleSubmit(e)}>
                <div className="milestone-field">
                  <label className="form-label" htmlFor="payment-amount">Số tiền (VNĐ)</label>
                  <input
                    id="payment-amount"
                    type="text"
                    inputMode="numeric"
                    className={`form-input ${errors.amount ? 'form-input--error' : ''}`}
                    value={formatVnAmount(amount)}
                    onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))}
                    placeholder="0"
                  />
                  {errors.amount && <span className="field-error">{errors.amount}</span>}
                </div>

                <div className="milestone-grid" style={{ marginTop: '12px' }}>
                  <div className="milestone-field">
                    <label className="form-label" htmlFor="payment-date">Ngày thanh toán</label>
                    <input
                      id="payment-date"
                      type="date"
                      className={`form-input ${errors.paymentDate ? 'form-input--error' : ''}`}
                      value={paymentDate}
                      onChange={(e) => setPaymentDate(e.target.value)}
                    />
                    {errors.paymentDate && <span className="field-error">{errors.paymentDate}</span>}
                  </div>
                  <div className="milestone-field">
                    <label className="form-label" htmlFor="payment-method">Phương thức</label>
                    <select
                      id="payment-method"
                      className="form-input"
                      value={method}
                      onChange={(e) => setMethod(e.target.value as PaymentMethod)}
                    >
                      {METHOD_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="milestone-field" style={{ marginTop: '12px' }}>
                  <label className="form-label" htmlFor="payment-note">Ghi chú</label>
                  <input
                    id="payment-note"
                    className="form-input"
                    placeholder="Không bắt buộc"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                  />
                </div>

                <div style={{ marginTop: '16px', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                  <button type="button" className="btn" onClick={onClose} disabled={submitting}>
                    Hủy
                  </button>
                  <button type="submit" className="btn-primary" disabled={submitting}>
                    {submitting ? 'Đang lưu…' : 'Ghi nhận thanh toán'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
