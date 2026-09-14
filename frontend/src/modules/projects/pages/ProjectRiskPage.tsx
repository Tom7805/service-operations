import { useCallback, useEffect, useState } from 'react';
import { ICONS } from '../../../components/common/icons';
import type { ProjectRes, ProjectRiskRes, RiskLevel, RiskStatus } from '../types/projectTypes';
import { changeRiskStatus, deleteRisk, getProject, getRisks, ProjectsApiError } from '../api/projectsApi';
import RiskFormModal from '../components/RiskFormModal';

export interface ProjectRiskPageProps {
  projectId: number;
  currentUserRoles?: string[];
  currentUserId?: number;
  onBack?: () => void;
  initialProject?: ProjectRes;
  initialRisks?: ProjectRiskRes[];
}

const RISK_LEVEL_LABEL: Record<RiskLevel, string> = {
  LOW: 'Thấp',
  MEDIUM: 'Trung bình',
  HIGH: 'Cao',
};

const SEVERITY_BADGE_CLASS: Record<RiskLevel, string> = {
  LOW: 'badge--green',
  MEDIUM: 'badge--gold',
  HIGH: 'badge--pink',
};

const RISK_STATUS_LABEL: Record<RiskStatus, string> = {
  OPEN: 'Chưa xử lý',
  MITIGATING: 'Đang giảm thiểu',
  CLOSED: 'Đã đóng',
};

const RISK_STATUS_PILL_CLASS: Record<RiskStatus, string> = {
  OPEN: 'status-pill--locked',
  MITIGATING: 'status-pill--inactive',
  CLOSED: 'status-pill--active',
};

const RISK_STATUS_OPTIONS: RiskStatus[] = ['OPEN', 'MITIGATING', 'CLOSED'];

function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString('vi-VN');
}

export default function ProjectRiskPage({
  projectId,
  currentUserRoles = ['VT-02'],
  currentUserId,
  onBack,
  initialProject,
  initialRisks,
}: ProjectRiskPageProps) {
  // Toàn bộ endpoint (kể cả xem) chỉ dành cho Quản lý dự án (VT-02) — khác với
  // WBS/mốc tiến độ, backend không mở quyền xem cho VT-01/VT-03 (NCL-05-CN-009).
  const canView = currentUserRoles.includes('VT-02');

  const [project, setProject] = useState<ProjectRes | null>(initialProject ?? null);
  const [risks, setRisks] = useState<ProjectRiskRes[]>(initialRisks ?? []);
  const [loading, setLoading] = useState(!initialProject || !initialRisks);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRisk, setEditingRisk] = useState<ProjectRiskRes | null>(null);
  const [statusUpdatingId, setStatusUpdatingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const isProjectOpen = project?.status === 'RUNNING';
  // Tạo/sửa/đổi trạng thái/xóa: chỉ Quản lý dự án và dự án phải đang RUNNING.
  const canEdit = canView && isProjectOpen;

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const loadData = useCallback(async () => {
    if (!canView) return;
    setLoading(true);
    setError(null);
    try {
      const [projData, riskData] = await Promise.all([getProject(projectId), getRisks(projectId)]);
      setProject(projData);
      setRisks(riskData);
    } catch (err: unknown) {
      const msg =
        err instanceof ProjectsApiError || err instanceof Error
          ? err.message
          : 'Không thể tải dữ liệu rủi ro dự án.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [projectId, canView]);

  useEffect(() => {
    if (!initialProject || !initialRisks) {
      void loadData();
    }
  }, [loadData, initialProject, initialRisks]);

  const openCreateForm = () => {
    setEditingRisk(null);
    setIsFormOpen(true);
  };

  const openEditForm = (risk: ProjectRiskRes) => {
    setEditingRisk(risk);
    setIsFormOpen(true);
  };

  const handleStatusChange = async (risk: ProjectRiskRes, status: RiskStatus) => {
    if (status === risk.status) return;
    setStatusUpdatingId(risk.id);
    try {
      const updated = await changeRiskStatus(projectId, risk.id, { status });
      setRisks((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
      showToast(`Đã chuyển trạng thái rủi ro sang "${RISK_STATUS_LABEL[status]}"`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể cập nhật trạng thái rủi ro.';
      showToast(msg, 'error');
    } finally {
      setStatusUpdatingId(null);
    }
  };

  const handleDelete = async (risk: ProjectRiskRes) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa rủi ro "${risk.description}" không?`)) {
      return;
    }
    setDeletingId(risk.id);
    try {
      await deleteRisk(projectId, risk.id);
      showToast('Đã xóa rủi ro thành công');
      void loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể xóa rủi ro.';
      showToast(msg, 'error');
    } finally {
      setDeletingId(null);
    }
  };

  if (!canView) {
    return (
      <div className="user-management-page" data-testid="project-risk-forbidden">
        <div className="alert-box alert-box--danger" role="alert">
          Bạn không có quyền xem rủi ro của dự án này (yêu cầu vai trò Quản lý dự án VT-02).
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
    <div className="user-management-page" data-testid="project-risk-page">
      {toast && (
        <div
          className={`alert-box alert-box--${toast.type === 'success' ? 'success' : 'danger'}`}
          role="alert"
          style={{ marginBottom: '16px' }}
          data-testid="risk-toast"
        >
          {toast.message}
        </div>
      )}

      <div className="page-header" style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {onBack && (
            <button
              type="button"
              className="btn btn-secondary btn-sm btn-back"
              onClick={onBack}
              data-testid="btn-back-risk"
            >
              {ICONS.arrowLeft} Quay lại
            </button>
          )}
          <div>
            <div className="page-header__kicker">
              <span className="page-header__tag">{ICONS.alertTriangle} RỦI RO DỰ ÁN</span>
              <span className="page-header__dot" />
              <span className="page-header__meta">{project?.projectCode || `Mã: ${projectId}`}</span>
            </div>
            <h1 className="page-title" style={{ margin: '4px 0' }}>
              {project?.name || 'Rủi ro dự án'}
            </h1>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={loadData}
            disabled={loading}
            data-testid="btn-reload-risks"
          >
            {ICONS.refresh} Tải lại
          </button>
          {canEdit && (
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={openCreateForm}
              data-testid="btn-add-risk"
            >
              + Ghi nhận rủi ro
            </button>
          )}
        </div>
      </div>

      {loading && (
        <div className="alert-box" role="status" style={{ marginBottom: '16px' }} data-testid="risk-loading">
          Đang tải danh sách rủi ro dự án…
        </div>
      )}

      {project && !isProjectOpen && (
        <div
          className="alert-box alert-box--warning"
          role="alert"
          data-testid="risk-project-closed-alert"
          style={{ marginBottom: '16px' }}
        >
          Dự án đã đóng hoặc tạm dừng (trạng thái: {project.status}). Không thể ghi nhận, sửa, đổi trạng
          thái hay xóa rủi ro của dự án này nữa.
        </div>
      )}

      {error && (
        <div className="alert-box alert-box--danger" role="alert" data-testid="risk-load-error" style={{ marginBottom: '16px' }}>
          {error}
        </div>
      )}

      <div className="user-table-card" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#1E293B' }}>
            Bảng theo dõi rủi ro
          </h3>
          <span className="field-hint" style={{ fontSize: '13px' }}>
            {risks.length} rủi ro — sắp theo điểm rủi ro giảm dần
          </span>
        </div>

        {loading ? (
          <div className="table-loading-state" data-testid="risk-table-loading">
            <span className="spinner-lg" />
            <p style={{ marginTop: '10px' }}>Đang nạp danh sách rủi ro...</p>
          </div>
        ) : risks.length === 0 ? (
          <div className="table-empty-state" data-testid="risk-empty">
            <div className="table-empty-state__icon">{ICONS.alertTriangle}</div>
            <h4 style={{ margin: '0 0 6px', fontSize: '15px', color: '#1E293B' }}>Chưa có rủi ro nào</h4>
            <p style={{ margin: 0, color: '#64748B', fontSize: '13.5px' }}>
              {canEdit
                ? 'Hãy bấm nút "+ Ghi nhận rủi ro" ở trên để bắt đầu theo dõi rủi ro dự án.'
                : 'Dự án này chưa ghi nhận rủi ro nào.'}
            </p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="user-data-table">
              <thead>
                <tr>
                  <th>Mô tả</th>
                  <th style={{ width: '110px' }}>Tác động</th>
                  <th style={{ width: '120px' }}>Khả năng</th>
                  <th style={{ width: '130px' }}>Điểm / Mức độ</th>
                  <th style={{ width: '170px' }}>Trạng thái</th>
                  <th style={{ width: '160px' }}>Người theo dõi</th>
                  {canView && <th style={{ width: '150px' }}></th>}
                </tr>
              </thead>
              <tbody>
                {risks.map((risk) => (
                  <tr key={risk.id} data-testid={`risk-row-${risk.id}`}>
                    <td>
                      <strong>{risk.description}</strong>
                      {risk.mitigation && (
                        <div className="field-hint" style={{ marginTop: '2px' }}>
                          Giảm thiểu: {risk.mitigation}
                        </div>
                      )}
                      <div className="field-hint" style={{ marginTop: '2px', fontSize: '11.5px' }}>
                        Tạo lúc {formatDateTime(risk.createdAt)}
                        {risk.createdBy ? ` bởi ${risk.createdBy}` : ''}
                      </div>
                    </td>
                    <td>{RISK_LEVEL_LABEL[risk.impact]}</td>
                    <td>{RISK_LEVEL_LABEL[risk.likelihood]}</td>
                    <td>
                      <span className={`badge ${SEVERITY_BADGE_CLASS[risk.severity]}`} data-testid={`risk-severity-${risk.id}`}>
                        {risk.score} · {RISK_LEVEL_LABEL[risk.severity]}
                      </span>
                    </td>
                    <td>
                      {canEdit ? (
                        <select
                          className="form-select"
                          value={risk.status}
                          onChange={(e) => void handleStatusChange(risk, e.target.value as RiskStatus)}
                          disabled={statusUpdatingId === risk.id}
                          data-testid={`risk-status-select-${risk.id}`}
                          aria-label={`Trạng thái rủi ro ${risk.description}`}
                        >
                          {RISK_STATUS_OPTIONS.map((s) => (
                            <option key={s} value={s}>
                              {RISK_STATUS_LABEL[s]}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className={`status-pill ${RISK_STATUS_PILL_CLASS[risk.status]}`} data-testid={`risk-status-${risk.id}`}>
                          <i className="status-pill__dot" />
                          {RISK_STATUS_LABEL[risk.status]}
                        </span>
                      )}
                    </td>
                    <td>{risk.watcherName ?? `#${risk.watcherId}`}</td>
                    {canView && (
                      <td>
                        {isProjectOpen && (
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                            <button
                              type="button"
                              className="btn btn-secondary btn-xs"
                              onClick={() => openEditForm(risk)}
                              data-testid={`btn-edit-risk-${risk.id}`}
                            >
                              Sửa
                            </button>
                            <button
                              type="button"
                              className="btn btn-danger btn-xs"
                              onClick={() => void handleDelete(risk)}
                              disabled={deletingId === risk.id}
                              data-testid={`btn-delete-risk-${risk.id}`}
                            >
                              Xóa
                            </button>
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <RiskFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        projectId={projectId}
        risk={editingRisk}
        currentUserId={currentUserId}
        onSaved={() => {
          showToast(editingRisk ? 'Đã cập nhật rủi ro thành công' : 'Đã ghi nhận rủi ro thành công');
          void loadData();
        }}
      />
    </div>
  );
}
