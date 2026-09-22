import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { ICONS } from '../../../components/common/icons';
import { roleLabels } from '../../../utils/roleLabel';
import type { ContractRes } from '../../contracts/types/contractTypes';
import { fetchContracts } from '../../contracts/api/contractsApi';
import type { RecurringInvoiceRunRes, RecurringScheduleRes } from '../types/invoiceTypes';
import {
  getRecurringSchedule,
  createRecurringSchedule,
  updateRecurringSchedule,
  runRecurringInvoices,
  InvoicesApiError,
} from '../api/invoicesApi';
import { validateRecurringScheduleForm } from '../validators/invoiceValidators';

interface Props {
  currentUserRoles?: string[];
  currentUserName?: string;
}

function formatAmount(value: number | null | undefined): string {
  if (value == null) return '—';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value);
}

/**
 * NCL-10-CN-005 — Hóa đơn định kỳ: khai báo lịch lập hóa đơn hàng tháng cho một
 * hợp đồng MAINTENANCE (ngày lập trong tháng + số tiền cố định), và có thể chạy
 * thử job sinh hóa đơn ngay (job thật chạy tự động theo lịch qua
 * `RecurringInvoiceScheduler`, nút "Chạy thử" ở đây gọi đúng API job đó cho một
 * lần chạy tức thời, hữu ích để kiểm tra/demo mà không phải chờ đến đúng ngày).
 */
export default function RecurringInvoicePage({ currentUserRoles = [], currentUserName = 'Người dùng' }: Props) {
  const isAllowed = currentUserRoles.includes('VT-05');

  const [contracts, setContracts] = useState<ContractRes[]>([]);
  const [contractsLoadError, setContractsLoadError] = useState<string | null>(null);
  const [selectedContractId, setSelectedContractId] = useState('');

  const [schedule, setSchedule] = useState<RecurringScheduleRes | null>(null);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [scheduleNotFound, setScheduleNotFound] = useState(false);

  const [billingDay, setBillingDay] = useState('');
  const [amount, setAmount] = useState('');
  const [active, setActive] = useState(true);
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const [runResult, setRunResult] = useState<RecurringInvoiceRunRes | null>(null);
  const [running, setRunning] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAllowed) return;
    fetchContracts()
      .then(setContracts)
      .catch(() => setContractsLoadError('Không tải được danh sách hợp đồng.'));
  }, [isAllowed]);

  const loadSchedule = async (contractId: number) => {
    setScheduleLoading(true);
    setScheduleNotFound(false);
    setSaveError(null);
    try {
      const s = await getRecurringSchedule(contractId);
      setSchedule(s);
      setBillingDay(String(s.billingDayOfMonth));
      setAmount(String(s.amount));
      setActive(s.active);
      setNotes(s.notes ?? '');
    } catch (err) {
      if (err instanceof InvoicesApiError && err.statusCode === 404) {
        setSchedule(null);
        setScheduleNotFound(true);
        setBillingDay('');
        setAmount('');
        setActive(true);
        setNotes('');
      } else {
        setSaveError(err instanceof InvoicesApiError ? err.message : 'Không tải được lịch hóa đơn định kỳ.');
      }
    } finally {
      setScheduleLoading(false);
    }
  };

  const handleSelectContract = (value: string) => {
    setSelectedContractId(value);
    setSchedule(null);
    setScheduleNotFound(false);
    setRunResult(null);
    if (value) void loadSchedule(Number(value));
  };

  const handleSaveSchedule = async (e: FormEvent) => {
    e.preventDefault();
    if (saving || !selectedContractId) return;
    setSaveError(null);

    const result = validateRecurringScheduleForm({ billingDayOfMonth: billingDay, amount });
    setErrors(result.errors);
    if (!result.isValid) return;

    setSaving(true);
    try {
      const contractId = Number(selectedContractId);
      const req = { billingDayOfMonth: Number(billingDay), amount: Number(amount), notes: notes.trim() || null, active };
      const saved = schedule ? await updateRecurringSchedule(contractId, req) : await createRecurringSchedule(contractId, req);
      setSchedule(saved);
      setScheduleNotFound(false);
      setToast('Đã lưu lịch hóa đơn định kỳ.');
      window.setTimeout(() => setToast(null), 4500);
    } catch (err) {
      setSaveError(err instanceof InvoicesApiError ? err.message : 'Không lưu được lịch hóa đơn định kỳ.');
    } finally {
      setSaving(false);
    }
  };

  const handleRun = async () => {
    setRunning(true);
    setRunError(null);
    setRunResult(null);
    try {
      const result = await runRecurringInvoices();
      setRunResult(result);
    } catch (err) {
      setRunError(err instanceof InvoicesApiError ? err.message : 'Không chạy được job sinh hóa đơn định kỳ.');
    } finally {
      setRunning(false);
    }
  };

  if (!isAllowed) {
    return (
      <div className="access-denied-container" data-testid="recurring-invoice-access-denied">
        <div className="access-denied-card">
          <div className="access-denied-icon">{ICONS.shieldOff}</div>
          <h2>Bạn không có thẩm quyền quản lý hóa đơn định kỳ</h2>
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

  return (
    <div className="user-management-page">
      {toast && (
        <div
          role="status" aria-live="polite"
          style={{
            position: 'fixed', top: '20px', right: '24px', zIndex: 1050,
            padding: '12px 20px', background: 'var(--pale-green-bg)', color: 'var(--pale-green-fg)',
            border: '1px solid rgba(52, 101, 56, 0.25)', borderRadius: 'var(--radius-md)',
            display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', fontWeight: 500,
          }}
        >
          <span>{ICONS.checkCircle}</span>
          <span>{toast}</span>
        </div>
      )}

      <div className="page-header">
        <div>
          <h1 className="page-title">Hóa đơn định kỳ</h1>
          <p className="page-subtitle">
            Khai báo lịch lập hóa đơn hàng tháng cho hợp đồng bảo trì (Maintenance), và chạy thử job sinh hóa đơn.
          </p>
        </div>
      </div>

      <div className="user-table-card" style={{ padding: '20px', marginBottom: '16px' }}>
        {contractsLoadError && (
          <div className="alert-box alert-box--danger" style={{ marginBottom: '12px' }}>{contractsLoadError}</div>
        )}
        <div className="milestone-field" style={{ maxWidth: '420px' }}>
          <label className="form-label" htmlFor="recurring-contract-select">Hợp đồng</label>
          <select
            id="recurring-contract-select"
            className="form-input"
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
        </div>

        {selectedContractId && (
          <div style={{ marginTop: '18px' }}>
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
                <form onSubmit={(e) => void handleSaveSchedule(e)} style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                  <div className="milestone-field" style={{ minWidth: '200px' }}>
                    <label className="form-label" htmlFor="recurring-day">Ngày lập hóa đơn hàng tháng</label>
                    <input
                      id="recurring-day" type="number" min={1} max={28}
                      className={`form-input ${errors.billingDayOfMonth ? 'form-input--error' : ''}`}
                      value={billingDay} onChange={(e) => setBillingDay(e.target.value)}
                    />
                    {errors.billingDayOfMonth && <span className="field-error">{errors.billingDayOfMonth}</span>}
                  </div>
                  <div className="milestone-field" style={{ minWidth: '200px' }}>
                    <label className="form-label" htmlFor="recurring-amount">Số tiền mỗi kỳ (VNĐ)</label>
                    <input
                      id="recurring-amount" type="number" min={0}
                      className={`form-input ${errors.amount ? 'form-input--error' : ''}`}
                      value={amount} onChange={(e) => setAmount(e.target.value)}
                    />
                    {errors.amount && <span className="field-error">{errors.amount}</span>}
                  </div>
                  <div className="milestone-field">
                    <label className="form-label" htmlFor="recurring-active">Đang bật</label>
                    <select
                      id="recurring-active" className="form-input"
                      value={active ? 'true' : 'false'}
                      onChange={(e) => setActive(e.target.value === 'true')}
                    >
                      <option value="true">Có</option>
                      <option value="false">Tạm dừng</option>
                    </select>
                  </div>
                  <div className="milestone-field" style={{ flex: '1 1 200px' }}>
                    <label className="form-label" htmlFor="recurring-notes">Ghi chú</label>
                    <input
                      id="recurring-notes" className="form-input" placeholder="Không bắt buộc"
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
        )}
      </div>

      <div className="user-table-card" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
          <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600 }}>Chạy job sinh hóa đơn định kỳ</h3>
          <button type="button" className="btn btn-secondary" onClick={() => void handleRun()} disabled={running}>
            {running ? 'Đang chạy…' : 'Chạy thử'}
          </button>
        </div>
        <p className="field-hint" style={{ marginBottom: '12px' }}>
          Job thật chạy tự động mỗi ngày theo lịch — nút này chạy ngay một lượt để kiểm tra, không thay thế lịch tự động.
        </p>

        {runError && <div className="alert-box alert-box--danger" role="alert">{runError}</div>}

        {runResult && (
          <div data-testid="recurring-run-result">
            <p className="field-hint">Ngày chạy: {runResult.asOf}</p>
            <h4 style={{ fontSize: '13.5px', fontWeight: 600, margin: '10px 0 6px' }}>
              Đã tạo ({runResult.created.length})
            </h4>
            {runResult.created.length === 0 ? (
              <p className="cell-muted">Không có hóa đơn nào được tạo.</p>
            ) : (
              <div className="table-responsive">
                <table className="user-data-table">
                  <thead>
                    <tr>
                      <th>Mã hóa đơn</th>
                      <th>Kỳ</th>
                      <th style={{ textAlign: 'right' }}>Số tiền</th>
                    </tr>
                  </thead>
                  <tbody>
                    {runResult.created.map((inv) => (
                      <tr key={inv.id}>
                        <td>{inv.invoiceCode}</td>
                        <td>{inv.periodStart} → {inv.periodEnd}</td>
                        <td style={{ textAlign: 'right' }}>{formatAmount(inv.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <h4 style={{ fontSize: '13.5px', fontWeight: 600, margin: '14px 0 6px' }}>
              Đã bỏ qua ({runResult.skipped.length})
            </h4>
            {runResult.skipped.length === 0 ? (
              <p className="cell-muted">Không có hợp đồng nào bị bỏ qua.</p>
            ) : (
              <ul style={{ margin: 0, paddingLeft: '18px' }}>
                {runResult.skipped.map((s, idx) => (
                  <li key={idx} className="cell-muted">Hợp đồng #{s.contractId}: {s.reason}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
