import { useCallback, useEffect, useState } from 'react';
import { ICONS } from '../../../components/common/icons';
import { fetchWorkTypeRates, upsertWorkTypeRate, RatesApiError } from '../api/ratesApi';
import type { WorkType, WorkTypeRateFactorRes } from '../types/rateTypes';
import { WORK_TYPE_LABELS } from '../types/rateTypes';
import { validateWorkTypeFactor } from '../validators/rateValidators';

function parseFactor(raw: string): number | null {
  if (raw.trim() === '') return null;
  const n = Number(raw);
  return Number.isNaN(n) ? null : n;
}

/**
 * NCL-07-CN-006 — "Đơn giá theo loại hình công việc": Kế toán (VT-05) hoặc
 * Quản trị viên (VT-07) khai báo/sửa hệ số nhân đơn giá cho 4 loại hình công
 * việc cố định (NORMAL/OVERTIME/WEEKEND/HOLIDAY). `POST /work-type-rates`
 * luôn GHI ĐÈ hệ số cũ — không giữ lịch sử theo ngày hiệu lực như `BillRate`,
 * vì đây là hệ số nghiệp vụ ít thay đổi chứ không phải mức giá đàm phán.
 */
export default function WorkTypeRateManager() {
  const [rates, setRates] = useState<WorkTypeRateFactorRes[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});
  const [savingWorkType, setSavingWorkType] = useState<WorkType | null>(null);
  const [rowServerError, setRowServerError] = useState<Record<string, string>>({});
  const [savedWorkType, setSavedWorkType] = useState<WorkType | null>(null);

  const loadRates = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const data = await fetchWorkTypeRates();
      setRates(data);
      setDrafts(Object.fromEntries(data.map((r) => [r.workType, String(r.factor)])));
    } catch (err) {
      setLoadError(
        err instanceof RatesApiError ? err.message : 'Không tải được hệ số theo loại hình công việc.'
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRates();
  }, [loadRates]);

  const handleSaveRow = async (workType: WorkType) => {
    const factor = parseFactor(drafts[workType] ?? '');
    const error = validateWorkTypeFactor(factor);
    setRowErrors((prev) => ({ ...prev, [workType]: error ?? '' }));
    if (error) return;

    setSavingWorkType(workType);
    setRowServerError((prev) => ({ ...prev, [workType]: '' }));
    setSavedWorkType(null);
    try {
      const updated = await upsertWorkTypeRate({ workType, factor: factor as number });
      setRates((prev) => prev.map((r) => (r.workType === workType ? updated : r)));
      setSavedWorkType(workType);
      window.setTimeout(() => setSavedWorkType((current) => (current === workType ? null : current)), 3000);
    } catch (err) {
      setRowServerError((prev) => ({
        ...prev,
        [workType]: err instanceof RatesApiError ? err.message : 'Không thể lưu hệ số. Vui lòng thử lại.',
      }));
    } finally {
      setSavingWorkType(null);
    }
  };

  return (
    <div className="user-table-card" style={{ marginTop: '16px', padding: '20px' }} data-testid="work-type-rate-manager">
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
        <span className="icon-xs">{ICONS.settings}</span>
        <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>Đơn giá theo loại hình công việc</h2>
      </div>
      <p className="field-hint" style={{ marginBottom: '14px' }}>
        Hệ số nhân lên đơn giá theo vai trò/cấp bậc khi tính đơn giá cuối cùng cho một dòng giờ công (ví dụ
        giờ ngoài giờ hành chính × 1.5). Lưu sẽ ghi đè trực tiếp giá trị đang dùng, không giữ lịch sử.
      </p>

      {isLoading ? (
        <div className="table-loading-state">
          <div className="spinner-lg" />
          <p>Đang tải hệ số theo loại hình công việc...</p>
        </div>
      ) : loadError ? (
        <div className="table-error-state" role="alert">
          <div className="table-error-state__icon">{ICONS.alertTriangle}</div>
          <div className="table-error-state__body">
            <h3>Không tải được hệ số</h3>
            <p>{loadError}</p>
          </div>
          <button type="button" className="btn btn-secondary" onClick={() => void loadRates()}>
            Thử lại
          </button>
        </div>
      ) : (
        <div className="table-responsive">
          <table className="user-data-table" data-testid="work-type-rate-table">
            <thead>
              <tr>
                <th>Loại hình công việc</th>
                <th>Hệ số nhân</th>
                <th style={{ textAlign: 'right' }}>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {rates.map((r) => {
                const draft = drafts[r.workType] ?? String(r.factor);
                const changed = draft !== String(r.factor);
                const saving = savingWorkType === r.workType;
                const rowError = rowErrors[r.workType];
                const serverError = rowServerError[r.workType];
                return (
                  <tr key={r.workType}>
                    <td>{WORK_TYPE_LABELS[r.workType]}</td>
                    <td>
                      <input
                        type="number"
                        min={0.01}
                        step="0.01"
                        aria-label={`Hệ số ${WORK_TYPE_LABELS[r.workType]}`}
                        className={`form-input ${rowError ? 'form-input--error' : ''}`}
                        style={{ maxWidth: '140px' }}
                        value={draft}
                        onChange={(e) => {
                          setDrafts((prev) => ({ ...prev, [r.workType]: e.target.value }));
                          if (rowError) setRowErrors((prev) => ({ ...prev, [r.workType]: '' }));
                        }}
                        disabled={saving}
                      />
                      {rowError && <div className="field-error">{rowError}</div>}
                      {serverError && <div className="field-error">{serverError}</div>}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {savedWorkType === r.workType && (
                        <span className="badge badge--green" style={{ marginRight: '8px' }}>
                          {ICONS.checkCircle} Đã lưu
                        </span>
                      )}
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => void handleSaveRow(r.workType)}
                        disabled={saving || !changed}
                      >
                        {saving ? 'Đang lưu…' : 'Lưu'}
                      </button>
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
}
