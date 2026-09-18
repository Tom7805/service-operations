import { useState } from 'react';
import { ICONS } from '../../../components/common/icons';
import { roleLabels } from '../../../utils/roleLabel';
import { runOverheadAllocation, ExpensesApiError } from '../api/expensesApi';
import type { OverheadAllocationRes } from '../types/expenseTypes';
import { validateOverheadAllocationForm, type OverheadAllocationFormErrors } from '../validators/expenseValidators';

export interface OverheadAllocationPageProps {
  currentUserRoles?: string[];
  currentUserName?: string;
}

const MONTH_LABELS = [
  'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
  'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12',
];

function formatAmount(amount: number): string {
  return new Intl.NumberFormat('vi-VN').format(amount) + ' đ';
}

function formatHours(hours: number): string {
  return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 }).format(hours);
}

function periodLabel(periodStart: string): string {
  const [year, month] = periodStart.split('-').map(Number);
  return `${MONTH_LABELS[month - 1]}/${year}`;
}

/**
 * Màn "Phân bổ chi phí chung" của Kế toán (NCL-08-CN-005). Kỳ tính theo tháng (giống NCL-06-
 * CN-006): Kế toán nhập tổng chi phí chung phát sinh trong kỳ, hệ thống chia theo tỷ trọng
 * giờ công ĐÃ DUYỆT của từng dự án trong kỳ đó. Mỗi kỳ chỉ được phân bổ một lần (`400
 * DUPLICATE_DATA` nếu chạy lại); kỳ chưa có giờ công nào được duyệt bị từ chối (`400
 * INVALID_STATE`). Backend không có endpoint đọc lại lịch sử — danh sách kết quả bên dưới
 * chỉ là các lần đã chạy TRONG PHIÊN LÀM VIỆC này, không phải toàn bộ lịch sử từ máy chủ.
 */
export default function OverheadAllocationPage({
  currentUserRoles = [],
  currentUserName = 'Kế toán',
}: OverheadAllocationPageProps) {
  // NCL-08-CN-005: chỉ Kế toán (VT-05) được chạy phân bổ chi phí chung.
  const isAllowed = currentUserRoles.includes('VT-05');

  const now = new Date();
  const [year, setYear] = useState(String(now.getFullYear()));
  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [totalAmount, setTotalAmount] = useState('');
  const [errors, setErrors] = useState<OverheadAllocationFormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [results, setResults] = useState<OverheadAllocationRes[]>([]);
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 8000);
  };

  const handleRun = async () => {
    const validation = validateOverheadAllocationForm({ year, month, totalAmount });
    if (Object.keys(validation).length > 0) {
      setErrors(validation);
      return;
    }

    const yearNum = Number(year);
    const monthNum = Number(month);
    const amountNum = Number(totalAmount);
    const confirmed = window.confirm(
      `Phân bổ ${formatAmount(amountNum)} chi phí chung cho kỳ ${MONTH_LABELS[monthNum - 1]}/${yearNum} theo tỷ trọng giờ công đã duyệt? Mỗi kỳ chỉ phân bổ được MỘT LẦN, không thể chạy lại hay hoàn tác.`
    );
    if (!confirmed) return;

    setSubmitting(true);
    try {
      const result = await runOverheadAllocation({ year: yearNum, month: monthNum, totalAmount: amountNum });
      setResults((prev) => [result, ...prev]);
      setTotalAmount('');
      setErrors({});
      showToast(
        `Đã phân bổ ${formatAmount(result.totalAmount)} cho ${result.allocations.length} dự án trong kỳ ${periodLabel(result.periodStart)} thành công.`,
        'success'
      );
    } catch (err) {
      const message =
        err instanceof ExpensesApiError || err instanceof Error
          ? err.message
          : 'Không thể phân bổ chi phí chung. Vui lòng thử lại.';
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
            Chức năng Phân bổ chi phí chung chỉ dành riêng cho vai trò <strong>Kế toán</strong>. Hệ thống đã
            ghi lại lần truy cập bị từ chối này vào nhật ký bảo mật.
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
    <div className="user-management-page" data-testid="overhead-allocation-page">
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
          <h1 className="page-title">Phân bổ chi phí chung</h1>
          <p className="page-subtitle">
            Chia tổng chi phí chung phát sinh trong kỳ (tháng) cho các dự án theo tỷ trọng giờ công đã
            duyệt. Mỗi kỳ chỉ phân bổ được một lần và không thể hoàn tác.
          </p>
        </div>
      </div>

      <div className="user-table-card" style={{ padding: '20px', marginBottom: '16px' }}>
        <h3 style={{ margin: '0 0 12px', fontSize: '16px', fontWeight: 700 }}>Chạy phân bổ theo kỳ</h3>
        <div className="form-grid">
          <div>
            <label className="form-label" htmlFor="overhead-year">
              Năm <span className="field-required">*</span>
            </label>
            <input
              id="overhead-year"
              type="number"
              min={2000}
              className={`form-input ${errors.year ? 'form-input--error' : ''}`}
              value={year}
              onChange={(e) => {
                setYear(e.target.value);
                setErrors((prev) => ({ ...prev, year: undefined }));
              }}
              disabled={submitting}
              data-testid="overhead-year-input"
            />
            {errors.year && (
              <p className="field-error" data-testid="error-overhead-year" style={{ color: '#DC2626', fontSize: '13px', marginTop: '4px' }}>
                {errors.year}
              </p>
            )}
          </div>
          <div>
            <label className="form-label" htmlFor="overhead-month">
              Tháng <span className="field-required">*</span>
            </label>
            <select
              id="overhead-month"
              className={`form-select ${errors.month ? 'form-input--error' : ''}`}
              value={month}
              onChange={(e) => {
                setMonth(e.target.value);
                setErrors((prev) => ({ ...prev, month: undefined }));
              }}
              disabled={submitting}
              data-testid="overhead-month-select"
            >
              {MONTH_LABELS.map((label, index) => (
                <option key={label} value={index + 1}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="form-label" htmlFor="overhead-amount">
              Tổng chi phí chung (đ) <span className="field-required">*</span>
            </label>
            <input
              id="overhead-amount"
              type="number"
              min="0.01"
              step="0.01"
              placeholder="0"
              className={`form-input ${errors.totalAmount ? 'form-input--error' : ''}`}
              value={totalAmount}
              onChange={(e) => {
                setTotalAmount(e.target.value);
                setErrors((prev) => ({ ...prev, totalAmount: undefined }));
              }}
              disabled={submitting}
              data-testid="overhead-amount-input"
            />
            {errors.totalAmount && (
              <p className="field-error" data-testid="error-overhead-amount" style={{ color: '#DC2626', fontSize: '13px', marginTop: '4px' }}>
                {errors.totalAmount}
              </p>
            )}
          </div>
        </div>
        <div style={{ marginTop: '12px' }}>
          <button
            type="button"
            className="btn-primary"
            onClick={() => void handleRun()}
            disabled={submitting}
            data-testid="btn-run-overhead-allocation"
          >
            {ICONS.chart} {submitting ? 'Đang phân bổ…' : 'Phân bổ chi phí chung'}
          </button>
          <p className="field-hint" style={{ marginTop: '8px', fontSize: '12.5px' }}>
            Chỉ các dự án có giờ công đã duyệt phát sinh trong kỳ mới nhận được một phần chi phí chung.
          </p>
        </div>
      </div>

      <div className="user-table-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px 0' }}>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#1E293B' }}>
            Kết quả các lần đã chạy trong phiên này
          </h3>
        </div>

        {results.length === 0 ? (
          <div className="table-empty-state" data-testid="overhead-allocation-empty">
            <span className="empty-icon">{ICONS.chart}</span>
            <h3>Chưa có lần phân bổ nào trong phiên này</h3>
            <p>Dùng biểu mẫu "Chạy phân bổ theo kỳ" phía trên để bắt đầu.</p>
          </div>
        ) : (
          <div style={{ padding: '16px 20px' }}>
            {results.map((result) => (
              <div
                key={result.id}
                className="user-table-card"
                style={{ padding: '16px', marginBottom: '16px', border: '1px solid #E2E8F0' }}
                data-testid={`overhead-allocation-result-${result.id}`}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
                  <div>
                    <strong style={{ fontSize: '15px' }}>Kỳ {periodLabel(result.periodStart)}</strong>
                    <div className="field-hint" style={{ fontSize: '12.5px' }}>
                      {result.periodStart} → {result.periodEnd} · Chạy lúc {new Date(result.createdAt).toLocaleString('vi-VN')}
                    </div>
                  </div>
                  <span className="field-hint" style={{ fontSize: '13px' }}>
                    Tổng: <strong>{formatAmount(result.totalAmount)}</strong> · {result.allocations.length} dự án
                  </span>
                </div>

                <div className="table-responsive">
                  <table className="user-data-table">
                    <thead>
                      <tr>
                        <th>Dự án</th>
                        <th style={{ textAlign: 'right' }}>Giờ công đã duyệt</th>
                        <th style={{ textAlign: 'right' }}>Chi phí chung được phân bổ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.allocations.map((line) => (
                        <tr key={line.projectId} data-testid={`overhead-allocation-line-${result.id}-${line.projectId}`}>
                          <td>Dự án #{line.projectId}</td>
                          <td style={{ textAlign: 'right' }}>{formatHours(line.approvedHours)} giờ</td>
                          <td style={{ textAlign: 'right' }}>
                            <strong>{formatAmount(line.allocatedAmount)}</strong>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
