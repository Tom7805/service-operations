import { useEffect, useRef, useState } from 'react';
import { ICONS } from '../../../components/common/icons';
import ModalPortal from '../../../components/common/ModalPortal';
import { confirmRestore, requestRestore } from '../api/backupApi';
import type { BackupRecordRes, RestoreChallengeRes, RestoreResultRes } from '../types/adminTypes';
import {
  classifyConfirmError,
  describeRestoreRequestError,
  formatBytes,
  formatCount,
  formatCountdown,
  secondsUntil,
} from '../utils/backupUtils';
import { formatDateTime } from '../utils/serviceCatalogUtils';

type Phase = 'INTRO' | 'REQUESTING' | 'CONFIRM' | 'SUBMITTING' | 'DONE' | 'BLOCKED' | 'RESTART';

export interface RestoreConfirmModalProps {
  backup: BackupRecordRes;
  onClose: () => void;
  /** Bước 1 bị chặn vì bản sao không hợp lệ / không còn — trang tải lại danh sách để thấy trạng thái mới. */
  onRequestRejected?: () => void;
  onRestored?: (result: RestoreResultRes) => void;
  /** Tải lại ứng dụng sau khi phục hồi (dữ liệu tài khoản cũng về thời điểm bản sao). Mặc định reload trang. */
  onReload?: () => void;
}

/**
 * Phục hồi dữ liệu với xác nhận hai bước (NCL-15-CN-003, QTN-30):
 * 1. Máy chủ kiểm tra bản sao (hoàn tất, tệp còn, SHA-256 khớp) rồi cấp mã xác nhận 5 phút.
 * 2. Quản trị viên đọc cảnh báo, tích xác nhận và nhập lại mật khẩu đăng nhập.
 * Mã xác nhận chỉ nằm trong state của hộp thoại — không lưu localStorage, mất khi đóng hộp thoại.
 */
export default function RestoreConfirmModal({
  backup,
  onClose,
  onRequestRejected,
  onRestored,
  onReload = () => window.location.reload(),
}: RestoreConfirmModalProps) {
  const [phase, setPhase] = useState<Phase>('INTRO');
  const [challenge, setChallenge] = useState<RestoreChallengeRes | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [acknowledged, setAcknowledged] = useState(false);
  const [password, setPassword] = useState('');
  const [wrongAttempts, setWrongAttempts] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RestoreResultRes | null>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  const busy = phase === 'REQUESTING' || phase === 'SUBMITTING';
  const canClose = !busy && phase !== 'DONE';

  // Đếm ngược tới hạn của mã xác nhận; hết giờ thì bỏ mã và bắt làm lại bước 1.
  useEffect(() => {
    if (phase !== 'CONFIRM' || !challenge) return;
    const tick = () => {
      const left = secondsUntil(challenge.expiresAt);
      setSecondsLeft(left);
      if (left <= 0) {
        setChallenge(null);
        setPassword('');
        setError('Mã xác nhận đã hết hạn. Hãy tạo yêu cầu phục hồi mới.');
        setPhase('RESTART');
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [phase, challenge]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && canClose) onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [canClose, onClose]);

  useEffect(() => {
    if (phase === 'CONFIRM') passwordRef.current?.focus();
  }, [phase]);

  const startRequest = async () => {
    setPhase('REQUESTING');
    setError(null);
    setPassword('');
    setAcknowledged(false);
    setWrongAttempts(0);
    try {
      const c = await requestRestore(backup.id);
      setChallenge(c);
      setPhase('CONFIRM');
    } catch (err) {
      setError(describeRestoreRequestError(err, backup.code));
      setPhase('BLOCKED');
      onRequestRejected?.();
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!challenge || phase !== 'CONFIRM') return;
    if (!acknowledged) {
      setError('Hãy tích xác nhận bạn đã hiểu phục hồi sẽ thay toàn bộ dữ liệu hiện tại.');
      return;
    }
    if (!password) {
      setError('Nhập lại mật khẩu đăng nhập để xác nhận.');
      passwordRef.current?.focus();
      return;
    }
    setPhase('SUBMITTING');
    setError(null);
    try {
      const res = await confirmRestore(challenge.requestId, challenge.confirmationToken, password);
      setChallenge(null);
      setPassword('');
      setResult(res);
      setPhase('DONE');
      onRestored?.(res);
    } catch (err) {
      const { kind, message } = classifyConfirmError(err);
      setPassword('');
      if (kind === 'WRONG_CREDENTIALS') {
        const n = wrongAttempts + 1;
        setWrongAttempts(n);
        setError(`${message.replace(/\.$/, '')} (lần sai thứ ${n}). Sai quá số lần cho phép, yêu cầu sẽ bị hủy.`);
        setPhase('CONFIRM');
      } else if (kind === 'BUSY') {
        // Mã vẫn còn hiệu lực — cho thử lại khi thao tác khác chạy xong.
        setError(message);
        setPhase('CONFIRM');
      } else {
        setChallenge(null);
        setError(message);
        setPhase(kind === 'RESTORE_FAILED' || kind === 'FORBIDDEN' ? 'BLOCKED' : 'RESTART');
      }
    }
  };

  const stepNo = phase === 'INTRO' || phase === 'REQUESTING' || phase === 'BLOCKED' ? 1 : 2;

  return (
    <ModalPortal>
      <div
        className="modal-backdrop"
        onClick={(e) => {
          if (e.target === e.currentTarget && canClose) onClose();
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="restore-title"
      >
        <div className="modal-card modal-card--md restore-modal" data-testid="restore-modal">
          <div className="modal-header">
            <div className="modal-header__title-wrap">
              <h3 id="restore-title" className="modal-title">
                <span className="modal-title__icon">{ICONS.history}</span>
                {phase === 'DONE' ? 'Đã phục hồi dữ liệu' : 'Phục hồi dữ liệu'}
              </h3>
              {phase !== 'DONE' && (
                <ol className="restore-steps" aria-label="Các bước xác nhận">
                  <li className={stepNo === 1 ? 'restore-steps__item--active' : 'restore-steps__item--done'}>1. Kiểm tra bản sao</li>
                  <li className={stepNo === 2 ? 'restore-steps__item--active' : ''}>2. Xác nhận bằng mật khẩu</li>
                </ol>
              )}
            </div>
            {phase !== 'DONE' && (
              <button type="button" className="modal-close" onClick={onClose} disabled={!canClose} aria-label="Đóng">
                {ICONS.close}
              </button>
            )}
          </div>

          <form onSubmit={submit} noValidate>
            <div className="modal-body restore-body">
              <dl className="restore-summary" data-testid="restore-summary">
                <div>
                  <dt>Bản sao</dt>
                  <dd>
                    <code>{backup.code}</code>
                  </dd>
                </div>
                <div>
                  <dt>Dữ liệu tại thời điểm</dt>
                  <dd>
                    <strong>{formatDateTime(backup.startedAt)}</strong>
                  </dd>
                </div>
                <div>
                  <dt>Nội dung</dt>
                  <dd>
                    {formatCount(backup.tableCount)} bảng · {formatCount(backup.rowCount)} dòng · {formatBytes(backup.sizeBytes)}
                  </dd>
                </div>
              </dl>

              {phase === 'INTRO' || phase === 'REQUESTING' ? (
                <div className="restore-callout" data-testid="restore-intro">
                  {ICONS.alertTriangle}
                  <div>
                    <strong>Toàn bộ dữ liệu vận hành hiện tại sẽ bị thay bằng dữ liệu của bản sao này.</strong>
                    <p>
                      Mọi thay đổi sau {formatDateTime(backup.startedAt)} sẽ mất. Nhật ký hệ thống và danh sách bản sao lưu
                      được giữ nguyên. Nên tạo một bản sao lưu mới trước khi phục hồi.
                    </p>
                  </div>
                </div>
              ) : null}

              {(phase === 'CONFIRM' || phase === 'SUBMITTING') && challenge && (
                <>
                  <div className="restore-callout restore-callout--danger" role="alert" data-testid="restore-warning">
                    {ICONS.alertTriangle}
                    <div>
                      <strong>Cảnh báo từ máy chủ</strong>
                      <p>{challenge.warning}</p>
                    </div>
                  </div>
                  <p className="restore-expiry" data-testid="restore-countdown">
                    {ICONS.clock} Mã xác nhận hết hạn sau <strong>{formatCountdown(secondsLeft)}</strong>
                  </p>
                  <label className="restore-ack">
                    <input
                      type="checkbox"
                      checked={acknowledged}
                      onChange={(e) => {
                        setAcknowledged(e.target.checked);
                        setError(null);
                      }}
                      disabled={phase === 'SUBMITTING'}
                      data-testid="restore-ack"
                    />
                    <span>
                      Tôi hiểu dữ liệu vận hành sẽ quay về thời điểm {formatDateTime(backup.startedAt)} và không hoàn tác được.
                    </span>
                  </label>
                  <div className="form-group">
                    <label className="form-label" htmlFor="restore-password">
                      Nhập lại mật khẩu đăng nhập <span className="field-required">*</span>
                    </label>
                    <input
                      id="restore-password"
                      ref={passwordRef}
                      type="password"
                      autoComplete="current-password"
                      className={`form-input ${error && wrongAttempts > 0 ? 'form-input--error' : ''}`}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setError(null);
                      }}
                      disabled={phase === 'SUBMITTING'}
                      data-testid="restore-password"
                    />
                  </div>
                </>
              )}

              {phase === 'DONE' && result && (
                <div className="restore-done" role="status" data-testid="restore-done">
                  <span className="restore-done__icon">{ICONS.checkCircle}</span>
                  <div>
                    <strong>Dữ liệu đã về thời điểm {formatDateTime(result.restoredToPointInTime)}.</strong>
                    <p>
                      Đã phục hồi {formatCount(result.tablesRestored)} bảng, {formatCount(result.rowsRestored)} dòng lúc{' '}
                      {formatDateTime(result.completedAt)}. Tài khoản đăng nhập cũng về thời điểm này — hãy tải lại trang; nếu
                      tài khoản của bạn chưa có ở thời điểm đó, bạn sẽ được yêu cầu đăng nhập lại.
                    </p>
                  </div>
                </div>
              )}

              {error && (
                <div className="alert-box alert-box--danger" role="alert" data-testid="restore-error">
                  {error}
                </div>
              )}
            </div>

            <div className="modal-footer">
              {phase === 'DONE' ? (
                <button type="button" className="btn btn-primary" onClick={onReload} data-testid="restore-reload">
                  {ICONS.refresh} Tải lại trang
                </button>
              ) : (
                <>
                  <button type="button" className="btn btn-secondary" onClick={onClose} disabled={!canClose}>
                    {phase === 'BLOCKED' ? 'Đóng' : 'Hủy'}
                  </button>
                  {(phase === 'INTRO' || phase === 'REQUESTING') && (
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => void startRequest()}
                      disabled={busy}
                      data-testid="restore-step1"
                    >
                      {phase === 'REQUESTING' ? 'Đang kiểm tra bản sao…' : 'Tiếp tục — kiểm tra bản sao'}
                    </button>
                  )}
                  {phase === 'RESTART' && (
                    <button type="button" className="btn btn-primary" onClick={() => void startRequest()} data-testid="restore-restart">
                      Tạo yêu cầu mới
                    </button>
                  )}
                  {(phase === 'CONFIRM' || phase === 'SUBMITTING') && (
                    <button
                      type="submit"
                      className="btn btn-primary btn-danger"
                      disabled={phase === 'SUBMITTING' || !acknowledged || !password}
                      data-testid="restore-confirm"
                    >
                      {phase === 'SUBMITTING' ? 'Đang phục hồi…' : 'Phục hồi dữ liệu'}
                    </button>
                  )}
                </>
              )}
            </div>
          </form>
        </div>
      </div>
    </ModalPortal>
  );
}
