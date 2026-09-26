import { useEffect, useState } from 'react';
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
import {
  createOpportunityQuote,
  fetchCurrentBillRates,
  fetchOpportunityQuoteHistory,
  QuoteApiError,
  type BillRateOption,
} from '../api/quotesApi';
import { ICONS } from '../../../components/common/icons';
import ModalPortal from '../../../components/common/ModalPortal';
import { useBackdropClick } from '../../../hooks/useBackdropClick';

/** Giá trị đặc biệt của ô chọn chức danh khi người dùng muốn tự gõ tay thay vì chọn từ danh mục có sẵn. */
const MANUAL_ROLE_ENTRY = '__manual__';

/** Khóa duy nhất của một dòng đơn giá: bảng đơn giá khai báo theo (vai trò, cấp bậc) — NCL-07-CN-001. */
function rateKey(role: string, level?: string | null): string {
  return `${role}::${level ?? ''}`;
}

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
    { professionalRole: '', workDays: '' as unknown as number },
  ]);

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Danh sách chức danh đang có đơn giá bán hiệu lực, dùng để dựng ô chọn
  // thay vì bắt người dùng gõ tay dễ sai chính tả (NCL-03-CN-003).
  const [billRates, setBillRates] = useState<BillRateOption[]>([]);
  // Các dòng đang ở chế độ gõ tay (chọn "Nhập chức danh khác") thay vì chọn từ danh mục.
  const [manualRoleRows, setManualRoleRows] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    fetchCurrentBillRates().then((rates) => {
      if (!cancelled) setBillRates(rates);
    });
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  // Kết quả báo giá đang xem: bản vừa tạo, bản truyền sẵn, hoặc bản chọn từ lịch sử
  const [latestQuote, setLatestQuote] = useState<QuoteRes | null>(initialQuote);
  const [isEditingNewVersion, setIsEditingNewVersion] = useState(false);
  const [loadingLatest, setLoadingLatest] = useState(false);

  // TC-03: mở lại cửa sổ (kể cả sau khi tải lại trang) phải thấy phiên bản mới nhất đã lập,
  // thay vì form trống khiến người dùng tưởng chưa có báo giá nào và lập trùng.
  useEffect(() => {
    if (!isOpen || initialQuote) return;
    let cancelled = false;
    setLoadingLatest(true);
    fetchOpportunityQuoteHistory(opportunity.id)
      .then((history) => {
        if (cancelled || history.length === 0) return;
        setLatestQuote(history.find((q) => q.latest) ?? history[0]);
      })
      .catch(() => {
        // Không tải được lịch sử thì vẫn cho lập báo giá mới; máy chủ tự tăng số phiên bản.
      })
      .finally(() => {
        if (!cancelled) setLoadingLatest(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, initialQuote, opportunity.id]);

  const backdrop = useBackdropClick(onClose, submitting);

  // Lịch sử các phiên bản báo giá đã lập cho cơ hội (GET /opportunities/{id}/quotes)
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [historyQuotes, setHistoryQuotes] = useState<QuoteRes[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  const handleOpenHistory = async () => {
    setIsHistoryOpen(true);
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      const history = await fetchOpportunityQuoteHistory(opportunity.id);
      setHistoryQuotes(history);
    } catch (err) {
      setHistoryError(
        err instanceof QuoteApiError ? err.message : 'Không thể tải lịch sử báo giá. Vui lòng thử lại sau.'
      );
    } finally {
      setHistoryLoading(false);
    }
  };

  if (!isOpen) return null;

  const handleAddItem = () => {
    setItems((prev) => [...prev, { professionalRole: '', workDays: '' as unknown as number }]);
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

  /** Chọn một dòng đơn giá từ danh mục: đặt cùng lúc chức danh và cấp bậc của dòng báo giá. */
  const handleRateSelect = (index: number, role: string, level: string | null) => {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, professionalRole: role, level } : item)));
    const errorKey = `items[${index}].professionalRole`;
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
        `Cơ hội phải đang ở giai đoạn Báo giá để lập báo giá. Cơ hội hiện tại đang ở giai đoạn "${STAGE_CONFIGS[opportunity.stage as keyof typeof STAGE_CONFIGS]?.shortLabel ?? opportunity.stage}".`
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
    <ModalPortal>
    <div
      className="modal-backdrop"
      onMouseDown={backdrop.onMouseDown}
      onClick={backdrop.onClick}
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

        {/* Datalist gợi ý vị trí / chức danh khi ở chế độ gõ tay: ưu tiên dữ liệu
            thật từ bảng đơn giá (đảm bảo khớp), kèm danh sách gợi ý tĩnh dự
            phòng khi chưa tải được đơn giá (mất mạng, chưa có quyền xem...). */}
        <datalist id="popular-roles-suggestions">
          {[...new Set([...billRates.map((r) => r.professionalRole), ...POPULAR_PROFESSIONAL_ROLES])].map((role) => (
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
                <strong>Quy định nghiệp vụ:</strong> Báo giá chỉ được phép lập khi cơ hội
                ở giai đoạn <strong>Báo giá</strong>. Cơ hội hiện tại đang ở giai đoạn{' '}
                <strong>{STAGE_CONFIGS[opportunity.stage as keyof typeof STAGE_CONFIGS]?.shortLabel ?? opportunity.stage}</strong>. Bạn vẫn xem được lịch sử báo giá đã lập.
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
                <strong>Từ chối truy cập:</strong> Chức năng lập báo giá yêu cầu vai trò Nhân viên kinh doanh.
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
          {loadingLatest && !latestQuote && (
            <div
              data-testid="quote-loading-latest"
              style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--ink-muted)', marginBottom: '12px' }}
            >
              <span className="spinner-sm" aria-hidden="true" />
              <span>Đang tải báo giá đã lập…</span>
            </div>
          )}

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
                  {latestQuote.latest === false && (
                    <span
                      data-testid="quote-older-version-badge"
                      style={{
                        padding: '3px 10px',
                        background: 'var(--surface-sunken)',
                        color: 'var(--ink-muted)',
                        borderRadius: '999px',
                        fontSize: '12px',
                        fontWeight: 600,
                      }}
                    >
                      Phiên bản cũ
                    </span>
                  )}
                  {latestQuote.latest && (
                    <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--pale-green-fg)' }}>Mới nhất</span>
                  )}
                  <span style={{ fontSize: '13px', color: 'var(--ink-muted)' }}>
                    Lập bởi {latestQuote.createdBy ? `@${latestQuote.createdBy}` : '—'}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handleOpenHistory}
                    style={{ fontSize: '12.5px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  >
                    <span className="icon-sm">{ICONS.history}</span>
                    <span>Lịch sử báo giá</span>
                  </button>
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
                    <strong>Cảnh báo chưa có đơn giá hiệu lực:</strong>
                    <p style={{ margin: '4px 0 0' }}>
                      Các vị trí sau chưa được cấu hình đơn giá bán:{' '}
                      <strong>{latestQuote.missingRates.join(', ')}</strong>. Các dòng này
                      <strong>không được cộng vào tổng tiền báo giá</strong> cho tới khi kế toán khai báo đơn giá.
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
                      <th style={{ padding: '10px 14px', textAlign: 'left' }}>Vị trí / chức danh</th>
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
                          <div style={{ fontWeight: 600, color: 'var(--ink-strong)' }}>
                            {item.professionalRole}
                            {item.level ? <span style={{ fontWeight: 500, color: 'var(--ink-muted)' }}> · {item.level}</span> : null}
                          </div>
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
                        Vị trí / chức danh <span className="req">*</span>
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
                            {(() => {
                              const hasBillRateOptions = billRates.length > 0;
                              const itemKey = rateKey(item.professionalRole, item.level);
                              const isKnownRole = billRates.some(
                                (r) => rateKey(r.professionalRole, r.level) === itemKey
                              );
                              const isManual =
                                !hasBillRateOptions || manualRoleRows.has(idx) || (item.professionalRole !== '' && !isKnownRole);

                              if (!isManual) {
                                // Chế độ chọn: chỉ liệt kê cặp (chức danh, cấp bậc) ĐANG có đơn giá bán
                                // hiệu lực trong bảng bill_rates, nên chọn xong là chắc chắn tra được đúng
                                // đơn giá của cấp bậc đó, không còn tình trạng gõ sai tên.
                                return (
                                  <>
                                    <select
                                      className={`form-input ${roleError ? 'form-input--error' : ''}`}
                                      value={item.professionalRole ? itemKey : ''}
                                      onChange={(e) => {
                                        if (e.target.value === MANUAL_ROLE_ENTRY) {
                                          setManualRoleRows((prev) => new Set(prev).add(idx));
                                          handleRateSelect(idx, '', null);
                                          return;
                                        }
                                        const picked = billRates.find(
                                          (r) => rateKey(r.professionalRole, r.level) === e.target.value
                                        );
                                        if (picked) handleRateSelect(idx, picked.professionalRole, picked.level ?? null);
                                      }}
                                      disabled={submitting || !isProposalStage || !isAllowedRole}
                                      aria-label={`Vị trí / chức danh dòng ${idx + 1}`}
                                    >
                                      <option value="" disabled>
                                        — Chọn chức danh có sẵn —
                                      </option>
                                      {billRates.map((rate) => (
                                        <option
                                          key={rateKey(rate.professionalRole, rate.level)}
                                          value={rateKey(rate.professionalRole, rate.level)}
                                        >
                                          {rate.professionalRole}
                                          {rate.level ? ` · ${rate.level}` : ''} — {formatCurrency(rate.dailyRate)}/ngày
                                        </option>
                                      ))}
                                      <option value={MANUAL_ROLE_ENTRY}>✎ Nhập chức danh khác (thủ công)…</option>
                                    </select>
                                    {roleError && <span className="field-error">{roleError}</span>}
                                  </>
                                );
                              }

                              // Chế độ gõ tay: dành cho chức danh chưa được kế toán khai đơn giá
                              // (đúng tình huống cảnh báo "missingRates" của story) hoặc khi chưa
                              // tải được danh mục đơn giá (mất mạng, chưa có quyền xem...).
                              return (
                                <>
                                  <input
                                    type="text"
                                    list="popular-roles-suggestions"
                                    className={`form-input ${roleError ? 'form-input--error' : ''}`}
                                    placeholder="Nhập hoặc chọn vị trí / chức danh..."
                                    value={item.professionalRole}
                                    onChange={(e) => handleItemChange(idx, 'professionalRole', e.target.value)}
                                    disabled={submitting || !isProposalStage || !isAllowedRole}
                                    aria-label={`Vị trí / chức danh dòng ${idx + 1}`}
                                  />
                                  {roleError && <span className="field-error">{roleError}</span>}
                                  {hasBillRateOptions && (
                                    <button
                                      type="button"
                                      className="btn-link"
                                      style={{ fontSize: '12px', marginTop: '4px', padding: 0 }}
                                      onClick={() => {
                                        setManualRoleRows((prev) => {
                                          const next = new Set(prev);
                                          next.delete(idx);
                                          return next;
                                        });
                                        handleRateSelect(idx, '', null);
                                      }}
                                      disabled={submitting || !isProposalStage || !isAllowedRole}
                                    >
                                      ← Chọn từ danh mục có sẵn
                                    </button>
                                  )}
                                </>
                              );
                            })()}
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                            <input
                              type="number"
                              min="0.5"
                              step="0.5"
                              className={`form-input ${daysError ? 'form-input--error' : ''}`}
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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

                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handleOpenHistory}
                    disabled={submitting}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}
                  >
                    <span className="icon-sm">{ICONS.history}</span>
                    <span>Lịch sử báo giá</span>
                  </button>
                </div>

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

      {/* Modal lịch sử các phiên bản báo giá đã lập cho cơ hội */}
      {isHistoryOpen && (
        <div
          className="modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsHistoryOpen(false);
          }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="quote-history-title"
        >
          <div className="modal-card" style={{ maxWidth: '640px', maxHeight: '80vh' }}>
            <div className="modal-header">
              <h3 id="quote-history-title" className="modal-title">
                <span className="modal-title__icon" aria-hidden="true">
                  {ICONS.history}
                </span>
                Lịch sử báo giá
              </h3>
              <button
                type="button"
                className="modal-close"
                onClick={() => setIsHistoryOpen(false)}
                aria-label="Đóng cửa sổ"
              >
                {ICONS.close}
              </button>
            </div>

            <div className="modal-body">
              {historyLoading && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13.5px', color: 'var(--ink-muted)' }}>
                  <span className="spinner-sm" aria-hidden="true" />
                  <span>Đang tải lịch sử báo giá...</span>
                </div>
              )}

              {!historyLoading && historyError && (
                <div
                  className="alert-box alert-box--danger"
                  role="alert"
                  style={{
                    padding: '10px 14px',
                    background: 'var(--pale-red-bg)',
                    color: 'var(--pale-red-fg)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid rgba(159, 47, 45, 0.2)',
                    fontSize: '13.5px',
                  }}
                >
                  {historyError}
                </div>
              )}

              {!historyLoading && !historyError && historyQuotes.length === 0 && (
                <div style={{ fontSize: '13.5px', color: 'var(--ink-muted)' }}>
                  Cơ hội này chưa có phiên bản báo giá nào được lập.
                </div>
              )}

              {!historyLoading && !historyError && historyQuotes.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {historyQuotes.map((quote) => (
                    <div
                      key={quote.id}
                      data-testid={`quote-history-item-${quote.version}`}
                      style={{
                        border: quote.latest ? '1px solid var(--pale-green-fg)' : '1px solid var(--line)',
                        borderRadius: 'var(--radius-md)',
                        padding: '12px 14px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '12px',
                        flexWrap: 'wrap',
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontWeight: 600,
                            color: 'var(--ink-strong)',
                            fontSize: '13.5px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                          }}
                        >
                          Phiên bản #{quote.version}
                          {quote.latest && (
                            <span
                              style={{
                                padding: '1px 8px',
                                borderRadius: '999px',
                                fontSize: '11.5px',
                                background: 'var(--pale-green-bg)',
                                color: 'var(--pale-green-fg)',
                              }}
                            >
                              Mới nhất
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '12.5px', color: 'var(--ink-muted)' }}>
                          Lập bởi {quote.createdBy ? `@${quote.createdBy}` : '—'}
                          {quote.createdAt && ` — ${new Date(quote.createdAt).toLocaleString('vi-VN')}`}
                          {quote.missingRates?.length > 0 && ` · ${quote.missingRates.length} vị trí thiếu đơn giá`}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span
                          style={{
                            fontFamily: 'var(--font-mono, monospace)',
                            fontWeight: 700,
                            fontSize: '15px',
                            color: 'var(--ink-strong)',
                          }}
                        >
                          {formatCurrency(quote.totalAmount)}
                        </span>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          style={{ fontSize: '12.5px', padding: '4px 10px' }}
                          onClick={() => {
                            setLatestQuote(quote);
                            setIsEditingNewVersion(false);
                            setIsHistoryOpen(false);
                          }}
                        >
                          Xem chi tiết
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setIsHistoryOpen(false)}>
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </ModalPortal>
  );
}
