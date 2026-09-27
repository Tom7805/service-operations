import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ICONS } from '../../../components/common/icons';
import { roleLabels } from '../../../utils/roleLabel';
import {
  AdminApiError,
  getServiceCatalogItem,
  searchServiceCatalog,
  setServiceCatalogStatus,
} from '../api/serviceCatalogApi';
import ServiceCatalogFormModal from '../components/ServiceCatalogFormModal';
import ServicePriceFormModal from '../components/ServicePriceFormModal';
import ServiceCatalogDetailPanel from '../components/ServiceCatalogDetailPanel';
import type { ServiceCatalogRes } from '../types/adminTypes';
import { formatDate, formatVnd, todayIso } from '../utils/serviceCatalogUtils';
import PageHeader from '../../../components/common/PageHeader';

type StatusFilter = 'ALL' | 'ACTIVE' | 'INACTIVE';

export interface ServiceCatalogPageProps {
  currentUserRoles?: string[];
  /** Mở Nhật ký hệ thống để tra lịch sử thao tác trên danh mục (TC-04). */
  onViewAuditLog?: () => void;
}

const SEARCH_DEBOUNCE_MS = 300;

function isForbidden(err: unknown): boolean {
  return err instanceof AdminApiError && err.statusCode === 403;
}

/**
 * Quản lý danh mục dịch vụ và giá (NCL-15-CN-001, QTN-28) — một bộ dữ liệu chuẩn dùng chung cho
 * báo giá và hóa đơn. Chỉ Quản trị viên (VT-07).
 *
 * Luôn gọi API thật kể cả khi vai trò không đủ quyền: backend trả 403 và ghi "Từ chối truy cập" vào
 * Nhật ký hệ thống (TC-03). Mọi thao tác tạo/sửa/ngừng/thêm mốc giá đều do backend ghi nhật ký (TC-04).
 */
export default function ServiceCatalogPage({ currentUserRoles = [], onViewAuditLog }: ServiceCatalogPageProps) {
  const [items, setItems] = useState<ServiceCatalogRes[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);

  const [keywordInput, setKeywordInput] = useState('');
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState<StatusFilter>('ALL');
  const [asOf, setAsOf] = useState(todayIso());

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<ServiceCatalogRes | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [statusBusy, setStatusBusy] = useState(false);

  const [formMode, setFormMode] = useState<'create' | 'edit' | null>(null);
  const [priceOpen, setPriceOpen] = useState(false);

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ message, type });
    toastTimer.current = setTimeout(() => setToast(null), 5000);
  };
  useEffect(
    () => () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    },
    []
  );

  // Tìm kiếm theo tên/mã — chờ người dùng gõ xong mới gọi API.
  useEffect(() => {
    const t = setTimeout(() => setKeyword(keywordInput.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [keywordInput]);

  const loadList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await searchServiceCatalog({
        keyword,
        active: status === 'ALL' ? undefined : status === 'ACTIVE',
        asOf,
      });
      setItems(data);
      setForbidden(false);
    } catch (err) {
      if (isForbidden(err)) setForbidden(true);
      else setError(err instanceof Error ? err.message : 'Không thể tải danh mục dịch vụ.');
    } finally {
      setLoading(false);
    }
  }, [keyword, status, asOf]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  // Chi tiết cần nạp lại danh sách (vd dịch vụ vừa bị xóa) mà không phụ thuộc bộ lọc đang gõ.
  const loadListRef = useRef(loadList);
  loadListRef.current = loadList;

  const loadDetail = useCallback(
    async (id: number) => {
      setDetailLoading(true);
      setDetailError(null);
      try {
        setDetail(await getServiceCatalogItem(id, asOf));
      } catch (err) {
        if (isForbidden(err)) setForbidden(true);
        else if (err instanceof AdminApiError && err.statusCode === 404) {
          setDetail(null);
          setSelectedId(null);
          showToast('Dịch vụ không còn tồn tại. Danh mục đã được tải lại.', 'error');
          void loadListRef.current();
        } else setDetailError(err instanceof Error ? err.message : 'Không thể tải chi tiết dịch vụ.');
      } finally {
        setDetailLoading(false);
      }
    },
    [asOf]
  );

  // Response của các API ghi đã có đủ chi tiết + lịch sử giá — không cần gọi lại GET ngay sau khi lưu.
  const skipDetailLoadFor = useRef<number | null>(null);

  useEffect(() => {
    if (selectedId == null) return;
    if (skipDetailLoadFor.current === selectedId) {
      skipDetailLoadFor.current = null;
      return;
    }
    void loadDetail(selectedId);
  }, [selectedId, loadDetail]);

  const openDetail = (id: number) => {
    if (id === selectedId) return;
    setDetail(null);
    setSelectedId(id);
  };

  const closeDetail = () => {
    setSelectedId(null);
    setDetail(null);
  };

  const applySaved = (saved: ServiceCatalogRes) => {
    setDetail(saved);
    // Response của API ghi tính giá theo "hôm nay" của máy chủ — nếu đang xem giá tại ngày khác thì nạp
    // lại chi tiết theo đúng ngày đó, tránh panel hiện giá lệch với bảng.
    const sameDate = saved.asOf === asOf;
    if (saved.id !== selectedId) {
      if (sameDate) skipDetailLoadFor.current = saved.id;
    } else if (!sameDate) {
      void loadDetail(saved.id);
    }
    setSelectedId(saved.id);
    void loadList();
  };

  const handleStatus = async (active: boolean) => {
    if (!detail || statusBusy) return;
    setStatusBusy(true);
    try {
      const updated = await setServiceCatalogStatus(detail.id, active);
      applySaved(updated);
      showToast(active ? `Đã mở lại dịch vụ ${updated.code}.` : `Đã ngừng dịch vụ ${updated.code}. Lịch sử giá vẫn được giữ.`);
    } catch (err) {
      if (isForbidden(err)) setForbidden(true);
      else {
        showToast(
          err instanceof AdminApiError && err.code === 'INVALID_STATE'
            ? 'Trạng thái dịch vụ đã thay đổi ở nơi khác. Đã tải lại dữ liệu mới nhất.'
            : err instanceof Error
              ? err.message
              : 'Không thể đổi trạng thái dịch vụ.',
          'error'
        );
        void loadDetail(detail.id);
        void loadList();
      }
    } finally {
      setStatusBusy(false);
    }
  };

  if (forbidden) {
    return (
      <div className="access-denied-container" data-testid="svc-access-denied">
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

  const activeCount = items.filter((i) => i.active).length;
  const noPriceCount = items.filter((i) => i.active && !i.hasEffectivePrice).length;
  const hasFilter = keyword !== '' || status !== 'ALL';
  const isToday = asOf === todayIso();

  return (
    <div className="user-management-page svc-page" data-testid="service-catalog-page">
      <PageHeader
        title="Danh mục dịch vụ"
        actions={
          <>
            {onViewAuditLog && (
              <button type="button" className="btn-secondary" onClick={onViewAuditLog} data-testid="svc-btn-audit">
                {ICONS.clipboardList} Nhật ký
              </button>
            )}
            <button type="button" className="btn-primary" onClick={() => setFormMode('create')} data-testid="svc-btn-create">
              {ICONS.plus} Thêm dịch vụ
            </button>
          </>
        }
      />

      <div className={`svc-layout ${selectedId != null ? 'svc-layout--split' : ''}`}>
      <div className="user-table-card svc-table-card">
        <div className="user-table-toolbar">
          <div className="search-box">
            <span className="search-box__icon" aria-hidden="true">
              {ICONS.search}
            </span>
            <input
              type="text"
              className="search-box__input"
              placeholder="Tìm theo tên hoặc mã dịch vụ (DVxxxxx)…"
              value={keywordInput}
              onChange={(e) => setKeywordInput(e.target.value)}
              aria-label="Tìm dịch vụ"
              data-testid="svc-search"
            />
            {keywordInput && (
              <button
                type="button"
                className="search-box__clear"
                onClick={() => setKeywordInput('')}
                aria-label="Xóa từ khóa tìm kiếm"
              >
                {ICONS.close}
              </button>
            )}
          </div>
          <div className="toolbar-filters">
            <div className="filter-group">
              <label htmlFor="svc-status-filter" className="filter-label">
                Trạng thái:
              </label>
              <select
                id="svc-status-filter"
                className="filter-select"
                value={status}
                onChange={(e) => setStatus(e.target.value as StatusFilter)}
                data-testid="svc-status-filter"
              >
                <option value="ALL">Tất cả</option>
                <option value="ACTIVE">Đang hoạt động</option>
                <option value="INACTIVE">Đã ngừng</option>
              </select>
            </div>
            <div className="filter-group">
              <label htmlFor="svc-asof" className="filter-label">
                Giá tại ngày:
              </label>
              <input
                id="svc-asof"
                type="date"
                className="form-input svc-asof"
                value={asOf}
                onChange={(e) => e.target.value && setAsOf(e.target.value)}
                data-testid="svc-asof"
              />
              {!isToday && (
                <button type="button" className="btn-link" onClick={() => setAsOf(todayIso())} data-testid="svc-asof-today">
                  Hôm nay
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="svc-summary" aria-live="polite" data-testid="svc-summary">
          <span>
            <strong>{items.length}</strong> dịch vụ
          </span>
          <span>
            <strong>{activeCount}</strong> đang hoạt động
          </span>
          {noPriceCount > 0 && (
            <span className="svc-summary__warn">
              <strong>{noPriceCount}</strong> chưa có giá hiệu lực tại {formatDate(asOf)}
            </span>
          )}
        </div>

        {error && (
          <div className="alert alert--error svc-page__alert" role="alert">
            <span className="alert__icon">{ICONS.alertTriangle}</span>
            <span>{error}</span>
            <button type="button" className="btn-link ml-auto" onClick={() => void loadList()} data-testid="svc-retry">
              Thử lại
            </button>
          </div>
        )}

        <div className="table-responsive">
          <table className="user-data-table svc-table">
            <thead>
              <tr>
                <th scope="col">Mã</th>
                <th scope="col">Tên dịch vụ</th>
                <th scope="col">Đơn vị</th>
                <th scope="col" className="svc-table__num">
                  Giá tại {formatDate(asOf)}
                </th>
                <th scope="col">Hiệu lực từ</th>
                <th scope="col">Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {loading && items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="svc-table__empty">
                    Đang tải danh mục…
                  </td>
                </tr>
              ) : items.length === 0 && !error ? (
                <tr>
                  <td colSpan={6} className="svc-table__empty" data-testid="svc-empty">
                    {hasFilter ? (
                      <>
                        Không có dịch vụ nào khớp bộ lọc.{' '}
                        <button
                          type="button"
                          className="btn-link"
                          onClick={() => {
                            setKeywordInput('');
                            setStatus('ALL');
                          }}
                        >
                          Bỏ lọc
                        </button>
                      </>
                    ) : (
                      'Danh mục chưa có dịch vụ nào. Bấm “Thêm dịch vụ” để tạo dịch vụ đầu tiên.'
                    )}
                  </td>
                </tr>
              ) : (
                items.map((s) => (
                  <tr
                    key={s.id}
                    className={`svc-table__row ${s.id === selectedId ? 'svc-table__row--selected' : ''} ${
                      s.active ? '' : 'svc-table__row--inactive'
                    }`}
                    data-testid={`svc-row-${s.id}`}
                    aria-selected={s.id === selectedId}
                  >
                    <td className="svc-table__code">{s.code}</td>
                    <td>
                      <button
                        type="button"
                        className="svc-table__name"
                        onClick={() => openDetail(s.id)}
                        data-testid={`svc-open-${s.id}`}
                      >
                        {s.name}
                      </button>
                    </td>
                    <td>{s.unit}</td>
                    <td className="svc-table__num">
                      {s.hasEffectivePrice ? (
                        formatVnd(s.currentPrice)
                      ) : (
                        <span className="badge badge--gold" title="Không chọn được khi lập báo giá / hóa đơn tại ngày này">
                          Chưa có giá
                        </span>
                      )}
                    </td>
                    <td>{s.hasEffectivePrice ? formatDate(s.currentPriceEffectiveFrom) : '—'}</td>
                    <td>
                      <span className={`badge ${s.active ? 'badge--green' : 'badge--gray'}`}>
                        {s.active ? 'Đang hoạt động' : 'Đã ngừng'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedId != null && (
        <ServiceCatalogDetailPanel
          key={selectedId}
          service={detail}
          loading={detailLoading}
          error={detailError}
          busy={statusBusy}
          onEdit={() => setFormMode('edit')}
          onAddPrice={() => setPriceOpen(true)}
          onChangeStatus={(active) => void handleStatus(active)}
          onClose={closeDetail}
          onRetry={() => void loadDetail(selectedId)}
        />
      )}
      </div>

      <ServiceCatalogFormModal
        isOpen={formMode !== null}
        initial={formMode === 'edit' ? detail : null}
        existing={items}
        onClose={() => setFormMode(null)}
        onSaved={(saved, mode) => {
          setFormMode(null);
          applySaved(saved);
          showToast(
            mode === 'create'
              ? `Đã tạo dịch vụ ${saved.code} — “${saved.name}” đã có trong danh mục dùng chung.`
              : `Đã cập nhật thông tin dịch vụ ${saved.code}.`
          );
        }}
      />

      {detail && (
        <ServicePriceFormModal
          isOpen={priceOpen}
          service={detail}
          onClose={() => setPriceOpen(false)}
          onSaved={(updated) => {
            setPriceOpen(false);
            applySaved(updated);
            showToast(`Đã thêm mốc giá mới cho ${updated.code}. Các mốc giá cũ được giữ nguyên.`);
          }}
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
