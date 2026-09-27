import { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ICONS } from '../../../components/common/icons';
import PageHeader from '../../../components/common/PageHeader';
import { roleLabels } from '../../../utils/roleLabel';
import { AdminApiError, commitImport, downloadImportTemplate, getImport, listImports, previewImport } from '../api/importApi';
import ImportPreviewTable, { ROW_STATUS_META } from '../components/ImportPreviewTable';
import type {
  DuplicateAction,
  ImportPreviewRes,
  ImportResultRes,
  ImportRowStatus,
  ImportStatus,
  ImportTargetType,
} from '../types/adminTypes';
import { formatBytes } from '../utils/backupUtils';
import { formatDateTime } from '../utils/serviceCatalogUtils';

/** Khớp giới hạn của máy chủ — chặn sớm để khỏi tải lên một tệp chắc chắn bị từ chối. */
export const MAX_IMPORT_BYTES = 2 * 1024 * 1024;

const TARGETS: { value: ImportTargetType; label: string }[] = [
  { value: 'CUSTOMER', label: 'Khách hàng' },
  { value: 'EMPLOYEE', label: 'Nhân sự' },
];

const JOB_STATUS_META: Record<ImportStatus, { label: string; badge: string }> = {
  PREVIEWED: { label: 'Chưa nhập', badge: 'badge--gray' },
  COMMITTED: { label: 'Đã nhập', badge: 'badge--green' },
  COMMITTED_WITH_ERRORS: { label: 'Đã nhập, có dòng lỗi', badge: 'badge--gold' },
};

type RowFilter = 'ALL' | ImportRowStatus;

export interface DataImportPageProps {
  currentUserRoles?: string[];
  /** Mở Nhật ký hệ thống để tra lịch sử tải tệp / nhập (TC-05). */
  onViewAuditLog?: () => void;
}

function isForbidden(err: unknown) {
  return err instanceof AdminApiError && err.statusCode === 403;
}

function errorText(err: unknown, fallback: string) {
  return err instanceof Error ? err.message : fallback;
}

/**
 * Nhập khách hàng và nhân sự từ tệp CSV (NCL-15-CN-004): tải tệp → xem trước từng dòng → xác nhận nhập.
 * Chỉ Quản trị viên; vai trò khác nhận 403 và máy chủ ghi nhật ký lần từ chối (TC-04).
 */
export default function DataImportPage({ currentUserRoles = [], onViewAuditLog }: DataImportPageProps) {
  const [targetType, setTargetType] = useState<ImportTargetType>('CUSTOMER');
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [preview, setPreview] = useState<ImportPreviewRes | null>(null);
  const [filter, setFilter] = useState<RowFilter>('ALL');
  const [defaultAction, setDefaultAction] = useState<DuplicateAction>('SKIP');
  const [rowActions, setRowActions] = useState<Record<number, DuplicateAction>>({});
  const [committing, setCommitting] = useState(false);
  const [result, setResult] = useState<ImportResultRes | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [history, setHistory] = useState<ImportResultRes[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [expandedJob, setExpandedJob] = useState<ImportResultRes | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ message, type });
    toastTimer.current = setTimeout(() => setToast(null), 6000);
  };
  useEffect(
    () => () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    },
    []
  );

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      setHistory(await listImports());
    } catch (err) {
      if (isForbidden(err)) setForbidden(true);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  function reset(keepType = true) {
    setFile(null);
    setFileError(null);
    setPreview(null);
    setResult(null);
    setFilter('ALL');
    setRowActions({});
    setDefaultAction('SKIP');
    if (!keepType) setTargetType('CUSTOMER');
    if (fileInput.current) fileInput.current.value = '';
  }

  function pickFile(next: File | null) {
    setPreview(null);
    setResult(null);
    if (!next) {
      setFile(null);
      return;
    }
    if (!/\.(csv|txt)$/i.test(next.name)) {
      setFile(null);
      setFileError('Chỉ nhận tệp CSV. Trong Excel: Lưu thành › CSV UTF-8.');
      return;
    }
    if (next.size > MAX_IMPORT_BYTES) {
      setFile(null);
      setFileError(`Tệp ${formatBytes(next.size)} vượt quá 2 MB.`);
      return;
    }
    setFileError(null);
    setFile(next);
  }

  async function handleTemplate() {
    try {
      const { blob, fileName } = await downloadImportTemplate(targetType);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      if (isForbidden(err)) setForbidden(true);
      else showToast(errorText(err, 'Không tải được tệp mẫu.'), 'error');
    }
  }

  async function handleCheck() {
    if (!file || checking) return;
    setChecking(true);
    setFileError(null);
    try {
      const res = await previewImport(targetType, file);
      setPreview(res);
      setRowActions({});
      setFilter(res.invalidRows > 0 ? 'INVALID' : 'ALL');
      void loadHistory();
    } catch (err) {
      if (isForbidden(err)) setForbidden(true);
      else setFileError(errorText(err, 'Không kiểm tra được tệp.'));
    } finally {
      setChecking(false);
    }
  }

  async function handleCommit() {
    if (!preview || committing) return;
    setCommitting(true);
    try {
      const res = await commitImport(preview.jobId, {
        duplicateAction: preview.duplicateRows > 0 ? defaultAction : null,
        rowActions: Object.entries(rowActions).map(([rowNumber, action]) => ({ rowNumber: Number(rowNumber), action })),
      });
      setResult(res);
      setPreview(null);
      showToast(
        res.failedCount > 0
          ? `Đã nhập, nhưng ${res.failedCount} dòng ghi không thành công — xem danh sách bên dưới.`
          : `Đã nhập ${res.createdCount} dòng mới${res.updatedCount ? `, cập nhật ${res.updatedCount} hồ sơ` : ''}.`,
        res.failedCount > 0 ? 'error' : 'success'
      );
      void loadHistory();
    } catch (err) {
      if (isForbidden(err)) setForbidden(true);
      else showToast(errorText(err, 'Không nhập được dữ liệu.'), 'error');
    } finally {
      setCommitting(false);
    }
  }

  async function toggleJob(job: ImportResultRes) {
    if (expandedJob?.jobId === job.jobId) {
      setExpandedJob(null);
      return;
    }
    try {
      setExpandedJob(await getImport(job.jobId));
    } catch (err) {
      showToast(errorText(err, 'Không tải được chi tiết lần nhập.'), 'error');
    }
  }

  if (forbidden) {
    return (
      <div className="access-denied-container" data-testid="import-access-denied">
        <div className="access-denied-card">
          <div className="access-denied-icon">{ICONS.shieldOff}</div>
          <h2>Bạn không có quyền nhập dữ liệu</h2>
          <p>
            Trang này dành cho <strong>Quản trị viên</strong>. Lần truy cập đã được ghi vào nhật ký.
          </p>
          <div className="security-log-badge">
            <span className="security-log-badge__item">Vai trò hiện tại: {roleLabels(currentUserRoles) || '—'}</span>
          </div>
        </div>
      </div>
    );
  }

  const visibleRows = preview ? preview.rows.filter((r) => filter === 'ALL' || r.status === filter) : [];
  const updatingCount = preview
    ? preview.rows.filter((r) => r.status === 'DUPLICATE' && (rowActions[r.rowNumber] ?? defaultAction) === 'UPDATE').length
    : 0;
  const importCount = preview ? preview.validRows + updatingCount : 0;

  return (
    <div className="user-management-page import-page" data-testid="data-import-page">
      <PageHeader
        title="Nhập dữ liệu"
        actions={
          onViewAuditLog && (
            <button type="button" className="btn-secondary" onClick={onViewAuditLog} data-testid="import-btn-audit">
              {ICONS.clipboardList} Nhật ký
            </button>
          )
        }
      />

      {!result && (
        <section className="company-card import-setup" aria-label="Chọn tệp">
          <div className="import-setup__row">
            <div className="status-tabs" role="radiogroup" aria-label="Loại dữ liệu">
              {TARGETS.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  role="radio"
                  aria-checked={targetType === t.value}
                  className={`status-tab ${targetType === t.value ? 'status-tab--active' : ''}`}
                  onClick={() => {
                    if (t.value !== targetType) {
                      reset();
                      setTargetType(t.value);
                    }
                  }}
                  disabled={checking || committing}
                  data-testid={`import-target-${t.value}`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <button type="button" className="btn-link" onClick={() => void handleTemplate()} data-testid="import-template">
              {ICONS.download} Tải tệp mẫu
            </button>
          </div>

          <label
            className={`import-drop ${file ? 'import-drop--ready' : ''} ${fileError ? 'import-drop--error' : ''}`}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              pickFile(e.dataTransfer.files?.[0] ?? null);
            }}
          >
            <input
              ref={fileInput}
              type="file"
              accept=".csv,text/csv"
              className="import-drop__input"
              onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
              disabled={checking || committing}
              data-testid="import-file"
            />
            <span className="import-drop__icon" aria-hidden="true">
              {file ? ICONS.document : ICONS.upload}
            </span>
            {file ? (
              <span className="import-drop__text">
                <strong>{file.name}</strong>
                <span>{formatBytes(file.size)} · bấm để chọn tệp khác</span>
              </span>
            ) : (
              <span className="import-drop__text">
                <strong>Kéo tệp CSV vào đây hoặc bấm để chọn</strong>
                <span>Tối đa 2 MB, 2.000 dòng.</span>
              </span>
            )}
          </label>
          {fileError && (
            <p className="form-error" role="alert" data-testid="import-file-error">
              {fileError}
            </p>
          )}

          {!preview && (
            <div className="import-setup__foot">
              <button
                type="button"
                className="btn-primary"
                onClick={() => void handleCheck()}
                disabled={!file || checking}
                data-testid="import-check"
              >
                {checking ? 'Đang kiểm tra…' : 'Kiểm tra tệp'}
              </button>
            </div>
          )}
        </section>
      )}

      {preview && (
        <section className="user-table-card import-preview" aria-label="Xem trước" data-testid="import-preview">
          <div className="import-preview__head">
            <div className="import-counts">
              <span>
                <strong>{preview.totalRows}</strong> dòng
              </span>
              <span className="import-counts__ok">
                <strong>{preview.validRows}</strong> hợp lệ
              </span>
              <span className="import-counts__bad">
                <strong>{preview.invalidRows}</strong> lỗi
              </span>
              <span className="import-counts__dup">
                <strong>{preview.duplicateRows}</strong> trùng hồ sơ đã có
              </span>
            </div>
            {preview.notice && <p className="import-notice">{preview.notice}</p>}
          </div>

          <div className="user-table-toolbar import-preview__toolbar">
            <div className="status-tabs" role="tablist" aria-label="Lọc dòng">
              {(['ALL', 'VALID', 'INVALID', 'DUPLICATE'] as RowFilter[]).map((f) => {
                const count =
                  f === 'ALL'
                    ? preview.totalRows
                    : f === 'VALID'
                      ? preview.validRows
                      : f === 'INVALID'
                        ? preview.invalidRows
                        : preview.duplicateRows;
                return (
                  <button
                    key={f}
                    type="button"
                    role="tab"
                    aria-selected={filter === f}
                    className={`status-tab ${filter === f ? 'status-tab--active' : ''}`}
                    onClick={() => setFilter(f)}
                  >
                    {f === 'ALL' ? 'Tất cả' : ROW_STATUS_META[f].label} ({count})
                  </button>
                );
              })}
            </div>
            {preview.duplicateRows > 0 && (
              <label className="import-default-action">
                Dòng trùng
                <select
                  className="form-select"
                  value={defaultAction}
                  onChange={(e) => setDefaultAction(e.target.value as DuplicateAction)}
                  disabled={committing}
                  data-testid="import-default-action"
                >
                  <option value="SKIP">Bỏ qua tất cả</option>
                  <option value="UPDATE">Cập nhật tất cả</option>
                </select>
              </label>
            )}
          </div>

          <ImportPreviewTable
            targetType={preview.targetType}
            rows={visibleRows}
            rowActions={rowActions}
            defaultAction={defaultAction}
            onRowActionChange={(rowNumber, action) => setRowActions((prev) => ({ ...prev, [rowNumber]: action }))}
            disabled={committing}
          />

          <div className="import-preview__foot">
            <span className="field-hint">
              {preview.invalidRows > 0
                ? `${preview.invalidRows} dòng lỗi sẽ không được nhập — sửa trong tệp rồi nhập lại sau.`
                : 'Mọi dòng đều hợp lệ.'}
            </span>
            <div className="import-preview__actions">
              <button type="button" className="btn-secondary" onClick={() => reset()} disabled={committing}>
                Chọn tệp khác
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={() => void handleCommit()}
                disabled={committing || importCount === 0}
                data-testid="import-commit"
              >
                {committing ? 'Đang nhập…' : `Nhập ${importCount} dòng`}
              </button>
            </div>
          </div>
        </section>
      )}

      {result && (
        <section className="company-card import-result" aria-label="Kết quả nhập" data-testid="import-result">
          <div className="import-result__head">
            <h2 className="company-card__title">
              {result.failedCount > 0 ? 'Đã nhập, còn dòng chưa ghi được' : 'Đã nhập xong'}
            </h2>
            <button type="button" className="btn-primary" onClick={() => reset()} data-testid="import-again">
              Nhập tệp khác
            </button>
          </div>
          <dl className="import-result__stats">
            <div>
              <dt>Tạo mới</dt>
              <dd>{result.createdCount}</dd>
            </div>
            <div>
              <dt>Cập nhật</dt>
              <dd>{result.updatedCount}</dd>
            </div>
            <div>
              <dt>Bỏ qua (trùng)</dt>
              <dd>{result.skippedCount}</dd>
            </div>
            <div>
              <dt>Dòng lỗi</dt>
              <dd className={result.invalidRows > 0 ? 'backup-stats__warn' : ''}>{result.invalidRows}</dd>
            </div>
            <div>
              <dt>Ghi thất bại</dt>
              <dd className={result.failedCount > 0 ? 'backup-stats__warn' : ''}>{result.failedCount}</dd>
            </div>
          </dl>
          {result.errors && result.errors.length > 0 && <ImportErrorList errors={result.errors} />}
        </section>
      )}

      <section className="user-table-card import-history" aria-label="Lịch sử nhập">
        <h2 className="import-history__title">Lịch sử nhập</h2>
        <div className="table-responsive">
          <table className="user-data-table">
            <thead>
              <tr>
                <th scope="col">Tệp</th>
                <th scope="col">Loại</th>
                <th scope="col">Trạng thái</th>
                <th scope="col">Kết quả</th>
                <th scope="col">Thời điểm</th>
              </tr>
            </thead>
            <tbody>
              {historyLoading && history.length === 0 ? (
                <tr>
                  <td colSpan={5} className="svc-table__empty">
                    Đang tải…
                  </td>
                </tr>
              ) : history.length === 0 ? (
                <tr>
                  <td colSpan={5} className="svc-table__empty" data-testid="import-history-empty">
                    Chưa có lần nhập nào.
                  </td>
                </tr>
              ) : (
                history.map((job) => {
                  const meta = JOB_STATUS_META[job.status];
                  const expanded = expandedJob?.jobId === job.jobId;
                  return (
                    <Fragment key={job.jobId}>
                      <tr data-testid={`import-job-${job.jobId}`}>
                        <td>
                          <button
                            type="button"
                            className="svc-table__name"
                            onClick={() => void toggleJob(job)}
                            aria-expanded={expanded}
                          >
                            {job.fileName}
                          </button>
                        </td>
                        <td>{job.targetType === 'CUSTOMER' ? 'Khách hàng' : 'Nhân sự'}</td>
                        <td>
                          <span className={`badge ${meta.badge}`}>{meta.label}</span>
                        </td>
                        <td>
                          {job.status === 'PREVIEWED'
                            ? `${job.totalRows} dòng đã kiểm tra`
                            : `${job.createdCount} mới · ${job.updatedCount} cập nhật · ${job.skippedCount} bỏ qua`}
                        </td>
                        <td>{formatDateTime(job.committedAt ?? job.createdAt)}</td>
                      </tr>
                      {expanded && (
                        <tr className="backup-table__detail">
                          <td colSpan={5}>
                            {expandedJob?.errors && expandedJob.errors.length > 0 ? (
                              <ImportErrorList errors={expandedJob.errors} />
                            ) : (
                              <p className="field-hint">Không có dòng lỗi.</p>
                            )}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {toast &&
        createPortal(
          <div className={`toast-notification toast-notification--${toast.type}`} role="alert" aria-live="polite">
            <div className="toast-notification__content">
              <span className="toast-notification__icon">
                {toast.type === 'success' ? ICONS.checkCircle : ICONS.alertTriangle}
              </span>
              <span className="toast-notification__text">{toast.message}</span>
            </div>
            <button type="button" className="toast-notification__close" onClick={() => setToast(null)} aria-label="Đóng thông báo">
              <span className="icon-sm">{ICONS.close}</span>
            </button>
          </div>,
          document.body
        )}
    </div>
  );
}

function ImportErrorList({ errors }: { errors: NonNullable<ImportResultRes['errors']> }) {
  return (
    <table className="user-data-table import-error-table" data-testid="import-error-list">
      <thead>
        <tr>
          <th scope="col" className="svc-table__num">Dòng</th>
          <th scope="col">Lý do</th>
          <th scope="col">Nội dung dòng</th>
        </tr>
      </thead>
      <tbody>
        {errors.map((e) => (
          <tr key={`${e.stage}-${e.rowNumber}`}>
            <td className="svc-table__num">{e.rowNumber}</td>
            <td>
              {e.stage === 'COMMIT' && <span className="badge badge--red import-error-table__stage">Ghi thất bại</span>}
              {e.message}
            </td>
            <td className="import-error-table__raw">{e.rawData ?? '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
