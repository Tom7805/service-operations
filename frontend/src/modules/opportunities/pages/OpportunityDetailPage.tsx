import { useEffect, useMemo, useState } from 'react';
import { ICONS } from '../../../components/common/icons';
import {
  createOpportunityActivity,
  fetchOpportunityActivities,
  OpportunityApiError,
} from '../api/opportunitiesApi';
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
}

const ACTIVITY_OPTIONS = [
  { value: 'CALL', label: 'Gọi điện' },
  { value: 'MEETING', label: 'Gặp mặt' },
  { value: 'EMAIL', label: 'Email' },
  { value: 'NOTE', label: 'Ghi chú' },
] as const;

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
}: OpportunityDetailPageProps) {
  const isSalesAllowed = currentUserRoles.includes('VT-04');
  const isClosed = opportunityStatus === 'CLOSED';

  const [activities, setActivities] = useState<OpportunityActivity[]>([]);
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

    async function loadActivities() {
      setIsLoading(true);
      setLoadError(null);
      try {
        const data = await fetchOpportunityActivities(opportunityId);
        if (!cancelled) setActivities(data);
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
  }, [opportunityId]);

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
            Theo quy định NCL-03-CN-006, chỉ <strong>Nhân viên kinh doanh (VT-04)</strong> mới được thao tác với lịch sử chăm sóc cơ hội.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="opportunity-detail-page" data-testid="opportunity-detail-page">
      <div className="page-header">
        <div>
          <div className="section-eyebrow">NCL-03-CN-006 • Ghi nhận hoạt động chăm sóc</div>
          <h1>{opportunityName}</h1>
        </div>
        <div className="status-badge">{isClosed ? 'Đã đóng' : 'Đang mở'}</div>
      </div>

      {isClosed && (
        <div className="info-banner" data-testid="activity-readonly-banner">
          Cơ hội đã đóng, hệ thống chỉ cho phép xem lại lịch sử chăm sóc và không thể thêm hoạt động mới.
        </div>
      )}

      {loadError && <div className="error-panel">{loadError}</div>}

      <div className="content-grid">
        <section className="panel">
          <div className="panel-header">
            <h2>Lịch sử chăm sóc</h2>
          </div>

          {isLoading ? (
            <div className="empty-state">Đang tải lịch sử chăm sóc…</div>
          ) : activities.length === 0 ? (
            <div className="empty-state">Chưa có hoạt động chăm sóc nào cho cơ hội này.</div>
          ) : (
            <div className="timeline-list" data-testid="activity-timeline">
              {activities.map((activity) => (
                <div key={activity.id} className="timeline-item">
                  <div className="timeline-dot" />
                  <div className="timeline-content">
                    <div className="timeline-topline">
                      <strong>{formatActivityLabel(activity.activityType)}</strong>
                      <span>{formatDateTime(activity.occurredAt)}</span>
                    </div>
                    {activity.participants && <div className="muted">Tham gia: {activity.participants}</div>}
                    <p>{activity.content}</p>
                    <div className="timeline-meta">
                      <span>Người thực hiện: {activity.createdBy ?? currentUserName}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {!isClosed && (
          <section className="panel">
            <div className="panel-header">
              <h2>Thêm hoạt động mới</h2>
            </div>

            <form onSubmit={handleSubmit} noValidate>
              <div className="form-grid">
                <label>
                  <span>Loại hoạt động</span>
                  <select
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

                <label>
                  <span>Thời điểm</span>
                  <input
                    type="datetime-local"
                    value={form.occurredAt}
                    onChange={(e) => handleChange('occurredAt', e.target.value)}
                    aria-label="Thời điểm"
                  />
                  {errors.occurredAt && <small className="field-error">{errors.occurredAt}</small>}
                </label>

                <label className="full-width">
                  <span>Người tham gia</span>
                  <input
                    type="text"
                    value={form.participants}
                    onChange={(e) => handleChange('participants', e.target.value)}
                    aria-label="Người tham gia"
                    placeholder="Ví dụ: Nguyễn Huy, Anh Lan"
                    maxLength={PARTICIPANTS_MAX_LENGTH}
                  />
                  {errors.participants && <small className="field-error">{errors.participants}</small>}
                </label>

                <label className="full-width">
                  <span>Nội dung trao đổi</span>
                  <textarea
                    value={form.content}
                    onChange={(e) => handleChange('content', e.target.value)}
                    aria-label="Nội dung trao đổi"
                    rows={5}
                    placeholder="Nhập nội dung trao đổi, kế hoạch chăm sóc hoặc quyết định với khách hàng..."
                    maxLength={CONTENT_MAX_LENGTH}
                  />
                  {errors.content && <small className="field-error">{errors.content}</small>}
                </label>
              </div>

              {errors.general && <div className="error-panel">{errors.general}</div>}
              {submitMessage && <div className="success-panel">{submitMessage}</div>}

              <div className="form-actions">
                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? 'Đang lưu…' : 'Lưu hoạt động'}
                </button>
              </div>
            </form>
          </section>
        )}
      </div>
    </div>
  );
}
