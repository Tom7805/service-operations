import { useEffect, useState } from 'react';
import { ICONS } from '../../../components/common/icons';
import { getMyTimer, startTimer, stopTimer, TimesheetsApiError } from '../api/timesheetsApi';
import type { TimeEntryRes, TimerRes } from '../types/timesheetTypes';

interface TimerWidgetProps {
  projectId: number;
  taskId: number;
  /** Cho phép bắt đầu đồng hồ mới hay không — thường là `canLog` của trang cha (dự án đang
   * chạy + là công việc của chính mình). Không ảnh hưởng việc dừng đồng hồ đã chạy sẵn. */
  canStart: boolean;
  onStopped: (createdEntry: TimeEntryRes) => void;
  onError: (message: string) => void;
}

function formatElapsed(startedAt: string, nowMs: number): string {
  const start = new Date(startedAt).getTime();
  const totalSeconds = Math.max(0, Math.floor((nowMs - start) / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

/**
 * Đồng hồ bấm giờ ghi nhận thời gian làm việc (NCL-06-CN-008) cho một công việc cụ thể.
 *
 * Phiên đồng hồ là TOÀN CỤC theo nhân sự (mỗi người chỉ chạy được một phiên tại một thời
 * điểm — khớp `GET /me/time-entry-timer`, không gắn theo công việc đang xem), nên widget
 * luôn tải trạng thái thật từ server để phát hiện cả trường hợp đang bấm giờ cho MỘT CÔNG
 * VIỆC KHÁC — lúc đó vẫn cho dừng ngay tại đây thay vì bắt người dùng tự tìm đúng trang cũ.
 */
export default function TimerWidget({ projectId, taskId, canStart, onStopped, onError }: TimerWidgetProps) {
  const [timer, setTimer] = useState<TimerRes | null>(null);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(() => Date.now());
  const [showStartForm, setShowStartForm] = useState(false);
  const [note, setNote] = useState('');
  const [billable, setBillable] = useState(true);
  const [noteError, setNoteError] = useState<string | undefined>(undefined);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const data = await getMyTimer();
        if (!cancelled) setTimer(data);
      } catch (err) {
        if (!cancelled) {
          onError(
            err instanceof TimesheetsApiError || err instanceof Error
              ? err.message
              : 'Không thể tải trạng thái đồng hồ bấm giờ.'
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!timer) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [timer]);

  const handleStart = async () => {
    const trimmed = note.trim();
    if (!trimmed) {
      setNoteError('Ghi chú không được để trống');
      return;
    }
    if (trimmed.length > 1000) {
      setNoteError('Ghi chú không được vượt 1000 ký tự');
      return;
    }

    setSubmitting(true);
    try {
      const started = await startTimer(projectId, taskId, { note: trimmed, billable });
      setTimer(started);
      setShowStartForm(false);
      setNote('');
      setBillable(true);
      setNoteError(undefined);
    } catch (err) {
      onError(
        err instanceof TimesheetsApiError || err instanceof Error
          ? err.message
          : 'Không thể bắt đầu đồng hồ bấm giờ.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleStop = async () => {
    setSubmitting(true);
    try {
      const createdEntry = await stopTimer();
      setTimer(null);
      onStopped(createdEntry);
    } catch (err) {
      onError(
        err instanceof TimesheetsApiError || err instanceof Error
          ? err.message
          : 'Không thể dừng đồng hồ bấm giờ.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="user-table-card" style={{ padding: '16px 20px', marginBottom: '16px' }} data-testid="timer-widget-loading">
        Đang tải trạng thái đồng hồ bấm giờ…
      </div>
    );
  }

  const isTimerForThisTask = timer != null && timer.taskId === taskId;
  const isTimerForOtherTask = timer != null && timer.taskId !== taskId;
  const elapsedMs = timer ? now - new Date(timer.startedAt).getTime() : 0;
  const isNearAutoStop = timer != null && elapsedMs >= 11 * 60 * 60 * 1000;

  return (
    <div className="user-table-card" style={{ padding: '16px 20px', marginBottom: '16px' }} data-testid="timer-widget">
      {isTimerForThisTask && timer && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span
              className={`status-pill ${isNearAutoStop ? 'status-pill--locked' : 'status-pill--submitted'}`}
              data-testid="timer-running-badge"
            >
              <span className="status-pill__dot" />
              Đang bấm giờ
            </span>
            <strong style={{ fontVariantNumeric: 'tabular-nums', fontSize: '18px' }} data-testid="timer-elapsed">
              {formatElapsed(timer.startedAt, now)}
            </strong>
            <span className="field-hint">{timer.note}</span>
            {isNearAutoStop && (
              <span className="field-hint" style={{ color: '#DC2626' }} data-testid="timer-near-autostop-warning">
                Sắp chạy quá 12 giờ — hệ thống sẽ tự huỷ, không tạo được dòng giờ công. Hãy dừng đồng hồ ngay.
              </span>
            )}
          </div>
          <button
            type="button"
            className="btn-danger"
            onClick={handleStop}
            disabled={submitting}
            data-testid="btn-stop-timer"
          >
            {ICONS.close} {submitting ? 'Đang dừng…' : 'Dừng đồng hồ'}
          </button>
        </div>
      )}

      {isTimerForOtherTask && timer && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <span className="status-pill status-pill--rejected">
              <span className="status-pill__dot" />
              Đang bấm giờ cho công việc khác (#{timer.taskId})
            </span>
            <p className="field-hint" style={{ margin: '6px 0 0' }}>
              Mỗi người chỉ chạy được một đồng hồ — dừng đồng hồ đó trước khi bắt đầu công việc này.
            </p>
          </div>
          <button
            type="button"
            className="btn-secondary"
            onClick={handleStop}
            disabled={submitting}
            data-testid="btn-stop-other-timer"
          >
            {submitting ? 'Đang dừng…' : `Dừng đồng hồ công việc #${timer.taskId}`}
          </button>
        </div>
      )}

      {!timer && !showStartForm && (
        <button
          type="button"
          className="btn-secondary"
          onClick={() => setShowStartForm(true)}
          disabled={!canStart}
          title={canStart ? undefined : 'Không thể bắt đầu bấm giờ cho công việc này'}
          data-testid="btn-open-start-timer"
        >
          {ICONS.clock} Bắt đầu bấm giờ
        </button>
      )}

      {!timer && showStartForm && (
        <div>
          <div className="form-grid">
            <div className="form-field--full">
              <label className="form-label" htmlFor="timer-note">
                Ghi chú <span className="text-danger">*</span>
              </label>
              <input
                id="timer-note"
                type="text"
                className={`form-input ${noteError ? 'form-input--error' : ''}`}
                maxLength={1000}
                placeholder="Ví dụ: Phân tích quy trình hiện tại"
                value={note}
                onChange={(e) => {
                  setNote(e.target.value);
                  if (noteError) setNoteError(undefined);
                }}
                disabled={submitting}
                data-testid="timer-note-input"
              />
              {noteError && <p className="field-error">{noteError}</p>}
            </div>
            <div>
              <label className="form-label" htmlFor="timer-billable" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <input
                  id="timer-billable"
                  type="checkbox"
                  checked={billable}
                  onChange={(e) => setBillable(e.target.checked)}
                  disabled={submitting}
                  data-testid="timer-billable-input"
                />
                Tính phí
              </label>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                setShowStartForm(false);
                setNote('');
                setNoteError(undefined);
              }}
              disabled={submitting}
            >
              Hủy bỏ
            </button>
            <button type="button" className="btn-primary" onClick={handleStart} disabled={submitting} data-testid="btn-confirm-start-timer">
              {ICONS.clock} {submitting ? 'Đang bắt đầu…' : 'Bắt đầu'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
