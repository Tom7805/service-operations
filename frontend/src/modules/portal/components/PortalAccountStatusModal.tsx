import { FormEvent, useEffect, useState } from 'react';
import { ICONS } from '../../../components/common/icons';
import ModalPortal from '../../../components/common/ModalPortal';
import { useBackdropClick } from '../../../hooks/useBackdropClick';
import { PortalAccountApiError, updatePortalAccountStatus } from '../api/portalAccountApi';
import { PORTAL_REASON_MAX, type PortalAccountRes } from '../types/portalAccountTypes';
import { validateStatusReason } from '../validators/portalAccountValidators';

interface Props {
  account: PortalAccountRes;
  onClose: () => void;
  onChanged: (account: PortalAccountRes) => void;
  /** Trạng thái trên máy chủ đã khác màn hình (INVALID_STATE) — trang nạp lại danh sách. */
  onStale?: () => void;
}

const LOCK_REASONS = [
  'Người liên hệ đã nghỉ việc ở phía khách hàng',
  'Khách hàng yêu cầu tạm ngưng truy cập',
  'Nghi ngờ lộ thông tin đăng nhập',
];

/**
 * NCL-13-CN-001 (TC-02) — khoá tài khoản cổng (vd người liên hệ đã nghỉ việc) hoặc mở lại. Khoá làm tài khoản không
 * đăng nhập được và đăng xuất ngay mọi phiên đang mở; mọi dữ liệu (tài khoản, liên kết khách hàng, lịch sử duyệt phiếu)
 * được giữ nguyên.
 */
export default function PortalAccountStatusModal({ account, onClose, onChanged, onStale }: Props) {
  const locking = account.status !== 'LOCKED';
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState<string | undefined>();
  const [saveError, setSaveError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setReason('');
    setReasonError(undefined);
    setSaveError(null);
  }, [account.id, account.status]);

  const handleClose = () => {
    if (!submitting) onClose();
  };
  const backdrop = useBackdropClick(handleClose);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    const err = validateStatusReason(reason);
    setReasonError(err);
    if (err) return;
    setSubmitting(true);
    setSaveError(null);
    try {
      const updated = await updatePortalAccountStatus(account.id, {
        status: locking ? 'LOCKED' : 'ACTIVE',
        reason: reason.trim() || null,
      });
      onChanged(updated);
    } catch (error) {
      if (error instanceof PortalAccountApiError && error.code === 'INVALID_STATE') {
        setSaveError(
          locking
            ? 'Tài khoản đã ở trạng thái khóa (có thể vừa được khóa ở màn hình khác). Danh sách sẽ được tải lại.'
            : 'Tài khoản đang hoạt động (có thể vừa được mở ở màn hình khác). Danh sách sẽ được tải lại.'
        );
        onStale?.();
      } else {
        setSaveError(error instanceof Error && error.message ? error.message : 'Không đổi được trạng thái tài khoản cổng.');
      }
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
        aria-labelledby="portal-status-title"
      >
        <div
          className="modal-card modal-card--sm"
          style={{ width: 'min(100%, 520px)' }}
          onClick={(e) => e.stopPropagation()}
          data-testid="portal-status-modal"
        >
          <div className="modal-header">
            <h3 id="portal-status-title" className={`modal-title ${locking ? 'text-warning' : ''}`}>
              <span className="modal-title__icon">{locking ? ICONS.lock : ICONS.unlock}</span>
              {locking ? 'Khóa tài khoản cổng' : 'Mở khóa tài khoản cổng'}
            </h3>
            <button type="button" className="modal-close" onClick={handleClose} disabled={submitting} aria-label="Đóng">
              {ICONS.close}
            </button>
          </div>
          <form className="modal-body" onSubmit={(e) => void handleSubmit(e)} noValidate>
            {saveError && (
              <div className="alert-box alert-box--danger" role="alert" data-testid="portal-status-error">
                <span className="alert-box__icon">{ICONS.alertTriangle}</span>
                <div className="alert-box__content">{saveError}</div>
              </div>
            )}
            <p>
              {locking ? 'Khóa' : 'Mở khóa'} tài khoản <strong>@{account.username}</strong> ({account.fullName}) của khách
              hàng{' '}
              <strong>
                {account.customerCode} · {account.customerName}
              </strong>
              ?
            </p>

            <ul className="portal-consequence-list">
              {locking ? (
                <>
                  <li>Tài khoản không đăng nhập được nữa; mọi phiên đang mở bị đăng xuất ngay.</li>
                  <li>
                    <strong>Không xóa dữ liệu nào</strong> — tài khoản, liên kết khách hàng và lịch sử duyệt phiếu nghiệm
                    thu được giữ nguyên, có thể mở lại khi cần.
                  </li>
                </>
              ) : (
                <>
                  <li>Người liên hệ đăng nhập lại được bằng mật khẩu hiện có.</li>
                  <li>Số lần đăng nhập sai được đặt lại về 0.</li>
                </>
              )}
            </ul>

            <div className="form-field form-field--full" style={{ marginTop: '12px' }}>
              <label className="form-label" htmlFor="portal-status-reason">
                Lý do {locking ? 'khóa' : 'mở khóa'}
              </label>
              {locking && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
                  {LOCK_REASONS.map((r) => (
                    <button
                      key={r}
                      type="button"
                      className="btn-suggestion"
                      onClick={() => {
                        setReason(r);
                        setReasonError(undefined);
                      }}
                      disabled={submitting}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              )}
              <textarea
                id="portal-status-reason"
                className={`form-textarea ${reasonError ? 'form-input--error' : ''}`}
                rows={3}
                maxLength={PORTAL_REASON_MAX}
                placeholder={locking ? 'Ví dụ: Người liên hệ đã nghỉ việc' : 'Ví dụ: Khách hàng xác nhận người liên hệ quay lại'}
                value={reason}
                onChange={(e) => {
                  setReason(e.target.value);
                  setReasonError(undefined);
                }}
                disabled={submitting}
                data-testid="portal-status-reason"
              />
              {reasonError ? (
                <span className="field-error">{reasonError}</span>
              ) : (
                <span className="field-hint">
                  Không bắt buộc, tối đa {PORTAL_REASON_MAX} ký tự — lưu cùng tài khoản và ghi vào Nhật ký hệ thống.
                </span>
              )}
            </div>

            <div className="modal-footer" style={{ padding: '16px 0 0' }}>
              <button type="button" className="btn-secondary" onClick={handleClose} disabled={submitting}>
                Hủy bỏ
              </button>
              <button
                type="submit"
                className={`btn-primary ${locking ? 'btn-danger' : 'btn-success'}`}
                disabled={submitting}
                data-testid="portal-status-submit"
              >
                {submitting ? 'Đang xử lý…' : locking ? 'Xác nhận khóa' : 'Xác nhận mở khóa'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </ModalPortal>
  );
}
