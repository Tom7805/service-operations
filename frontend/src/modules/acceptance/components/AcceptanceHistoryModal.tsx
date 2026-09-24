import { useCallback, useEffect, useState } from 'react';
import { ICONS } from '../../../components/common/icons';
import ModalPortal from '../../../components/common/ModalPortal';
import { useBackdropClick } from '../../../hooks/useBackdropClick';
import { AcceptanceApiError, getAcceptance } from '../api/acceptanceApi';
import { ACCEPTANCE_STATUS_META, type AcceptanceDetailRes } from '../types/acceptanceTypes';
import { buildAcceptanceHistory } from '../utils/acceptanceHistory';

interface Props {
  isOpen: boolean;
  certificateId: number | null;
  onClose: () => void;
}

function formatAmount(value: number): string {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value);
}

function formatDateTime(value: string): string {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleString('vi-VN');
}

/**
 * Xem nhanh phiếu nghiệm thu và lịch sử của nó từ màn hình Kế toán (NCL-12-CN-003 TC-04): ai lập, khách hàng
 * xác nhận khi nào, ai gắn phiếu vào mốc thanh toán lúc nào — không cần rời trang hợp đồng.
 */
export default function AcceptanceHistoryModal({ isOpen, certificateId, onClose }: Props) {
  const [certificate, setCertificate] = useState<AcceptanceDetailRes | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const backdrop = useBackdropClick(onClose);

  const load = useCallback(async () => {
    if (certificateId == null) return;
    setLoading(true);
    setError(null);
    try {
      setCertificate(await getAcceptance(certificateId));
    } catch (err) {
      setCertificate(null);
      setError(err instanceof AcceptanceApiError ? err.message : 'Không tải được phiếu nghiệm thu.');
    } finally {
      setLoading(false);
    }
  }, [certificateId]);

  useEffect(() => {
    if (isOpen) void load();
  }, [isOpen, load]);

  if (!isOpen) return null;

  const status = certificate ? ACCEPTANCE_STATUS_META[certificate.status] : null;

  return (
    <ModalPortal>
      <div
        className="modal-backdrop"
        onMouseDown={backdrop.onMouseDown}
        onClick={backdrop.onClick}
        role="dialog"
        aria-modal="true"
        aria-labelledby="acceptance-history-title"
      >
        <div className="modal-card" style={{ width: 'min(100%, 760px)' }} data-testid="acceptance-history-modal">
          <div className="modal-header">
            <div className="modal-header__title-wrap">
              <h3 id="acceptance-history-title" className="modal-title">
                <span className="modal-title__icon">{ICONS.history}</span>
                {certificate ? `Phiếu ${certificate.certificateCode}` : 'Phiếu nghiệm thu'}
              </h3>
              {certificate && (
                <p className="field-hint">
                  {certificate.projectCode} · {certificate.workPackageName} · {formatAmount(certificate.acceptedValue)}
                </p>
              )}
            </div>
            <button type="button" className="modal-close" onClick={onClose} aria-label="Đóng">
              {ICONS.close}
            </button>
          </div>
          <div className="modal-body">
            {loading ? (
              <div className="field-hint" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="spinner-sm" /> Đang tải lịch sử phiếu…
              </div>
            ) : error ? (
              <div className="alert-box alert-box--danger" role="alert">
                <span className="alert-box__icon">{ICONS.alertTriangle}</span>
                <div className="alert-box__content">{error}</div>
              </div>
            ) : certificate && status ? (
              <>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap' }}>
                  <span className={`badge ${status.badge}`}>{status.label}</span>
                  <span className="field-hint">{certificate.title} · lần nộp {certificate.revisionNo}</span>
                </div>
                <div className="table-responsive">
                  <table className="user-data-table" data-testid="acceptance-history-table">
                    <thead>
                      <tr>
                        <th>Thời điểm</th>
                        <th>Người thực hiện</th>
                        <th>Nội dung</th>
                      </tr>
                    </thead>
                    <tbody>
                      {buildAcceptanceHistory(certificate).map((h) => (
                        <tr key={h.key}>
                          <td className="cell-muted" style={{ whiteSpace: 'nowrap' }}>{formatDateTime(h.at)}</td>
                          <td>{h.actor || '—'}</td>
                          <td>
                            <span className={`badge ${h.badge}`}>{h.label}</span>
                            {h.detail && <div className="field-hint" style={{ marginTop: '4px' }}>{h.detail}</div>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="field-hint" style={{ marginTop: '10px' }}>
                  Toàn bộ thao tác (kể cả gỡ phiếu khỏi mốc) được lưu ở Nhật ký hệ thống, loại đối tượng "Nghiệm thu".
                </p>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
