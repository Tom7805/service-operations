import { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ICONS } from '../../../components/common/icons';
import { roleLabels } from '../../../utils/roleLabel';
import { AdminApiError, createBackup, listBackups } from '../api/backupApi';
import RestoreConfirmModal from '../components/RestoreConfirmModal';
import type { BackupRecordRes } from '../types/adminTypes';
import { formatBytes, formatCount, MAX_BACKUP_NOTE, notRestorableReason, STATUS_META } from '../utils/backupUtils';
import { formatDateTime } from '../utils/serviceCatalogUtils';
import PageHeader from '../../../components/common/PageHeader';

/** Khi còn bản sao đang tạo (VD sao lưu theo lịch), tự làm mới danh sách sau mỗi khoảng này. */
export const IN_PROGRESS_POLL_MS = 5000;
/**
 * `IN_PROGRESS` cũng là bản sao DỞ DANG (tiến trình chết giữa chừng) — chỉ bản bắt đầu gần đây mới có thể
 * còn đang chạy. Không dùng trạng thái này để khóa nút tạo mới (bản dở dang sẽ khóa vĩnh viễn); máy chủ tự
 * trả 400 nếu thật sự đang có sao lưu/phục hồi khác.
 */
export const RUNNING_WINDOW_MS = 30 * 60 * 1000;

function isLikelyRunning(b: BackupRecordRes, now = Date.now()): boolean {
  if (b.status !== 'IN_PROGRESS') return false;
  const started = new Date(b.startedAt).getTime();
  return !Number.isNaN(started) && now - started < RUNNING_WINDOW_MS;
}

export interface BackupRestorePageProps {
  currentUserRoles?: string[];
  /** Mở Nhật ký hệ thống để tra lịch sử sao lưu / phục hồi (TC-04). */
  onViewAuditLog?: () => void;
  /** Tải lại ứng dụng sau khi phục hồi — mặc định reload trình duyệt. */
  onReloadApp?: () => void;
}

function isForbidden(err: unknown) {
  return err instanceof AdminApiError && err.statusCode === 403;
}

function describeCreateError(err: unknown): string {
  if (err instanceof AdminApiError && err.code === 'INVALID_STATE') {
    return 'Đang có một thao tác sao lưu hoặc phục hồi khác chạy. Vui lòng thử lại sau ít phút.';
  }
  return err instanceof Error ? err.message : 'Không thể tạo bản sao lưu.';
}

/**
 * Sao lưu và phục hồi dữ liệu (NCL-15-CN-003, QTN-30 — chỉ Quản trị viên phục hồi được).
 *
 * Luôn gọi API thật kể cả khi vai trò không đủ quyền: máy chủ trả 403 và ghi "Từ chối truy cập" vào
 * Nhật ký hệ thống (TC-03). Mọi lần sao lưu / yêu cầu / từ chối / phục hồi đều được backend ghi nhật ký
 * kèm người thực hiện và thời điểm (TC-04).
 */
export default function BackupRestorePage({ currentUserRoles = [], onViewAuditLog, onReloadApp }: BackupRestorePageProps) {
  const [backups, setBackups] = useState<BackupRecordRes[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [note, setNote] = useState('');
  const [creating, setCreating] = useState(false);
  const [lastCreatedId, setLastCreatedId] = useState<number | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [restoreTarget, setRestoreTarget] = useState<BackupRecordRes | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ message, type });
    toastTimer.current = setTimeout(() => setToast(null), 6000);
  };
  useEffect(
    () => () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    },
    []
  );

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    if (!silent) setError(null);
    try {
      setBackups(await listBackups());
      setForbidden(false);
    } catch (err) {
      if (isForbidden(err)) setForbidden(true);
      else if (!silent) setError(err instanceof Error ? err.message : 'Không thể tải danh sách bản sao lưu.');
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const hasRunning = backups.some((b) => isLikelyRunning(b));
  useEffect(() => {
    if (!hasRunning || restoreTarget) return;
    const id = setInterval(() => void load(true), IN_PROGRESS_POLL_MS);
    return () => clearInterval(id);
  }, [hasRunning, restoreTarget, load]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (creating) return;
    if (note.length > MAX_BACKUP_NOTE) return;
    setCreating(true);
    try {
      const created = await createBackup(note.trim() || null);
      setLastCreatedId(created.id);
      // Lỗi giữa chừng vẫn trả 200 với status FAILED — phải kiểm tra status, không chỉ HTTP (TC-01).
      if (created.status === 'FAILED') {
        showToast(`Tạo bản sao lưu ${created.code} thất bại${created.errorMessage ? `: ${created.errorMessage}` : ''}.`, 'error');
      } else if (created.status === 'IN_PROGRESS') {
        showToast(`Bản sao lưu ${created.code} đang được tạo — danh sách sẽ tự cập nhật.`);
      } else {
        setNote('');
        showToast(
          `Đã tạo bản sao lưu ${created.code} lúc ${formatDateTime(created.completedAt ?? created.startedAt)} — ${formatBytes(created.sizeBytes)}.`
        );
      }
      setBackups((prev) => [created, ...prev.filter((b) => b.id !== created.id)]);
      void load(true);
    } catch (err) {
      if (isForbidden(err)) setForbidden(true);
      else showToast(describeCreateError(err), 'error');
    } finally {
      setCreating(false);
    }
  };

  if (forbidden) {
    return (
      <div className="access-denied-container" data-testid="backup-access-denied">
        <div className="access-denied-card">
          <div className="access-denied-icon">{ICONS.shieldOff}</div>
          <h2>Bạn không có thẩm quyền truy cập màn hình này</h2>
          <p>
            Trang này dành cho <strong>Quản trị viên</strong>. Lần truy cập đã được ghi vào nhật ký.
          </p>
          <div className="security-log-badge">
            <span className="security-log-badge__item">Vai trò hiện tại: {roleLabels(currentUserRoles) || '—'}</span>
          </div>
        </div>
      </div>
    );
  }

  const latestOk = backups.find((b) => b.status === 'COMPLETED');
  const failedCount = backups.filter((b) => b.status === 'FAILED').length;

  return (
    <div className="user-management-page backup-page" data-testid="backup-restore-page">
      <PageHeader
        title="Sao lưu và phục hồi"
        actions={
          <>
            {onViewAuditLog && (
              <button type="button" className="btn-secondary" onClick={onViewAuditLog} data-testid="backup-btn-audit">
                {ICONS.clipboardList} Nhật ký
              </button>
            )}
            <button
              type="button"
              className="btn-icon-refresh"
              onClick={() => void load()}
              title="Tải lại"
              aria-label="Tải lại"
              disabled={loading}
              data-testid="backup-refresh"
            >
              {ICONS.refresh}
            </button>
          </>
        }
      />

      <div className="backup-top">
        <form className="company-card backup-create" onSubmit={handleCreate} noValidate data-testid="backup-create-form">
          <h2 className="company-card__title">Tạo bản sao lưu ngay</h2>
          <div className="form-group">
            <label className="form-label" htmlFor="backup-note">
              Ghi chú <span className="backup-optional">(không bắt buộc)</span>
            </label>
            <input
              id="backup-note"
              className={`form-input ${note.length > MAX_BACKUP_NOTE ? 'form-input--error' : ''}`}
              value={note}
              maxLength={MAX_BACKUP_NOTE}
              onChange={(e) => setNote(e.target.value)}
              placeholder="VD: Trước khi nâng cấp hệ thống"
              disabled={creating}
              data-testid="backup-note"
            />
          </div>
          <div className="backup-create__foot">
            <span className="field-hint">
              Không gồm nhật ký hệ thống và phiên đăng nhập.
            </span>
            <button type="submit" className="btn-primary" disabled={creating} data-testid="backup-create">
              {ICONS.save} {creating ? 'Đang sao lưu…' : 'Tạo bản sao lưu'}
            </button>
          </div>
          {hasRunning && !creating && (
            <p className="field-hint backup-create__busy" data-testid="backup-busy-hint">
              Có bản sao lưu vừa bắt đầu tạo — danh sách tự cập nhật khi hoàn tất.
            </p>
          )}
        </form>

        <div className="company-card backup-stats" data-testid="backup-stats">
          <h2 className="company-card__title">Tình trạng</h2>
          <dl>
            <div>
              <dt>Bản sao gần nhất hoàn tất</dt>
              <dd>{latestOk ? formatDateTime(latestOk.completedAt ?? latestOk.startedAt) : 'Chưa có'}</dd>
            </div>
            <div>
              <dt>Tổng số bản sao</dt>
              <dd>{backups.length}</dd>
            </div>
            <div>
              <dt>Bản sao lỗi</dt>
              <dd className={failedCount > 0 ? 'backup-stats__warn' : ''}>{failedCount}</dd>
            </div>
          </dl>
        </div>
      </div>

      {error && (
        <div className="alert alert--error" role="alert">
          <span className="alert__icon">{ICONS.alertTriangle}</span>
          <span>{error}</span>
          <button type="button" className="btn-link ml-auto" onClick={() => void load()} data-testid="backup-retry">
            Thử lại
          </button>
        </div>
      )}

      <div className="user-table-card">
        <div className="table-responsive">
          <table className="user-data-table backup-table">
            <thead>
              <tr>
                <th scope="col">Mã bản sao</th>
                <th scope="col">Trạng thái</th>
                <th scope="col">Thời điểm</th>
                <th scope="col" className="svc-table__num">
                  Dung lượng
                </th>
                <th scope="col">Người tạo</th>
                <th scope="col">Ghi chú</th>
                <th scope="col" className="backup-table__actions">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody>
              {loading && backups.length === 0 ? (
                <tr>
                  <td colSpan={7} className="svc-table__empty">
                    Đang tải danh sách bản sao lưu…
                  </td>
                </tr>
              ) : backups.length === 0 && !error ? (
                <tr>
                  <td colSpan={7} className="svc-table__empty" data-testid="backup-empty">
                    Chưa có bản sao lưu nào. Tạo bản sao đầu tiên ở khung phía trên.
                  </td>
                </tr>
              ) : (
                backups.map((b) => {
                  const meta = STATUS_META[b.status] ?? { label: b.status, badge: 'badge--gray' };
                  const reason = notRestorableReason(b);
                  const expanded = expandedId === b.id;
                  return (
                    <Fragment key={b.id}>
                      <tr
                        className={`${b.id === lastCreatedId ? 'backup-table__row--new' : ''}`}
                        data-testid={`backup-row-${b.id}`}
                      >
                        <td>
                          <button
                            type="button"
                            className="svc-table__name backup-table__code"
                            onClick={() => setExpandedId(expanded ? null : b.id)}
                            aria-expanded={expanded}
                            data-testid={`backup-toggle-${b.id}`}
                          >
                            {b.code}
                          </button>
                          <div className="backup-table__trigger">
                            {b.triggerType === 'SCHEDULED' ? 'Theo lịch' : 'Theo yêu cầu'}
                          </div>
                        </td>
                        <td>
                          <span className={`badge ${meta.badge}`} data-testid={`backup-status-${b.id}`}>
                            {meta.label}
                          </span>
                          {b.status === 'FAILED' && b.errorMessage && (
                            <div className="backup-table__error">{b.errorMessage}</div>
                          )}
                        </td>
                        <td>
                          <div>{formatDateTime(b.startedAt)}</div>
                          {b.completedAt && <div className="backup-table__sub">Xong {formatDateTime(b.completedAt)}</div>}
                        </td>
                        <td className="svc-table__num" data-testid={`backup-size-${b.id}`}>
                          {formatBytes(b.sizeBytes)}
                        </td>
                        <td>{b.createdBy ?? (b.triggerType === 'SCHEDULED' ? 'Hệ thống' : '—')}</td>
                        <td className="backup-table__note">{b.note ?? '—'}</td>
                        <td className="backup-table__actions">
                          <button
                            type="button"
                            className="btn-secondary backup-restore-btn"
                            onClick={() => setRestoreTarget(b)}
                            disabled={!b.restorable}
                            title={reason ?? 'Phục hồi dữ liệu về thời điểm của bản sao này'}
                            aria-describedby={reason ? `backup-reason-${b.id}` : undefined}
                            data-testid={`backup-restore-${b.id}`}
                          >
                            {ICONS.history} Phục hồi
                          </button>
                          {reason && (
                            <span className="backup-table__reason" id={`backup-reason-${b.id}`} data-testid={`backup-reason-${b.id}`}>
                              {b.status === 'IN_PROGRESS' ? 'Bản sao dở dang' : 'Bản sao lỗi'} — không phục hồi được
                            </span>
                          )}
                        </td>
                      </tr>
                      {expanded && (
                        <tr className="backup-table__detail" data-testid={`backup-detail-${b.id}`}>
                          <td colSpan={7}>
                            <dl className="backup-detail">
                              <div>
                                <dt>Tệp</dt>
                                <dd>{b.fileName ?? '—'}</dd>
                              </div>
                              <div>
                                <dt>Nội dung</dt>
                                <dd>
                                  {formatCount(b.tableCount)} bảng · {formatCount(b.rowCount)} dòng
                                </dd>
                              </div>
                              <div>
                                <dt>SHA-256</dt>
                                <dd>
                                  <code className="backup-detail__hash">{b.checksumSha256 ?? '—'}</code>
                                </dd>
                              </div>
                              {reason && (
                                <div>
                                  <dt>Phục hồi</dt>
                                  <dd className="backup-detail__reason">{reason}</dd>
                                </div>
                              )}
                            </dl>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {restoreTarget && (
        <RestoreConfirmModal
          backup={restoreTarget}
          onClose={() => setRestoreTarget(null)}
          onRequestRejected={() => void load(true)}
          onRestored={() => void load(true)}
          onReload={onReloadApp}
        />
      )}

      {toast &&
        createPortal(
          <div className={`toast-notification toast-notification--${toast.type}`} role="alert" aria-live="polite">
            <div className="toast-notification__content">
              <span className="toast-notification__icon">
                {toast.type === 'success' ? ICONS.checkCircle : ICONS.alertTriangle}
              </span>
              <span className="toast-notification__text">{toast.message}</span>
            </div>
            <button type="button" className="toast-notification__close" onClick={() => setToast(null)} aria-label="Đóng thông báo">
              <span className="icon-sm">{ICONS.close}</span>
            </button>
          </div>,
          document.body
        )}
    </div>
  );
}
