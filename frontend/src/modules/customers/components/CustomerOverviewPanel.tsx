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
import ContractTypeLimitModal from '../../contracts/components/ContractTypeLimitModal';
import ContractMilestonesModal from '../../contracts/components/ContractMilestonesModal';
import ContractAppendixModal from '../../contracts/components/ContractAppendixModal';
import ContractLimitAlert, { type ContractLimitAlertTarget } from '../../contracts/components/ContractLimitAlert';
import ContractExpiryReminderModal from '../../contracts/components/ContractExpiryReminderModal';
import RenewalModal from '../../contracts/components/RenewalModal';
import { getContract, activateContract, ContractsApiError } from '../../contracts/api/contractsApi';
import type { ContractRes } from '../../contracts/types/contractTypes';
import { t } from '../../../i18n';

interface CustomerOverviewPanelProps {
  customerId: number;
  customerName: string;
  currentUserRoles?: string[];
  /** Cho phép trang cha ghi một dòng vào luồng nhật ký hiển thị mỗi lần tải xong (đối chiếu Audit Log Backend - TC-03). */
  onLoaded?: (info: { at: string; itemCount: number }) => void;
  /** Bơm sẵn dữ liệu cho kiểm thử — khi có, panel bỏ qua lần gọi API khởi tạo. */
  initialOverview?: CustomerOverview;
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

function statusClass(status: string | null): string {
  const s = (status ?? '').toUpperCase();
  if (['WON', 'ACTIVE', 'PAID', 'DONE', 'COMPLETED', 'SIGNED', 'RUNNING'].some((k) => s.includes(k))) {
    return 'status-pill status-pill--active';
  }
  if (['LOST', 'CANCELLED', 'OVERDUE', 'CLOSED', 'REJECTED'].some((k) => s.includes(k))) {
    return 'status-pill status-pill--locked';
  }
  return 'status-pill';
}

export default function CustomerOverviewPanel({
  customerId,
  customerName,
  currentUserRoles = ['VT-04'],
  onLoaded,
  initialOverview,
}: CustomerOverviewPanelProps) {
  const [overview, setOverview] = useState<CustomerOverview | null>(initialOverview ?? null);
  const [isLoading, setIsLoading] = useState(!initialOverview);
  const [errorKind, setErrorKind] = useState<'none' | 'forbidden' | 'notFound' | 'generic'>('none');
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Giữ tham chiếu ổn định để callback của trang cha không làm effect chạy lại vô hạn.
  const onLoadedRef = useRef(onLoaded);
  onLoadedRef.current = onLoaded;

  const [isTypeLimitOpen, setIsTypeLimitOpen] = useState(false);
  const [isMilestonesOpen, setIsMilestonesOpen] = useState(false);
  const [isAppendixOpen, setIsAppendixOpen] = useState(false);
  const [isLimitAlertOpen, setIsLimitAlertOpen] = useState(false);
  const [isExpiringReminderOpen, setIsExpiringReminderOpen] = useState(false);
  const [isRenewalOpen, setIsRenewalOpen] = useState(false);
  const [selectedContract, setSelectedContract] = useState<ContractRes | null>(null);
  const [limitAlertTarget, setLimitAlertTarget] = useState<ContractLimitAlertTarget | null>(null);
  const [isContractLoading, setIsContractLoading] = useState(false);
  const [contractLoadError, setContractLoadError] = useState<string | null>(null);
  const [activatingContractId, setActivatingContractId] = useState<number | null>(null);

  // NCL-04-CN-002/003/004/007: nạp đúng dữ liệu hiện tại của hợp đồng trước khi mở modal sửa/điều chỉnh/gia hạn.
  // Cả các thao tác này (khai báo loại/hạn mức, mốc thanh toán, phụ lục, gia hạn) chỉ dành cho
  // vai trò VT-05/VT-04 — trùng đúng phạm vi quyền của API `GET /contracts/{id}`.
  const openContractAction = useCallback(async (contractId: number, action: 'type-limit' | 'milestones' | 'appendix' | 'renewal') => {
    setContractLoadError(null);
    setIsContractLoading(true);
    try {
      const contract = await getContract(contractId);
      setSelectedContract(contract);
      if (action === 'type-limit') setIsTypeLimitOpen(true);
      else if (action === 'milestones') setIsMilestonesOpen(true);
      else if (action === 'appendix') setIsAppendixOpen(true);
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

  // NCL-04-CN-005: mở màn hình cảnh báo hạn mức cho cả VT-02 lẫn VT-05. KHÔNG
  // dùng chung `openContractAction` — hàm đó gọi `GET /contracts/{id}` vốn chỉ
  // cấp quyền cho VT-05, nên nếu tái dùng thì Quản lý dự án (VT-02) bấm nút này
  // sẽ luôn nhận lỗi 403 dù bản thân API `GET /contracts/{id}/usage` đã cho phép
  // cả hai vai trò. Tên/mã hợp đồng để hiển thị tiêu đề đã có sẵn từ dòng tổng hợp.
  const openLimitAlert = useCallback((contractId: number, contractCode: string | null, contractName: string | null) => {
    setLimitAlertTarget({
      id: contractId,
      contractCode: contractCode ?? '—',
      name: contractName ?? '(không có tên)',
    });
    setIsLimitAlertOpen(true);
  }, []);

  // NCL-04-CN-002: kích hoạt hợp đồng DRAFT → ACTIVE, điều kiện bắt buộc để dùng
  // được phụ lục điều chỉnh (NCL-04-CN-004) và gia hạn (NCL-04-CN-007). Không cần
  // nạp trước dữ liệu hợp đồng như các thao tác mở modal khác — đây là một hành
  // động chuyển trạng thái tức thời, không phải một form.
  const handleActivateContract = useCallback(async (contractId: number) => {
    setContractLoadError(null);
    setActivatingContractId(contractId);
    try {
      await activateContract(contractId);
      await loadOverview();
    } catch (err) {
      setContractLoadError(
        err instanceof ContractsApiError
          ? err.message
          : 'Không thể kích hoạt hợp đồng. Vui lòng thử lại.'
      );
    } finally {
      setActivatingContractId(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
          <h3 className="customer-summary-title">Hồ sơ tổng hợp — {customerName}</h3>
          <p className="customer-summary-subtitle">
            Toàn cảnh cơ hội, hợp đồng, dự án, hóa đơn và công nợ của khách hàng theo dòng thời gian.
          </p>
        </div>
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

      {/* Dải chỉ số nhanh */}
      {totals && (
        <div className="stats-grid customer-summary-stats">
          <div className="stat-card">
            <div className="stat-card__icon stat-card__icon--blue">{ICONS.target}</div>
            <div>
              <span className="stat-card__label">Cơ hội bán hàng</span>
              <div className="stat-card__value">{totals.opportunities}</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-card__icon stat-card__icon--purple">{ICONS.document}</div>
            <div>
              <span className="stat-card__label">Hợp đồng · Tổng giá trị</span>
              <div className="stat-card__value" style={{ fontSize: '15px' }}>
                {totals.contracts} · {formatAmount(totals.contractValue)}
              </div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-card__icon stat-card__icon--green">{ICONS.folder}</div>
            <div>
              <span className="stat-card__label">Dự án</span>
              <div className="stat-card__value">{totals.projects}</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-card__icon stat-card__icon--blue">{ICONS.receipt}</div>
            <div>
              <span className="stat-card__label">Hóa đơn</span>
              <div className="stat-card__value">{totals.invoices}</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-card__icon stat-card__icon--red">{ICONS.money}</div>
            <div>
              <span className="stat-card__label">Công nợ phải thu</span>
              <div className="stat-card__value text-warning" style={{ fontSize: '15px' }}>
                {formatAmount(totals.receivableValue)}
              </div>
            </div>
          </div>
        </div>
      )}

      {isEmpty ? (
        <div className="table-empty-state" data-testid="customer-summary-empty" style={{ marginTop: '8px' }}>
          <div className="table-empty-state__icon">{ICONS.folder}</div>
          <h3>Chưa phát sinh dữ liệu hợp tác</h3>
          <p>
            Khách hàng này chưa có cơ hội, hợp đồng, dự án, hóa đơn hay công nợ nào trong phạm vi bạn được xem.
            Bảng tổng hợp sẽ tự cập nhật khi các nghiệp vụ liên quan được tạo.
          </p>
        </div>
      ) : (
        <>
          {/* Dòng thời gian hợp nhất (TC-01) */}
          <div className="customer-summary-section">
            <h4 className="customer-summary-section__title"><span className="icon-sm">{ICONS.clock}</span> Dòng thời gian hợp tác</h4>
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
                  {item.status && <span className={statusClass(item.status)}>{item.status}</span>}
                  <span className="customer-timeline__amount">{formatAmount(item.amount)}</span>
                </li>
              ))}
            </ol>
          </div>

          {/* Từng nhóm chi tiết */}
          {SECTIONS.map((section) => {
            const items = overview![section.key];
            return (
              <div
                key={section.key}
                className="customer-summary-section"
                data-testid={`customer-summary-section-${section.key}`}
              >
                <h4 className="customer-summary-section__title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                  <span>
                    <span className="icon-sm">{section.icon}</span> {section.label} <span className="cell-muted">({items.length})</span>
                  </span>
                  {section.key === 'contracts' && currentUserRoles.includes('VT-05') && (
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      style={{ fontSize: '13px', padding: '4px 10px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                      onClick={() => setIsExpiringReminderOpen(true)}
                    >
                      <span className="icon-xs">{ICONS.clock}</span> Nhắc hợp đồng sắp hết hạn
                    </button>
                  )}
                </h4>
                {items.length === 0 ? (
                  <p className="customer-summary-section__empty cell-muted">{section.emptyHint}</p>
                ) : (
                  <div className="table-responsive">
                    <table className="user-data-table">
                          <thead>
                            <tr>
                              <th style={{ width: '120px' }}>Ngày</th>
                              <th style={{ width: '140px' }}>Mã</th>
                              <th>Tên</th>
                              <th style={{ width: '140px' }}>Trạng thái</th>
                              <th style={{ width: '160px', textAlign: 'right' }}>Giá trị</th>
                              <th style={{ width: '160px', textAlign: 'right' }}>Hành động</th>
                            </tr>
                          </thead>
                      <tbody>
                        {items.map((item) => (
                          <tr key={item.id}>
                            <td>{formatDate(item.date)}</td>
                            <td>{item.code || '—'}</td>
                            <td>{item.name || '—'}</td>
                            <td>
                              {item.status ? (
                                <span className={statusClass(item.status)}>{item.status}</span>
                              ) : (
                                <span className="cell-muted">—</span>
                              )}
                            </td>
                            <td style={{ textAlign: 'right' }}>{formatAmount(item.amount)}</td>
                            <td style={{ textAlign: 'right' }}>
                              {section.key === 'contracts' ? (
                                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                                  {currentUserRoles.includes('VT-05') && (
                                    <>
                                      <button
                                        type="button"
                                        className="btn btn-secondary"
                                        onClick={() => void openContractAction(item.id, 'type-limit')}
                                        disabled={isContractLoading}
                                      >
                                        {t('contract.action.button')}
                                      </button>
                                      <button
                                        type="button"
                                        className="btn btn-secondary"
                                        onClick={() => void openContractAction(item.id, 'milestones')}
                                        disabled={isContractLoading}
                                      >
                                        Mốc thanh toán
                                      </button>
                                      {(item.status ?? '').toUpperCase() === 'DRAFT' && (
                                        <button
                                          type="button"
                                          className="btn btn-secondary"
                                          onClick={() => void handleActivateContract(item.id)}
                                          disabled={activatingContractId === item.id}
                                        >
                                          {activatingContractId === item.id ? 'Đang kích hoạt…' : 'Kích hoạt hợp đồng'}
                                        </button>
                                      )}
                                    </>
                                  )}
                                  {(currentUserRoles.includes('VT-02') || currentUserRoles.includes('VT-05')) && (
                                    <button
                                      type="button"
                                      className="btn btn-secondary"
                                      onClick={() => openLimitAlert(item.id, item.code, item.name)}
                                    >
                                      Cảnh báo hạn mức
                                    </button>
                                  )}
                                  {currentUserRoles.includes('VT-04') && (
                                    <>
                                      <button
                                        type="button"
                                        className="btn btn-secondary"
                                        onClick={() => void openContractAction(item.id, 'appendix')}
                                        disabled={isContractLoading}
                                      >
                                        Phụ lục điều chỉnh
                                      </button>
                                      <button
                                        type="button"
                                        className="btn btn-secondary"
                                        onClick={() => void openContractAction(item.id, 'renewal')}
                                        disabled={isContractLoading}
                                      >
                                        Gia hạn hợp đồng
                                      </button>
                                    </>
                                  )}
                                  {!currentUserRoles.includes('VT-05') && !currentUserRoles.includes('VT-02') && !currentUserRoles.includes('VT-04') && (
                                    <span className="cell-muted">—</span>
                                  )}
                                </div>
                              ) : (
                                <span className="cell-muted">—</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </>
      )}

      <p className="customer-summary-scope-note cell-muted">
        <span className="icon-xs">{ICONS.info}</span> Dữ liệu hiển thị nằm trong phạm vi truy cập của bạn theo vai trò và nhánh tổ chức được phân.
        Mỗi lần mở hồ sơ tổng hợp đều được hệ thống ghi vào nhật ký (người thực hiện · nội dung · thời điểm).
      </p>

      {contractLoadError && (
        <div className="alert-box alert-box--danger" role="alert" style={{ marginTop: '12px' }}>
          {contractLoadError}
        </div>
      )}

      {selectedContract && (
        <ContractTypeLimitModal
          isOpen={isTypeLimitOpen}
          onClose={() => setIsTypeLimitOpen(false)}
          contract={selectedContract}
          currentUserRoles={currentUserRoles}
          onSaved={() => {
            setIsTypeLimitOpen(false);
            setSelectedContract(null);
            void loadOverview();
          }}
        />
      )}

      {selectedContract && (
        <ContractMilestonesModal
          isOpen={isMilestonesOpen}
          onClose={() => setIsMilestonesOpen(false)}
          contract={selectedContract}
          currentUserRoles={currentUserRoles}
          onSaved={() => {
            setIsMilestonesOpen(false);
            setSelectedContract(null);
            void loadOverview();
          }}
        />
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
            setIsAppendixOpen(false);
            setSelectedContract(null);
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

      <ContractExpiryReminderModal
        isOpen={isExpiringReminderOpen}
        onClose={() => setIsExpiringReminderOpen(false)}
        currentUserRoles={currentUserRoles}
      />

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
            setIsRenewalOpen(false);
            setSelectedContract(null);
            void loadOverview();
          }}
        />
      )}
    </div>
  );
}
