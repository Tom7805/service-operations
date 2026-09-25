import { useCallback, useEffect, useState } from 'react';
import { ICONS } from '../../../components/common/icons';
import ModalPortal from '../../../components/common/ModalPortal';
import { useBackdropClick } from '../../../hooks/useBackdropClick';
import type { AuditLogEntry } from '../../auditLog/types/auditLogTypes';
import { roleLabel } from '../../../utils/roleLabel';
import { fetchPortalAccountHistory } from '../api/portalAccountApi';
import { CONTACT_ROLE_LABEL, type ContactRole, type PortalAccountRes } from '../types/portalAccountTypes';
import PortalAccountStatusBadge from './PortalAccountStatusBadge';

interface Props {
  account: PortalAccountRes;
  onClose: () => void;
  onToggleStatus: (account: PortalAccountRes) => void;
  /** Tăng mỗi khi trang đổi dữ liệu tài khoản — để nạp lại lịch sử. */
  refreshKey?: number;
}

export function formatDateTime(value?: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleString('vi-VN');
}

function actionTone(action: string): string {
  if (action.startsWith('Khóa')) return 'badge--red';
  if (action.startsWith('Mở khóa')) return 'badge--green';
  return 'badge--blue';
}

/**
 * Chi tiết một tài khoản cổng + lịch sử thao tác quản trị (TC-04): mỗi lần cấp/khoá/mở khoá hiện người thực hiện,
 * nội dung và thời điểm — đọc từ Nhật ký hệ thống (lưu trên máy chủ), không phải dữ liệu tạm trên trình duyệt.
 */
export default function PortalAccountDetailModal({ account, onClose, onToggleStatus, refreshKey = 0 }: Props) {
  const [history, setHistory] = useState<AuditLogEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const backdrop = useBackdropClick(onClose);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      setHistory(await fetchPortalAccountHistory(account.id));
    } catch (err) {
      setHistory([]);
      setHistoryError(err instanceof Error && err.message ? err.message : 'Không tải được lịch sử thao tác.');
    } finally {
      setHistoryLoading(false);
    }
  }, [account.id]);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory, refreshKey]);

  const locked = account.status === 'LOCKED';

  return (
    <ModalPortal>
      <div
        className="modal-backdrop"
        onMouseDown={backdrop.onMouseDown}
        onClick={backdrop.onClick}
        role="dialog"
        aria-modal="true"
        aria-labelledby="portal-detail-title"
      >
        <div
          className="modal-card"
          style={{ width: 'min(100%, 720px)' }}
          onClick={(e) => e.stopPropagation()}
          data-testid="portal-detail-modal"
        >
          <div className="modal-header">
            <div className="portal-modal-heading">
              <h3 id="portal-detail-title" className="modal-title">
                <span className="modal-title__icon">{ICONS.user}</span>
                Tài khoản cổng @{account.username}
              </h3>
              <p className="field-hint">
                {account.customerCode} · {account.customerName}
              </p>
            </div>
            <button type="button" className="modal-close" onClick={onClose} aria-label="Đóng">
              {ICONS.close}
            </button>
          </div>
          <div className="modal-body">
            <dl className="portal-detail-grid">
              <div>
                <dt>Trạng thái</dt>
                <dd>
                  <PortalAccountStatusBadge status={account.status} />
                </dd>
              </div>
              <div>
                <dt>Họ tên</dt>
                <dd>{account.fullName}</dd>
              </div>
              <div>
                <dt>Email khôi phục</dt>
                <dd>{account.email || '—'}</dd>
              </div>
              <div>
                <dt>Khách hàng</dt>
                <dd>
                  {account.customerCode} · {account.customerName}
                </dd>
              </div>
              <div>
                <dt>Người liên hệ</dt>
                <dd>
                  {account.contactName ?? '—'}
                  {account.contactTitle ? ` · ${account.contactTitle}` : ''}
                  {account.contactRole && (
                    <span className="cell-muted"> ({CONTACT_ROLE_LABEL[account.contactRole as ContactRole] ?? account.contactRole})</span>
                  )}
                </dd>
              </div>
              <div>
                <dt>Vai trò / phạm vi</dt>
                <dd>Khách hàng (VT-09) · chỉ dữ liệu của khách hàng này</dd>
              </div>
              <div>
                <dt>Cấp bởi</dt>
                <dd>
                  {account.createdBy || '—'} · {formatDateTime(account.createdAt)}
                </dd>
              </div>
              <div>
                <dt>Đổi trạng thái gần nhất</dt>
                <dd>
                  {account.statusChangedAt
                    ? `${account.statusChangedBy ?? '—'} · ${formatDateTime(account.statusChangedAt)}`
                    : 'Chưa đổi lần nào'}
                </dd>
              </div>
              {account.statusReason && (
                <div className="portal-detail-grid__full">
                  <dt>Lý do</dt>
                  <dd>{account.statusReason}</dd>
                </div>
              )}
            </dl>

            <div className="portal-history">
              <div className="portal-history__head">
                <h4>
                  <span className="icon-xs">{ICONS.history}</span> Lịch sử thao tác
                </h4>
                <button
                  type="button"
                  className="btn-icon-refresh"
                  onClick={() => void loadHistory()}
                  title="Tải lại lịch sử"
                  aria-label="Tải lại lịch sử"
                >
                  {ICONS.refresh}
                </button>
              </div>
              {historyLoading ? (
                <p className="field-hint">Đang tải lịch sử...</p>
              ) : historyError ? (
                <div className="alert-box alert-box--danger" role="alert">
                  <span className="alert-box__icon">{ICONS.alertTriangle}</span>
                  <div className="alert-box__content">{historyError}</div>
                </div>
              ) : history.length === 0 ? (
                <p className="field-hint">Chưa có thao tác nào được ghi nhận cho tài khoản này.</p>
              ) : (
                <ol className="portal-history__list" data-testid="portal-detail-history">
                  {history.map((entry) => (
                    <li key={entry.id} className="portal-history__item">
                      <div className="portal-history__line">
                        <span className={`badge ${actionTone(entry.action)}`}>{entry.action}</span>
                        <span className="cell-muted">{formatDateTime(entry.performedAt)}</span>
                      </div>
                      <div className="portal-history__actor">
                        {entry.actorUsername ?? 'Hệ thống'}
                        {entry.actorRole ? ` · ${roleLabel(entry.actorRole)}` : ''}
                      </div>
                      {entry.detail && <div className="portal-history__detail">{entry.detail}</div>}
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Đóng
            </button>
            <button
              type="button"
              className={`btn-primary ${locked ? 'btn-success' : 'btn-danger'}`}
              onClick={() => onToggleStatus(account)}
              data-testid="portal-detail-toggle"
            >
              <span className="icon-xs">{locked ? ICONS.unlock : ICONS.lock}</span>{' '}
              {locked ? 'Mở khóa tài khoản' : 'Khóa tài khoản'}
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
