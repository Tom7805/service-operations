import React from 'react';
import TaskBudgetBar from './TaskBudgetBar';

interface Task {
  id: number;
  name: string;
  /** Ngân sách giờ công (có thể undefined) */
  hourBudget?: number;
  /** Giờ đã sử dụng (có thể undefined) */
  usedHours?: number;
}

interface TaskTableProps {
  /** Danh sách tasks cần hiển thị */
  tasks: Task[];
}

/**
 * Bảng danh sách task hiển thị các cột thông tin cơ bản và ngân sách giờ công.
 * Cột "Ngân sách" hiển thị giá trị hourBudget và một thanh tiến độ (TaskBudgetBar).
 */
export default function TaskTable({ tasks }: TaskTableProps) {
  return (
    <table className="task-table" role="grid">
      <thead>
        <tr>
          <th>Tên công việc</th>
          <th>Ngân sách giờ</th>
          <th>Tiến độ ngân sách</th>
        </tr>
      </thead>
      <tbody>
        {tasks.map(task => (
          <tr key={task.id}>
            <td>{task.name}</td>
            <td>{task.hourBudget != null ? `${task.hourBudget} giờ` : '—'}</td>
            <td>
              <TaskBudgetBar hourBudget={task.hourBudget} usedHours={task.usedHours} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

