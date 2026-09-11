import { useCallback, useEffect, useState } from 'react';
import { ICONS } from '../../../components/common/icons';
import type { ProjectRes, TaskBudgetStatusRes, TaskRes, WorkBreakdownRes } from '../types/projectTypes';
import {
  closeProject,
  deleteWorkPackage,
  getProject,
  getWorkBreakdown,
  ProjectsApiError,
} from '../api/projectsApi';
import WorkBreakdownTree from './WorkBreakdownTree';
import WorkPackageModal from './WorkPackageModal';
import TaskFormModal from './TaskFormModal';
import TaskBudgetModal from './TaskBudgetModal';

export interface ProjectWbsModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: number;
  projectCode?: string;
  projectName?: string;
  currentUserRoles?: string[];
  onUpdated?: () => void;
}

export default function ProjectWbsModal({
  isOpen,
  onClose,
  projectId,
  projectCode,
  projectName,
  currentUserRoles = ['VT-02'],
  onUpdated,
}: ProjectWbsModalProps) {
  const isAllowedToView =
    currentUserRoles.includes('VT-01') ||
    currentUserRoles.includes('VT-02') ||
    currentUserRoles.includes('VT-03');

  const [project, setProject] = useState<ProjectRes | null>(null);
  const [wbs, setWbs] = useState<WorkBreakdownRes[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal thêm hạng mục
  const [isWpModalOpen, setIsWpModalOpen] = useState(false);
  const [wpParent, setWpParent] = useState<{ id: number | null; name: string | null }>({
    id: null,
    name: null,
  });

  // Modal thêm công việc
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [taskTargetWp, setTaskTargetWp] = useState<{ id: number; name: string }>({
    id: 0,
    name: '',
  });
  const [taskParent, setTaskParent] = useState<{ id: number | null; name: string | null }>({
    id: null,
    name: null,
  });

  // Modal đặt ngân sách giờ công (NCL-05-CN-005)
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
  const [budgetTarget, setBudgetTarget] = useState<{ id: number; name: string; budgetHours: number | null }>({
    id: 0,
    name: '',
    budgetHours: null,
  });

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Trạng thái đang gọi API đóng dự án (NCL-05-CN-006)
  const [closing, setClosing] = useState(false);

  const isProjectOpen = project?.status === 'RUNNING';
  const canEdit = currentUserRoles.includes('VT-02') && isProjectOpen;
  // Quyền đóng dự án (NCL-05-CN-006): chỉ Quản lý dự án và dự án phải đang RUNNING
  const canClose = currentUserRoles.includes('VT-02') && isProjectOpen;

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const loadData = useCallback(async () => {
    if (!projectId || !isAllowedToView) return;
    setLoading(true);
    setError(null);
    try {
      const [projData, wbsData] = await Promise.all([
        getProject(projectId),
        getWorkBreakdown(projectId),
      ]);
      setProject(projData);
      setWbs(wbsData);
    } catch (err: unknown) {
      if (err instanceof ProjectsApiError) {
        setError(err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Không thể tải dữ liệu cơ cấu công việc.');
      }
    } finally {
      setLoading(false);
    }
  }, [projectId, isAllowedToView]);

  useEffect(() => {
    if (isOpen) {
      void loadData();
    }
  }, [isOpen, loadData]);

  if (!isOpen) return null;

  const handleOpenAddRootPackage = () => {
    setWpParent({ id: null, name: null });
    setIsWpModalOpen(true);
  };

  const handleOpenAddSubPackage = (parent: WorkBreakdownRes) => {
    setWpParent({ id: parent.id, name: parent.name });
    setIsWpModalOpen(true);
  };

  const handleOpenAddTask = (wp: WorkBreakdownRes, parentTask?: TaskRes | null) => {
    setTaskTargetWp({ id: wp.id, name: wp.name });
    setTaskParent({
      id: parentTask ? parentTask.id : null,
      name: parentTask ? parentTask.name : null,
    });
    setIsTaskModalOpen(true);
  };

  const handleOpenSetBudget = (task: TaskRes) => {
    setBudgetTarget({ id: task.id, name: task.name, budgetHours: task.budgetHours ?? null });
    setIsBudgetModalOpen(true);
  };

  const handleBudgetSaved = (status: TaskBudgetStatusRes) => {
    showToast(
      status.overBudgetWarning
        ? `Đã đặt ngân sách ${status.budgetHours} giờ — đã dùng ${(status.usageRatio * 100).toFixed(0)}%, gần/đã vượt ngân sách!`
        : `Đã đặt ngân sách ${status.budgetHours} giờ công thành công`,
      status.overBudgetWarning ? 'error' : 'success'
    );
    onUpdated?.();
    void loadData();
  };

  const handleDeletePackage = async (wp: WorkBreakdownRes) => {
    if (!window.confirm(`Bạn có chắc muốn xóa hạng mục "${wp.name}" không?`)) return;
    try {
      await deleteWorkPackage(projectId, wp.id);
      showToast('Đã xóa hạng mục thành công');
      onUpdated?.();
      void loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể xóa hạng mục.';
      showToast(msg, 'error');
    }
  };

  // Đóng dự án (NCL-05-CN-006): TC-01 luồng thành công, TC-02 chặn khi còn công việc chờ duyệt
  const handleCloseProject = async () => {
    if (!project) return;
    if (
      !window.confirm(
        `Bạn có chắc chắn muốn đóng dự án "${project.name}"? Sau khi đóng sẽ không thể chỉnh sửa cơ cấu công việc, giao việc, tiến độ hay ngân sách giờ công của dự án này nữa.`
      )
    ) {
      return;
    }
    setClosing(true);
    try {
      const updated = await closeProject(projectId);
      setProject(updated);
      showToast('Đã đóng dự án thành công');
      onUpdated?.();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể đóng dự án.';
      showToast(msg, 'error');
    } finally {
      setClosing(false);
    }
  };

  return (
    <div
      className="modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="wbs-modal-title"
    >
      <div className="modal-card project-modal-card" style={{ width: 'min(100%, 820px)' }}>
        <div className="modal-header">
          <div className="modal-header__title-wrap">
            <h3 id="wbs-modal-title" className="modal-title">
              <span className="modal-title__icon">{ICONS.tree}</span>
              Cơ cấu hạng mục & công việc (WBS)
            </h3>
            <p className="field-hint">
              {projectCode || project?.projectCode || `Mã: ${projectId}`} · {projectName || project?.name}
              {project && (
                <>
                  {' · '}Trạng thái:{' '}
                  <strong style={{ color: isProjectOpen ? '#15803D' : '#64748B' }}>
                    {project.status}
                  </strong>
                </>
              )}
            </p>
          </div>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Đóng">
            {ICONS.close}
          </button>
        </div>

        <div className="modal-body" style={{ overflowY: 'auto', maxHeight: '75vh' }}>
          {!isAllowedToView && (
            <div className="alert-box alert-box--danger" role="alert" data-testid="wbs-forbidden-alert">
              Yêu cầu vai trò Quản lý dự án (VT-02), Nhân viên chuyên môn (VT-03) hoặc Ban giám đốc (VT-01).
            </div>
          )}

          {isAllowedToView && project && !isProjectOpen && (
            <div className="alert-box alert-box--warning" role="alert" data-testid="wbs-closed-alert" style={{ marginBottom: '14px' }}>
              Dự án đã đóng hoặc tạm dừng. Không thể tạo mới, chỉnh sửa hoặc xóa hạng mục và công việc.
            </div>
          )}

          {toast && (
            <div className={`alert-box alert-box--${toast.type === 'success' ? 'success' : 'danger'}`} role="alert" style={{ marginBottom: '14px' }}>
              {toast.message}
            </div>
          )}

          {error && (
            <div className="alert-box alert-box--danger" role="alert" style={{ marginBottom: '14px' }}>
              {error}
            </div>
          )}

          {isAllowedToView && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', gap: '8px', flexWrap: 'wrap' }}>
                <span className="field-hint" style={{ fontWeight: 600, color: '#1E293B' }}>
                  Danh sách hạng mục ({wbs.length})
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {canEdit && (
                    <button
                      type="button"
                      className="btn btn-primary btn-xs"
                      onClick={handleOpenAddRootPackage}
                      data-testid="modal-btn-add-root-wp"
                    >
                      + Thêm hạng mục gốc
                    </button>
                  )}
                  {canClose && (
                    <button
                      type="button"
                      className="btn btn-danger btn-xs"
                      onClick={handleCloseProject}
                      disabled={closing}
                      data-testid="modal-btn-close-project"
                    >
                      {closing ? 'Đang đóng…' : 'Đóng dự án'}
                    </button>
                  )}
                </div>
              </div>

              {loading ? (
                <div className="table-loading-state" data-testid="wbs-modal-loading">
                  <span className="spinner-lg" />
                  <p style={{ marginTop: '10px' }}>Đang nạp dữ liệu công việc...</p>
                </div>
              ) : (
                <WorkBreakdownTree
                  projectId={projectId}
                  items={wbs}
                  isProjectOpen={isProjectOpen}
                  canEdit={canEdit}
                  onAddSubPackage={handleOpenAddSubPackage}
                  onAddTask={handleOpenAddTask}
                  onDeletePackage={handleDeletePackage}
                  onSetBudget={handleOpenSetBudget}
                />
              )}
            </>
          )}
        </div>

        <div className="modal-footer" style={{ padding: '14px 20px', display: 'flex', justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Đóng
          </button>
        </div>
      </div>

      {/* Sub-modals */}
      <WorkPackageModal
        isOpen={isWpModalOpen}
        onClose={() => setIsWpModalOpen(false)}
        projectId={projectId}
        parentId={wpParent.id}
        parentName={wpParent.name}
        onSaved={(newWp) => {
          showToast(`Đã thêm hạng mục "${newWp.name}" thành công`);
          onUpdated?.();
          void loadData();
        }}
      />

      <TaskFormModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        projectId={projectId}
        workPackageId={taskTargetWp.id}
        workPackageName={taskTargetWp.name}
        parentTaskId={taskParent.id}
        parentTaskName={taskParent.name}
        onSaved={(newTask) => {
          showToast(`Đã thêm công việc "${newTask.name}" thành công`);
          onUpdated?.();
          void loadData();
        }}
      />

      <TaskBudgetModal
        isOpen={isBudgetModalOpen}
        onClose={() => setIsBudgetModalOpen(false)}
        projectId={projectId}
        taskId={budgetTarget.id}
        taskName={budgetTarget.name}
        currentBudgetHours={budgetTarget.budgetHours}
        onSaved={handleBudgetSaved}
      />
    </div>
  );
}
