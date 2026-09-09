import { useState, useEffect, useCallback } from 'react';
import { ICONS } from '../../../components/common/icons';
import type { ContractExpiryAlertRes } from '../types/contractTypes';
import { fetchExpiringContracts, ContractsApiError } from '../api/contractsApi';

export interface ContractExpiryReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserRoles?: string[];
  initialDays?: number;
}

const PRESET_DAYS = [15, 30, 60, 90] as const;

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

export default function ContractExpiryReminderModal({
  isOpen,
  onClose,
  currentUserRoles = ['VT-05'],
  initialDays = 30,
}: ContractExpiryReminderModalProps) {
  // NCL-04-CN-006 (TC-03): Chỉ Kế toán (VT-05) được phép xem danh sách nhắc hợp đồng sắp hết hạn.
  const isAllowed = currentUserRoles.includes('VT-05');

  const [days, setDays] = useState<number>(initialDays);
  const [daysInput, setDaysInput] = useState<string>(String(initialDays));
  const [contracts, setContracts] = useState<ContractExpiryAlertRes[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const loadContracts = useCallback(async (targetDays: number) => {
    if (!isAllowed) return;
    if (targetDays < 0) {
      setValidationError('Số ngày rà soát không được âm.');
      return;
    }
    setValidationError(null);
    setServerError(null);
    setIsLoading(true);

    try {
      const data = await fetchExpiringContracts(targetDays);
      setContracts(data);
    } catch (err) {
      setServerError(
        err instanceof ContractsApiError
          ? err.message
          : 'Không thể tải danh sách hợp đồng sắp hết hạn. Vui lòng thử lại.'
      );
    } finally {
      setIsLoading(false);
    }
  }, [isAllowed]);

  useEffect(() => {
    if (isOpen && isAllowed) {
      void loadContracts(days);
    }
  }, [isOpen, isAllowed, days, loadContracts]);

  if (!isOpen) return null;

  const handleSelectPreset = (preset: number) => {
    setValidationError(null);
    setDays(preset);
    setDaysInput(String(preset));
  };

  const handleApplyCustomDays = (e?: React.FormEvent | React.MouseEvent) => {
    if (e && e.preventDefault) e.preventDefault();
    const val = daysInput.trim();
    const parsed = parseInt(val, 10);
    if (!val || isNaN(parsed) || parsed < 0) {
      setValidationError('Số ngày rà soát không được âm.');
      return;
    }
    setValidationError(null);
    setDays(parsed);
  };

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-card contract-modal-card" style={{ width: 'min(100%, 780px)' }}>
        <div className="modal-header">
          <div className="modal-header__title-wrap">
            <h3 className="modal-title">
              <span className="modal-title__icon">{ICONS.clock}</span>
              Nhắc hợp đồng sắp hết hiệu lực
            </h3>
            <p className="field-hint">
              Danh sách các hợp đồng đang hiệu lực (ACTIVE) sắp đến ngày kết thúc, hỗ trợ kế toán chủ động gia hạn.
            </p>
          </div>
          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            aria-label="Đóng"
          >
            {ICONS.close}
          </button>
        </div>

        <div className="modal-body">
          {!isAllowed ? (
            <div className="alert-box alert-box--danger" role="alert">
              <span className="alert-box__icon">{ICONS.alertTriangle}</span>
              <div className="alert-box__content">
                <strong>Từ chối truy cập</strong>
                <p>Chức năng yêu cầu vai trò Kế toán (VT-05).</p>
              </div>
            </div>
          ) : (
            <>
              {/* Bộ lọc khoảng thời gian rà soát */}
              <div className="expiry-filter-bar">
                <div className="expiry-filter-pills">
                  <span style={{ fontSize: '13px', color: '#5B5A57', marginRight: '4px' }}>
                    Khung thời gian:
                  </span>
                  {PRESET_DAYS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      className={`expiry-pill-btn ${days === preset ? 'expiry-pill-btn--active' : ''}`}
                      onClick={() => handleSelectPreset(preset)}
                    >
                      {preset} ngày
                    </button>
                  ))}
                </div>

                <form onSubmit={handleApplyCustomDays} className="expiry-days-input-wrap">
                  <label htmlFor="custom-days-input" style={{ fontSize: '13px', color: '#5B5A57' }}>
                    Tùy chỉnh:
                  </label>
                  <input
                    id="custom-days-input"
                    type="number"
                    min="0"
                    className="expiry-days-input"
                    value={daysInput}
                    onChange={(e) => setDaysInput(e.target.value)}
                    aria-label="Số ngày rà soát"
                  />
                  <span style={{ fontSize: '13px', color: '#5B5A57' }}>ngày</span>
                  <button
                    type="submit"
                    className="btn btn-secondary btn-sm"
                    style={{ padding: '4px 10px' }}
                    onClick={handleApplyCustomDays}
                  >
                    Áp dụng
                  </button>
                </form>
              </div>

              {validationError && (
                <div className="alert-box alert-box--danger" role="alert" style={{ marginBottom: '12px' }}>
                  <span className="alert-box__icon">{ICONS.alertTriangle}</span>
                  <div className="alert-box__content">{validationError}</div>
                </div>
              )}

              {serverError && (
                <div className="alert-box alert-box--danger" role="alert" style={{ marginBottom: '12px' }}>
                  <span className="alert-box__icon">{ICONS.alertTriangle}</span>
                  <div className="alert-box__content">{serverError}</div>
                </div>
              )}

              {isLoading ? (
                <div className="table-loading-state" role="status">
                  <div className="spinner-sm" style={{ width: '24px', height: '24px', borderWidth: '3px' }} />
                  <p>Đang tải danh sách hợp đồng sắp hết hạn...</p>
                </div>
              ) : contracts.length === 0 ? (
                /* TC-02: Trạng thái không có hợp đồng nào sắp hết hạn */
                <div className="expiry-empty-state" data-testid="expiry-empty-state">
                  <span className="expiry-empty-state__icon">{ICONS.checkCircle}</span>
                  <p style={{ fontWeight: 600, color: '#2E7D32', margin: '4px 0' }}>
                    Không có hợp đồng nào sắp hết hiệu lực trong vòng {days} ngày tới.
                  </p>
                  <p style={{ fontSize: '13px', color: '#6B6966', margin: 0 }}>
                    Tất cả hợp đồng đang hiệu lực đều có thời hạn vượt quá mốc thời gian này.
                  </p>
                </div>
              ) : (
                /* TC-01: Bảng danh sách hợp đồng sắp hết hạn */
                <div className="table-responsive">
                  <table className="user-data-table" data-testid="expiring-contracts-table">
                    <thead>
                      <tr>
                        <th style={{ width: '50px', textAlign: 'center' }}>#</th>
                        <th style={{ width: '130px' }}>Mã hợp đồng</th>
                        <th>Tên hợp đồng</th>
                        <th style={{ width: '120px' }}>Ngày hết hạn</th>
                        <th style={{ width: '150px', textAlign: 'center' }}>Thời hạn còn lại</th>
                      </tr>
                    </thead>
                    <tbody>
                      {contracts.map((c, index) => {
                        const isUrgent = c.daysRemaining <= 7;
                        const isWarning = c.daysRemaining > 7 && c.daysRemaining <= 15;
                        const badgeClass = isUrgent
                          ? 'expiry-badge--urgent'
                          : isWarning
                          ? 'expiry-badge--warning'
                          : 'expiry-badge--info';

                        return (
                          <tr key={c.contractId}>
                            <td style={{ textAlign: 'center', color: '#6B6966' }}>{index + 1}</td>
                            <td>
                              <span style={{ fontWeight: 500, fontFamily: 'monospace' }}>
                                {c.contractCode}
                              </span>
                            </td>
                            <td>
                              <span style={{ fontWeight: 500 }}>{c.name}</span>
                            </td>
                            <td>{formatDate(c.endDate)}</td>
                            <td style={{ textAlign: 'center' }}>
                              <span className={`expiry-badge ${badgeClass}`}>
                                <span className="icon-xs">{isUrgent ? ICONS.alertTriangle : ICONS.clock}</span>
                                {c.daysRemaining === 0 ? 'Hết hạn hôm nay' : `Còn ${c.daysRemaining} ngày`}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>

        <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', padding: '12px 24px' }}>
          <button type="button" className="btn" onClick={onClose}>
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
