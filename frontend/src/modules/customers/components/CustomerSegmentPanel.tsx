import { useState } from 'react';
import { createPortal } from 'react-dom';
import type { Customer, CustomerSegmentPayload, ContactAuditItem } from '../types/customerTypes';
import { updateCustomerSegment, CustomerApiError } from '../api/customersApi';
import CustomerSegmentModal from './CustomerSegmentModal';
import { ICONS } from '../../../components/common/icons';

interface CustomerSegmentPanelProps {
  customer: Customer;
  currentUserRoles?: string[];
  currentUserName?: string;
  onSegmentUpdated?: (updated: Customer) => void;
  onAuditLogged?: (audit: ContactAuditItem) => void;
}

/** Trả về sắc thái hiển thị (màu) tương ứng mức độ ưu tiên đã chọn. */
function priorityTone(priority?: string | null): 'low' | 'medium' | 'high' {
  const normalized = priority?.trim().toLowerCase() ?? '';
  if (normalized === 'cao') return 'high';
  if (normalized === 'thấp') return 'low';
  return 'medium';
}

/**
 * NCL-02-CN-005 — Phân nhóm khách hàng theo ngành và quy mô.
 * Cho phép Nhân viên kinh doanh (VT-04) hoặc Quản lý dự án (VT-02) gán ngành nghề, quy mô công ty
 * và mức độ ưu tiên cho một khách hàng để lọc và phân tích theo nhóm (TC-01).
 */
export default function CustomerSegmentPanel({
  customer,
  currentUserRoles = ['VT-04'],
  currentUserName = 'Người dùng',
  onSegmentUpdated,
  onAuditLogged,
}: CustomerSegmentPanelProps) {
  // NCL-02-CN-005 / TC-03: chỉ Nhân viên kinh doanh (VT-04) hoặc Quản lý dự án (VT-02) được phân nhóm khách hàng.
  const isAllowed = currentUserRoles.includes('VT-04') || currentUserRoles.includes('VT-02');

  const [currentCustomer, setCurrentCustomer] = useState<Customer>(customer);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [localAuditLogs, setLocalAuditLogs] = useState<ContactAuditItem[]>([]);
  const [toastMessage, setToastMessage] = useState<{
    text: string;
    type: 'success' | 'error' | 'info';
  } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 5000);
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
    onAuditLogged?.(newLog);
  };

  // TC-01 / TC-04: Gán nhãn phân nhóm rồi lưu — ghi lại người thực hiện, nội dung và thời điểm.
  const handleSubmit = async (payload: CustomerSegmentPayload) => {
    try {
      const updated = await updateCustomerSegment(currentCustomer.id, payload);
      setCurrentCustomer(updated);
      onSegmentUpdated?.(updated);

      recordAudit(
        'SEGMENT_UPDATE',
        `Cập nhật phân nhóm: ngành nghề "${updated.industry}", quy mô "${updated.companySize}", mức độ ưu tiên "${updated.priority}"`
      );

      showToast('Cập nhật phân nhóm khách hàng thành công!', 'success');
    } catch (err) {
      const message =
        err instanceof CustomerApiError
          ? err.message
          : err instanceof Error
          ? err.message
          : 'Không thể cập nhật phân nhóm khách hàng.';
      showToast(message, 'error');
      throw err;
    }
  };

  // TC-03: Kiểm tra quyền truy cập (chỉ VT-04 hoặc VT-02 được phép)
  if (!isAllowed) {
    return (
      <div className="access-denied-card segment-access-denied" data-testid="segment-access-denied">
        <div className="access-denied-icon">{ICONS.shieldOff}</div>
        <h3>Không có quyền phân nhóm khách hàng</h3>
        <p>
          Theo quy định phân quyền (<strong>NCL-02-CN-005 · TC-03</strong>), chức năng Phân nhóm khách
          hàng chỉ dành riêng cho <strong>Nhân viên kinh doanh (VT-04)</strong> hoặc{' '}
          <strong>Quản lý dự án (VT-02)</strong>.
        </p>
        <div className="security-log-badge">
          <span className="security-log-badge__item">{ICONS.shield} Ghi nhận Audit Log: {new Date().toLocaleString('vi-VN')}</span>
          <span className="security-log-badge__item">Tài khoản thực hiện: {currentUserName}</span>
          <span className="security-log-badge__item">Vai trò tài khoản: {currentUserRoles.join(', ')}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="segment-manager-section" data-testid="segment-manager-section">
      {/* Toast thông báo — render qua portal ra <body> để luôn neo ở góc dưới
          bên phải màn hình, không bị "kẹt" bên trong vùng nội dung tab. */}
      {toastMessage &&
        createPortal(
          <div
            className={`toast-notification toast-notification--${toastMessage.type}`}
            role="alert"
            aria-live="polite"
          >
            <div className="toast-notification__content">
              <span className="toast-notification__icon">
                {toastMessage.type === 'success' ? ICONS.checkCircle : toastMessage.type === 'error' ? ICONS.alertTriangle : ICONS.info}
              </span>
              <span className="toast-notification__text">{toastMessage.text}</span>
            </div>
            <button
              type="button"
              className="toast-notification__close"
              onClick={() => setToastMessage(null)}
              aria-label="Đóng thông báo"
            >
              {ICONS.close}
            </button>
          </div>,
          document.body
        )}

      {/* Header & nút mở biểu mẫu phân nhóm */}
      <div className="contact-manager-header">
        <div>
          <div className="contact-section-eyebrow">
            <span className="dot-pulse" />
            <span>NCL-02-CN-005 · Phân nhóm khách hàng</span>
          </div>
          <h2 className="contact-section-title">Ngành nghề, quy mô & mức độ ưu tiên</h2>
          <p className="contact-section-subtitle">
            Gán nhãn phân nhóm để lọc và phân tích danh mục khách hàng theo ngành nghề, quy mô công
            ty và mức độ ưu tiên chăm sóc.
          </p>
        </div>

        <div className="contact-header-actions">
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setIsModalOpen(true)}
            data-testid="btn-open-segment-modal"
          >
            <span className="icon-sm">{ICONS.tag}</span>
            <span>Cập nhật phân nhóm</span>
          </button>
        </div>
      </div>

      {/* Nhãn phân nhóm hiện tại */}
      <div className="segment-current-grid">
        <div className="segment-current-item">
          <span className="meta-item__label">Ngành nghề</span>
          <div className="meta-item__value">
            {currentCustomer.industry ? (
              <span className="industry-tag" data-testid="segment-industry-value">
                {currentCustomer.industry}
              </span>
            ) : (
              <span className="cell-muted" data-testid="segment-industry-value">
                Chưa gán
              </span>
            )}
          </div>
        </div>

        <div className="segment-current-item">
          <span className="meta-item__label">Quy mô công ty</span>
          <div className="meta-item__value">
            {currentCustomer.companySize ? (
              <span className="company-size-tag" data-testid="segment-size-value">
                {currentCustomer.companySize}
              </span>
            ) : (
              <span className="cell-muted" data-testid="segment-size-value">
                Chưa gán
              </span>
            )}
          </div>
        </div>

        <div className="segment-current-item">
          <span className="meta-item__label">Mức độ ưu tiên</span>
          <div className="meta-item__value">
            {currentCustomer.priority ? (
              <span
                className={`priority-tag priority-tag--${priorityTone(currentCustomer.priority)}`}
                data-testid="segment-priority-value"
              >
                {currentCustomer.priority}
              </span>
            ) : (
              <span className="cell-muted" data-testid="segment-priority-value">
                Chưa gán
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Nhật ký thao tác phân nhóm cục bộ (TC-04) */}
      {localAuditLogs.length > 0 && (
        <div className="audit-log-card segment-audit-card" data-testid="segment-audit-card">
          <div className="audit-log-header">
            <h4 className="audit-log-title"><span className="audit-log-title__icon">{ICONS.clipboardList}</span> Nhật ký thay đổi phân nhóm trong phiên (TC-04)</h4>
            <span className="badge-pulse">{localAuditLogs.length} ghi nhận mới</span>
          </div>
          <div className="audit-log-list">
            {localAuditLogs.map((log) => (
              <div key={log.id} className="audit-log-item" data-testid="segment-audit-entry">
                <span className="audit-log-icon">{ICONS.tag}</span>
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

      {/* Biểu mẫu gán phân nhóm */}
      <CustomerSegmentModal
        isOpen={isModalOpen}
        customer={currentCustomer}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
