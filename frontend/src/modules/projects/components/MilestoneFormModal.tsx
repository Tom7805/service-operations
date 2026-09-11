import { useEffect, useMemo, useState } from 'react';
import { ICONS } from '../../../components/common/icons';
import type { ProjectMilestoneReq, ProjectMilestoneRes, WorkBreakdownRes } from '../types/projectTypes';
import { createMilestone, updateMilestone, ProjectsApiError } from '../api/projectsApi';
import { validateMilestoneForm } from '../validators/projectValidators';

export interface MilestoneFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: number;
  wbs: WorkBreakdownRes[];
  /** Truyền vào khi sửa mốc đã có; để trống/null khi tạo mới. */
  milestone?: ProjectMilestoneRes | null;
  onSaved?: (milestone: ProjectMilestoneRes) => void;
}

interface TaskOption {
  id: number;
  label: string;
}

/** Làm phẳng cây công việc thành danh sách chọn, kèm đường dẫn hạng mục cha để dễ nhận biết. */
function flattenTaskOptions(items: WorkBreakdownRes[]): TaskOption[] {
  const options: TaskOption[] = [];
  const walk = (nodes: WorkBreakdownRes[], breadcrumb: string) => {
    for (const wp of nodes) {
      const path = breadcrumb ? `${breadcrumb} › ${wp.name}` : wp.name;
      for (const task of wp.tasks || []) {
        options.push({ id: task.id, label: `${path} › ${task.name}` });
      }
      if (wp.children && wp.children.length > 0) {
        walk(wp.children, path);
      }
    }
  };
  walk(items, '');
  return options;
}

export default function MilestoneFormModal({
  isOpen,
  onClose,
  projectId,
  wbs,
  milestone = null,
  onSaved,
}: MilestoneFormModalProps) {
  const isEdit = Boolean(milestone);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [plannedDate, setPlannedDate] = useState('');
  const [taskIds, setTaskIds] = useState<number[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const taskOptions = useMemo(() => flattenTaskOptions(wbs), [wbs]);

  useEffect(() => {
    if (!isOpen) return;
    setName(milestone?.name ?? '');
    setDescription(milestone?.description ?? '');
    setPlannedDate(milestone?.plannedDate ?? '');
    setTaskIds(milestone?.items.map((item) => item.taskId) ?? []);
    setErrors({});
    setServerError(null);
  }, [isOpen, milestone]);

  if (!isOpen) return null;

  const toggleTask = (taskId: number) => {
    setTaskIds((prev) => (prev.includes(taskId) ? prev.filter((id) => id !== taskId) : [...prev, taskId]));
    setErrors((prev) => ({ ...prev, taskIds: '' }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    const payload: ProjectMilestoneReq = {
      name: name.trim(),
      description: description.trim() || null,
      plannedDate,
      taskIds,
    };

    const validation = validateMilestoneForm(payload);
    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    setSubmitting(true);
    setServerError(null);
    try {
      const res =
        isEdit && milestone
          ? await updateMilestone(projectId, milestone.id, payload)
          : await createMilestone(projectId, payload);
      onSaved?.(res);
      onClose();
    } catch (err: unknown) {
      if (err instanceof ProjectsApiError) {
        setServerError(err.message);
      } else if (err instanceof Error) {
        setServerError(err.message);
      } else {
        setServerError('Không thể lưu mốc tiến độ. Vui lòng thử lại.');
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
      aria-labelledby="milestone-form-modal-title"
    >
      <div className="modal-card project-modal-card">
        <div className="modal-header">
          <div className="modal-header__title-wrap">
            <h3 id="milestone-form-modal-title" className="modal-title">
              <span className="modal-title__icon">{ICONS.calendar}</span>
              {isEdit ? 'Sửa mốc tiến độ' : 'Thêm mốc tiến độ'}
            </h3>
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
            <div
              className="alert-box alert-box--danger"
              role="alert"
              data-testid="milestone-server-error"
              style={{ marginBottom: '14px' }}
            >
              {serverError}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate data-testid="milestone-form">
            <div className="form-group" style={{ marginBottom: '14px' }}>
              <label className="form-label" htmlFor="milestone-name">
                Tên mốc tiến độ <span className="field-required">*</span>
              </label>
              <input
                id="milestone-name"
                type="text"
                className={`form-input ${errors.name ? 'form-input--error' : ''}`}
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setErrors((prev) => ({ ...prev, name: '' }));
                  setServerError(null);
                }}
                placeholder="Ví dụ: Bàn giao giai đoạn một"
                disabled={submitting}
                autoFocus
              />
              {errors.name && (
                <p
                  className="field-error"
                  data-testid="error-milestone-name"
                  style={{ color: '#DC2626', fontSize: '13px', marginTop: '4px' }}
                >
                  {errors.name}
                </p>
              )}
            </div>

            <div className="form-group" style={{ marginBottom: '14px' }}>
              <label className="form-label" htmlFor="milestone-description">
                Mô tả
              </label>
              <textarea
                id="milestone-description"
                className="form-input"
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Mô tả thêm về mốc tiến độ..."
                disabled={submitting}
              />
            </div>

            <div className="form-group" style={{ marginBottom: '18px', maxWidth: '220px' }}>
              <label className="form-label" htmlFor="milestone-planned-date">
                Ngày kế hoạch <span className="field-required">*</span>
              </label>
              <input
                id="milestone-planned-date"
                type="date"
                className={`form-input ${errors.plannedDate ? 'form-input--error' : ''}`}
                value={plannedDate}
                onChange={(e) => {
                  setPlannedDate(e.target.value);
                  setErrors((prev) => ({ ...prev, plannedDate: '' }));
                  setServerError(null);
                }}
                disabled={submitting}
              />
              {errors.plannedDate && (
                <p
                  className="field-error"
                  data-testid="error-milestone-planned-date"
                  style={{ color: '#DC2626', fontSize: '13px', marginTop: '4px' }}
                >
                  {errors.plannedDate}
                </p>
              )}
            </div>

            <div className="form-group" style={{ marginBottom: '8px' }}>
              <label className="form-label">
                Hạng mục phải hoàn thành <span className="field-required">*</span>
              </label>
              {taskOptions.length === 0 ? (
                <p className="field-hint" data-testid="milestone-no-tasks-hint">
                  Dự án chưa có công việc nào trong cây công việc — hãy thêm công việc trước khi khai
                  báo mốc tiến độ.
                </p>
              ) : (
                <div className="roles-checklist" data-testid="milestone-task-checklist">
                  {taskOptions.map((option) => {
                    const isChecked = taskIds.includes(option.id);
                    return (
                      <div
                        key={option.id}
                        className={`checklist-item ${isChecked ? 'checklist-item--checked' : ''}`}
                        onClick={() => toggleTask(option.id)}
                        data-testid={`milestone-task-option-${option.id}`}
                      >
                        <input type="checkbox" checked={isChecked} onChange={() => {}} />
                        <div className="checklist-info">
                          <strong>{option.label}</strong>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              {errors.taskIds && (
                <p
                  className="field-error"
                  data-testid="error-milestone-task-ids"
                  style={{ color: '#DC2626', fontSize: '13px', marginTop: '4px' }}
                >
                  {errors.taskIds}
                </p>
              )}
            </div>

            <div
              className="modal-footer"
              style={{ padding: '16px 0 0', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}
            >
              <button type="button" className="btn btn-secondary" onClick={onClose} disabled={submitting}>
                Hủy bỏ
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={submitting}
                data-testid="submit-milestone-btn"
              >
                {submitting ? 'Đang lưu…' : isEdit ? 'Lưu thay đổi' : 'Thêm mốc tiến độ'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
