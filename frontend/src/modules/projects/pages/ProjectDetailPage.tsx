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
import WorkBreakdownTree from '../components/WorkBreakdownTree';
import WorkPackageModal from '../components/WorkPackageModal';
import TaskFormModal from '../components/TaskFormModal';
import TaskBudgetModal from '../components/TaskBudgetModal';
import ProjectMilestoneTimeline from '../components/ProjectMilestoneTimeline';
import PageHeader from '../../../components/common/PageHeader';
import RowActionsMenu from '../../../components/common/RowActionsMenu';
import { CONTRACT_TYPE_LABEL } from '../../contracts/types/contractTypes';

export interface ProjectDetailPageProps {
  projectId: number;
  currentUserRoles?: string[];
  currentUserName?: string;
  onBack?: () => void;
  /** NCL-05-CN-009: điều hướng sang trang rủi ro dự án (ProjectRiskPage) — do màn cha quyết định. */
  onOpenRisks?: (projectId: number) => void;
  /** NCL-06-CN-001: điều hướng sang màn ghi giờ công (TimeEntryPage) cho một công việc — do màn cha quyết định. */
  onLogTime?: (projectId: number, taskId: number, taskName: string) => void;
  /** Lối tắt sang Nghiệm thu / Lợi nhuận với dự án này đã chọn sẵn — màn cha quyết định có hay không. */
  onOpenAcceptance?: () => void;
  onOpenProfit?: () => void;
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
  onLogTime,
  onOpenAcceptance,
  onOpenProfit,
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

  // Trạng thái modal đặt ngân sách giờ công (NCL-05-CN-005)
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
  const [budgetTarget, setBudgetTarget] = useState<{ id: number; name: string; budgetHours: number | null }>({
    id: 0,
    name: '',
    budgetHours: null,
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
  // Quyền ghi giờ công (NCL-06-CN-001): chỉ Nhân viên chuyên môn và dự án phải đang RUNNING
  // (việc có đúng là người được giao công việc hay không do backend kiểm ở TimeEntryPage).
  const canLogTime = currentUserRoles.includes('VT-03') && isProjectOpen;

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
      setProject((prev) => ({
        ...projData,
        customerName: projData.customerName ?? prev?.customerName ?? initialProject?.customerName,
        projectManagerName: projData.projectManagerName ?? prev?.projectManagerName ?? initialProject?.projectManagerName,
      }));
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
  }, [projectId, isAllowedToView, initialProject]);

  useEffect(() => {
    if (!initialProject || !initialWbs) {
      void loadData();
    }
    // Chỉ nạp khi mở trang; initialProject chỉ là tên hiển thị tạm, không phải lý do nạp lại.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

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

  // Mở modal đặt/đổi ngân sách giờ công
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
    void loadData();
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
          Bạn không có quyền xem thông tin dự án này.
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

      {/* Đầu trang: một hành động chính (thêm hạng mục), tải lại dạng icon, đóng dự án trong menu ⋮ —
          hành động không hoàn tác được không đứng cạnh nút hay dùng. */}
      <PageHeader
        back={onBack ? { label: 'Dự án', onClick: onBack, testId: 'btn-back-project' } : undefined}
        title={project?.name || 'Chi tiết dự án'}
        meta={<span className="page-header__code">{project?.projectCode || `#${projectId}`}</span>}
        actions={
          <>
            <button
              type="button"
              className="btn-icon-refresh"
              onClick={loadData}
              disabled={loading}
              title="Tải lại"
              aria-label="Tải lại dự án"
              data-testid="btn-reload-wbs"
            >
              {ICONS.refresh}
            </button>
            {canClose && (
              <RowActionsMenu
                ariaLabel="Thao tác khác với dự án"
                actions={[
                  {
                    key: 'close',
                    label: closing ? 'Đang đóng…' : 'Đóng dự án',
                    icon: ICONS.lock,
                    tone: 'danger',
                    disabled: closing,
                    onClick: () => void handleCloseProject(),
                    testId: 'btn-close-project',
                  },
                ]}
              />
            )}
            {canEdit && (
              <button
                type="button"
                className="btn-primary"
                onClick={handleOpenAddRootPackage}
                data-testid="btn-add-root-package"
              >
                {ICONS.plus} Thêm hạng mục
              </button>
            )}
          </>
        }
      />

      {loading && !project && (
        <div className="page-loading" aria-busy="true" data-testid="project-loading" style={{ minHeight: 120 }} />
      )}

      {/* Tổng quan: các thông tin để nhận ra dự án + lối tắt sang các việc theo dự án */}
      {project && (
        <section className="project-overview" aria-label="Tổng quan dự án">
          <dl className="project-overview__grid">
            <div>
              <dt>Trạng thái</dt>
              <dd>
                {isProjectOpen ? (
                  <span className="list-status list-status--on">Đang thực hiện</span>
                ) : (
                  <span className="list-status list-status--off">Đã đóng</span>
                )}
              </dd>
            </div>
            <div>
              <dt>Khách hàng</dt>
              <dd>{project.customerName || '—'}</dd>
            </div>
            <div>
              <dt>Quản lý dự án</dt>
              <dd>{project.projectManagerName || '—'}</dd>
            </div>
            <div>
              <dt>Thời gian</dt>
              <dd>
                {formatDate(project.startDate)} → {formatDate(project.expectedEndDate)}
              </dd>
            </div>
            <div>
              <dt>Loại hợp đồng</dt>
              <dd>{(CONTRACT_TYPE_LABEL as Record<string, string>)[project.projectType] ?? (project.projectType || '—')}</dd>
            </div>
            <div>
              <dt>Hạn mức ngân sách</dt>
              <dd>{formatAmount(project.limitValue)}</dd>
            </div>
          </dl>
          {(onOpenAcceptance || onOpenProfit || (onOpenRisks && currentUserRoles.includes('VT-02'))) && (
            <nav className="project-overview__links" aria-label="Việc theo dự án">
              {onOpenAcceptance && (
                <button type="button" className="project-link" onClick={onOpenAcceptance}>
                  {ICONS.check} Nghiệm thu <span aria-hidden="true">{ICONS.arrowRight}</span>
                </button>
              )}
              {onOpenProfit && (
                <button type="button" className="project-link" onClick={onOpenProfit}>
                  {ICONS.percent} Lợi nhuận <span aria-hidden="true">{ICONS.arrowRight}</span>
                </button>
              )}
              {onOpenRisks && currentUserRoles.includes('VT-02') && (
                <button type="button" className="project-link" onClick={() => onOpenRisks(projectId)} data-testid="btn-open-risks">
                  {ICONS.alertTriangle} Rủi ro <span aria-hidden="true">{ICONS.arrowRight}</span>
                </button>
              )}
            </nav>
          )}
        </section>
      )}

      {/* Cảnh báo khi dự án đã đóng */}
      {project && !isProjectOpen && (
        <div className="alert-box alert-box--warning" role="alert" data-testid="project-closed-alert" style={{ marginBottom: '16px' }}>
          Dự án đã đóng — chỉ xem, không thêm hay sửa hạng mục và công việc.
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
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: 'var(--ink-strong)' }}>
            Hạng mục & công việc
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
            canLogTime={canLogTime}
            onAddSubPackage={handleOpenAddSubPackage}
            onAddTask={handleOpenAddTask}
            onDeletePackage={handleDeletePackage}
            onSetBudget={handleOpenSetBudget}
            onLogTime={onLogTime ? (task) => onLogTime(projectId, task.id, task.name) : undefined}
          />
        )}
      </div>

      {/* Mốc tiến độ dự án (NCL-05-CN-008) */}
      {/* Mốc tiến độ: backend chỉ mở cho Quản lý dự án — vai trò khác gọi sẽ bị 403 và ghi nhật ký từ chối. */}
      {!loading && currentUserRoles.includes('VT-02') && (
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

      {/* Modal đặt ngân sách giờ công (NCL-05-CN-005) */}
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
