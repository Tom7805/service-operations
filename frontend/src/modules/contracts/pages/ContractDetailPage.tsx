import { useCallback, useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { ICONS } from '../../../components/common/icons';
import { roleLabels } from '../../../utils/roleLabel';
import {
  CONTRACT_TYPE_LABEL,
  type ContractRes,
  type ContractMilestoneRes,
  type ContractUsageRes,
} from '../types/contractTypes';
import { getContract, fetchMilestones, getContractUsage, ContractsApiError } from '../api/contractsApi';
import { fetchProjectsByContract, ProjectsApiError } from '../../projects/api/projectsApi';
import type { ProjectRes } from '../../projects/types/projectTypes';
import type { InvoiceDetailRes, InvoiceProposalRes, RecurringScheduleRes, InvoiceStatus } from '../../invoices/types/invoiceTypes';
import {
  fetchInvoices,
  createInvoiceProposal,
  fetchInvoiceProposals,
  convertProposalToInvoice,
  cancelInvoiceProposal,
  getRecurringSchedule,
  createRecurringSchedule,
  updateRecurringSchedule,
  InvoicesApiError,
} from '../../invoices/api/invoicesApi';
import { validateProposalForm, validateRecurringScheduleForm } from '../../invoices/validators/invoiceValidators';
import ContractTypeLimitModal from '../components/ContractTypeLimitModal';
import ContractMilestonesModal from '../components/ContractMilestonesModal';
import ContractLimitAlert from '../components/ContractLimitAlert';
import ContractExpiryReminderModal from '../components/ContractExpiryReminderModal';
import MilestoneAcceptancePanel from '../../acceptance/components/MilestoneAcceptancePanel';
import { checkMilestoneLinkAccess } from '../../acceptance/api/acceptanceApi';

interface Props {
  contractId: number;
  currentUserRoles?: string[];
  currentUserName?: string;
  onBack: () => void;
}

const STATUS_META: Record<string, { label: string; badge: string }> = {
  DRAFT: { label: 'Nháp', badge: 'badge--gold' },
  ACTIVE: { label: 'Đang hiệu lực', badge: 'badge--green' },
  COMPLETED: { label: 'Hoàn thành', badge: 'badge--blue' },
  TERMINATED: { label: 'Đã chấm dứt', badge: 'badge--gray' },
};

const MILESTONE_STATUS_LABEL: Record<string, string> = {
  PENDING: 'Chờ nghiệm thu',
  READY_TO_INVOICE: 'Sẵn sàng xuất hóa đơn',
  INVOICED: 'Đã xuất hóa đơn',
};

const INVOICE_STATUS_META: Record<InvoiceStatus, { label: string; badge: string }> = {
  DRAFT: { label: 'Nháp', badge: 'badge--gray' },
  ISSUED: { label: 'Đã phát hành', badge: 'badge--blue' },
  PARTIALLY_PAID: { label: 'Thu một phần', badge: 'badge--gold' },
  PAID: { label: 'Đã thu đủ', badge: 'badge--green' },
  CANCELLED: { label: 'Đã hủy', badge: 'badge--gray' },
};

// Dựng formatter một lần — trước đây mỗi ô tiền của mỗi hàng tạo mới một Intl.NumberFormat.
const AMOUNT_FORMAT = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 });
function formatAmount(value: number | null | undefined): string {
  if (value == null) return '—';
  return AMOUNT_FORMAT.format(value);
}

function formatDate(value?: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString('vi-VN');
}

function daysRemaining(endDate?: string | null): number | null {
  if (!endDate) return null;
  const end = new Date(endDate);
  if (Number.isNaN(end.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  return Math.round((end.getTime() - today.getTime()) / 86400000);
}

/**
 * Trang chi tiết một hợp đồng — gộp MỌI thao tác của Kế toán (VT-05) liên quan tới
 * hợp đồng này vào một chỗ, thay vì phải rời trang để vào menu "Hóa đơn" riêng:
 *  - Loại & hạn mức, hạn mức đã dùng (usage bar).
 *  - Mốc thanh toán (FIXED_PRICE/MILESTONE) — quản lý & lập hóa đơn theo mốc.
 *  - Đề xuất hóa đơn (TIME_AND_MATERIAL) — form nhúng thẳng, hợp đồng đã chọn sẵn.
 *  - Hóa đơn định kỳ (MAINTENANCE) — form nhúng thẳng, hợp đồng đã chọn sẵn.
 *  - Lịch sử hóa đơn đã lập của hợp đồng.
 *  - Cảnh báo hạn mức & nhắc gia hạn.
 * Nội dung phần "lập hóa đơn" tự đổi theo `contract.contractType` — đúng nghiệp vụ
 * (mỗi loại hợp đồng có một cách lập hóa đơn khác nhau, không dùng lẫn được).
 */
export default function ContractDetailPage({ contractId, currentUserRoles = [], currentUserName = 'Người dùng', onBack }: Props) {
  const isAllowed = currentUserRoles.includes('VT-05');

  const [contract, setContract] = useState<ContractRes | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const [usage, setUsage] = useState<ContractUsageRes | null>(null);

  const [milestones, setMilestones] = useState<ContractMilestoneRes[]>([]);
  const [milestonesLoading, setMilestonesLoading] = useState(false);

  const [invoices, setInvoices] = useState<InvoiceDetailRes[]>([]);
  const [invoicesLoading, setInvoicesLoading] = useState(false);
  const [invoicesError, setInvoicesError] = useState<string | null>(null);

  const [isTypeLimitOpen, setIsTypeLimitOpen] = useState(false);
  const [isMilestonesModalOpen, setIsMilestonesModalOpen] = useState(false);
  const [isLimitAlertOpen, setIsLimitAlertOpen] = useState(false);
  const [isExpiryReminderOpen, setIsExpiryReminderOpen] = useState(false);
  // Tăng mỗi lần danh sách mốc được lưu lại ở modal quản lý mốc → khối nghiệm thu theo mốc nạp lại.
  const [milestonesVersion, setMilestonesVersion] = useState(0);

  // NCL-12-CN-003 TC-03: trang này là lối vào chức năng gắn nghiệm thu với mốc thanh toán — người không phải
  // Kế toán mở vào thì gọi thật endpoint của chức năng để backend ghi nhật ký lần từ chối.
  useEffect(() => {
    if (isAllowed) return;
    checkMilestoneLinkAccess(contractId).catch(() => undefined);
  }, [isAllowed, contractId]);

  // Một bộ hẹn giờ duy nhất cho toast: toast mới huỷ hẹn giờ cũ (không bị đóng sớm),
  // và huỷ khi rời trang để không set state sau unmount.
  const toastTimerRef = useRef<number | null>(null);
  useEffect(() => () => {
    if (toastTimerRef.current != null) window.clearTimeout(toastTimerRef.current);
  }, []);
  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToast({ text, type });
    if (toastTimerRef.current != null) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToast(null), 4500);
  };

  // Số thứ tự yêu cầu cho từng nhóm dữ liệu: chỉ phản hồi của yêu cầu MỚI NHẤT được ghi vào
  // state. Bấm "Tải lại" liên tiếp hoặc đổi hợp đồng khi yêu cầu cũ chưa về thì phản hồi cũ
  // (về muộn) không còn đè lên dữ liệu mới.
  const coreReqRef = useRef(0);
  const milestonesReqRef = useRef(0);
  const invoicesReqRef = useRef(0);

  const loadCore = useCallback(async () => {
    const reqId = ++coreReqRef.current;
    setLoading(true);
    setLoadError(null);
    try {
      const [c, u] = await Promise.all([
        getContract(contractId),
        getContractUsage(contractId).catch(() => null),
      ]);
      if (reqId !== coreReqRef.current) return;
      setContract(c);
      setUsage(u);
    } catch (err) {
      if (reqId !== coreReqRef.current) return;
      setLoadError(err instanceof ContractsApiError ? err.message : 'Không tải được thông tin hợp đồng.');
    } finally {
      if (reqId === coreReqRef.current) setLoading(false);
    }
  }, [contractId]);

  const loadMilestones = useCallback(async () => {
    const reqId = ++milestonesReqRef.current;
    setMilestonesLoading(true);
    try {
      const list = await fetchMilestones(contractId);
      if (reqId === milestonesReqRef.current) setMilestones(list);
    } catch {
      if (reqId === milestonesReqRef.current) setMilestones([]);
    } finally {
      if (reqId === milestonesReqRef.current) setMilestonesLoading(false);
    }
  }, [contractId]);

  const loadInvoices = useCallback(async () => {
    const reqId = ++invoicesReqRef.current;
    setInvoicesLoading(true);
    setInvoicesError(null);
    try {
      const list = await fetchInvoices(contractId);
      if (reqId === invoicesReqRef.current) setInvoices(list);
    } catch (err) {
      if (reqId !== invoicesReqRef.current) return;
      setInvoicesError(err instanceof InvoicesApiError ? err.message : 'Không tải được danh sách hóa đơn.');
    } finally {
      if (reqId === invoicesReqRef.current) setInvoicesLoading(false);
    }
  }, [contractId]);

  useEffect(() => {
    if (!isAllowed) {
      setLoading(false);
      return;
    }
    void loadCore();
    void loadInvoices();
  }, [isAllowed, loadCore, loadInvoices]);

  // Chỉ phụ thuộc vào id + loại hợp đồng, không phụ thuộc cả object `contract`: trước đây
  // mỗi lần setContract (lưu hạn mức, tải lại) đều nạp lại mốc lần nữa — cộng với refreshAll()
  // vốn đã gọi loadMilestones, mốc bị tải hai lần sau mỗi thao tác lưu.
  const contractType = contract?.contractType;
  const hasContract = contract != null;
  useEffect(() => {
    if (!isAllowed || !hasContract) return;
    if (contractType === 'FIXED_PRICE' || contractType === 'MILESTONE') {
      void loadMilestones();
    }
  }, [isAllowed, hasContract, contractType, loadMilestones]);

  const refreshAll = () => {
    void loadCore();
    void loadInvoices();
    if (contract && (contract.contractType === 'FIXED_PRICE' || contract.contractType === 'MILESTONE')) {
      void loadMilestones();
    }
  };

  if (!isAllowed) {
    return (
      <div className="access-denied-container" data-testid="contract-detail-access-denied">
        <div className="access-denied-card">
          <div className="access-denied-icon">{ICONS.shieldOff}</div>
          <h2>Bạn không có thẩm quyền xem chi tiết hợp đồng</h2>
          <p>
            Chức năng này (kể cả gắn phiếu nghiệm thu với mốc thanh toán) chỉ dành riêng cho <strong>Kế toán</strong>{' '}
            (VT-05). Hệ thống đã ghi lại lần từ chối truy cập này vào nhật ký hệ thống.
          </p>
          <div className="security-log-badge">
            <span className="security-log-badge__item">Tài khoản: {currentUserName}</span>
            <span className="security-log-badge__item">
              Vai trò tài khoản: {roleLabels(currentUserRoles) || '(không xác định)'}
            </span>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    // Khung xương khớp bố cục thật (nút quay lại, tiêu đề, 4 ô chỉ số, một khối bảng) —
    // trang không nhảy khi dữ liệu về.
    return (
      <div className="user-management-page sl-detail" aria-busy="true">
        <div className="skeleton sl-skel-btn" />
        <div className="sl-skel-header">
          <div className="skeleton sl-skel-title" />
          <div className="skeleton skeleton-text" style={{ width: '48%' }} />
        </div>
        <div className="sl-skel-stats">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="sl-skel-stat">
              <div className="skeleton skeleton-text skeleton-text--sm" style={{ width: '40%' }} />
              <div className="skeleton sl-skel-value" />
            </div>
          ))}
        </div>
        <div className="skeleton sl-skel-block" />
        <p className="sl-sr-only" role="status">Đang tải chi tiết hợp đồng...</p>
      </div>
    );
  }

  if (loadError || !contract) {
    return (
      <div className="user-management-page">
        <button type="button" className="btn btn-secondary sl-back-btn" onClick={onBack}>
          <span className="icon-xs">{ICONS.arrowLeft}</span> Quay lại danh sách hợp đồng
        </button>
        <div className="table-error-state" role="alert">
          <div className="table-error-state__icon">{ICONS.alertTriangle}</div>
          <div className="table-error-state__body">
            <h3>Không tải được hợp đồng</h3>
            <p>{loadError ?? 'Hợp đồng không tồn tại.'}</p>
          </div>
          <button type="button" className="btn btn-secondary" onClick={() => void loadCore()}>Thử lại</button>
        </div>
      </div>
    );
  }

  const status = STATUS_META[contract.status] ?? { label: contract.status, badge: 'badge--gray' };
  const remaining = daysRemaining(contract.endDate);
  const isExpiringSoon = remaining != null && remaining <= 30;

  return (
    <div className="user-management-page sl-detail">
      {toast && (
        <div role="status" aria-live="polite" className={`sl-toast sl-toast--${toast.type}`}>
          <span aria-hidden="true">{toast.type === 'success' ? ICONS.checkCircle : ICONS.alertTriangle}</span>
          <span>{toast.text}</span>
        </div>
      )}

      <button type="button" className="btn btn-secondary sl-back-btn" onClick={onBack}>
        <span className="icon-xs">{ICONS.arrowLeft}</span> Quay lại danh sách hợp đồng
      </button>

      <div className="page-header">
        <div>
          <h1 className="page-title sl-title-row">
            {contract.contractCode}
            <span className={`badge ${status.badge}`}>{status.label}</span>
          </h1>
          <p className="page-subtitle">
            {contract.name} · {contract.customerName || '—'} · {CONTRACT_TYPE_LABEL[contract.contractType] ?? contract.contractType}
          </p>
        </div>
        <div className="sl-header__actions">
          <button type="button" className="btn btn-secondary" onClick={() => setIsTypeLimitOpen(true)}>
            <span className="icon-xs">{ICONS.document}</span> Sửa loại &amp; hạn mức
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => setIsExpiryReminderOpen(true)}>
            <span className="icon-xs">{ICONS.clock}</span> Nhắc hết hạn
          </button>
        </div>
      </div>

      {/* Tổng quan: giá trị, hạn mức đã dùng, hiệu lực */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-card__icon stat-card__icon--purple">{ICONS.money}</div>
          <div>
            <span className="stat-card__label">Giá trị hợp đồng</span>
            <div className="stat-card__value sl-stat-md">{formatAmount(contract.totalValue)}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card__icon stat-card__icon--amber">{ICONS.alertTriangle}</div>
          <div className="sl-fill">
            <span className="stat-card__label">Hạn mức trần</span>
            <div className="stat-card__value sl-stat-md">
              {contract.limitValue == null ? 'Chưa đặt' : formatAmount(contract.limitValue)}
            </div>
            {usage && usage.limitValue != null && (
              <div className="sl-usage">
                <div
                  className="sl-usage__track"
                  role="progressbar"
                  aria-label="Hạn mức đã dùng"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.min(100, Math.round(usage.usedPercentage ?? 0))}
                >
                  <div
                    className={`sl-usage__fill${usage.overLimit ? ' sl-usage__fill--over' : usage.nearLimit ? ' sl-usage__fill--near' : ''}`}
                    style={{ width: `${Math.min(100, usage.usedPercentage ?? 0)}%` }}
                  />
                </div>
                <span className="cell-muted sl-usage__text">
                  Đã dùng {formatAmount(usage.usedValue)} ({usage.usedPercentage?.toFixed(0) ?? 0}%)
                  {usage.overLimit ? ' — VƯỢT HẠN MỨC' : usage.nearLimit ? ' — sắp chạm hạn mức' : ''}
                </span>
              </div>
            )}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card__icon stat-card__icon--blue">{ICONS.calendar}</div>
          <div>
            <span className="stat-card__label">Hiệu lực</span>
            <div className="stat-card__value sl-stat-sm">
              {formatDate(contract.startDate)} → {formatDate(contract.endDate)}
            </div>
            {isExpiringSoon && (
              <span className={`sl-usage__text ${remaining! < 0 ? 'sl-text-danger' : 'sl-text-warning'}`}>
                {remaining! < 0 ? `Đã quá hạn ${Math.abs(remaining!)} ngày` : `Còn ${remaining} ngày`}
              </span>
            )}
          </div>
        </div>
        {/* Ô chỉ số bấm được là một <button> thật: dùng được bằng bàn phím, có focus rõ. */}
        <button
          type="button"
          className="stat-card sl-stat-button"
          onClick={() => setIsLimitAlertOpen(true)}
          data-testid="contract-detail-open-limit-alert"
        >
          <span className="stat-card__icon stat-card__icon--green">{ICONS.shield}</span>
          <span>
            <span className="stat-card__label">Cảnh báo hạn mức</span>
            <span className="stat-card__value sl-stat-sm">Xem chi tiết →</span>
          </span>
        </button>
      </div>

      {/* Khối lập hóa đơn — nội dung đổi theo loại hợp đồng, không cần rời trang */}
      {(contract.contractType === 'FIXED_PRICE' || contract.contractType === 'MILESTONE') && (
        <>
          <MilestonesSection
            contract={contract}
            milestones={milestones}
            loading={milestonesLoading}
            onManage={() => setIsMilestonesModalOpen(true)}
          />
          {/* NCL-12-CN-003: gắn phiếu nghiệm thu với mốc — mốc chỉ lập hóa đơn khi phiếu đã xác nhận (QTN-25). */}
          <MilestoneAcceptancePanel
            key={milestonesVersion}
            contractId={contract.id}
            currentUserRoles={currentUserRoles}
            onChanged={() => {
              void loadMilestones();
              void loadInvoices();
            }}
          />
        </>
      )}
      {contract.contractType === 'TIME_AND_MATERIAL' && (
        <ProposalSection
          contract={contract}
          onCreated={() => showToast('Đã tạo đề xuất hóa đơn.')}
          onInvoiced={() => {
            showToast('Đã lập hóa đơn từ đề xuất.');
            void loadInvoices();
          }}
        />
      )}
      {contract.contractType === 'MAINTENANCE' && (
        <RecurringSection contract={contract} onSaved={() => showToast('Đã lưu lịch hóa đơn định kỳ.')} />
      )}

      {/* Lịch sử hóa đơn đã lập cho hợp đồng này */}
      <div className="user-table-card sl-section">
        <div className="user-table-toolbar">
          <h3 className="sl-section__title">Hóa đơn đã lập</h3>
          <button type="button" className="btn-icon-refresh" onClick={() => void loadInvoices()} title="Tải lại" aria-label="Tải lại danh sách hóa đơn">
            {ICONS.refresh}
          </button>
        </div>
        {invoicesError ? (
          <div className="alert-box alert-box--danger sl-section__alert" role="alert">
            <span className="sl-grow">{invoicesError}</span>
            <button type="button" className="btn btn-secondary sl-btn-sm" onClick={() => void loadInvoices()}>Thử lại</button>
          </div>
        ) : invoicesLoading ? (
          <SectionSkeleton rows={3} />
        ) : invoices.length === 0 ? (
          <div className="table-empty-state" data-testid="contract-detail-invoices-empty">
            <div className="table-empty-state__icon">{ICONS.document}</div>
            <h3>Chưa có hóa đơn nào</h3>
            <p>Hóa đơn được lập ở khối phía trên (theo mốc, đề xuất T&amp;M hoặc định kỳ) sẽ hiện ở đây.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="user-data-table">
              <thead>
                <tr>
                  <th>Mã hóa đơn</th>
                  <th className="sl-num">Tổng tiền</th>
                  <th className="sl-num">Đã thu</th>
                  <th className="sl-num">Còn lại</th>
                  <th>Ngày lập</th>
                  <th>Hạn thanh toán</th>
                  <th>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => {
                  const meta = INVOICE_STATUS_META[inv.status] ?? { label: inv.status, badge: 'badge--gray' };
                  return (
                    <tr key={inv.id}>
                      <td className="sl-code">{inv.invoiceCode}</td>
                      <td className="sl-num">{formatAmount(inv.totalAmount)}</td>
                      <td className="sl-num">{formatAmount(inv.paidAmount)}</td>
                      <td className="sl-num">{formatAmount(inv.remainingAmount)}</td>
                      <td>{formatDate(inv.invoiceDate)}</td>
                      <td>{formatDate(inv.dueDate)}</td>
                      <td><span className={`badge ${meta.badge}`}>{meta.label}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ContractTypeLimitModal
        isOpen={isTypeLimitOpen}
        onClose={() => setIsTypeLimitOpen(false)}
        contract={contract}
        currentUserRoles={currentUserRoles}
        onSaved={(updated) => {
          setContract(updated);
          setIsTypeLimitOpen(false);
          showToast(`Đã lưu loại & hạn mức cho hợp đồng ${updated.contractCode}.`);
          refreshAll();
        }}
      />

      <ContractMilestonesModal
        isOpen={isMilestonesModalOpen}
        onClose={() => setIsMilestonesModalOpen(false)}
        contract={contract}
        currentUserRoles={currentUserRoles}
        onSaved={() => {
          setIsMilestonesModalOpen(false);
          showToast('Đã lưu danh sách mốc thanh toán.');
          refreshAll();
          setMilestonesVersion((v) => v + 1);
        }}
      />

      {isLimitAlertOpen && (
        <ContractLimitAlert
          isOpen
          onClose={() => setIsLimitAlertOpen(false)}
          contract={contract}
          currentUserRoles={currentUserRoles}
          initialUsage={usage ?? undefined}
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

/** Khung xương cho một khối danh sách đang tải (thay dòng chữ "Đang tải..."). */
function SectionSkeleton({ rows }: { rows: number }) {
  return (
    <div className="sl-section-skeleton" aria-busy="true">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="sl-section-skeleton__row">
          <div className="skeleton skeleton-text" style={{ width: '22%' }} />
          <div className="skeleton skeleton-text" style={{ width: '16%' }} />
          <div className="skeleton skeleton-text" style={{ width: '14%' }} />
          <div className="skeleton skeleton-pill" style={{ width: '12%' }} />
        </div>
      ))}
      <span className="sl-sr-only" role="status">Đang tải...</span>
    </div>
  );
}

/** FIXED_PRICE / MILESTONE — tóm tắt mốc thanh toán ngay tại trang, chi tiết/sửa mở modal đã có. */
function MilestonesSection({
  contract,
  milestones,
  loading,
  onManage,
}: {
  contract: ContractRes;
  milestones: ContractMilestoneRes[];
  loading: boolean;
  onManage: () => void;
}) {
  return (
    <div className="user-table-card sl-section">
      <div className="user-table-toolbar">
        <div className="sl-grow">
          <h3 className="sl-section__title">Mốc thanh toán</h3>
          <p className="cell-muted sl-section__hint">
            Hợp đồng {CONTRACT_TYPE_LABEL[contract.contractType]} lập hóa đơn theo mốc — nghiệm thu xong bấm "Lập hóa đơn" ngay tại mốc.
          </p>
        </div>
        <button type="button" className="btn btn-primary" onClick={onManage}>
          <span className="icon-xs">{ICONS.calendar}</span> Quản lý mốc &amp; lập hóa đơn
        </button>
      </div>
      {loading ? (
        <SectionSkeleton rows={3} />
      ) : milestones.length === 0 ? (
        <div className="table-empty-state">
          <div className="table-empty-state__icon">{ICONS.calendar}</div>
          <h3>Chưa khai báo mốc thanh toán</h3>
          <p>Bấm "Quản lý mốc & lập hóa đơn" để khai báo.</p>
        </div>
      ) : (
        <div className="table-responsive">
          <table className="user-data-table">
            <thead>
              <tr>
                <th>Tên mốc</th>
                <th className="sl-num">Tỷ lệ</th>
                <th className="sl-num">Giá trị</th>
                <th>Ngày dự kiến</th>
                <th>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {milestones.map((m) => (
                <tr key={m.id}>
                  <td>{m.name}</td>
                  <td className="sl-num">{m.percentage != null ? `${m.percentage}%` : '—'}</td>
                  <td className="sl-num">{formatAmount(m.amount)}</td>
                  <td>{formatDate(m.expectedDate)}</td>
                  <td>
                    <span className={`status-pill status-pill--milestone-${m.status.toLowerCase()}`}>
                      {MILESTONE_STATUS_LABEL[m.status] ?? m.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/** TIME_AND_MATERIAL — đề xuất hóa đơn nhúng thẳng vào trang, hợp đồng đã chọn sẵn. */
function ProposalSection({
  contract,
  onCreated,
  onInvoiced,
}: {
  contract: ContractRes;
  onCreated: () => void;
  onInvoiced: () => void;
}) {
  const [projects, setProjects] = useState<ProjectRes[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [projectsError, setProjectsError] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState('');

  const [periodFrom, setPeriodFrom] = useState('');
  const [periodTo, setPeriodTo] = useState('');
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Toàn bộ đề xuất (mọi trạng thái) của hợp đồng — nạp từ server thay vì chỉ giữ tạm kết quả lần
  // tạo gần nhất, để tải lại trang hoặc quay lại sau vẫn thấy các đề xuất PENDING chưa lập hóa đơn.
  const [proposals, setProposals] = useState<InvoiceProposalRes[]>([]);
  const [proposalsLoading, setProposalsLoading] = useState(true);
  const [proposalsError, setProposalsError] = useState<string | null>(null);
  const [convertingId, setConvertingId] = useState<number | null>(null);
  const [convertError, setConvertError] = useState<string | null>(null);

  const loadProposals = useCallback(async () => {
    setProposalsLoading(true);
    setProposalsError(null);
    try {
      setProposals(await fetchInvoiceProposals(contract.id));
    } catch (err) {
      setProposalsError(err instanceof InvoicesApiError ? err.message : 'Không tải được danh sách đề xuất hóa đơn.');
    } finally {
      setProposalsLoading(false);
    }
  }, [contract.id]);

  useEffect(() => {
    setProjectsLoading(true);
    fetchProjectsByContract(contract.id)
      .then(setProjects)
      .catch((err) => setProjectsError(err instanceof ProjectsApiError ? err.message : 'Không tải được danh sách dự án của hợp đồng này.'))
      .finally(() => setProjectsLoading(false));
  }, [contract.id]);

  useEffect(() => {
    void loadProposals();
  }, [loadProposals]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitError(null);

    const formErrors: Record<string, string> = {};
    if (!selectedProjectId) formErrors.projectId = 'Chọn dự án trước';
    const periodResult = validateProposalForm({ periodFrom, periodTo });
    setErrors({ ...formErrors, ...periodResult.errors });
    if (Object.keys(formErrors).length > 0 || !periodResult.isValid) return;

    setSubmitting(true);
    try {
      await createInvoiceProposal(Number(selectedProjectId), {
        periodFrom,
        periodTo,
        note: note.trim() || null,
      });
      onCreated();
      void loadProposals();
    } catch (err) {
      setSubmitError(err instanceof InvoicesApiError ? err.message : 'Không tạo được đề xuất hóa đơn. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConvert = async (proposalId: number) => {
    if (convertingId != null) return;
    setConvertError(null);
    setConvertingId(proposalId);
    try {
      await convertProposalToInvoice(proposalId);
      onInvoiced();
      void loadProposals();
    } catch (err) {
      setConvertError(err instanceof InvoicesApiError ? err.message : 'Không lập được hóa đơn từ đề xuất này. Vui lòng thử lại.');
    } finally {
      setConvertingId(null);
    }
  };

  const handleCancel = async (proposalId: number, proposalCode: string) => {
    if (convertingId != null) return;
    if (!window.confirm(`Hủy đề xuất ${proposalCode}? Giờ công/chi phí trong đề xuất này sẽ được giải phóng để gom lại ở đề xuất sau.`)) {
      return;
    }
    setConvertError(null);
    setConvertingId(proposalId);
    try {
      await cancelInvoiceProposal(proposalId);
      void loadProposals();
    } catch (err) {
      setConvertError(err instanceof InvoicesApiError ? err.message : 'Không hủy được đề xuất này. Vui lòng thử lại.');
    } finally {
      setConvertingId(null);
    }
  };

  const PROPOSAL_STATUS_LABEL: Record<string, string> = {
    PENDING: 'Chờ lập hóa đơn',
    INVOICED: 'Đã lập hóa đơn',
    CANCELLED: 'Đã hủy',
  };
  const PROPOSAL_STATUS_BADGE: Record<string, string> = {
    PENDING: 'badge--gold',
    INVOICED: 'badge--green',
    CANCELLED: 'badge--gray',
  };

  return (
    <div className="user-table-card sl-section sl-section--padded">
      <h3 className="sl-section__title">Đề xuất hóa đơn ({CONTRACT_TYPE_LABEL.TIME_AND_MATERIAL})</h3>
      <p className="cell-muted sl-section__hint sl-section__hint--gap">
        Gom giờ công và chi phí đã duyệt, chưa từng đề xuất, phát sinh trong một kỳ của một dự án thuộc hợp đồng này.
      </p>

      {projectsError && <div className="alert-box alert-box--danger" role="alert">{projectsError}</div>}
      {submitError && <div className="alert-box alert-box--danger" role="alert">{submitError}</div>}

      <form onSubmit={(e) => void handleSubmit(e)} className="sl-inline-form">
        <div className="milestone-field sl-inline-form__field sl-inline-form__field--wide">
          <label className="form-label" htmlFor="detail-proposal-project">Dự án</label>
          <select
            id="detail-proposal-project"
            className={`form-input ${errors.projectId ? 'form-input--error' : ''}`}
            aria-invalid={errors.projectId ? true : undefined}
            aria-describedby={errors.projectId ? 'detail-proposal-project-error' : undefined}
            value={selectedProjectId}
            onChange={(e) => {
              setSelectedProjectId(e.target.value);
              // Điền sẵn kỳ đề xuất = đầu tháng hiện tại → hôm nay khi vừa chọn dự án — kỳ
              // đề xuất thường theo tháng đang chạy, người dùng chỉnh tay lại nếu cần kỳ khác.
              if (e.target.value && !periodFrom && !periodTo) {
                // toISOString() quy đổi sang UTC trước khi cắt chuỗi ngày — với múi giờ UTC+7,
                // nửa đêm giờ VN bị lùi thành ngày hôm trước theo UTC, làm "Từ ngày" sai lệch 1
                // ngày. Dùng toLocaleDateString('sv-SE') để lấy đúng yyyy-MM-dd theo giờ máy.
                const toLocalIsoDate = (d: Date) => d.toLocaleDateString('sv-SE');
                const today = new Date();
                const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
                setPeriodFrom(toLocalIsoDate(firstOfMonth));
                setPeriodTo(toLocalIsoDate(today));
              }
            }}
            disabled={projectsLoading}
          >
            <option value="">
              {projectsLoading ? 'Đang tải…' : projects.length === 0 ? 'Hợp đồng chưa có dự án' : '-- Chọn dự án --'}
            </option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.projectCode} — {p.name}</option>
            ))}
          </select>
          {errors.projectId && <span className="field-error" id="detail-proposal-project-error">{errors.projectId}</span>}
        </div>
        <div className="milestone-field sl-inline-form__field">
          <label className="form-label" htmlFor="detail-proposal-from">Từ ngày</label>
          <input
            id="detail-proposal-from" type="date"
            className={`form-input ${errors.periodFrom ? 'form-input--error' : ''}`}
            aria-invalid={errors.periodFrom ? true : undefined}
            aria-describedby={errors.periodFrom ? 'detail-proposal-from-error' : undefined}
            value={periodFrom} onChange={(e) => setPeriodFrom(e.target.value)}
          />
          {errors.periodFrom && <span className="field-error" id="detail-proposal-from-error">{errors.periodFrom}</span>}
        </div>
        <div className="milestone-field sl-inline-form__field">
          <label className="form-label" htmlFor="detail-proposal-to">Đến ngày</label>
          <input
            id="detail-proposal-to" type="date"
            className={`form-input ${errors.periodTo ? 'form-input--error' : ''}`}
            aria-invalid={errors.periodTo ? true : undefined}
            aria-describedby={errors.periodTo ? 'detail-proposal-to-error' : undefined}
            value={periodTo} onChange={(e) => setPeriodTo(e.target.value)}
          />
          {errors.periodTo && <span className="field-error" id="detail-proposal-to-error">{errors.periodTo}</span>}
        </div>
        <div className="milestone-field sl-inline-form__field sl-inline-form__field--grow">
          <label className="form-label" htmlFor="detail-proposal-note">Ghi chú</label>
          <input
            id="detail-proposal-note" className="form-input" placeholder="Không bắt buộc"
            value={note} onChange={(e) => setNote(e.target.value)}
          />
        </div>
        <button type="submit" className="btn-primary sl-inline-form__submit" disabled={submitting} aria-busy={submitting}>
          {submitting ? 'Đang tạo…' : 'Tạo đề xuất'}
        </button>
      </form>

      <div className="sl-subsection">
        <div className="sl-subsection__head">
          <strong>Đề xuất đã tạo</strong>
          <button type="button" className="btn-icon-refresh" onClick={() => void loadProposals()} title="Tải lại" aria-label="Tải lại danh sách đề xuất">
            {ICONS.refresh}
          </button>
        </div>
        {convertError && <div className="alert-box alert-box--danger" role="alert">{convertError}</div>}
        {proposalsError && (
          <div className="alert-box alert-box--danger" role="alert">
            <span className="sl-grow">{proposalsError}</span>
            <button type="button" className="btn btn-secondary sl-btn-sm" onClick={() => void loadProposals()}>Thử lại</button>
          </div>
        )}
        {proposalsLoading ? (
          <SectionSkeleton rows={2} />
        ) : proposals.length === 0 ? (
          <p className="cell-muted sl-section__hint">
            Chưa có đề xuất nào cho hợp đồng này. Chọn dự án và kỳ ở form phía trên rồi bấm "Tạo đề xuất".
          </p>
        ) : (
          <div className="sl-proposal-list" data-testid="contract-detail-proposal-list">
            {proposals.map((p) => (
              <div key={p.id} data-testid={`proposal-row-${p.id}`} className="sl-proposal">
                <div className="sl-proposal__head">
                  <strong className="sl-code">{p.proposalCode}</strong>
                  <span className={`badge ${PROPOSAL_STATUS_BADGE[p.status] ?? 'badge--gray'}`}>
                    {PROPOSAL_STATUS_LABEL[p.status] ?? p.status}
                  </span>
                  <span className="badge badge--blue">{formatAmount(p.totalAmount)}</span>
                  <span className="cell-muted">{formatDate(p.periodFrom)} → {formatDate(p.periodTo)}</span>
                  {p.status === 'PENDING' && (
                    <div className="sl-proposal__actions">
                      <button
                        type="button"
                        className="btn-secondary sl-btn-sm"
                        disabled={convertingId != null}
                        onClick={() => void handleCancel(p.id, p.proposalCode)}
                        data-testid={`btn-cancel-proposal-${p.id}`}
                      >
                        Hủy đề xuất
                      </button>
                      <button
                        type="button"
                        className="btn-primary sl-btn-sm"
                        disabled={convertingId != null}
                        aria-busy={convertingId === p.id}
                        onClick={() => void handleConvert(p.id)}
                        data-testid={`btn-convert-proposal-${p.id}`}
                      >
                        {convertingId === p.id ? 'Đang xử lý…' : 'Chuyển thành hóa đơn'}
                      </button>
                    </div>
                  )}
                </div>
                <p className="cell-muted sl-section__hint">
                  Tiền công: {formatAmount(p.laborAmount)} · Chi phí: {formatAmount(p.expenseAmount)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/** MAINTENANCE — lịch hóa đơn định kỳ nhúng thẳng vào trang, hợp đồng đã chọn sẵn. */
function RecurringSection({ contract, onSaved }: { contract: ContractRes; onSaved: () => void }) {
  const [schedule, setSchedule] = useState<RecurringScheduleRes | null>(null);
  const [scheduleLoading, setScheduleLoading] = useState(true);
  const [scheduleNotFound, setScheduleNotFound] = useState(false);

  const [billingDay, setBillingDay] = useState('');
  const [amount, setAmount] = useState('');
  const [active, setActive] = useState(true);
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setScheduleLoading(true);
    setScheduleNotFound(false);
    setSaveError(null);
    try {
      const s = await getRecurringSchedule(contract.id);
      setSchedule(s);
      setBillingDay(String(s.billingDayOfMonth));
      setAmount(String(s.amount));
      setActive(s.active);
      setNotes(s.notes ?? '');
    } catch (err) {
      if (err instanceof InvoicesApiError && err.statusCode === 404) {
        setSchedule(null);
        setScheduleNotFound(true);
      } else {
        setSaveError(err instanceof InvoicesApiError ? err.message : 'Không tải được lịch hóa đơn định kỳ.');
      }
    } finally {
      setScheduleLoading(false);
    }
  }, [contract.id]);

  useEffect(() => { void load(); }, [load]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setSaveError(null);

    const result = validateRecurringScheduleForm({ billingDayOfMonth: billingDay, amount });
    setErrors(result.errors);
    if (!result.isValid) return;

    setSaving(true);
    try {
      const req = { billingDayOfMonth: Number(billingDay), amount: Number(amount), notes: notes.trim() || null, active };
      const saved = schedule ? await updateRecurringSchedule(contract.id, req) : await createRecurringSchedule(contract.id, req);
      setSchedule(saved);
      setScheduleNotFound(false);
      onSaved();
    } catch (err) {
      setSaveError(err instanceof InvoicesApiError ? err.message : 'Không lưu được lịch hóa đơn định kỳ.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="user-table-card sl-section sl-section--padded">
      <h3 className="sl-section__title">Hóa đơn định kỳ ({CONTRACT_TYPE_LABEL.MAINTENANCE})</h3>
      <p className="cell-muted sl-section__hint sl-section__hint--gap">
        Hệ thống tự động tạo hóa đơn nháp đúng ngày đã khai mỗi tháng — kế toán soát lại rồi phát hành.
      </p>

      {saveError && (
        <div className="alert-box alert-box--danger" role="alert">
          <span className="sl-grow">{saveError}</span>
          {!schedule && !scheduleNotFound && (
            <button type="button" className="btn btn-secondary sl-btn-sm" onClick={() => void load()}>Thử lại</button>
          )}
        </div>
      )}

      {scheduleLoading ? (
        <SectionSkeleton rows={1} />
      ) : (
        <>
          {scheduleNotFound && (
            <p className="field-hint sl-section__hint--gap">
              Hợp đồng này chưa có lịch hóa đơn định kỳ — điền form bên dưới để tạo mới.
            </p>
          )}
          <form onSubmit={(e) => void handleSubmit(e)} className="sl-inline-form">
            <div className="milestone-field sl-inline-form__field sl-inline-form__field--wide">
              <label className="form-label" htmlFor="detail-recurring-day">Ngày lập hóa đơn hàng tháng</label>
              <input
                id="detail-recurring-day" type="number" min={1} max={28} inputMode="numeric"
                className={`form-input ${errors.billingDayOfMonth ? 'form-input--error' : ''}`}
                aria-invalid={errors.billingDayOfMonth ? true : undefined}
                aria-describedby={errors.billingDayOfMonth ? 'detail-recurring-day-error' : undefined}
                value={billingDay} onChange={(e) => setBillingDay(e.target.value)}
              />
              {errors.billingDayOfMonth && <span className="field-error" id="detail-recurring-day-error">{errors.billingDayOfMonth}</span>}
            </div>
            <div className="milestone-field sl-inline-form__field sl-inline-form__field--wide">
              <label className="form-label" htmlFor="detail-recurring-amount">Số tiền mỗi kỳ (VNĐ)</label>
              <input
                id="detail-recurring-amount" type="number" min={0} inputMode="numeric"
                className={`form-input ${errors.amount ? 'form-input--error' : ''}`}
                aria-invalid={errors.amount ? true : undefined}
                aria-describedby={errors.amount ? 'detail-recurring-amount-error' : undefined}
                value={amount} onChange={(e) => setAmount(e.target.value)}
              />
              {errors.amount && <span className="field-error" id="detail-recurring-amount-error">{errors.amount}</span>}
            </div>
            <div className="milestone-field sl-inline-form__field">
              <label className="form-label" htmlFor="detail-recurring-active">Đang bật</label>
              <select
                id="detail-recurring-active" className="form-input"
                value={active ? 'true' : 'false'}
                onChange={(e) => setActive(e.target.value === 'true')}
              >
                <option value="true">Có</option>
                <option value="false">Tạm dừng</option>
              </select>
            </div>
            <div className="milestone-field sl-inline-form__field sl-inline-form__field--grow">
              <label className="form-label" htmlFor="detail-recurring-notes">Ghi chú</label>
              <input
                id="detail-recurring-notes" className="form-input" placeholder="Không bắt buộc"
                value={notes} onChange={(e) => setNotes(e.target.value)}
              />
            </div>
            <button type="submit" className="btn-primary sl-inline-form__submit" disabled={saving} aria-busy={saving}>
              {saving ? 'Đang lưu…' : schedule ? 'Cập nhật lịch' : 'Tạo lịch'}
            </button>
          </form>
        </>
      )}
    </div>
  );
}
