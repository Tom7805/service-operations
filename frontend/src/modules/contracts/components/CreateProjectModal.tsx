import { useEffect, useState } from 'react';
import { ICONS } from '../../../components/common/icons';
import type {
  ContractTargetForProject,
  ProjectCreateFromContractReq,
  ProjectRes,
} from '../types/contractTypes';
import { createProjectFromContract, ProjectsApiError } from '../api/contractsApi';
import { validateProjectCreateForm } from '../../projects/validators/projectValidators';

export type {
  ContractTargetForProject,
  ProjectCreateFromContractReq,
  ProjectRes,
} from '../types/contractTypes';

export interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  contract: ContractTargetForProject;
  currentUserRoles?: string[];
  currentUserId?: number;
  onSaved?: (project: ProjectRes) => void;
}

const currencyFormatter = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0,
});

function formatAmount(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return '—';
  return currencyFormatter.format(value);
}

export default function CreateProjectModal({
  isOpen,
  onClose,
  contract,
  currentUserRoles = ['VT-02'],
  currentUserId,
  onSaved,
}: CreateProjectModalProps) {
  const isAllowed = currentUserRoles.includes('VT-02');
  const isActive = (contract.status ?? '').toUpperCase() === 'ACTIVE';

  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [expectedEndDate, setExpectedEndDate] = useState('');
  const [projectManagerId, setProjectManagerId] = useState<string>('');

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Khởi tạo giá trị mặc định khi mở modal
  useEffect(() => {
    if (isOpen) {
      const defaultName = contract.name ? `Dự án: ${contract.name}` : '';
      setName(defaultName);

      const today = new Date().toISOString().split('T')[0];
      const initialStart = contract.startDate ? contract.startDate.split('T')[0] : today;
      setStartDate(initialStart);

      const initialEnd = contract.endDate ? contract.endDate.split('T')[0] : '';
      setExpectedEndDate(initialEnd);

      // Nếu có currentUserId thì gợi ý sẵn, hoặc lấy từ sessionStorage / localStorage
      const savedUserId =
        currentUserId ||
        Number(sessionStorage.getItem('userId')) ||
        Number(localStorage.getItem('userId')) ||
        '';
      setProjectManagerId(savedUserId ? String(savedUserId) : '');

      setErrors({});
      setServerError(null);
    }
  }, [isOpen, contract, currentUserId]);

  if (!isOpen) return null;

  const handleAssignToMe = () => {
    const myId =
      currentUserId ||
      Number(sessionStorage.getItem('userId')) ||
      Number(localStorage.getItem('userId'));
    if (myId) {
      setProjectManagerId(String(myId));
      setErrors((prev) => ({ ...prev, projectManagerId: '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAllowed || !isActive || submitting) return;

    const pmIdNumber = Number(projectManagerId);
    const payload: Partial<ProjectCreateFromContractReq> = {
      name: name.trim(),
      startDate,
      expectedEndDate,
      projectManagerId: pmIdNumber,
    };

    const validation = validateProjectCreateForm(payload);
    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    setSubmitting(true);
    setServerError(null);

    try {
      const created = await createProjectFromContract(contract.id, {
        name: payload.name!,
        startDate: payload.startDate!,
        expectedEndDate: payload.expectedEndDate!,
        projectManagerId: payload.projectManagerId!,
      });
      onSaved?.(created);
      onClose();
    } catch (err: unknown) {
      if (err instanceof ProjectsApiError) {
        setServerError(err.message);
      } else if (err instanceof Error) {
        setServerError(err.message);
      } else {
        setServerError('Không thể tạo dự án từ hợp đồng. Vui lòng thử lại.');
      }
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
      aria-labelledby="create-project-title"
    >
      <div className="modal-card project-modal-card">
        <div className="modal-header">
          <div className="modal-header__title-wrap">
            <h3 id="create-project-title" className="modal-title">
              <span className="modal-title__icon">{ICONS.folder}</span>
              Tạo dự án từ hợp đồng
            </h3>
            <p className="field-hint">
              {contract.contractCode} · {contract.name} · Trạng thái:{' '}
              <strong style={{ color: isActive ? '#15803D' : '#DC2626' }}>{contract.status}</strong>
            </p>
          </div>
          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            disabled={submitting}
            aria-label="Đóng"
          >
            {ICONS.close}
          </button>
        </div>

        <div className="modal-body" style={{ overflowY: 'auto' }}>
          {/* Kiểm tra phân quyền vai trò VT-02 (TC-04) */}
          {!isAllowed && (
            <div className="alert-box alert-box--danger" role="alert" data-testid="project-role-alert">
              Yêu cầu vai trò Quản lý dự án (VT-02).
            </div>
          )}

          {/* Kiểm tra trạng thái hợp đồng không còn hiệu lực (TC-02) */}
          {isAllowed && !isActive && (
            <div className="alert-box alert-box--warning" role="alert" data-testid="project-inactive-alert">
              Chỉ cho phép tạo dự án từ hợp đồng đang còn hiệu lực (ACTIVE).
            </div>
          )}

          {serverError && (
            <div className="alert-box alert-box--danger" role="alert" data-testid="project-server-error">
              {serverError}
            </div>
          )}

          {/* Form tạo dự án (chỉ khi có quyền VT-02 và hợp đồng ACTIVE) */}
          {isAllowed && isActive && (
            <form onSubmit={handleSubmit} noValidate data-testid="create-project-form">
              {/* Thẻ xem trước kế thừa thông tin từ hợp đồng */}
              <div className="project-preview-card" style={{ marginBottom: '16px' }}>
                <div style={{ fontWeight: 600, marginBottom: '8px', color: '#1E293B' }}>
                  Thông tin kế thừa từ hợp đồng
                </div>
                <div className="project-preview-grid">
                  <div className="project-preview-item">
                    <span className="field-hint">Khách hàng:</span>
                    <strong>{contract.customerName || (contract.customerId ? `Mã KH: ${contract.customerId}` : '—')}</strong>
                  </div>
                  <div className="project-preview-item">
                    <span className="field-hint">Loại dự án / hợp đồng:</span>
                    <strong>{contract.contractType || 'Kế thừa từ HĐ'}</strong>
                  </div>
                  <div className="project-preview-item">
                    <span className="field-hint">Hạn mức kế thừa:</span>
                    <strong>
                      {contract.limitValue != null
                        ? formatAmount(contract.limitValue)
                        : contract.totalValue != null
                        ? formatAmount(contract.totalValue)
                        : 'Không giới hạn'}
                    </strong>
                  </div>
                  <div className="project-preview-item">
                    <span className="field-hint">Trạng thái khởi tạo:</span>
                    <strong style={{ color: '#15803D' }}>RUNNING (Đang triển khai)</strong>
                  </div>
                </div>
              </div>

              {/* Tên dự án */}
              <div className="form-group" style={{ marginBottom: '14px' }}>
                <label className="form-label" htmlFor="project-name">
                  Tên dự án <span className="field-required">*</span>
                </label>
                <input
                  id="project-name"
                  type="text"
                  className={`form-input ${errors.name ? 'form-input--error' : ''}`}
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setErrors((prev) => ({ ...prev, name: '' }));
                    setServerError(null);
                  }}
                  placeholder="Nhập tên dự án..."
                  disabled={submitting}
                  autoFocus
                />
                {errors.name && (
                  <p className="field-error" data-testid="error-name" style={{ color: '#DC2626', fontSize: '13px', marginTop: '4px' }}>
                    {errors.name}
                  </p>
                )}
              </div>

              {/* Hàng ngày bắt đầu và ngày kết thúc dự kiến */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                <div className="form-group">
                  <label className="form-label" htmlFor="project-start-date">
                    Ngày bắt đầu <span className="field-required">*</span>
                  </label>
                  <input
                    id="project-start-date"
                    type="date"
                    className={`form-input ${errors.startDate ? 'form-input--error' : ''}`}
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      setErrors((prev) => ({ ...prev, startDate: '' }));
                      setServerError(null);
                    }}
                    disabled={submitting}
                  />
                  {errors.startDate && (
                    <p className="field-error" data-testid="error-start-date" style={{ color: '#DC2626', fontSize: '13px', marginTop: '4px' }}>
                      {errors.startDate}
                    </p>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="project-expected-end-date">
                    Ngày kết thúc dự kiến <span className="field-required">*</span>
                  </label>
                  <input
                    id="project-expected-end-date"
                    type="date"
                    className={`form-input ${errors.expectedEndDate ? 'form-input--error' : ''}`}
                    value={expectedEndDate}
                    onChange={(e) => {
                      setExpectedEndDate(e.target.value);
                      setErrors((prev) => ({ ...prev, expectedEndDate: '' }));
                      setServerError(null);
                    }}
                    disabled={submitting}
                  />
                  {errors.expectedEndDate && (
                    <p className="field-error" data-testid="error-expected-end-date" style={{ color: '#DC2626', fontSize: '13px', marginTop: '4px' }}>
                      {errors.expectedEndDate}
                    </p>
                  )}
                </div>
              </div>

              {/* Người quản lý dự án */}
              <div className="form-group" style={{ marginBottom: '18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <label className="form-label" htmlFor="project-manager-id" style={{ margin: 0 }}>
                    Người quản lý dự án (ID người dùng) <span className="field-required">*</span>
                  </label>
                  <button
                    type="button"
                    className="btn btn-secondary btn-xs"
                    onClick={handleAssignToMe}
                    style={{ padding: '2px 8px', fontSize: '12px' }}
                  >
                    Gán cho tôi
                  </button>
                </div>
                <input
                  id="project-manager-id"
                  type="number"
                  min="1"
                  className={`form-input ${errors.projectManagerId ? 'form-input--error' : ''}`}
                  value={projectManagerId}
                  onChange={(e) => {
                    setProjectManagerId(e.target.value);
                    setErrors((prev) => ({ ...prev, projectManagerId: '' }));
                    setServerError(null);
                  }}
                  placeholder="Nhập ID người quản lý dự án (ví dụ: 7)"
                  disabled={submitting}
                />
                <p className="field-hint" style={{ fontSize: '12px', marginTop: '4px', color: '#64748B' }}>
                  Người dùng được chọn phải đang hoạt động (ACTIVE) trong hệ thống.
                </p>
                {errors.projectManagerId && (
                  <p className="field-error" data-testid="error-project-manager" style={{ color: '#DC2626', fontSize: '13px', marginTop: '4px' }}>
                    {errors.projectManagerId}
                  </p>
                )}
              </div>

              {/* Nút hành động */}
              <div className="modal-footer" style={{ padding: '16px 0 0', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={onClose}
                  disabled={submitting}
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting}
                  data-testid="submit-create-project-btn"
                >
                  {submitting ? 'Đang tạo dự án…' : 'Tạo dự án'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
