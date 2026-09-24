import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { ICONS } from '../../../components/common/icons';
import ModalPortal from '../../../components/common/ModalPortal';
import { useBackdropClick } from '../../../hooks/useBackdropClick';
import { AcceptanceApiError, createAcceptance, getAcceptanceReadiness } from '../api/acceptanceApi';
import {
  ACCEPTANCE_STATUS_META,
  TASK_STATUS_META,
  type AcceptanceDetailRes,
  type AcceptanceReadinessRes,
} from '../types/acceptanceTypes';
import type { FlatWorkPackage } from '../utils/workPackageTree';
import {
  NOTE_MAX_LENGTH,
  TITLE_MAX_LENGTH,
  parseMoneyInput,
  validateAcceptanceForm,
  type AcceptanceFormErrors,
} from '../validators/acceptanceValidators';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (certificate: AcceptanceDetailRes) => void;
  projectId: number;
  projectLabel: string;
  /** Dự án đã đóng (CLOSED) thì không lập phiếu được — backend cũng chặn. */
  projectClosed?: boolean;
  workPackages: FlatWorkPackage[];
  /** Hạng mục chọn sẵn khi mở từ một dòng của bảng hạng mục. */
  initialWorkPackageId?: number | null;
  currentUserRoles?: string[];
}

function formatAmount(value: number): string {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 2 }).format(value);
}

/**
 * NCL-12-CN-001 — Lập phiếu nghiệm thu hạng mục (Quản lý dự án, VT-02).
 *
 * Luồng: chọn hạng mục → hệ thống kiểm tra điều kiện (acceptance-readiness, QTN-24) và xem trước nội
 * dung phiếu → nhập giá trị nghiệm thu → xác nhận → phiếu được lập ở trạng thái "Chờ khách hàng xác
 * nhận" (TC-01). Hạng mục còn công việc dang dở thì nút lập phiếu bị khoá và danh sách các công việc đó
 * được liệt kê (TC-02). Mọi lần lập phiếu được backend ghi Nhật ký hệ thống (TC-04).
 */
export default function AcceptanceFormModal({
  isOpen,
  onClose,
  onCreated,
  projectId,
  projectLabel,
  projectClosed = false,
  workPackages,
  initialWorkPackageId = null,
  currentUserRoles = [],
}: Props) {
  const isAllowed = currentUserRoles.includes('VT-02');

  const [workPackageId, setWorkPackageId] = useState<number | null>(initialWorkPackageId);
  const [title, setTitle] = useState('');
  const [acceptedValue, setAcceptedValue] = useState('');
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState<AcceptanceFormErrors>({});

  const [readiness, setReadiness] = useState<AcceptanceReadinessRes | null>(null);
  const [readinessLoading, setReadinessLoading] = useState(false);
  const [readinessError, setReadinessError] = useState<string | null>(null);

  const [step, setStep] = useState<'form' | 'confirm'>('form');
  const [submitting, setSubmitting] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const backdrop = useBackdropClick(onClose, submitting);

  // Mỗi lần mở lại modal là một phiên lập phiếu mới.
  useEffect(() => {
    if (!isOpen) return;
    setWorkPackageId(initialWorkPackageId);
    setTitle('');
    setAcceptedValue('');
    setNote('');
    setErrors({});
    setReadiness(null);
    setReadinessError(null);
    setStep('form');
    setSaveError(null);
  }, [isOpen, initialWorkPackageId]);

  const loadReadiness = useCallback(
    async (wpId: number) => {
      setReadinessLoading(true);
      setReadinessError(null);
      try {
        setReadiness(await getAcceptanceReadiness(projectId, wpId));
      } catch (err) {
        setReadiness(null);
        setReadinessError(
          err instanceof AcceptanceApiError ? err.message : 'Không kiểm tra được điều kiện nghiệm thu của hạng mục.'
        );
      } finally {
        setReadinessLoading(false);
      }
    },
    [projectId]
  );

  useEffect(() => {
    if (!isOpen || !isAllowed || workPackageId == null) return;
    void loadReadiness(workPackageId);
  }, [isOpen, isAllowed, workPackageId, loadReadiness]);

  const selectedWp = useMemo(
    () => workPackages.find((wp) => wp.id === workPackageId) ?? null,
    [workPackages, workPackageId]
  );

  const parsedValue = parseMoneyInput(acceptedValue);
  const readinessMatches = readiness != null && readiness.workPackageId === workPackageId;
  const canSubmit =
    isAllowed && !projectClosed && readinessMatches && readiness.ready && !readinessLoading && !submitting;
  const defaultTitle = selectedWp ? `Nghiem thu hang muc ${selectedWp.name}` : '';

  if (!isOpen) return null;

  const handleReview = (e: FormEvent) => {
    e.preventDefault();
    const { isValid, errors: nextErrors } = validateAcceptanceForm({ workPackageId, title, acceptedValue, note });
    setErrors(nextErrors);
    if (!isValid || !canSubmit) return;
    setSaveError(null);
    setStep('confirm');
  };

  const handleCreate = async () => {
    if (workPackageId == null || submitting) return;
    setSubmitting(true);
    setSaveError(null);
    try {
      const created = await createAcceptance(projectId, {
        workPackageId,
        title: title.trim() || null,
        acceptedValue: parsedValue,
        note: note.trim() || null,
      });
      onCreated(created);
    } catch (err) {
      const message = err instanceof AcceptanceApiError ? err.message : 'Không thể lập phiếu nghiệm thu. Vui lòng thử lại.';
      setSaveError(message);
      setStep('form');
      // Trạng thái hạng mục có thể đã đổi từ lúc xem trước (công việc bị mở lại, phiếu vừa được lập ở
      // nơi khác) — nạp lại để danh sách công việc dang dở/phiếu đang chặn hiển thị đúng.
      if (err instanceof AcceptanceApiError && (err.code === 'INVALID_STATE' || err.code === 'DUPLICATE_DATA')) {
        void loadReadiness(workPackageId);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const progressPct =
    readiness && readiness.totalTasks > 0 ? Math.round((readiness.doneTasks / readiness.totalTasks) * 100) : 0;
  const includedDeliverables = readiness?.deliverables.filter((d) => d.latestVersionId != null) ?? [];

  return (
    <ModalPortal>
      <div
        className="modal-backdrop"
        onMouseDown={backdrop.onMouseDown}
        onClick={backdrop.onClick}
        role="dialog"
        aria-modal="true"
        aria-labelledby="acceptance-form-modal-title"
      >
        <div className="modal-card" style={{ width: 'min(100%, 720px)' }} data-testid="acceptance-form-modal">
          <div className="modal-header">
            <div className="modal-header__title-wrap">
              <h3 id="acceptance-form-modal-title" className="modal-title">
                <span className="modal-title__icon">{ICONS.clipboardList}</span>
                {step === 'confirm' ? 'Xác nhận lập phiếu nghiệm thu' : 'Lập phiếu nghiệm thu hạng mục'}
              </h3>
              <p className="field-hint">Dự án: {projectLabel}</p>
            </div>
            <button type="button" className="modal-close" onClick={onClose} disabled={submitting} aria-label="Đóng">
              {ICONS.close}
            </button>
          </div>

          <div className="modal-body">
            {!isAllowed ? (
              <div className="alert-box alert-box--danger" role="alert">
                Chức năng lập phiếu nghiệm thu chỉ dành cho Quản lý dự án (VT-02).
              </div>
            ) : step === 'confirm' && readiness && selectedWp ? (
              <div data-testid="acceptance-confirm-step">
                <div className="alert-box alert-box--info">
                  <span className="alert-box__icon">{ICONS.info}</span>
                  <div className="alert-box__content">
                    Sau khi lập, phiếu chuyển sang trạng thái <strong style={{ display: 'inline' }}>Chờ khách hàng xác nhận</strong>.
                    Nội dung công việc và sản phẩm bàn giao được chụp lại tại thời điểm này; thao tác được ghi vào nhật ký nghiệm thu.
                  </div>
                </div>
                <div className="detail-grid" style={{ marginBottom: '16px' }}>
                  <div className="detail-field">
                    <span className="detail-label">Hạng mục</span>
                    <span className="detail-value">{selectedWp.path}</span>
                  </div>
                  <div className="detail-field">
                    <span className="detail-label">Giá trị nghiệm thu</span>
                    <span className="detail-value" data-testid="acceptance-confirm-value">{formatAmount(parsedValue)}</span>
                  </div>
                  <div className="detail-field">
                    <span className="detail-label">Tiêu đề phiếu</span>
                    <span className="detail-value">{title.trim() || defaultTitle}</span>
                  </div>
                  <div className="detail-field">
                    <span className="detail-label">Nội dung phiếu</span>
                    <span className="detail-value">
                      {readiness.totalTasks} công việc · {includedDeliverables.length} sản phẩm bàn giao
                    </span>
                  </div>
                  {note.trim() && (
                    <div className="detail-field" style={{ gridColumn: '1 / -1' }}>
                      <span className="detail-label">Ghi chú</span>
                      <span className="detail-value" style={{ fontWeight: 400, whiteSpace: 'pre-wrap' }}>{note.trim()}</span>
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setStep('form')} disabled={submitting}>
                    Quay lại sửa
                  </button>
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={() => void handleCreate()}
                    disabled={submitting}
                    data-testid="acceptance-confirm-submit"
                  >
                    {submitting ? 'Đang lập phiếu…' : 'Xác nhận lập phiếu'}
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleReview} noValidate>
                {projectClosed && (
                  <div className="alert-box alert-box--warning" role="alert">
                    <span className="alert-box__icon">{ICONS.lock}</span>
                    <div className="alert-box__content">Dự án đã đóng — không thể lập phiếu nghiệm thu mới.</div>
                  </div>
                )}
                {saveError && (
                  <div className="alert-box alert-box--danger" role="alert" data-testid="acceptance-save-error">
                    <span className="alert-box__icon">{ICONS.alertTriangle}</span>
                    <div className="alert-box__content">{saveError}</div>
                  </div>
                )}

                <div className="milestone-field">
                  <label className="form-label required" htmlFor="acceptance-work-package">Hạng mục cần nghiệm thu</label>
                  <select
                    id="acceptance-work-package"
                    className={`form-select ${errors.workPackageId ? 'form-input--error' : ''}`}
                    value={workPackageId ?? ''}
                    onChange={(e) => {
                      setWorkPackageId(e.target.value ? Number(e.target.value) : null);
                      setErrors((prev) => ({ ...prev, workPackageId: undefined }));
                      setSaveError(null);
                    }}
                    disabled={submitting}
                  >
                    <option value="">-- Chọn hạng mục --</option>
                    {workPackages.map((wp) => (
                      <option key={wp.id} value={wp.id}>
                        {`${'   '.repeat(wp.depth)}${wp.depth > 0 ? '└ ' : ''}${wp.name} (${wp.doneTasks}/${wp.totalTasks} việc xong)`}
                      </option>
                    ))}
                  </select>
                  {errors.workPackageId && <span className="field-error">{errors.workPackageId}</span>}
                  {workPackages.length === 0 && (
                    <span className="field-hint">Dự án chưa có hạng mục nào — tạo hạng mục ở cây công việc (WBS) trước.</span>
                  )}
                </div>

                {workPackageId != null && (
                  <div style={{ marginTop: '16px' }} data-testid="acceptance-readiness">
                    {readinessLoading ? (
                      <div className="field-hint" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="spinner-sm" /> Đang kiểm tra điều kiện nghiệm thu của hạng mục…
                      </div>
                    ) : readinessError ? (
                      <div className="alert-box alert-box--danger" role="alert">
                        <span className="alert-box__icon">{ICONS.alertTriangle}</span>
                        <div className="alert-box__content">
                          {readinessError}{' '}
                          <button type="button" className="btn-link" onClick={() => void loadReadiness(workPackageId)}>
                            Thử lại
                          </button>
                        </div>
                      </div>
                    ) : readinessMatches ? (
                      <>
                        <div className="acceptance-progress" aria-label="Tiến độ công việc của hạng mục">
                          <div className="acceptance-progress__head">
                            <span>Công việc đã hoàn thành</span>
                            <strong>
                              {readiness.doneTasks}/{readiness.totalTasks}
                            </strong>
                          </div>
                          <div className="acceptance-progress__track">
                            <div
                              className={`acceptance-progress__bar ${progressPct === 100 ? 'acceptance-progress__bar--done' : ''}`}
                              style={{ width: `${progressPct}%` }}
                            />
                          </div>
                        </div>

                        {readiness.activeCertificateCode ? (
                          <div className="alert-box alert-box--warning" role="alert" data-testid="acceptance-blocked-certificate">
                            <span className="alert-box__icon">{ICONS.alertTriangle}</span>
                            <div className="alert-box__content">
                              <strong>Nhánh hạng mục này đã có phiếu nghiệm thu {readiness.activeCertificateCode}</strong>
                              Trạng thái:{' '}
                              {readiness.activeCertificateStatus
                                ? ACCEPTANCE_STATUS_META[readiness.activeCertificateStatus].label
                                : '—'}
                              . Mỗi nhánh hạng mục chỉ có một phiếu — phiếu bị từ chối thì nộp lại, không lập phiếu mới.
                            </div>
                          </div>
                        ) : readiness.totalTasks === 0 ? (
                          <div className="alert-box alert-box--warning" role="alert">
                            <span className="alert-box__icon">{ICONS.alertTriangle}</span>
                            <div className="alert-box__content">
                              Hạng mục chưa có công việc nào — không có gì để nghiệm thu.
                            </div>
                          </div>
                        ) : readiness.unfinishedTasks.length > 0 ? (
                          <div className="alert-box alert-box--danger" role="alert" data-testid="acceptance-unfinished">
                            <span className="alert-box__icon">{ICONS.alertTriangle}</span>
                            <div className="alert-box__content">
                              <strong>
                                Chưa thể lập phiếu — còn {readiness.unfinishedTasks.length} công việc chưa hoàn thành
                              </strong>
                              Chỉ nghiệm thu khi toàn bộ công việc của hạng mục (kể cả hạng mục con) đã hoàn thành (QTN-24):
                              <ul className="acceptance-task-list">
                                {readiness.unfinishedTasks.map((t) => {
                                  const meta = TASK_STATUS_META[t.status] ?? { label: t.status, badge: 'badge--gray' };
                                  return (
                                    <li key={t.taskId} data-testid={`acceptance-unfinished-task-${t.taskId}`}>
                                      <span>#{t.taskId} {t.taskName}</span>
                                      <span className={`badge ${meta.badge}`}>{meta.label}</span>
                                    </li>
                                  );
                                })}
                              </ul>
                            </div>
                          </div>
                        ) : readiness.ready ? (
                          <div className="alert-box alert-box--success" data-testid="acceptance-ready">
                            <span className="alert-box__icon">{ICONS.checkCircle}</span>
                            <div className="alert-box__content">
                              Hạng mục đủ điều kiện nghiệm thu — toàn bộ {readiness.totalTasks} công việc đã hoàn thành.
                            </div>
                          </div>
                        ) : null}

                        {readiness.ready && (
                          <div className="acceptance-preview" data-testid="acceptance-preview">
                            <div>
                              <h4 className="acceptance-preview__title">Công việc đưa vào phiếu</h4>
                              <ul className="acceptance-task-list">
                                {(selectedWp?.tasks ?? []).map((t) => (
                                  <li key={t.id}>
                                    <span>#{t.id} {t.name}</span>
                                    <span className="badge badge--green">Hoàn thành</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                            <div>
                              <h4 className="acceptance-preview__title">Sản phẩm bàn giao</h4>
                              {readiness.deliverables.length === 0 ? (
                                <p className="field-hint">Hạng mục chưa khai báo sản phẩm bàn giao.</p>
                              ) : (
                                <ul className="acceptance-task-list">
                                  {readiness.deliverables.map((d) => (
                                    <li key={d.deliverableId}>
                                      <span>{d.deliverableName}</span>
                                      {d.latestVersionNo ? (
                                        <span className="badge badge--blue">Phiên bản {d.latestVersionNo}</span>
                                      ) : (
                                        <span className="badge badge--gray" title="Sản phẩm chưa bàn giao lần nào sẽ không vào phiếu">
                                          Chưa bàn giao — không vào phiếu
                                        </span>
                                      )}
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          </div>
                        )}
                      </>
                    ) : null}
                  </div>
                )}

                <div className="form-grid" style={{ marginTop: '16px' }}>
                  <div className="form-field">
                    <label className="form-label required" htmlFor="acceptance-value">Giá trị nghiệm thu (VND)</label>
                    <input
                      id="acceptance-value"
                      type="text"
                      inputMode="decimal"
                      className={`form-input ${errors.acceptedValue ? 'form-input--error' : ''}`}
                      placeholder="Ví dụ: 300000000"
                      value={acceptedValue}
                      onChange={(e) => {
                        setAcceptedValue(e.target.value);
                        setErrors((prev) => ({ ...prev, acceptedValue: undefined }));
                      }}
                      disabled={submitting}
                    />
                    {errors.acceptedValue ? (
                      <span className="field-error">{errors.acceptedValue}</span>
                    ) : (
                      !Number.isNaN(parsedValue) && parsedValue >= 0 && (
                        <span className="field-hint">= {formatAmount(parsedValue)}</span>
                      )
                    )}
                  </div>
                  <div className="form-field">
                    <label className="form-label" htmlFor="acceptance-title">Tiêu đề phiếu</label>
                    <input
                      id="acceptance-title"
                      className={`form-input ${errors.title ? 'form-input--error' : ''}`}
                      placeholder={defaultTitle || 'Để trống để hệ thống tự đặt'}
                      maxLength={TITLE_MAX_LENGTH}
                      value={title}
                      onChange={(e) => {
                        setTitle(e.target.value);
                        setErrors((prev) => ({ ...prev, title: undefined }));
                      }}
                      disabled={submitting}
                    />
                    {errors.title ? (
                      <span className="field-error">{errors.title}</span>
                    ) : (
                      <span className="field-hint">Không bắt buộc — để trống sẽ dùng tên hạng mục.</span>
                    )}
                  </div>
                  <div className="form-field form-field--full">
                    <label className="form-label" htmlFor="acceptance-note">Ghi chú</label>
                    <textarea
                      id="acceptance-note"
                      className={`form-textarea ${errors.note ? 'form-input--error' : ''}`}
                      rows={3}
                      placeholder="Ví dụ: Theo mốc 1 của hợp đồng"
                      maxLength={NOTE_MAX_LENGTH}
                      value={note}
                      onChange={(e) => {
                        setNote(e.target.value);
                        setErrors((prev) => ({ ...prev, note: undefined }));
                      }}
                      disabled={submitting}
                    />
                    {errors.note ? (
                      <span className="field-error">{errors.note}</span>
                    ) : (
                      <span className="field-hint" style={{ textAlign: 'right' }}>
                        {note.length}/{NOTE_MAX_LENGTH}
                      </span>
                    )}
                  </div>
                </div>

                <div style={{ marginTop: '16px', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                  <button type="button" className="btn btn-secondary" onClick={onClose} disabled={submitting}>
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={!canSubmit}
                    title={!canSubmit ? 'Chọn hạng mục đủ điều kiện nghiệm thu để tiếp tục' : undefined}
                    data-testid="acceptance-submit"
                  >
                    Tiếp tục
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
