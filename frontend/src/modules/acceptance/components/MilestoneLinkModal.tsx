import { useCallback, useEffect, useMemo, useState } from 'react';
import { ICONS } from '../../../components/common/icons';
import ModalPortal from '../../../components/common/ModalPortal';
import { useBackdropClick } from '../../../hooks/useBackdropClick';
import { AcceptanceApiError, linkPaymentMilestone, searchAcceptances } from '../api/acceptanceApi';
import {
  ACCEPTANCE_STATUS_META,
  MILESTONE_STATUS_META,
  type AcceptanceCertificateRes,
  type AcceptanceDetailRes,
  type MilestoneAcceptanceRes,
} from '../types/acceptanceTypes';
import { milestoneStatusAfterLink } from '../utils/milestoneEligibility';

interface Props {
  isOpen: boolean;
  contractId: number;
  milestone: MilestoneAcceptanceRes;
  onClose: () => void;
  onLinked: (updated: AcceptanceDetailRes) => void;
}

function formatAmount(value: number): string {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value);
}

/**
 * NCL-12-CN-003 — Kế toán chọn phiếu nghiệm thu của các dự án thuộc hợp đồng để gắn vào một mốc thanh toán.
 * Mỗi phiếu chỉ gắn một mốc: phiếu đã gắn mốc khác bị khoá lựa chọn. Trước khi xác nhận, màn hình cho biết
 * trạng thái mốc sau khi gắn theo QTN-25 (phiếu đã nghiệm thu → mốc mở lập hóa đơn; chưa → giữ chờ nghiệm thu).
 */
export default function MilestoneLinkModal({ isOpen, contractId, milestone, onClose, onLinked }: Props) {
  const [certificates, setCertificates] = useState<AcceptanceCertificateRes[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const backdrop = useBackdropClick(onClose, submitting);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      setCertificates(await searchAcceptances({ contractId }));
    } catch (err) {
      setCertificates([]);
      setLoadError(err instanceof AcceptanceApiError ? err.message : 'Không tải được danh sách phiếu nghiệm thu.');
    } finally {
      setLoading(false);
    }
  }, [contractId]);

  useEffect(() => {
    if (!isOpen) return;
    setSelectedId(null);
    setSaveError(null);
    void load();
  }, [isOpen, load]);

  const selected = useMemo(() => certificates.find((c) => c.id === selectedId) ?? null, [certificates, selectedId]);

  if (!isOpen) return null;

  const afterStatus = selected ? milestoneStatusAfterLink(milestone.milestoneStatus, selected.status === 'ACCEPTED') : null;

  const handleLink = async () => {
    if (!selected || submitting) return;
    setSubmitting(true);
    setSaveError(null);
    try {
      const updated = await linkPaymentMilestone(selected.id, { contractMilestoneId: milestone.milestoneId });
      onLinked(updated);
    } catch (err) {
      setSaveError(err instanceof AcceptanceApiError ? err.message : 'Không gắn được phiếu vào mốc thanh toán.');
      void load();
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
        aria-labelledby="milestone-link-title"
      >
        <div className="modal-card" style={{ width: 'min(100%, 760px)' }} data-testid="milestone-link-modal">
          <div className="modal-header">
            <div className="modal-header__title-wrap">
              <h3 id="milestone-link-title" className="modal-title">
                <span className="modal-title__icon">{ICONS.link}</span>
                Gắn phiếu nghiệm thu vào mốc
              </h3>
              <p className="field-hint">
                Mốc "{milestone.milestoneName}" · {formatAmount(milestone.amount)} ·{' '}
                {MILESTONE_STATUS_META[milestone.milestoneStatus]?.label ?? milestone.milestoneStatus}
              </p>
            </div>
            <button type="button" className="modal-close" onClick={onClose} disabled={submitting} aria-label="Đóng">
              {ICONS.close}
            </button>
          </div>

          <div className="modal-body">
            {saveError && (
              <div className="alert-box alert-box--danger" role="alert" data-testid="milestone-link-error">
                <span className="alert-box__icon">{ICONS.alertTriangle}</span>
                <div className="alert-box__content">{saveError}</div>
              </div>
            )}

            {loading ? (
              <div className="field-hint" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="spinner-sm" /> Đang tải phiếu nghiệm thu của hợp đồng…
              </div>
            ) : loadError ? (
              <div className="alert-box alert-box--danger" role="alert">
                <span className="alert-box__icon">{ICONS.alertTriangle}</span>
                <div className="alert-box__content">
                  {loadError}{' '}
                  <button type="button" className="btn-link" onClick={() => void load()}>Thử lại</button>
                </div>
              </div>
            ) : certificates.length === 0 ? (
              <div className="table-empty-state" data-testid="milestone-link-empty">
                <div className="table-empty-state__icon">{ICONS.clipboardList}</div>
                <h3>Chưa có phiếu nghiệm thu nào</h3>
                <p>Dự án của hợp đồng này chưa có phiếu nghiệm thu — Quản lý dự án cần lập phiếu trước.</p>
              </div>
            ) : (
              <fieldset style={{ border: 0, margin: 0, padding: 0 }}>
                <legend className="form-label" style={{ marginBottom: '8px' }}>Chọn phiếu nghiệm thu</legend>
                <div className="milestone-link-list">
                  {certificates.map((c) => {
                    const linkedElsewhere = c.contractMilestoneId != null;
                    const status = ACCEPTANCE_STATUS_META[c.status] ?? { label: c.status, badge: 'badge--gray' };
                    return (
                      <label
                        key={c.id}
                        className={`milestone-link-option ${selectedId === c.id ? 'milestone-link-option--selected' : ''} ${linkedElsewhere ? 'milestone-link-option--disabled' : ''}`}
                        data-testid={`milestone-link-option-${c.id}`}
                      >
                        <input
                          type="radio"
                          name="milestone-link-certificate"
                          value={c.id}
                          checked={selectedId === c.id}
                          disabled={linkedElsewhere || submitting}
                          onChange={() => {
                            setSelectedId(c.id);
                            setSaveError(null);
                          }}
                        />
                        <span className="milestone-link-option__body">
                          <span className="milestone-link-option__title">
                            <strong style={{ fontFamily: 'var(--font-mono, monospace)' }}>{c.certificateCode}</strong>
                            <span className={`badge ${status.badge}`}>{status.label}</span>
                          </span>
                          <span className="field-hint">
                            {c.projectCode} · {c.workPackageName} · {c.title} · {formatAmount(c.acceptedValue)}
                          </span>
                          {linkedElsewhere && (
                            <span className="field-hint">Đã gắn mốc "{c.contractMilestoneName}" — gỡ ở mốc đó trước nếu muốn đổi.</span>
                          )}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            )}

            {selected && afterStatus && (
              <div
                className={`alert-box ${afterStatus === 'READY_TO_INVOICE' ? 'alert-box--success' : 'alert-box--warning'}`}
                style={{ marginTop: '14px' }}
                data-testid="milestone-link-preview"
              >
                <span className="alert-box__icon">{afterStatus === 'READY_TO_INVOICE' ? ICONS.checkCircle : ICONS.info}</span>
                <div className="alert-box__content">
                  <strong>
                    Sau khi gắn, mốc sẽ ở trạng thái "{MILESTONE_STATUS_META[afterStatus]?.label ?? afterStatus}"
                  </strong>
                  {afterStatus === 'READY_TO_INVOICE'
                    ? `Phiếu ${selected.certificateCode} đã được khách hàng xác nhận nên mốc đủ điều kiện lập hóa đơn.`
                    : `Phiếu ${selected.certificateCode} chưa được khách hàng xác nhận — mốc chưa lập được hóa đơn và sẽ tự mở ngay khi khách hàng xác nhận phiếu.`}
                </div>
              </div>
            )}

            <div style={{ marginTop: '16px', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-secondary" onClick={onClose} disabled={submitting}>
                Hủy
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={() => void handleLink()}
                disabled={!selected || submitting}
                data-testid="milestone-link-submit"
              >
                {submitting ? 'Đang gắn…' : 'Xác nhận gắn phiếu'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
