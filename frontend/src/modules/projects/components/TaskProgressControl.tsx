import { useMemo, useState } from 'react';
import { updateTaskProgress, TaskApiError } from '../api/tasksApi';
import type { TaskRes, TaskStatus } from '../types/taskTypes';

const TASK_STATUS_OPTIONS: Array<{ value: TaskStatus; label: string }> = [
  { value: 'TODO', label: 'Chưa bắt đầu' },
  { value: 'IN_PROGRESS', label: 'Đang làm' },
  { value: 'WAITING_APPROVAL', label: 'Chờ duyệt' },
  { value: 'DONE', label: 'Hoàn thành' },
];

interface TaskProgressControlProps {
  projectId: number;
  task: TaskRes;
  currentUserRoles?: string[];
  onTaskUpdated?: (updatedTask: TaskRes) => void;
}

export default function TaskProgressControl({
  projectId,
  task,
  currentUserRoles = ['VT-03'],
  onTaskUpdated,
}: TaskProgressControlProps) {
  const canUpdate = currentUserRoles.includes('VT-03');
  const [selectedStatus, setSelectedStatus] = useState<TaskStatus>(task.status);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const statusLabel = useMemo(
    () => TASK_STATUS_OPTIONS.find((option) => option.value === selectedStatus)?.label ?? selectedStatus,
    [selectedStatus]
  );

  const handleChange = async (nextStatus: TaskStatus) => {
    if (!canUpdate) {
      setErrorMessage('Chỉ nhân viên chuyên môn được giao việc mới được cập nhật tiến độ công việc.');
      return;
    }

    if (nextStatus === selectedStatus) return;

    setErrorMessage(null);
    setSuccessMessage(null);
    setIsSaving(true);

    try {
      const updatedTask = await updateTaskProgress(projectId, task.id, nextStatus);
      setSelectedStatus(updatedTask.status);
      setSuccessMessage(`Đã cập nhật trạng thái công việc sang "${TASK_STATUS_OPTIONS.find((item) => item.value === updatedTask.status)?.label ?? updatedTask.status}".`);
      onTaskUpdated?.(updatedTask);
    } catch (error) {
      const message =
        error instanceof TaskApiError
          ? error.message
          : 'Không thể cập nhật tiến độ công việc. Vui lòng thử lại sau.';
      setErrorMessage(message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div style={{ display: 'grid', gap: '12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
        <label htmlFor={`task-status-${task.id}`} style={{ fontWeight: 600, color: '#1f2937' }}>
          Trạng thái công việc
        </label>
        <span style={{ fontSize: '12px', color: '#6b7280' }}>{statusLabel}</span>
      </div>

      {!canUpdate ? (
        <div role="note" style={{ color: '#b45309', fontSize: '13px' }}>
          Chỉ nhân viên chuyên môn được giao việc mới được cập nhật tiến độ công việc.
        </div>
      ) : null}

      <select
        id={`task-status-${task.id}`}
        aria-label="Trạng thái công việc"
        value={selectedStatus}
        disabled={!canUpdate || isSaving}
        onChange={(event) => handleChange(event.target.value as TaskStatus)}
        style={{
          width: '100%',
          padding: '10px 12px',
          borderRadius: '10px',
          border: '1px solid #d1d5db',
          background: canUpdate ? '#fff' : '#f3f4f6',
          color: '#111827',
          fontSize: '14px',
        }}
      >
        {TASK_STATUS_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      {errorMessage ? (
        <div role="alert" style={{ color: '#b91c1c', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '8px 10px', fontSize: '13px' }}>
          {errorMessage}
        </div>
      ) : null}

      {successMessage ? (
        <div role="status" style={{ color: '#166534', background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '8px', padding: '8px 10px', fontSize: '13px' }}>
          {successMessage}
        </div>
      ) : null}
    </div>
  );
}
