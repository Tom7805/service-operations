import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { ICONS } from '../../../components/common/icons';
import type { AssignableUser } from '../../employees/types/employeeTypes';
import type { Task, TaskAssignment, TaskAssignmentPayload } from '../types/taskTypes';

interface TaskAssignModalProps {
  isOpen: boolean;
  projectId: number;
  task: Task | null;
  assignments: TaskAssignment[];
  staffList: AssignableUser[];
  onClose: () => void;
  onSubmit: (payload: TaskAssignmentPayload) => Promise<void> | void;
}

interface FormErrors {
  userIds?: string;
  expectedEndDate?: string;
}

export default function TaskAssignModal({
  isOpen,
  projectId,
  task,
  assignments,
  staffList,
  onClose,
  onSubmit,
}: TaskAssignModalProps) {
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [expectedStartDate, setExpectedStartDate] = useState('');
  const [expectedEndDate, setExpectedEndDate] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const currentIds = assignments.map((item) => item.userId);
    setSelectedUserIds(currentIds);
    setExpectedStartDate(assignments[0]?.expectedStartDate ?? task?.expectedStartDate ?? '');
    setExpectedEndDate(assignments[0]?.expectedEndDate ?? task?.expectedEndDate ?? '');
    setErrors({});
    setServerError(null);
    setSubmitting(false);
  }, [isOpen, assignments, task]);

  const assignedNames = useMemo(
    () => assignments.map((assignment) => assignment.fullName).join(', ') || 'Chưa có nhân sự nào được giao',
    [assignments]
  );

  const toggleUser = (userId: number) => {
    setSelectedUserIds((prev) => {
      if (prev.includes(userId)) {
        return prev.filter((id) => id !== userId);
      }
      return [...prev, userId];
    });
    if (errors.userIds) {
      setErrors((prev) => ({ ...prev, userIds: undefined }));
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setServerError(null);

    const nextErrors: FormErrors = {};
    if (selectedUserIds.length === 0) {
      nextErrors.userIds = 'Vui lòng chọn ít nhất một nhân sự để giao việc.';
    }

    if (expectedStartDate && expectedEndDate && expectedEndDate < expectedStartDate) {
      nextErrors.expectedEndDate = 'Ngày kết thúc mong muốn không được sớm hơn ngày bắt đầu.';
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    const payload: TaskAssignmentPayload = {
      userIds: selectedUserIds,
      expectedStartDate: expectedStartDate || null,
      expectedEndDate: expectedEndDate || null,
    };

    setSubmitting(true);
    try {
      await onSubmit(payload);
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Không thể lưu phân công nhân sự cho công việc này.';
      setServerError(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="task-assign-modal-title">
      <div className="modal-card modal-card--md" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2 id="task-assign-modal-title" className="modal-title">
              Giao việc cho nhân sự
            </h2>
            <p className="modal-subtitle-text">
              {task ? `${task.name} · Dự án #${projectId}` : 'Phân công nhân sự'}
            </p>
          </div>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Đóng cửa sổ">
            {ICONS.close}
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="modal-body">
            {serverError && (
              <div className="alert alert--error" role="alert">
                <span className="alert__icon">{ICONS.alertTriangle}</span>
                <div>{serverError}</div>
              </div>
            )}

            <div className="form-field form-field--full">
              <label className="form-label">Nhân sự được giao</label>
              <div className="stacked-checklist" role="group" aria-label="Danh sách nhân sự được giao">
                {staffList.length === 0 ? (
                  <span className="field-hint">Hệ thống chưa có nhân sự nào đủ điều kiện để giao việc.</span>
                ) : (
                  staffList.map((staff) => (
                    <label key={staff.id} className="check-option" htmlFor={`staff-${staff.id}`}>
                      <input
                        id={`staff-${staff.id}`}
                        type="checkbox"
                        checked={selectedUserIds.includes(staff.id)}
                        onChange={() => toggleUser(staff.id)}
                        aria-label={staff.fullName}
                        disabled={submitting}
                      />
                      <span>
                        <strong>{staff.fullName}</strong>
                        <small>@{staff.username}</small>
                      </span>
                    </label>
                  ))
                )}
              </div>
              {errors.userIds && <span className="field-error">{errors.userIds}</span>}
            </div>

            <div className="form-grid">
              <div className="form-field">
                <label htmlFor="task-assign-start-date" className="form-label">
                  Ngày bắt đầu mong muốn
                </label>
                <input
                  id="task-assign-start-date"
                  type="date"
                  className="form-input"
                  value={expectedStartDate}
                  onChange={(event) => setExpectedStartDate(event.target.value)}
                  disabled={submitting}
                />
              </div>

              <div className="form-field">
                <label htmlFor="task-assign-end-date" className="form-label">
                  Ngày kết thúc mong muốn
                </label>
                <input
                  id="task-assign-end-date"
                  type="date"
                  className="form-input"
                  value={expectedEndDate}
                  onChange={(event) => setExpectedEndDate(event.target.value)}
                  disabled={submitting}
                />
              </div>
            </div>
            {errors.expectedEndDate && <span className="field-error">{errors.expectedEndDate}</span>}

            <div className="info-card">
              <span className="info-card__label">Nhân sự hiện tại</span>
              <strong>{assignedNames}</strong>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={submitting}>
              Hủy
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Đang lưu...' : 'Lưu phân công'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
