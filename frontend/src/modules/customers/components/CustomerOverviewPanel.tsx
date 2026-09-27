import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { fetchCustomerOverview, CustomerApiError } from '../api/customersApi';
import type {
  CustomerOverview,
  CustomerOverviewItem,
  CustomerOverviewSectionKey,
} from '../types/customerTypes';
import { roleLabels } from '../../../utils/roleLabel';
import { ICONS } from '../../../components/common/icons';
import RowActionsMenu, { type RowAction } from '../../../components/common/RowActionsMenu';
import ContractAppendixModal from '../../contracts/components/ContractAppendixModal';
import ContractLimitAlert, { type ContractLimitAlertTarget } from '../../contracts/components/ContractLimitAlert';
import RenewalModal from '../../contracts/components/RenewalModal';
import CreateProjectModal from '../../contracts/components/CreateProjectModal';
import type { ContractTargetForProject } from '../../contracts/components/CreateProjectModal';
import ProjectWbsModal from '../../projects/components/ProjectWbsModal';
import CreateProjectFromTemplateModal from '../../projects/components/CreateProjectFromTemplateModal';
import { getContract, ContractsApiError } from '../../contracts/api/contractsApi';
import type { ContractRes } from '../../contracts/types/contractTypes';

interface CustomerOverviewPanelProps {
  customerId: number;
  customerName: string;
  currentUserRoles?: string[];
  /** ID tài khoản đang đăng nhập — dùng để nút "Gán cho tôi" ở modal tạo dự án tự chọn
   *  đúng người thay vì đoán mò từ localStorage/sessionStorage. */
  currentUserId?: number;
  /** Cho phép trang cha ghi một dòng vào luồng nhật ký hiển thị mỗi lần tải xong (đối chiếu Audit Log Backend - TC-03). */
  onLoaded?: (info: { at: string; itemCount: number }) => void;
  /** Bơm sẵn dữ liệu cho kiểm thử — khi có, panel bỏ qua lần gọi API khởi tạo. */
  initialOverview?: CustomerOverview;
  /** Mở thẳng trang dự án (màn cha điều hướng). Không truyền thì dòng dự án mở hộp thoại công việc như cũ. */
  onOpenProject?: (projectId: number) => void;
  /** Mở thẳng cơ hội ở màn Cơ hội (màn cha điều hướng). */
  onOpenOpportunity?: (opportunityId: number) => void;
}

type SectionMeta = {
  key: CustomerOverviewSectionKey;
  label: string;
  icon: ReactNode;
  emptyHint: string;
};

const SECTIONS: SectionMeta[] = [
  { key: 'opportunities', label: 'Cơ hội bán hàng', icon: ICONS.target, emptyHint: 'Chưa có cơ hội nào gắn với khách hàng này.' },
  { key: 'contracts', label: 'Hợp đồng', icon: ICONS.document, emptyHint: 'Chưa có hợp đồng nào được ký với khách hàng này.' },
  { key: 'projects', label: 'Dự án', icon: ICONS.folder, emptyHint: 'Chưa có dự án nào được mở cho khách hàng này.' },
  { key: 'invoices', label: 'Hóa đơn', icon: ICONS.receipt, emptyHint: 'Chưa phát hành hóa đơn nào cho khách hàng này.' },
  { key: 'receivables', label: 'Công nợ phải thu', icon: ICONS.money, emptyHint: 'Khách hàng này hiện không có công nợ phải thu.' },
];

const currencyFormatter = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0,
});

function formatAmount(value: number | null): string {
  if (value == null || Number.isNaN(value)) return '—';
  return currencyFormatter.format(value);
}

function formatDate(value: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/** Nhãn tiếng Việt cho mã trạng thái backend (cơ hội, hợp đồng, dự án, hóa đơn, công nợ). */
const STATUS_LABELS: Record<string, string> = {
  APPROACH: 'Tiếp cận',
  SURVEY: 'Khảo sát',
  PROPOSAL: 'Báo giá',
  NEGOTIATION: 'Đàm phán',
  WON: 'Thắng',
  LOST: 'Thua',
  DRAFT: 'Nháp',
  ACTIVE: 'Đang hiệu lực',
  COMPLETED: 'Hoàn thành',
  TERMINATED: 'Đã chấm dứt',
  RUNNING: 'Đang chạy',
  CLOSED: 'Đã đóng',
  ISSUED: 'Đã phát hành',
  PARTIALLY_PAID: 'Thanh toán một phần',
  PAID: 'Đã thanh toán',
  CANCELLED: 'Đã hủy',
  OVERDUE: 'Quá hạn',
};

function statusLabel(status: string | null): string {
  if (!status) return '—';
  return STATUS_LABELS[status.toUpperCase()] ?? status;
}

const POSITIVE_STATUSES = new Set(['WON', 'ACTIVE', 'PAID', 'COMPLETED', 'RUNNING']);
const NEGATIVE_STATUSES = new Set(['LOST', 'CANCELLED', 'OVERDUE', 'CLOSED', 'TERMINATED']);

function statusClass(status: string | null): string {
  const s = (status ?? '').toUpperCase();
  if (POSITIVE_STATUSES.has(s)) return 'status-pill status-pill--active';
  if (NEGATIVE_STATUSES.has(s)) return 'status-pill status-pill--locked';
  return 'status-pill';
}

export default function CustomerOverviewPanel({
  customerId,
  customerName,
  currentUserRoles = ['VT-04'],
  currentUserId,
  onLoaded,
  initialOverview,
  onOpenProject,
  onOpenOpportunity,
}: CustomerOverviewPanelProps) {
  const [overview, setOverview] = useState<CustomerOverview | null>(initialOverview ?? null);
  const [isLoading, setIsLoading] = useState(!initialOverview);
  const [errorKind, setErrorKind] = useState<'none' | 'forbidden' | 'notFound' | 'generic'>('none');
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Ô tóm tắt chính là bộ chọn: bấm ô nào thì danh sách của nhóm đó hiện ngay bên dưới (một nhóm một
  // lúc). Trước đây ô chỉ để nhìn, còn danh sách nằm trong 6 khối thu gọn phía dưới — muốn tới hợp đồng
  // hay dự án phải mở khối rồi dò. null = chưa chọn → dùng nhóm mặc định theo vai trò (defaultView).
  const [activeView, setActiveView] = useState<CustomerOverviewSectionKey | 'timeline' | null>(null);

  // Giữ tham chiếu ổn định để callback của trang cha không làm effect chạy lại vô hạn.
  const onLoadedRef = useRef(onLoaded);
  onLoadedRef.current = onLoaded;

  const [isAppendixOpen, setIsAppendixOpen] = useState(false);
  const [isLimitAlertOpen, setIsLimitAlertOpen] = useState(false);
  const [isRenewalOpen, setIsRenewalOpen] = useState(false);
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);
  const [createProjectTarget, setCreateProjectTarget] = useState<ContractTargetForProject | null>(null);
  // NCL-05-CN-007: tạo dự án từ mẫu công việc có sẵn — dùng chung dữ liệu hợp đồng
  // với "Tạo dự án" (openCreateProject), chỉ khác modal hiển thị.
  const [isCreateFromTemplateOpen, setIsCreateFromTemplateOpen] = useState(false);
  const [isProjectWbsOpen, setIsProjectWbsOpen] = useState(false);
  const [selectedProjectWbsTarget, setSelectedProjectWbsTarget] = useState<{ id: number; code: string; name: string } | null>(null);
  const [selectedContract, setSelectedContract] = useState<ContractRes | null>(null);
  const [limitAlertTarget, setLimitAlertTarget] = useState<ContractLimitAlertTarget | null>(null);
  const [isContractLoading, setIsContractLoading] = useState(false);
  const [contractLoadError, setContractLoadError] = useState<string | null>(null);

  const openProjectWbs = (item: CustomerOverviewItem) => {
    setSelectedProjectWbsTarget({
      id: item.id,
      code: item.code ?? '',
      name: item.name ?? '',
    });
    setIsProjectWbsOpen(true);
  };

  // NCL-04-CN-004/007: nạp đúng dữ liệu hiện tại của hợp đồng trước khi mở modal phụ lục/gia hạn.
  // Hai thao tác này chỉ dành cho Nhân viên kinh doanh (VT-04). `GET /contracts/{id}` cho phép
  // VT-04/VT-02/VT-05 (đọc chi tiết một hợp đồng đã thấy tóm tắt ở đây). Khai báo loại/hạn mức,
  // mốc thanh toán và kích hoạt (chỉ Kế toán VT-05) đã chuyển sang màn hình "Hợp đồng" riêng.
  const openContractAction = useCallback(async (contractId: number, action: 'appendix' | 'renewal') => {
    setContractLoadError(null);
    setIsContractLoading(true);
    try {
      const contract = await getContract(contractId);
      setSelectedContract(contract);
      if (action === 'appendix') setIsAppendixOpen(true);
      else if (action === 'renewal') setIsRenewalOpen(true);
    } catch (err) {
      setContractLoadError(
        err instanceof ContractsApiError
          ? err.message
          : 'Không thể tải thông tin hợp đồng. Vui lòng thử lại.'
      );
    } finally {
      setIsContractLoading(false);
    }
  }, []);

  // NCL-04-CN-005: từ hồ sơ khách hàng, nút này dành cho Quản lý dự án (VT-02) —
  // Kế toán (VT-05) xem cảnh báo hạn mức ở màn hình "Hợp đồng" riêng. KHÔNG dùng
  // chung `openContractAction` — hàm đó gọi `GET /contracts/{id}` vốn chỉ cấp quyền
  // cho VT-05, nên VT-02 tái dùng sẽ luôn nhận 403 dù `GET /contracts/{id}/usage`
  // đã cho phép cả hai vai trò. Tên/mã hợp đồng để hiển thị tiêu đề đã có sẵn từ dòng tổng hợp.
  const openLimitAlert = useCallback((contractId: number, contractCode: string | null, contractName: string | null) => {
    setLimitAlertTarget({
      id: contractId,
      contractCode: contractCode ?? '—',
      name: contractName ?? '(không có tên)',
    });
    setIsLimitAlertOpen(true);
  }, []);

  // NCL-05-CN-001: Quản lý dự án (VT-02) tạo dự án từ hợp đồng.
  // Không gọi getContract(contractId) vì endpoint đó chỉ cấp quyền cho VT-05.
  // Dữ liệu hợp đồng (mã, tên, trạng thái, giá trị, ngày bắt đầu) đã có sẵn từ dòng tổng hợp.
  const openCreateProject = useCallback((item: CustomerOverviewItem) => {
    setCreateProjectTarget({
      id: item.id,
      contractCode: item.code ?? '—',
      name: item.name ?? '(không có tên)',
      status: item.status ?? '',
      customerId: customerId,
      customerName: customerName,
      contractType: item.contractType ?? undefined,
      totalValue: item.amount,
      startDate: item.date,
      endDate: item.endDate,
    });
    setIsCreateProjectOpen(true);
  }, [customerId, customerName]);

  // NCL-05-CN-007: giống openCreateProject ở trên nhưng mở modal "Tạo dự án từ mẫu"
  // thay vì modal tạo dự án trống — không dùng chung setIsCreateProjectOpen(true) để
  // tránh mở đè hai modal cùng lúc.
  const openCreateProjectFromTemplate = useCallback((item: CustomerOverviewItem) => {
    setCreateProjectTarget({
      id: item.id,
      contractCode: item.code ?? '—',
      name: item.name ?? '(không có tên)',
      status: item.status ?? '',
      customerId: customerId,
      customerName: customerName,
      contractType: item.contractType ?? undefined,
      totalValue: item.amount,
      startDate: item.date,
      endDate: item.endDate,
    });
    setIsCreateFromTemplateOpen(true);
  }, [customerId, customerName]);

  const loadOverview = useCallback(async () => {
    setIsLoading(true);
    setErrorKind('none');
    setErrorMessage('');
    try {
      const data = await fetchCustomerOverview(customerId);
      setOverview(data);
      const count =
        data.opportunities.length +
        data.contracts.length +
        data.projects.length +
        data.invoices.length +
        data.receivables.length;
      onLoadedRef.current?.({ at: new Date().toLocaleString('vi-VN'), itemCount: count });
    } catch (err) {
      const status = err instanceof CustomerApiError ? err.statusCode : undefined;
      if (status === 403) {
        setErrorKind('forbidden');
      } else if (status === 404) {
        setErrorKind('notFound');
      } else {
        setErrorKind('generic');
        setErrorMessage(
          err instanceof CustomerApiError
            ? err.message
            : err instanceof Error
            ? err.message
            : 'Không thể tải hồ sơ tổng hợp của khách hàng từ máy chủ.'
        );
      }
    } finally {
      setIsLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    if (initialOverview) {
      setIsLoading(false);
      return;
    }
    loadOverview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadOverview]);

  // TC-01: gộp toàn bộ nhóm thành một dòng thời gian duy nhất, sắp theo ngày tăng dần.
  const timeline = useMemo(() => {
    if (!overview) return [];
    const rows: Array<{ section: SectionMeta; item: CustomerOverviewItem }> = [];
    SECTIONS.forEach((section) => {
      overview[section.key].forEach((item) => rows.push({ section, item }));
    });
    return rows.sort((a, b) => {
      const da = a.item.date ? new Date(a.item.date).getTime() : Number.POSITIVE_INFINITY;
      const db = b.item.date ? new Date(b.item.date).getTime() : Number.POSITIVE_INFINITY;
      return da - db;
    });
  }, [overview]);

  const totals = useMemo(() => {
    if (!overview) return null;
    const sum = (items: CustomerOverviewItem[]) =>
      items.reduce((acc, it) => acc + (it.amount ?? 0), 0);
    return {
      opportunities: overview.opportunities.length,
      contracts: overview.contracts.length,
      contractValue: sum(overview.contracts),
      projects: overview.projects.length,
      invoices: overview.invoices.length,
      receivableValue: sum(overview.receivables),
    };
  }, [overview]);

  const isEmpty =
    !!overview &&
    timeline.length === 0;

  // Nhóm mở sẵn theo vai trò: Quản lý dự án làm việc với dự án/hợp đồng, Kinh doanh với cơ hội.
  const defaultView = useMemo<CustomerOverviewSectionKey>(() => {
    if (!overview) return 'opportunities';
    const has = (key: CustomerOverviewSectionKey) => overview[key].length > 0;
    const firstNonEmpty = SECTIONS.find((sec) => has(sec.key))?.key ?? 'opportunities';
    if (currentUserRoles.includes('VT-02')) return has('projects') ? 'projects' : has('contracts') ? 'contracts' : firstNonEmpty;
    if (currentUserRoles.includes('VT-04')) return has('opportunities') ? 'opportunities' : has('contracts') ? 'contracts' : firstNonEmpty;
    return firstNonEmpty;
  }, [overview, currentUserRoles]);
  const view = activeView ?? defaultView;

  /** Thao tác trên một dòng hợp đồng / dự án. Việc hay dùng nhất của vai trò đứng ngoài thành nút,
   *  phần còn lại vào menu ⋮ (trước đây 3–5 nút xếp hàng ngang trên mỗi dòng). */
  const renderRowActions = (key: CustomerOverviewSectionKey, item: CustomerOverviewItem) => {
    const isPm = currentUserRoles.includes('VT-02');
    const isSales = currentUserRoles.includes('VT-04');
    if (key === 'contracts') {
      const menu: RowAction[] = [];
      if (isPm) {
        menu.push({ key: 'template', label: 'Tạo dự án từ mẫu', icon: ICONS.copy, onClick: () => openCreateProjectFromTemplate(item) });
        menu.push({ key: 'limit', label: 'Cảnh báo hạn mức', icon: ICONS.alertTriangle, onClick: () => openLimitAlert(item.id, item.code, item.name) });
      }
      if (isSales) {
        menu.push({ key: 'appendix', label: 'Phụ lục điều chỉnh', icon: ICONS.edit, onClick: () => void openContractAction(item.id, 'appendix'), disabled: isContractLoading });
        menu.push({ key: 'renewal', label: 'Gia hạn hợp đồng', icon: ICONS.history, onClick: () => void openContractAction(item.id, 'renewal'), disabled: isContractLoading });
      }
      if (!isPm && menu.length === 0) return null;
      return (
        <div className="overview-row-actions">
          {isPm && (
            <button type="button" className="btn-secondary btn-sm" onClick={() => openCreateProject(item)}>
              Tạo dự án
            </button>
          )}
          {menu.length > 0 && <RowActionsMenu ariaLabel={`Thao tác với hợp đồng ${item.code || item.name || ''}`} actions={menu} />}
        </div>
      );
    }
    if (key === 'projects') {
      // Có trang dự án thì dòng đã mở thẳng trang đó; không có (vai trò khác) thì giữ hộp thoại công việc.
      if (onOpenProject) return null;
      const canView = currentUserRoles.some((r) => r === 'VT-01' || r === 'VT-02' || r === 'VT-03');
      if (!canView) return null;
      return (
        <button type="button" className="btn-secondary btn-sm" onClick={() => openProjectWbs(item)}>
          Quản lý dự án
        </button>
      );
    }
    return null;
  };

  // ----- Trạng thái tải -----
  if (isLoading) {
    return (
      <div className="user-table-card customer-summary-panel" data-testid="customer-summary-loading">
        <div className="table-loading-state">
          <div className="spinner-lg" />
          <p>Đang tải hồ sơ tổng hợp của khách hàng...</p>
        </div>
      </div>
    );
  }

  // ----- Trạng thái lỗi -----
  if (errorKind === 'forbidden') {
    return (
      <div className="user-table-card customer-summary-panel" data-testid="customer-summary-forbidden">
        <div className="table-error-state">
          <div className="table-error-state__icon">{ICONS.lock}</div>
          <div className="table-error-state__body">
            <h3>Bạn không có quyền xem hồ sơ tổng hợp của khách hàng này</h3>
            <p>
              Theo quy tắc phân quyền, chức năng này chỉ dành cho{' '}
              <strong>Nhân viên kinh doanh</strong> hoặc <strong>Quản lý dự án</strong>, và chỉ
              trong phạm vi dữ liệu được phân. Hệ thống đã ghi lại lần từ chối truy cập này.
            </p>
            <p className="cell-muted">Vai trò hiện tại: {roleLabels(currentUserRoles) || '(không xác định)'}</p>
          </div>
        </div>
      </div>
    );
  }

  if (errorKind === 'notFound') {
    return (
      <div className="user-table-card customer-summary-panel" data-testid="customer-summary-notfound">
        <div className="table-empty-state">
          <div className="table-empty-state__icon">{ICONS.search}</div>
          <h3>Không tìm thấy hồ sơ khách hàng</h3>
          <p>Hồ sơ khách hàng này có thể đã bị gộp hoặc xóa khỏi hệ thống.</p>
        </div>
      </div>
    );
  }

  if (errorKind === 'generic') {
    return (
      <div className="user-table-card customer-summary-panel" data-testid="customer-summary-error">
        <div className="table-error-state" role="alert">
          <div className="table-error-state__icon">{ICONS.alertTriangle}</div>
          <div className="table-error-state__body">
            <h3>Không tải được hồ sơ tổng hợp</h3>
            <p>{errorMessage}</p>
          </div>
          <button type="button" className="btn btn-secondary" onClick={loadOverview}>
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  // ----- Thành công -----
  return (
    <div className="user-table-card customer-summary-panel" data-testid="customer-summary-panel">
      <div className="customer-summary-toolbar">
        <div>
          <h3 className="customer-summary-title">Lịch sử hợp tác</h3>
        </div>
        <div className="overview-toolbar-actions">
        {!isEmpty && (
          <button
            type="button"
            className={`btn-secondary btn-sm ${view === 'timeline' ? 'overview-timeline-btn--active' : ''}`}
            aria-pressed={view === 'timeline'}
            onClick={() => setActiveView(view === 'timeline' ? null : 'timeline')}
          >
            {ICONS.clock} Dòng thời gian hợp tác
          </button>
        )}
        <button
          type="button"
          className="btn-icon-refresh"
          onClick={loadOverview}
          title="Tải lại hồ sơ tổng hợp từ máy chủ"
          data-testid="btn-reload-summary"
          aria-label="Tải lại hồ sơ tổng hợp"
        >
          {ICONS.refresh}
        </button>
        </div>
      </div>

      {/* Ô tóm tắt = bộ chọn nhóm. Ô nhóm trống vẫn bấm được (hiện câu "chưa có…"), nhưng nhạt hơn. */}
      {totals && overview && (
        <div className="overview-cards" role="tablist" aria-label="Nhóm dữ liệu hợp tác">
          {SECTIONS.map((section) => {
            const count = overview[section.key].length;
            const value =
              section.key === 'contracts'
                ? `${totals.contracts}`
                : section.key === 'receivables'
                  ? formatAmount(totals.receivableValue)
                  : `${count}`;
            const isActive = view === section.key;
            return (
              <button
                key={section.key}
                type="button"
                role="tab"
                aria-selected={isActive}
                className={`overview-card ${isActive ? 'overview-card--active' : ''} ${count === 0 ? 'overview-card--empty' : ''}`}
                onClick={() => setActiveView(section.key)}
                data-testid={`customer-summary-card-${section.key}`}
              >
                <span className="overview-card__label">
                  <span className="icon-sm" aria-hidden="true">{section.icon}</span>
                  {section.label}
                </span>
                <span className="overview-card__value">{value}</span>
                {section.key === 'contracts' && totals.contracts > 0 && (
                  <span className="overview-card__meta">{formatAmount(totals.contractValue)}</span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {isEmpty ? (
        <div className="table-empty-state" data-testid="customer-summary-empty" style={{ marginTop: '8px' }}>
          <div className="table-empty-state__icon">{ICONS.folder}</div>
          <h3>Chưa phát sinh dữ liệu hợp tác</h3>
          <p>Khách hàng này chưa có cơ hội, hợp đồng, dự án hay hóa đơn nào.</p>
        </div>
      ) : view === 'timeline' ? (
        /* Dòng thời gian hợp nhất (TC-01) */
        <ol className="customer-timeline" data-testid="customer-summary-timeline">
          {timeline.map(({ section, item }) => (
            <li key={`${section.key}-${item.id}`} className="customer-timeline__item">
              <span className="customer-timeline__date">{formatDate(item.date)}</span>
              <span className={`customer-timeline__tag customer-timeline__tag--${section.key}`}>
                <span className="icon-xs">{section.icon}</span> {section.label}
              </span>
              <span className="customer-timeline__name">
                {item.name || '(không có tên)'}
                {item.code && <span className="customer-timeline__code"> · {item.code}</span>}
              </span>
              {item.status && <span className={statusClass(item.status)}>{statusLabel(item.status)}</span>}
              <span className="customer-timeline__amount">{formatAmount(item.amount)}</span>
            </li>
          ))}
        </ol>
      ) : (
        (() => {
          const section = SECTIONS.find((sec) => sec.key === view)!;
          const items = overview![section.key];
          const hasActions = section.key === 'contracts' || section.key === 'projects';
          return (
            <div className="overview-section" data-testid={`customer-summary-section-${section.key}`} role="tabpanel">
              {items.length === 0 ? (
                <p className="customer-summary-section__empty cell-muted">{section.emptyHint}</p>
              ) : (
                <div className="table-responsive">
                  <table className="user-data-table list-table overview-table">
                    <thead>
                      <tr>
                        <th style={{ width: '40%' }}>{section.label}</th>
                        <th className="list-table__hide-sm" style={{ width: '14%' }}>
                          {section.key === 'receivables' ? 'Hạn thanh toán' : 'Ngày'}
                        </th>
                        <th style={{ width: '18%' }}>Trạng thái</th>
                        <th className="list-table__num" style={{ width: '20%' }}>
                          {section.key === 'receivables' ? 'Còn phải thu' : 'Giá trị'}
                        </th>
                        <th className="list-table__actions">
                          <span className="visually-hidden">Thao tác</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item) => {
                        // Dòng đi thẳng tới nơi cần đến: dự án → trang dự án, cơ hội → màn Cơ hội.
                        const open =
                          section.key === 'projects' && onOpenProject
                            ? () => onOpenProject(item.id)
                            : section.key === 'opportunities' && onOpenOpportunity
                              ? () => onOpenOpportunity(item.id)
                              : undefined;
                        return (
                          <tr
                            key={item.id}
                            className={open ? 'list-table__row' : undefined}
                            onClick={open}
                            data-testid={`customer-summary-row-${section.key}-${item.id}`}
                          >
                            <td>
                              <div className="user-profile-meta">
                                {open ? (
                                  <button
                                    type="button"
                                    className="list-table__title"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      open();
                                    }}
                                    title={item.name || undefined}
                                  >
                                    {item.name || '—'}
                                  </button>
                                ) : (
                                  <span className="list-table__name" title={item.name || undefined}>
                                    {item.name || '—'}
                                  </span>
                                )}
                                {/* Cơ hội không có mã riêng (phạm vi NCL-03). */}
                                {item.code && <span className="list-table__sub">{item.code}</span>}
                              </div>
                            </td>
                            <td className="list-table__muted list-table__hide-sm">{formatDate(item.date)}</td>
                            <td>
                              {item.status ? (
                                <span className={statusClass(item.status)}>{statusLabel(item.status)}</span>
                              ) : (
                                <span className="cell-muted">—</span>
                              )}
                            </td>
                            <td className="list-table__num">{formatAmount(item.amount)}</td>
                            <td className="list-table__actions overview-table__actions" onClick={(e) => e.stopPropagation()}>
                              {hasActions && renderRowActions(section.key, item)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })()
      )}

      {contractLoadError && (
        <div className="alert-box alert-box--danger" role="alert" style={{ marginTop: '12px' }}>
          {contractLoadError}
        </div>
      )}

      {selectedContract && (
        <ContractAppendixModal
          isOpen={isAppendixOpen}
          onClose={() => {
            setIsAppendixOpen(false);
            setSelectedContract(null);
          }}
          contract={selectedContract}
          currentUserRoles={currentUserRoles}
          onSaved={() => {
            // Không đóng modal — để người dùng thấy phụ lục vừa lập trong
            // "Lịch sử phụ lục" (NCL-04-CN-004 TC-05). Chỉ làm mới hồ sơ tổng hợp.
            void loadOverview();
          }}
        />
      )}

      {limitAlertTarget && (
        <ContractLimitAlert
          isOpen={isLimitAlertOpen}
          onClose={() => {
            setIsLimitAlertOpen(false);
            setLimitAlertTarget(null);
          }}
          contract={limitAlertTarget}
          currentUserRoles={currentUserRoles}
        />
      )}

      {selectedContract && (
        <RenewalModal
          isOpen={isRenewalOpen}
          onClose={() => {
            setIsRenewalOpen(false);
            setSelectedContract(null);
          }}
          contract={selectedContract}
          currentUserRoles={currentUserRoles}
          onSaved={() => {
            // Giữ modal mở để thấy "Lịch sử gia hạn" vừa cập nhật (NCL-04-CN-007 TC-04).
            void loadOverview();
          }}
        />
      )}

      {createProjectTarget && (
        <CreateProjectModal
          isOpen={isCreateProjectOpen}
          onClose={() => {
            setIsCreateProjectOpen(false);
            setCreateProjectTarget(null);
          }}
          contract={createProjectTarget}
          currentUserRoles={currentUserRoles}
          currentUserId={currentUserId}
          onSaved={() => {
            setIsCreateProjectOpen(false);
            setCreateProjectTarget(null);
            void loadOverview();
          }}
        />
      )}

      {createProjectTarget && (
        <CreateProjectFromTemplateModal
          isOpen={isCreateFromTemplateOpen}
          onClose={() => {
            setIsCreateFromTemplateOpen(false);
            setCreateProjectTarget(null);
          }}
          contract={createProjectTarget}
          currentUserRoles={currentUserRoles}
          currentUserId={currentUserId}
          onCreated={() => {
            setIsCreateFromTemplateOpen(false);
            setCreateProjectTarget(null);
            void loadOverview();
          }}
        />
      )}

      {selectedProjectWbsTarget && (
        <ProjectWbsModal
          isOpen={isProjectWbsOpen}
          onClose={() => {
            setIsProjectWbsOpen(false);
            setSelectedProjectWbsTarget(null);
          }}
          projectId={selectedProjectWbsTarget.id}
          projectCode={selectedProjectWbsTarget.code}
          projectName={selectedProjectWbsTarget.name}
          currentUserRoles={currentUserRoles}
          currentUserId={currentUserId}
          onUpdated={() => {
            void loadOverview();
          }}
        />
      )}
    </div>
  );
}
