import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { ICONS } from '../../../components/common/icons';
import ModalPortal from '../../../components/common/ModalPortal';
import { useBackdropClick } from '../../../hooks/useBackdropClick';
import type { Customer } from '../../customers/types/customerTypes';
import { searchCustomerOptions } from '../../customers/api/customersApi';
import { useRemoteOptions } from '../../../hooks/useRemoteOptions';
import { createPortalAccount, fetchPortalCandidates, PortalAccountApiError } from '../api/portalAccountApi';
import {
  CONTACT_ROLE_LABEL,
  PORTAL_PASSWORD_MAX,
  PORTAL_STATUS_LABEL,
  PORTAL_USERNAME_MAX,
  type PortalAccountRes,
  type PortalAccountStatus,
  type PortalContactCandidateRes,
} from '../types/portalAccountTypes';
import {
  generateTemporaryPassword,
  passwordRules,
  suggestUsername,
  validatePortalAccountForm,
  type PortalAccountFormErrors,
} from '../validators/portalAccountValidators';

interface Props {
  isOpen: boolean;
  /** Khách hàng chọn sẵn (đang lọc ở trang). Danh sách để chọn do máy chủ tìm theo từ khoá. */
  initialCustomer?: Customer | null;
  onClose: () => void;
  /** Gọi ngay khi cấp thành công để trang nạp lại danh sách; modal vẫn mở để hiện thông tin đăng nhập. */
  onCreated: (account: PortalAccountRes) => void;
}

/** Dịch các thông báo nghiệp vụ (backend trả không dấu) sang câu hướng dẫn rõ ràng cho quản trị viên. */
function describeCreateError(err: unknown): { field?: keyof PortalAccountFormErrors; message: string; reload?: boolean } {
  if (!(err instanceof PortalAccountApiError)) {
    return { message: 'Không cấp được tài khoản cổng. Vui lòng thử lại.' };
  }
  const raw = err.message.toLowerCase();
  if (err.code === 'DUPLICATE_DATA') {
    if (raw.includes('ten dang nhap') || raw.includes('tên đăng nhập')) {
      return { field: 'username', message: 'Tên đăng nhập này đã được dùng cho một tài khoản khác — hãy đặt tên khác.' };
    }
    if (raw.includes('da duoc cap') || raw.includes('đã được cấp')) {
      return {
        field: 'contactId',
        message: 'Người liên hệ này đã được cấp tài khoản cổng (mỗi người chỉ có một tài khoản). Danh sách đã được tải lại.',
        reload: true,
      };
    }
    if (raw.includes('email')) {
      return {
        message:
          'Email của người liên hệ đã thuộc một tài khoản khác (email dùng để khôi phục mật khẩu phải duy nhất). ' +
          'Hãy nhờ Nhân viên kinh doanh cập nhật email người liên hệ trong hồ sơ khách hàng trước.',
      };
    }
  }
  if (err.code === 'INVALID_STATE') {
    return {
      message: 'Hồ sơ khách hàng này đã được gộp vào hồ sơ khác — hãy cấp tài khoản từ người liên hệ của hồ sơ được giữ lại.',
      reload: true,
    };
  }
  if (err.code === 'RESOURCE_NOT_FOUND') {
    return { message: 'Không tìm thấy người liên hệ hoặc vai trò Khách hàng (VT-09) chưa được khai báo.', reload: true };
  }
  if (err.code === 'VALIDATION_ERROR' && err.fieldErrors?.length) {
    const first = err.fieldErrors[0];
    const field = (['username', 'password', 'contactId'] as const).find((f) => f === first.field);
    return { field, message: err.message };
  }
  return { message: err.message || 'Không cấp được tài khoản cổng.' };
}

function statusLabel(status: string | null): string {
  if (!status) return '';
  return PORTAL_STATUS_LABEL[status as PortalAccountStatus] ?? status;
}

/**
 * NCL-13-CN-001 (TC-01) — Quản trị viên chọn khách hàng → chọn một người liên hệ chưa có tài khoản cổng → đặt tên
 * đăng nhập và mật khẩu tạm. Tài khoản mang vai trò Khách hàng (VT-09), gắn cố định với khách hàng của người liên hệ.
 * Sau khi cấp, modal hiện thông tin đăng nhập để quản trị viên gửi cho khách hàng qua kênh riêng.
 */
export default function PortalAccountGrantModal({
  isOpen,
  initialCustomer = null,
  onClose,
  onCreated,
}: Props) {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const customerId = customer?.id ?? null;
  const [customerSearch, setCustomerSearch] = useState('');
  // Máy chủ tìm theo tên / mã KH / MST (tối đa 50 hồ sơ, bỏ hồ sơ đã gộp) — không nạp cả danh mục.
  const customerOptions = useRemoteOptions({
    keyword: customerSearch,
    fetchOptions: searchCustomerOptions,
    enabled: isOpen,
  });
  const customersLoading = isOpen && !customerOptions.hasLoaded && !customerOptions.error;
  const [candidates, setCandidates] = useState<PortalContactCandidateRes[]>([]);
  const [candidatesLoading, setCandidatesLoading] = useState(false);
  const [candidatesError, setCandidatesError] = useState<string | null>(null);
  const [contactId, setContactId] = useState<number | null>(null);
  const [username, setUsername] = useState('');
  const [usernameTouched, setUsernameTouched] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<PortalAccountFormErrors>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState<{ account: PortalAccountRes; password: string } | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const visibleCustomers = useMemo(() => {
    const list = customerOptions.options;
    // Giữ khách hàng đang chọn trong danh sách kể cả khi không khớp từ khoá, để <select> không mất giá trị.
    return customer && !list.some((c) => c.id === customer.id) ? [customer, ...list] : list;
  }, [customerOptions.options, customer]);

  const contact = candidates.find((c) => c.contactId === contactId) ?? null;
  const available = candidates.filter((c) => c.portalAccountId == null);

  const loadCandidates = useCallback(async (id: number, keepContact = false) => {
    setCandidatesLoading(true);
    setCandidatesError(null);
    if (!keepContact) setContactId(null);
    try {
      const list = await fetchPortalCandidates(id);
      setCandidates(list);
      if (!keepContact) {
        // Đầu mối chính đứng đầu — chọn sẵn nếu người đó chưa có tài khoản cổng.
        const first = list.find((c) => c.portalAccountId == null);
        if (first && first.role === 'PRIMARY') setContactId(first.contactId);
      } else {
        setContactId((prev) => (list.some((c) => c.contactId === prev && c.portalAccountId == null) ? prev : null));
      }
    } catch (err) {
      setCandidates([]);
      setCandidatesError(err instanceof Error && err.message ? err.message : 'Không tải được người liên hệ của khách hàng.');
    } finally {
      setCandidatesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    setCustomerSearch('');
    setCandidates([]);
    setCandidatesError(null);
    setContactId(null);
    setUsername('');
    setUsernameTouched(false);
    setPassword('');
    setConfirmPassword('');
    setShowPassword(false);
    setErrors({});
    setSaveError(null);
    setCreated(null);
    setCopied(null);
    setCustomer(initialCustomer ?? null);
    if (initialCustomer != null) void loadCandidates(initialCustomer.id);
    // Chỉ khởi tạo lại khi mở modal / đổi khách hàng chọn sẵn (so theo id, không theo object).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, initialCustomer?.id, loadCandidates]);

  // Gợi ý tên đăng nhập theo người liên hệ đang chọn, trừ khi quản trị viên đã tự sửa.
  useEffect(() => {
    if (!contact || usernameTouched) return;
    setUsername(suggestUsername(contact.email, contact.fullName));
  }, [contact, usernameTouched]);

  const handleClose = () => {
    if (submitting) return;
    onClose();
  };
  const backdrop = useBackdropClick(handleClose);

  if (!isOpen) return null;

  const clear = (field: keyof PortalAccountFormErrors) => {
    setErrors((prev) => ({ ...prev, [field]: undefined }));
    setSaveError(null);
  };

  const selectCustomer = (value: string) => {
    const id = value ? Number(value) : null;
    setCustomer(id == null ? null : visibleCustomers.find((c) => c.id === id) ?? null);
    setCandidates([]);
    setContactId(null);
    setUsernameTouched(false);
    setUsername('');
    clear('contactId');
    if (id != null) void loadCandidates(id);
  };

  const selectContact = (c: PortalContactCandidateRes) => {
    if (c.portalAccountId != null || submitting) return;
    setContactId(c.contactId);
    setUsernameTouched(false);
    clear('contactId');
    clear('username');
  };

  const fillGeneratedPassword = () => {
    const generated = generateTemporaryPassword();
    setPassword(generated);
    setConfirmPassword(generated);
    setShowPassword(true);
    clear('password');
    clear('confirmPassword');
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    const { isValid, errors: next } = validatePortalAccountForm({ contactId, username, password, confirmPassword });
    setErrors(next);
    setSaveError(null);
    if (!isValid || contactId == null) return;
    setSubmitting(true);
    try {
      const account = await createPortalAccount({ contactId, username: username.trim(), password });
      setCreated({ account, password });
      onCreated(account);
    } catch (err) {
      const described = describeCreateError(err);
      if (described.field) setErrors((prev) => ({ ...prev, [described.field as string]: described.message }));
      else setSaveError(described.message);
      if (described.reload && customerId != null) void loadCandidates(customerId, true);
    } finally {
      setSubmitting(false);
    }
  };

  const copy = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied((prev) => (prev === key ? null : prev)), 2000);
    } catch {
      setCopied(null);
    }
  };

  const rules = passwordRules(password);

  return (
    <ModalPortal>
      <div
        className="modal-backdrop"
        onMouseDown={backdrop.onMouseDown}
        onClick={backdrop.onClick}
        role="dialog"
        aria-modal="true"
        aria-labelledby="portal-grant-title"
      >
        <div
          className="modal-card"
          style={{ width: 'min(100%, 680px)' }}
          onClick={(e) => e.stopPropagation()}
          data-testid="portal-grant-modal"
        >
          <div className="modal-header">
            <div className="portal-modal-heading">
              <h3 id="portal-grant-title" className="modal-title">
                <span className="modal-title__icon">{created ? ICONS.checkCircle : ICONS.key}</span>
                {created ? 'Đã cấp tài khoản cổng' : 'Cấp tài khoản cổng khách hàng'}
              </h3>
              <p className="field-hint">
                {created
                  ? 'Gửi thông tin đăng nhập cho khách hàng qua kênh riêng — mật khẩu chỉ hiển thị một lần.'
                  : 'Tài khoản mang vai trò Khách hàng (VT-09) và chỉ xem được dữ liệu của đúng khách hàng được chọn.'}
              </p>
            </div>
            <button type="button" className="modal-close" onClick={handleClose} disabled={submitting} aria-label="Đóng">
              {ICONS.close}
            </button>
          </div>

          {created ? (
            <div className="modal-body" data-testid="portal-grant-success">
              <div className="alert-box alert-box--success alert-box--inline" role="status">
                <span className="alert-box__icon">{ICONS.checkCircle}</span>
                <div className="alert-box__content">
                  Đã cấp tài khoản cổng cho <strong>{created.account.contactName ?? created.account.fullName}</strong> —
                  gắn với khách hàng{' '}
                  <strong>
                    {created.account.customerCode} · {created.account.customerName}
                  </strong>
                  .
                </div>
              </div>

              <dl className="portal-credential-list">
                <div className="portal-credential-row">
                  <dt>Tên đăng nhập</dt>
                  <dd>
                    <code data-testid="portal-grant-success-username">{created.account.username}</code>
                    <button
                      type="button"
                      className="btn-copy-code"
                      onClick={() => void copy('username', created.account.username)}
                      aria-label="Sao chép tên đăng nhập"
                    >
                      <span className="icon-xs">{ICONS.copy}</span> {copied === 'username' ? 'Đã chép' : 'Sao chép'}
                    </button>
                  </dd>
                </div>
                <div className="portal-credential-row">
                  <dt>Mật khẩu tạm</dt>
                  <dd>
                    <code data-testid="portal-grant-success-password">{created.password}</code>
                    <button
                      type="button"
                      className="btn-copy-code"
                      onClick={() => void copy('password', created.password)}
                      aria-label="Sao chép mật khẩu"
                    >
                      <span className="icon-xs">{ICONS.copy}</span> {copied === 'password' ? 'Đã chép' : 'Sao chép'}
                    </button>
                  </dd>
                </div>
                <div className="portal-credential-row">
                  <dt>Email khôi phục</dt>
                  <dd>{created.account.email || <span className="cell-muted">Chưa có — không tự khôi phục mật khẩu được</span>}</dd>
                </div>
              </dl>

              <div className="confirm-note-box">
                <span className="confirm-note-box__icon">{ICONS.info}</span>
                <span>
                  Khách hàng đăng nhập bằng màn hình đăng nhập chung và nên đổi mật khẩu ngay lần đầu. Thao tác cấp tài
                  khoản đã được ghi vào Nhật ký hệ thống (người thực hiện, nội dung, thời điểm).
                </span>
              </div>

              <div style={{ marginTop: '16px', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    const cid = created.account.customerId;
                    setCreated(null);
                    setPassword('');
                    setConfirmPassword('');
                    setUsername('');
                    setUsernameTouched(false);
                    // Khách hàng vừa cấp vẫn đang được chọn — chỉ nạp lại người liên hệ của họ.
                    void loadCandidates(cid);
                  }}
                >
                  Cấp thêm cho khách hàng này
                </button>
                <button type="button" className="btn-primary" onClick={onClose} data-testid="portal-grant-done">
                  Xong
                </button>
              </div>
            </div>
          ) : (
            <div className="modal-body">
              {saveError && (
                <div className="alert-box alert-box--danger" role="alert" data-testid="portal-grant-error">
                  <span className="alert-box__icon">{ICONS.alertTriangle}</span>
                  <div className="alert-box__content">{saveError}</div>
                </div>
              )}

              <form onSubmit={(e) => void handleSubmit(e)} noValidate>
                {/* Bước 1 — khách hàng */}
                <div className="portal-step">
                  <div className="portal-step__head">
                    <span className="portal-step__num">1</span>
                    <span className="portal-step__title">Khách hàng</span>
                  </div>
                  <div className="form-grid">
                    <div className="form-field">
                      <label className="form-label" htmlFor="portal-grant-customer-search">Tìm khách hàng</label>
                      <input
                        id="portal-grant-customer-search"
                        className="form-input"
                        placeholder="Tên, mã KH-xxxxxx hoặc MST..."
                        value={customerSearch}
                        onChange={(e) => setCustomerSearch(e.target.value)}
                        disabled={submitting || customersLoading}
                        autoComplete="off"
                      />
                    </div>
                    <div className="form-field">
                      <label className="form-label required" htmlFor="portal-grant-customer">Khách hàng được cấp</label>
                      <select
                        id="portal-grant-customer"
                        className="form-select"
                        value={customerId ?? ''}
                        onChange={(e) => selectCustomer(e.target.value)}
                        disabled={submitting || customersLoading}
                        data-testid="portal-grant-customer"
                      >
                        <option value="">
                          {customersLoading
                            ? 'Đang tải khách hàng...'
                            : `-- Chọn khách hàng (${visibleCustomers.length}) --`}
                        </option>
                        {visibleCustomers.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.code} — {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Bước 2 — người liên hệ */}
                <div className="portal-step">
                  <div className="portal-step__head">
                    <span className="portal-step__num">2</span>
                    <span className="portal-step__title">Người liên hệ được cấp</span>
                    {customer && !candidatesLoading && candidates.length > 0 && (
                      <span className="field-hint" style={{ marginLeft: 'auto' }}>
                        {available.length}/{candidates.length} người chưa có tài khoản
                      </span>
                    )}
                  </div>

                  {!customer ? (
                    <p className="field-hint">Chọn khách hàng để xem danh sách người liên hệ.</p>
                  ) : candidatesLoading ? (
                    <p className="field-hint" data-testid="portal-grant-candidates-loading">Đang tải người liên hệ...</p>
                  ) : candidatesError ? (
                    <div className="alert-box alert-box--danger" role="alert">
                      <span className="alert-box__icon">{ICONS.alertTriangle}</span>
                      <div className="alert-box__content">
                        {candidatesError}{' '}
                        <button type="button" className="btn-link" onClick={() => void loadCandidates(customer.id)}>
                          Thử lại
                        </button>
                      </div>
                    </div>
                  ) : candidates.length === 0 ? (
                    <div className="alert-box alert-box--warning alert-box--inline" data-testid="portal-grant-no-contacts">
                      <span className="alert-box__icon">{ICONS.info}</span>
                      <div className="alert-box__content">
                        Khách hàng <strong>{customer.name}</strong> chưa có người liên hệ nào. Nhân viên kinh doanh cần thêm
                        người liên hệ trong hồ sơ khách hàng trước khi cấp tài khoản cổng.
                      </div>
                    </div>
                  ) : (
                    <div className="portal-contact-list" role="radiogroup" aria-label="Người liên hệ">
                      {candidates.map((c) => {
                        const taken = c.portalAccountId != null;
                        const selected = c.contactId === contactId;
                        return (
                          <label
                            key={c.contactId}
                            className={`portal-contact-option${selected ? ' is-selected' : ''}${taken ? ' is-disabled' : ''}`}
                            data-testid={`portal-grant-contact-${c.contactId}`}
                            title={taken ? 'Người liên hệ đã có tài khoản cổng' : undefined}
                          >
                            <input
                              type="radio"
                              name="portal-contact"
                              value={c.contactId}
                              checked={selected}
                              disabled={taken || submitting}
                              onChange={() => selectContact(c)}
                            />
                            <span className="portal-contact-option__body">
                              <span className="portal-contact-option__name">
                                {c.fullName}
                                {c.role === 'PRIMARY' && (
                                  <span className="badge badge--blue" style={{ marginLeft: '8px' }}>
                                    {CONTACT_ROLE_LABEL.PRIMARY}
                                  </span>
                                )}
                              </span>
                              <span className="portal-contact-option__meta">
                                {[c.title, c.email].filter(Boolean).join(' · ') || 'Chưa có chức danh / email'}
                              </span>
                            </span>
                            <span className="portal-contact-option__state">
                              {taken ? (
                                <>
                                  <span className={`badge ${c.portalStatus === 'LOCKED' ? 'badge--red' : 'badge--green'}`}>
                                    {statusLabel(c.portalStatus)}
                                  </span>
                                  <span className="cell-muted" style={{ fontSize: '12px' }}>@{c.portalUsername}</span>
                                </>
                              ) : (
                                <span className="badge badge--gray">Chưa có tài khoản</span>
                              )}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                  {customer && candidates.length > 0 && available.length === 0 && !candidatesLoading && (
                    <p className="field-hint" data-testid="portal-grant-all-taken">
                      Tất cả người liên hệ của khách hàng này đã có tài khoản cổng — mỗi người liên hệ tối đa một tài khoản.
                    </p>
                  )}
                  {errors.contactId && <span className="field-error">{errors.contactId}</span>}
                </div>

                {/* Bước 3 — thông tin đăng nhập */}
                <div className="portal-step">
                  <div className="portal-step__head">
                    <span className="portal-step__num">3</span>
                    <span className="portal-step__title">Thông tin đăng nhập</span>
                  </div>
                  <div className="form-grid">
                    <div className="form-field form-field--full">
                      <label className="form-label required" htmlFor="portal-grant-username">Tên đăng nhập</label>
                      <input
                        id="portal-grant-username"
                        className={`form-input ${errors.username ? 'form-input--error' : ''}`}
                        maxLength={PORTAL_USERNAME_MAX}
                        placeholder="Ví dụ: nhi.abc"
                        value={username}
                        onChange={(e) => {
                          setUsername(e.target.value);
                          setUsernameTouched(true);
                          clear('username');
                        }}
                        disabled={submitting || !contact}
                        autoComplete="off"
                        data-testid="portal-grant-username"
                      />
                      {errors.username ? (
                        <span className="field-error">{errors.username}</span>
                      ) : (
                        <span className="field-hint">3–100 ký tự: chữ không dấu, chữ số và . _ @ - (không trùng tài khoản nào).</span>
                      )}
                    </div>
                    <div className="form-field">
                      <div className="form-label-row">
                        <label className="form-label required" htmlFor="portal-grant-password">Mật khẩu tạm</label>
                        <button
                          type="button"
                          className="btn-link"
                          onClick={fillGeneratedPassword}
                          disabled={submitting || !contact}
                          data-testid="portal-grant-generate"
                        >
                          Tạo ngẫu nhiên
                        </button>
                      </div>
                      <div style={{ position: 'relative' }}>
                        <input
                          id="portal-grant-password"
                          type={showPassword ? 'text' : 'password'}
                          className={`form-input ${errors.password ? 'form-input--error' : ''}`}
                          maxLength={PORTAL_PASSWORD_MAX}
                          value={password}
                          onChange={(e) => {
                            setPassword(e.target.value);
                            clear('password');
                            clear('confirmPassword');
                          }}
                          disabled={submitting || !contact}
                          autoComplete="new-password"
                          style={{ paddingRight: '40px' }}
                          data-testid="portal-grant-password"
                        />
                        <button
                          type="button"
                          className="portal-password-toggle"
                          onClick={() => setShowPassword((v) => !v)}
                          aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                          disabled={!contact}
                        >
                          {showPassword ? ICONS.eyeOff : ICONS.eye}
                        </button>
                      </div>
                      {errors.password && <span className="field-error">{errors.password}</span>}
                    </div>
                    <div className="form-field">
                      <label className="form-label required" htmlFor="portal-grant-confirm">Nhập lại mật khẩu</label>
                      <input
                        id="portal-grant-confirm"
                        type={showPassword ? 'text' : 'password'}
                        className={`form-input ${errors.confirmPassword ? 'form-input--error' : ''}`}
                        maxLength={PORTAL_PASSWORD_MAX}
                        value={confirmPassword}
                        onChange={(e) => {
                          setConfirmPassword(e.target.value);
                          clear('confirmPassword');
                        }}
                        disabled={submitting || !contact}
                        autoComplete="new-password"
                        data-testid="portal-grant-confirm"
                      />
                      {errors.confirmPassword && <span className="field-error">{errors.confirmPassword}</span>}
                    </div>
                  </div>
                  <ul className="portal-password-rules" aria-label="Luật mật khẩu">
                    {rules.map((rule) => (
                      <li key={rule.key} className={rule.ok ? 'is-ok' : ''}>
                        <span className="icon-xs">{rule.ok ? ICONS.check : ICONS.close}</span> {rule.label}
                      </li>
                    ))}
                  </ul>
                </div>

                {contact && customer && (
                  <div className="confirm-note-box" data-testid="portal-grant-summary">
                    <span className="confirm-note-box__icon">{ICONS.info}</span>
                    <span>
                      Cấp tài khoản cho <strong>{contact.fullName}</strong>, gắn cố định với khách hàng{' '}
                      <strong>
                        {customer.code} · {customer.name}
                      </strong>
                      . Họ tên và email của tài khoản lấy từ hồ sơ người liên hệ
                      {contact.email ? '' : ' — người này chưa có email nên không tự khôi phục mật khẩu được'}.
                    </span>
                  </div>
                )}

                <div style={{ marginTop: '16px', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                  <button type="button" className="btn btn-secondary" onClick={handleClose} disabled={submitting}>
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={submitting || !contact}
                    data-testid="portal-grant-submit"
                  >
                    {submitting ? 'Đang cấp…' : 'Cấp tài khoản'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </ModalPortal>
  );
}
