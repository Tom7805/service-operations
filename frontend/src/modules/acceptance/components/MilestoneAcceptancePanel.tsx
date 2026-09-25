import { useCallback, useEffect, useState } from 'react';
import { ICONS } from '../../../components/common/icons';
import ModalPortal from '../../../components/common/ModalPortal';
import { useBackdropClick } from '../../../hooks/useBackdropClick';
import InvoiceFormModal from '../../invoices/components/InvoiceFormModal';
import { AcceptanceApiError, fetchMilestoneAcceptances, unlinkPaymentMilestone } from '../api/acceptanceApi';
import {
  ACCEPTANCE_STATUS_META,
  MILESTONE_STATUS_META,
  type AcceptanceDetailRes,
  type MilestoneAcceptanceRes,
} from '../types/acceptanceTypes';
import { milestoneEligibility } from '../utils/milestoneEligibility';
import AcceptanceHistoryModal from './AcceptanceHistoryModal';
import MilestoneLinkModal from './MilestoneLinkModal';
import { useDialogA11y } from '../../projects/components/deliveryUi';

interface Props {
  contractId: number;
  currentUserRoles?: string[];
  /** Mốc/hóa đơn của hợp đồng vừa đổi (gắn, gỡ, lập hóa đơn) — trang cha nạp lại các khối liên quan. */
  onChanged?: (message: string) => void;
}

function formatAmount(value: number): string {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value);
}

function formatDate(value: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString('vi-VN');
}

const ELIGIBILITY_BADGE = {
  ELIGIBLE: { label: 'Đủ điều kiện', badge: 'badge--green' },
  INVOICED: { label: 'Đã xuất hóa đơn', badge: 'badge--blue' },
  CERTIFICATE_NOT_ACCEPTED: { label: 'Chưa đủ điều kiện', badge: 'badge--red' },
  NO_CERTIFICATE: { label: 'Chưa đủ điều kiện', badge: 'badge--gray' },
} as const;

/**
 * NCL-12-CN-003 — Gắn phiếu nghiệm thu với mốc thanh toán (Kế toán, VT-05), nhúng trong trang chi tiết hợp
 * đồng. Mỗi mốc hiện phiếu đang gắn (dự án, hạng mục, trạng thái phiếu) và lý do đủ/chưa đủ điều kiện lập
 * hóa đơn theo QTN-25. Kế toán gắn / gỡ phiếu (TC-01), lập hóa đơn ngay tại mốc đủ điều kiện — mốc gắn phiếu
 * chưa xác nhận bị chặn lập hóa đơn kèm lý do (TC-02), xem lịch sử phiếu (TC-04).
 */
export default function MilestoneAcceptancePanel({ contractId, currentUserRoles = [], onChanged }: Props) {
  const isAllowed = currentUserRoles.includes('VT-05');
  const [rows, setRows] = useState<MilestoneAcceptanceRes[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const [linkRow, setLinkRow] = useState<MilestoneAcceptanceRes | null>(null);
  const [unlinkRow, setUnlinkRow] = useState<MilestoneAcceptanceRes | null>(null);
  const [invoiceRow, setInvoiceRow] = useState<MilestoneAcceptanceRes | null>(null);
  const [historyId, setHistoryId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      setRows(await fetchMilestoneAcceptances(contractId));
    } catch (err) {
      setRows([]);
      setLoadError(err instanceof AcceptanceApiError ? err.message : 'Không tải được mốc thanh toán và phiếu nghiệm thu.');
    } finally {
      setLoading(false);
    }
  }, [contractId]);

  useEffect(() => {
    if (!isAllowed) {
      setLoading(false);
      return;
    }
    void load();
  }, [isAllowed, load]);

  if (!isAllowed) return null;

  const afterChange = (text: string) => {
    setNotice({ text, type: 'success' });
    void load();
    onChanged?.(text);
  };

  const handleLinked = (updated: AcceptanceDetailRes) => {
    const m = updated.paymentMilestone;
    setLinkRow(null);
    afterChange(
      `Đã gắn phiếu ${updated.certificateCode} vào mốc "${m?.name ?? ''}" — mốc ${
        m ? MILESTONE_STATUS_META[m.status]?.label.toLowerCase() ?? m.status : ''
      }.`
    );
  };

  const readyCount = rows.filter((r) => milestoneEligibility(r).state === 'ELIGIBLE').length;

  return (
    <div className="user-table-card" style={{ marginTop: '20px' }} data-testid="milestone-acceptance-panel">
      <div className="user-table-toolbar">
        <div>
          <h3 style={{ margin: 0, fontSize: '15px' }}>Nghiệm thu theo mốc thanh toán</h3>
          <p className="cell-muted" style={{ margin: '2px 0 0', fontSize: '12.5px' }}>
            Mốc chỉ lập được hóa đơn khi phiếu nghiệm thu gắn kèm đã được khách hàng xác nhận (QTN-25).
            {rows.length > 0 && ` ${readyCount}/${rows.length} mốc đủ điều kiện.`}
          </p>
        </div>
        <button
          type="button"
          className="btn-icon-refresh"
          onClick={() => void load()}
          title="Tải lại"
          aria-label="Tải lại mốc thanh toán và phiếu nghiệm thu"
        >
          {ICONS.refresh}
        </button>
      </div>

      {notice && (
        <div
          className={`alert-box ${notice.type === 'success' ? 'alert-box--success' : 'alert-box--danger'}`}
          role="status"
          style={{ margin: '0 16px 12px' }}
          data-testid="milestone-acceptance-notice"
        >
          <span className="alert-box__icon">{notice.type === 'success' ? ICONS.checkCircle : ICONS.alertTriangle}</span>
          <div className="alert-box__content">{notice.text}</div>
          <button type="button" className="modal-close" onClick={() => setNotice(null)} aria-label="Ẩn thông báo">
            {ICONS.close}
          </button>
        </div>
      )}

      {loading ? (
        <p className="cell-muted" style={{ padding: '16px' }}>Đang tải...</p>
      ) : loadError ? (
        <div className="alert-box alert-box--danger" role="alert" style={{ margin: '0 16px 16px' }}>
          <span className="alert-box__icon">{ICONS.alertTriangle}</span>
          <div className="alert-box__content">
            {loadError}{' '}
            <button type="button" className="btn-link" onClick={() => void load()}>Thử lại</button>
          </div>
        </div>
      ) : rows.length === 0 ? (
        <div className="table-empty-state" data-testid="milestone-acceptance-empty">
          <div className="table-empty-state__icon">{ICONS.calendar}</div>
          <h3>Hợp đồng chưa có mốc thanh toán</h3>
          <p>Khai báo mốc ở khối "Mốc thanh toán" phía trên rồi gắn phiếu nghiệm thu vào từng mốc.</p>
        </div>
      ) : (
        <div className="table-responsive">
          <table className="user-data-table" data-testid="milestone-acceptance-table">
            <thead>
              <tr>
                <th>Mốc thanh toán</th>
                <th>Trạng thái mốc</th>
                <th>Phiếu nghiệm thu gắn kèm</th>
                <th>Điều kiện lập hóa đơn</th>
                <th style={{ textAlign: 'right' }}>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const eligibility = milestoneEligibility(r);
                const eligibilityBadge = ELIGIBILITY_BADGE[eligibility.state];
                const certStatus = r.certificateStatus ? ACCEPTANCE_STATUS_META[r.certificateStatus] : null;
                const milestoneStatus = MILESTONE_STATUS_META[r.milestoneStatus] ?? { label: r.milestoneStatus, badge: 'badge--gray' };
                const locked = r.milestoneStatus === 'INVOICED';
                return (
                  <tr key={r.milestoneId} data-testid={`milestone-acceptance-row-${r.milestoneId}`}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{r.milestoneName}</div>
                      <div className="cell-muted" style={{ fontSize: '12.5px' }}>
                        {formatAmount(r.amount)} · dự kiến {formatDate(r.expectedDate)}
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${milestoneStatus.badge}`}>{milestoneStatus.label}</span>
                    </td>
                    <td>
                      {r.certificateId != null ? (
                        <>
                          <button
                            type="button"
                            className="btn-link"
                            style={{ fontFamily: 'var(--font-mono, monospace)', fontWeight: 600, padding: 0 }}
                            onClick={() => setHistoryId(r.certificateId)}
                            title="Xem phiếu và lịch sử"
                            data-testid={`milestone-acceptance-history-${r.milestoneId}`}
                          >
                            {r.certificateCode}
                          </button>{' '}
                          {certStatus && <span className={`badge ${certStatus.badge}`}>{certStatus.label}</span>}
                          <div className="cell-muted" style={{ fontSize: '12.5px' }}>
                            {r.projectCode} · {r.workPackageName}
                          </div>
                        </>
                      ) : (
                        <span className="cell-muted">Chưa gắn phiếu</span>
                      )}
                    </td>
                    <td style={{ maxWidth: '260px' }}>
                      <span className={`badge ${eligibilityBadge.badge}`}>{eligibilityBadge.label}</span>
                      {eligibility.state !== 'ELIGIBLE' && eligibility.state !== 'INVOICED' && (
                        <div
                          className="cell-muted"
                          style={{ fontSize: '12.5px', marginTop: '4px' }}
                          data-testid={`milestone-acceptance-reason-${r.milestoneId}`}
                        >
                          {eligibility.reason}
                        </div>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                        {r.certificateId == null ? (
                          <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => setLinkRow(r)}
                            disabled={locked}
                            data-testid={`milestone-acceptance-link-${r.milestoneId}`}
                          >
                            <span className="icon-xs">{ICONS.link}</span> Gắn phiếu
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => setUnlinkRow(r)}
                            disabled={locked}
                            title={locked ? 'Mốc đã xuất hóa đơn — không gỡ được phiếu' : undefined}
                            data-testid={`milestone-acceptance-unlink-${r.milestoneId}`}
                          >
                            Gỡ phiếu
                          </button>
                        )}
                        {!locked && (
                          <button
                            type="button"
                            className="btn btn-primary"
                            onClick={() => setInvoiceRow(r)}
                            disabled={eligibility.state !== 'ELIGIBLE'}
                            title={eligibility.state !== 'ELIGIBLE' ? eligibility.reason : 'Lập hóa đơn cho mốc này'}
                            data-testid={`milestone-acceptance-invoice-${r.milestoneId}`}
                          >
                            <span className="icon-xs">{ICONS.receipt}</span> Lập hóa đơn
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {linkRow && (
        <MilestoneLinkModal
          isOpen
          contractId={contractId}
          milestone={linkRow}
          onClose={() => setLinkRow(null)}
          onLinked={handleLinked}
        />
      )}

      {unlinkRow && (
        <UnlinkConfirmModal
          row={unlinkRow}
          onClose={() => setUnlinkRow(null)}
          onUnlinked={(updated) => {
            setUnlinkRow(null);
            afterChange(`Đã gỡ phiếu ${updated.certificateCode} khỏi mốc "${unlinkRow.milestoneName}".`);
          }}
        />
      )}

      {invoiceRow && (
        <InvoiceFormModal
          isOpen
          onClose={() => setInvoiceRow(null)}
          contractId={contractId}
          milestoneId={invoiceRow.milestoneId}
          milestoneName={invoiceRow.milestoneName}
          currentUserRoles={currentUserRoles}
          onSaved={(invoice) => {
            setInvoiceRow(null);
            afterChange(`Đã lập hóa đơn ${invoice.invoiceCode} cho mốc "${invoiceRow.milestoneName}".`);
          }}
        />
      )}

      <AcceptanceHistoryModal isOpen={historyId != null} certificateId={historyId} onClose={() => setHistoryId(null)} />
    </div>
  );
}

/** Xác nhận gỡ phiếu khỏi mốc — mốc đang mở lập hóa đơn sẽ quay về chờ nghiệm thu (mất căn cứ mở mốc). */
function UnlinkConfirmModal({
  row,
  onClose,
  onUnlinked,
}: {
  row: MilestoneAcceptanceRes;
  onClose: () => void;
  onUnlinked: (updated: AcceptanceDetailRes) => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const backdrop = useBackdropClick(onClose, submitting);
  const dialogRef = useDialogA11y(true, onClose, submitting);

  const handleUnlink = async () => {
    if (row.certificateId == null || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      onUnlinked(await unlinkPaymentMilestone(row.certificateId));
    } catch (err) {
      setError(err instanceof AcceptanceApiError ? err.message : 'Không gỡ được phiếu khỏi mốc.');
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
        aria-labelledby="milestone-unlink-title"
      >
        <div ref={dialogRef} className="modal-card dl-modal" style={{ width: 'min(100%, 480px)' }} data-testid="milestone-unlink-modal">
          <div className="modal-header">
            <h3 id="milestone-unlink-title" className="modal-title">
              <span className="modal-title__icon">{ICONS.alertTriangle}</span>
              Gỡ phiếu khỏi mốc
            </h3>
            <button type="button" className="modal-close" onClick={onClose} disabled={submitting} aria-label="Đóng">
              {ICONS.close}
            </button>
          </div>
          <div className="modal-body">
            {error && (
              <div className="alert-box alert-box--danger" role="alert" data-testid="milestone-unlink-error">
                <span className="alert-box__icon">{ICONS.alertTriangle}</span>
                <div className="alert-box__content">{error}</div>
              </div>
            )}
            <p style={{ marginTop: 0 }}>
              Gỡ phiếu <strong>{row.certificateCode}</strong> khỏi mốc <strong>"{row.milestoneName}"</strong>?
            </p>
            {row.milestoneStatus === 'READY_TO_INVOICE' && (
              <div className="alert-box alert-box--warning">
                <span className="alert-box__icon">{ICONS.info}</span>
                <div className="alert-box__content">
                  Mốc đang sẵn sàng xuất hóa đơn sẽ quay về "Chờ nghiệm thu" vì mất căn cứ nghiệm thu.
                </div>
              </div>
            )}
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-secondary" onClick={onClose} disabled={submitting}>
                Hủy
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={() => void handleUnlink()}
                disabled={submitting}
                data-testid="milestone-unlink-submit"
              >
                {submitting ? 'Đang gỡ…' : 'Gỡ phiếu'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
