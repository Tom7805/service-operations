import { useCallback, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { ICONS } from '../../../components/common/icons';
import RowActionsMenu, { type RowAction } from '../../../components/common/RowActionsMenu';
import { roleLabels } from '../../../utils/roleLabel';
import { CONTRACT_TYPE_LABEL, type ContractRes, type ContractStatus } from '../types/contractTypes';
import {
  fetchContractsPage,
  getContract,
  activateContract,
  ContractsApiError,
} from '../api/contractsApi';
import Pagination from '../../../components/common/Pagination';
import TableSkeleton from '../../../components/common/TableSkeleton';
import { useDebounce } from '../../../hooks/useDebounce';
import { useServerPagedList } from '../../../hooks/usePagination';
import ContractTypeLimitModal from '../components/ContractTypeLimitModal';
import ContractMilestonesModal from '../components/ContractMilestonesModal';
import ContractLimitAlert from '../components/ContractLimitAlert';
import ContractExpiryReminderModal from '../components/ContractExpiryReminderModal';

interface ContractListPageProps {
  currentUserRoles?: string[];
  currentUserName?: string;
  /** Mở trang chi tiết hợp đồng (gộp loại/hạn mức, mốc/đề xuất/định kỳ theo loại, hóa đơn, cảnh báo, gia hạn). */
  onOpenDetail?: (contractId: number) => void;
}

const STATUS_META: Record<ContractStatus, { label: string; badge: string }> = {
  DRAFT: { label: 'Nháp', badge: 'badge--gold' },
  ACTIVE: { label: 'Đang hiệu lực', badge: 'badge--green' },
  COMPLETED: { label: 'Hoàn thành', badge: 'badge--blue' },
  TERMINATED: { label: 'Đã chấm dứt', badge: 'badge--gray' },
};

const STATUS_FILTERS: Array<{ value: string; label: string }> = [
  { value: 'ALL', label: 'Tất cả trạng thái' },
  { value: 'DRAFT', label: 'Nháp' },
  { value: 'ACTIVE', label: 'Đang hiệu lực' },
  { value: 'COMPLETED', label: 'Hoàn thành' },
  { value: 'TERMINATED', label: 'Đã chấm dứt' },
];

function formatAmount(value: number | null | undefined): string {
  if (value == null) return '—';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value);
}

function formatDate(value?: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString('vi-VN');
}

const headStyle: CSSProperties = {
  padding: '12px 16px',
  fontFamily: 'var(--font-mono, monospace)',
  fontSize: '12px',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: 'var(--track-caps)',
  color: 'var(--ink-muted)',
  whiteSpace: 'nowrap',
};

/**
 * NCL-04-CN-002/003/005/006 — Màn hình "Hợp đồng" dành riêng cho Kế toán (VT-05).
 *
 * Lý do tồn tại: các nghiệp vụ khai báo loại/hạn mức, mốc thanh toán, kích hoạt và
 * nhắc gia hạn đều chỉ Kế toán thao tác được (chỉ VT-05), nhưng Kế toán KHÔNG có
 * quyền vào hồ sơ tổng hợp khách hàng (chỉ VT-04/VT-02). Trước đây lối vào duy nhất
 * cho các nghiệp vụ này lại nằm trong hồ sơ khách hàng — mâu thuẫn phân quyền. Màn
 * hình này là lối vào lấy hợp đồng làm trung tâm, đúng với API `GET /contracts`.
 */
export default function ContractListPage({
  currentUserRoles = [],
  currentUserName = 'Người dùng',
  onOpenDetail,
}: ContractListPageProps) {
  const isAllowed = currentUserRoles.includes('VT-05');

  const [actionError, setActionError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const [busyContractId, setBusyContractId] = useState<number | null>(null);
  const [selectedContract, setSelectedContract] = useState<ContractRes | null>(null);
  const [isTypeLimitOpen, setIsTypeLimitOpen] = useState(false);
  const [isMilestonesOpen, setIsMilestonesOpen] = useState(false);
  const [limitAlertTarget, setLimitAlertTarget] = useState<Pick<ContractRes, 'id' | 'contractCode' | 'name'> | null>(null);
  const [isExpiryReminderOpen, setIsExpiryReminderOpen] = useState(false);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToast({ text, type });
    window.setTimeout(() => setToast(null), 4500);
  };

  // Tìm kiếm + lọc trạng thái chạy ở máy chủ; từ khoá chờ 300ms sau lần gõ cuối mới gửi.
  const debouncedSearch = useDebounce(searchTerm.trim(), 300);
  const filters = useMemo(
    () => ({ keyword: debouncedSearch, status: statusFilter === 'ALL' ? '' : statusFilter }),
    [debouncedSearch, statusFilter]
  );

  // Danh sách hợp đồng phân trang phía máy chủ — chỉ tải đúng trang đang xem.
  const list = useServerPagedList({ filters, fetchPage: fetchContractsPage, enabled: isAllowed });
  const contracts = list.items;
  const isLoading = list.isLoading;
  const loadContracts = list.reload;
  const setContracts = list.updateItems;
  // 403: trang đã hiển thị màn từ chối quyền phía trên; không cần banner đỏ.
  const isForbidden = list.error instanceof ContractsApiError && list.error.statusCode === 403;
  const loadError =
    list.error && !isForbidden
      ? list.error instanceof ContractsApiError
        ? list.error.message
        : 'Không tải được danh sách hợp đồng. Vui lòng thử lại.'
      : null;

  const openModalFor = useCallback(async (contractId: number, kind: 'type-limit' | 'milestones') => {
    setActionError(null);
    setBusyContractId(contractId);
    try {
      const contract = await getContract(contractId);
      setSelectedContract(contract);
      if (kind === 'type-limit') setIsTypeLimitOpen(true);
      else setIsMilestonesOpen(true);
    } catch (err) {
      setActionError(
        err instanceof ContractsApiError
          ? err.message
          : 'Không tải được thông tin hợp đồng. Vui lòng thử lại.'
      );
    } finally {
      setBusyContractId(null);
    }
  }, []);

  const handleActivate = useCallback(async (contractId: number) => {
    setActionError(null);
    setBusyContractId(contractId);
    try {
      const updated = await activateContract(contractId);
      setContracts((prev) => prev.map((c) => (c.id === contractId ? updated : c)));
      // Đổi trạng thái làm đổi số liệu (Nháp/Đang hiệu lực) — tải lại để thẻ thống kê khớp.
      loadContracts();
      showToast(`Đã kích hoạt hợp đồng ${updated.contractCode}.`);
    } catch (err) {
      const message =
        err instanceof ContractsApiError ? err.message : 'Không kích hoạt được hợp đồng. Vui lòng thử lại.';
      setActionError(message);
      showToast(message, 'error');
    } finally {
      setBusyContractId(null);
    }
  }, [setContracts, loadContracts]);

  const applySavedContract = (updated: ContractRes) => {
    setContracts((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    // Khai báo hạn mức làm đổi số "Chưa khai báo hạn mức" — tải lại số liệu tổng hợp.
    loadContracts();
  };

  // Gộp mọi thao tác theo dòng vào menu kebab (⋮) — mẫu chuẩn cho bảng dữ liệu
  // (DESIGN.md § Components). Dãy 3-4 nút rời vừa tốn cột ngang vừa rối mắt.
  const rowActions = (c: ContractRes, busy: boolean): RowAction[] => {
    const actions: RowAction[] = [
      {
        key: 'view-detail',
        label: 'Xem chi tiết & lập hóa đơn',
        icon: ICONS.receipt,
        onClick: () => onOpenDetail?.(c.id),
        testId: `contract-action-detail-${c.id}`,
      },
      {
        key: 'type-limit',
        label: 'Khai báo loại & hạn mức',
        icon: ICONS.document,
        onClick: () => void openModalFor(c.id, 'type-limit'),
        disabled: busy,
        testId: `contract-action-type-limit-${c.id}`,
      },
      {
        key: 'milestones',
        label: 'Mốc thanh toán',
        icon: ICONS.money,
        onClick: () => void openModalFor(c.id, 'milestones'),
        disabled: busy,
        testId: `contract-action-milestones-${c.id}`,
      },
      {
        key: 'limit-alert',
        label: 'Cảnh báo hạn mức',
        icon: ICONS.alertTriangle,
        onClick: () => setLimitAlertTarget({ id: c.id, contractCode: c.contractCode, name: c.name }),
        testId: `contract-action-limit-alert-${c.id}`,
      },
    ];
    if (c.status === 'DRAFT') {
      actions.push({
        key: 'activate',
        label: busy ? 'Đang kích hoạt…' : 'Kích hoạt hợp đồng',
        icon: ICONS.checkCircle,
        onClick: () => void handleActivate(c.id),
        disabled: busy,
        testId: `contract-action-activate-${c.id}`,
      });
    }
    return actions;
  };

  // Máy chủ đã lọc sẵn: `contracts` chính là các dòng của trang hiện tại khớp bộ lọc.
  const filtered = contracts;
  const hasActiveFilter = Boolean(debouncedSearch) || statusFilter !== 'ALL';
  // Thẻ thống kê tính trên TOÀN BỘ hợp đồng (máy chủ), không chỉ trang đang xem.
  const stats = {
    total: list.summary?.total ?? 0,
    active: list.summary?.active ?? 0,
    draft: list.summary?.draft ?? 0,
    noLimit: list.summary?.noLimit ?? 0,
  };

  // NCL-04-CN-002 (TC-04): từ chối quyền cho vai trò khác Kế toán.
  if (!isAllowed) {
    return (
      <div className="access-denied-container" data-testid="contract-access-denied">
        <div className="access-denied-card">
          <div className="access-denied-icon">{ICONS.shieldOff}</div>
          <h2>Bạn không có thẩm quyền quản lý hợp đồng</h2>
          <p>
            Theo quy tắc phân quyền, các nghiệp vụ khai báo loại &amp; hạn mức, mốc thanh toán,
            kích hoạt và nhắc gia hạn hợp đồng chỉ dành riêng cho <strong>Kế toán</strong> (VT-05).
            Hệ thống đã ghi lại lần từ chối truy cập này vào nhật ký bảo mật (Audit Log).
          </p>
          <div className="security-log-badge">
            <span className="security-log-badge__item">
              {ICONS.shield} Thời điểm ghi nhận: {new Date().toLocaleString('vi-VN')}
            </span>
            <span className="security-log-badge__item">Tài khoản: {currentUserName}</span>
            <span className="security-log-badge__item">
              Vai trò tài khoản: {roleLabels(currentUserRoles) || '(không xác định)'}
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="user-management-page">
      {toast && (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: 'fixed',
            top: '20px',
            right: '24px',
            zIndex: 1050,
            padding: '12px 20px',
            background: toast.type === 'success' ? 'var(--pale-green-bg)' : 'var(--pale-red-bg)',
            color: toast.type === 'success' ? 'var(--pale-green-fg)' : 'var(--pale-red-fg)',
            border: `1px solid ${
              toast.type === 'success' ? 'rgba(52, 101, 56, 0.25)' : 'rgba(159, 47, 45, 0.25)'
            }`,
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '14px',
            fontWeight: 500,
          }}
        >
          <span>{toast.type === 'success' ? ICONS.checkCircle : ICONS.alertTriangle}</span>
          <span>{toast.text}</span>
        </div>
      )}

      <div className="page-header">
        <div>
          <h1 className="page-title">Hợp đồng</h1>
          <p className="page-subtitle">
            Khai báo loại &amp; hạn mức trần, quản lý mốc thanh toán, kích hoạt và nhắc gia hạn hợp đồng —
            dành cho Kế toán, không cần đi qua hồ sơ khách hàng.
          </p>
        </div>
        <div>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setIsExpiryReminderOpen(true)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
          >
            <span className="icon-xs">{ICONS.clock}</span> Nhắc hợp đồng sắp hết hạn
          </button>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-card__icon stat-card__icon--purple">{ICONS.document}</div>
          <div>
            <span className="stat-card__label">Tổng hợp đồng</span>
            <div className="stat-card__value">{stats.total}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card__icon stat-card__icon--green">{ICONS.checkCircle}</div>
          <div>
            <span className="stat-card__label">Đang hiệu lực</span>
            <div className="stat-card__value">{stats.active}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card__icon stat-card__icon--amber">{ICONS.clipboardList}</div>
          <div>
            <span className="stat-card__label">Đang ở bản nháp</span>
            <div className="stat-card__value">{stats.draft}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card__icon stat-card__icon--blue">{ICONS.alertTriangle}</div>
          <div>
            <span className="stat-card__label">Chưa đặt hạn mức trần</span>
            <div className="stat-card__value">{stats.noLimit}</div>
          </div>
        </div>
      </div>

      <div className="user-table-card">
        <div className="user-table-toolbar">
          <div className="search-box">
            <span className="search-box__icon" aria-hidden="true">{ICONS.search}</span>
            <input
              type="text"
              className="search-box__input"
              placeholder="Tìm theo mã hợp đồng, tên hợp đồng hoặc tên khách hàng..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              aria-label="Tìm kiếm hợp đồng"
            />
            {searchTerm && (
              <button
                type="button"
                className="search-box__clear"
                onClick={() => setSearchTerm('')}
                aria-label="Xóa từ khóa tìm kiếm"
              >
                {ICONS.close}
              </button>
            )}
          </div>

          <div className="toolbar-filters">
            <div className="filter-group">
              <label htmlFor="contract-status-filter" className="filter-label">Trạng thái:</label>
              <select
                id="contract-status-filter"
                className="filter-select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                {STATUS_FILTERS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <button
              type="button"
              className="btn-icon-refresh"
              onClick={() => void loadContracts()}
              title="Tải lại danh sách hợp đồng"
              aria-label="Tải lại danh sách hợp đồng"
            >
              {ICONS.refresh}
            </button>
          </div>
        </div>

        {actionError && (
          <div className="alert-box alert-box--danger" role="alert" style={{ margin: '0 16px 12px' }}>
            {actionError}
          </div>
        )}

        {isLoading && !list.hasLoaded ? (
          <table className="user-data-table" aria-label="Đang tải danh sách hợp đồng">
            <tbody>
              <TableSkeleton columns={9} rows={6} />
            </tbody>
          </table>
        ) : loadError ? (
          <div className="table-error-state" role="alert">
            <div className="table-error-state__icon">{ICONS.alertTriangle}</div>
            <div className="table-error-state__body">
              <h3>Không tải được danh sách hợp đồng</h3>
              <p>{loadError}</p>
            </div>
            <button type="button" className="btn btn-secondary" onClick={() => void loadContracts()}>
              Thử lại
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="table-empty-state" data-testid="contract-empty">
            <div className="table-empty-state__icon">{ICONS.document}</div>
            <h3>{!hasActiveFilter ? 'Chưa có hợp đồng nào' : 'Không có hợp đồng khớp bộ lọc'}</h3>
            <p>
              {!hasActiveFilter
                ? 'Hợp đồng được tạo từ cơ hội đã thắng (bởi Nhân viên kinh doanh). Khi có hợp đồng, danh sách sẽ hiển thị ở đây để bạn khai báo loại và hạn mức.'
                : 'Thử đổi từ khóa tìm kiếm hoặc bộ lọc trạng thái.'}
            </p>
          </div>
        ) : (
          <div
            className={`table-responsive${isLoading ? ' is-refreshing' : ''}`}
            aria-busy={isLoading}
          >
            <table className="user-data-table" data-testid="contract-table">
              <thead>
                <tr>
                  <th style={headStyle}>Mã hợp đồng</th>
                  <th style={headStyle}>Tên hợp đồng</th>
                  <th style={headStyle}>Khách hàng</th>
                  <th style={headStyle}>Loại</th>
                  <th style={{ ...headStyle, textAlign: 'right' }}>Giá trị</th>
                  <th style={{ ...headStyle, textAlign: 'right' }}>Hạn mức trần</th>
                  <th style={headStyle}>Hiệu lực</th>
                  <th style={headStyle}>Trạng thái</th>
                  <th style={{ ...headStyle, textAlign: 'right' }}>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => {
                  const status = STATUS_META[c.status] ?? { label: c.status, badge: 'badge--gray' };
                  const busy = busyContractId === c.id;
                  return (
                    <tr
                      key={c.id}
                      onClick={onOpenDetail ? () => onOpenDetail(c.id) : undefined}
                      style={onOpenDetail ? { cursor: 'pointer' } : undefined}
                      data-testid={`contract-row-${c.id}`}
                    >
                      <td style={{ fontFamily: 'var(--font-mono, monospace)', fontWeight: 600 }} title={`ID hợp đồng: ${c.id}`}>
                        {c.contractCode}
                      </td>
                      <td>{c.name || '—'}</td>
                      <td>{c.customerName || '—'}</td>
                      <td>{CONTRACT_TYPE_LABEL[c.contractType] ?? c.contractType}</td>
                      <td style={{ textAlign: 'right' }}>{formatAmount(c.totalValue)}</td>
                      <td style={{ textAlign: 'right' }}>
                        {c.limitValue == null ? (
                          <span className="cell-muted">Chưa đặt</span>
                        ) : (
                          formatAmount(c.limitValue)
                        )}
                      </td>
                      <td className="cell-muted" style={{ whiteSpace: 'nowrap' }}>
                        {formatDate(c.startDate)} → {formatDate(c.endDate)}
                      </td>
                      <td>
                        <span className={`badge ${status.badge}`}>{status.label}</span>
                      </td>
                      <td style={{ textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                        <RowActionsMenu
                          ariaLabel={`Thao tác hợp đồng ${c.contractCode}`}
                          actions={rowActions(c, busy)}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {list.hasLoaded && !loadError && (
          <Pagination
            page={list.page}
            totalPages={list.totalPages}
            totalElements={list.totalElements}
            pageSize={list.pageSize}
            itemLabel="hợp đồng"
            loading={isLoading}
            onPageChange={list.setPage}
            testIdPrefix="contract-pagination"
          />
        )}
      </div>

      <p className="customer-summary-scope-note cell-muted" style={{ marginTop: '12px' }}>
        <span className="icon-xs">{ICONS.info}</span> Kế toán (VT-05) có phạm vi dữ liệu toàn công ty nên thấy mọi
        hợp đồng. Mỗi lần khai báo loại/hạn mức hoặc đổi mốc thanh toán đều được ghi vào nhật ký hợp đồng
        (người thực hiện · nội dung · thời điểm).
      </p>

      {selectedContract && (
        <ContractTypeLimitModal
          isOpen={isTypeLimitOpen}
          onClose={() => {
            setIsTypeLimitOpen(false);
            setSelectedContract(null);
          }}
          contract={selectedContract}
          currentUserRoles={currentUserRoles}
          onSaved={(updated) => {
            applySavedContract(updated);
            setIsTypeLimitOpen(false);
            setSelectedContract(null);
            showToast(`Đã lưu loại & hạn mức cho hợp đồng ${updated.contractCode}.`);
          }}
        />
      )}

      {selectedContract && (
        <ContractMilestonesModal
          isOpen={isMilestonesOpen}
          onClose={() => {
            setIsMilestonesOpen(false);
            setSelectedContract(null);
          }}
          contract={selectedContract}
          currentUserRoles={currentUserRoles}
          onSaved={() => {
            setIsMilestonesOpen(false);
            setSelectedContract(null);
            showToast('Đã lưu danh sách mốc thanh toán.');
          }}
        />
      )}

      {limitAlertTarget && (
        <ContractLimitAlert
          isOpen
          onClose={() => setLimitAlertTarget(null)}
          contract={limitAlertTarget}
          currentUserRoles={currentUserRoles}
        />
      )}

      <ContractExpiryReminderModal
        isOpen={isExpiryReminderOpen}
        onClose={() => setIsExpiryReminderOpen(false)}
        currentUserRoles={currentUserRoles}
      />
    </div>
  );
}
