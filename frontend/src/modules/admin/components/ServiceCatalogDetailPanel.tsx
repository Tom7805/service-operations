import { useState } from 'react';
import { ICONS } from '../../../components/common/icons';
import type { ServiceCatalogRes, ServicePriceRes } from '../types/adminTypes';
import { formatDate, formatDateTime, formatVnd } from '../utils/serviceCatalogUtils';

export interface ServiceCatalogDetailPanelProps {
  service: ServiceCatalogRes | null;
  loading?: boolean;
  error?: string | null;
  /** Đang gọi PATCH trạng thái — khóa các nút. */
  busy?: boolean;
  onEdit: () => void;
  onAddPrice: () => void;
  onChangeStatus: (active: boolean) => void;
  onClose: () => void;
  onRetry?: () => void;
}

function priceState(p: ServicePriceRes, asOf: string): 'current' | 'future' | 'past' {
  if (p.current) return 'current';
  return p.effectiveFrom > asOf ? 'future' : 'past';
}

const STATE_LABEL = { current: 'Đang áp dụng', future: 'Sắp áp dụng', past: 'Đã hết hiệu lực' } as const;

/**
 * Chi tiết một dịch vụ + lịch sử mốc giá (NCL-15-CN-001, QTN-28). Người tạo/thời điểm của dịch vụ
 * và từng mốc giá lấy từ máy chủ — cùng nguồn với Nhật ký hệ thống (TC-04).
 */
export default function ServiceCatalogDetailPanel({
  service,
  loading = false,
  error = null,
  busy = false,
  onEdit,
  onAddPrice,
  onChangeStatus,
  onClose,
  onRetry,
}: ServiceCatalogDetailPanelProps) {
  const [confirmDeactivate, setConfirmDeactivate] = useState(false);

  if (loading && !service) {
    return (
      <aside className="svc-detail" aria-busy="true" data-testid="svc-detail">
        <p className="svc-detail__loading">Đang tải chi tiết dịch vụ…</p>
      </aside>
    );
  }
  if (error && !service) {
    return (
      <aside className="svc-detail" data-testid="svc-detail">
        <div className="alert alert--error" role="alert">
          <span className="alert__icon">{ICONS.alertTriangle}</span>
          <span>{error}</span>
          {onRetry && (
            <button type="button" className="btn-link ml-auto" onClick={onRetry}>
              Thử lại
            </button>
          )}
        </div>
      </aside>
    );
  }
  if (!service) return null;

  const prices = service.prices ?? [];

  return (
    <aside className="svc-detail" aria-labelledby="svc-detail-title" data-testid="svc-detail">
      <div className="svc-detail__head">
        <div className="svc-detail__heading">
          <span className="svc-detail__code">{service.code}</span>
          <h2 className="svc-detail__title" id="svc-detail-title">
            {service.name}
          </h2>
          <div className="svc-detail__badges">
            <span className={`badge ${service.active ? 'badge--green' : 'badge--gray'}`} data-testid="svc-detail-status">
              {service.active ? 'Đang hoạt động' : 'Đã ngừng'}
            </span>
            {!service.hasEffectivePrice && (
              <span className="badge badge--gold" data-testid="svc-detail-no-price">
                Chưa có giá hiệu lực
              </span>
            )}
          </div>
        </div>
        <button type="button" className="modal-close" onClick={onClose} aria-label="Đóng chi tiết dịch vụ">
          {ICONS.close}
        </button>
      </div>

      <div className="svc-detail__price">
        <span className="svc-detail__price-label">Giá áp dụng ngày {formatDate(service.asOf)}</span>
        <strong className="svc-detail__price-value" data-testid="svc-detail-price">
          {service.hasEffectivePrice ? formatVnd(service.currentPrice) : 'Chưa có'}
          <small> / {service.unit}</small>
        </strong>
        {service.hasEffectivePrice ? (
          <span className="svc-detail__price-sub">Theo mốc từ {formatDate(service.currentPriceEffectiveFrom)}</span>
        ) : (
          <span className="svc-detail__price-sub">Chưa chọn được khi lập báo giá / hóa đơn tại ngày này.</span>
        )}
      </div>

      {service.description && <p className="svc-detail__desc">{service.description}</p>}

      <div className="svc-detail__actions">
        <button type="button" className="btn-secondary" onClick={onEdit} disabled={busy} data-testid="svc-btn-edit">
          {ICONS.edit} Sửa thông tin
        </button>
        <button type="button" className="btn-primary" onClick={onAddPrice} disabled={busy} data-testid="svc-btn-add-price">
          {ICONS.plus} Thêm mốc giá
        </button>
        {service.active ? (
          <button
            type="button"
            className="btn-secondary svc-detail__danger"
            onClick={() => setConfirmDeactivate(true)}
            disabled={busy || confirmDeactivate}
            data-testid="svc-btn-deactivate"
          >
            {ICONS.prohibit} Ngừng dịch vụ
          </button>
        ) : (
          <button
            type="button"
            className="btn-secondary"
            onClick={() => onChangeStatus(true)}
            disabled={busy}
            data-testid="svc-btn-activate"
          >
            {ICONS.refresh} Mở lại dịch vụ
          </button>
        )}
      </div>

      {confirmDeactivate && service.active && (
        <div className="dedup-confirm" role="alertdialog" aria-labelledby="svc-confirm-title" data-testid="svc-confirm-deactivate">
          <p id="svc-confirm-title">
            <strong>Ngừng “{service.name}”?</strong> Dịch vụ sẽ không còn chọn được khi lập báo giá / hóa đơn. Lịch sử
            giá và các chứng từ đã lập vẫn được giữ nguyên; có thể mở lại sau.
          </p>
          <div className="dedup-confirm__actions">
            <button type="button" className="btn-secondary" onClick={() => setConfirmDeactivate(false)} disabled={busy}>
              Không ngừng
            </button>
            <button
              type="button"
              className="btn-primary btn-danger"
              onClick={() => {
                onChangeStatus(false);
                setConfirmDeactivate(false);
              }}
              disabled={busy}
              data-testid="svc-btn-confirm-deactivate"
            >
              Xác nhận ngừng
            </button>
          </div>
        </div>
      )}

      <section className="svc-history" aria-labelledby="svc-history-title">
        <h3 className="svc-history__title" id="svc-history-title">
          Lịch sử mốc giá <span className="svc-history__count">{prices.length}</span>
        </h3>
        {prices.length === 0 ? (
          <p className="svc-history__empty">Chưa có mốc giá nào.</p>
        ) : (
          <ol className="svc-history__list" data-testid="svc-price-history">
            {prices.map((p) => {
              const state = priceState(p, service.asOf);
              return (
                <li key={p.id} className={`svc-history__item svc-history__item--${state}`} data-testid={`svc-price-${p.id}`}>
                  <span className="svc-history__dot" aria-hidden="true" />
                  <div className="svc-history__body">
                    <div className="svc-history__line">
                      <strong className="svc-history__price">{formatVnd(p.price)}</strong>
                      <span className={`svc-history__state svc-history__state--${state}`}>{STATE_LABEL[state]}</span>
                    </div>
                    <div className="svc-history__range">
                      {formatDate(p.effectiveFrom)} → {p.effectiveTo ? formatDate(p.effectiveTo) : 'nay'}
                    </div>
                    {p.note && <div className="svc-history__note">{p.note}</div>}
                    <div className="svc-history__meta">
                      Thêm bởi {p.createdBy ?? '—'} · {formatDateTime(p.createdAt)}
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </section>

      <footer className="svc-detail__audit" data-testid="svc-detail-audit">
        Tạo bởi <strong>{service.createdBy ?? '—'}</strong> lúc {formatDateTime(service.createdAt)}
        {service.updatedAt && <> · Cập nhật lần cuối {formatDateTime(service.updatedAt)}</>}
      </footer>
    </aside>
  );
}
