import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { ICONS } from '../../../components/common/icons';
import { roleLabels } from '../../../utils/roleLabel';
import type { ContractMilestoneRes, ContractRes } from '../../contracts/types/contractTypes';
import { fetchContracts, fetchMilestones, ContractsApiError } from '../../contracts/api/contractsApi';
import type { InvoiceRes } from '../types/invoiceTypes';
import { createInvoiceFromMilestone, InvoicesApiError } from '../api/invoicesApi';
import { validateMilestoneInvoiceForm } from '../validators/invoiceValidators';

interface Props {
  currentUserRoles?: string[];
  currentUserName?: string;
}

const STATUS_LABEL: Record<ContractMilestoneRes['status'], string> = {
  PENDING: 'Chờ nghiệm thu',
  READY_TO_INVOICE: 'Sẵn sàng xuất hóa đơn',
  INVOICED: 'Đã xuất hóa đơn',
};

const STATUS_BADGE_CLASS: Record<ContractMilestoneRes['status'], string> = {
  PENDING: 'badge--gray',
  READY_TO_INVOICE: 'badge--blue',
  INVOICED: 'badge--green',
};

/** Chỉ hợp đồng trọn gói (FIXED_PRICE) hoặc theo mốc (MILESTONE) mới lập hóa đơn
 *  theo mốc — hợp đồng theo giờ đi qua NCL-10-CN-001, hợp đồng duy trì đi qua
 *  NCL-10-CN-005 (lọc ngay ở ô chọn hợp đồng để tránh chọn nhầm rồi mới bị backend từ chối). */
const ELIGIBLE_CONTRACT_TYPES = new Set(['FIXED_PRICE', 'MILESTONE']);

function formatAmount(value: number | null | undefined): string {
  if (value == null) return '—';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value);
}

function formatDate(value?: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString('vi-VN');
}

/**
 * NCL-10-CN-002 — Lập hóa đơn theo mốc hợp đồng: Kế toán chọn một mốc thanh toán
 * đã đủ điều kiện (READY_TO_INVOICE) của hợp đồng trọn gói/theo mốc, hệ thống lập
 * hóa đơn có giá trị đúng bằng giá trị mốc và chuyển mốc sang INVOICED (QTN-19,
 * QTN-25). Lỗi vượt giá trị hợp đồng (VALIDATION_ERROR) hiển thị đúng thông báo
 * backend và gợi ý lập phụ lục điều chỉnh trước (NCL-04-CN-004) ở trang Hợp đồng.
 */
export default function MilestoneInvoicePage({ currentUserRoles = [], currentUserName = 'Người dùng' }: Props) {
  const isAllowed = currentUserRoles.includes('VT-05');

  const [contracts, setContracts] = useState<ContractRes[]>([]);
  const [contractsError, setContractsError] = useState<string | null>(null);
  const [selectedContractId, setSelectedContractId] = useState('');

  const [milestones, setMilestones] = useState<ContractMilestoneRes[]>([]);
  const [milestonesLoading, setMilestonesLoading] = useState(false);
  const [milestonesError, setMilestonesError] = useState<string | null>(null);
  const [selectedMilestoneId, setSelectedMilestoneId] = useState('');

  const [invoiceDate, setInvoiceDate] = useState('');
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [limitHint, setLimitHint] = useState(false);
  const [result, setResult] = useState<InvoiceRes | null>(null);

  useEffect(() => {
    if (!isAllowed) return;
    fetchContracts()
      .then((list) => setContracts(list.filter((c) => ELIGIBLE_CONTRACT_TYPES.has(c.contractType))))
      .catch((err) => {
        setContractsError(
          err instanceof ContractsApiError ? err.message : 'Không tải được danh sách hợp đồng.'
        );
      });
  }, [isAllowed]);

  const loadMilestones = (contractId: number) => {
    setMilestonesLoading(true);
    setMilestonesError(null);
    fetchMilestones(contractId)
      .then(setMilestones)
      .catch((err) => {
        setMilestonesError(
          err instanceof ContractsApiError ? err.message : 'Không tải được danh sách mốc thanh toán.'
        );
      })
      .finally(() => setMilestonesLoading(false));
  };

  const handleSelectContract = (value: string) => {
    setSelectedContractId(value);
    setSelectedMilestoneId('');
    setMilestones([]);
    setMilestonesError(null);
    setResult(null);
    if (value) loadMilestones(Number(value));
  };

  if (!isAllowed) {
    return (
      <div className="access-denied-container" data-testid="milestone-invoice-access-denied">
        <div className="access-denied-card">
          <div className="access-denied-icon">{ICONS.shieldOff}</div>
          <h2>Bạn không có thẩm quyền lập hóa đơn theo mốc hợp đồng</h2>
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

  const selectedMilestone = milestones.find((m) => String(m.id) === selectedMilestoneId) ?? null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitError(null);
    setLimitHint(false);
    setResult(null);

    const formErrors: Record<string, string> = {};
    if (!selectedContractId) formErrors.contractId = 'Chọn hợp đồng trước';
    if (!selectedMilestoneId) formErrors.milestoneId = 'Chọn mốc thanh toán cần lập hóa đơn';
    else if (selectedMilestone && selectedMilestone.status !== 'READY_TO_INVOICE') {
      formErrors.milestoneId = `Mốc này ${
        selectedMilestone.status === 'INVOICED' ? 'đã được xuất hóa đơn' : 'chưa đủ điều kiện lập hóa đơn (chưa nghiệm thu)'
      }`;
    }
    const fieldResult = validateMilestoneInvoiceForm({ invoiceDate, note });
    setErrors({ ...formErrors, ...fieldResult.errors });
    if (Object.keys(formErrors).length > 0 || !fieldResult.isValid) return;

    setSubmitting(true);
    try {
      const invoice = await createInvoiceFromMilestone(Number(selectedContractId), Number(selectedMilestoneId), {
        invoiceDate: invoiceDate || null,
        note: note.trim() || null,
      });
      setResult(invoice);
      loadMilestones(Number(selectedContractId));
      setSelectedMilestoneId('');
      setInvoiceDate('');
      setNote('');
    } catch (err) {
      if (err instanceof InvoicesApiError) {
        setSubmitError(err.message);
        setLimitHint(err.code === 'VALIDATION_ERROR');
      } else {
        setSubmitError('Không lập được hóa đơn. Vui lòng thử lại.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="user-management-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Lập hóa đơn theo mốc hợp đồng</h1>
          <p className="page-subtitle">
            Chọn một mốc thanh toán đã sẵn sàng xuất hóa đơn của hợp đồng trọn gói (Fixed Price) hoặc theo
            mốc (Milestone) — hệ thống lập hóa đơn đúng bằng giá trị mốc.
          </p>
        </div>
      </div>

      <div className="user-table-card" style={{ padding: '20px' }}>
        {contractsError && (
          <div className="alert-box alert-box--danger" style={{ marginBottom: '12px' }}>{contractsError}</div>
        )}
        {submitError && (
          <div className="alert-box alert-box--danger" role="alert" style={{ marginBottom: '14px' }}>
            {submitError}
            {limitHint && (
              <div style={{ marginTop: '6px' }}>
                Vui lòng lập phụ lục điều chỉnh giá trị hợp đồng trước (mục "Hợp đồng" → Phụ lục) rồi thử lại.
              </div>
            )}
          </div>
        )}

        <form onSubmit={(e) => void handleSubmit(e)}>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div className="milestone-field" style={{ minWidth: '260px' }}>
              <label className="form-label" htmlFor="milestone-invoice-contract">Hợp đồng</label>
              <select
                id="milestone-invoice-contract"
                className={`form-input ${errors.contractId ? 'form-input--error' : ''}`}
                value={selectedContractId}
                onChange={(e) => handleSelectContract(e.target.value)}
              >
                <option value="">-- Chọn hợp đồng --</option>
                {contracts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.contractCode} — {c.name}{c.customerName ? ` (${c.customerName})` : ''}
                  </option>
                ))}
              </select>
              {errors.contractId && <span className="field-error">{errors.contractId}</span>}
            </div>
          </div>

          {selectedContractId && (
            <div style={{ marginTop: '16px' }}>
              {milestonesError && (
                <div className="alert-box alert-box--danger" style={{ marginBottom: '12px' }}>{milestonesError}</div>
              )}
              {milestonesLoading ? (
                <p className="cell-muted">Đang tải danh sách mốc thanh toán...</p>
              ) : milestones.length === 0 ? (
                <p className="cell-muted" data-testid="milestone-invoice-empty">
                  Hợp đồng này chưa có mốc thanh toán nào.
                </p>
              ) : (
                <div className="table-responsive">
                  <table className="user-data-table" data-testid="milestone-invoice-table">
                    <thead>
                      <tr>
                        <th></th>
                        <th>Tên mốc</th>
                        <th style={{ textAlign: 'right' }}>Giá trị</th>
                        <th>Ngày dự kiến</th>
                        <th>Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody>
                      {milestones.map((m) => (
                        <tr key={m.id}>
                          <td>
                            <input
                              type="radio"
                              name="milestone"
                              aria-label={`Chọn mốc ${m.name}`}
                              checked={selectedMilestoneId === String(m.id)}
                              disabled={m.status !== 'READY_TO_INVOICE'}
                              onChange={() => setSelectedMilestoneId(String(m.id))}
                            />
                          </td>
                          <td>{m.name}</td>
                          <td style={{ textAlign: 'right' }}>{formatAmount(m.amount)}</td>
                          <td>{formatDate(m.expectedDate)}</td>
                          <td>
                            <span className={`badge ${STATUS_BADGE_CLASS[m.status]}`}>{STATUS_LABEL[m.status]}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {errors.milestoneId && <span className="field-error">{errors.milestoneId}</span>}
            </div>
          )}

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end', marginTop: '16px' }}>
            <div className="milestone-field" style={{ minWidth: '180px' }}>
              <label className="form-label" htmlFor="milestone-invoice-date">Ngày hóa đơn</label>
              <input
                id="milestone-invoice-date"
                type="date"
                className={`form-input ${errors.invoiceDate ? 'form-input--error' : ''}`}
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                placeholder="Mặc định hôm nay"
              />
              {errors.invoiceDate && <span className="field-error">{errors.invoiceDate}</span>}
            </div>
            <div className="milestone-field" style={{ flex: '1 1 240px' }}>
              <label className="form-label" htmlFor="milestone-invoice-note">Ghi chú</label>
              <input
                id="milestone-invoice-note"
                className={`form-input ${errors.note ? 'form-input--error' : ''}`}
                placeholder="Không bắt buộc"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
              {errors.note && <span className="field-error">{errors.note}</span>}
            </div>
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? 'Đang lập…' : 'Lập hóa đơn'}
            </button>
          </div>
        </form>
      </div>

      {result && (
        <div className="user-table-card" style={{ marginTop: '16px', padding: '20px' }} data-testid="milestone-invoice-result">
          <div className="alert-box alert-box--success" role="status" style={{ marginBottom: '14px' }}>
            <span className="icon-xs">{ICONS.checkCircle}</span> Đã lập hóa đơn {result.invoiceCode} cho mốc "{result.milestoneName}".
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '12px' }}>
            <strong style={{ fontSize: '16px' }}>{result.invoiceCode}</strong>
            <span className="badge badge--blue">{formatAmount(result.totalAmount)}</span>
            <span className="cell-muted">Ngày hóa đơn: {formatDate(result.invoiceDate)}</span>
          </div>

          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-card__icon stat-card__icon--purple">{ICONS.money}</div>
              <div>
                <span className="stat-card__label">Giá trị hợp đồng</span>
                <div className="stat-card__value">{formatAmount(result.contractValue)}</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-card__icon stat-card__icon--amber">{ICONS.receipt}</div>
              <div>
                <span className="stat-card__label">Đã xuất hóa đơn (lũy kế)</span>
                <div className="stat-card__value">{formatAmount(result.invoicedTotal)}</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-card__icon stat-card__icon--green">{ICONS.checkCircle}</div>
              <div>
                <span className="stat-card__label">Còn có thể lập</span>
                <div className="stat-card__value">{formatAmount(result.contractValue - result.invoicedTotal)}</div>
              </div>
            </div>
          </div>

          {result.note && (
            <p className="cell-muted" style={{ marginTop: '12px' }}>Ghi chú: {result.note}</p>
          )}
        </div>
      )}
    </div>
  );
}
