import { useState } from 'react';
import type {
  Opportunity,
  QuoteItemReq,
  QuoteRes,
} from '../types/opportunityTypes';
import {
  POPULAR_PROFESSIONAL_ROLES,
  STAGE_CONFIGS,
} from '../types/opportunityTypes';
import {
  validateQuoteCreate,
  convertVNDToWords,
} from '../validators/opportunityValidators';
import { createOpportunityQuote, QuoteApiError } from '../api/quotesApi';
import { ICONS } from '../../../components/common/icons';

interface QuoteBuilderProps {
  opportunity: Opportunity;
  isOpen: boolean;
  onClose: () => void;
  onQuoteCreated?: (created: QuoteRes) => void;
  currentUserRoles?: string[];
  initialQuote?: QuoteRes | null;
}

export default function QuoteBuilder({
  opportunity,
  isOpen,
  onClose,
  onQuoteCreated,
  currentUserRoles = ['VT-04'],
  initialQuote = null,
}: QuoteBuilderProps) {
  const isAllowedRole = currentUserRoles.includes('VT-04');
  const isProposalStage = opportunity.stage === 'PROPOSAL';

  // Danh sách dòng công việc đang nhập
  const [items, setItems] = useState<QuoteItemReq[]>([
    { professionalRole: 'Lập trình viên cao cấp', workDays: 20 },
    { professionalRole: 'Kỹ sư kiểm thử phần mềm', workDays: 10 },
  ]);

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Kết quả báo giá vừa tạo hoặc truyền sẵn
  const [latestQuote, setLatestQuote] = useState<QuoteRes | null>(initialQuote);
  const [isEditingNewVersion, setIsEditingNewVersion] = useState(false);

  if (!isOpen) return null;

  const handleAddItem = () => {
    setItems((prev) => [...prev, { professionalRole: '', workDays: 10 }]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next[`items[${index}].professionalRole`];
      delete next[`items[${index}].workDays`];
      return next;
    });
  };

  const handleItemChange = (index: number, field: keyof QuoteItemReq, value: string | number) => {
    setItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;
        return {
          ...item,
          [field]: field === 'workDays' ? (value === '' ? ('' as unknown as number) : Number(value)) : value,
        };
      })
    );

    const errorKey = `items[${index}].${field}`;
    if (fieldErrors[errorKey]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[errorKey];
        return next;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);
    setGeneralError(null);

    // Kiểm tra điều kiện giai đoạn bắt buộc PROPOSAL (NCL-03-CN-003)
    if (!isProposalStage) {
      setGeneralError(
        `Quy tắc QTN-06: Cơ hội phải đang ở giai đoạn Đề xuất giải pháp (PROPOSAL) để lập báo giá. Cơ hội hiện tại đang ở giai đoạn "${STAGE_CONFIGS[opportunity.stage as keyof typeof STAGE_CONFIGS]?.shortLabel ?? opportunity.stage}".`
      );
      return;
    }

    // Client-side validation
    const validation = validateQuoteCreate(items);
    if (!validation.valid) {
      setFieldErrors(validation.fieldErrors);
      setGeneralError(validation.generalError || 'Vui lòng kiểm tra lại thông tin các dòng');
      return;
    }

    setSubmitting(true);

    try {
      const result = await createOpportunityQuote(opportunity.id, { items });
      setLatestQuote(result);
      setIsEditingNewVersion(false);
      if (onQuoteCreated) {
        onQuoteCreated(result);
      }
    } catch (err) {
      if (err instanceof QuoteApiError) {
        setServerError(err.message);
      } else if (err instanceof Error) {
        setServerError(err.message);
      } else {
        setServerError('Không thể tạo báo giá cho cơ hội. Vui lòng thử lại sau.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (amount: number | null | undefined): string => {
    if (amount === null || amount === undefined) return '—';
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  };

  return (
    <div
      className="modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting) {
          onClose();
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="quote-builder-title"
    >
      <div className="modal-card" style={{ maxWidth: '820px', maxHeight: '90vh' }}>
        {/* Header modal */}
        <div className="modal-header">
          <div className="modal-header__title-wrap">
            <h3 id="quote-builder-title" className="modal-title">
              <span className="modal-title__icon" aria-hidden="true">
                {ICONS.receipt}
              </span>
              Lập báo giá cho cơ hội
            </h3>
            <p className="field-hint" style={{ marginTop: '4px' }}>
              Dự toán nhân lực theo ngày công. Hệ thống tự động tra cứu đơn giá bán hiệu lực và tính thành tiền.
            </p>
          </div>
          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            disabled={submitting}
            aria-label="Đóng cửa sổ"
          >
            {ICONS.close}
          </button>
        </div>

        {/* Thanh tóm tắt cơ hội */}
        <div
          style={{
            padding: '12px 24px',
            background: 'var(--surface-alt)',
            borderBottom: '1px solid var(--line)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '13.5px',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div>
            <span style={{ color: 'var(--ink-muted)' }}>Cơ hội: </span>
            {opportunity.code && (
              <span
                style={{
                  fontFamily: 'var(--font-mono, monospace)',
                  fontWeight: 600,
                  marginRight: '6px',
                  color: 'var(--ink-strong)',
                }}
              >
                [{opportunity.code}]
              </span>
            )}
            <strong style={{ color: 'var(--ink-strong)' }}>{opportunity.name}</strong>
            {opportunity.customerName && (
              <span style={{ color: 'var(--ink-soft)' }}> — {opportunity.customerName}</span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '12.5px', color: 'var(--ink-muted)' }}>Giai đoạn:</span>
            <span
              style={{
                padding: '2px 8px',
                borderRadius: '999px',
                fontSize: '12px',
                fontWeight: 600,
                background: isProposalStage ? 'var(--pale-blue-bg)' : 'var(--surface-sunken)',
                color: isProposalStage ? 'var(--pale-blue-fg)' : 'var(--ink-muted)',
                border: '1px solid var(--line)',
              }}
            >
              {STAGE_CONFIGS[opportunity.stage as keyof typeof STAGE_CONFIGS]?.shortLabel ?? opportunity.stage}
            </span>
          </div>
        </div>

        {/* Datalist gợi ý vai trò chuyên môn */}
        <datalist id="popular-roles-suggestions">
          {POPULAR_PROFESSIONAL_ROLES.map((role) => (
            <option key={role} value={role} />
          ))}
        </datalist>

        <div className="modal-body">
          {/* Cảnh báo nếu cơ hội KHÔNG ở giai đoạn PROPOSAL */}
          {!isProposalStage && (
            <div
              className="alert-box alert-box--warning"
              role="alert"
              style={{
                marginBottom: '16px',
                padding: '12px 14px',
                background: 'var(--pale-yellow-bg)',
                color: 'var(--pale-yellow-fg)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid rgba(149, 100, 0, 0.25)',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
                fontSize: '13.5px',
                lineHeight: '1.5',
              }}
            >
              <span style={{ flexShrink: 0, marginTop: '2px' }}>{ICONS.alertTriangle}</span>
              <div>
                <strong>Quy định nghiệp vụ (NCL-03-CN-003):</strong> Báo giá chỉ được phép khởi tạo khi cơ hội
                ở giai đoạn <strong>Đề xuất giải pháp (PROPOSAL)</strong>. Cơ hội hiện tại đang ở giai đoạn{' '}
                <code>{opportunity.stage}</code>. Vui lòng chuyển giai đoạn cơ hội sang Đề xuất trước khi tạo báo giá.
              </div>
            </div>
          )}

          {/* Cảnh báo phân quyền nếu không có vai trò VT-04 */}
          {!isAllowedRole && (
            <div
              className="alert-box alert-box--danger"
              role="alert"
              style={{
                marginBottom: '16px',
                padding: '10px 14px',
                background: 'var(--pale-red-bg)',
                color: 'var(--pale-red-fg)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid rgba(159, 47, 45, 0.2)',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
                fontSize: '13.5px',
              }}
            >
              <span style={{ flexShrink: 0, marginTop: '2px' }}>{ICONS.lock}</span>
              <div>
                <strong>Từ chối truy cập:</strong> Chức năng lập báo giá yêu cầu vai trò Nhân viên kinh doanh
                (<code>VT-04</code>).
              </div>
            </div>
          )}

          {/* Thông báo lỗi server hoặc validation tổng */}
          {(serverError || generalError) && (
            <div
              className="alert-box alert-box--danger"
              role="alert"
              style={{
                marginBottom: '16px',
                padding: '10px 14px',
                background: 'var(--pale-red-bg)',
                color: 'var(--pale-red-fg)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid rgba(159, 47, 45, 0.2)',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
                fontSize: '13.5px',
              }}
            >
              <span style={{ flexShrink: 0, marginTop: '2px' }}>{ICONS.alertTriangle}</span>
              <div>{serverError || generalError}</div>
            </div>
          )}

          {/* Hiển thị kết quả báo giá vừa tạo (nếu có và không trong chế độ chỉnh sửa tạo mới) */}
          {latestQuote && !isEditingNewVersion ? (
            <div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span
                    style={{
                      padding: '3px 10px',
                      background: 'var(--pale-green-bg)',
                      color: 'var(--pale-green-fg)',
                      borderRadius: '999px',
                      fontSize: '12.5px',
                      fontWeight: 600,
                    }}
                  >
                    Báo giá Phiên bản #{latestQuote.version}
                  </span>
                  <span style={{ fontSize: '13px', color: 'var(--ink-muted)' }}>
                    Lập bởi @{latestQuote.createdBy || 'sale01'}
                  </span>
                </div>

                {isProposalStage && isAllowedRole && (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setIsEditingNewVersion(true)}
                    style={{ fontSize: '12.5px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  >
                    <span className="icon-sm">{ICONS.plus}</span>
                    <span>Tạo phiên bản báo giá mới</span>
                  </button>
                )}
              </div>

              {/* Cảnh báo missingRates nếu có */}
              {latestQuote.missingRates && latestQuote.missingRates.length > 0 && (
                <div
                  style={{
                    marginBottom: '16px',
                    padding: '12px 14px',
                    background: 'var(--pale-yellow-bg)',
                    color: 'var(--pale-yellow-fg)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid rgba(149, 100, 0, 0.25)',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px',
                    fontSize: '13.5px',
                  }}
                >
                  <span style={{ flexShrink: 0, marginTop: '2px' }}>{ICONS.alertTriangle}</span>
                  <div>
                    <strong>Cảnh báo chưa có đơn giá hiệu lực (TC-02):</strong>
                    <p style={{ margin: '4px 0 0' }}>
                      Các vai trò sau chưa được cấu hình đơn giá bán:{' '}
                      <strong>{latestQuote.missingRates.join(', ')}</strong>. Các dòng này được đánh dấu{' '}
                      <code>priced: false</code> và <strong>không được cộng vào tổng tiền báo giá</strong>.
                    </p>
                  </div>
                </div>
              )}

              {/* Bảng chi tiết kết quả báo giá */}
              <div
                style={{
                  border: '1px solid var(--line)',
                  borderRadius: 'var(--radius-md)',
                  overflow: 'hidden',
                  marginBottom: '16px',
                }}
              >
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13.5px' }}>
                  <thead>
                    <tr style={{ background: 'var(--surface-alt)', borderBottom: '1px solid var(--line)' }}>
                      <th style={{ padding: '10px 14px', textAlign: 'center', width: '48px' }}>#</th>
                      <th style={{ padding: '10px 14px', textAlign: 'left' }}>Vai trò chuyên môn</th>
                      <th style={{ padding: '10px 14px', textAlign: 'right', width: '120px' }}>Ngày công</th>
                      <th style={{ padding: '10px 14px', textAlign: 'right', width: '160px' }}>Đơn giá/ngày</th>
                      <th style={{ padding: '10px 14px', textAlign: 'right', width: '180px' }}>Thành tiền</th>
                    </tr>
                  </thead>
                  <tbody>
                    {latestQuote.items.map((item, idx) => (
                      <tr
                        key={idx}
                        style={{
                          borderBottom: '1px solid var(--line)',
                          background: item.priced ? 'transparent' : 'rgba(251, 243, 219, 0.3)',
                        }}
                      >
                        <td style={{ padding: '10px 14px', textAlign: 'center', color: 'var(--ink-muted)' }}>
                          {idx + 1}
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <div style={{ fontWeight: 600, color: 'var(--ink-strong)' }}>{item.professionalRole}</div>
                          {!item.priced && (
                            <span
                              style={{
                                fontSize: '11px',
                                color: 'var(--pale-yellow-fg)',
                                fontWeight: 500,
                              }}
                            >
                              (Chưa có đơn giá bán hiệu lực)
                            </span>
                          )}
                        </td>
                        <td
                          style={{
                            padding: '10px 14px',
                            textAlign: 'right',
                            fontFamily: 'var(--font-mono, monospace)',
                          }}
                        >
                          {item.workDays}
                        </td>
                        <td
                          style={{
                            padding: '10px 14px',
                            textAlign: 'right',
                            fontFamily: 'var(--font-mono, monospace)',
                            color: item.priced ? 'var(--ink-soft)' : 'var(--ink-muted)',
                          }}
                        >
                          {formatCurrency(item.unitRate)}
                        </td>
                        <td
                          style={{
                            padding: '10px 14px',
                            textAlign: 'right',
                            fontFamily: 'var(--font-mono, monospace)',
                            fontWeight: 600,
                            color: item.priced ? 'var(--ink-strong)' : 'var(--ink-muted)',
                          }}
                        >
                          {formatCurrency(item.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Tổng tiền báo giá */}
              <div
                style={{
                  padding: '16px 20px',
                  background: 'var(--surface-alt)',
                  border: '1px solid var(--line)',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div
                    style={{
                      fontFamily: 'var(--font-mono, monospace)',
                      fontSize: '11px',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      color: 'var(--ink-muted)',
                    }}
                  >
                    Tổng giá trị báo giá (đã gồm đơn giá hệ thống)
                  </div>
                  <div
                    style={{
                      fontSize: '13px',
                      color: 'var(--ink-soft)',
                      fontStyle: 'italic',
                      marginTop: '4px',
                    }}
                  >
                    Bằng chữ: {convertVNDToWords(latestQuote.totalAmount) || 'Không đồng'}
                  </div>
                </div>
                <div
                  style={{
                    fontSize: '24px',
                    fontWeight: 700,
                    fontFamily: 'var(--font-mono, monospace)',
                    fontVariantNumeric: 'tabular-nums',
                    color: 'var(--ink-strong)',
                  }}
                >
                  {formatCurrency(latestQuote.totalAmount)}
                </div>
              </div>
            </div>
          ) : (
            /* Biểu mẫu nhập liệu các dòng báo giá */
            <form onSubmit={handleSubmit} noValidate>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '12px',
                }}
              >
                <span style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--ink-strong)' }}>
                  Bảng danh mục vị trí & số ngày công dự kiến
                </span>
                <span style={{ fontSize: '12px', color: 'var(--ink-muted)' }}>
                  Đơn giá sẽ được máy chủ tự động tra cứu theo ngày hiệu lực
                </span>
              </div>

              <div
                style={{
                  border: '1px solid var(--line)',
                  borderRadius: 'var(--radius-md)',
                  overflow: 'hidden',
                  marginBottom: '14px',
                }}
              >
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13.5px' }}>
                  <thead>
                    <tr style={{ background: 'var(--surface-alt)', borderBottom: '1px solid var(--line)' }}>
                      <th style={{ padding: '10px 12px', textAlign: 'center', width: '48px' }}>#</th>
                      <th style={{ padding: '10px 12px', textAlign: 'left' }}>
                        Vai trò chuyên môn <span className="req">*</span>
                      </th>
                      <th style={{ padding: '10px 12px', textAlign: 'right', width: '160px' }}>
                        Số ngày công <span className="req">*</span>
                      </th>
                      <th style={{ padding: '10px 12px', textAlign: 'center', width: '60px' }}>Xóa</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, idx) => {
                      const roleError = fieldErrors[`items[${idx}].professionalRole`];
                      const daysError = fieldErrors[`items[${idx}].workDays`];

                      return (
                        <tr key={idx} style={{ borderBottom: '1px solid var(--line)' }}>
                          <td style={{ padding: '10px 12px', textAlign: 'center', color: 'var(--ink-muted)' }}>
                            {idx + 1}
                          </td>
                          <td style={{ padding: '10px 12px' }}>
                            <input
                              type="text"
                              list="popular-roles-suggestions"
                              className={`form-input ${roleError ? 'form-input--error' : ''}`}
                              placeholder="Nhập hoặc chọn vai trò chuyên môn..."
                              value={item.professionalRole}
                              onChange={(e) => handleItemChange(idx, 'professionalRole', e.target.value)}
                              disabled={submitting || !isProposalStage || !isAllowedRole}
                              aria-label={`Vai trò chuyên môn dòng ${idx + 1}`}
                            />
                            {roleError && <span className="field-error">{roleError}</span>}
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                            <input
                              type="number"
                              min="0.5"
                              step="0.5"
                              className={`form-input ${daysError ? 'form-input--error' : ''}`}
                              placeholder="Ví dụ: 20"
                              value={item.workDays === ('' as unknown as number) ? '' : item.workDays}
                              onChange={(e) => handleItemChange(idx, 'workDays', e.target.value)}
                              disabled={submitting || !isProposalStage || !isAllowedRole}
                              style={{
                                textAlign: 'right',
                                fontFamily: 'var(--font-mono, monospace)',
                              }}
                              aria-label={`Số ngày công dòng ${idx + 1}`}
                            />
                            {daysError && <span className="field-error">{daysError}</span>}
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                            <button
                              type="button"
                              className="icon-btn"
                              onClick={() => handleRemoveItem(idx)}
                              disabled={items.length <= 1 || submitting || !isProposalStage || !isAllowedRole}
                              title={items.length <= 1 ? 'Báo giá phải có ít nhất 1 dòng' : 'Xóa dòng'}
                              aria-label={`Xóa dòng ${idx + 1}`}
                              style={{
                                color: items.length <= 1 ? 'var(--ink-faint)' : 'var(--pale-red-fg)',
                                opacity: items.length <= 1 ? 0.4 : 1,
                              }}
                            >
                              {ICONS.trash}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Nút thêm dòng */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleAddItem}
                  disabled={submitting || !isProposalStage || !isAllowedRole}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}
                >
                  <span className="icon-sm">{ICONS.plus}</span>
                  <span>Thêm dòng báo giá</span>
                </button>

                {latestQuote && isEditingNewVersion && (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setIsEditingNewVersion(false)}
                    style={{ fontSize: '13px' }}
                  >
                    Xem lại báo giá phiên bản #{latestQuote.version}
                  </button>
                )}
              </div>
            </form>
          )}
        </div>

        {/* Footer modal */}
        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={submitting}>
            {latestQuote && !isEditingNewVersion ? 'Đóng' : 'Hủy bỏ'}
          </button>

          {(!latestQuote || isEditingNewVersion) && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSubmit}
              disabled={submitting || !isProposalStage || !isAllowedRole}
              style={{ minWidth: '160px' }}
            >
              {submitting ? (
                <>
                  <span className="spinner-sm" aria-hidden="true" />
                  <span>Đang tính đơn giá...</span>
                </>
              ) : (
                <>
                  <span className="icon-sm">{ICONS.receipt}</span>
                  <span>Lưu & Tạo báo giá</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
