import { useEffect, useState, useCallback } from 'react';
import { ICONS } from '../../../components/common/icons';
import ModalPortal from '../../../components/common/ModalPortal';
import type { ContractRes, RenewalRes } from '../types/contractTypes';
import { createRenewal, fetchRenewals, ContractsApiError } from '../api/contractsApi';
import { validateRenewalForm } from '../validators/contractValidators';

export interface RenewalModalProps {
  contract: ContractRes;
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
  currentUserRoles?: string[];
}

function formatDate(d?: string | null): string {
  if (!d) return '—';
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return d;
  return date.toLocaleDateString('vi-VN');
}

function formatAmount(amount?: number | null): string {
  if (amount === null || amount === undefined) return '—';
  return `${amount.toLocaleString('vi-VN')} đ`;
}

export default function RenewalModal({
  contract,
  isOpen,
  onClose,
  onSaved,
  currentUserRoles = ['VT-04'],
}: RenewalModalProps) {
  const isAllowed = currentUserRoles.includes('VT-04');
  const isActive = contract.status === 'ACTIVE';

  const [newEndDate, setNewEndDate] = useState('');
  const [additionalValue, setAdditionalValue] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Lịch sử gia hạn
  const [renewals, setRenewals] = useState<RenewalRes[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  const loadHistory = useCallback(async () => {
    if (!contract.id || !isAllowed) return;
    setIsLoadingHistory(true);
    setHistoryError(null);
    try {
      const data = await fetchRenewals(contract.id);
      setRenewals(data);
    } catch (err) {
      setHistoryError(
        err instanceof ContractsApiError ? err.message : 'Không thể tải lịch sử gia hạn.'
      );
    } finally {
      setIsLoadingHistory(false);
    }
  }, [contract.id, isAllowed]);

  useEffect(() => {
    if (isOpen) {
      setNewEndDate('');
      setAdditionalValue('');
      setNotes('');
      setErrors({});
      setServerError(null);
      void loadHistory();
    }
  }, [isOpen, loadHistory]);

  if (!isOpen) return null;

  // Tính toán giá trị xem trước
  const additionalNum = additionalValue === '' ? 0 : Number(additionalValue);
  const safeAdditional = Number.isNaN(additionalNum) || additionalNum < 0 ? 0 : additionalNum;
  const previewValueAfter = (contract.totalValue || 0) + safeAdditional;
  const isExceedingLimit =
    Boolean(contract.limitValue && contract.limitValue > 0 && previewValueAfter > contract.limitValue);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAllowed) return;

    if (!isActive) {
      setServerError('Chỉ gia hạn được hợp đồng đang còn hiệu lực (ACTIVE); hợp đồng đã đóng vui lòng lập hợp đồng mới');
      return;
    }

    const validation = validateRenewalForm(
      { newEndDate, additionalValue, notes },
      contract.endDate,
      contract.totalValue,
      contract.limitValue
    );

    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    setSubmitting(true);
    setServerError(null);

    try {
      await createRenewal(contract.id, {
        newEndDate: newEndDate.trim(),
        additionalValue: additionalValue === '' ? null : Number(additionalValue),
        notes: notes.trim() || null,
      });
      onSaved?.();
      onClose();
    } catch (err) {
      setServerError(
        err instanceof ContractsApiError ? err.message : 'Không thể gia hạn hợp đồng. Vui lòng thử lại.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ModalPortal>
      <div
        className="modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="renewal-modal-title"
    >
      <div className="modal-card renewal-modal-card">
        <div className="modal-header">
          <div className="modal-header__title-wrap">
            <h3 id="renewal-modal-title" className="modal-title">
              <span className="modal-title__icon">{ICONS.refresh}</span>
              Gia hạn hợp đồng
            </h3>
            <p className="field-hint">
              {contract.contractCode} · {contract.name} · Trạng thái:{' '}
              <strong style={{ color: isActive ? '#15803D' : '#6B7280' }}>{contract.status}</strong>
            </p>
          </div>
          <button type="button" className="modal-close" onClick={onClose} disabled={submitting} aria-label="Đóng">
            {ICONS.close}
          </button>
        </div>

        <div className="modal-body" style={{ overflowY: 'auto' }}>
          {/* Kiểm tra vai trò VT-04 (TC-04) */}
          {!isAllowed && (
            <div className="alert-box alert-box--danger" role="alert">
              Yêu cầu vai trò Nhân viên kinh doanh (VT-04).
            </div>
          )}

          {/* Kiểm tra trạng thái hợp đồng đã đóng (TC-02) */}
          {isAllowed && !isActive && (
            <div className="alert-box alert-box--warning" role="alert" data-testid="renewal-inactive-alert">
              Chỉ gia hạn được hợp đồng đang còn hiệu lực (ACTIVE); hợp đồng đã đóng vui lòng lập hợp đồng mới.
            </div>
          )}

          {serverError && (
            <div className="alert-box alert-box--danger" role="alert">
              {serverError}
            </div>
          )}

          {/* Biểu mẫu gia hạn hợp đồng (chỉ hiển thị khi là VT-04 và hợp đồng ACTIVE) */}
          {isAllowed && isActive && (
            <form onSubmit={handleSubmit} noValidate data-testid="renewal-form">
              <div className="form-group">
                <label className="form-label" htmlFor="renewal-new-end-date">
                  Ngày kết thúc mới <span className="field-required">*</span>
                </label>
                <input
                  id="renewal-new-end-date"
                  name="newEndDate"
                  type="date"
                  className={`form-input ${errors.newEndDate ? 'form-input--error' : ''}`}
                  value={newEndDate}
                  onChange={(e) => {
                    setNewEndDate(e.target.value);
                    if (errors.newEndDate) setErrors((prev) => ({ ...prev, newEndDate: '' }));
                  }}
                  aria-label="Ngày kết thúc mới"
                  disabled={submitting}
                />
                <small className="field-hint">
                  Ngày kết thúc hiện tại: <strong>{formatDate(contract.endDate)}</strong> (ngày mới phải sau ngày này)
                </small>
                {errors.newEndDate && <small className="field-error">{errors.newEndDate}</small>}
              </div>

              <div className="form-group" style={{ marginTop: '12px' }}>
                <label className="form-label" htmlFor="renewal-additional-value">
                  Giá trị bổ sung (VNĐ)
                </label>
                <input
                  id="renewal-additional-value"
                  name="additionalValue"
                  type="number"
                  className={`form-input ${errors.additionalValue ? 'form-input--error' : ''}`}
                  value={additionalValue}
                  onChange={(e) => {
                    setAdditionalValue(e.target.value);
                    if (errors.additionalValue) setErrors((prev) => ({ ...prev, additionalValue: '' }));
                  }}
                  placeholder="0 (để trống hoặc 0 nếu giữ nguyên)"
                  aria-label="Giá trị bổ sung"
                  disabled={submitting}
                />
                <small className="field-hint">
                  Giá trị hiện tại: <strong>{formatAmount(contract.totalValue)}</strong>
                  {contract.limitValue ? ` · Hạn mức trần: ${formatAmount(contract.limitValue)}` : ''}
                </small>
                {errors.additionalValue && <small className="field-error">{errors.additionalValue}</small>}
              </div>

              {/* Thẻ xem trước kết quả gia hạn */}
              <div className="renewal-preview-card" data-testid="renewal-preview-card">
                <div className="renewal-preview-row">
                  <span>Ngày kết thúc sau gia hạn:</span>
                  <strong>{newEndDate ? formatDate(newEndDate) : '(chưa chọn)'}</strong>
                </div>
                <div className="renewal-preview-row">
                  <span>Giá trị bổ sung:</span>
                  <span>{safeAdditional > 0 ? `+ ${formatAmount(safeAdditional)}` : '0 đ (giữ nguyên)'}</span>
                </div>
                <div className="renewal-preview-row renewal-preview-row--highlight">
                  <span>Tổng giá trị hợp đồng mới:</span>
                  <span style={{ color: isExceedingLimit ? '#DC2626' : '#111827' }}>
                    {formatAmount(previewValueAfter)}
                  </span>
                </div>
                {isExceedingLimit && (
                  <small style={{ color: '#DC2626', fontSize: '12.5px' }}>
                    ⚠️ Cảnh báo: Tổng giá trị vượt hạn mức quy định ({formatAmount(contract.limitValue)}).
                  </small>
                )}
              </div>

              <div className="form-group" style={{ marginTop: '12px' }}>
                <label className="form-label" htmlFor="renewal-notes">
                  Ghi chú lý do gia hạn
                </label>
                <textarea
                  id="renewal-notes"
                  name="notes"
                  className="form-input"
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Nhập lý do gia hạn (ví dụ: Khách hàng đồng ý tiếp tục hợp tác thêm 6 tháng)..."
                  aria-label="Ghi chú lý do gia hạn"
                  disabled={submitting}
                />
              </div>

              <div style={{ marginTop: '18px', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={onClose} disabled={submitting}>
                  Hủy
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting || !isAllowed}
                  data-testid="btn-submit-renewal"
                >
                  {submitting ? 'Đang lưu…' : 'Xác nhận gia hạn'}
                </button>
              </div>
            </form>
          )}

          {/* Lịch sử các lần gia hạn (TC-04) */}
          {isAllowed && (
            <div className="renewal-history-wrap">
              <h4 className="renewal-history-title">
                <span className="icon-sm">{ICONS.history}</span>
                Lịch sử gia hạn ({renewals.length})
              </h4>

              {isLoadingHistory && <p className="cell-muted">Đang tải lịch sử gia hạn...</p>}
              {historyError && <p className="field-error">{historyError}</p>}

              {!isLoadingHistory && !historyError && renewals.length === 0 && (
                <p className="cell-muted" style={{ fontStyle: 'italic', fontSize: '13.5px' }}>
                  Chưa có lần gia hạn nào cho hợp đồng này.
                </p>
              )}

              {!isLoadingHistory && renewals.length > 0 && (
                <div className="table-responsive">
                  <table className="user-data-table" style={{ fontSize: '13px' }} data-testid="renewal-history-table">
                    <thead>
                      <tr>
                        <th style={{ width: '130px' }}>Thời điểm</th>
                        <th style={{ width: '110px' }}>Người tạo</th>
                        <th style={{ whiteSpace: 'nowrap' }}>Ngày kết thúc (cũ → mới)</th>
                        <th style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>Cộng thêm</th>
                        <th style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>Giá trị HĐ (trước → sau)</th>
                        <th>Ghi chú</th>
                      </tr>
                    </thead>
                    <tbody>
                      {renewals.map((r) => (
                        <tr key={r.id}>
                          <td>{r.createdAt ? new Date(r.createdAt).toLocaleString('vi-VN') : '—'}</td>
                          <td>{r.createdBy || '—'}</td>
                          <td style={{ whiteSpace: 'nowrap', lineHeight: 1.3 }}>
                            <div className="cell-muted" style={{ fontSize: '11.5px' }}>{formatDate(r.previousEndDate)}</div>
                            <strong>{formatDate(r.newEndDate)}</strong>
                          </td>
                          <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                            {r.additionalValue && r.additionalValue > 0
                              ? `+${formatAmount(r.additionalValue)}`
                              : '0 đ'}
                          </td>
                          <td style={{ textAlign: 'right', whiteSpace: 'nowrap', lineHeight: 1.3 }}>
                            <div className="cell-muted" style={{ fontSize: '11.5px' }}>{formatAmount(r.valueBefore)}</div>
                            <strong>{formatAmount(r.valueAfter)}</strong>
                          </td>
                          <td>{r.notes || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      </div>
    </ModalPortal>
  );
}
