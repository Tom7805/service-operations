import { useCallback, useEffect, useState } from 'react';
import { ICONS } from '../../../components/common/icons';
import { fetchPortalAcceptance, PortalApiError } from '../api/portalApi';
import PortalAcceptanceDecisionModal, { type PortalDecisionMode } from '../components/PortalAcceptanceDecisionModal';
import { formatPortalDate } from '../components/PortalProgressBar';
import {
  PORTAL_ACCEPTANCE_LIST_STATUS_LABEL,
  PORTAL_CHANNEL_LABEL,
  PORTAL_DECISION_LABEL,
  type PortalAcceptanceDetail,
  type PortalAcceptanceStatus,
  type PortalConfirmationChannel,
  type PortalDecisionType,
} from '../types/portalTypes';
import { formatPortalDateTime, formatPortalMoney } from '../utils/portalFormat';
import { ACCEPTANCE_STATUS_TONE } from './PortalAcceptancePage';

interface Props {
  certificateId: number;
  signerName: string;
  onBack: () => void;
  onOpenProject: (projectId: number) => void;
  /** Báo cho khung cổng biết số phiếu chờ xác nhận đã thay đổi. */
  onDecided?: () => void;
}

/**
 * NCL-13-CN-003 — nội dung một phiếu nghiệm thu trên cổng. Phiếu chờ xác nhận có nút "Xác nhận nghiệm thu" (TC-01) và
 * "Từ chối" kèm lý do bắt buộc (TC-02). Lịch sử quyết định hiện người thực hiện, kênh, lý do và thời điểm (TC-04).
 * Phiếu của khách hàng khác/không tồn tại → màn từ chối, backend ghi nhật ký.
 */
export default function PortalAcceptanceDetailPage({ certificateId, signerName, onBack, onOpenProject, onDecided }: Props) {
  const [data, setData] = useState<PortalAcceptanceDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<{ forbidden: boolean; message: string } | null>(null);
  const [mode, setMode] = useState<PortalDecisionMode | null>(null);
  const [notice, setNotice] = useState<{ tone: 'success' | 'warning'; text: string } | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      setData(await fetchPortalAcceptance(certificateId));
    } catch (err) {
      setData(null);
      setError({
        forbidden: err instanceof PortalApiError && err.statusCode === 403,
        message: err instanceof Error && err.message ? err.message : 'Không tải được phiếu nghiệm thu.',
      });
    } finally {
      setIsLoading(false);
    }
  }, [certificateId]);

  useEffect(() => {
    void load();
  }, [load]);

  const backButton = (
    <button type="button" className="btn btn-secondary" onClick={onBack} data-testid="portal-acceptance-back">
      <span className="icon-xs">{ICONS.arrowLeft}</span> Danh sách phiếu
    </button>
  );

  if (isLoading && !data) {
    return (
      <div className="portal-page">
        <div className="mb-4">{backButton}</div>
        <div className="user-table-card">
          <div className="table-loading-state">
            <div className="spinner-lg" />
            <p>Đang tải phiếu nghiệm thu...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error?.forbidden) {
    return (
      <div className="access-denied-container" data-testid="portal-acceptance-forbidden">
        <div className="access-denied-card">
          <div className="access-denied-icon">{ICONS.shieldOff}</div>
          <h2>Bạn không có quyền xem phiếu nghiệm thu này</h2>
          <p>
            Phiếu không thuộc dự án của công ty bạn hoặc không tồn tại. Tài khoản cổng chỉ xem và duyệt được phiếu của
            chính khách hàng mình. Lần truy cập này đã được ghi vào nhật ký hệ thống.
          </p>
          <div className="security-log-badge">
            <span className="security-log-badge__item">
              {ICONS.shield} Thời điểm ghi nhận: {new Date().toLocaleString('vi-VN')}
            </span>
            <span className="security-log-badge__item">Mã phiếu yêu cầu: {certificateId}</span>
          </div>
          <div style={{ marginTop: '20px' }}>{backButton}</div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="portal-page">
        <div className="mb-4">{backButton}</div>
        <div className="user-table-card">
          <div className="table-error-state" role="alert">
            <div className="table-error-state__icon">{ICONS.alertTriangle}</div>
            <div className="table-error-state__body">
              <h3>Không tải được phiếu nghiệm thu</h3>
              <p>{error?.message}</p>
            </div>
            <button type="button" className="btn btn-secondary" onClick={() => void load()}>
              Thử lại
            </button>
          </div>
        </div>
      </div>
    );
  }

  const status = data.status as PortalAcceptanceStatus;
  const pending = data.awaitingDecision && data.status === 'PENDING_CONFIRMATION';
  const decisions = [...data.decisions].sort((a, b) => (b.recordedAt ?? '').localeCompare(a.recordedAt ?? ''));

  const handleDone = (updated: PortalAcceptanceDetail, doneMode: PortalDecisionMode) => {
    setMode(null);
    setData(updated);
    setNotice(
      doneMode === 'confirm'
        ? { tone: 'success', text: `Đã xác nhận nghiệm thu phiếu ${updated.certificateCode}. Quản lý dự án đã được thông báo.` }
        : {
            tone: 'warning',
            text: `Đã từ chối phiếu ${updated.certificateCode}. Quản lý dự án đã được thông báo để chỉnh sửa và gửi lại.`,
          }
    );
    onDecided?.();
  };

  return (
    <div className="portal-page" data-testid="portal-acceptance-detail">
      <div className="mb-4">{backButton}</div>

      {notice && (
        <div className={`alert-box alert-box--${notice.tone}`} role="status" data-testid="portal-acceptance-notice">
          <span className="alert-box__icon">{notice.tone === 'success' ? ICONS.checkCircle : ICONS.info}</span>
          <div className="alert-box__content">{notice.text}</div>
          <button type="button" className="modal-close" onClick={() => setNotice(null)} aria-label="Ẩn thông báo">
            {ICONS.close}
          </button>
        </div>
      )}

      <div className="page-header">
        <div>
          <div className="page-header__kicker">
            <span className="page-header__tag">{ICONS.clipboardList} {data.certificateCode}</span>
            <span className="page-header__dot" />
            <span className="page-header__meta">Lần gửi {data.revisionNo}</span>
          </div>
          <h1 className="page-title">{data.title}</h1>
          <p className="page-subtitle">
            <button type="button" className="btn-link" onClick={() => onOpenProject(data.projectId)} style={{ padding: 0 }}>
              {data.projectCode} — {data.projectName}
            </button>
            {data.workPackageName ? ` · Hạng mục ${data.workPackageName}` : ''}
          </p>
        </div>
        <span className={`badge ${ACCEPTANCE_STATUS_TONE[status] ?? 'badge--gray'} portal-status-lg`} data-testid="portal-acceptance-status">
          {PORTAL_ACCEPTANCE_LIST_STATUS_LABEL[status] ?? data.status}
        </span>
      </div>

      {/* Khối quyết định */}
      {pending ? (
        <div className="portal-decision-bar" data-testid="portal-decision-bar">
          <div>
            <strong>Phiếu đang chờ bạn xác nhận</strong>
            <p>Kiểm tra công việc và sản phẩm bàn giao bên dưới, sau đó xác nhận nghiệm thu hoặc từ chối kèm lý do.</p>
          </div>
          <div className="portal-decision-bar__actions">
            <button type="button" className="btn-secondary" onClick={() => setMode('reject')} data-testid="portal-open-reject">
              <span className="icon-xs">{ICONS.close}</span> Từ chối
            </button>
            <button type="button" className="btn-primary btn-success" onClick={() => setMode('confirm')} data-testid="portal-open-confirm">
              <span className="icon-xs">{ICONS.check}</span> Xác nhận nghiệm thu
            </button>
          </div>
        </div>
      ) : data.status === 'ACCEPTED' ? (
        <div className="alert-box alert-box--success alert-box--inline" data-testid="portal-acceptance-accepted">
          <span className="alert-box__icon">{ICONS.checkCircle}</span>
          <div className="alert-box__content">
            Đã nghiệm thu — người ký <strong>{data.signerName ?? '—'}</strong>, ngày ký {formatPortalDate(data.signedDate)}
            {data.confirmationChannel
              ? ` (${PORTAL_CHANNEL_LABEL[data.confirmationChannel as PortalConfirmationChannel] ?? data.confirmationChannel})`
              : ''}
            , lúc {formatPortalDateTime(data.confirmedAt)}. Nội dung phiếu đã được khoá.
          </div>
        </div>
      ) : data.status === 'NEEDS_REVISION' ? (
        <div className="alert-box alert-box--warning alert-box--inline" data-testid="portal-acceptance-revision">
          <span className="alert-box__icon">{ICONS.edit}</span>
          <div className="alert-box__content">
            Phiếu đang được quản lý dự án chỉnh sửa theo góp ý và sẽ gửi lại để bạn xác nhận.
            {data.lastRejectionReason && (
              <>
                {' '}Lý do từ chối gần nhất: <strong>{data.lastRejectionReason}</strong>
              </>
            )}
          </div>
        </div>
      ) : null}

      <div className="user-table-card portal-overview" style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' }}>
        <dl className="portal-overview__facts" style={{ gridColumn: '1 / -1' }}>
          <div>
            <dt>Giá trị nghiệm thu</dt>
            <dd data-testid="portal-acceptance-value">{formatPortalMoney(data.acceptedValue)}</dd>
          </div>
          <div>
            <dt>Hạng mục</dt>
            <dd>{data.workPackageName ?? '—'}</dd>
          </div>
          <div>
            <dt>Ngày lập phiếu</dt>
            <dd>{formatPortalDateTime(data.createdAt)}</dd>
          </div>
          <div>
            <dt>Cập nhật</dt>
            <dd>{formatPortalDateTime(data.updatedAt)}</dd>
          </div>
        </dl>
        {data.note && (
          <p className="portal-acceptance-note" style={{ gridColumn: '1 / -1' }}>
            <strong>Ghi chú phiếu:</strong> {data.note}
          </p>
        )}
      </div>

      <div className="portal-two-col">
        <section className="user-table-card portal-section" data-testid="portal-acceptance-tasks">
          <div className="portal-section__head">
            <h2>
              <span className="icon-xs">{ICONS.checkCircle}</span> Công việc đã hoàn thành ({data.tasks.length})
            </h2>
          </div>
          {data.tasks.length === 0 ? (
            <p className="field-hint portal-section__empty">Phiếu không liệt kê công việc.</p>
          ) : (
            <ul className="portal-plain-list">
              {data.tasks.map((t, i) => (
                <li key={`${t}-${i}`}>
                  <span className="icon-xs portal-plain-list__icon">{ICONS.check}</span> {t}
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="user-table-card portal-section" data-testid="portal-acceptance-deliverables">
          <div className="portal-section__head">
            <h2>
              <span className="icon-xs">{ICONS.document}</span> Sản phẩm bàn giao ({data.deliverables.length})
            </h2>
          </div>
          {data.deliverables.length === 0 ? (
            <p className="field-hint portal-section__empty">Phiếu không kèm sản phẩm bàn giao.</p>
          ) : (
            <ul className="portal-plain-list">
              {data.deliverables.map((d, i) => (
                <li key={`${d.deliverableName}-${i}`}>
                  <span className="icon-xs portal-plain-list__icon">{ICONS.document}</span> {d.deliverableName}
                  {d.versionNo && <span className="badge badge--blue" style={{ marginLeft: 'auto' }}>{d.versionNo}</span>}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="user-table-card portal-section" data-testid="portal-acceptance-history">
        <div className="portal-section__head">
          <h2>
            <span className="icon-xs">{ICONS.history}</span> Lịch sử nghiệm thu
          </h2>
        </div>
        {decisions.length === 0 ? (
          <p className="field-hint portal-section__empty">Chưa có quyết định nào cho phiếu này.</p>
        ) : (
          <ol className="portal-history__list" style={{ padding: '12px 20px 16px', maxHeight: 'none' }}>
            {decisions.map((d, i) => (
              <li key={i} className="portal-history__item">
                <div className="portal-history__line">
                  <span className={`badge ${d.decision === 'ACCEPTED' ? 'badge--green' : 'badge--red'}`}>
                    {PORTAL_DECISION_LABEL[d.decision as PortalDecisionType] ?? d.decision}
                  </span>
                  <span className="cell-muted">{formatPortalDateTime(d.recordedAt)}</span>
                </div>
                <div className="portal-history__actor">
                  {d.signerName ?? '—'}
                  {d.channel ? ` · ${PORTAL_CHANNEL_LABEL[d.channel as PortalConfirmationChannel] ?? d.channel}` : ''}
                  {d.revisionNo ? ` · lần gửi ${d.revisionNo}` : ''}
                </div>
                {d.reason && <div className="portal-history__detail">Lý do: {d.reason}</div>}
              </li>
            ))}
          </ol>
        )}
      </section>

      {mode && (
        <PortalAcceptanceDecisionModal
          mode={mode}
          certificate={data}
          signerName={signerName}
          onClose={() => setMode(null)}
          onDone={handleDone}
          onStale={() => {
            void load();
            onDecided?.();
          }}
        />
      )}
    </div>
  );
}
