import { useState, useEffect, useMemo } from 'react';
import type { CustomerContact, CustomerContactPayload, ContactAuditItem } from '../types/customerTypes';
import {
  fetchCustomerContacts,
  addCustomerContact,
  setPrimaryCustomerContact,
  CustomerApiError,
} from '../api/customersApi';
import ContactFormModal from './ContactFormModal';

interface ContactListProps {
  customerId: number;
  customerName?: string;
  currentUserRoles?: string[];
  currentUserName?: string;
  initialContacts?: CustomerContact[];
  onAuditLogged?: (audit: ContactAuditItem) => void;
}

export default function ContactList({
  customerId,
  customerName,
  currentUserRoles = ['VT-04'],
  currentUserName = 'Người dùng',
  initialContacts,
  onAuditLogged,
}: ContactListProps) {
  // NCL-02-CN-003 / TC-03: Chỉ Nhân viên kinh doanh (VT-04) được quyền quản lý người liên hệ
  const isAllowed = currentUserRoles.includes('VT-04');

  const [contacts, setContacts] = useState<CustomerContact[]>(initialContacts || []);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);
  const [toastMessage, setToastMessage] = useState<{
    text: string;
    type: 'success' | 'error' | 'info';
  } | null>(null);
  const [localAuditLogs, setLocalAuditLogs] = useState<ContactAuditItem[]>([]);

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 5000);
  };

  const recordAudit = (action: string, detail: string) => {
    const newLog: ContactAuditItem = {
      id: `${Date.now()}-${Math.random()}`,
      action,
      actor: currentUserName,
      timestamp: new Date().toLocaleString('vi-VN'),
      detail,
    };
    setLocalAuditLogs((prev) => [newLog, ...prev]);
    if (onAuditLogged) {
      onAuditLogged(newLog);
    }
  };

  const loadContacts = async () => {
    if (!isAllowed || !customerId) return;
    setLoading(true);
    try {
      const data = await fetchCustomerContacts(customerId);
      // TC-01: Đảm bảo đầu mối chính luôn ở đầu danh sách
      const sorted = [...data].sort((a, b) => {
        if (a.isPrimary && !b.isPrimary) return -1;
        if (!a.isPrimary && b.isPrimary) return 1;
        return (new Date(b.createdAt || 0).getTime()) - (new Date(a.createdAt || 0).getTime());
      });
      setContacts(sorted);
    } catch (err) {
      const message =
        err instanceof CustomerApiError
          ? err.message
          : 'Không thể tải danh sách người liên hệ từ máy chủ.';
      showToast(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!initialContacts && customerId && isAllowed) {
      loadContacts();
    }
  }, [customerId, isAllowed]);

  // TC-01: Thêm người liên hệ mới
  const handleAddContact = async (payload: CustomerContactPayload) => {
    try {
      const newContact = await addCustomerContact(customerId, payload);
      setContacts((prev) => {
        let updated = [...prev];
        // TC-02: Nếu người mới là đầu mối chính, chuyển tất cả người khác thành phụ
        if (newContact.isPrimary) {
          updated = updated.map((c) => ({ ...c, isPrimary: false }));
          return [newContact, ...updated];
        } else {
          // Nếu người mới là phụ, thêm vào sau đầu mối chính (nếu có)
          return [...updated, newContact];
        }
      });

      // TC-04: Lưu lịch sử thao tác
      const auditText = `Thêm người liên hệ: ${newContact.fullName}${newContact.isPrimary ? ' (Đầu mối chính)' : ''}`;
      recordAudit('CONTACT_ADD', auditText);

      showToast(
        `Thêm người liên hệ "${newContact.fullName}" thành công!${newContact.isPrimary ? ' (Đã đặt làm đầu mối chính)' : ''}`,
        'success'
      );
    } catch (err) {
      const message =
        err instanceof CustomerApiError
          ? err.message
          : err instanceof Error
          ? err.message
          : 'Không thể thêm người liên hệ.';
      showToast(message, 'error');
      throw err;
    }
  };

  // TC-02: Đặt người liên hệ làm đầu mối chính
  const handleSetPrimary = async (contact: CustomerContact) => {
    if (contact.isPrimary) return;
    setActionLoadingId(contact.id);
    try {
      const updatedContact = await setPrimaryCustomerContact(customerId, contact.id);

      // TC-02: Cập nhật state giữ duy nhất một đầu mối chính và đưa lên đầu danh sách
      setContacts((prev) => {
        const withoutTarget = prev.filter((c) => c.id !== contact.id);
        const demotedOthers = withoutTarget.map((c) => ({ ...c, isPrimary: false }));
        return [{ ...contact, ...updatedContact, isPrimary: true }, ...demotedOthers];
      });

      // TC-04: Lưu lịch sử thao tác
      const auditText = `Đánh dấu đầu mối chính: ${contact.fullName}`;
      recordAudit('CONTACT_SET_PRIMARY', auditText);

      showToast(`Đã chuyển "${contact.fullName}" thành người liên hệ đầu mối chính!`, 'success');
    } catch (err) {
      const message =
        err instanceof CustomerApiError
          ? err.message
          : err instanceof Error
          ? err.message
          : 'Không thể cập nhật đầu mối chính.';
      showToast(message, 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedText(text);
      showToast(`Đã sao chép ${label}: ${text}`, 'info');
      setTimeout(() => setCopiedText(null), 2000);
    });
  };

  // Lọc tìm kiếm người liên hệ
  const filteredContacts = useMemo(() => {
    if (!searchTerm.trim()) return contacts;
    const lower = searchTerm.toLowerCase().trim();
    return contacts.filter(
      (c) =>
        c.fullName.toLowerCase().includes(lower) ||
        (c.title && c.title.toLowerCase().includes(lower)) ||
        (c.email && c.email.toLowerCase().includes(lower)) ||
        (c.phone && c.phone.toLowerCase().includes(lower))
    );
  }, [contacts, searchTerm]);

  const primaryContact = useMemo(() => {
    return contacts.find((c) => c.isPrimary);
  }, [contacts]);

  // TC-03: Kiểm tra quyền truy cập (Chỉ VT-04 được phép)
  if (!isAllowed) {
    return (
      <div className="access-denied-card contact-access-denied" data-testid="contact-access-denied">
        <div className="access-denied-icon">🚫</div>
        <span className="eyebrow text-danger">Từ chối quyền truy cập (403 FORBIDDEN)</span>
        <h3>Không có quyền quản lý người liên hệ của khách hàng</h3>
        <p>
          Theo quy định an ninh dữ liệu khách hàng (<strong>NCL-02-CN-003 · TC-03</strong>), chức năng Quản lý người liên hệ chỉ dành riêng cho{' '}
          <strong>Nhân viên kinh doanh (VT-04)</strong>.
        </p>
        <div className="security-log-badge">
          <span>🛡️ Ghi nhận Audit Log: {new Date().toLocaleString('vi-VN')}</span>
          <span>Tài khoản thực hiện: {currentUserName}</span>
          <span>Vai trò tài khoản: {currentUserRoles.join(', ')}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="contact-manager-section" data-testid="contact-manager-section">
      {/* Toast thông báo */}
      {toastMessage && (
        <div
          className={`toast-notification toast-notification--${toastMessage.type}`}
          role="alert"
          aria-live="polite"
        >
          <div className="toast-notification__content">
            <span className="toast-notification__icon">
              {toastMessage.type === 'success' ? '✅' : toastMessage.type === 'error' ? '❌' : 'ℹ️'}
            </span>
            <span className="toast-notification__text">{toastMessage.text}</span>
          </div>
          <button
            type="button"
            className="toast-notification__close"
            onClick={() => setToastMessage(null)}
            aria-label="Đóng thông báo"
          >
            ✕
          </button>
        </div>
      )}

      {/* Header & Bộ công cụ Quản lý liên hệ */}
      <div className="contact-manager-header">
        <div>
          <div className="contact-section-eyebrow">
            <span className="dot-pulse" />
            <span>NCL-02-CN-003 · Danh bạ đầu mối</span>
          </div>
          <h2 className="contact-section-title">Danh sách người liên hệ</h2>
          <p className="contact-section-subtitle">
            Quản lý các đầu mối giao tiếp, phân định đầu mối chính phụ phục vụ ký kết hợp đồng và triển khai dịch vụ.
          </p>
        </div>

        <div className="contact-header-actions">
          <button
            type="button"
            className="btn btn-primary btn-add-contact"
            onClick={() => setIsModalOpen(true)}
            data-testid="btn-open-add-contact"
          >
            <span>+</span>
            <span>Thêm người liên hệ</span>
          </button>
        </div>
      </div>

      {/* Thẻ tóm tắt nhanh */}
      <div className="contact-stats-grid">
        <div className="contact-stat-card">
          <div className="contact-stat-icon contact-stat-icon--total">👥</div>
          <div>
            <span className="contact-stat-label">Tổng người liên hệ</span>
            <div className="contact-stat-value" data-testid="stat-total-contacts">{contacts.length}</div>
          </div>
        </div>

        <div className="contact-stat-card">
          <div className="contact-stat-icon contact-stat-icon--primary">⭐</div>
          <div>
            <span className="contact-stat-label">Đầu mối chính hiện tại</span>
            <div className="contact-stat-value text-primary-gold" data-testid="stat-primary-name">
              {primaryContact ? primaryContact.fullName : 'Chưa thiết lập'}
            </div>
            {primaryContact?.title && (
              <span className="contact-stat-sub">{primaryContact.title}</span>
            )}
          </div>
        </div>

        <div className="contact-stat-card">
          <div className="contact-stat-icon contact-stat-icon--role">💼</div>
          <div>
            <span className="contact-stat-label">Quyền hạn thao tác</span>
            <div className="contact-stat-value text-success" style={{ fontSize: '15px' }}>
              Nhân viên kinh doanh (VT-04)
            </div>
          </div>
        </div>
      </div>

      {/* Thanh tìm kiếm & lọc liên hệ */}
      <div className="contact-toolbar">
        <div className="search-box contact-search-box">
          <span className="search-box__icon" aria-hidden="true">🔍</span>
          <input
            type="text"
            className="search-box__input"
            placeholder="Tìm theo họ tên, chức danh, email, số điện thoại..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            aria-label="Tìm kiếm người liên hệ"
            data-testid="input-search-contact"
          />
          {searchTerm && (
            <button
              type="button"
              className="search-box__clear"
              onClick={() => setSearchTerm('')}
              aria-label="Xóa từ khóa tìm kiếm"
            >
              ✕
            </button>
          )}
        </div>

        {contacts.length > 0 && (
          <div className="contact-count-tag">
            Đang hiển thị <strong>{filteredContacts.length}</strong> / <strong>{contacts.length}</strong> người liên hệ
          </div>
        )}
      </div>

      {/* Nội dung danh sách */}
      {loading ? (
        <div className="table-loading-state">
          <div className="spinner-lg" />
          <p>Đang tải danh bạ người liên hệ từ máy chủ...</p>
        </div>
      ) : contacts.length === 0 ? (
        <div className="table-empty-state contact-empty-state" data-testid="contact-empty-state">
          <div className="table-empty-state__icon">📇</div>
          <h3>Chưa có người liên hệ nào</h3>
          <p>
            Hồ sơ khách hàng này chưa có người liên hệ được ghi nhận. Hãy thêm người liên hệ đầu tiên để thiết lập kênh kết nối.
          </p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setIsModalOpen(true)}
            style={{ marginTop: '16px' }}
          >
            <span>+</span>
            <span>Thêm người liên hệ đầu tiên</span>
          </button>
        </div>
      ) : filteredContacts.length === 0 ? (
        <div className="table-empty-state contact-empty-state">
          <div className="table-empty-state__icon">🔍</div>
          <h3>Không tìm thấy người liên hệ phù hợp</h3>
          <p>Không có kết quả nào khớp với từ khóa "{searchTerm}". Vui lòng thử từ khóa khác.</p>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setSearchTerm('')}
            style={{ marginTop: '12px' }}
          >
            Xóa tìm kiếm
          </button>
        </div>
      ) : (
        <div className="table-responsive contact-table-container">
          <table className="user-data-table contact-data-table" data-testid="contact-table">
            <thead>
              <tr>
                <th style={{ width: '60px', textAlign: 'center' }}>Vai trò</th>
                <th style={{ minWidth: '220px' }}>Họ và tên</th>
                <th style={{ minWidth: '180px' }}>Chức danh / Vị trí</th>
                <th style={{ minWidth: '220px' }}>Thư điện tử (Email)</th>
                <th style={{ width: '160px' }}>Số điện thoại</th>
                <th style={{ width: '190px', textAlign: 'center' }}>Thao tác đầu mối</th>
              </tr>
            </thead>
            <tbody>
              {filteredContacts.map((contact) => {
                const isPrimary = contact.isPrimary;
                const isLoadingAction = actionLoadingId === contact.id;

                return (
                  <tr
                    key={contact.id}
                    className={`contact-table-row ${isPrimary ? 'contact-table-row--primary' : ''}`}
                    data-testid={`contact-row-${contact.id}`}
                  >
                    {/* Cột huy hiệu Đầu mối chính / phụ (TC-01, TC-02) */}
                    <td style={{ textAlign: 'center' }}>
                      {isPrimary ? (
                        <div
                          className="primary-star-badge"
                          title="Người liên hệ đầu mối chính của khách hàng"
                          data-testid={`badge-primary-${contact.id}`}
                        >
                          <span className="star-icon">⭐</span>
                          <span className="primary-pill-text">Chính</span>
                        </div>
                      ) : (
                        <div
                          className="secondary-role-badge"
                          title="Người liên hệ đầu mối phụ"
                          data-testid={`badge-secondary-${contact.id}`}
                        >
                          <span className="user-icon">👤</span>
                          <span className="secondary-pill-text">Phụ</span>
                        </div>
                      )}
                    </td>

                    {/* Họ tên */}
                    <td>
                      <div className="contact-name-cell">
                        <div
                          className={`contact-avatar ${isPrimary ? 'contact-avatar--primary' : ''}`}
                        >
                          {contact.fullName.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="contact-name-meta">
                          <span className="contact-fullname-text" data-testid={`contact-name-${contact.id}`}>
                            {contact.fullName}
                          </span>
                          {isPrimary && (
                            <span className="primary-label-chip">⭐ Đầu mối giao tiếp chính</span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Chức danh */}
                    <td>
                      {contact.title ? (
                        <span className="contact-title-badge" data-testid={`contact-title-${contact.id}`}>
                          💼 {contact.title}
                        </span>
                      ) : (
                        <span className="cell-muted">—</span>
                      )}
                    </td>

                    {/* Email */}
                    <td>
                      {contact.email ? (
                        <div className="contact-actionable-cell">
                          <a
                            href={`mailto:${contact.email}`}
                            className="contact-link"
                            title={`Gửi thư tới ${contact.email}`}
                            data-testid={`contact-email-${contact.id}`}
                          >
                            ✉️ {contact.email}
                          </a>
                          <button
                            type="button"
                            className="btn-copy-code"
                            title="Sao chép email"
                            onClick={() => handleCopy(contact.email!, 'Email')}
                            aria-label={`Sao chép email ${contact.email}`}
                          >
                            {copiedText === contact.email ? '✓' : '📋'}
                          </button>
                        </div>
                      ) : (
                        <span className="cell-muted">—</span>
                      )}
                    </td>

                    {/* Số điện thoại */}
                    <td>
                      {contact.phone ? (
                        <div className="contact-actionable-cell">
                          <a
                            href={`tel:${contact.phone}`}
                            className="contact-link contact-phone-link"
                            title={`Gọi điện tới ${contact.phone}`}
                            data-testid={`contact-phone-${contact.id}`}
                          >
                            📞 {contact.phone}
                          </a>
                          <button
                            type="button"
                            className="btn-copy-code"
                            title="Sao chép số điện thoại"
                            onClick={() => handleCopy(contact.phone!, 'Số điện thoại')}
                            aria-label={`Sao chép số điện thoại ${contact.phone}`}
                          >
                            {copiedText === contact.phone ? '✓' : '📋'}
                          </button>
                        </div>
                      ) : (
                        <span className="cell-muted">—</span>
                      )}
                    </td>

                    {/* Thao tác Đổi đầu mối chính (TC-02) */}
                    <td style={{ textAlign: 'center' }}>
                      {isPrimary ? (
                        <span className="is-primary-indicator" data-testid={`current-primary-tag-${contact.id}`}>
                          <span>✓</span> Đang là đầu mối chính
                        </span>
                      ) : (
                        <button
                          type="button"
                          className="btn-set-primary"
                          onClick={() => handleSetPrimary(contact)}
                          disabled={isLoadingAction}
                          title="Chuyển thành người liên hệ đầu mối chính của khách hàng"
                          data-testid={`btn-set-primary-${contact.id}`}
                        >
                          {isLoadingAction ? (
                            <>
                              <span className="spinner-sm" />
                              <span>Đang chuyển...</span>
                            </>
                          ) : (
                            <>
                              <span>⭐</span>
                              <span>Đặt làm đầu mối chính</span>
                            </>
                          )}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Nhật ký thao tác người liên hệ cục bộ (TC-04) */}
      {localAuditLogs.length > 0 && (
        <div className="audit-log-card contact-audit-card" data-testid="contact-audit-card">
          <div className="audit-log-header">
            <h4 className="audit-log-title">
              📋 Nhật ký thay đổi người liên hệ trong phiên (TC-04)
            </h4>
            <span className="badge-pulse">{localAuditLogs.length} ghi nhận mới</span>
          </div>
          <div className="audit-log-list">
            {localAuditLogs.map((log) => (
              <div key={log.id} className="audit-log-item" data-testid="audit-log-entry">
                <span className="audit-log-icon">🛡️</span>
                <div className="audit-log-meta">
                  <div className="audit-log-row">
                    <span>
                      Người thực hiện: <strong className="highlight-username">{log.actor}</strong>
                    </span>
                    <span className="audit-log-time">{log.timestamp}</span>
                  </div>
                  <div className="audit-log-details">{log.detail}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal tạo người liên hệ mới */}
      <ContactFormModal
        isOpen={isModalOpen}
        customerName={customerName}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleAddContact}
      />
    </div>
  );
}

