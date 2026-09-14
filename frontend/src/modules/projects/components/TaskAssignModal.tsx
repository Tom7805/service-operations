import { useEffect, useState } from 'react';
import { ICONS } from '../../../components/common/icons';
import ModalPortal from '../../../components/common/ModalPortal';
import type { AssignableEmployee, TaskAssignmentReq } from '../types/taskTypes';
import { assignTask, fetchAssignableEmployeesForTask, fetchTaskAssignments, ProjectsApiError } from '../api/projectsApi';
import { validateTaskAssignmentForm } from '../validators/projectValidators';

export interface TaskAssignModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: number;
  taskId: number;
  taskName?: string;
  onSaved?: () => void;
}

/**
 * NCL-05-CN-003: Phân công một hoặc nhiều nhân viên phụ trách một công việc.
 * Danh sách người được giao MỚI sẽ THAY THẾ toàn bộ danh sách cũ (không cộng dồn).
 */
export default function TaskAssignModal({
  isOpen,
  onClose,
  projectId,
  taskId,
  taskName,
  onSaved,
}: TaskAssignModalProps) {
  const [employees, setEmployees] = useState<AssignableEmployee[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [expectedStartDate, setExpectedStartDate] = useState('');
  const [expectedEndDate, setExpectedEndDate] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setErrors({});
    setServerError(null);
    setLoadError(null);
    setLoadingEmployees(true);

    Promise.all([fetchAssignableEmployeesForTask(), fetchTaskAssignments(projectId, taskId)])
      .then(([employeeList, assignments]) => {
        if (cancelled) return;
        setEmployees(employeeList);
        setSelectedUserIds(assignments.map((a) => a.userId));
        // Cả nhóm dùng chung một khung ngày — lấy từ người đầu tiên đã được giao (nếu có).
        setExpectedStartDate(assignments[0]?.expectedStartDate ?? '');
        setExpectedEndDate(assignments[0]?.expectedEndDate ?? '');
      })
      .catch((err) => {
        if (!cancelled) {
          setLoadError(
            err instanceof ProjectsApiError ? err.message : 'Không thể tải dữ liệu phân công.'
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingEmployees(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, projectId, taskId]);

  if (!isOpen) return null;

  const toggleUser = (userId: number) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
    setErrors((prev) => ({ ...prev, userIds: '' }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    const payload: TaskAssignmentReq = {
      userIds: selectedUserIds,
      expectedStartDate: expectedStartDate || null,
      expectedEndDate: expectedEndDate || null,
    };

    const validation = validateTaskAssignmentForm(payload);
    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    setSubmitting(true);
    setServerError(null);

    try {
      await assignTask(projectId, taskId, payload);
      onSaved?.();
      onClose();
    } catch (err: unknown) {
      if (err instanceof ProjectsApiError) {
        setServerError(err.message);
      } else if (err instanceof Error) {
        setServerError(err.message);
      } else {
        setServerError('Không thể phân công. Vui lòng thử lại.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ModalPortal>
    <div
      className="modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="task-assign-modal-title"
    >
      <div className="modal-card">
        <div className="modal-header">
          <div className="modal-header__title-wrap">
            <h3 id="task-assign-modal-title" className="modal-title">
              <span className="modal-title__icon">{ICONS.users}</span>
              Phân công nhân sự cho công việc
            </h3>
            {taskName && (
              <p className="field-hint">
                Công việc: <strong>{taskName}</strong>
              </p>
            )}
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
          {loadError && (
            <div className="alert-box alert-box--danger" role="alert" style={{ marginBottom: '14px' }}>
              {loadError}
            </div>
          )}
          {serverError && (
            <div className="alert-box alert-box--danger" role="alert" data-testid="task-assign-server-error" style={{ marginBottom: '14px' }}>
              {serverError}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate data-testid="task-assign-form">
            <div className="form-group" style={{ marginBottom: '14px' }}>
              <label className="form-label">
                Nhân sự phụ trách <span className="field-required">*</span>
              </label>
              {loadingEmployees ? (
                <p className="field-hint">Đang tải danh sách nhân sự...</p>
              ) : employees.length === 0 ? (
                <p className="field-hint">Không có nhân sự nào đủ điều kiện được giao việc.</p>
              ) : (
                <div
                  style={{
                    maxHeight: '220px',
                    overflowY: 'auto',
                    border: '1px solid #E2E8F0',
                    borderRadius: '8px',
                  }}
                >
                  {employees.map((emp) => (
                    <label
                      key={emp.userId}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 12px',
                        borderBottom: '1px solid #F1F5F9',
                        cursor: 'pointer',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedUserIds.includes(emp.userId)}
                        onChange={() => toggleUser(emp.userId)}
                        disabled={submitting}
                      />
                      <span>
                        {emp.fullName} ({emp.username})
                        {emp.professionalRole && (
                          <span className="cell-muted"> — {emp.professionalRole}</span>
                        )}
                      </span>
                    </label>
                  ))}
                </div>
              )}
              {errors.userIds && (
                <p className="field-error" data-testid="error-task-assign-users" style={{ color: '#DC2626', fontSize: '13px', marginTop: '4px' }}>
                  {errors.userIds}
                </p>
              )}
              <p className="field-hint" style={{ fontSize: '12px', marginTop: '4px', color: '#64748B' }}>
                Lưu sẽ THAY THẾ toàn bộ danh sách người đang được giao trước đó, không cộng dồn.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
              <div className="form-group">
                <label className="form-label" htmlFor="task-assign-start-date">
                  Ngày bắt đầu dự kiến
                </label>
                <input
                  id="task-assign-start-date"
                  type="date"
                  className="form-input"
                  value={expectedStartDate}
                  onChange={(e) => {
                    setExpectedStartDate(e.target.value);
                    setErrors((prev) => ({ ...prev, expectedEndDate: '' }));
                  }}
                  disabled={submitting}
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="task-assign-end-date">
                  Ngày kết thúc dự kiến
                </label>
                <input
                  id="task-assign-end-date"
                  type="date"
                  className={`form-input ${errors.expectedEndDate ? 'form-input--error' : ''}`}
                  value={expectedEndDate}
                  onChange={(e) => {
                    setExpectedEndDate(e.target.value);
                    setErrors((prev) => ({ ...prev, expectedEndDate: '' }));
                  }}
                  disabled={submitting}
                />
                {errors.expectedEndDate && (
                  <p className="field-error" data-testid="error-task-assign-end-date" style={{ color: '#DC2626', fontSize: '13px', marginTop: '4px' }}>
                    {errors.expectedEndDate}
                  </p>
                )}
              </div>
            </div>

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
                disabled={submitting || loadingEmployees}
                data-testid="submit-task-assign-btn"
              >
                {submitting ? 'Đang lưu…' : 'Lưu phân công'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
    </ModalPortal>
  );
}
