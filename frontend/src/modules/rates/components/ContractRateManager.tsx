import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { ICONS } from '../../../components/common/icons';
import { fetchContracts } from '../../contracts/api/contractsApi';
import type { ContractRes } from '../../contracts/types/contractTypes';
import { fetchContractBillRates, RatesApiError } from '../api/ratesApi';
import type { ContractBillRateRes } from '../types/rateTypes';
import ContractRateFormModal from './ContractRateFormModal';
import ContractRateResolveLookup from './ContractRateResolveLookup';

interface Props {
  currentUserRoles?: string[];
  /** Danh sách vai trò chuyên môn đã từng khai báo, để chọn theo tên thay vì gõ tay. */
  roleOptions: string[];
  /** Cấp bậc đã khai báo cho từng vai trò — dùng để lọc lựa chọn cấp bậc theo vai trò đã chọn. */
  levelsByRole: Record<string, string[]>;
}

function formatDailyRate(value: number): string {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(
    value
  );
}

function formatDate(value: string): string {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString('vi-VN');
}

/**
 * NCL-07-CN-003 — "Đơn giá riêng theo hợp đồng": Kế toán (VT-05) hoặc Quản
 * trị viên (VT-07) chọn hợp đồng để xem/khai báo mức giá đàm phán riêng cho
 * hợp đồng đó, ưu tiên hơn bảng đơn giá chung khi tính doanh thu (QTN-16).
 *
 * `GET /contracts` (danh sách theo tên) chỉ mở cho Kế toán (VT-05) — Quản trị
 * viên (VT-07) được phép quản lý đơn giá riêng theo hợp đồng nhưng KHÔNG có
 * quyền liệt kê hợp đồng, nên với vai trò này vẫn phải nhập ID hợp đồng trực
 * tiếp (xem trang Hợp đồng, cột "Mã hợp đồng" có ghi kèm ID), khớp đúng nhóm
 * quyền của chính các endpoint `/contracts/{contractId}/bill-rates*`.
 */
export default function ContractRateManager({ currentUserRoles = [], roleOptions, levelsByRole }: Props) {
  const canListContracts = currentUserRoles.includes('VT-05');
  const [contracts, setContracts] = useState<ContractRes[]>([]);
  const [contractsLoadError, setContractsLoadError] = useState<string | null>(null);
  const [contractIdInput, setContractIdInput] = useState('');
  const [activeContractId, setActiveContractId] = useState<number | null>(null);
  const [rates, setRates] = useState<ContractBillRateRes[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!canListContracts) return;
    fetchContracts()
      .then(setContracts)
      .catch(() => setContractsLoadError('Không tải được danh sách hợp đồng — vẫn có thể nhập ID hợp đồng thủ công.'));
  }, [canListContracts]);

  const loadContractRates = useCallback(async (contractId: number) => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const data = await fetchContractBillRates(contractId);
      setRates(data);
    } catch (err) {
      setRates([]);
      setLoadError(
        err instanceof RatesApiError ? err.message : 'Không tải được đơn giá riêng của hợp đồng. Vui lòng thử lại.'
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleOpenContract = (e: FormEvent) => {
    e.preventDefault();
    const id = Number(contractIdInput);
    if (!Number.isFinite(id) || id <= 0) return;
    setActiveContractId(id);
    setToast(null);
    void loadContractRates(id);
  };

  const handleCreated = (created: ContractBillRateRes) => {
    setRates((prev) => [created, ...prev]);
    setToast(`Đã khai báo đơn giá riêng cho hợp đồng #${created.contractId}: ${created.professionalRole} (${created.level}).`);
    window.setTimeout(() => setToast(null), 4500);
  };

  // Vai trò/cấp bậc để chọn ở "Tra đơn giá áp dụng cho hợp đồng này" phải gồm cả những
  // cặp vừa khai báo RIÊNG cho hợp đồng này — không chỉ bảng đơn giá chung công ty —
  // nếu không, vừa khai báo xong sẽ không tra được ngay cặp đó.
  const contractRoleOptions = useMemo(() => {
    const set = new Set(roleOptions);
    rates.forEach((r) => set.add(r.professionalRole));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [roleOptions, rates]);
  const contractLevelsByRole = useMemo(() => {
    const map: Record<string, string[]> = {};
    Object.entries(levelsByRole).forEach(([role, levels]) => {
      map[role] = [...levels];
    });
    rates.forEach((r) => {
      const list = map[r.professionalRole] ?? (map[r.professionalRole] = []);
      if (!list.includes(r.level)) list.push(r.level);
    });
    Object.values(map).forEach((list) => list.sort((a, b) => a.localeCompare(b)));
    return map;
  }, [levelsByRole, rates]);

  return (
    <div className="user-table-card" style={{ marginTop: '16px', padding: '20px' }} data-testid="contract-rate-manager">
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
        <span className="icon-xs">{ICONS.receipt}</span>
        <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>Đơn giá riêng theo hợp đồng</h2>
      </div>
      <p className="field-hint" style={{ marginBottom: '14px' }}>
        Mức giá đàm phán riêng cho một hợp đồng cụ thể — khi tính doanh thu, hệ thống ưu tiên dùng đơn giá
        riêng này thay vì bảng đơn giá chung công ty.
      </p>

      {contractsLoadError && (
        <div className="alert-box alert-box--danger" role="alert" style={{ marginBottom: '10px' }}>
          {contractsLoadError}
        </div>
      )}

      <form onSubmit={handleOpenContract} style={{ display: 'flex', gap: '10px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
        {canListContracts && !contractsLoadError ? (
          <div style={{ minWidth: '280px' }}>
            <label className="form-label" htmlFor="contract-rate-select">
              Hợp đồng
            </label>
            <select
              id="contract-rate-select"
              className="form-input"
              value={contractIdInput}
              onChange={(e) => setContractIdInput(e.target.value)}
            >
              <option value="">-- Chọn hợp đồng --</option>
              {contracts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.contractCode} — {c.name}
                  {c.customerName ? ` (${c.customerName})` : ''}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div style={{ minWidth: '200px' }}>
            <label className="form-label" htmlFor="contract-rate-id">
              ID hợp đồng
            </label>
            <input
              id="contract-rate-id"
              type="number"
              min={1}
              className="form-input"
              placeholder="Ví dụ: 1"
              value={contractIdInput}
              onChange={(e) => setContractIdInput(e.target.value)}
            />
            <small className="field-hint">Xem ID ở trang Hợp đồng, dưới mỗi mã hợp đồng.</small>
          </div>
        )}
        <button type="submit" className="btn btn-secondary" disabled={!contractIdInput.trim()}>
          Mở đơn giá hợp đồng
        </button>
      </form>

      {activeContractId != null && (
        <div style={{ marginTop: '18px' }}>
          {toast && (
            <div className="alert-box alert-box--success" role="status" style={{ marginBottom: '12px' }}>
              <span className="icon-xs">{ICONS.checkCircle}</span> {toast}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>
              {contracts.find((c) => c.id === activeContractId)?.contractCode ?? `Hợp đồng #${activeContractId}`}
            </h3>
            <button type="button" className="btn btn-primary" onClick={() => setIsFormOpen(true)}>
              <span className="icon-xs">{ICONS.plus}</span> Khai báo đơn giá riêng
            </button>
          </div>

          {isLoading ? (
            <div className="table-loading-state">
              <div className="spinner-lg" />
              <p>Đang tải đơn giá riêng của hợp đồng...</p>
            </div>
          ) : loadError ? (
            <div className="table-error-state" role="alert">
              <div className="table-error-state__icon">{ICONS.alertTriangle}</div>
              <div className="table-error-state__body">
                <h3>Không tải được đơn giá riêng</h3>
                <p>{loadError}</p>
              </div>
              <button type="button" className="btn btn-secondary" onClick={() => void loadContractRates(activeContractId)}>
                Thử lại
              </button>
            </div>
          ) : rates.length === 0 ? (
            <div className="table-empty-state" data-testid="contract-rate-empty">
              <div className="table-empty-state__icon">{ICONS.receipt}</div>
              <h3>Chưa có đơn giá riêng nào cho hợp đồng này</h3>
              <p>Doanh thu của hợp đồng đang tính theo bảng đơn giá chung công ty cho tới khi khai báo.</p>
            </div>
          ) : (
            <div className="table-responsive" style={{ marginTop: '10px' }}>
              <table className="user-data-table" data-testid="contract-rate-table">
                <thead>
                  <tr>
                    <th>Vai trò chuyên môn</th>
                    <th>Cấp bậc</th>
                    <th style={{ textAlign: 'right' }}>Đơn giá / ngày công</th>
                    <th>Hiệu lực từ</th>
                  </tr>
                </thead>
                <tbody>
                  {rates.map((r, idx) => (
                    <tr key={`${r.professionalRole}-${r.level}-${r.effectiveFrom}-${idx}`}>
                      <td>{r.professionalRole}</td>
                      <td>{r.level}</td>
                      <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono, monospace)' }}>
                        {formatDailyRate(r.dailyRate)}
                      </td>
                      <td className="cell-muted">{formatDate(r.effectiveFrom)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <ContractRateResolveLookup
            contractId={activeContractId}
            roleOptions={contractRoleOptions}
            levelsByRole={contractLevelsByRole}
          />

          <ContractRateFormModal
            contractId={activeContractId}
            isOpen={isFormOpen}
            onClose={() => setIsFormOpen(false)}
            onSaved={handleCreated}
            currentUserRoles={currentUserRoles}
          />
        </div>
      )}
    </div>
  );
}
