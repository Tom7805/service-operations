import { useCallback, useEffect, useState } from 'react';
import { changeOpportunityStage, createOpportunity, fetchPipeline, OpportunityApiError } from '../api/opportunitiesApi';
import { fetchCustomers } from '../../customers/api/customersApi';
import type { Customer } from '../../customers/types/customerTypes';
import type { Opportunity, OpportunityStage, PipelineStage } from '../types/opportunityTypes';
import { ICONS } from '../../../components/common/icons';

interface PipelineBoardPageProps {
  currentUserRoles?: string[];
  currentUserName?: string;
}

const STAGE_ORDER: OpportunityStage[] = ['NEW', 'CONTACTED', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST'];

function formatAmount(value: number | null): string {
  if (value === null || value === undefined) return '—';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value);
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function PipelineBoardPage({
  currentUserRoles = ['VT-04'],
  currentUserName = 'Người dùng',
}: PipelineBoardPageProps) {
  const isAllowed = currentUserRoles.some((r) => ['VT-04', 'VT-02', 'VT-07'].includes(r));

  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [movingId, setMovingId] = useState<number | null>(null);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createStage, setCreateStage] = useState<OpportunityStage>('NEW');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [formName, setFormName] = useState('');
  const [formCustomerId, setFormCustomerId] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const loadPipeline = useCallback(async () => {
    if (!isAllowed) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchPipeline();
      setStages(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tải dữ liệu pipeline.');
    } finally {
      setLoading(false);
    }
  }, [isAllowed]);

  useEffect(() => {
    loadPipeline();
  }, [loadPipeline]);

  const handleOpenCreate = async (stage: OpportunityStage) => {
    setCreateStage(stage);
    setFormName('');
    setFormCustomerId('');
    setFormAmount('');
    setFormError(null);
    setIsCreateOpen(true);
    try {
      const list = await fetchCustomers();
      setCustomers(list);
    } catch {
      // Bỏ qua — ô chọn khách hàng sẽ trống, người dùng vẫn thấy lỗi khi bấm Lưu nếu chưa chọn được.
    }
  };

  const handleSubmitCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formCustomerId) {
      setFormError('Vui lòng nhập tên cơ hội và chọn khách hàng.');
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      await createOpportunity({
        name: formName.trim(),
        customerId: Number(formCustomerId),
        amount: formAmount ? Number(formAmount) : null,
      });
      setIsCreateOpen(false);
      showToast('Đã tạo cơ hội kinh doanh mới');
      await loadPipeline();
    } catch (err) {
      setFormError(err instanceof OpportunityApiError ? err.message : 'Không thể tạo cơ hội kinh doanh.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleMoveStage = async (opportunity: Opportunity, newStage: OpportunityStage) => {
    if (newStage === opportunity.stage) return;
    setMovingId(opportunity.id);
    try {
      await changeOpportunityStage(opportunity.id, newStage);
      showToast(`Đã chuyển "${opportunity.name}" sang giai đoạn mới`);
      await loadPipeline();
    } catch (err) {
      showToast(err instanceof OpportunityApiError ? err.message : 'Không thể chuyển giai đoạn.', 'error');
    } finally {
      setMovingId(null);
    }
  };

  if (!isAllowed) {
    return (
      <div className="access-denied-container">
        <div className="access-denied-card">
          <div className="access-denied-icon">{ICONS.shieldOff}</div>
          <span className="eyebrow text-danger">Từ chối truy cập (Access Denied)</span>
          <h2>Bạn không có thẩm quyền truy cập màn hình này</h2>
          <p>
            Pipeline cơ hội kinh doanh chỉ dành cho vai trò <strong>Nhân viên kinh doanh (VT-04)</strong> hoặc{' '}
            <strong>Quản lý dự án (VT-02)</strong>.
          </p>
          <div className="security-log-badge">
            <span className="security-log-badge__item">Tài khoản: {currentUserName}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="user-management-page pipeline-page">
      {toastMessage && (
        <div className={`toast-banner toast-banner--${toastMessage.type}`} role="status">
          <span className="toast-banner__icon">{toastMessage.type === 'success' ? ICONS.checkCircle : ICONS.alertTriangle}</span>
          <span>{toastMessage.text}</span>
          <button type="button" className="toast-banner__close" aria-label="Đóng thông báo" onClick={() => setToastMessage(null)}>
            {ICONS.close}
          </button>
        </div>
      )}

      <div className="page-header">
        <div>
          <div className="breadcrumb">
            <span>Hệ thống</span> / <span className="active">Cơ hội kinh doanh</span>
          </div>
          <h1 className="page-title">Pipeline cơ hội kinh doanh</h1>
          <p className="page-subtitle">Theo dõi cơ hội bán hàng theo từng giai đoạn, từ tiếp cận đến chốt hợp đồng.</p>
        </div>
        <div className="page-header-actions">
          <button type="button" className="btn-primary btn-lg" onClick={() => handleOpenCreate('NEW')}>
            <span className="btn-icon">+</span> Thêm cơ hội
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert--error mb-4" role="alert">
          <span className="alert__icon">{ICONS.alertTriangle}</span>
          <span>{error}</span>
          <button type="button" className="btn-link text-white ml-auto" onClick={loadPipeline}>
            Thử lại
          </button>
        </div>
      )}

      {loading ? (
        <div className="table-loading-state">
          <div className="spinner-lg" />
          <p>Đang tải pipeline...</p>
        </div>
      ) : (
        <div className="pipeline-board">
          {STAGE_ORDER.map((stageKey) => {
            const column = stages.find((s) => s.stage === stageKey);
            return (
              <div key={stageKey} className="pipeline-column">
                <div className="pipeline-column__header">
                  <span className={`pipeline-column__dot pipeline-column__dot--${stageKey.toLowerCase()}`} />
                  <span className="pipeline-column__title">{column?.stageLabel ?? stageKey}</span>
                  <span className="pipeline-column__count">{column?.count ?? 0}</span>
                  <button
                    type="button"
                    className="pipeline-column__add"
                    onClick={() => handleOpenCreate(stageKey)}
                    aria-label={`Thêm cơ hội vào ${column?.stageLabel ?? stageKey}`}
                    title="Thêm cơ hội"
                  >
                    {ICONS.plus}
                  </button>
                </div>
                <div className="pipeline-column__total">{formatAmount(column?.totalAmount ?? 0)}</div>

                <div className="pipeline-column__list">
                  {(column?.opportunities.length ?? 0) === 0 ? (
                    <div className="pipeline-column__empty">Chưa có cơ hội nào</div>
                  ) : (
                    column!.opportunities.map((opp) => (
                      <div key={opp.id} className="pipeline-card">
                        <div className="pipeline-card__title">{opp.name}</div>
                        <div className="pipeline-card__customer">{opp.customerName ?? `KH #${opp.customerId}`}</div>
                        <div className="pipeline-card__footer">
                          <span className="pipeline-card__amount">{formatAmount(opp.amount)}</span>
                          {opp.ownerFullName && (
                            <span className="avatar-circle avatar-circle--sm" title={opp.ownerFullName}>
                              {initials(opp.ownerFullName)}
                            </span>
                          )}
                        </div>
                        <select
                          className="pipeline-card__stage-select"
                          value={opp.stage}
                          disabled={movingId === opp.id}
                          onChange={(e) => handleMoveStage(opp, e.target.value as OpportunityStage)}
                          aria-label={`Chuyển giai đoạn cho ${opp.name}`}
                        >
                          {STAGE_ORDER.map((s) => (
                            <option key={s} value={s}>
                              {stages.find((st) => st.stage === s)?.stageLabel ?? s}
                            </option>
                          ))}
                        </select>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {isCreateOpen && (
        <div className="modal-backdrop" onClick={() => setIsCreateOpen(false)} role="dialog">
          <div className="modal-card modal-card--sm" onClick={(e) => e.stopPropagation()}>
            <form onSubmit={handleSubmitCreate}>
              <div className="modal-header">
                <div>
                  <span className="modal-eyebrow">Cơ hội kinh doanh mới</span>
                  <h3 className="modal-title">Thêm cơ hội — {stages.find((s) => s.stage === createStage)?.stageLabel ?? createStage}</h3>
                </div>
                <button type="button" className="modal-close" aria-label="Đóng" onClick={() => setIsCreateOpen(false)}>
                  {ICONS.close}
                </button>
              </div>
              <div className="modal-body">
                {formError && (
                  <div className="alert alert--error mb-4" role="alert">
                    <span className="alert__icon">{ICONS.alertTriangle}</span>
                    <span>{formError}</span>
                  </div>
                )}
                <div className="form-field mb-3">
                  <label className="form-label" htmlFor="opp-name">
                    Tên cơ hội <span className="req">*</span>
                  </label>
                  <input
                    id="opp-name"
                    type="text"
                    className="form-input"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="VD: Triển khai hệ thống ERP cho Công ty ABC"
                    disabled={submitting}
                  />
                </div>
                <div className="form-field mb-3">
                  <label className="form-label" htmlFor="opp-customer">
                    Khách hàng <span className="req">*</span>
                  </label>
                  <select
                    id="opp-customer"
                    className="form-select"
                    value={formCustomerId}
                    onChange={(e) => setFormCustomerId(e.target.value)}
                    disabled={submitting}
                  >
                    <option value="">-- Chọn khách hàng --</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.code})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-field">
                  <label className="form-label" htmlFor="opp-amount">
                    Giá trị dự kiến (VNĐ)
                  </label>
                  <input
                    id="opp-amount"
                    type="number"
                    min={0}
                    className="form-input"
                    value={formAmount}
                    onChange={(e) => setFormAmount(e.target.value)}
                    placeholder="VD: 150000000"
                    disabled={submitting}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setIsCreateOpen(false)} disabled={submitting}>
                  Hủy bỏ
                </button>
                <button type="submit" className="btn-primary" disabled={submitting}>
                  {submitting ? 'Đang lưu...' : 'Tạo cơ hội'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
