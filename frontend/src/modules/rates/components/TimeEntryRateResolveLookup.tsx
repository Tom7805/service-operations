import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { ICONS } from '../../../components/common/icons';
import {
  fetchTimeEntryLookupCandidates,
  fetchTimeEntryLookupEmployees,
  resolveTimeEntryBillRate,
  RatesApiError,
} from '../api/ratesApi';
import type {
  ResolvedTimeEntryRateRes,
  TimeEntryLookupCandidateRes,
  TimeEntryLookupEmployeeRes,
} from '../types/rateTypes';
import { WORK_TYPE_LABELS } from '../types/rateTypes';
import { validateTimeEntryRateLookupForm, type TimeEntryRateLookupFormValues } from '../validators/rateValidators';

const EMPTY_FORM: TimeEntryRateLookupFormValues = {
  entryId: '',
  level: '',
};

interface Props {
  /** Toàn bộ cấp bậc đã từng khai báo trong bảng đơn giá, để chọn theo tên thay vì gõ tay. */
  levelOptions: string[];
}

function formatMoney(value: number): string {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 2 }).format(
    value
  );
}

function formatDate(value: string): string {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString('vi-VN');
}

/**
 * NCL-07-CN-005 — Tra cứu đơn giá áp dụng cho một dòng giờ công.
 *
 * Luồng chọn: Chọn nhân sự → hệ thống tự đổ ra các dòng giờ công đã duyệt của người đó để
 * chọn, đồng thời tự điền sẵn "Cấp bậc" theo hồ sơ nhân sự (vẫn sửa được nếu cấp bậc lúc phát
 * sinh dòng giờ công khác với hồ sơ hiện tại). Không còn phải tự biết trước "ID dòng giờ công"
 * — con số trước đây chỉ hiện ở màn hình "Điều chỉnh giờ công đã duyệt" dành riêng cho Quản lý
 * dự án (VT-02), khác vai trò với Kế toán/Quản trị viên đang cần tra cứu ở đây.
 */
export default function TimeEntryRateResolveLookup({ levelOptions }: Props) {
  const [values, setValues] = useState<TimeEntryRateLookupFormValues>(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ResolvedTimeEntryRateRes | null>(null);
  const [notFoundMessage, setNotFoundMessage] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  const [employees, setEmployees] = useState<TimeEntryLookupEmployeeRes[]>([]);
  const [employeesLoading, setEmployeesLoading] = useState(true);
  const [employeesError, setEmployeesError] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState('');

  const [candidates, setCandidates] = useState<TimeEntryLookupCandidateRes[]>([]);
  const [candidatesLoading, setCandidatesLoading] = useState(false);
  const [candidatesError, setCandidatesError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setEmployeesLoading(true);
      setEmployeesError(null);
      try {
        const rows = await fetchTimeEntryLookupEmployees();
        setEmployees(rows);
      } catch (err) {
        setEmployeesError(
          err instanceof RatesApiError ? err.message : 'Không tải được danh sách nhân sự. Vui lòng thử lại.'
        );
      } finally {
        setEmployeesLoading(false);
      }
    })();
  }, []);

  const handleSelectEmployee = async (userId: string) => {
    setSelectedUserId(userId);
    setValues({ entryId: '', level: '' });
    setErrors({});
    setResult(null);
    setNotFoundMessage(null);
    setServerError(null);
    setCandidates([]);
    setCandidatesError(null);

    if (userId === '') return;

    // Tu dien san Cap bac theo ho so nhan su — nguoi dung van sua duoc neu can mot moc khac.
    const employee = employees.find((e) => String(e.userId) === userId);
    if (employee?.level) {
      setValues((v) => ({ ...v, level: employee.level as string }));
    }

    setCandidatesLoading(true);
    try {
      const rows = await fetchTimeEntryLookupCandidates(Number(userId));
      setCandidates(rows);
    } catch (err) {
      setCandidatesError(
        err instanceof RatesApiError ? err.message : 'Không tải được danh sách giờ công của nhân sự này.'
      );
    } finally {
      setCandidatesLoading(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (loading) return;

    const nextErrors = validateTimeEntryRateLookupForm(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setLoading(true);
    setServerError(null);
    setNotFoundMessage(null);
    setResult(null);
    try {
      const resolved = await resolveTimeEntryBillRate(Number(values.entryId), values.level.trim());
      setResult(resolved);
    } catch (err) {
      if (err instanceof RatesApiError && err.statusCode === 404) {
        // 404 không phải lỗi hệ thống — có thể dòng giờ công không tồn tại, người
        // thực hiện chưa có hồ sơ nhân sự đầy đủ, hoặc chưa có đơn giá/hệ số hợp lệ.
        setNotFoundMessage(err.message);
      } else {
        setServerError(
          err instanceof RatesApiError ? err.message : 'Không tra được đơn giá áp dụng. Vui lòng thử lại.'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="user-table-card" style={{ marginTop: '16px', padding: '20px' }} data-testid="time-entry-rate-resolve-lookup">
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
        <span className="icon-xs">{ICONS.clock}</span>
        <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>Tra đơn giá áp dụng cho một dòng giờ công</h2>
      </div>
      <p className="field-hint" style={{ marginBottom: '14px' }}>
        Chọn nhân sự, hệ thống tự đổ ra các dòng giờ công đã duyệt của người đó để chọn và tự điền sẵn cấp
        bậc theo hồ sơ nhân sự — hệ thống tự suy ra vai trò, hợp đồng và ngày phát sinh để tra đúng đơn giá
        đang dùng để tính doanh thu cho dòng đó.
      </p>

      {employeesError && (
        <div className="alert-box alert-box--danger" role="alert" style={{ marginBottom: '14px' }}>
          {employeesError}
        </div>
      )}

      {serverError && (
        <div className="alert-box alert-box--danger" role="alert">
          {serverError}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        noValidate
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '12px',
          alignItems: 'flex-end',
        }}
      >
        <div style={{ flex: '1 1 200px', minWidth: 0 }}>
          <label className="form-label" htmlFor="time-entry-resolve-employee">
            Nhân sự
          </label>
          <select
            id="time-entry-resolve-employee"
            className="form-input"
            style={{ width: '100%' }}
            value={selectedUserId}
            onChange={(e) => void handleSelectEmployee(e.target.value)}
            disabled={employeesLoading}
          >
            <option value="">{employeesLoading ? 'Đang tải…' : '-- Chọn nhân sự --'}</option>
            {employees.map((employee) => (
              <option key={employee.userId} value={employee.userId}>
                {employee.fullName}
              </option>
            ))}
          </select>
        </div>

        <div style={{ flex: '1.6 1 260px', minWidth: 0 }}>
          <label className="form-label" htmlFor="time-entry-resolve-id">
            Dòng giờ công
          </label>
          <select
            id="time-entry-resolve-id"
            className={`form-input ${errors.entryId ? 'form-input--error' : ''}`}
            style={{ width: '100%' }}
            value={values.entryId}
            onChange={(e) => setValues((v) => ({ ...v, entryId: e.target.value }))}
            disabled={selectedUserId === '' || candidatesLoading}
          >
            <option value="">
              {selectedUserId === ''
                ? '-- Chọn nhân sự trước --'
                : candidatesLoading
                  ? 'Đang tải…'
                  : candidates.length === 0
                    ? 'Không có dòng giờ công đã duyệt'
                    : '-- Chọn dòng giờ công --'}
            </option>
            {candidates.map((row) => (
              <option key={row.entryId} value={row.entryId}>
                {formatDate(row.workDate)} · {row.projectName} · {row.taskName} · {row.hours} giờ
              </option>
            ))}
          </select>
          {errors.entryId && <small className="field-error">{errors.entryId}</small>}
          {candidatesError && <small className="field-error">{candidatesError}</small>}
        </div>

        <div style={{ flex: '1 1 160px', minWidth: 0 }}>
          <label className="form-label" htmlFor="time-entry-resolve-level">
            Cấp bậc
          </label>
          <select
            id="time-entry-resolve-level"
            className={`form-input ${errors.level ? 'form-input--error' : ''}`}
            style={{ width: '100%' }}
            value={values.level}
            onChange={(e) => setValues((v) => ({ ...v, level: e.target.value }))}
          >
            <option value="">-- Chọn cấp bậc --</option>
            {levelOptions.map((level) => (
              <option key={level} value={level}>
                {level}
              </option>
            ))}
          </select>
          {errors.level && <small className="field-error">{errors.level}</small>}
        </div>

        <div>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Đang tra…' : 'Tra đơn giá'}
          </button>
        </div>
      </form>
      {!employeesLoading && employees.length === 0 && !employeesError && (
        <small className="field-hint" style={{ display: 'block', marginTop: '8px' }}>
          Chưa có nhân sự nào có dòng giờ công đã duyệt.
        </small>
      )}

      {notFoundMessage && (
        <div
          className="alert-box alert-box--info"
          role="status"
          style={{ marginTop: '14px' }}
          data-testid="time-entry-rate-resolve-not-found"
        >
          <span className="icon-xs">{ICONS.info}</span> {notFoundMessage}
        </div>
      )}

      {result && (
        <div
          className="alert-box alert-box--success"
          role="status"
          style={{ marginTop: '14px', display: 'block' }}
          data-testid="time-entry-rate-resolve-result"
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
            <strong style={{ fontSize: '16px' }}>{formatMoney(result.appliedDailyRate)} / ngày công</strong>
            <span className={`badge ${result.isContractSpecific ? 'badge--blue' : 'badge--gray'}`}>
              {result.isContractSpecific ? 'Đơn giá riêng hợp đồng' : 'Đơn giá chung công ty'}
            </span>
            <span className="badge badge--gold">{WORK_TYPE_LABELS[result.workType]}</span>
          </div>

          <div className="table-responsive">
            <table className="user-data-table">
              <tbody>
                <tr>
                  <td className="cell-muted">Dòng giờ công</td>
                  <td>
                    #{result.timeEntryId} · {result.professionalRole} ({result.level})
                  </td>
                </tr>
                <tr>
                  <td className="cell-muted">Ngày công / số giờ</td>
                  <td>
                    {formatDate(result.workDate)} · {result.hours} giờ
                  </td>
                </tr>
                <tr>
                  <td className="cell-muted">Đơn giá theo vai trò/cấp bậc</td>
                  <td>
                    {formatMoney(result.dailyRate)} (hiệu lực từ {formatDate(result.effectiveFrom)})
                  </td>
                </tr>
                <tr>
                  <td className="cell-muted">Hệ số loại hình công việc</td>
                  <td>× {result.rateFactor}</td>
                </tr>
                <tr>
                  <td className="cell-muted">
                    <strong>Đơn giá cuối cùng</strong>
                  </td>
                  <td>
                    <strong>{formatMoney(result.appliedDailyRate)}</strong>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
