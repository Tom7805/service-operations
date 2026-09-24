import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { ICONS } from '../../../components/common/icons';
import ModalPortal from '../../../components/common/ModalPortal';
import { useBackdropClick } from '../../../hooks/useBackdropClick';
import { AcceptanceApiError, createDeliverable } from '../api/acceptanceApi';
import {
  DELIVERABLE_TYPE_LABEL,
  type DeliverableRes,
  type DeliverableType,
} from '../types/acceptanceTypes';
import type { FlatWorkPackage } from '../utils/workPackageTree';
import {
  DELIVERABLE_DESCRIPTION_MAX_LENGTH,
  DELIVERABLE_NAME_MAX_LENGTH,
  validateDeliverableForm,
  type DeliverableFormErrors,
} from '../validators/acceptanceValidators';

interface Props {
  isOpen: boolean;
  projectId: number;
  projectLabel: string;
  workPackages: FlatWorkPackage[];
  /** Sản phẩm đã có của dự án — để báo trùng tên trong cùng hạng mục ngay khi nhập. */
  existing: DeliverableRes[];
  initialWorkPackageId?: number | null;
  onClose: () => void;
  onCreated: (deliverable: DeliverableRes) => void;
}

/** NCL-12-CN-004 — Khai báo một sản phẩm bàn giao cho hạng mục của dự án (Quản lý dự án, VT-02). */
export default function DeliverableFormModal({
  isOpen,
  projectId,
  projectLabel,
  workPackages,
  existing,
  initialWorkPackageId = null,
  onClose,
  onCreated,
}: Props) {
  const [workPackageId, setWorkPackageId] = useState<number | null>(initialWorkPackageId);
  const [name, setName] = useState('');
  const [deliverableType, setDeliverableType] = useState<DeliverableType | ''>('');
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState<DeliverableFormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const backdrop = useBackdropClick(onClose, submitting);

  useEffect(() => {
    if (!isOpen) return;
    setWorkPackageId(initialWorkPackageId);
    setName('');
    setDeliverableType('');
    setDescription('');
    setErrors({});
    setSaveError(null);
  }, [isOpen, initialWorkPackageId]);

  if (!isOpen) return null;

  const clear = (field: keyof DeliverableFormErrors) => {
    setErrors((prev) => ({ ...prev, [field]: undefined }));
    setSaveError(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    const namesInWp = existing.filter((d) => d.workPackageId === workPackageId).map((d) => d.name);
    const { isValid, errors: next } = validateDeliverableForm(
      { workPackageId, name, deliverableType, description },
      namesInWp
    );
    setErrors(next);
    if (!isValid || workPackageId == null || !deliverableType) return;
    setSubmitting(true);
    try {
      const created = await createDeliverable(projectId, {
        workPackageId,
        name: name.trim(),
        deliverableType,
        description: description.trim() || null,
      });
      onCreated(created);
    } catch (err) {
      if (err instanceof AcceptanceApiError && err.code === 'DUPLICATE_DATA') {
        setErrors((prev) => ({ ...prev, name: `${err.message} — đặt tên khác` }));
      } else {
        setSaveError(err instanceof AcceptanceApiError ? err.message : 'Không khai báo được sản phẩm bàn giao.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ModalPortal>
      <div
        className="modal-backdrop"
        onMouseDown={backdrop.onMouseDown}
        onClick={backdrop.onClick}
        role="dialog"
        aria-modal="true"
        aria-labelledby="deliverable-form-title"
      >
        <div className="modal-card" style={{ width: 'min(100%, 600px)' }} data-testid="deliverable-form-modal">
          <div className="modal-header">
            <div className="modal-header__title-wrap">
              <h3 id="deliverable-form-title" className="modal-title">
                <span className="modal-title__icon">{ICONS.document}</span>
                Khai báo sản phẩm bàn giao
              </h3>
              <p className="field-hint">Dự án: {projectLabel}</p>
            </div>
            <button type="button" className="modal-close" onClick={onClose} disabled={submitting} aria-label="Đóng">
              {ICONS.close}
            </button>
          </div>
          <div className="modal-body">
            {saveError && (
              <div className="alert-box alert-box--danger" role="alert" data-testid="deliverable-form-error">
                <span className="alert-box__icon">{ICONS.alertTriangle}</span>
                <div className="alert-box__content">{saveError}</div>
              </div>
            )}
            <form onSubmit={(e) => void handleSubmit(e)} noValidate>
              <div className="form-grid">
                <div className="form-field form-field--full">
                  <label className="form-label required" htmlFor="deliverable-wp">Hạng mục</label>
                  <select
                    id="deliverable-wp"
                    className={`form-select ${errors.workPackageId ? 'form-input--error' : ''}`}
                    value={workPackageId ?? ''}
                    onChange={(e) => {
                      setWorkPackageId(e.target.value ? Number(e.target.value) : null);
                      clear('workPackageId');
                      clear('name');
                    }}
                    disabled={submitting}
                  >
                    <option value="">-- Chọn hạng mục --</option>
                    {workPackages.map((wp) => (
                      <option key={wp.id} value={wp.id}>
                        {`${'   '.repeat(wp.depth)}${wp.depth > 0 ? '└ ' : ''}${wp.name}`}
                      </option>
                    ))}
                  </select>
                  {errors.workPackageId && <span className="field-error">{errors.workPackageId}</span>}
                </div>
                <div className="form-field">
                  <label className="form-label required" htmlFor="deliverable-name">Tên sản phẩm</label>
                  <input
                    id="deliverable-name"
                    className={`form-input ${errors.name ? 'form-input--error' : ''}`}
                    maxLength={DELIVERABLE_NAME_MAX_LENGTH}
                    placeholder="Ví dụ: Tài liệu thiết kế"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      clear('name');
                    }}
                    disabled={submitting}
                  />
                  {errors.name && <span className="field-error">{errors.name}</span>}
                </div>
                <div className="form-field">
                  <label className="form-label required" htmlFor="deliverable-type">Loại sản phẩm</label>
                  <select
                    id="deliverable-type"
                    className={`form-select ${errors.deliverableType ? 'form-input--error' : ''}`}
                    value={deliverableType}
                    onChange={(e) => {
                      setDeliverableType(e.target.value as DeliverableType | '');
                      clear('deliverableType');
                    }}
                    disabled={submitting}
                  >
                    <option value="">-- Chọn loại --</option>
                    {(Object.keys(DELIVERABLE_TYPE_LABEL) as DeliverableType[]).map((t) => (
                      <option key={t} value={t}>{DELIVERABLE_TYPE_LABEL[t]}</option>
                    ))}
                  </select>
                  {errors.deliverableType && <span className="field-error">{errors.deliverableType}</span>}
                </div>
                <div className="form-field form-field--full">
                  <label className="form-label" htmlFor="deliverable-description">Mô tả</label>
                  <textarea
                    id="deliverable-description"
                    className={`form-textarea ${errors.description ? 'form-input--error' : ''}`}
                    rows={3}
                    maxLength={DELIVERABLE_DESCRIPTION_MAX_LENGTH}
                    placeholder="Ví dụ: SRS và thiết kế cơ sở dữ liệu"
                    value={description}
                    onChange={(e) => {
                      setDescription(e.target.value);
                      clear('description');
                    }}
                    disabled={submitting}
                  />
                  {errors.description && <span className="field-error">{errors.description}</span>}
                </div>
              </div>
              <p className="field-hint">
                Sản phẩm mới chưa có phiên bản nào — bấm "Bàn giao phiên bản" sau mỗi lần giao cho khách hàng.
              </p>
              <div style={{ marginTop: '16px', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={onClose} disabled={submitting}>
                  Hủy
                </button>
                <button type="submit" className="btn-primary" disabled={submitting} data-testid="deliverable-form-submit">
                  {submitting ? 'Đang lưu…' : 'Khai báo sản phẩm'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
