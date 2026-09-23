import { useCallback, useEffect, useState } from 'react';
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

function formatAmount(value: number | null | undefined): string {
  if (value == null) return '—';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value);
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

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToast({ text, type });
    window.setTimeout(() => setToast(null), 4500);
  };

  const loadCore = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [c, u] = await Promise.all([
        getContract(contractId),
        getContractUsage(contractId).catch(() => null),
      ]);
      setContract(c);
      setUsage(u);
    } catch (err) {
      setLoadError(err instanceof ContractsApiError ? err.message : 'Không tải được thông tin hợp đồng.');
    } finally {
      setLoading(false);
    }
  }, [contractId]);

  const loadMilestones = useCallback(async () => {
    setMilestonesLoading(true);
    try {
      const list = await fetchMilestones(contractId);
      setMilestones(list);
    } catch {
      setMilestones([]);
    } finally {
      setMilestonesLoading(false);
    }
  }, [contractId]);

  const loadInvoices = useCallback(async () => {
    setInvoicesLoading(true);
    setInvoicesError(null);
    try {
      const list = await fetchInvoices(contractId);
      setInvoices(list);
    } catch (err) {
      setInvoicesError(err instanceof InvoicesApiError ? err.message : 'Không tải được danh sách hóa đơn.');
    } finally {
      setInvoicesLoading(false);
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

  useEffect(() => {
    if (!isAllowed || !contract) return;
    if (contract.contractType === 'FIXED_PRICE' || contract.contractType === 'MILESTONE') {
      void loadMilestones();
    }
  }, [isAllowed, contract, loadMilestones]);

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
          <p>Chức năng này chỉ dành riêng cho <strong>Kế toán</strong> (VT-05).</p>
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
    return (
      <div className="user-management-page">
        <div className="table-loading-state">
          <div className="spinner-lg" />
          <p>Đang tải chi tiết hợp đồng...</p>
        </div>
      </div>
    );
  }

  if (loadError || !contract) {
    return (
      <div className="user-management-page">
        <button type="button" className="btn btn-secondary" onClick={onBack} style={{ marginBottom: '12px' }}>
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
    <div className="user-management-page">
      {toast && (
        <div
          role="status" aria-live="polite"
          style={{
            position: 'fixed', top: '20px', right: '24px', zIndex: 1050,
            padding: '12px 20px',
            background: toast.type === 'success' ? 'var(--pale-green-bg)' : 'var(--pale-red-bg)',
            color: toast.type === 'success' ? 'var(--pale-green-fg)' : 'var(--pale-red-fg)',
            border: `1px solid ${toast.type === 'success' ? 'rgba(52, 101, 56, 0.25)' : 'rgba(159, 47, 45, 0.25)'}`,
            borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: '10px',
            fontSize: '14px', fontWeight: 500,
          }}
        >
          <span>{toast.type === 'success' ? ICONS.checkCircle : ICONS.alertTriangle}</span>
          <span>{toast.text}</span>
        </div>
      )}

      <button type="button" className="btn btn-secondary" onClick={onBack} style={{ marginBottom: '16px' }}>
        <span className="icon-xs">{ICONS.arrowLeft}</span> Quay lại danh sách hợp đồng
      </button>

      <div className="page-header">
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {contract.contractCode}
            <span className={`badge ${status.badge}`}>{status.label}</span>
          </h1>
          <p className="page-subtitle">
            {contract.name} · {contract.customerName || '—'} · {CONTRACT_TYPE_LABEL[contract.contractType] ?? contract.contractType}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
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
            <div className="stat-card__value" style={{ fontSize: '18px' }}>{formatAmount(contract.totalValue)}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card__icon stat-card__icon--amber">{ICONS.alertTriangle}</div>
          <div style={{ width: '100%' }}>
            <span className="stat-card__label">Hạn mức trần</span>
            <div className="stat-card__value" style={{ fontSize: '18px' }}>
              {contract.limitValue == null ? 'Chưa đặt' : formatAmount(contract.limitValue)}
            </div>
            {usage && usage.limitValue != null && (
              <div style={{ marginTop: '6px' }}>
                <div style={{ height: '6px', borderRadius: '4px', background: 'var(--gray-100, #eee)', overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${Math.min(100, usage.usedPercentage ?? 0)}%`,
                      background: usage.overLimit ? 'var(--pale-red-fg)' : usage.nearLimit ? '#956400' : 'var(--pale-green-fg)',
                    }}
                  />
                </div>
                <span className="cell-muted" style={{ fontSize: '11.5px' }}>
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
            <div className="stat-card__value" style={{ fontSize: '15px' }}>
              {formatDate(contract.startDate)} → {formatDate(contract.endDate)}
            </div>
            {isExpiringSoon && (
              <span className="cell-muted" style={{ fontSize: '11.5px', color: remaining! < 0 ? 'var(--pale-red-fg)' : '#956400' }}>
                {remaining! < 0 ? `Đã quá hạn ${Math.abs(remaining!)} ngày` : `Còn ${remaining} ngày`}
              </span>
            )}
          </div>
        </div>
        <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => setIsLimitAlertOpen(true)} data-testid="contract-detail-open-limit-alert">
          <div className="stat-card__icon stat-card__icon--green">{ICONS.shield}</div>
          <div>
            <span className="stat-card__label">Cảnh báo hạn mức</span>
            <div className="stat-card__value" style={{ fontSize: '14px' }}>Xem chi tiết →</div>
          </div>
        </div>
      </div>

      {/* Khối lập hóa đơn — nội dung đổi theo loại hợp đồng, không cần rời trang */}
      {(contract.contractType === 'FIXED_PRICE' || contract.contractType === 'MILESTONE') && (
        <MilestonesSection
          contract={contract}
          milestones={milestones}
          loading={milestonesLoading}
          onManage={() => setIsMilestonesModalOpen(true)}
        />
      )}
      {contract.contractType === 'TIME_AND_MATERIAL' && (
        <ProposalSection contract={contract} onCreated={() => showToast('Đã tạo đề xuất hóa đơn.')} />
      )}
      {contract.contractType === 'MAINTENANCE' && (
        <RecurringSection contract={contract} onSaved={() => showToast('Đã lưu lịch hóa đơn định kỳ.')} />
      )}

      {/* Lịch sử hóa đơn đã lập cho hợp đồng này */}
      <div className="user-table-card" style={{ marginTop: '20px' }}>
        <div className="user-table-toolbar">
          <h3 style={{ margin: 0, fontSize: '15px' }}>Hóa đơn đã lập</h3>
          <button type="button" className="btn-icon-refresh" onClick={() => void loadInvoices()} title="Tải lại" aria-label="Tải lại danh sách hóa đơn">
            {ICONS.refresh}
          </button>
        </div>
        {invoicesError ? (
          <div className="alert-box alert-box--danger" style={{ margin: '0 16px 12px' }}>{invoicesError}</div>
        ) : invoicesLoading ? (
          <p className="cell-muted" style={{ padding: '16px' }}>Đang tải...</p>
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
                  <th style={{ textAlign: 'right' }}>Tổng tiền</th>
                  <th style={{ textAlign: 'right' }}>Đã thu</th>
                  <th style={{ textAlign: 'right' }}>Còn lại</th>
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
                      <td style={{ fontFamily: 'var(--font-mono, monospace)', fontWeight: 600 }}>{inv.invoiceCode}</td>
                      <td style={{ textAlign: 'right' }}>{formatAmount(inv.totalAmount)}</td>
                      <td style={{ textAlign: 'right' }}>{formatAmount(inv.paidAmount)}</td>
                      <td style={{ textAlign: 'right' }}>{formatAmount(inv.remainingAmount)}</td>
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
    <div className="user-table-card" style={{ marginTop: '20px' }}>
      <div className="user-table-toolbar">
        <div>
          <h3 style={{ margin: 0, fontSize: '15px' }}>Mốc thanh toán</h3>
          <p className="cell-muted" style={{ margin: '2px 0 0', fontSize: '12.5px' }}>
            Hợp đồng {CONTRACT_TYPE_LABEL[contract.contractType]} lập hóa đơn theo mốc — nghiệm thu xong bấm "Lập hóa đơn" ngay tại mốc.
          </p>
        </div>
        <button type="button" className="btn btn-primary" onClick={onManage}>
          <span className="icon-xs">{ICONS.calendar}</span> Quản lý mốc &amp; lập hóa đơn
        </button>
      </div>
      {loading ? (
        <p className="cell-muted" style={{ padding: '16px' }}>Đang tải...</p>
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
                <th style={{ textAlign: 'right' }}>Tỷ lệ</th>
                <th style={{ textAlign: 'right' }}>Giá trị</th>
                <th>Ngày dự kiến</th>
                <th>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {milestones.map((m) => (
                <tr key={m.id}>
                  <td>{m.name}</td>
                  <td style={{ textAlign: 'right' }}>{m.percentage != null ? `${m.percentage}%` : '—'}</td>
                  <td style={{ textAlign: 'right' }}>{formatAmount(m.amount)}</td>
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
function ProposalSection({ contract, onCreated }: { contract: ContractRes; onCreated: () => void }) {
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
  const [result, setResult] = useState<InvoiceProposalRes | null>(null);

  useEffect(() => {
    setProjectsLoading(true);
    fetchProjectsByContract(contract.id)
      .then(setProjects)
      .catch((err) => setProjectsError(err instanceof ProjectsApiError ? err.message : 'Không tải được danh sách dự án của hợp đồng này.'))
      .finally(() => setProjectsLoading(false));
  }, [contract.id]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitError(null);
    setResult(null);

    const formErrors: Record<string, string> = {};
    if (!selectedProjectId) formErrors.projectId = 'Chọn dự án trước';
    const periodResult = validateProposalForm({ periodFrom, periodTo });
    setErrors({ ...formErrors, ...periodResult.errors });
    if (Object.keys(formErrors).length > 0 || !periodResult.isValid) return;

    setSubmitting(true);
    try {
      const proposal = await createInvoiceProposal(Number(selectedProjectId), {
        periodFrom,
        periodTo,
        note: note.trim() || null,
      });
      setResult(proposal);
      onCreated();
    } catch (err) {
      setSubmitError(err instanceof InvoicesApiError ? err.message : 'Không tạo được đề xuất hóa đơn. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="user-table-card" style={{ marginTop: '20px', padding: '20px' }}>
      <h3 style={{ margin: '0 0 4px', fontSize: '15px' }}>Đề xuất hóa đơn ({CONTRACT_TYPE_LABEL.TIME_AND_MATERIAL})</h3>
      <p className="cell-muted" style={{ margin: '0 0 14px', fontSize: '12.5px' }}>
        Gom giờ công và chi phí đã duyệt, chưa từng đề xuất, phát sinh trong một kỳ của một dự án thuộc hợp đồng này.
      </p>

      {projectsError && <div className="alert-box alert-box--danger" style={{ marginBottom: '12px' }}>{projectsError}</div>}
      {submitError && <div className="alert-box alert-box--danger" role="alert" style={{ marginBottom: '14px' }}>{submitError}</div>}

      <form onSubmit={(e) => void handleSubmit(e)} style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div className="milestone-field" style={{ minWidth: '240px' }}>
          <label className="form-label" htmlFor="detail-proposal-project">Dự án</label>
          <select
            id="detail-proposal-project"
            className={`form-input ${errors.projectId ? 'form-input--error' : ''}`}
            value={selectedProjectId}
            onChange={(e) => {
              setSelectedProjectId(e.target.value);
              // Điền sẵn kỳ đề xuất = đầu tháng hiện tại → hôm nay khi vừa chọn dự án — kỳ
              // đề xuất thường theo tháng đang chạy, người dùng chỉnh tay lại nếu cần kỳ khác.
              if (e.target.value && !periodFrom && !periodTo) {
                const today = new Date();
                const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
                setPeriodFrom(firstOfMonth.toISOString().slice(0, 10));
                setPeriodTo(today.toISOString().slice(0, 10));
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
          {errors.projectId && <span className="field-error">{errors.projectId}</span>}
        </div>
        <div className="milestone-field" style={{ minWidth: '160px' }}>
          <label className="form-label" htmlFor="detail-proposal-from">Từ ngày</label>
          <input
            id="detail-proposal-from" type="date"
            className={`form-input ${errors.periodFrom ? 'form-input--error' : ''}`}
            value={periodFrom} onChange={(e) => setPeriodFrom(e.target.value)}
          />
          {errors.periodFrom && <span className="field-error">{errors.periodFrom}</span>}
        </div>
        <div className="milestone-field" style={{ minWidth: '160px' }}>
          <label className="form-label" htmlFor="detail-proposal-to">Đến ngày</label>
          <input
            id="detail-proposal-to" type="date"
            className={`form-input ${errors.periodTo ? 'form-input--error' : ''}`}
            value={periodTo} onChange={(e) => setPeriodTo(e.target.value)}
          />
          {errors.periodTo && <span className="field-error">{errors.periodTo}</span>}
        </div>
        <div className="milestone-field" style={{ flex: '1 1 200px' }}>
          <label className="form-label" htmlFor="detail-proposal-note">Ghi chú</label>
          <input
            id="detail-proposal-note" className="form-input" placeholder="Không bắt buộc"
            value={note} onChange={(e) => setNote(e.target.value)}
          />
        </div>
        <button type="submit" className="btn-primary" disabled={submitting}>
          {submitting ? 'Đang tạo…' : 'Tạo đề xuất'}
        </button>
      </form>

      {result && (
        <div style={{ marginTop: '18px', borderTop: '1px solid var(--border-subtle, #eee)', paddingTop: '14px' }} data-testid="contract-detail-proposal-result">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '10px' }}>
            <strong style={{ fontSize: '15px' }}>{result.proposalCode}</strong>
            <span className="badge badge--blue">{formatAmount(result.totalAmount)}</span>
            <span className="cell-muted">{formatDate(result.periodFrom)} → {formatDate(result.periodTo)}</span>
          </div>
          <p className="cell-muted" style={{ fontSize: '12.5px' }}>
            Tiền công: {formatAmount(result.laborAmount)} · Chi phí: {formatAmount(result.expenseAmount)}
          </p>
        </div>
      )}
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
    <div className="user-table-card" style={{ marginTop: '20px', padding: '20px' }}>
      <h3 style={{ margin: '0 0 4px', fontSize: '15px' }}>Hóa đơn định kỳ ({CONTRACT_TYPE_LABEL.MAINTENANCE})</h3>
      <p className="cell-muted" style={{ margin: '0 0 14px', fontSize: '12.5px' }}>
        Hệ thống tự động tạo hóa đơn nháp đúng ngày đã khai mỗi tháng — kế toán soát lại rồi phát hành.
      </p>

      {saveError && <div className="alert-box alert-box--danger" role="alert" style={{ marginBottom: '12px' }}>{saveError}</div>}

      {scheduleLoading ? (
        <p className="cell-muted">Đang tải lịch hiện tại...</p>
      ) : (
        <>
          {scheduleNotFound && (
            <p className="field-hint" style={{ marginBottom: '10px' }}>
              Hợp đồng này chưa có lịch hóa đơn định kỳ — điền form bên dưới để tạo mới.
            </p>
          )}
          <form onSubmit={(e) => void handleSubmit(e)} style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div className="milestone-field" style={{ minWidth: '200px' }}>
              <label className="form-label" htmlFor="detail-recurring-day">Ngày lập hóa đơn hàng tháng</label>
              <input
                id="detail-recurring-day" type="number" min={1} max={28}
                className={`form-input ${errors.billingDayOfMonth ? 'form-input--error' : ''}`}
                value={billingDay} onChange={(e) => setBillingDay(e.target.value)}
              />
              {errors.billingDayOfMonth && <span className="field-error">{errors.billingDayOfMonth}</span>}
            </div>
            <div className="milestone-field" style={{ minWidth: '200px' }}>
              <label className="form-label" htmlFor="detail-recurring-amount">Số tiền mỗi kỳ (VNĐ)</label>
              <input
                id="detail-recurring-amount" type="number" min={0}
                className={`form-input ${errors.amount ? 'form-input--error' : ''}`}
                value={amount} onChange={(e) => setAmount(e.target.value)}
              />
              {errors.amount && <span className="field-error">{errors.amount}</span>}
            </div>
            <div className="milestone-field">
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
            <div className="milestone-field" style={{ flex: '1 1 200px' }}>
              <label className="form-label" htmlFor="detail-recurring-notes">Ghi chú</label>
              <input
                id="detail-recurring-notes" className="form-input" placeholder="Không bắt buộc"
                value={notes} onChange={(e) => setNotes(e.target.value)}
              />
            </div>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Đang lưu…' : schedule ? 'Cập nhật lịch' : 'Tạo lịch'}
            </button>
          </form>
        </>
      )}
    </div>
  );
}
