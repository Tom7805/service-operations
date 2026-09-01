import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { addEmploymentContract, EmployeeApiError, getEmployeeById } from '../api/employeesApi';
import type { EmployeeDetail, EmploymentContractCreatePayload, EmploymentTypeCode } from '../types/employeeTypes';
import { EMPLOYMENT_TYPE_LABELS } from '../types/employeeTypes';
import { validateContractForm, type ContractFormErrors } from '../validators/employeeValidators';
import { ICONS } from '../../../components/common/icons';

interface EmployeeDetailPageProps {
  employeeId: number;
  onBack: () => void;
}

export default function EmployeeDetailPage({ employeeId, onBack }: EmployeeDetailPageProps) {
  const [employee, setEmployee] = useState<EmployeeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [contractType, setContractType] = useState<EmploymentTypeCode | ''>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [contractErrors, setContractErrors] = useState<ContractFormErrors>({});
  const [contractServerError, setContractServerError] = useState<string | null>(null);
  const [submittingContract, setSubmittingContract] = useState(false);

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
      <div className="user-detail-page p-6">
        <div className="skeleton skeleton-text" style={{ width: '200px', height: '30px' }} />
        <div className="skeleton skeleton-card mt-4" style={{ height: '300px' }} />
      </div>
    );
  }

  if (error || !employee) {
    return (
      <div className="user-detail-page p-6">
        <button type="button" className="btn-secondary mb-4" onClick={onBack}>
          ← Quay lại danh sách
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
          ← Quay lại danh sách hồ sơ nhân sự
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
            <p style={{ color: '#787774', fontSize: 13.5 }}>Chưa có hợp đồng lao động nào được ghi nhận.</p>
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
              <span className="field-hint">Không được sớm hơn ngày bắt đầu (TC-03).</span>
            </div>

            <div className="form-field form-field--full" style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" className="btn-primary" disabled={submittingContract}>
                {submittingContract ? 'Đang lưu...' : '+ Ghi nhận hợp đồng'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
