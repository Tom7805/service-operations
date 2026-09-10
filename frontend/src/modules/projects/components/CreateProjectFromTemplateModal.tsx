import { useCallback, useEffect, useMemo, useState } from 'react';
import { ICONS } from '../../../components/common/icons';
import type {
  ContractTargetForProject,
  ProjectCreateFromTemplateReq,
  ProjectRes,
  ProjectTemplateRes,
  WorkBreakdownRes,
} from '../types/projectTypes';
import {
  createProjectFromTemplate,
  deleteWorkPackage,
  fetchProjectTemplates,
  getWorkBreakdown,
  ProjectsApiError,
} from '../api/projectsApi';
import { validateProjectCreateFromTemplateForm } from '../validators/projectValidators';
import WorkBreakdownTree from './WorkBreakdownTree';

export interface CreateProjectFromTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  contract: ContractTargetForProject;
  currentUserRoles?: string[];
  currentUserId?: number;
  onCreated?: (project: ProjectRes) => void;
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

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function CreateProjectFromTemplateModal({
  isOpen,
  onClose,
  contract,
  currentUserRoles = ['VT-02'],
  currentUserId = 7,
  onCreated,
}: CreateProjectFromTemplateModalProps) {
  const isPM = currentUserRoles.includes('VT-02');
  const isContractActive = (contract.status || '').toUpperCase() === 'ACTIVE';

  // Danh sách mẫu dự án
  const [templates, setTemplates] = useState<ProjectTemplateRes[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [templateError, setTemplateError] = useState<string | null>(null);

  // Dữ liệu form
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | ''>('');
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState(todayIso());
  const [expectedEndDate, setExpectedEndDate] = useState('');
  const [projectManagerId, setProjectManagerId] = useState<number | ''>(currentUserId || 7);

  // Trạng thái xử lý form
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sau khi tạo thành công (bước xem WBS & xóa hạng mục - TC-02)
  const [createdProject, setCreatedProject] = useState<ProjectRes | null>(null);
  const [wbs, setWbs] = useState<WorkBreakdownRes[]>([]);
  const [loadingWbs, setLoadingWbs] = useState(false);
  const [wbsToast, setWbsToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Mẫu đang được chọn
  const selectedTemplate = useMemo(() => {
    if (!selectedTemplateId) return null;
    return templates.find((t) => t.id === Number(selectedTemplateId)) || null;
  }, [selectedTemplateId, templates]);

  // Load danh sách mẫu khi mở modal
  const loadTemplates = useCallback(async () => {
    if (!contract.id || !isPM) return;
    setLoadingTemplates(true);
    setTemplateError(null);
    try {
      const data = await fetchProjectTemplates(contract.id);
      setTemplates(data || []);
      if (data && data.length > 0) {
        setSelectedTemplateId(data[0].id);
      }
    } catch (err: unknown) {
      if (err instanceof ProjectsApiError) {
        setTemplateError(err.message);
      } else if (err instanceof Error) {
        setTemplateError(err.message);
      } else {
        setTemplateError('Không thể tải danh sách mẫu dự án từ máy chủ.');
      }
    } finally {
      setLoadingTemplates(false);
    }
  }, [contract.id, isPM]);

  useEffect(() => {
    if (isOpen) {
      // Reset state
      setCreatedProject(null);
      setWbs([]);
      setWbsToast(null);
      setFieldErrors({});
      setSubmitError(null);
      setName(contract.name ? `Dự án triển khai ${contract.name}` : '');
      setStartDate(contract.startDate || todayIso());
      setExpectedEndDate(contract.endDate || '');
      setProjectManagerId(currentUserId || 7);

      if (isPM && isContractActive) {
        void loadTemplates();
      }
    }
  }, [isOpen, contract, isPM, isContractActive, currentUserId, loadTemplates]);

  // Tải cây WBS của dự án vừa tạo
  const loadCreatedProjectWbs = useCallback(async (projectId: number) => {
    setLoadingWbs(true);
    try {
      const data = await getWorkBreakdown(projectId);
      setWbs(data || []);
    } catch {
      // Bỏ qua lỗi load WBS ngầm
    } finally {
      setLoadingWbs(false);
    }
  }, []);

  if (!isOpen) return null;

  // Gán cho tôi
  const handleAssignToMe = () => {
    setProjectManagerId(currentUserId || 7);
    if (fieldErrors.projectManagerId) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next.projectManagerId;
        return next;
      });
    }
  };

  // Submit form tạo dự án từ mẫu
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isPM || !isContractActive || isSubmitting) return;

    setSubmitError(null);
    const payload: Partial<ProjectCreateFromTemplateReq> = {
      templateId: selectedTemplateId ? Number(selectedTemplateId) : undefined,
      name,
      startDate,
      expectedEndDate,
      projectManagerId: projectManagerId ? Number(projectManagerId) : undefined,
    };

    const validation = validateProjectCreateFromTemplateForm(payload);
    if (!validation.isValid) {
      setFieldErrors(validation.errors);
      return;
    }
    setFieldErrors({});
    setIsSubmitting(true);

    try {
      const project = await createProjectFromTemplate(contract.id, {
        templateId: Number(selectedTemplateId),
        name: name.trim(),
        startDate,
        expectedEndDate,
        projectManagerId: Number(projectManagerId),
      });

      setCreatedProject(project);
      onCreated?.(project);
      // Tải cây WBS vừa dựng từ mẫu
      void loadCreatedProjectWbs(project.id);
    } catch (err: unknown) {
      if (err instanceof ProjectsApiError) {
        setSubmitError(err.message);
      } else if (err instanceof Error) {
        setSubmitError(err.message);
      } else {
        setSubmitError('Đã có lỗi xảy ra khi tạo dự án từ mẫu.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Xóa hạng mục trên dự án (TC-02)
  const handleDeleteWorkPackage = async (wp: WorkBreakdownRes) => {
    if (!createdProject) return;
    if (!window.confirm(`Bạn có chắc chắn muốn xóa hạng mục "${wp.name}" khỏi dự án này? Thao tác này chỉ xóa trên dự án, mẫu dự án gốc vẫn được giữ nguyên.`)) {
      return;
    }

    try {
      await deleteWorkPackage(createdProject.id, wp.id);
      setWbsToast({
        message: `Đã xóa hạng mục "${wp.name}" khỏi dự án. Mẫu dự án gốc vẫn được giữ nguyên không đổi (TC-02).`,
        type: 'success',
      });
      void loadCreatedProjectWbs(createdProject.id);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể xóa hạng mục.';
      setWbsToast({ message: msg, type: 'error' });
    }
  };

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-project-template-modal-title"
      data-testid="create-project-from-template-modal"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-card project-modal-card" style={{ width: 'min(100%, 780px)', maxHeight: '90vh' }}>
        {/* Header modal */}
        <div className="modal-header">
          <div className="modal-header__title-wrap">
            <h3 id="create-project-template-modal-title" className="modal-title">
              <span className="modal-title__icon">{ICONS.folder}</span>
              Tạo dự án từ mẫu công việc (NCL-05-CN-007)
            </h3>
            <p className="field-hint">
              Hợp đồng: <strong>{contract.contractCode}</strong> — {contract.name}
            </p>
          </div>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Đóng">
            {ICONS.close}
          </button>
        </div>

        <div className="modal-body" style={{ overflowY: 'auto' }}>
          {/* Kiểm tra phân quyền TC-03 */}
          {!isPM && (
            <div className="alert-box alert-box--danger" role="alert" data-testid="pm-role-alert">
              <strong>Từ chối truy cập:</strong> Bạn không có quyền thực hiện chức năng này. Chức năng Tạo dự án từ mẫu chỉ dành cho vai trò <strong>Quản lý dự án (VT-02)</strong>.
            </div>
          )}

          {/* Kiểm tra trạng thái hợp đồng ACTIVE */}
          {isPM && !isContractActive && (
            <div className="alert-box alert-box--warning" role="alert" data-testid="contract-inactive-alert">
              <strong>Hợp đồng không còn hiệu lực:</strong> Chỉ cho phép tạo dự án từ hợp đồng đang ở trạng thái <strong>ACTIVE</strong>. Hợp đồng này hiện có trạng thái: <code>{contract.status}</code>.
            </div>
          )}

          {/* BƯỚC 1: FORM TẠO DỰ ÁN TỪ MẪU */}
          {isPM && isContractActive && !createdProject && (
            <>
              {/* Thẻ xem trước kế thừa từ hợp đồng (TC-01) */}
              <div className="project-preview-card" style={{ marginBottom: '20px' }}>
                <div style={{ marginBottom: '8px', fontSize: '13px', fontWeight: 600, color: '#334155' }}>
                  Thông tin kế thừa tự động từ hợp đồng:
                </div>
                <div className="project-preview-grid">
                  <div className="project-preview-item">
                    <span className="field-hint">Khách hàng:</span>
                    <strong>{contract.customerName || (contract.customerId ? `Mã KH: ${contract.customerId}` : '—')}</strong>
                  </div>
                  <div className="project-preview-item">
                    <span className="field-hint">Loại dự án:</span>
                    <strong>{contract.contractType || 'FIXED_PRICE'}</strong>
                  </div>
                  <div className="project-preview-item">
                    <span className="field-hint">Hạn mức ngân sách trần:</span>
                    <strong>{formatAmount(contract.limitValue)}</strong>
                  </div>
                  <div className="project-preview-item">
                    <span className="field-hint">Trạng thái khởi tạo:</span>
                    <strong style={{ color: '#15803D' }}>RUNNING (Đang thực hiện)</strong>
                  </div>
                </div>
              </div>

              {submitError && (
                <div className="alert-box alert-box--danger" role="alert" style={{ marginBottom: '16px' }} data-testid="submit-error">
                  {submitError}
                </div>
              )}

              {templateError && (
                <div className="alert-box alert-box--danger" role="alert" style={{ marginBottom: '16px' }}>
                  {templateError}
                </div>
              )}

              <form onSubmit={handleSubmit} noValidate data-testid="project-template-form">
                {/* 1. Chọn mẫu dự án */}
                <div className="form-group" style={{ marginBottom: '16px' }}>
                  <label htmlFor="select-project-template" className="form-label">
                    Chọn mẫu dự án <span className="field-required">*</span>
                  </label>
                  {loadingTemplates ? (
                    <div className="field-hint">Đang tải danh sách mẫu dự án…</div>
                  ) : (
                    <select
                      id="select-project-template"
                      className={`form-select ${fieldErrors.templateId ? 'form-input--error' : ''}`}
                      value={selectedTemplateId}
                      onChange={(e) => {
                        const val = e.target.value ? Number(e.target.value) : '';
                        setSelectedTemplateId(val);
                        if (fieldErrors.templateId) {
                          setFieldErrors((prev) => {
                            const next = { ...prev };
                            delete next.templateId;
                            return next;
                          });
                        }
                      }}
                      data-testid="template-select"
                    >
                      <option value="">-- Chọn mẫu dự án có sẵn --</option>
                      {templates.map((tpl) => (
                        <option key={tpl.id} value={tpl.id}>
                          {tpl.name} ({tpl.code}) — {tpl.projectType}
                        </option>
                      ))}
                    </select>
                  )}
                  {fieldErrors.templateId && (
                    <span className="field-error" role="alert" data-testid="error-templateId">
                      {fieldErrors.templateId}
                    </span>
                  )}
                  {selectedTemplate && (
                    <div
                      style={{
                        marginTop: '8px',
                        padding: '10px 12px',
                        background: '#F8FAFC',
                        borderRadius: '6px',
                        border: '1px solid #E2E8F0',
                        fontSize: '13px',
                      }}
                      data-testid="template-preview-info"
                    >
                      <div>
                        <strong>Mã mẫu:</strong> <code>{selectedTemplate.code}</code> · <strong>Loại:</strong> {selectedTemplate.projectType}
                      </div>
                      {selectedTemplate.description && (
                        <div style={{ marginTop: '4px', color: '#64748B' }}>
                          {selectedTemplate.description}
                        </div>
                      )}
                      <div style={{ marginTop: '6px', color: '#0369A1', fontSize: '12px' }}>
                        {ICONS.info} Hệ thống sẽ tự động nhân bản toàn bộ cây hạng mục, công việc và ngân sách giờ từ mẫu này sang dự án mới (TC-01).
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. Tên dự án mới */}
                <div className="form-group" style={{ marginBottom: '16px' }}>
                  <label htmlFor="project-name-input" className="form-label">
                    Tên dự án mới <span className="field-required">*</span>
                  </label>
                  <input
                    id="project-name-input"
                    type="text"
                    className={`form-input ${fieldErrors.name ? 'form-input--error' : ''}`}
                    placeholder="Nhập tên dự án (tối đa 255 ký tự)"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (fieldErrors.name) {
                        setFieldErrors((prev) => {
                          const next = { ...prev };
                          delete next.name;
                          return next;
                        });
                      }
                    }}
                    maxLength={255}
                    data-testid="project-name-input"
                  />
                  {fieldErrors.name && (
                    <span className="field-error" role="alert" data-testid="error-name">
                      {fieldErrors.name}
                    </span>
                  )}
                </div>

                {/* 3. Thời gian dự án */}
                <div className="form-grid" style={{ marginBottom: '16px' }}>
                  <div className="form-group">
                    <label htmlFor="project-start-date" className="form-label">
                      Ngày bắt đầu <span className="field-required">*</span>
                    </label>
                    <input
                      id="project-start-date"
                      type="date"
                      className={`form-input ${fieldErrors.startDate ? 'form-input--error' : ''}`}
                      value={startDate}
                      onChange={(e) => {
                        setStartDate(e.target.value);
                        if (fieldErrors.startDate) {
                          setFieldErrors((prev) => {
                            const next = { ...prev };
                            delete next.startDate;
                            return next;
                          });
                        }
                      }}
                      data-testid="start-date-input"
                    />
                    {fieldErrors.startDate && (
                      <span className="field-error" role="alert" data-testid="error-startDate">
                        {fieldErrors.startDate}
                      </span>
                    )}
                  </div>

                  <div className="form-group">
                    <label htmlFor="project-end-date" className="form-label">
                      Ngày kết thúc dự kiến <span className="field-required">*</span>
                    </label>
                    <input
                      id="project-end-date"
                      type="date"
                      className={`form-input ${fieldErrors.expectedEndDate ? 'form-input--error' : ''}`}
                      value={expectedEndDate}
                      onChange={(e) => {
                        setExpectedEndDate(e.target.value);
                        if (fieldErrors.expectedEndDate) {
                          setFieldErrors((prev) => {
                            const next = { ...prev };
                            delete next.expectedEndDate;
                            return next;
                          });
                        }
                      }}
                      data-testid="end-date-input"
                    />
                    {fieldErrors.expectedEndDate && (
                      <span className="field-error" role="alert" data-testid="error-expectedEndDate">
                        {fieldErrors.expectedEndDate}
                      </span>
                    )}
                  </div>
                </div>

                {/* 4. Người quản lý dự án */}
                <div className="form-group" style={{ marginBottom: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label htmlFor="project-pm-id" className="form-label" style={{ margin: 0 }}>
                      Người quản lý dự án (User ID) <span className="field-required">*</span>
                    </label>
                    <button
                      type="button"
                      className="btn btn-secondary btn-xs"
                      onClick={handleAssignToMe}
                      data-testid="btn-assign-to-me"
                    >
                      {ICONS.user} Gán cho tôi
                    </button>
                  </div>
                  <input
                    id="project-pm-id"
                    type="number"
                    min={1}
                    className={`form-input ${fieldErrors.projectManagerId ? 'form-input--error' : ''}`}
                    placeholder="Nhập ID người quản lý dự án (ví dụ: 7)"
                    value={projectManagerId}
                    onChange={(e) => {
                      const val = e.target.value ? Number(e.target.value) : '';
                      setProjectManagerId(val);
                      if (fieldErrors.projectManagerId) {
                        setFieldErrors((prev) => {
                          const next = { ...prev };
                          delete next.projectManagerId;
                          return next;
                        });
                      }
                    }}
                    data-testid="pm-id-input"
                  />
                  {fieldErrors.projectManagerId && (
                    <span className="field-error" role="alert" data-testid="error-projectManagerId">
                      {fieldErrors.projectManagerId}
                    </span>
                  )}
                </div>

                <div className="modal-footer" style={{ padding: '16px 0 0', borderTop: '1px solid #E2E8F0', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                  <button type="button" className="btn btn-secondary" onClick={onClose}>
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={isSubmitting || loadingTemplates}
                    data-testid="submit-create-from-template-btn"
                  >
                    {isSubmitting ? 'Đang khởi tạo…' : 'Tạo dự án từ mẫu'}
                  </button>
                </div>
              </form>
            </>
          )}

          {/* BƯỚC 2: SAU KHI TẠO THÀNH CÔNG — XEM CÂY WBS & XÓA HẠNG MỤC THỬ NGHIỆM (TC-01, TC-02) */}
          {createdProject && (
            <div data-testid="project-created-success-section">
              <div className="alert-box alert-box--success" role="alert" style={{ marginBottom: '16px' }} data-testid="create-success-alert">
                <h4 style={{ margin: '0 0 4px', fontSize: '15px' }}>Khởi tạo dự án từ mẫu thành công!</h4>
                <p style={{ margin: 0, fontSize: '13.5px' }}>
                  Dự án <strong>{createdProject.projectCode}</strong> ({createdProject.name}) đã được tạo với toàn bộ cây hạng mục và công việc kèm ngân sách giờ được nhân bản từ mẫu <strong>{selectedTemplate?.name}</strong>.
                </p>
                <p style={{ margin: '6px 0 0', fontSize: '12.5px', opacity: 0.9 }}>
                  Hệ thống đã tự động ghi nhận nhật ký hành động <code>CREATE_FROM_TEMPLATE</code> vào cơ sở dữ liệu (TC-04).
                </p>
              </div>

              {wbsToast && (
                <div
                  className={`alert-box alert-box--${wbsToast.type === 'success' ? 'success' : 'danger'}`}
                  role="alert"
                  style={{ marginBottom: '14px' }}
                  data-testid="wbs-toast"
                >
                  {wbsToast.message}
                </div>
              )}

              <div style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <h4 style={{ margin: 0, fontSize: '14.5px', color: '#1E293B' }}>
                    Cây cơ cấu công việc (WBS) của dự án mới tạo (TC-01):
                  </h4>
                  <span className="field-hint" style={{ fontSize: '12.5px' }}>
                    {wbs.length} hạng mục gốc
                  </span>
                </div>
                <p style={{ margin: '0 0 12px', fontSize: '13px', color: '#64748B' }}>
                  <strong>Quy tắc độc lập mẫu (TC-02):</strong> Bạn có thể xóa các hạng mục không phù hợp trực tiếp trên dự án này mà không làm ảnh hưởng đến mẫu dự án gốc.
                </p>

                {loadingWbs ? (
                  <div className="field-hint">Đang tải cây WBS của dự án…</div>
                ) : (
                  <div style={{ border: '1px solid #E2E8F0', borderRadius: '8px', background: '#FFFFFF', maxHeight: '350px', overflowY: 'auto' }}>
                    <WorkBreakdownTree
                      projectId={createdProject.id}
                      items={wbs}
                      isProjectOpen={true}
                      canEdit={isPM}
                      onDeletePackage={handleDeleteWorkPackage}
                    />
                  </div>
                )}
              </div>

              <div className="modal-footer" style={{ padding: '16px 0 0', borderTop: '1px solid #E2E8F0', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={onClose}
                  data-testid="btn-finish-template-modal"
                >
                  Hoàn tất & Đóng
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
