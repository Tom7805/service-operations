import { useState } from 'react';
import { ICONS } from '../../../components/common/icons';
import { roleLabels } from '../../../utils/roleLabel';
import { createInvoiceProposal, InvoicesApiError } from '../api/invoicesApi';
import {
  INVOICE_PROPOSAL_STATUS_LABELS,
  INVOICE_PROPOSAL_STATUS_PILL_CLASS,
  totalSkipped,
  type InvoiceProposalRes,
} from '../types/invoiceTypes';
import { validateInvoiceProposalForm, type InvoiceProposalFormErrors } from '../validators/invoiceValidators';

export interface InvoiceProposalPageProps {
  currentUserRoles?: string[];
  currentUserName?: string;
}

function formatAmount(amount: number): string {
  return new Intl.NumberFormat('vi-VN').format(amount) + ' đ';
}

function formatHours(hours: number): string {
  return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 }).format(hours);
}

const SKIPPED_REASON_LABELS: Record<keyof InvoiceProposalRes['skipped'], string> = {
  notApprovedCount: 'chưa duyệt',
  nonBillableCount: 'không tính phí',
  alreadyProposedCount: 'đã nằm trong đề nghị trước',
  missingRateCount: 'chưa tra được đơn giá',
};

/**
 * Màn "Tạo đề nghị xuất hóa đơn từ giờ công đã duyệt" của Kế toán (NCL-10-CN-001, Epic
 * NCL-10). Kế toán chọn dự án và một kỳ (khoảng ngày công); hệ thống gom các dòng giờ công
 * đã duyệt, có tính phí, chưa từng nằm trong đề nghị nào cùng các phiếu chi phí đã duyệt,
 * đã đánh dấu tính lại cho khách hàng thành một đề nghị kèm danh sách dòng và tổng tiền.
 * Chỉ áp dụng cho hợp đồng theo giờ (`TIME_AND_MATERIAL`) — backend tự từ chối loại khác.
 * Backend chưa có API đọc/liệt kê đề nghị (các story sau của Epic NCL-10), nên danh sách kết
 * quả bên dưới chỉ là các lần đã tạo TRONG PHIÊN LÀM VIỆC này, không phải toàn bộ lịch sử.
 */
export default function InvoiceProposalPage({
  currentUserRoles = [],
  currentUserName = 'Kế toán',
}: InvoiceProposalPageProps) {
  // NCL-10-CN-001 (TC-04): chỉ Kế toán (VT-05) được tạo đề nghị xuất hóa đơn.
  const isAllowed = currentUserRoles.includes('VT-05');

  const [projectId, setProjectId] = useState('');
  const [periodFrom, setPeriodFrom] = useState('');
  const [periodTo, setPeriodTo] = useState('');
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState<InvoiceProposalFormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [results, setResults] = useState<InvoiceProposalRes[]>([]);
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 8000);
  };

  const handleCreate = async () => {
    const validation = validateInvoiceProposalForm({ projectId, periodFrom, periodTo, note });
    if (Object.keys(validation).length > 0) {
      setErrors(validation);
      return;
    }

    setSubmitting(true);
    try {
      const result = await createInvoiceProposal(Number(projectId), {
        periodFrom,
        periodTo,
        note: note.trim() ? note.trim() : null,
      });
      setResults((prev) => [result, ...prev]);
      setNote('');
      setErrors({});
      const skipped = totalSkipped(result.skipped);
      showToast(
        skipped > 0
          ? `Đã tạo đề nghị ${result.proposalCode} — tổng ${formatAmount(result.totalAmount)}, đã bỏ qua ${skipped} dòng.`
          : `Đã tạo đề nghị ${result.proposalCode} — tổng ${formatAmount(result.totalAmount)} thành công.`,
        'success'
      );
    } catch (err) {
      const message =
        err instanceof InvoicesApiError || err instanceof Error
          ? err.message
          : 'Không thể tạo đề nghị xuất hóa đơn. Vui lòng thử lại.';
      showToast(message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isAllowed) {
    return (
      <div className="access-denied-container">
        <div className="access-denied-card">
          <div className="access-denied-icon">{ICONS.shieldOff}</div>
          <h2>Bạn không có thẩm quyền truy cập màn hình này</h2>
          <p>
            Chức năng Tạo đề nghị xuất hóa đơn từ giờ công chỉ dành riêng cho vai trò{' '}
            <strong>Kế toán</strong>. Hệ thống đã ghi lại lần truy cập bị từ chối này vào nhật ký bảo mật.
          </p>
          <div className="security-log-badge">
            <span className="security-log-badge__item">{ICONS.shield} Thời điểm: {new Date().toLocaleString('vi-VN')}</span>
            <span className="security-log-badge__item">Tài khoản: {currentUserName}</span>
            <span className="security-log-badge__item">Vai trò hiện tại: {roleLabels(currentUserRoles)}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="user-management-page" data-testid="invoice-proposal-page">
      {toast && (
        <div className={`toast-banner toast-banner--${toast.type}`} role="status">
          <span className="toast-banner__icon">{toast.type === 'success' ? ICONS.checkCircle : ICONS.alertTriangle}</span>
          <span>{toast.text}</span>
          <button type="button" className="toast-banner__close" aria-label="Đóng thông báo" onClick={() => setToast(null)}>
            {ICONS.close}
          </button>
        </div>
      )}

      <div className="page-header">
        <div>
          <h1 className="page-title">Tạo đề nghị xuất hóa đơn từ giờ công</h1>
          <p className="page-subtitle">
            Gom các dòng giờ công đã duyệt, có tính phí và các phiếu chi phí đã duyệt, đã đánh dấu tính lại
            cho khách hàng của một dự án trong một kỳ thành đề nghị xuất hóa đơn. Chỉ áp dụng cho hợp đồng
            theo giờ (Time &amp; Material).
          </p>
        </div>
      </div>

      <div className="user-table-card" style={{ padding: '20px', marginBottom: '16px' }}>
        <h3 style={{ margin: '0 0 12px', fontSize: '16px', fontWeight: 700 }}>Tạo đề nghị theo dự án và kỳ</h3>
        <div className="form-grid">
          <div>
            <label className="form-label" htmlFor="proposal-project-id">
              Mã dự án <span className="field-required">*</span>
            </label>
            <input
              id="proposal-project-id"
              type="number"
              min={1}
              placeholder="Ví dụ: 1"
              className={`form-input ${errors.projectId ? 'form-input--error' : ''}`}
              value={projectId}
              onChange={(e) => {
                setProjectId(e.target.value);
                setErrors((prev) => ({ ...prev, projectId: undefined }));
              }}
              disabled={submitting}
              data-testid="proposal-project-id-input"
            />
            {errors.projectId && (
              <p className="field-error" data-testid="error-proposal-project-id" style={{ color: 'var(--pale-red-fg)', fontSize: '13px', marginTop: '4px' }}>
                {errors.projectId}
              </p>
            )}
          </div>
          <div>
            <label className="form-label" htmlFor="proposal-period-from">
              Từ ngày <span className="field-required">*</span>
            </label>
            <input
              id="proposal-period-from"
              type="date"
              className={`form-input ${errors.periodFrom ? 'form-input--error' : ''}`}
              value={periodFrom}
              onChange={(e) => {
                setPeriodFrom(e.target.value);
                setErrors((prev) => ({ ...prev, periodFrom: undefined, periodTo: undefined }));
              }}
              disabled={submitting}
              data-testid="proposal-period-from-input"
            />
            {errors.periodFrom && (
              <p className="field-error" data-testid="error-proposal-period-from" style={{ color: 'var(--pale-red-fg)', fontSize: '13px', marginTop: '4px' }}>
                {errors.periodFrom}
              </p>
            )}
          </div>
          <div>
            <label className="form-label" htmlFor="proposal-period-to">
              Đến ngày <span className="field-required">*</span>
            </label>
            <input
              id="proposal-period-to"
              type="date"
              className={`form-input ${errors.periodTo ? 'form-input--error' : ''}`}
              value={periodTo}
              onChange={(e) => {
                setPeriodTo(e.target.value);
                setErrors((prev) => ({ ...prev, periodTo: undefined }));
              }}
              disabled={submitting}
              data-testid="proposal-period-to-input"
            />
            {errors.periodTo && (
              <p className="field-error" data-testid="error-proposal-period-to" style={{ color: 'var(--pale-red-fg)', fontSize: '13px', marginTop: '4px' }}>
                {errors.periodTo}
              </p>
            )}
          </div>
          <div>
            <label className="form-label" htmlFor="proposal-note">
              Ghi chú
            </label>
            <input
              id="proposal-note"
              type="text"
              placeholder="Ví dụ: Kỳ tháng 9"
              className={`form-input ${errors.note ? 'form-input--error' : ''}`}
              value={note}
              onChange={(e) => {
                setNote(e.target.value);
                setErrors((prev) => ({ ...prev, note: undefined }));
              }}
              disabled={submitting}
              data-testid="proposal-note-input"
            />
            {errors.note && (
              <p className="field-error" data-testid="error-proposal-note" style={{ color: 'var(--pale-red-fg)', fontSize: '13px', marginTop: '4px' }}>
                {errors.note}
              </p>
            )}
          </div>
        </div>
        <div style={{ marginTop: '12px' }}>
          <button
            type="button"
            className="btn-primary"
            onClick={() => void handleCreate()}
            disabled={submitting}
            data-testid="btn-create-invoice-proposal"
          >
            {ICONS.receipt} {submitting ? 'Đang tạo…' : 'Tạo đề nghị xuất hóa đơn'}
          </button>
          <p className="field-hint" style={{ marginTop: '8px', fontSize: '12.5px' }}>
            Tạo lại đề nghị cho cùng một kỳ là hợp lệ — chỉ các dòng mới duyệt thêm được gom vào đề nghị mới.
          </p>
        </div>
      </div>

      <div className="user-table-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px 0' }}>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--ink-strong)' }}>
            Đề nghị đã tạo trong phiên này
          </h3>
        </div>

        {results.length === 0 ? (
          <div className="table-empty-state" data-testid="invoice-proposal-empty">
            <span className="empty-icon">{ICONS.receipt}</span>
            <h3>Chưa có đề nghị nào được tạo trong phiên này</h3>
            <p>Dùng biểu mẫu "Tạo đề nghị theo dự án và kỳ" phía trên để bắt đầu.</p>
          </div>
        ) : (
          <div style={{ padding: '16px 20px' }}>
            {results.map((result) => {
              const skippedTotal = totalSkipped(result.skipped);
              return (
                <div
                  key={result.id}
                  className="user-table-card"
                  style={{ padding: '16px', marginBottom: '16px', border: '1px solid var(--line)' }}
                  data-testid={`invoice-proposal-result-${result.id}`}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
                    <div>
                      <strong style={{ fontSize: '15px' }}>{result.proposalCode}</strong>{' '}
                      <span
                        className={`status-pill ${INVOICE_PROPOSAL_STATUS_PILL_CLASS[result.status]}`}
                        data-testid={`invoice-proposal-status-${result.id}`}
                      >
                        <i className="status-pill__dot" />
                        {INVOICE_PROPOSAL_STATUS_LABELS[result.status]}
                      </span>
                      <div className="field-hint" style={{ fontSize: '12.5px', marginTop: '4px' }}>
                        Dự án #{result.projectId} · Kỳ {result.periodFrom} → {result.periodTo} · Tạo lúc{' '}
                        {new Date(result.createdAt).toLocaleString('vi-VN')}
                        {result.note ? ` · Ghi chú: ${result.note}` : ''}
                      </div>
                    </div>
                    <span className="field-hint" style={{ fontSize: '13px', textAlign: 'right' }}>
                      Giờ công: <strong>{formatAmount(result.laborAmount)}</strong>
                      {' · '}Chi phí: <strong>{formatAmount(result.expenseAmount)}</strong>
                      <br />
                      Tổng cộng: <strong>{formatAmount(result.totalAmount)}</strong>
                    </span>
                  </div>

                  {skippedTotal > 0 && (
                    <div
                      className="toast-banner toast-banner--error"
                      style={{ position: 'static', marginBottom: '12px' }}
                      data-testid={`invoice-proposal-skipped-${result.id}`}
                    >
                      <span className="toast-banner__icon">{ICONS.alertTriangle}</span>
                      <span>
                        Đã bỏ qua {skippedTotal} dòng giờ công:{' '}
                        {(Object.keys(result.skipped) as Array<keyof typeof result.skipped>)
                          .filter((key) => result.skipped[key] > 0)
                          .map((key) => `${result.skipped[key]} ${SKIPPED_REASON_LABELS[key]}`)
                          .join(', ')}
                        .
                        {result.skipped.notApprovedCount > 0 &&
                          ' Đề nghị Quản lý dự án duyệt nốt bảng chấm công rồi tạo lại đề nghị cho các dòng còn lại.'}
                        {result.skipped.missingRateCount > 0 &&
                          ' Bổ sung cấp bậc nhân sự / đơn giá cho các dòng chưa tra được đơn giá.'}
                      </span>
                    </div>
                  )}

                  {result.laborLines.length > 0 && (
                    <div className="table-responsive" style={{ marginBottom: '12px' }}>
                      <h4 style={{ margin: '0 0 8px', fontSize: '13.5px' }}>Dòng giờ công</h4>
                      <table className="user-data-table">
                        <thead>
                          <tr>
                            <th>Ngày công</th>
                            <th>Nhân sự</th>
                            <th>Mô tả</th>
                            <th style={{ textAlign: 'right' }}>Số giờ</th>
                            <th style={{ textAlign: 'right' }}>Đơn giá</th>
                            <th style={{ textAlign: 'right' }}>Thành tiền</th>
                          </tr>
                        </thead>
                        <tbody>
                          {result.laborLines.map((line) => (
                            <tr key={line.id} data-testid={`invoice-proposal-labor-line-${result.id}-${line.id}`}>
                              <td>{line.lineDate}</td>
                              <td>{line.userId != null ? `NS #${line.userId}` : '—'}</td>
                              <td>{line.description}</td>
                              <td style={{ textAlign: 'right' }}>{line.hours != null ? `${formatHours(line.hours)} giờ` : '—'}</td>
                              <td style={{ textAlign: 'right' }}>{line.unitRate != null ? formatAmount(line.unitRate) : '—'}</td>
                              <td style={{ textAlign: 'right' }}>
                                <strong>{formatAmount(line.amount)}</strong>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {result.expenseLines.length > 0 && (
                    <div className="table-responsive">
                      <h4 style={{ margin: '0 0 8px', fontSize: '13.5px' }}>Dòng chi phí tính lại cho khách hàng</h4>
                      <table className="user-data-table">
                        <thead>
                          <tr>
                            <th>Ngày phát sinh</th>
                            <th>Mô tả</th>
                            <th style={{ textAlign: 'right' }}>Thành tiền</th>
                          </tr>
                        </thead>
                        <tbody>
                          {result.expenseLines.map((line) => (
                            <tr key={line.id} data-testid={`invoice-proposal-expense-line-${result.id}-${line.id}`}>
                              <td>{line.lineDate}</td>
                              <td>{line.description}</td>
                              <td style={{ textAlign: 'right' }}>
                                <strong>{formatAmount(line.amount)}</strong>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {result.laborLines.length === 0 && result.expenseLines.length === 0 && (
                    <p className="field-hint" style={{ fontSize: '12.5px' }}>
                      Đề nghị không có dòng nào hiển thị.
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
