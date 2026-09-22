import { useState } from 'react';
import type { FormEvent } from 'react';
import { ICONS } from '../../../components/common/icons';
import ModalPortal from '../../../components/common/ModalPortal';
import { useBackdropClick } from '../../../hooks/useBackdropClick';
import { createInvoiceFromMilestone, InvoicesApiError } from '../api/invoicesApi';
import type { InvoiceRes } from '../types/invoiceTypes';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: (invoice: InvoiceRes) => void;
  contractId: number;
  milestoneId: number;
  milestoneName?: string;
  currentUserRoles?: string[];
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function plusDaysIso(iso: string, days: number): string {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * NCL-10-CN-002 — Lập hóa đơn từ một mốc thanh toán hợp đồng ở trạng thái
 * READY_TO_INVOICE. Đây là nơi DUY NHẤT gọi được `POST .../invoice` — backend chặn
 * mọi cách khác chuyển mốc sang INVOICED (xem ContractMilestonesModal.tsx), nên
 * modal này chính là mắt xích còn thiếu khiến trước đây không ai xuất được hóa đơn.
 * Cả ba trường đều tuỳ chọn — để trống hết vẫn lập được hóa đơn với giá trị mặc định.
 */
export default function InvoiceFormModal({
  isOpen,
  onClose,
  onSaved,
  contractId,
  milestoneId,
  milestoneName,
  currentUserRoles = [],
}: Props) {
  const isAllowed = currentUserRoles.includes('VT-05');
  const [invoiceDate, setInvoiceDate] = useState(todayIso());
  const [dueDate, setDueDate] = useState(plusDaysIso(todayIso(), 30));
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const backdrop = useBackdropClick(onClose, submitting);

  if (!isOpen) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSaveError(null);
    setSubmitting(true);
    try {
      const invoice = await createInvoiceFromMilestone(contractId, milestoneId, {
        invoiceDate: invoiceDate || null,
        dueDate: dueDate || null,
        note: note.trim() || null,
      });
      onSaved?.(invoice);
      onClose();
    } catch (err) {
      setSaveError(err instanceof InvoicesApiError ? err.message : 'Không thể lập hóa đơn. Vui lòng thử lại.');
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
        aria-labelledby="invoice-form-modal-title"
      >
        <div className="modal-card" style={{ width: 'min(100%, 480px)' }}>
          <div className="modal-header">
            <div className="modal-header__title-wrap">
              <h3 id="invoice-form-modal-title" className="modal-title">
                <span className="modal-title__icon">{ICONS.receipt}</span>
                Lập hóa đơn
              </h3>
              {milestoneName && <p className="field-hint">Mốc: {milestoneName}</p>}
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
                <div className="milestone-grid">
                  <div className="milestone-field">
                    <label className="form-label" htmlFor="invoice-date">Ngày hóa đơn</label>
                    <input
                      id="invoice-date"
                      type="date"
                      className="form-input"
                      value={invoiceDate}
                      onChange={(e) => setInvoiceDate(e.target.value)}
                    />
                  </div>
                  <div className="milestone-field">
                    <label className="form-label" htmlFor="invoice-due-date">Hạn thanh toán</label>
                    <input
                      id="invoice-due-date"
                      type="date"
                      className="form-input"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                    />
                  </div>
                </div>
                <div className="milestone-field" style={{ marginTop: '12px' }}>
                  <label className="form-label" htmlFor="invoice-note">Ghi chú</label>
                  <input
                    id="invoice-note"
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
                    {submitting ? 'Đang lập…' : 'Lập hóa đơn'}
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
