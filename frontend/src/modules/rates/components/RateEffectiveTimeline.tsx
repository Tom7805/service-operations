import { ICONS } from '../../../components/common/icons';
import type { BillRateHistoryRes } from '../types/rateTypes';

interface Props {
  history: BillRateHistoryRes;
}

function formatDailyRate(value: number): string {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(
    value
  );
}

function formatDate(value: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString('vi-VN');
}

function formatDateTime(value: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleString('vi-VN');
}

/**
 * NCL-07-CN-007 — Danh sách các mốc đơn giá đã từng khai báo cho một cặp
 * (vai trò, cấp bậc), mới nhất trước (backend trả `effectiveFrom` tăng dần —
 * đảo mảng ở đây theo đúng lưu ý API contract). `everChanged: false` (chỉ
 * đúng 1 mốc) hiển thị rõ ràng "chưa từng thay đổi" thay vì một bảng có 1
 * dòng trông giống lỗi tải thiếu dữ liệu (TC-02).
 */
export default function RateEffectiveTimeline({ history }: Props) {
  const entries = [...history.entries].reverse();

  return (
    <div data-testid="rate-effective-timeline">
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px', flexWrap: 'wrap' }}>
        <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600 }}>
          {history.professionalRole} ({history.level})
        </h3>
        {!history.everChanged && (
          <span className="badge badge--gray" data-testid="rate-history-never-changed">
            Chưa từng thay đổi — chỉ có 1 mốc đơn giá
          </span>
        )}
      </div>

      <div className="table-responsive">
        <table className="user-data-table" data-testid="rate-history-table">
          <thead>
            <tr>
              <th>Đơn giá / ngày công</th>
              <th>Hiệu lực từ</th>
              <th>Hiệu lực đến</th>
              <th>Người khai báo</th>
              <th>Thời điểm khai báo</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.id}>
                <td style={{ fontFamily: 'var(--font-mono, monospace)' }}>{formatDailyRate(entry.dailyRate)}</td>
                <td>{formatDate(entry.effectiveFrom)}</td>
                <td className="cell-muted">
                  {entry.current ? (
                    <span className="badge badge--green">
                      {ICONS.checkCircle} Đang áp dụng
                    </span>
                  ) : (
                    formatDate(entry.effectiveTo)
                  )}
                </td>
                <td>{entry.changedBy ?? '—'}</td>
                <td className="cell-muted">{formatDateTime(entry.changedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
