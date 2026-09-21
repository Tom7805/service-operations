import { useEffect, useState } from 'react';
import { ICONS } from '../../../components/common/icons';
import ModalPortal from '../../../components/common/ModalPortal';
import { getActiveUsersLookup, type UserLookup } from '../../users/api/usersApi';
import type { TaskAssignmentReq, TaskAssignmentRes } from '../types/taskTypes';
import { assignTask, getTaskAssignments, ProjectsApiError } from '../api/projectsApi';
import { validateTaskAssignmentForm } from '../validators/projectValidators';

export interface TaskAssignModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: number;
  taskId: number;
  taskName?: string;
  onSaved?: (assignments: TaskAssignmentRes[]) => void;
}

/**
 * NCL-05-CN-003: Phân công nhân sự cho công việc.
 * Danh sách người được giao mới sẽ THAY THẾ toàn bộ danh sách cũ, không cộng dồn.
 * Chỉ Quản lý dự án (VT-02) thao tác được, dự án phải đang RUNNING.
 */
export default function TaskAssignModal({
  isOpen,
  onClose,
  projectId,
  taskId,
  taskName,
  onSaved,
}: TaskAssignModalProps) {
  const [users, setUsers] = useState<UserLookup[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [expectedStartDate, setExpectedStartDate] = useState('');
  const [expectedEndDate, setExpectedEndDate] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    setErrors({});
    setServerError(null);
    setSelectedUserIds([]);
    setExpectedStartDate('');
    setExpectedEndDate('');
    setLoadingUsers(true);

    (async () => {
      try {
        const [userList, currentAssignments] = await Promise.all([
          getActiveUsersLookup(),
          getTaskAssignments(projectId, taskId),
        ]);
        setUsers(userList);
        if (currentAssignments.length > 0) {
          setSelectedUserIds(currentAssignments.map((a) => a.userId));
          setExpectedStartDate(currentAssignments[0].expectedStartDate);
          setExpectedEndDate(currentAssignments[0].expectedEndDate);
        }
      } catch (err: unknown) {
        const msg =
          err instanceof Error ? err.message : 'Không thể nạp danh sách nhân viên. Vui lòng thử lại.';
        setServerError(msg);
      } finally {
        setLoadingUsers(false);
      }
    })();
  }, [isOpen, projectId, taskId]);

  if (!isOpen) return null;

  const toggleUser = (userId: number) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
    setErrors((prev) => ({ ...prev, userIds: '' }));
    setServerError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    const payload: TaskAssignmentReq = {
      userIds: selectedUserIds,
      expectedStartDate,
      expectedEndDate,
    };

    const validation = validateTaskAssignmentForm(payload);
    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    setSubmitting(true);
    setServerError(null);

    try {
      const assignments = await assignTask(projectId, taskId, payload);
      onSaved?.(assignments);
      onClose();
    } catch (err: unknown) {
      if (err instanceof ProjectsApiError) {
        setServerError(err.message);
      } else if (err instanceof Error) {
        setServerError(err.message);
      } else {
        setServerError('Không thể phân công nhân sự. Vui lòng thử lại.');
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
              Phân công nhân sự
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
          {serverError && (
            <div className="alert-box alert-box--danger" role="alert" data-testid="task-assign-server-error" style={{ marginBottom: '14px' }}>
              {serverError}
            </div>
          )}

          {loadingUsers ? (
            <div className="table-loading-state" data-testid="task-assign-loading">
              <span className="spinner-lg" />
              <p style={{ marginTop: '10px' }}>Đang nạp danh sách nhân viên...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate data-testid="task-assign-form">
              <div className="form-group" style={{ marginBottom: '14px' }}>
                <label className="form-label">
                  Nhân viên phụ trách <span className="field-required">*</span>
                </label>
                <div
                  style={{
                    maxHeight: '220px',
                    overflowY: 'auto',
                    border: '1px solid var(--line)',
                    borderRadius: '8px',
                    padding: '8px 10px',
                  }}
                  data-testid="task-assign-user-list"
                >
                  {users.length === 0 ? (
                    <p className="field-hint" style={{ margin: 0 }}>
                      Không có nhân viên nào đang hoạt động.
                    </p>
                  ) : (
                    users.map((u) => (
                      <label
                        key={u.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '4px 0',
                          fontSize: '14px',
                          cursor: submitting ? 'not-allowed' : 'pointer',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={selectedUserIds.includes(u.id)}
                          onChange={() => toggleUser(u.id)}
                          disabled={submitting}
                          data-testid={`task-assign-user-${u.id}`}
                        />
                        {u.fullName}
                      </label>
                    ))
                  )}
                </div>
                {errors.userIds && (
                  <p className="field-error" data-testid="error-task-assign-users" style={{ color: 'var(--pale-red-fg)', fontSize: '13px', marginTop: '4px' }}>
                    {errors.userIds}
                  </p>
                )}
                <p className="field-hint" style={{ fontSize: '12px', marginTop: '4px', color: 'var(--ink-muted)' }}>
                  Danh sách người được chọn sẽ thay thế toàn bộ danh sách phân công hiện tại, không cộng dồn.
                  Có thể phân công cho bất kỳ vai trò nào đang hoạt động; người được giao sẽ tự cập nhật tiến độ công việc này sau khi đăng nhập.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginBottom: '14px' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label" htmlFor="task-assign-start-date">
                    Ngày bắt đầu dự kiến <span className="field-required">*</span>
                  </label>
                  <input
                    id="task-assign-start-date"
                    type="date"
                    className={`form-input ${errors.expectedStartDate ? 'form-input--error' : ''}`}
                    value={expectedStartDate}
                    onChange={(e) => {
                      setExpectedStartDate(e.target.value);
                      setErrors((prev) => ({ ...prev, expectedStartDate: '', expectedEndDate: '' }));
                      setServerError(null);
                    }}
                    disabled={submitting}
                  />
                  {errors.expectedStartDate && (
                    <p className="field-error" data-testid="error-task-assign-start-date" style={{ color: 'var(--pale-red-fg)', fontSize: '13px', marginTop: '4px' }}>
                      {errors.expectedStartDate}
                    </p>
                  )}
                </div>

                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label" htmlFor="task-assign-end-date">
                    Ngày kết thúc dự kiến <span className="field-required">*</span>
                  </label>
                  <input
                    id="task-assign-end-date"
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
                    <p className="field-error" data-testid="error-task-assign-end-date" style={{ color: 'var(--pale-red-fg)', fontSize: '13px', marginTop: '4px' }}>
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
                  disabled={submitting}
                  data-testid="submit-task-assign-btn"
                >
                  {submitting ? 'Đang lưu…' : 'Lưu phân công'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
    </ModalPortal>
  );
}
