import { useEffect, useState } from 'react';
import { ICONS } from '../../../components/common/icons';
import type { ContractMilestoneInput, ContractMilestoneRes, ContractRes } from '../types/contractTypes';
import { fetchMilestones, replaceMilestones, updateMilestoneStatus, ContractsApiError } from '../api/contractsApi';

interface Props {
  contract: ContractRes;
  isOpen: boolean;
  onClose: () => void;
  onSaved?: (milestones: ContractMilestoneRes[]) => void;
  currentUserRoles?: string[];
}

/** Dòng đang soạn thảo — giữ id gốc (nếu có) để hiển thị trạng thái và cho phép
 *  đổi trạng thái riêng (PATCH .../status), tách khỏi luồng "Lưu danh sách mốc"
 *  (PUT thay thế trọn bộ, không nhận id — NCL-04-CN-003). */
type DraftRow = ContractMilestoneInput & { key: string; id?: number; status?: ContractMilestoneRes['status'] };

const STATUS_LABEL: Record<ContractMilestoneRes['status'], string> = {
  PENDING: 'Chờ nghiệm thu',
  READY_TO_INVOICE: 'Sẵn sàng xuất hóa đơn',
  INVOICED: 'Đã xuất hóa đơn',
};

/** Trạng thái kế tiếp theo đúng trình tự PENDING → READY_TO_INVOICE → INVOICED
 *  mà backend cho phép (NCL-04-CN-003) — null nếu đã ở bước cuối. */
const NEXT_STATUS: Record<ContractMilestoneRes['status'], ContractMilestoneRes['status'] | null> = {
  PENDING: 'READY_TO_INVOICE',
  READY_TO_INVOICE: 'INVOICED',
  INVOICED: null,
};

function toDraftRow(m: ContractMilestoneRes): DraftRow {
  return {
    key: `existing-${m.id}`,
    id: m.id,
    name: m.name,
    percentage: m.percentage ?? null,
    amount: m.amount,
    expectedDate: m.expectedDate ?? null,
    acceptanceCondition: m.acceptanceCondition ?? null,
    status: m.status,
  };
}

function newDraftRow(): DraftRow {
  return {
    key: `new-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: '',
    percentage: null,
    amount: 0,
    expectedDate: null,
    acceptanceCondition: null,
  };
}

export default function ContractMilestonesModal({ contract, isOpen, onClose, onSaved, currentUserRoles = ['VT-04'] }: Props) {
  const isAllowed = currentUserRoles.includes('VT-05');
  const [rows, setRows] = useState<DraftRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [statusUpdatingKey, setStatusUpdatingKey] = useState<string | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !isAllowed) return;
    let cancelled = false;
    setIsLoading(true);
    setLoadError(null);
    fetchMilestones(contract.id)
      .then((list) => {
        if (!cancelled) setRows(list.length > 0 ? list.map(toDraftRow) : [newDraftRow()]);
      })
      .catch((err) => {
        if (!cancelled) {
          setLoadError(
            err instanceof ContractsApiError ? err.message : 'Không thể tải danh sách mốc thanh toán.'
          );
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, isAllowed, contract.id]);

  if (!isOpen) return null;

  const total = rows.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
  const totalMismatch = Math.abs(total - contract.totalValue) > 0.01;

  const updateRow = (key: string, patch: Partial<DraftRow>) => {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  };

  const removeRow = (key: string) => {
    setRows((prev) => prev.filter((r) => r.key !== key));
  };

  const addRow = () => {
    setRows((prev) => [...prev, newDraftRow()]);
  };

  const handleAdvanceStatus = async (row: DraftRow) => {
    if (!row.id || !row.status) return;
    const next = NEXT_STATUS[row.status];
    if (!next) return;
    setStatusError(null);
    setStatusUpdatingKey(row.key);
    try {
      await updateMilestoneStatus(contract.id, row.id, next);
      updateRow(row.key, { status: next });
      const refreshed = await fetchMilestones(contract.id);
      onSaved?.(refreshed);
    } catch (err) {
      setStatusError(
        err instanceof ContractsApiError ? err.message : 'Không thể đổi trạng thái mốc thanh toán.'
      );
    } finally {
      setStatusUpdatingKey(null);
    }
  };

  const handleSave = async () => {
    setSaveError(null);
    if (rows.length === 0) {
      setSaveError('Danh sách mốc không được để trống.');
      return;
    }
    if (rows.some((r) => !r.name.trim() || Number(r.amount) <= 0)) {
      setSaveError('Mỗi mốc phải có tên và giá trị lớn hơn 0.');
      return;
    }
    if (totalMismatch) {
      setSaveError(
        `Tổng các mốc (${total.toLocaleString('vi-VN')}) phải bằng giá trị hợp đồng (${contract.totalValue.toLocaleString('vi-VN')}).`
      );
      return;
    }
    setSubmitting(true);
    try {
      const payload: ContractMilestoneInput[] = rows.map((r) => ({
        name: r.name.trim(),
        percentage: r.percentage ?? null,
        amount: r.amount,
        expectedDate: r.expectedDate ?? null,
        acceptanceCondition: r.acceptanceCondition ?? null,
      }));
      const saved = await replaceMilestones(contract.id, payload);
      onSaved?.(saved);
      onClose();
    } catch (err) {
      setSaveError(err instanceof ContractsApiError ? err.message : 'Không thể lưu danh sách mốc thanh toán.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="milestones-modal-title"
    >
      <div className="modal-card contract-modal-card" style={{ width: 'min(100%, 880px)' }}>
        <div className="modal-header">
          <div className="modal-header__title-wrap">
            <h3 id="milestones-modal-title" className="modal-title">
              <span className="modal-title__icon">{ICONS.calendar}</span>
              Mốc thanh toán hợp đồng
            </h3>
            <p className="field-hint">
              {contract.contractCode} · {contract.name} · Giá trị hợp đồng: {contract.totalValue.toLocaleString('vi-VN')}
            </p>
          </div>
          <button type="button" className="modal-close" onClick={onClose} disabled={submitting} aria-label="Đóng">
            {ICONS.close}
          </button>
        </div>

        <div className="modal-body">
          {!isAllowed && (
            <div className="alert-box alert-box--danger">Chức năng yêu cầu vai trò Kế toán (VT-05).</div>
          )}

          {isAllowed && loadError && <div className="alert-box alert-box--danger">{loadError}</div>}
          {isAllowed && saveError && <div className="alert-box alert-box--danger" role="alert">{saveError}</div>}
          {isAllowed && statusError && <div className="alert-box alert-box--danger" role="alert">{statusError}</div>}

          {isAllowed && isLoading && <p>Đang tải danh sách mốc thanh toán…</p>}

          {isAllowed && !isLoading && !loadError && (
            <>
              <div className="table-responsive">
                <table className="user-data-table">
                  <thead>
                    <tr>
                      <th>Tên mốc</th>
                      <th style={{ width: '110px' }}>Tỷ lệ (%)</th>
                      <th style={{ width: '160px' }}>Giá trị</th>
                      <th style={{ width: '150px' }}>Ngày dự kiến</th>
                      <th>Điều kiện nghiệm thu</th>
                      <th style={{ width: '150px' }}>Trạng thái</th>
                      <th style={{ width: '48px' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={row.key}>
                        <td>
                          <input
                            className="form-input"
                            aria-label="Tên mốc"
                            value={row.name}
                            onChange={(e) => updateRow(row.key, { name: e.target.value })}
                          />
                        </td>
                        <td>
                          <input
                            className="form-input"
                            type="number"
                            aria-label="Tỷ lệ phần trăm"
                            value={row.percentage ?? ''}
                            onChange={(e) =>
                              updateRow(row.key, { percentage: e.target.value === '' ? null : Number(e.target.value) })
                            }
                            min={0}
                            max={100}
                          />
                        </td>
                        <td>
                          <input
                            className="form-input"
                            type="number"
                            aria-label="Giá trị mốc"
                            value={row.amount}
                            onChange={(e) => updateRow(row.key, { amount: Number(e.target.value) })}
                            min={0}
                          />
                        </td>
                        <td>
                          <input
                            className="form-input"
                            type="date"
                            aria-label="Ngày dự kiến"
                            value={row.expectedDate ?? ''}
                            onChange={(e) => updateRow(row.key, { expectedDate: e.target.value || null })}
                          />
                        </td>
                        <td>
                          <input
                            className="form-input"
                            aria-label="Điều kiện nghiệm thu"
                            value={row.acceptanceCondition ?? ''}
                            onChange={(e) => updateRow(row.key, { acceptanceCondition: e.target.value })}
                          />
                        </td>
                        <td>
                          {row.status ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                              <span className="status-pill">{STATUS_LABEL[row.status]}</span>
                              {NEXT_STATUS[row.status] && (
                                <button
                                  type="button"
                                  className="btn-icon-refresh"
                                  title={`Chuyển sang "${STATUS_LABEL[NEXT_STATUS[row.status]!]}"`}
                                  aria-label={`Chuyển mốc ${row.name} sang trạng thái ${STATUS_LABEL[NEXT_STATUS[row.status]!]}`}
                                  onClick={() => void handleAdvanceStatus(row)}
                                  disabled={statusUpdatingKey === row.key || submitting}
                                >
                                  {statusUpdatingKey === row.key ? '…' : ICONS.arrowRight}
                                </button>
                              )}
                            </div>
                          ) : (
                            <span className="cell-muted">Mới</span>
                          )}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            type="button"
                            className="btn-icon-refresh"
                            aria-label={`Xóa mốc ${row.name || ''}`.trim()}
                            onClick={() => removeRow(row.key)}
                            disabled={submitting}
                          >
                            {ICONS.trash}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button type="button" className="btn btn-secondary" onClick={addRow} disabled={submitting}>
                  <span className="icon-sm">{ICONS.plus}</span> Thêm mốc
                </button>
                <span className={totalMismatch ? 'text-warning' : 'cell-muted'}>
                  Tổng: {total.toLocaleString('vi-VN')} / {contract.totalValue.toLocaleString('vi-VN')}
                </span>
              </div>
            </>
          )}

          <div style={{ marginTop: '16px', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button type="button" className="btn" onClick={onClose} disabled={submitting}>
              Hủy
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={handleSave}
              disabled={!isAllowed || isLoading || !!loadError || submitting}
            >
              {submitting ? 'Đang lưu…' : 'Lưu danh sách mốc'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
