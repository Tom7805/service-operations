import { useCallback, useEffect, useState } from 'react';
import { ICONS } from '../../../components/common/icons';
import type { ProjectRes, TaskRes, WorkBreakdownRes } from '../types/projectTypes';
import {
  deleteWorkPackage,
  getProject,
  getWorkBreakdown,
  ProjectsApiError,
} from '../api/projectsApi';
import WorkBreakdownTree from './WorkBreakdownTree';
import WorkPackageModal from './WorkPackageModal';
import TaskFormModal from './TaskFormModal';

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

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const isProjectOpen = project?.status === 'RUNNING';
  const canEdit = currentUserRoles.includes('VT-02') && isProjectOpen;

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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span className="field-hint" style={{ fontWeight: 600, color: '#1E293B' }}>
                  Danh sách hạng mục ({wbs.length})
                </span>
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
    </div>
  );
}
