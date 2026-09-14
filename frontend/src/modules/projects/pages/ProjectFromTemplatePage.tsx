import { useState } from 'react';
import { ICONS } from '../../../components/common/icons';
import type { ContractTargetForProject, ProjectRes } from '../types/projectTypes';
import CreateProjectFromTemplateModal from '../components/CreateProjectFromTemplateModal';

export interface ProjectFromTemplatePageProps {
  currentUserRoles?: string[];
  currentUserId?: number;
  initialContract?: ContractTargetForProject;
  onBack?: () => void;
}

export default function ProjectFromTemplatePage({
  currentUserRoles = ['VT-02'],
  currentUserId = 7,
  initialContract,
  onBack,
}: ProjectFromTemplatePageProps) {
  const isPM = currentUserRoles.includes('VT-02');

  const [contractIdInput, setContractIdInput] = useState<number | ''>(
    initialContract ? initialContract.id : 1
  );
  const [contractNameInput, setContractNameInput] = useState<string>(
    initialContract ? initialContract.name : 'Hợp đồng triển khai phần mềm chuẩn'
  );
  const [contractCodeInput, setContractCodeInput] = useState<string>(
    initialContract ? initialContract.contractCode : 'HD-2026-001'
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [createdProject, setCreatedProject] = useState<ProjectRes | null>(null);

  if (!isPM) {
    return (
      <div className="access-denied-container" data-testid="project-template-page-denied">
        <div className="access-denied-card">
          <div className="access-denied-icon">{ICONS.shieldOff}</div>
          <h2>Không có quyền truy cập</h2>
          <p>
            Chức năng tạo dự án từ mẫu công việc yêu cầu vai trò <strong>Quản lý dự án (VT-02)</strong>.
            Hệ thống đã ghi lại lần từ chối truy cập này theo tiêu chuẩn kiểm toán.
          </p>
          {onBack && (
            <button type="button" className="btn btn-secondary" onClick={onBack}>
              {ICONS.arrowLeft} Quay lại
            </button>
          )}
        </div>
      </div>
    );
  }

  const activeContractTarget: ContractTargetForProject = {
    id: Number(contractIdInput) || 1,
    contractCode: contractCodeInput,
    name: contractNameInput,
    status: 'ACTIVE',
    contractType: 'FIXED_PRICE',
  };

  return (
    <div className="user-management-page" data-testid="project-from-template-page">
      <div className="page-header" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {onBack && (
            <button type="button" className="btn btn-secondary btn-sm" onClick={onBack}>
              {ICONS.arrowLeft} Quay lại
            </button>
          )}
          <div>
            <div className="page-header__kicker">
              <span className="page-header__tag">{ICONS.folder} DỰ ÁN</span>
              <span className="page-header__dot" />
              <span className="page-header__meta">NCL-05-CN-007</span>
            </div>
            <h1 className="page-title" style={{ margin: '4px 0' }}>
              Tạo dự án từ mẫu công việc
            </h1>
          </div>
        </div>

        <button
          type="button"
          className="btn btn-primary"
          onClick={() => setIsModalOpen(true)}
          data-testid="btn-open-create-template-modal"
        >
          {ICONS.folder} Khởi tạo dự án từ mẫu
        </button>
      </div>

      <div className="user-table-card" style={{ padding: '24px' }}>
        <h3 style={{ margin: '0 0 8px', fontSize: '16px', color: '#1E293B' }}>
          Ngữ cảnh hợp đồng khởi tạo
        </h3>
        <p style={{ margin: '0 0 16px', color: '#64748B', fontSize: '13.5px' }}>
          Chọn hợp đồng đang có hiệu lực (ACTIVE) để nhân bản cấu trúc công việc từ mẫu sang dự án mới.
        </p>

        <div className="form-grid" style={{ maxWidth: '600px', marginBottom: '16px' }}>
          <div className="form-group">
            <label className="form-label">ID Hợp đồng</label>
            <input
              type="number"
              className="form-input"
              value={contractIdInput}
              onChange={(e) => setContractIdInput(e.target.value ? Number(e.target.value) : '')}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Mã hợp đồng</label>
            <input
              type="text"
              className="form-input"
              value={contractCodeInput}
              onChange={(e) => setContractCodeInput(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Tên hợp đồng</label>
            <input
              type="text"
              className="form-input"
              value={contractNameInput}
              onChange={(e) => setContractNameInput(e.target.value)}
            />
          </div>
        </div>

        {createdProject && (
          <div className="alert-box alert-box--success" role="alert" style={{ marginTop: '20px' }}>
            Dự án mới tạo: <strong>{createdProject.projectCode}</strong> — {createdProject.name} (Trạng thái: {createdProject.status})
          </div>
        )}
      </div>

      {isModalOpen && (
        <CreateProjectFromTemplateModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          contract={activeContractTarget}
          currentUserRoles={currentUserRoles}
          currentUserId={currentUserId}
          onCreated={(proj) => setCreatedProject(proj)}
        />
      )}
    </div>
  );
}
