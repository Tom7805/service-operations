import { useCallback, useEffect, useState } from 'react';
import { ICONS } from '../../../components/common/icons';
import type { ProjectRes, TaskRes, WorkBreakdownRes } from '../types/projectTypes';
import {
  closeProject,
  deleteWorkPackage,
  getProject,
  getWorkBreakdown,
  ProjectsApiError,
} from '../api/projectsApi';
import WorkBreakdownTree from '../components/WorkBreakdownTree';
import WorkPackageModal from '../components/WorkPackageModal';
import TaskFormModal from '../components/TaskFormModal';
import ProjectMilestoneTimeline from '../components/ProjectMilestoneTimeline';

export interface ProjectDetailPageProps {
  projectId: number;
  currentUserRoles?: string[];
  currentUserName?: string;
  onBack?: () => void;
  /** NCL-05-CN-009: điều hướng sang trang rủi ro dự án (ProjectRiskPage) — do màn cha quyết định. */
  onOpenRisks?: (projectId: number) => void;
  initialProject?: ProjectRes;
  initialWbs?: WorkBreakdownRes[];
}

const currencyFormatter = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0,
});

function formatAmount(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return '—';
  return currencyFormatter.format(value);
}

function formatDate(val: string | null | undefined): string {
  if (!val) return '—';
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return val;
  return d.toLocaleDateString('vi-VN');
}

export default function ProjectDetailPage({
  projectId,
  currentUserRoles = ['VT-02'],
  onBack,
  onOpenRisks,
  initialProject,
  initialWbs,
}: ProjectDetailPageProps) {
  // Quyền đọc: VT-01, VT-02, VT-03 (NCL-05-CN-002)
  const isAllowedToView =
    currentUserRoles.includes('VT-01') ||
    currentUserRoles.includes('VT-02') ||
    currentUserRoles.includes('VT-03');

  const [project, setProject] = useState<ProjectRes | null>(initialProject ?? null);
  const [wbs, setWbs] = useState<WorkBreakdownRes[]>(initialWbs ?? []);
  const [loading, setLoading] = useState(!initialProject || !initialWbs);
  const [error, setError] = useState<string | null>(null);

  // Trạng thái modal thêm hạng mục
  const [isWpModalOpen, setIsWpModalOpen] = useState(false);
  const [wpParent, setWpParent] = useState<{ id: number | null; name: string | null }>({
    id: null,
    name: null,
  });

  // Trạng thái modal thêm công việc
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [taskTargetWp, setTaskTargetWp] = useState<{ id: number; name: string }>({
    id: 0,
    name: '',
  });
  const [taskParent, setTaskParent] = useState<{ id: number | null; name: string | null }>({
    id: null,
    name: null,
  });

  // Thông báo toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Trạng thái đang gọi API đóng dự án (NCL-05-CN-006)
  const [closing, setClosing] = useState(false);

  const isProjectOpen = project?.status === 'RUNNING';
  // Quyền tạo / sửa / xóa: chỉ Quản lý dự án (VT-02) và dự án phải đang mở (RUNNING)
  const canEdit = currentUserRoles.includes('VT-02') && isProjectOpen;
  // Quyền đóng dự án (NCL-05-CN-006): chỉ Quản lý dự án và dự án phải đang RUNNING
  const canClose = currentUserRoles.includes('VT-02') && isProjectOpen;

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const loadData = useCallback(async () => {
    if (!isAllowedToView) return;
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
        setError(err.message || 'Không thể tải dữ liệu dự án.');
      } else if (err instanceof Error) {
        setError(err.message || 'Không thể tải dữ liệu dự án.');
      } else {
        setError('Không thể tải dữ liệu dự án. Vui lòng thử lại.');
      }
    } finally {
      setLoading(false);
    }
  }, [projectId, isAllowedToView]);

  useEffect(() => {
    if (!initialProject || !initialWbs) {
      void loadData();
    }
  }, [loadData, initialProject, initialWbs]);

  // Mở modal thêm hạng mục gốc
  const handleOpenAddRootPackage = () => {
    setWpParent({ id: null, name: null });
    setIsWpModalOpen(true);
  };

  // Mở modal thêm hạng mục con
  const handleOpenAddSubPackage = (parent: WorkBreakdownRes) => {
    setWpParent({ id: parent.id, name: parent.name });
    setIsWpModalOpen(true);
  };

  // Mở modal thêm công việc mới
  const handleOpenAddTask = (wp: WorkBreakdownRes, parentTask?: TaskRes | null) => {
    setTaskTargetWp({ id: wp.id, name: wp.name });
    setTaskParent({
      id: parentTask ? parentTask.id : null,
      name: parentTask ? parentTask.name : null,
    });
    setIsTaskModalOpen(true);
  };

  // Xóa hạng mục
  const handleDeletePackage = async (wp: WorkBreakdownRes) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa hạng mục "${wp.name}" không?`)) {
      return;
    }
    try {
      await deleteWorkPackage(projectId, wp.id);
      showToast('Đã xóa hạng mục thành công');
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
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể đóng dự án.';
      showToast(msg, 'error');
    } finally {
      setClosing(false);
    }
  };

  if (!isAllowedToView) {
    return (
      <div className="user-management-page" data-testid="project-detail-forbidden">
        <div className="alert-box alert-box--danger" role="alert">
          Bạn không có quyền xem thông tin dự án này (yêu cầu vai trò Ban giám đốc VT-01, Quản lý dự án VT-02 hoặc Nhân viên chuyên môn VT-03).
        </div>
        {onBack && (
          <button type="button" className="btn btn-secondary" onClick={onBack} style={{ marginTop: '16px' }}>
            {ICONS.arrowLeft} Quay lại
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="user-management-page" data-testid="project-detail-page">
      {/* Toast thông báo */}
      {toast && (
        <div
          className={`alert-box alert-box--${toast.type === 'success' ? 'success' : 'danger'}`}
          role="alert"
          style={{ marginBottom: '16px' }}
          data-testid="project-toast"
        >
          {toast.message}
        </div>
      )}

      {/* Header chi tiết dự án */}
      <div className="page-header" style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {onBack && (
            <button
              type="button"
              className="btn btn-secondary btn-sm btn-back"
              onClick={onBack}
              data-testid="btn-back-project"
            >
              {ICONS.arrowLeft} Quay lại
            </button>
          )}
          <div>
            <div className="page-header__kicker">
              <span className="page-header__tag">{ICONS.folder} DỰ ÁN</span>
              <span className="page-header__dot" />
              <span className="page-header__meta">{project?.projectCode || `Mã: ${projectId}`}</span>
            </div>
            <h1 className="page-title" style={{ margin: '4px 0' }}>
              {project?.name || 'Chi tiết dự án'}
            </h1>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={loadData}
            disabled={loading}
            data-testid="btn-reload-wbs"
          >
            {ICONS.refresh} Tải lại
          </button>
          {canEdit && (
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={handleOpenAddRootPackage}
              data-testid="btn-add-root-package"
            >
              + Thêm hạng mục gốc
            </button>
          )}
          {onOpenRisks && currentUserRoles.includes('VT-02') && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => onOpenRisks(projectId)}
              data-testid="btn-open-risks"
            >
              {ICONS.alertTriangle} Rủi ro dự án
            </button>
          )}
          {canClose && (
            <button
              type="button"
              className="btn btn-danger btn-sm"
              onClick={handleCloseProject}
              disabled={closing}
              data-testid="btn-close-project"
            >
              {closing ? 'Đang đóng…' : 'Đóng dự án'}
            </button>
          )}
        </div>
      </div>

      {loading && (
        <div className="alert-box" role="status" style={{ marginBottom: '16px' }} data-testid="project-loading">
          Đang tải thông tin dự án & WBS…
        </div>
      )}

      {/* Thẻ thông tin tổng quan dự án */}
      {project && (
        <div className="project-preview-card" style={{ marginBottom: '20px' }}>
          <div className="project-preview-grid">
            <div className="project-preview-item">
              <span className="field-hint">Trạng thái:</span>
              <strong style={{ color: isProjectOpen ? '#15803D' : '#64748B' }}>
                {project.status === 'RUNNING' ? 'RUNNING (Đang thực hiện)' : project.status}
              </strong>
            </div>
            <div className="project-preview-item">
              <span className="field-hint">Loại dự án / Hợp đồng:</span>
              <strong>{project.projectType || '—'}</strong>
            </div>
            <div className="project-preview-item">
              <span className="field-hint">Hạn mức ngân sách:</span>
              <strong>{formatAmount(project.limitValue)}</strong>
            </div>
            <div className="project-preview-item">
              <span className="field-hint">Thời gian:</span>
              <strong>
                {formatDate(project.startDate)} ➔ {formatDate(project.expectedEndDate)}
              </strong>
            </div>
          </div>
        </div>
      )}

      {/* Cảnh báo khi dự án đã đóng */}
      {project && !isProjectOpen && (
        <div className="alert-box alert-box--warning" role="alert" data-testid="project-closed-alert" style={{ marginBottom: '16px' }}>
          Dự án đã đóng hoặc tạm dừng (trạng thái: {project.status}). Không thể tạo mới, chỉnh sửa hay xóa hạng mục và công việc.
        </div>
      )}

      {/* Lỗi tải dữ liệu */}
      {error && (
        <div className="alert-box alert-box--danger" role="alert" data-testid="project-load-error" style={{ marginBottom: '16px' }}>
          {error}
        </div>
      )}

      {/* Cây phân rã công việc WBS */}
      <div className="user-table-card" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#1E293B' }}>
            Cơ cấu hạng mục & công việc (WBS)
          </h3>
          <span className="field-hint" style={{ fontSize: '13px' }}>
            {wbs.length} hạng mục gốc
          </span>
        </div>

        {loading ? (
          <div className="table-loading-state" data-testid="wbs-loading">
            <span className="spinner-lg" />
            <p style={{ marginTop: '10px' }}>Đang nạp cơ cấu công việc...</p>
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
      </div>

      {/* Mốc tiến độ dự án (NCL-05-CN-008) */}
      {!loading && (
        <ProjectMilestoneTimeline
          projectId={projectId}
          wbs={wbs}
          canEdit={canEdit}
          isProjectOpen={isProjectOpen}
          onNotify={showToast}
        />
      )}

      {/* Modal thêm hạng mục */}
      <WorkPackageModal
        isOpen={isWpModalOpen}
        onClose={() => setIsWpModalOpen(false)}
        projectId={projectId}
        parentId={wpParent.id}
        parentName={wpParent.name}
        onSaved={(newWp) => {
          showToast(`Đã thêm hạng mục "${newWp.name}" thành công`);
          void loadData();
        }}
      />

      {/* Modal thêm công việc */}
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
          void loadData();
        }}
      />
    </div>
  );
}
