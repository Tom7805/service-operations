import { useEffect, useMemo, useRef, useState } from 'react';
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

/** Formatter dựng một lần cho cả module — trước đây mỗi ô tiền dựng lại một Intl.NumberFormat. */
const CURRENCY_FORMAT = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' });
const formatCurrency = (amount: number | null | undefined): string => {
  if (amount === null || amount === undefined) return '—';
  return CURRENCY_FORMAT.format(amount);
};

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

  // Kết quả báo giá vừa tạo hoặc truyền sẵn
  const [latestQuote, setLatestQuote] = useState<QuoteRes | null>(initialQuote);
  const [isEditingNewVersion, setIsEditingNewVersion] = useState(false);

  const backdrop = useBackdropClick(onClose, submitting);

  // Lịch sử các phiên bản báo giá đã lập cho cơ hội (GET /opportunities/{id}/quotes)
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [historyQuotes, setHistoryQuotes] = useState<QuoteRes[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  // Chỉ phản hồi của lần mở lịch sử MỚI NHẤT được ghi vào state (mở/đóng/mở lại nhanh
  // không để phản hồi cũ về muộn đè lên).
  const historyReqRef = useRef(0);

  const handleOpenHistory = async () => {
    const reqId = ++historyReqRef.current;
    setIsHistoryOpen(true);
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      const history = await fetchOpportunityQuoteHistory(opportunity.id);
      if (reqId === historyReqRef.current) setHistoryQuotes(history);
    } catch (err) {
      if (reqId !== historyReqRef.current) return;
      setHistoryError(
        err instanceof QuoteApiError ? err.message : 'Không thể tải lịch sử báo giá. Vui lòng thử lại sau.'
      );
    } finally {
      if (reqId === historyReqRef.current) setHistoryLoading(false);
    }
  };

  // Gợi ý chức danh cho ô gõ tay — chỉ dựng lại khi danh mục đơn giá đổi, không phải mỗi lần gõ phím.
  const roleSuggestions = useMemo(
    () => [...new Set([...billRates.map((r) => r.professionalRole), ...POPULAR_PROFESSIONAL_ROLES])],
    [billRates]
  );

  // Bàn phím: Esc đóng modal lịch sử trước (lớp trên cùng), rồi mới tới modal báo giá;
  // không đóng khi đang gửi để không mất dữ liệu đang lưu.
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const historyDialogRef = useRef<HTMLDivElement | null>(null);
  const escStateRef = useRef({ isHistoryOpen, submitting, onClose });
  escStateRef.current = { isHistoryOpen, submitting, onClose };
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      const state = escStateRef.current;
      if (state.isHistoryOpen) {
        e.stopPropagation();
        setIsHistoryOpen(false);
        return;
      }
      if (state.submitting) return;
      state.onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen]);

  // Đưa focus vào hộp thoại khi mở (người dùng bàn phím/trình đọc màn hình bắt đầu ngay trong modal).
  useEffect(() => {
    if (isOpen) dialogRef.current?.focus();
  }, [isOpen]);
  useEffect(() => {
    if (isHistoryOpen) historyDialogRef.current?.focus();
  }, [isHistoryOpen]);

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
    // Chặn gửi hai lần (Enter trong ô nhập + bấm nút cùng lúc) khi yêu cầu trước chưa xong.
    if (submitting) return;
    setServerError(null);
    setGeneralError(null);

    // Kiểm tra điều kiện giai đoạn bắt buộc PROPOSAL (NCL-03-CN-003)
    if (!isProposalStage) {
      setGeneralError(
        `Cơ hội phải đang ở giai đoạn Đề xuất giải pháp để lập báo giá. Cơ hội hiện tại đang ở giai đoạn "${STAGE_CONFIGS[opportunity.stage as keyof typeof STAGE_CONFIGS]?.shortLabel ?? opportunity.stage}".`
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

  const stageShortLabel =
    STAGE_CONFIGS[opportunity.stage as keyof typeof STAGE_CONFIGS]?.shortLabel ?? opportunity.stage;
  const isFormLocked = submitting || !isProposalStage || !isAllowedRole;

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
      <div className="modal-card sl-modal sl-modal--wide" ref={dialogRef} tabIndex={-1}>
        {/* Header modal */}
        <div className="modal-header">
          <div className="modal-header__title-wrap">
            <h3 id="quote-builder-title" className="modal-title">
              <span className="modal-title__icon" aria-hidden="true">
                {ICONS.receipt}
              </span>
              Lập báo giá cho cơ hội
            </h3>
            <p className="field-hint sl-modal__lead">
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
        <div className="sl-modal-summary">
          <div className="sl-modal-summary__main">
            <span className="sl-modal-summary__label">Cơ hội: </span>
            {opportunity.code && <span className="sl-code sl-modal-summary__code">[{opportunity.code}]</span>}
            <strong>{opportunity.name}</strong>
            {opportunity.customerName && (
              <span className="sl-modal-summary__sub"> — {opportunity.customerName}</span>
            )}
          </div>
          <div className="sl-modal-summary__stage">
            <span className="sl-modal-summary__label">Giai đoạn:</span>
            <span className={`sl-tag${isProposalStage ? ' sl-tag--info' : ''}`}>{stageShortLabel}</span>
          </div>
        </div>

        {/* Datalist gợi ý vị trí / chức danh khi ở chế độ gõ tay: ưu tiên dữ liệu
            thật từ bảng đơn giá (đảm bảo khớp), kèm danh sách gợi ý tĩnh dự
            phòng khi chưa tải được đơn giá (mất mạng, chưa có quyền xem...). */}
        <datalist id="popular-roles-suggestions">
          {roleSuggestions.map((role) => (
            <option key={role} value={role} />
          ))}
        </datalist>

        <div className="modal-body">
          {/* Cảnh báo nếu cơ hội KHÔNG ở giai đoạn PROPOSAL */}
          {!isProposalStage && (
            <div className="sl-banner sl-banner--warning" role="alert">
              <span className="sl-banner__icon" aria-hidden="true">{ICONS.alertTriangle}</span>
              <div className="sl-banner__body">
                <strong>Quy định nghiệp vụ:</strong> Báo giá chỉ được phép khởi tạo khi cơ hội
                ở giai đoạn <strong>Đề xuất giải pháp</strong>. Cơ hội hiện tại đang ở giai đoạn{' '}
                <code>{opportunity.stage}</code>. Vui lòng chuyển giai đoạn cơ hội sang Đề xuất trước khi tạo báo giá.
              </div>
            </div>
          )}

          {/* Cảnh báo phân quyền nếu không có vai trò VT-04 */}
          {!isAllowedRole && (
            <div className="sl-banner sl-banner--error" role="alert">
              <span className="sl-banner__icon" aria-hidden="true">{ICONS.lock}</span>
              <div className="sl-banner__body">
                <strong>Từ chối truy cập:</strong> Chức năng lập báo giá yêu cầu vai trò Nhân viên kinh doanh.
              </div>
            </div>
          )}

          {/* Thông báo lỗi server hoặc validation tổng */}
          {(serverError || generalError) && (
            <div className="sl-banner sl-banner--error" role="alert">
              <span className="sl-banner__icon" aria-hidden="true">{ICONS.alertTriangle}</span>
              <div className="sl-banner__body">{serverError || generalError}</div>
            </div>
          )}

          {/* Hiển thị kết quả báo giá vừa tạo (nếu có và không trong chế độ chỉnh sửa tạo mới) */}
          {latestQuote && !isEditingNewVersion ? (
            <div>
              <div className="sl-quote-head">
                <div className="sl-quote-head__meta">
                  <span className="sl-tag sl-tag--success">Báo giá Phiên bản #{latestQuote.version}</span>
                  <span className="sl-quote-head__by">Lập bởi @{latestQuote.createdBy || 'sale01'}</span>
                </div>

                {isProposalStage && isAllowedRole && (
                  <button
                    type="button"
                    className="btn btn-secondary sl-btn-sm"
                    onClick={() => setIsEditingNewVersion(true)}
                  >
                    <span className="icon-sm">{ICONS.plus}</span>
                    <span>Tạo phiên bản báo giá mới</span>
                  </button>
                )}
              </div>

              {/* Cảnh báo missingRates nếu có */}
              {latestQuote.missingRates && latestQuote.missingRates.length > 0 && (
                <div className="sl-banner sl-banner--warning">
                  <span className="sl-banner__icon" aria-hidden="true">{ICONS.alertTriangle}</span>
                  <div className="sl-banner__body">
                    <strong>Cảnh báo chưa có đơn giá hiệu lực:</strong>
                    <p>
                      Các vị trí sau chưa được cấu hình đơn giá bán:{' '}
                      <strong>{latestQuote.missingRates.join(', ')}</strong>. Các dòng này được đánh dấu{' '}
                      <code>priced: false</code> và <strong>không được cộng vào tổng tiền báo giá</strong>.
                    </p>
                  </div>
                </div>
              )}

              {/* Bảng chi tiết kết quả báo giá */}
              {/* Dòng chưa có đơn giá được đánh dấu bằng nhãn chữ + màu chữ, không đổ nền cả hàng
                  (DESIGN.md: nền màu cả hàng vừa là mảng màu lớn, vừa giết phản hồi rê chuột). */}
              <div className="sl-mini-table sl-mini-table--scroll">
                <table className="sl-mini-table__table">
                  <thead>
                    <tr>
                      <th scope="col" className="sl-mini-table__idx">#</th>
                      <th scope="col">Vị trí / chức danh</th>
                      <th scope="col" className="sl-num">Ngày công</th>
                      <th scope="col" className="sl-num">Đơn giá/ngày</th>
                      <th scope="col" className="sl-num">Thành tiền</th>
                    </tr>
                  </thead>
                  <tbody>
                    {latestQuote.items.map((item, idx) => (
                      <tr key={idx} className={item.priced ? undefined : 'is-unpriced'}>
                        <td className="sl-mini-table__idx">{idx + 1}</td>
                        <td>
                          <div className="sl-mini-table__title">{item.professionalRole}</div>
                          {!item.priced && (
                            <span className="sl-mini-table__warn">(Chưa có đơn giá bán hiệu lực)</span>
                          )}
                        </td>
                        <td className="sl-num sl-mono">{item.workDays}</td>
                        <td className="sl-num sl-mono sl-mini-table__rate">{formatCurrency(item.unitRate)}</td>
                        <td className="sl-num sl-mono sl-mini-table__amount">{formatCurrency(item.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Tổng tiền báo giá */}
              <div className="sl-total">
                <div className="sl-total__text">
                  <div className="sl-total__label">Tổng giá trị báo giá (đã gồm đơn giá hệ thống)</div>
                  <div className="sl-total__words">
                    Bằng chữ: {convertVNDToWords(latestQuote.totalAmount) || 'Không đồng'}
                  </div>
                </div>
                <div className="sl-total__value">{formatCurrency(latestQuote.totalAmount)}</div>
              </div>
            </div>
          ) : (
            /* Biểu mẫu nhập liệu các dòng báo giá */
            <form onSubmit={handleSubmit} noValidate>
              <div className="sl-quote-formhead">
                <span className="sl-quote-formhead__title">Bảng danh mục vị trí & số ngày công dự kiến</span>
                <span className="sl-quote-formhead__hint">
                  Đơn giá sẽ được máy chủ tự động tra cứu theo ngày hiệu lực
                </span>
              </div>

              {/* Dưới 640px mỗi dòng báo giá xếp thành một thẻ (chức danh chiếm trọn chiều ngang),
                  không còn phải cuộn ngang để nhập trên điện thoại. */}
              <div className="sl-mini-table">
                <table className="sl-mini-table__table sl-quote-edit">
                  <thead>
                    <tr>
                      <th scope="col" className="sl-mini-table__idx">#</th>
                      <th scope="col">
                        Vị trí / chức danh <span className="req">*</span>
                      </th>
                      <th scope="col" className="sl-num sl-quote-edit__days">
                        Số ngày công <span className="req">*</span>
                      </th>
                      <th scope="col" className="sl-quote-edit__del">Xóa</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, idx) => {
                      const roleError = fieldErrors[`items[${idx}].professionalRole`];
                      const daysError = fieldErrors[`items[${idx}].workDays`];

                      return (
                        <tr key={idx}>
                          <td className="sl-mini-table__idx">{idx + 1}</td>
                          <td className="sl-quote-edit__role">
                            {(() => {
                              const hasBillRateOptions = billRates.length > 0;
                              const isKnownRole = billRates.some(
                                (r) => r.professionalRole === item.professionalRole
                              );
                              const isManual =
                                !hasBillRateOptions || manualRoleRows.has(idx) || (item.professionalRole !== '' && !isKnownRole);

                              if (!isManual) {
                                // Chế độ chọn: chỉ liệt kê chức danh ĐANG có đơn giá bán hiệu lực
                                // trong bảng bill_rates, nên chọn xong là chắc chắn tra được đơn giá,
                                // không còn tình trạng gõ sai tên khiến hệ thống báo "chưa có đơn giá".
                                return (
                                  <>
                                    <select
                                      className={`form-input ${roleError ? 'form-input--error' : ''}`}
                                      aria-invalid={roleError ? true : undefined}
                                      value={item.professionalRole}
                                      onChange={(e) => {
                                        if (e.target.value === MANUAL_ROLE_ENTRY) {
                                          setManualRoleRows((prev) => new Set(prev).add(idx));
                                          handleItemChange(idx, 'professionalRole', '');
                                          return;
                                        }
                                        handleItemChange(idx, 'professionalRole', e.target.value);
                                      }}
                                      disabled={isFormLocked}
                                      aria-label={`Vị trí / chức danh dòng ${idx + 1}`}
                                    >
                                      <option value="" disabled>
                                        — Chọn chức danh có sẵn —
                                      </option>
                                      {billRates.map((rate) => (
                                        <option key={rate.professionalRole} value={rate.professionalRole}>
                                          {rate.professionalRole} — {formatCurrency(rate.dailyRate)}/ngày
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
                                    aria-invalid={roleError ? true : undefined}
                                    placeholder="Nhập hoặc chọn vị trí / chức danh..."
                                    value={item.professionalRole}
                                    onChange={(e) => handleItemChange(idx, 'professionalRole', e.target.value)}
                                    disabled={isFormLocked}
                                    aria-label={`Vị trí / chức danh dòng ${idx + 1}`}
                                  />
                                  {roleError && <span className="field-error">{roleError}</span>}
                                  {hasBillRateOptions && (
                                    <button
                                      type="button"
                                      className="btn-link sl-link-sm"
                                      onClick={() => {
                                        setManualRoleRows((prev) => {
                                          const next = new Set(prev);
                                          next.delete(idx);
                                          return next;
                                        });
                                        handleItemChange(idx, 'professionalRole', '');
                                      }}
                                      disabled={isFormLocked}
                                    >
                                      ← Chọn từ danh mục có sẵn
                                    </button>
                                  )}
                                </>
                              );
                            })()}
                          </td>
                          <td className="sl-num sl-quote-edit__days" data-label="Số ngày công">
                            <input
                              type="number"
                              min="0.5"
                              step="0.5"
                              inputMode="decimal"
                              className={`form-input sl-input-num ${daysError ? 'form-input--error' : ''}`}
                              aria-invalid={daysError ? true : undefined}
                              placeholder="Ví dụ: 20"
                              value={item.workDays === ('' as unknown as number) ? '' : item.workDays}
                              onChange={(e) => handleItemChange(idx, 'workDays', e.target.value)}
                              disabled={isFormLocked}
                              aria-label={`Số ngày công dòng ${idx + 1}`}
                            />
                            {daysError && <span className="field-error">{daysError}</span>}
                          </td>
                          <td className="sl-quote-edit__del">
                            <button
                              type="button"
                              className="icon-btn sl-icon-btn-danger"
                              onClick={() => handleRemoveItem(idx)}
                              disabled={items.length <= 1 || isFormLocked}
                              title={items.length <= 1 ? 'Báo giá phải có ít nhất 1 dòng' : 'Xóa dòng'}
                              aria-label={`Xóa dòng ${idx + 1}`}
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
              <div className="sl-quote-actions">
                <div className="sl-quote-actions__group">
                  <button
                    type="button"
                    className="btn btn-secondary sl-btn-sm"
                    onClick={handleAddItem}
                    disabled={isFormLocked}
                  >
                    <span className="icon-sm">{ICONS.plus}</span>
                    <span>Thêm dòng báo giá</span>
                  </button>

                  <button
                    type="button"
                    className="btn btn-secondary sl-btn-sm"
                    onClick={handleOpenHistory}
                    disabled={submitting}
                  >
                    <span className="icon-sm">{ICONS.history}</span>
                    <span>Lịch sử báo giá</span>
                  </button>
                </div>

                {latestQuote && isEditingNewVersion && (
                  <button
                    type="button"
                    className="btn btn-secondary sl-btn-sm"
                    onClick={() => setIsEditingNewVersion(false)}
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
              disabled={isFormLocked}
              aria-busy={submitting}
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
          <div className="modal-card sl-modal" ref={historyDialogRef} tabIndex={-1}>
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
                <div className="sl-list" aria-busy="true">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="sl-list-item">
                      <div className="sl-list-item__main">
                        <div className="skeleton skeleton-text" style={{ width: '38%' }} />
                        <div className="skeleton skeleton-text skeleton-text--sm" style={{ width: '62%', marginTop: '8px' }} />
                      </div>
                      <div className="skeleton skeleton-text" style={{ width: '90px' }} />
                    </div>
                  ))}
                  <span className="sl-sr-only" role="status">Đang tải lịch sử báo giá...</span>
                </div>
              )}

              {!historyLoading && historyError && (
                <div className="sl-banner sl-banner--error" role="alert">
                  <span className="sl-banner__body">{historyError}</span>
                  <span className="sl-banner__action">
                    <button type="button" className="btn btn-secondary sl-btn-sm" onClick={handleOpenHistory}>
                      Thử lại
                    </button>
                  </span>
                </div>
              )}

              {!historyLoading && !historyError && historyQuotes.length === 0 && (
                <p className="sl-empty__text">
                  Cơ hội này chưa có phiên bản báo giá nào được lập. Đóng cửa sổ này và bấm "Lưu & Tạo báo giá" để lập phiên bản đầu tiên.
                </p>
              )}

              {!historyLoading && !historyError && historyQuotes.length > 0 && (
                <div className="sl-list">
                  {historyQuotes.map((quote) => (
                    <div key={quote.id} className="sl-list-item">
                      <div className="sl-list-item__main">
                        <div className="sl-list-item__title">Phiên bản #{quote.version}</div>
                        <div className="sl-list-item__sub">
                          Lập bởi @{quote.createdBy || 'sale01'}
                          {quote.createdAt && ` — ${new Date(quote.createdAt).toLocaleString('vi-VN')}`}
                        </div>
                      </div>
                      <div className="sl-list-item__value">{formatCurrency(quote.totalAmount)}</div>
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
