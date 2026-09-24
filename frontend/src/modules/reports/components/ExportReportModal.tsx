import { useState } from 'react';
import type { FormEvent } from 'react';
import { downloadFile, exportReport, ReportsApiError } from '../api/reportsApi';
import { EXPORT_REPORT_OPTIONS, type ExportReportType } from '../types/reportTypes';
import { ICONS } from '../../../components/common/icons';
import ModalPortal from '../../../components/common/ModalPortal';
import { useBackdropClick } from '../../../hooks/useBackdropClick';

interface ExportReportModalProps {
  /** Loại báo cáo chọn sẵn khi mở từ một trang báo cáo cụ thể. */
  initialReportType?: ExportReportType;
  onClose: () => void;
  /** Gọi sau khi trình duyệt đã bắt đầu tải tệp. */
  onExported?: (fileName: string, rowCount: number) => void;
}

/** yyyy-MM-dd theo giờ máy người dùng (toISOString lệch ngày ở múi giờ +7). */
function toIsoDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function defaultPeriod(): { from: string; to: string } {
  const today = new Date();
  return { from: toIsoDate(new Date(today.getFullYear(), today.getMonth(), 1)), to: toIsoDate(today) };
}

/** Diễn giải lỗi backend thành câu người dùng hiểu được (NCL-11-CN-004 TC-02, TC-03). */
function describeError(err: unknown): string {
  if (err instanceof ReportsApiError) {
    if (err.code === 'INVALID_STATE') return 'Không có dữ liệu trong kỳ đã chọn để xuất. Hãy chọn kỳ khác.';
    if (err.code === 'FORBIDDEN') return 'Bạn không có quyền xuất báo cáo này. Chỉ Quản lý dự án được xuất.';
    if (err.code === 'VALIDATION_ERROR') return 'Kỳ báo cáo không hợp lệ. Kiểm tra lại ngày bắt đầu và ngày kết thúc.';
    if (err.statusCode === 401) return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
    return err.message;
  }
  return 'Không xuất được báo cáo. Vui lòng thử lại.';
}

/**
 * NCL-11-CN-004 — chọn báo cáo và kỳ rồi xuất ra tệp bảng tính (CSV mở được bằng Excel).
 * Cột giá vốn do backend quyết định có hay không theo quyền của người xuất (QTN-02).
 */
export default function ExportReportModal({
  initialReportType = 'PROJECT_PERFORMANCE',
  onClose,
  onExported,
}: ExportReportModalProps) {
  const [reportType, setReportType] = useState<ExportReportType>(initialReportType);
  const [period, setPeriod] = useState(defaultPeriod);
  const [fieldErrors, setFieldErrors] = useState<{ from?: string; to?: string }>({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const backdrop = useBackdropClick(onClose, submitting);

  const selected = EXPORT_REPORT_OPTIONS.find((option) => option.value === reportType);

  function validate(): boolean {
    const next: { from?: string; to?: string } = {};
    if (!period.from) next.from = 'Chọn ngày bắt đầu kỳ.';
    if (!period.to) next.to = 'Chọn ngày kết thúc kỳ.';
    if (period.from && period.to && period.from > period.to) next.to = 'Ngày kết thúc không được trước ngày bắt đầu.';
    setFieldErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (!validate()) return;

    setSubmitting(true);
    try {
      const file = await exportReport({ reportType, from: period.from, to: period.to, format: 'CSV' });
      downloadFile(file);
      onExported?.(file.fileName, file.rowCount);
      onClose();
    } catch (err) {
      setError(describeError(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ModalPortal>
      <div className="modal-backdrop" onMouseDown={backdrop.onMouseDown} onClick={backdrop.onClick} role="dialog"
        aria-modal="true" aria-labelledby="export-report-title">
        <div className="modal-card modal-card--md" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h3 className="modal-title" id="export-report-title">
              <span className="modal-title__icon">{ICONS.download}</span>
              Xuất báo cáo ra tệp
            </h3>
          </div>

          <form onSubmit={handleSubmit} noValidate>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label className="form-label" htmlFor="export-report-type">
                  Báo cáo
                </label>
                <select
                  id="export-report-type"
                  className="form-input"
                  value={reportType}
                  disabled={submitting}
                  onChange={(e) => setReportType(e.target.value as ExportReportType)}
                >
                  {EXPORT_REPORT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {selected && <small className="field-hint">{selected.description}</small>}
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ flex: '1 1 160px' }}>
                  <label className="form-label" htmlFor="export-report-from">
                    Từ ngày
                  </label>
                  <input
                    id="export-report-from"
                    type="date"
                    className={`form-input ${fieldErrors.from ? 'form-input--error' : ''}`}
                    value={period.from}
                    max={period.to || undefined}
                    disabled={submitting}
                    onChange={(e) => setPeriod((p) => ({ ...p, from: e.target.value }))}
                  />
                  {fieldErrors.from && <small className="field-error">{fieldErrors.from}</small>}
                </div>
                <div style={{ flex: '1 1 160px' }}>
                  <label className="form-label" htmlFor="export-report-to">
                    Đến ngày
                  </label>
                  <input
                    id="export-report-to"
                    type="date"
                    className={`form-input ${fieldErrors.to ? 'form-input--error' : ''}`}
                    value={period.to}
                    min={period.from || undefined}
                    disabled={submitting}
                    onChange={(e) => setPeriod((p) => ({ ...p, to: e.target.value }))}
                  />
                  {fieldErrors.to && <small className="field-error">{fieldErrors.to}</small>}
                </div>
              </div>

              <div className="alert-box alert-box--info" role="note">
                <span className="icon-xs">{ICONS.info}</span> Tệp CSV mở được bằng Excel. Các cột giá vốn không có
                trong tệp nếu vai trò của bạn không được xem dữ liệu chi phí. Mỗi lần xuất đều được ghi nhật ký.
              </div>

              {error && (
                <div className="alert-box alert-box--danger" role="alert" data-testid="export-report-error">
                  <span className="icon-xs">{ICONS.alertTriangle}</span> {error}
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button type="button" className="btn-secondary" onClick={onClose} disabled={submitting}>
                Hủy
              </button>
              <button type="submit" className="btn-primary" disabled={submitting}>
                {submitting ? 'Đang xuất…' : 'Xuất tệp'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </ModalPortal>
  );
}
