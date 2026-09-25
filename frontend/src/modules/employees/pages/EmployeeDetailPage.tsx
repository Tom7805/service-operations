import { useCallback, useEffect, useState, type FormEvent } from 'react';
import {
  addEmploymentContract,
  createEmployeeHourlyRate,
  EmployeeApiError,
  fetchEmployeeHourlyRates,
  getEmployeeById,
  resolveEmployeeHourlyRate,
} from '../api/employeesApi';
import type {
  EmployeeDetail,
  EmployeeHourlyRateRes,
  EmploymentContractCreatePayload,
  EmploymentTypeCode,
  ResolvedEmployeeHourlyRateRes,
} from '../types/employeeTypes';
import { EMPLOYMENT_TYPE_LABELS } from '../types/employeeTypes';
import { validateContractForm, validateHourlyRateForm, type ContractFormErrors } from '../validators/employeeValidators';
import { ICONS } from '../../../components/common/icons';

interface EmployeeDetailPageProps {
  employeeId: number;
  onBack: () => void;
  currentUserRoles?: string[];
}

/** NCL-07-CN-004: xem lịch sử/tra cứu chi phí giờ công nội bộ (dữ liệu nhạy cảm SALARY/COST). */
const HOURLY_RATE_VIEW_ROLES = ['VT-01', 'VT-05', 'VT-06', 'VT-07'];
/** NCL-07-CN-004: khai báo mốc chi phí giờ công nội bộ mới. */
const HOURLY_RATE_DECLARE_ROLES = ['VT-06', 'VT-07'];

function formatHourlyRate(value: number): string {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(
    value
  );
}

function formatDate(value: string): string {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString('vi-VN');
}

/** Hiển thị số nhập liệu có dấu chấm phân cách hàng nghìn (VD: 1400000 -> "1.400.000"). */
function formatThousands(digitsOnly: string): string {
  if (!digitsOnly) return '';
  return new Intl.NumberFormat('vi-VN').format(Number(digitsOnly));
}

export default function EmployeeDetailPage({ employeeId, onBack, currentUserRoles = [] }: EmployeeDetailPageProps) {
  const canViewHourlyRate = HOURLY_RATE_VIEW_ROLES.some((r) => currentUserRoles.includes(r));
  const canDeclareHourlyRate = HOURLY_RATE_DECLARE_ROLES.some((r) => currentUserRoles.includes(r));

  const [employee, setEmployee] = useState<EmployeeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [contractType, setContractType] = useState<EmploymentTypeCode | ''>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [contractErrors, setContractErrors] = useState<ContractFormErrors>({});
  const [contractServerError, setContractServerError] = useState<string | null>(null);
  const [submittingContract, setSubmittingContract] = useState(false);

  const [hourlyRates, setHourlyRates] = useState<EmployeeHourlyRateRes[]>([]);
  const [hourlyRatesLoading, setHourlyRatesLoading] = useState(false);
  const [hourlyRatesError, setHourlyRatesError] = useState<string | null>(null);

  const [newHourlyRate, setNewHourlyRate] = useState('');
  const [newEffectiveFrom, setNewEffectiveFrom] = useState('');
  const [hourlyRateErrors, setHourlyRateErrors] = useState<{ hourlyRate?: string; effectiveFrom?: string }>({});
  const [hourlyRateServerError, setHourlyRateServerError] = useState<string | null>(null);
  const [submittingHourlyRate, setSubmittingHourlyRate] = useState(false);

  const [resolveAsOf, setResolveAsOf] = useState('');
  const [resolveResult, setResolveResult] = useState<ResolvedEmployeeHourlyRateRes | null>(null);
  const [resolveError, setResolveError] = useState<string | null>(null);
  const [resolving, setResolving] = useState(false);

  const loadHourlyRates = useCallback(async () => {
    if (!canViewHourlyRate) return;
    setHourlyRatesLoading(true);
    setHourlyRatesError(null);
    try {
      const data = await fetchEmployeeHourlyRates(employeeId);
      setHourlyRates(data);
    } catch (err) {
      setHourlyRatesError(
        err instanceof EmployeeApiError ? err.message : 'Không tải được lịch sử chi phí giờ công nội bộ.'
      );
    } finally {
      setHourlyRatesLoading(false);
    }
  }, [employeeId, canViewHourlyRate]);

  useEffect(() => {
    void loadHourlyRates();
  }, [loadHourlyRates]);

  // Mặc định "Ngày hiệu lực" bằng ngày vào làm của nhân sự (NCL-07-CN-004) —
  // vẫn cho phép người dùng sửa tay, chỉ set khi ô còn trống để không ghi đè lựa chọn thủ công.
  useEffect(() => {
    if (employee?.hireDate && newEffectiveFrom === '') {
      setNewEffectiveFrom(employee.hireDate);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employee?.hireDate]);

  const handleAddHourlyRate = async (e: FormEvent) => {
    e.preventDefault();
    if (!canDeclareHourlyRate) return;
    setHourlyRateServerError(null);

    const rateValue = newHourlyRate === '' ? undefined : Number(newHourlyRate);
    const nextErrors = validateHourlyRateForm({ hourlyRate: rateValue, effectiveFrom: newEffectiveFrom });
    setHourlyRateErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmittingHourlyRate(true);
    try {
      const created = await createEmployeeHourlyRate(employeeId, {
        hourlyRate: rateValue as number,
        effectiveFrom: newEffectiveFrom,
      });
      setHourlyRates((prev) => [created, ...prev]);
      setNewHourlyRate('');
      setNewEffectiveFrom(employee?.hireDate ?? '');
      setHourlyRateErrors({});
    } catch (err) {
      setHourlyRateServerError(
        err instanceof EmployeeApiError ? err.message : 'Không thể khai báo chi phí giờ công nội bộ.'
      );
    } finally {
      setSubmittingHourlyRate(false);
    }
  };

  const handleResolveHourlyRate = async (e: FormEvent) => {
    e.preventDefault();
    if (!resolveAsOf || resolving) return;
    setResolving(true);
    setResolveError(null);
    setResolveResult(null);
    try {
      const resolved = await resolveEmployeeHourlyRate(employeeId, resolveAsOf);
      setResolveResult(resolved);
    } catch (err) {
      setResolveError(
        err instanceof EmployeeApiError ? err.message : 'Không tra được chi phí giờ công tại thời điểm này.'
      );
    } finally {
      setResolving(false);
    }
  };

  const loadDetail = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getEmployeeById(employeeId);
      setEmployee(data);
    } catch (err) {
      const message =
        err instanceof EmployeeApiError ? err.message : err instanceof Error ? err.message : 'Không thể tải chi tiết hồ sơ nhân sự.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [employeeId]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  const handleAddContract = async (e: FormEvent) => {
    e.preventDefault();
    setContractServerError(null);

    const payload: EmploymentContractCreatePayload = {
      contractType: contractType as EmploymentTypeCode,
      startDate,
      endDate: endDate || undefined,
    };
    const validationErrors = validateContractForm(payload);
    if (Object.keys(validationErrors).length > 0) {
      setContractErrors(validationErrors);
      return;
    }

    setSubmittingContract(true);
    try {
      await addEmploymentContract(employeeId, payload);
      setContractType('');
      setStartDate('');
      setEndDate('');
      setContractErrors({});
      await loadDetail();
    } catch (err) {
      setContractServerError(
        err instanceof EmployeeApiError ? err.message : err instanceof Error ? err.message : 'Không thể ghi nhận hợp đồng lao động.'
      );
    } finally {
      setSubmittingContract(false);
    }
  };

  if (loading) {
    return (
      <div className="user-detail-page p-6 ia-detail-skeleton" role="status" aria-label="Đang tải hồ sơ nhân sự">
        <div className="skeleton ia-detail-skeleton__title" />
        <div className="skeleton skeleton-text ia-detail-skeleton__sub" />
        <div className="detail-card ia-detail-skeleton__card" aria-hidden="true">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="ia-detail-skeleton__field">
              <span className="skeleton skeleton-text skeleton-text--sm" />
              <span className="skeleton skeleton-text" />
            </div>
          ))}
        </div>
        <div className="skeleton ia-detail-skeleton__block" />
      </div>
    );
  }

  if (error || !employee) {
    return (
      <div className="user-detail-page p-6">
        <button type="button" className="btn-secondary mb-4" onClick={onBack}>
          <span className="icon-sm">{ICONS.arrowLeft}</span> Quay lại danh sách
        </button>
        <div className="alert alert--error">
          <span className="alert__icon">{ICONS.alertTriangle}</span>
          <span>{error || 'Không tìm thấy hồ sơ nhân sự'}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="user-detail-page">
      <div className="mb-4">
        <button type="button" className="btn-secondary" onClick={onBack}>
          <span className="icon-sm">{ICONS.arrowLeft}</span> Quay lại danh sách hồ sơ nhân sự
        </button>
      </div>

      <div className="detail-card">
        <div className="detail-header">
          <div className="avatar-circle avatar-circle--xl">{employee.fullName.charAt(0).toUpperCase()}</div>
          <div>
            <h1 className="detail-name">{employee.fullName}</h1>
            <span className="detail-username">@{employee.username}</span>
            {employee.endDate && (
              <div className="mt-2">
                <span className="status-pill status-pill--locked">Đã kết thúc làm việc</span>
              </div>
            )}
          </div>
        </div>

        <hr className="divider" />

        <div className="detail-grid">
          <div className="detail-field">
            <span className="detail-label">Bộ phận / Phòng ban</span>
            <strong className="detail-value">{employee.departmentName || 'Chưa gán'}</strong>
          </div>
          <div className="detail-field">
            <span className="detail-label">Vai trò chuyên môn</span>
            <strong className="detail-value">{employee.professionalRole || 'Chưa khai báo'}</strong>
          </div>
          <div className="detail-field">
            <span className="detail-label">Giờ làm việc chuẩn / tuần</span>
            <strong className="detail-value">{employee.standardHoursPerWeek} giờ</strong>
          </div>
          <div className="detail-field">
            <span className="detail-label">Ngày vào làm</span>
            <strong className="detail-value">{employee.hireDate}</strong>
          </div>
          <div className="detail-field">
            <span className="detail-label">Ngày kết thúc</span>
            <strong className="detail-value">{employee.endDate || 'Đang làm việc'}</strong>
          </div>
          <div className="detail-field">
            <span className="detail-label">Cập nhật lần cuối</span>
            <strong className="detail-value">{new Date(employee.updatedAt).toLocaleString('vi-VN')}</strong>
          </div>
        </div>

        <hr className="divider" />

        <div className="detail-section">
          <h3 className="section-title">Hợp đồng lao động</h3>

          {employee.contracts.length === 0 ? (
            <p className="ia-inline-empty">Chưa có hợp đồng lao động nào được ghi nhận.</p>
          ) : (
            <div className="table-responsive">
              <table className="user-data-table">
                <thead>
                  <tr>
                    <th>Loại hợp đồng</th>
                    <th>Ngày bắt đầu</th>
                    <th>Ngày kết thúc</th>
                    <th>Thời điểm ghi nhận</th>
                  </tr>
                </thead>
                <tbody>
                  {employee.contracts.map((c) => (
                    <tr key={c.id}>
                      <td>
                        <span className="user-tag badge--blue">{EMPLOYMENT_TYPE_LABELS[c.contractType]}</span>
                      </td>
                      <td>{c.startDate}</td>
                      <td>{c.endDate || '—'}</td>
                      <td>{new Date(c.createdAt).toLocaleString('vi-VN')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <form onSubmit={handleAddContract} className="form-grid mt-4">
            {contractServerError && (
              <div className="alert alert--error form-field--full" role="alert">
                <span className="alert__icon">{ICONS.alertTriangle}</span>
                <span>{contractServerError}</span>
              </div>
            )}

            <div className="form-field">
              <label htmlFor="contract-type-input" className="form-label">
                Loại hợp đồng <span className="req">*</span>
              </label>
              <select
                id="contract-type-input"
                className={`form-select ${contractErrors.contractType ? 'form-input--error' : ''}`}
                value={contractType}
                onChange={(e) => {
                  setContractType(e.target.value as EmploymentTypeCode | '');
                  if (contractErrors.contractType) setContractErrors({ ...contractErrors, contractType: undefined });
                }}
                disabled={submittingContract}
              >
                <option value="">-- Chọn loại hợp đồng --</option>
                {(Object.keys(EMPLOYMENT_TYPE_LABELS) as EmploymentTypeCode[]).map((code) => (
                  <option key={code} value={code}>
                    {EMPLOYMENT_TYPE_LABELS[code]}
                  </option>
                ))}
              </select>
              {contractErrors.contractType && <span className="field-error">{contractErrors.contractType}</span>}
            </div>

            <div className="form-field">
              <label htmlFor="contract-start-input" className="form-label">
                Ngày bắt đầu <span className="req">*</span>
              </label>
              <input
                id="contract-start-input"
                type="date"
                className={`form-input ${contractErrors.startDate ? 'form-input--error' : ''}`}
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  if (contractErrors.startDate) setContractErrors({ ...contractErrors, startDate: undefined });
                }}
                disabled={submittingContract}
              />
              {contractErrors.startDate && <span className="field-error">{contractErrors.startDate}</span>}
            </div>

            <div className="form-field">
              <label htmlFor="contract-end-input" className="form-label">Ngày kết thúc</label>
              <input
                id="contract-end-input"
                type="date"
                className={`form-input ${contractErrors.endDate ? 'form-input--error' : ''}`}
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  if (contractErrors.endDate) setContractErrors({ ...contractErrors, endDate: undefined });
                }}
                disabled={submittingContract}
              />
              {contractErrors.endDate && <span className="field-error">{contractErrors.endDate}</span>}
              <span className="field-hint">Không được sớm hơn ngày bắt đầu.</span>
            </div>

            <div className="form-field form-field--full ia-form-actions">
              <button type="submit" className="btn-primary" disabled={submittingContract}>
                {submittingContract ? 'Đang lưu...' : '+ Ghi nhận hợp đồng'}
              </button>
            </div>
          </form>
        </div>

        {canViewHourlyRate && (
          <>
            <hr className="divider" />

            <div className="detail-section" data-testid="hourly-rate-section">
              <h3 className="section-title">Chi phí giờ công nội bộ</h3>
              <p className="ia-inline-empty ia-mt-n4">
                Dữ liệu nhạy cảm (lương/giá vốn) — dùng để tính giá vốn dự án. Mỗi lần xem hoặc khai báo đều
                được hệ thống tự ghi vào nhật ký truy cập dữ liệu nhạy cảm.
              </p>

              {hourlyRatesLoading ? (
                <div className="skeleton skeleton-card mt-2 ia-h-80" />
              ) : hourlyRatesError ? (
                <div className="alert alert--error mt-2" role="alert">
                  <span className="alert__icon">{ICONS.alertTriangle}</span>
                  <span>{hourlyRatesError}</span>
                  <button type="button" className="btn-link text-white ml-auto" onClick={() => void loadHourlyRates()}>
                    Thử lại
                  </button>
                </div>
              ) : hourlyRates.length === 0 ? (
                <p className="ia-inline-empty">Chưa có mốc chi phí giờ công nào được khai báo.</p>
              ) : (
                <div className="table-responsive">
                  <table className="user-data-table" data-testid="hourly-rate-table">
                    <thead>
                      <tr>
                        <th>Chi phí / giờ</th>
                        <th>Hiệu lực từ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {hourlyRates.map((r) => (
                        <tr key={r.id}>
                          <td className="mono-cell ia-num">{formatHourlyRate(r.hourlyRate)}</td>
                          <td>{formatDate(r.effectiveFrom)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {canDeclareHourlyRate && (
                <form onSubmit={handleAddHourlyRate} className="form-grid mt-4">
                  {hourlyRateServerError && (
                    <div className="alert alert--error form-field--full" role="alert">
                      <span className="alert__icon">{ICONS.alertTriangle}</span>
                      <span>{hourlyRateServerError}</span>
                    </div>
                  )}

                  <div className="form-field">
                    <label htmlFor="hourly-rate-input" className="form-label">
                      Chi phí giờ công (VNĐ) <span className="req">*</span>
                    </label>
                    <input
                      id="hourly-rate-input"
                      type="text"
                      inputMode="numeric"
                      className={`form-input ${hourlyRateErrors.hourlyRate ? 'form-input--error' : ''}`}
                      value={formatThousands(newHourlyRate)}
                      onChange={(e) => {
                        const digitsOnly = e.target.value.replace(/\D/g, '');
                        setNewHourlyRate(digitsOnly);
                        if (hourlyRateErrors.hourlyRate) setHourlyRateErrors({ ...hourlyRateErrors, hourlyRate: undefined });
                      }}
                      disabled={submittingHourlyRate}
                    />
                    {hourlyRateErrors.hourlyRate && <span className="field-error">{hourlyRateErrors.hourlyRate}</span>}
                  </div>

                  <div className="form-field">
                    <label htmlFor="hourly-rate-effective-from-input" className="form-label">
                      Ngày hiệu lực <span className="req">*</span>
                    </label>
                    <input
                      id="hourly-rate-effective-from-input"
                      type="date"
                      className={`form-input ${hourlyRateErrors.effectiveFrom ? 'form-input--error' : ''}`}
                      value={newEffectiveFrom}
                      onChange={(e) => {
                        setNewEffectiveFrom(e.target.value);
                        if (hourlyRateErrors.effectiveFrom) setHourlyRateErrors({ ...hourlyRateErrors, effectiveFrom: undefined });
                      }}
                      disabled={submittingHourlyRate}
                    />
                    {hourlyRateErrors.effectiveFrom && <span className="field-error">{hourlyRateErrors.effectiveFrom}</span>}
                    <span className="field-hint">Mặc định theo ngày vào làm, có thể chỉnh sửa nếu cần mốc khác.</span>
                  </div>

                  <div className="form-field form-field--full ia-form-actions">
                    <button type="submit" className="btn-primary" disabled={submittingHourlyRate}>
                      {submittingHourlyRate ? 'Đang lưu...' : '+ Khai báo chi phí giờ công'}
                    </button>
                  </div>
                </form>
              )}

              <hr className="divider" />

              <h4 className="ia-subheading">
                Tra chi phí giờ công tại một thời điểm
              </h4>
              <form onSubmit={handleResolveHourlyRate} className="ia-inline-form">
                <div className="form-field ia-minw-180">
                  <label htmlFor="hourly-rate-resolve-as-of" className="form-label">
                    Ngày phát sinh
                  </label>
                  <input
                    id="hourly-rate-resolve-as-of"
                    type="date"
                    className="form-input"
                    value={resolveAsOf}
                    onChange={(e) => setResolveAsOf(e.target.value)}
                  />
                </div>
                <button type="submit" className="btn-secondary" disabled={!resolveAsOf || resolving}>
                  {resolving ? 'Đang tra…' : 'Tra chi phí'}
                </button>
              </form>

              {resolveError && (
                <div className="alert alert--error mt-2" role="alert">
                  <span className="alert__icon">{ICONS.alertTriangle}</span>
                  <span>{resolveError}</span>
                </div>
              )}

              {resolveResult && resolveResult.missingCostData && (
                <div className="alert-box alert-box--info mt-2" role="status" data-testid="hourly-rate-missing">
                  <span className="icon-xs">{ICONS.info}</span> Chưa có chi phí giờ công nào hiệu lực trước hoặc
                  đúng ngày {formatDate(resolveAsOf)} — nhân sự này chưa có mốc chi phí nào tính đến thời điểm đó.
                </div>
              )}

              {resolveResult && !resolveResult.missingCostData && resolveResult.hourlyRate != null && (
                <div className="alert-box alert-box--success mt-2" role="status" data-testid="hourly-rate-resolved">
                  <strong>{formatHourlyRate(resolveResult.hourlyRate)} / giờ</strong>
                  <div className="field-hint ia-mt-4">
                    Mốc áp dụng có hiệu lực từ {formatDate(resolveResult.effectiveFrom as string)}.
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
