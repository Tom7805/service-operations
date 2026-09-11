import React from 'react';
import { ICONS } from '../../../components/common/icons';

interface TaskBudgetBarProps {
  /** Budget in hours, undefined if not set */
  hourBudget?: number;
  /** Hours already approved/used */
  usedHours?: number;
}

/**
 * Displays the hour budget and usage as a progress bar.
 * Shows a warning when usage exceeds 80% of the budget.
 */
export default function TaskBudgetBar({ hourBudget, usedHours }: TaskBudgetBarProps) {
  if (hourBudget == null) {
    return (
      <div className="task-budget-bar task-budget-bar--none">
        <span className="task-budget-bar__label">Chưa đặt ngân sách</span>
      </div>
    );
  }

  const used = usedHours ?? 0;
  const percent = Math.min(100, (used / hourBudget) * 100);
  const isWarning = percent >= 80;

  return (
    <div className="task-budget-bar">
      <div className="task-budget-bar__label">
        Ngân sách: {hourBudget} giờ | Đã dùng: {used} giờ ({percent.toFixed(0)}%)
      </div>
      <div
        className="task-budget-bar__track"
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className={`task-budget-bar__fill ${isWarning ? 'task-budget-bar__fill--warning' : ''}`}
          style={{ width: `${percent}%` }}
        />
      </div>
      {isWarning && (
        <div className="task-budget-bar__alert" role="alert">
          <span className="icon-sm">{ICONS.alertTriangle}</span> Gần vượt ngân sách!
        </div>
      )}
    </div>
  );
}
