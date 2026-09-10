import { useState } from 'react';
import { ICONS } from '../../../components/common/icons';
import type { TaskRes, WorkBreakdownRes, TaskStatus } from '../types/taskTypes';

export interface WorkBreakdownTreeProps {
  projectId: number;
  items: WorkBreakdownRes[];
  isProjectOpen?: boolean;
  canEdit?: boolean;
  onAddSubPackage?: (parent: WorkBreakdownRes) => void;
  onAddTask?: (wp: WorkBreakdownRes, parentTask?: TaskRes | null) => void;
  onDeletePackage?: (wp: WorkBreakdownRes) => void;
}

const statusBadgeConfig: Record<TaskStatus, { label: string; className: string }> = {
  TODO: { label: 'Chờ thực hiện', className: 'wbs-badge--todo' },
  IN_PROGRESS: { label: 'Đang làm', className: 'wbs-badge--progress' },
  WAITING_APPROVAL: { label: 'Chờ duyệt', className: 'wbs-badge--review' },
  DONE: { label: 'Hoàn thành', className: 'wbs-badge--done' },
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('vi-VN');
}

/**
 * Xây dựng cây phân cấp công việc (task con lồng dưới task cha).
 */
interface TaskNode {
  task: TaskRes;
  children: TaskNode[];
}

function buildTaskTree(tasks: TaskRes[]): TaskNode[] {
  const map = new Map<number, TaskNode>();
  tasks.forEach((t) => map.set(t.id, { task: t, children: [] }));

  const roots: TaskNode[] = [];
  tasks.forEach((t) => {
    const node = map.get(t.id)!;
    if (t.parentTaskId && map.has(t.parentTaskId)) {
      map.get(t.parentTaskId)!.children.push(node);
    } else {
      roots.push(node);
    }
  });
  return roots;
}

export default function WorkBreakdownTree({
  items,
  isProjectOpen = true,
  canEdit = false,
  onAddSubPackage,
  onAddTask,
  onDeletePackage,
}: WorkBreakdownTreeProps) {
  // Trạng thái thu gọn/mở rộng từng hạng mục (mặc định mở tất cả)
  const [collapsed, setCollapsed] = useState<Record<number, boolean>>({});

  const toggleCollapse = (id: number) => {
    setCollapsed((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  if (items.length === 0) {
    return (
      <div className="table-empty-state" data-testid="wbs-empty" style={{ padding: '36px 20px', textAlign: 'center' }}>
        <div className="table-empty-state__icon" style={{ fontSize: '36px', color: '#94A3B8', marginBottom: '8px' }}>
          {ICONS.folder}
        </div>
        <h4 style={{ margin: '0 0 6px', fontSize: '15px', color: '#1E293B' }}>Chưa có hạng mục công việc nào</h4>
        <p style={{ margin: 0, color: '#64748B', fontSize: '13.5px' }}>
          {canEdit && isProjectOpen
            ? 'Hãy bấm nút "+ Thêm hạng mục" ở trên để bắt đầu phân rã cấu trúc công việc (WBS).'
            : 'Dự án này chưa được phân rã hạng mục và công việc.'}
        </p>
      </div>
    );
  }

  const renderTaskNode = (node: TaskNode, wp: WorkBreakdownRes, level = 0) => {
    const { task, children } = node;
    const badge = statusBadgeConfig[task.status] || { label: task.status, className: 'wbs-badge--todo' };

    return (
      <div key={task.id} className="wbs-task-row" style={{ marginLeft: `${level * 20}px` }} data-testid={`task-row-${task.id}`}>
        <div className="wbs-task-main">
          <span className="wbs-task-bullet">▪</span>
          <div className="wbs-task-info">
            <span className="wbs-task-name">{task.name}</span>
            {task.description && <span className="wbs-task-desc">{task.description}</span>}
          </div>
        </div>

        <div className="wbs-task-meta">
          {(task.expectedStartDate || task.expectedEndDate) && (
            <span className="wbs-task-date">
              {formatDate(task.expectedStartDate)}
              {task.expectedStartDate && task.expectedEndDate && ' ➔ '}
              {formatDate(task.expectedEndDate)}
            </span>
          )}

          {task.budgetHours != null && (
            <span className="wbs-task-budget" style={{ color: '#2563EB', fontWeight: 500 }}>
              Ngân sách: {task.budgetHours} giờ
            </span>
          )}

          <span className={`wbs-badge ${badge.className}`}>{badge.label}</span>

          {canEdit && isProjectOpen && (
            <button
              type="button"
              className="btn btn-secondary btn-xs"
              onClick={() => onAddTask?.(wp, task)}
              title="Thêm công việc con"
              data-testid={`add-subtask-btn-${task.id}`}
            >
              + Việc con
            </button>
          )}
        </div>

        {children.length > 0 && (
          <div className="wbs-subtask-list">
            {children.map((child) => renderTaskNode(child, wp, level + 1))}
          </div>
        )}
      </div>
    );
  };

  const renderPackageNode = (wp: WorkBreakdownRes, level = 0) => {
    const isClosed = collapsed[wp.id] ?? false;
    const taskTree = buildTaskTree(wp.tasks || []);
    const canDelete =
      canEdit &&
      isProjectOpen &&
      (!wp.tasks || wp.tasks.length === 0) &&
      (!wp.children || wp.children.length === 0);

    return (
      <div
        key={wp.id}
        className={`wbs-package-node ${level > 0 ? 'wbs-package-node--nested' : ''}`}
        style={{ marginLeft: `${level * 18}px` }}
        data-testid={`wp-node-${wp.id}`}
      >
        <div className="wbs-package-header">
          <div className="wbs-package-title-wrap">
            <button
              type="button"
              className="wbs-toggle-btn"
              onClick={() => toggleCollapse(wp.id)}
              aria-label={isClosed ? 'Mở rộng hạng mục' : 'Thu gọn hạng mục'}
              data-testid={`toggle-wp-${wp.id}`}
            >
              <span className={`wbs-chevron ${isClosed ? 'wbs-chevron--collapsed' : ''}`}>
                {ICONS.chevronDown}
              </span>
            </button>
            <span className="wbs-package-icon">{ICONS.folder}</span>
            <div className="wbs-package-text">
              <span className="wbs-package-name">{wp.name}</span>
              {wp.description && <span className="wbs-package-desc">{wp.description}</span>}
            </div>
            <span className="wbs-task-count-pill">
              {(wp.tasks || []).length} việc
            </span>
          </div>

          <div className="wbs-package-actions">
            {canEdit && isProjectOpen && (
              <>
                <button
                  type="button"
                  className="btn btn-secondary btn-xs"
                  onClick={() => onAddTask?.(wp, null)}
                  data-testid={`add-task-btn-${wp.id}`}
                >
                  + Thêm việc
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-xs"
                  onClick={() => onAddSubPackage?.(wp)}
                  data-testid={`add-subpackage-btn-${wp.id}`}
                >
                  + Mục con
                </button>
                {canDelete && (
                  <button
                    type="button"
                    className="btn btn-danger btn-xs"
                    onClick={() => onDeletePackage?.(wp)}
                    data-testid={`delete-wp-btn-${wp.id}`}
                    title="Xóa hạng mục rỗng"
                  >
                    Xóa
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {!isClosed && (
          <div className="wbs-package-body">
            {/* Danh sách công việc */}
            {taskTree.length > 0 && (
              <div className="wbs-task-container">
                {taskTree.map((node) => renderTaskNode(node, wp, 0))}
              </div>
            )}

            {/* Các hạng mục con */}
            {wp.children && wp.children.length > 0 && (
              <div className="wbs-subpackage-container">
                {wp.children.map((child) => renderPackageNode(child, level + 1))}
              </div>
            )}

            {taskTree.length === 0 && (!wp.children || wp.children.length === 0) && (
              <div className="wbs-empty-hint">
                Chưa có công việc trong hạng mục này.
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="wbs-tree" data-testid="wbs-tree">
      {items.map((root) => renderPackageNode(root, 0))}
    </div>
  );
}
