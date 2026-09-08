import { useEffect, useMemo, useState } from 'react';
import { ICONS } from '../../../components/common/icons';
import {
  createOpportunityActivity,
  fetchOpportunities,
  fetchOpportunityActivities,
  fetchOpportunities,
  OpportunityApiError,
} from '../api/opportunitiesApi';
import type { ContractRes } from '../../contracts/types/contractTypes';
import CreateContractModal from '../components/CreateContractModal';
import type { Opportunity } from '../types/opportunityTypes';
import type {
  OpportunityActivity,
  OpportunityActivityCreatePayload,
  OpportunityActivityFormErrors,
  OpportunityStatus,
} from '../types/opportunityTypes';

interface OpportunityDetailPageProps {
  opportunityId: number;
  opportunityName?: string;
  opportunityStatus?: OpportunityStatus;
  currentUserRoles?: string[];
  currentUserName?: string;
  onBack?: () => void;
  backLabel?: string;
}

const ACTIVITY_OPTIONS = [
  { value: 'CALL', label: 'Gọi điện' },
  { value: 'MEETING', label: 'Gặp mặt' },
  { value: 'EMAIL', label: 'Email' },
  { value: 'NOTE', label: 'Ghi chú' },
] as const;

const ACTIVITY_ICON: Record<string, keyof typeof ICONS> = {
  CALL: 'phone',
  MEETING: 'users',
  EMAIL: 'mail',
  NOTE: 'clipboardList',
};

function formatActivityLabel(type: string): string {
  return ACTIVITY_OPTIONS.find((item) => item.value === type)?.label ?? type;
}

const PARTICIPANTS_MAX_LENGTH = 500;
const CONTENT_MAX_LENGTH = 2000;

/** Giờ địa phương cho input datetime-local — toISOString() trả về UTC nên không được dùng ở đây. */
function toLocalDatetimeInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

function formatDateTime(isoValue?: string | null): string {
  if (!isoValue) return '—';
  const date = new Date(isoValue);
  if (Number.isNaN(date.getTime())) return isoValue;
  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

export default function OpportunityDetailPage({
  opportunityId,
  opportunityName = 'Cơ hội bán hàng',
  opportunityStatus = 'OPEN',
  currentUserRoles = ['VT-04'],
  currentUserName = 'Người dùng',
  onBack,
  backLabel = 'Quay lại',
}: OpportunityDetailPageProps) {
  const isSalesAllowed = currentUserRoles.includes('VT-04');

  /** opportunityStatus truyền vào chỉ là giá trị mặc định lúc chưa biết gì —
   *  không có API nào cấp trạng thái mới nhất qua props (danh sách "Cơ hội bán
   *  hàng" có thể đã đổi trạng thái sau khi người dùng mở màn này). Trạng thái
   *  hiển thị và dùng để khoá form PHẢI lấy trực tiếp từ backend, nếu không sẽ
   *  có tình huống nhãn ghi "Đang mở" nhưng bấm lưu lại bị máy chủ từ chối vì
   *  cơ hội thật sự đã đóng. */
  const [resolvedStatus, setResolvedStatus] = useState<OpportunityStatus | null>(null);
  const [resolvedName, setResolvedName] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState<string | null>(null);
  const isClosed = (resolvedStatus ?? opportunityStatus) === 'CLOSED';
  const displayName = resolvedName ?? opportunityName;

  const [activities, setActivities] = useState<OpportunityActivity[]>([]);
  const [opportunity, setOpportunity] = useState<Opportunity | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [form, setForm] = useState<OpportunityActivityCreatePayload>({
    activityType: 'CALL',
    occurredAt: toLocalDatetimeInputValue(new Date()),
    participants: '',
    content: '',
  });
  const [errors, setErrors] = useState<OpportunityActivityFormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isSalesAllowed) return;
    let cancelled = false;

    async function loadOpportunityStatus() {
      try {
        const all = await fetchOpportunities();
        const found = all.find((o) => o.id === opportunityId);
        if (!cancelled && found) {
          setResolvedStatus(found.status as OpportunityStatus);
          setResolvedName(found.name);
          setCustomerName(found.customerName ?? null);
        }
      } catch {
        // Trạng thái không tải được thì tạm dùng giá trị mặc định từ props;
        // nếu người dùng cố lưu vào cơ hội thực đã đóng, backend vẫn chặn.
      }
    }

    loadOpportunityStatus();
    return () => {
      cancelled = true;
    };
  }, [opportunityId, isSalesAllowed]);

  useEffect(() => {
    if (!isSalesAllowed) return;
    let cancelled = false;

    async function loadActivities() {
      setIsLoading(true);
      setLoadError(null);
      try {
        const data = await fetchOpportunityActivities(opportunityId);
        if (!cancelled) setActivities(data);
        // also try to fetch basic opportunity info from the list
        try {
          const list = await fetchOpportunities();
          if (!cancelled) setOpportunity(list.find((o) => o.id === opportunityId) ?? null);
        } catch {
          // ignore
        }
      } catch (err) {
        if (!cancelled) {
          const message =
            err instanceof OpportunityApiError
              ? err.message
              : err instanceof Error
              ? err.message
              : 'Không thể tải lịch sử chăm sóc cơ hội.';
          setLoadError(message);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    loadActivities();
    return () => {
      cancelled = true;
    };
  }, [opportunityId, isSalesAllowed]);

  const [isCreateContractOpen, setIsCreateContractOpen] = useState(false);

  const handleContractCreated = (c: ContractRes) => {
    // notify other parts of the app to refresh customer/contract views
    try {
      window.dispatchEvent(new CustomEvent('contractCreated', { detail: { contract: c } }));
    } catch (e) {
      void e;
    }
    setSubmitMessage('Tạo hợp đồng thành công.');
  };

  const validationErrors = useMemo(() => {
    const next: OpportunityActivityFormErrors = {};
    if (!form.activityType) next.activityType = 'Loại hoạt động không được để trống';
    if (!form.occurredAt) next.occurredAt = 'Thời điểm hoạt động không được để trống';
    if (!form.content.trim()) next.content = 'Nội dung trao đổi không được để trống';
    else if (form.content.length > CONTENT_MAX_LENGTH)
      next.content = `Nội dung trao đổi không được vượt quá ${CONTENT_MAX_LENGTH} ký tự`;
    if ((form.participants?.length ?? 0) > PARTICIPANTS_MAX_LENGTH)
      next.participants = `Người tham gia không được vượt quá ${PARTICIPANTS_MAX_LENGTH} ký tự`;
    return next;
  }, [form]);

  const handleChange = (
    field: keyof OpportunityActivityCreatePayload,
    value: string
  ) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
    setSubmitMessage(null);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors = validationErrors;
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    if (!isSalesAllowed || isClosed) {
      return;
    }

    setIsSubmitting(true);
    setSubmitMessage(null);

    try {
      const created = await createOpportunityActivity(opportunityId, form);
      setActivities((prev) => [created, ...prev]);
      setForm({
        activityType: 'CALL',
        occurredAt: toLocalDatetimeInputValue(new Date()),
        participants: '',
        content: '',
      });
      setSubmitMessage('Ghi nhận hoạt động chăm sóc thành công.');
    } catch (err) {
      const message =
        err instanceof OpportunityApiError
          ? err.message
          : err instanceof Error
          ? err.message
          : 'Không thể ghi nhận hoạt động chăm sóc.';
      setErrors({ general: message });
      setSubmitMessage(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isSalesAllowed) {
    return (
      <div className="access-denied-container" data-testid="activity-access-denied">
        <div className="access-denied-card">
          <div className="access-denied-icon">{ICONS.shieldOff}</div>
          <h2>Không có quyền ghi nhận hoạt động chăm sóc</h2>
          <p>
            Theo quy định, chỉ <strong>Nhân viên kinh doanh</strong> mới được thao tác với lịch sử chăm sóc cơ hội.
          </p>
          {onBack && (
            <button type="button" className="btn-secondary" onClick={onBack}>
              {ICONS.arrowLeft} {backLabel}
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="opportunity-detail-page" data-testid="opportunity-detail-page">
      {onBack && (
        <button type="button" className="activity-back-link" onClick={onBack}>
          {ICONS.arrowLeft} {backLabel}
        </button>
      )}
      <div className="page-header">
        <div>
          <div className="page-header__kicker">
            <span className="page-header__tag">{ICONS.target} CƠ HỘI BÁN HÀNG</span>
            <span className="page-header__dot" />
            <span className="page-header__meta">GHI NHẬN CHĂM SÓC</span>
          </div>
          <h1>{displayName}</h1>
          {customerName && (
            <div className="activity-customer-line">
              {ICONS.building} Khách hàng: <strong>{customerName}</strong>
            </div>
          )}
        </div>
        <div className="page-header__actions">
          <span className={`activity-status-pill${isClosed ? ' activity-status-pill--closed' : ''}`}>
            <span className="activity-status-pill__dot" />
            {isClosed ? 'Đã đóng' : 'Đang mở'}
          </span>
          {opportunity && opportunity.stage === 'WON' && (
            <button
              type="button"
              className="btn btn-secondary"
              style={{ marginLeft: '12px' }}
              onClick={() => setIsCreateContractOpen(true)}
            >
              {ICONS.document} Tạo hợp đồng
            </button>
          )}
        </div>
      </div>

      {isClosed && (
        <div className="alert-box alert-box--info" data-testid="activity-readonly-banner">
          <span className="alert-box__icon">{ICONS.info}</span>
          <div className="alert-box__content">
            <p>Cơ hội đã đóng, hệ thống chỉ cho phép xem lại lịch sử chăm sóc và không thể thêm hoạt động mới.</p>
          </div>
        </div>
      )}

      {loadError && (
        <div className="alert-box alert-box--danger">
          <span className="alert-box__icon">{ICONS.alertTriangle}</span>
          <div className="alert-box__content">
            <p>{loadError}</p>
          </div>
        </div>
      )}

      <div className="activity-layout">
        <section className="activity-panel activity-panel--timeline">
          <div className="activity-panel__head">
            <h2>Lịch sử chăm sóc</h2>
            {activities.length > 0 && <span className="activity-panel__count">{activities.length}</span>}
          </div>

          {isLoading ? (
            <div className="activity-empty-state">Đang tải lịch sử chăm sóc…</div>
          ) : activities.length === 0 ? (
            <div className="activity-empty-state">
              <span className="activity-empty-state__icon">{ICONS.clipboardList}</span>
              Chưa có hoạt động chăm sóc nào cho cơ hội này.
            </div>
          ) : (
            <div className="timeline-list" data-testid="activity-timeline">
              {activities.map((activity) => (
                <div key={activity.id} className="timeline-item">
                  <span className="timeline-item__icon">{ICONS[ACTIVITY_ICON[activity.activityType] ?? 'clipboardList']}</span>
                  <div className="timeline-item__body">
                    <div className="timeline-item__topline">
                      <strong>{formatActivityLabel(activity.activityType)}</strong>
                      <span className="timeline-item__time">{formatDateTime(activity.occurredAt)}</span>
                    </div>
                    {activity.participants && (
                      <div className="timeline-item__participants">Tham gia: {activity.participants}</div>
                    )}
                    <p className="timeline-item__content">{activity.content}</p>
                    <div className="timeline-item__meta">Người thực hiện: {activity.createdBy ?? currentUserName}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {!isClosed && (
          <section className="activity-panel activity-panel--form">
            <div className="activity-panel__head">
              <h2>Thêm hoạt động mới</h2>
            </div>

            <form onSubmit={handleSubmit} noValidate className="activity-form">
              <div className="activity-form__row">
                <label className="activity-form__field">
                  <span className="activity-form__label">Loại hoạt động</span>
                  <select
                    className="activity-form__select"
                    value={form.activityType}
                    onChange={(e) => handleChange('activityType', e.target.value)}
                    aria-label="Loại hoạt động"
                  >
                    {ACTIVITY_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  {errors.activityType && <small className="field-error">{errors.activityType}</small>}
                </label>

                <label className="activity-form__field">
                  <span className="activity-form__label">Thời điểm</span>
                  <input
                    className="activity-form__input"
                    type="datetime-local"
                    value={form.occurredAt}
                    onChange={(e) => handleChange('occurredAt', e.target.value)}
                    aria-label="Thời điểm"
                  />
                  {errors.occurredAt && <small className="field-error">{errors.occurredAt}</small>}
                </label>
              </div>

              <label className="activity-form__field activity-form__field--full">
                <span className="activity-form__label">Người tham gia</span>
                <input
                  className="activity-form__input"
                  type="text"
                  value={form.participants}
                  onChange={(e) => handleChange('participants', e.target.value)}
                  aria-label="Người tham gia"
                  placeholder="Ví dụ: Nguyễn Huy, Anh Lan"
                  maxLength={PARTICIPANTS_MAX_LENGTH}
                />
                {errors.participants && <small className="field-error">{errors.participants}</small>}
              </label>

              <label className="activity-form__field activity-form__field--full">
                <span className="activity-form__label">Nội dung trao đổi</span>
                <textarea
                  className="activity-form__textarea"
                  value={form.content}
                  onChange={(e) => handleChange('content', e.target.value)}
                  aria-label="Nội dung trao đổi"
                  rows={5}
                  placeholder="Nhập nội dung trao đổi, kế hoạch chăm sóc hoặc quyết định với khách hàng..."
                  maxLength={CONTENT_MAX_LENGTH}
                />
                {errors.content && <small className="field-error">{errors.content}</small>}
              </label>

              {errors.general && (
                <div className="alert-box alert-box--danger">
                  <span className="alert-box__icon">{ICONS.alertTriangle}</span>
                  <div className="alert-box__content">
                    <p>{errors.general}</p>
                  </div>
                </div>
              )}
              {submitMessage && (
                <div className="alert-box alert-box--success">
                  <span className="alert-box__icon">{ICONS.checkCircle}</span>
                  <div className="alert-box__content">
                    <p>{submitMessage}</p>
                  </div>
                </div>
              )}

              <div className="activity-form__actions">
                <button type="submit" className="btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? 'Đang lưu…' : 'Lưu hoạt động'}
                </button>
              </div>
            </form>
          </section>
        )}
      </div>
      {opportunity && (
        <CreateContractModal
          opportunity={opportunity}
          isOpen={isCreateContractOpen}
          onClose={() => setIsCreateContractOpen(false)}
          onCreated={handleContractCreated}
          currentUserRoles={currentUserRoles}
        />
      )}
    </div>
  );
}
