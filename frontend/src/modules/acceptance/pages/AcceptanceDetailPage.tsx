import { useCallback, useEffect, useState } from 'react';
import { ICONS } from '../../../components/common/icons';
import { AcceptanceApiError, getAcceptance } from '../api/acceptanceApi';
import {
  ACCEPTANCE_STATUS_META,
  DECISION_META,
  type AcceptanceDetailRes,
} from '../types/acceptanceTypes';

interface Props {
  certificateId: number;
  onBack: () => void;
  initialCertificate?: AcceptanceDetailRes;
}

function formatAmount(value: number | null | undefined): string {
  if (value == null) return '—';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 2 }).format(value);
}

function formatDate(value?: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString('vi-VN');
}

function formatDateTime(value?: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleString('vi-VN');
}

interface HistoryEntry {
  key: string;
  at: string;
  actor: string | null;
  label: string;
  detail?: string | null;
  badge: string;
}

/**
 * NCL-12-CN-001 — Chi tiết phiếu nghiệm thu: nội dung đã chụp lại lúc lập (công việc, phiên bản sản
 * phẩm bàn giao, giá trị) và lịch sử phiếu — ai lập, lúc nào, các lần khách hàng xác nhận/từ chối (TC-04).
 */
export default function AcceptanceDetailPage({ certificateId, onBack, initialCertificate }: Props) {
  const [certificate, setCertificate] = useState<AcceptanceDetailRes | null>(initialCertificate ?? null);
  const [isLoading, setIsLoading] = useState(!initialCertificate);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      setCertificate(await getAcceptance(certificateId));
    } catch (err) {
      setLoadError(err instanceof AcceptanceApiError ? err.message : 'Không tải được chi tiết phiếu nghiệm thu.');
    } finally {
      setIsLoading(false);
    }
  }, [certificateId]);

  useEffect(() => {
    if (initialCertificate) return;
    void load();
  }, [initialCertificate, load]);

  const status = certificate
    ? ACCEPTANCE_STATUS_META[certificate.status] ?? { label: certificate.status, badge: 'badge--gray' }
    : null;

  const history: HistoryEntry[] = certificate
    ? [
        {
          key: 'created',
          at: certificate.createdAt,
          actor: certificate.createdBy,
          label: 'Lập phiếu nghiệm thu',
          detail: `Giá trị ${formatAmount(certificate.acceptedValue)} · ${certificate.tasks.length} công việc · ${certificate.deliverables.length} sản phẩm bàn giao`,
          badge: 'badge--blue',
        },
        ...certificate.decisions.map((d) => ({
          key: `decision-${d.id}`,
          at: d.recordedAt,
          actor: d.recordedBy,
          label: `${DECISION_META[d.decision]?.label ?? d.decision} (lần nộp ${d.revisionNo})`,
          detail:
            d.decision === 'REJECTED'
              ? d.reason
              : [d.signerName && `Người ký: ${d.signerName}`, d.signedDate && `ngày ${formatDate(d.signedDate)}`]
                  .filter(Boolean)
                  .join(', '),
          badge: DECISION_META[d.decision]?.badge ?? 'badge--gray',
        })),
      ].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    : [];

  return (
    <div className="user-management-page">
      <div className="page-header">
        <div>
          <button
            type="button"
            className="btn-icon-refresh"
            onClick={onBack}
            aria-label="Quay lại danh sách nghiệm thu"
            style={{ marginBottom: '8px' }}
          >
            {ICONS.arrowLeft}
          </button>
          <div className="page-header__kicker">
            <span className="page-header__tag">{ICONS.clipboardList} PHIẾU NGHIỆM THU</span>
            {certificate && (
              <>
                <span className="page-header__dot" />
                <span className="page-header__meta">{certificate.certificateCode}</span>
              </>
            )}
          </div>
          <h1 className="page-title">{certificate ? certificate.title : 'Chi tiết phiếu nghiệm thu'}</h1>
          {certificate && (
            <p className="page-subtitle">
              {certificate.projectCode} — {certificate.projectName} · Hạng mục: {certificate.workPackageName}
            </p>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="table-loading-state">
          <div className="spinner-lg" />
          <p>Đang tải phiếu nghiệm thu...</p>
        </div>
      ) : loadError ? (
        <div className="table-error-state" role="alert">
          <div className="table-error-state__icon">{ICONS.alertTriangle}</div>
          <div className="table-error-state__body">
            <h3>Không tải được phiếu nghiệm thu</h3>
            <p>{loadError}</p>
          </div>
          <button type="button" className="btn btn-secondary" onClick={() => void load()}>
            Thử lại
          </button>
        </div>
      ) : certificate && status ? (
        <>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-card__icon stat-card__icon--purple">{ICONS.money}</div>
              <div>
                <span className="stat-card__label">Giá trị nghiệm thu</span>
                <div className="stat-card__value" data-testid="acceptance-detail-value">
                  {formatAmount(certificate.acceptedValue)}
                </div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-card__icon stat-card__icon--green">{ICONS.checkCircle}</div>
              <div>
                <span className="stat-card__label">Công việc</span>
                <div className="stat-card__value">{certificate.tasks.length}</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-card__icon stat-card__icon--blue">{ICONS.document}</div>
              <div>
                <span className="stat-card__label">Sản phẩm bàn giao</span>
                <div className="stat-card__value">{certificate.deliverables.length}</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-card__icon stat-card__icon--amber">{ICONS.history}</div>
              <div>
                <span className="stat-card__label">Lần nộp</span>
                <div className="stat-card__value">{certificate.revisionNo}</div>
              </div>
            </div>
          </div>

          <div className="user-table-card" style={{ padding: '20px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '16px' }}>
              <span className={`badge ${status.badge}`} data-testid="acceptance-detail-status">
                {status.label}
              </span>
              {certificate.status === 'PENDING_CONFIRMATION' && (
                <span className="field-hint">Phiếu đang chờ khách hàng xác nhận.</span>
              )}
            </div>
            {certificate.lastRejectionReason && certificate.status === 'NEEDS_REVISION' && (
              <div className="alert-box alert-box--warning">
                <span className="alert-box__icon">{ICONS.alertTriangle}</span>
                <div className="alert-box__content">
                  <strong>Lý do khách hàng từ chối</strong>
                  {certificate.lastRejectionReason}
                </div>
              </div>
            )}
            <div className="detail-grid">
              <div className="detail-field">
                <span className="detail-label">Mã phiếu</span>
                <span className="detail-value" style={{ fontFamily: 'var(--font-mono, monospace)' }}>
                  {certificate.certificateCode}
                </span>
              </div>
              <div className="detail-field">
                <span className="detail-label">Hạng mục</span>
                <span className="detail-value">{certificate.workPackageName}</span>
              </div>
              <div className="detail-field">
                <span className="detail-label">Người lập</span>
                <span className="detail-value">{certificate.createdBy || '—'}</span>
              </div>
              <div className="detail-field">
                <span className="detail-label">Thời điểm lập</span>
                <span className="detail-value">{formatDateTime(certificate.createdAt)}</span>
              </div>
              {certificate.paymentMilestone && (
                <div className="detail-field">
                  <span className="detail-label">Mốc thanh toán đã gắn</span>
                  <span className="detail-value">
                    {certificate.paymentMilestone.name} · {formatAmount(certificate.paymentMilestone.amount)}
                  </span>
                </div>
              )}
              {certificate.confirmedAt && (
                <div className="detail-field">
                  <span className="detail-label">Khách hàng xác nhận</span>
                  <span className="detail-value">
                    {certificate.signerName || '—'} · {formatDateTime(certificate.confirmedAt)}
                  </span>
                </div>
              )}
              <div className="detail-field" style={{ gridColumn: '1 / -1' }}>
                <span className="detail-label">Ghi chú</span>
                <span className="detail-value" style={{ fontWeight: 400, whiteSpace: 'pre-wrap' }}>
                  {certificate.note || '—'}
                </span>
              </div>
            </div>
          </div>

          <div className="user-table-card" style={{ marginBottom: '16px' }}>
            <div className="page-header" style={{ padding: '16px 16px 0' }}>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600 }}>Danh sách công việc nghiệm thu</h3>
            </div>
            {certificate.tasks.length === 0 ? (
              <div className="table-empty-state">
                <h3>Phiếu không có công việc nào</h3>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="user-data-table" data-testid="acceptance-detail-tasks">
                  <thead>
                    <tr>
                      <th style={{ width: '120px' }}>Mã công việc</th>
                      <th>Tên công việc</th>
                    </tr>
                  </thead>
                  <tbody>
                    {certificate.tasks.map((t) => (
                      <tr key={t.taskId}>
                        <td style={{ fontFamily: 'var(--font-mono, monospace)' }}>#{t.taskId}</td>
                        <td>{t.taskName}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="user-table-card" style={{ marginBottom: '16px' }}>
            <div className="page-header" style={{ padding: '16px 16px 0' }}>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600 }}>Sản phẩm bàn giao</h3>
            </div>
            {certificate.deliverables.length === 0 ? (
              <div className="table-empty-state">
                <div className="table-empty-state__icon">{ICONS.document}</div>
                <h3>Không có sản phẩm bàn giao nào trong phiếu</h3>
                <p>Chỉ sản phẩm đã có ít nhất một phiên bản bàn giao mới được đưa vào phiếu.</p>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="user-data-table">
                  <thead>
                    <tr>
                      <th>Sản phẩm</th>
                      <th>Phiên bản</th>
                    </tr>
                  </thead>
                  <tbody>
                    {certificate.deliverables.map((d) => (
                      <tr key={d.deliverableVersionId}>
                        <td>{d.deliverableName}</td>
                        <td>
                          <span className="badge badge--blue">{d.versionNo}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="user-table-card">
            <div className="page-header" style={{ padding: '16px 16px 0' }}>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600 }}>Lịch sử nghiệm thu</h3>
            </div>
            <div className="table-responsive">
              <table className="user-data-table" data-testid="acceptance-detail-history">
                <thead>
                  <tr>
                    <th>Thời điểm</th>
                    <th>Người thực hiện</th>
                    <th>Nội dung</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((h) => (
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
          </div>
        </>
      ) : null}
    </div>
  );
}
