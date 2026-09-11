import { useEffect, useState } from 'react';
import { ICONS } from '../../../components/common/icons';
import type { ProjectRiskReq, ProjectRiskRes, RiskLevel } from '../types/projectTypes';
import { createRisk, updateRisk, ProjectsApiError } from '../api/projectsApi';
import { validateRiskForm } from '../validators/projectValidators';

export interface RiskFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: number;
  /** Truyền vào khi sửa rủi ro đã có; để trống/null khi ghi nhận mới. */
  risk?: ProjectRiskRes | null;
  /** Id tài khoản đang đăng nhập — dùng cho nút "Theo dõi bởi tôi". */
  currentUserId?: number;
  onSaved?: (risk: ProjectRiskRes) => void;
}

const RISK_LEVEL_OPTIONS: Array<{ value: RiskLevel; label: string }> = [
  { value: 'LOW', label: 'Thấp' },
  { value: 'MEDIUM', label: 'Trung bình' },
  { value: 'HIGH', label: 'Cao' },
];

export default function RiskFormModal({
  isOpen,
  onClose,
  projectId,
  risk = null,
  currentUserId,
  onSaved,
}: RiskFormModalProps) {
  const isEdit = Boolean(risk);
  const [description, setDescription] = useState('');
  const [impact, setImpact] = useState<RiskLevel | ''>('');
  const [likelihood, setLikelihood] = useState<RiskLevel | ''>('');
  const [mitigation, setMitigation] = useState('');
  const [watcherId, setWatcherId] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setDescription(risk?.description ?? '');
    setImpact(risk?.impact ?? '');
    setLikelihood(risk?.likelihood ?? '');
    setMitigation(risk?.mitigation ?? '');
    setWatcherId(risk ? String(risk.watcherId) : '');
    setErrors({});
    setServerError(null);
  }, [isOpen, risk]);

  if (!isOpen) return null;

  const handleWatchMyself = () => {
    if (currentUserId) {
      setWatcherId(String(currentUserId));
      setErrors((prev) => ({ ...prev, watcherId: '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    const watcherIdNumber = Number(watcherId);
    const payload: ProjectRiskReq = {
      description: description.trim(),
      impact: impact as RiskLevel,
      likelihood: likelihood as RiskLevel,
      mitigation: mitigation.trim() || null,
      watcherId: watcherIdNumber,
    };

    const validation = validateRiskForm(payload);
    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    setSubmitting(true);
    setServerError(null);
    try {
      const res =
        isEdit && risk ? await updateRisk(projectId, risk.id, payload) : await createRisk(projectId, payload);
      onSaved?.(res);
      onClose();
    } catch (err: unknown) {
      if (err instanceof ProjectsApiError) {
        setServerError(err.message);
      } else if (err instanceof Error) {
        setServerError(err.message);
      } else {
        setServerError('Không thể lưu rủi ro. Vui lòng thử lại.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="risk-form-modal-title"
    >
      <div className="modal-card project-modal-card">
        <div className="modal-header">
          <div className="modal-header__title-wrap">
            <h3 id="risk-form-modal-title" className="modal-title">
              <span className="modal-title__icon">{ICONS.alertTriangle}</span>
              {isEdit ? 'Sửa rủi ro' : 'Ghi nhận rủi ro'}
            </h3>
          </div>
          <button type="button" className="modal-close" onClick={onClose} disabled={submitting} aria-label="Đóng">
            {ICONS.close}
          </button>
        </div>

        <div className="modal-body" style={{ overflowY: 'auto' }}>
          {serverError && (
            <div
              className="alert-box alert-box--danger"
              role="alert"
              data-testid="risk-server-error"
              style={{ marginBottom: '14px' }}
            >
              {serverError}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate data-testid="risk-form">
            <div className="form-group" style={{ marginBottom: '14px' }}>
              <label className="form-label" htmlFor="risk-description">
                Mô tả rủi ro <span className="field-required">*</span>
              </label>
              <textarea
                id="risk-description"
                className={`form-input ${errors.description ? 'form-input--error' : ''}`}
                rows={3}
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  setErrors((prev) => ({ ...prev, description: '' }));
                  setServerError(null);
                }}
                placeholder="Mô tả nguy cơ có thể ảnh hưởng đến tiến độ/chất lượng dự án..."
                disabled={submitting}
                autoFocus
              />
              {errors.description && (
                <p
                  className="field-error"
                  data-testid="error-risk-description"
                  style={{ color: '#DC2626', fontSize: '13px', marginTop: '4px' }}
                >
                  {errors.description}
                </p>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
              <div className="form-group">
                <label className="form-label" htmlFor="risk-impact">
                  Mức tác động <span className="field-required">*</span>
                </label>
                <select
                  id="risk-impact"
                  className={`form-select ${errors.impact ? 'form-input--error' : ''}`}
                  value={impact}
                  onChange={(e) => {
                    setImpact(e.target.value as RiskLevel);
                    setErrors((prev) => ({ ...prev, impact: '' }));
                    setServerError(null);
                  }}
                  disabled={submitting}
                >
                  <option value="">-- Chọn mức tác động --</option>
                  {RISK_LEVEL_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                {errors.impact && (
                  <p
                    className="field-error"
                    data-testid="error-risk-impact"
                    style={{ color: '#DC2626', fontSize: '13px', marginTop: '4px' }}
                  >
                    {errors.impact}
                  </p>
                )}
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="risk-likelihood">
                  Khả năng xảy ra <span className="field-required">*</span>
                </label>
                <select
                  id="risk-likelihood"
                  className={`form-select ${errors.likelihood ? 'form-input--error' : ''}`}
                  value={likelihood}
                  onChange={(e) => {
                    setLikelihood(e.target.value as RiskLevel);
                    setErrors((prev) => ({ ...prev, likelihood: '' }));
                    setServerError(null);
                  }}
                  disabled={submitting}
                >
                  <option value="">-- Chọn khả năng xảy ra --</option>
                  {RISK_LEVEL_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                {errors.likelihood && (
                  <p
                    className="field-error"
                    data-testid="error-risk-likelihood"
                    style={{ color: '#DC2626', fontSize: '13px', marginTop: '4px' }}
                  >
                    {errors.likelihood}
                  </p>
                )}
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '14px' }}>
              <label className="form-label" htmlFor="risk-mitigation">
                Biện pháp giảm thiểu
              </label>
              <textarea
                id="risk-mitigation"
                className="form-input"
                rows={2}
                value={mitigation}
                onChange={(e) => setMitigation(e.target.value)}
                placeholder="Kế hoạch hoặc hành động để giảm nguy cơ/tác động..."
                disabled={submitting}
              />
            </div>

            <div className="form-group" style={{ marginBottom: '18px' }}>
              <label className="form-label" htmlFor="risk-watcher-id">
                Người theo dõi (id tài khoản) <span className="field-required">*</span>
              </label>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                <input
                  id="risk-watcher-id"
                  type="number"
                  className={`form-input ${errors.watcherId ? 'form-input--error' : ''}`}
                  value={watcherId}
                  onChange={(e) => {
                    setWatcherId(e.target.value);
                    setErrors((prev) => ({ ...prev, watcherId: '' }));
                    setServerError(null);
                  }}
                  placeholder="Ví dụ: 7"
                  disabled={submitting}
                  style={{ maxWidth: '160px' }}
                />
                {currentUserId != null && (
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={handleWatchMyself}
                    disabled={submitting}
                  >
                    Theo dõi bởi tôi
                  </button>
                )}
              </div>
              <p className="field-hint" style={{ fontSize: '12px', marginTop: '4px' }}>
                Tài khoản theo dõi phải đang hoạt động (backend sẽ từ chối tài khoản đã khóa).
              </p>
              {errors.watcherId && (
                <p
                  className="field-error"
                  data-testid="error-risk-watcher-id"
                  style={{ color: '#DC2626', fontSize: '13px', marginTop: '4px' }}
                >
                  {errors.watcherId}
                </p>
              )}
            </div>

            <div
              className="modal-footer"
              style={{ padding: '16px 0 0', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}
            >
              <button type="button" className="btn btn-secondary" onClick={onClose} disabled={submitting}>
                Hủy bỏ
              </button>
              <button type="submit" className="btn btn-primary" disabled={submitting} data-testid="submit-risk-btn">
                {submitting ? 'Đang lưu…' : isEdit ? 'Lưu thay đổi' : 'Ghi nhận rủi ro'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
