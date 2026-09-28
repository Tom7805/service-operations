import { useCallback, useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { ICONS } from '../../../components/common/icons';
import RowActionsMenu, { type RowAction } from '../../../components/common/RowActionsMenu';
import { roleLabels } from '../../../utils/roleLabel';
import { CONTRACT_TYPE_LABEL, type ContractRes, type ContractStatus } from '../types/contractTypes';
import {
  fetchContracts,
  getContract,
  activateContract,
  ContractsApiError,
} from '../api/contractsApi';
import ContractTypeLimitModal from '../components/ContractTypeLimitModal';
import ContractMilestonesModal from '../components/ContractMilestonesModal';
import ContractLimitAlert from '../components/ContractLimitAlert';
import ContractExpiryReminderModal from '../components/ContractExpiryReminderModal';
import PageHeader from '../../../components/common/PageHeader';

interface ContractListPageProps {
  currentUserRoles?: string[];
  currentUserName?: string;
  /** Cho phép nạp sẵn dữ liệu trong test/SSR để bỏ qua bước gọi API. */
  initialContracts?: ContractRes[];
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
  initialContracts,
  onOpenDetail,
}: ContractListPageProps) {
  const isAllowed = currentUserRoles.includes('VT-05');

  const [contracts, setContracts] = useState<ContractRes[]>(initialContracts ?? []);
  const [isLoading, setIsLoading] = useState(!initialContracts);
  const [loadError, setLoadError] = useState<string | null>(null);
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

  const loadContracts = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const data = await fetchContracts();
      setContracts(data);
    } catch (err) {
      if (err instanceof ContractsApiError && err.statusCode === 403) {
        // Trang đã hiển thị màn từ chối quyền phía trên; không cần banner đỏ.
        setContracts([]);
      } else {
        setLoadError(
          err instanceof ContractsApiError
            ? err.message
            : 'Không tải được danh sách hợp đồng. Vui lòng thử lại.'
        );
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (initialContracts || !isAllowed) {
      setIsLoading(false);
      return;
    }
    void loadContracts();
  }, [initialContracts, isAllowed, loadContracts]);

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
      showToast(`Đã kích hoạt hợp đồng ${updated.contractCode}.`);
    } catch (err) {
      const message =
        err instanceof ContractsApiError ? err.message : 'Không kích hoạt được hợp đồng. Vui lòng thử lại.';
      setActionError(message);
      showToast(message, 'error');
    } finally {
      setBusyContractId(null);
    }
  }, []);

  const applySavedContract = (updated: ContractRes) => {
    setContracts((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
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

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return contracts.filter((c) => {
      const matchSearch =
        !q ||
        c.contractCode.toLowerCase().includes(q) ||
        (c.name ?? '').toLowerCase().includes(q) ||
        (c.customerName ?? '').toLowerCase().includes(q);
      const matchStatus = statusFilter === 'ALL' || c.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [contracts, searchTerm, statusFilter]);

  // NCL-04-CN-002 (TC-04): từ chối quyền cho vai trò khác Kế toán.
  if (!isAllowed) {
    return (
      <div className="access-denied-container" data-testid="contract-access-denied">
        <div className="access-denied-card">
          <div className="access-denied-icon">{ICONS.shieldOff}</div>
          <h2>Bạn không có thẩm quyền quản lý hợp đồng</h2>
          <p>
            Trang này dành cho <strong>Kế toán</strong>. Lần truy cập đã được ghi vào nhật ký.
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

      <PageHeader
        title="Hợp đồng"
        actions={
          <button type="button" className="btn btn-secondary" onClick={() => setIsExpiryReminderOpen(true)}>
            <span className="icon-xs">{ICONS.clock}</span> Hợp đồng sắp hết hạn
          </button>
        }
      />


      <div className="user-table-card">
        <div className="user-table-toolbar">
          <div className="search-box">
            <span className="search-box__icon" aria-hidden="true">{ICONS.search}</span>
            <input
              type="text"
              className="search-box__input"
              placeholder="Tìm hợp đồng, khách hàng"
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

        {isLoading ? (
          <div className="table-loading-state">
            <div className="spinner-lg" />
            <p>Đang tải danh sách hợp đồng...</p>
          </div>
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
            <h3>{contracts.length === 0 ? 'Chưa có hợp đồng nào' : 'Không có hợp đồng khớp bộ lọc'}</h3>
            <p>
              {contracts.length === 0
                ? 'Hợp đồng được tạo từ cơ hội đã thắng (bởi Nhân viên kinh doanh). Khi có hợp đồng, danh sách sẽ hiển thị ở đây để bạn khai báo loại và hạn mức.'
                : 'Thử đổi từ khóa tìm kiếm hoặc bộ lọc trạng thái.'}
            </p>
          </div>
        ) : (
          <div className="table-responsive">
            {/* Danh sách gọn: mỗi hàng một dòng. Mã thành dòng phụ dưới tên; hạn mức trần và ngày bắt đầu
                xem ở trang chi tiết (bấm vào hàng) — số hợp đồng chưa đặt hạn mức đã có ở ô chỉ số phía trên. */}
            <table className="user-data-table list-table" data-testid="contract-table">
              <thead>
                <tr>
                  <th style={{ ...headStyle, width: '26%' }}>Hợp đồng</th>
                  <th className="list-table__hide-sm" style={{ ...headStyle, width: '19%' }}>Khách hàng</th>
                  <th className="list-table__hide-sm" style={{ ...headStyle, width: '13%' }}>Loại</th>
                  <th className="list-table__hide-sm" style={{ ...headStyle, width: '12%', textAlign: 'right' }}>Giá trị</th>
                  <th className="list-table__hide-sm" style={{ ...headStyle, width: '11%' }}>Kết thúc</th>
                  <th style={{ ...headStyle, width: '14%' }}>Trạng thái</th>
                  <th className="list-table__actions" style={headStyle}>
                    <span className="visually-hidden">Thao tác</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => {
                  const status = STATUS_META[c.status] ?? { label: c.status, badge: 'badge--gray' };
                  const busy = busyContractId === c.id;
                  return (
                    <tr
                      key={c.id}
                      className={onOpenDetail ? 'list-table__row' : undefined}
                      onClick={onOpenDetail ? () => onOpenDetail(c.id) : undefined}
                      data-testid={`contract-row-${c.id}`}
                    >
                      <td>
                        <span className="list-table__clip" style={{ fontWeight: 500, color: 'var(--ink-strong)' }} title={c.name || undefined}>
                          {c.name || '—'}
                        </span>
                        <span className="list-table__sub" title={`ID hợp đồng: ${c.id}`}>{c.contractCode}</span>
                      </td>
                      <td className="list-table__hide-sm">
                        <span className="list-table__clip" title={c.customerName || undefined}>{c.customerName || '—'}</span>
                      </td>
                      <td className="list-table__hide-sm">
                        <span className="list-table__clip">{CONTRACT_TYPE_LABEL[c.contractType] ?? c.contractType}</span>
                      </td>
                      <td className="list-table__hide-sm" style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                        {formatAmount(c.totalValue)}
                      </td>
                      <td className="list-table__hide-sm list-table__muted" title={`${formatDate(c.startDate)} → ${formatDate(c.endDate)}`}>
                        {formatDate(c.endDate)}
                      </td>
                      <td>
                        <span className={`badge ${status.badge}`}>{status.label}</span>
                      </td>
                      <td className="list-table__actions" onClick={(e) => e.stopPropagation()}>
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
      </div>


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
