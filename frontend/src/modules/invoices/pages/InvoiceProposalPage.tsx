import { useState } from 'react';
import type { FormEvent } from 'react';
import { ICONS } from '../../../components/common/icons';
import { roleLabels } from '../../../utils/roleLabel';
import type { InvoiceProposalRes } from '../types/invoiceTypes';
import { createInvoiceProposal, InvoicesApiError } from '../api/invoicesApi';
import { validateProposalForm } from '../validators/invoiceValidators';

interface Props {
  currentUserRoles?: string[];
  currentUserName?: string;
}

function formatAmount(value: number | null | undefined): string {
  if (value == null) return '—';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value);
}

function formatDate(value?: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString('vi-VN');
}

/**
 * NCL-10-CN-001 — Đề xuất hóa đơn: gom giờ công đã duyệt + chi phí dự án đã duyệt
 * tính phí khách hàng, phát sinh trong một kỳ của MỘT dự án (chỉ hợp đồng
 * TIME_AND_MATERIAL), thành một đề xuất để Kế toán rà soát trước khi lập hóa đơn
 * thật (bước lập hóa đơn thật từ đề xuất là story tương lai của Epic 10 — trang này
 * dừng ở bước tạo & xem đề xuất, đúng phạm vi API đã có).
 *
 * Không có API liệt kê toàn bộ dự án cho Kế toán, nên nhập trực tiếp ID dự án
 * (xem cột "ID" ở trang chi tiết dự án) — cùng cách ContractRateManager từng làm
 * với hợp đồng trước khi mở GET /contracts cho VT-07.
 */
export default function InvoiceProposalPage({ currentUserRoles = [], currentUserName = 'Người dùng' }: Props) {
  const isAllowed = currentUserRoles.includes('VT-05');

  const [projectId, setProjectId] = useState('');
  const [periodFrom, setPeriodFrom] = useState('');
  const [periodTo, setPeriodTo] = useState('');
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [result, setResult] = useState<InvoiceProposalRes | null>(null);

  if (!isAllowed) {
    return (
      <div className="access-denied-container" data-testid="invoice-proposal-access-denied">
        <div className="access-denied-card">
          <div className="access-denied-icon">{ICONS.shieldOff}</div>
          <h2>Bạn không có thẩm quyền đề xuất hóa đơn</h2>
          <p>Chức năng này chỉ dành riêng cho <strong>Kế toán</strong> (VT-05).</p>
          <div className="security-log-badge">
            <span className="security-log-badge__item">Tài khoản: {currentUserName}</span>
            <span className="security-log-badge__item">
              Vai trò tài khoản: {roleLabels(currentUserRoles) || '(không xác định)'}
            </span>
          </div>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitError(null);
    setResult(null);

    const id = Number(projectId);
    const formErrors: Record<string, string> = {};
    if (!Number.isFinite(id) || id <= 0) formErrors.projectId = 'Nhập đúng ID dự án (số nguyên dương)';
    const periodResult = validateProposalForm({ periodFrom, periodTo });
    setErrors({ ...formErrors, ...periodResult.errors });
    if (Object.keys(formErrors).length > 0 || !periodResult.isValid) return;

    setSubmitting(true);
    try {
      const proposal = await createInvoiceProposal(id, { periodFrom, periodTo, note: note.trim() || null });
      setResult(proposal);
    } catch (err) {
      setSubmitError(err instanceof InvoicesApiError ? err.message : 'Không tạo được đề xuất hóa đơn. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="user-management-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Đề xuất hóa đơn</h1>
          <p className="page-subtitle">
            Gom giờ công và chi phí đã duyệt, chưa từng đề xuất, phát sinh trong một kỳ của một dự án
            (chỉ áp dụng hợp đồng Time &amp; Material).
          </p>
        </div>
      </div>

      <div className="user-table-card" style={{ padding: '20px' }}>
        {submitError && (
          <div className="alert-box alert-box--danger" role="alert" style={{ marginBottom: '14px' }}>
            {submitError}
          </div>
        )}

        <form onSubmit={(e) => void handleSubmit(e)} style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="milestone-field" style={{ minWidth: '160px' }}>
            <label className="form-label" htmlFor="proposal-project-id">ID dự án</label>
            <input
              id="proposal-project-id"
              type="number"
              className={`form-input ${errors.projectId ? 'form-input--error' : ''}`}
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              min={1}
            />
            {errors.projectId && <span className="field-error">{errors.projectId}</span>}
          </div>
          <div className="milestone-field" style={{ minWidth: '160px' }}>
            <label className="form-label" htmlFor="proposal-from">Từ ngày</label>
            <input
              id="proposal-from"
              type="date"
              className={`form-input ${errors.periodFrom ? 'form-input--error' : ''}`}
              value={periodFrom}
              onChange={(e) => setPeriodFrom(e.target.value)}
            />
            {errors.periodFrom && <span className="field-error">{errors.periodFrom}</span>}
          </div>
          <div className="milestone-field" style={{ minWidth: '160px' }}>
            <label className="form-label" htmlFor="proposal-to">Đến ngày</label>
            <input
              id="proposal-to"
              type="date"
              className={`form-input ${errors.periodTo ? 'form-input--error' : ''}`}
              value={periodTo}
              onChange={(e) => setPeriodTo(e.target.value)}
            />
            {errors.periodTo && <span className="field-error">{errors.periodTo}</span>}
          </div>
          <div className="milestone-field" style={{ flex: '1 1 200px' }}>
            <label className="form-label" htmlFor="proposal-note">Ghi chú</label>
            <input
              id="proposal-note"
              className="form-input"
              placeholder="Không bắt buộc"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting ? 'Đang tạo…' : 'Tạo đề xuất'}
          </button>
        </form>
      </div>

      {result && (
        <div className="user-table-card" style={{ marginTop: '16px', padding: '20px' }} data-testid="invoice-proposal-result">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '12px' }}>
            <strong style={{ fontSize: '16px' }}>{result.proposalCode}</strong>
            <span className="badge badge--blue">{formatAmount(result.totalAmount)}</span>
            <span className="cell-muted">
              {formatDate(result.periodFrom)} → {formatDate(result.periodTo)}
            </span>
          </div>

          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-card__icon stat-card__icon--purple">{ICONS.clock}</div>
              <div>
                <span className="stat-card__label">Tiền công</span>
                <div className="stat-card__value">{formatAmount(result.laborAmount)}</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-card__icon stat-card__icon--amber">{ICONS.money}</div>
              <div>
                <span className="stat-card__label">Chi phí</span>
                <div className="stat-card__value">{formatAmount(result.expenseAmount)}</div>
              </div>
            </div>
          </div>

          <h4 style={{ fontSize: '13.5px', fontWeight: 600, margin: '16px 0 8px' }}>Dòng giờ công</h4>
          {result.laborLines.length === 0 ? (
            <p className="cell-muted">Không có dòng giờ công nào đủ điều kiện.</p>
          ) : (
            <div className="table-responsive">
              <table className="user-data-table">
                <thead>
                  <tr>
                    <th>Ngày</th>
                    <th style={{ textAlign: 'right' }}>Số giờ</th>
                    <th style={{ textAlign: 'right' }}>Đơn giá</th>
                    <th style={{ textAlign: 'right' }}>Thành tiền</th>
                  </tr>
                </thead>
                <tbody>
                  {result.laborLines.map((line) => (
                    <tr key={line.id}>
                      <td>{formatDate(line.lineDate)}</td>
                      <td style={{ textAlign: 'right' }}>{line.hours ?? '—'}</td>
                      <td style={{ textAlign: 'right' }}>{formatAmount(line.unitRate)}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatAmount(line.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <h4 style={{ fontSize: '13.5px', fontWeight: 600, margin: '16px 0 8px' }}>Dòng chi phí</h4>
          {result.expenseLines.length === 0 ? (
            <p className="cell-muted">Không có dòng chi phí nào đủ điều kiện.</p>
          ) : (
            <div className="table-responsive">
              <table className="user-data-table">
                <thead>
                  <tr>
                    <th>Ngày</th>
                    <th>Mô tả</th>
                    <th style={{ textAlign: 'right' }}>Thành tiền</th>
                  </tr>
                </thead>
                <tbody>
                  {result.expenseLines.map((line) => (
                    <tr key={line.id}>
                      <td>{formatDate(line.lineDate)}</td>
                      <td>{line.description || '—'}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatAmount(line.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {result.skipped.notApprovedCount + result.skipped.nonBillableCount + result.skipped.alreadyProposedCount + result.skipped.missingRateCount > 0 && (
            <div className="alert-box alert-box--info" style={{ marginTop: '16px' }}>
              <span className="icon-xs">{ICONS.info}</span> Đã bỏ qua: {result.skipped.notApprovedCount} dòng chưa
              duyệt · {result.skipped.nonBillableCount} dòng không tính phí · {result.skipped.alreadyProposedCount} dòng
              đã có trong đề nghị trước · {result.skipped.missingRateCount} dòng chưa có đơn giá.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
