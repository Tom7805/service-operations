import type { DeliverableVersionRes } from '../types/acceptanceTypes';

interface Props {
  versions: DeliverableVersionRes[];
  /** Phiên bản vừa lưu — tô sáng để người dùng thấy bản mới cùng các bản cũ vẫn còn nguyên. */
  highlightId?: number | null;
}

function formatDate(value: string): string {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString('vi-VN');
}

function formatDateTime(value: string): string {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleString('vi-VN');
}

/**
 * NCL-12-CN-004 — Lịch sử phiên bản của một sản phẩm bàn giao, mới nhất trước. Phiên bản đã lưu không sửa/xoá
 * được; mỗi dòng ghi người thực hiện và thời điểm ghi nhận (TC-04).
 */
export default function DeliverableVersionList({ versions, highlightId = null }: Props) {
  if (versions.length === 0) {
    return <p className="cell-muted" style={{ margin: 0 }}>Chưa bàn giao phiên bản nào.</p>;
  }
  return (
    <div className="table-responsive">
      <table className="user-data-table deliverable-version-table" data-testid="deliverable-version-list">
        <thead>
          <tr>
            <th>Phiên bản</th>
            <th>Ngày bàn giao</th>
            <th>Người nhận</th>
            <th>Tệp bàn giao</th>
            <th>Ghi chú</th>
            <th>Người ghi nhận</th>
          </tr>
        </thead>
        <tbody>
          {versions.map((v) => (
            <tr
              key={v.id}
              className={v.id === highlightId ? 'deliverable-version-row--new' : undefined}
              data-testid={`deliverable-version-${v.id}`}
            >
              <td style={{ whiteSpace: 'nowrap' }}>
                <strong style={{ fontFamily: 'var(--font-mono, monospace)' }}>{v.versionNo}</strong>
                {v.latest && <span className="badge badge--green" style={{ marginLeft: '8px' }}>Mới nhất</span>}
              </td>
              <td>{formatDate(v.deliveredDate)}</td>
              <td>{v.receiverName}</td>
              <td className="cell-muted" style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: '12.5px', overflowWrap: 'anywhere' }}>
                {v.fileUrl || '—'}
              </td>
              <td className="cell-muted">{v.note || '—'}</td>
              <td className="cell-muted" style={{ whiteSpace: 'nowrap' }}>
                {v.createdBy || '—'}
                <div style={{ fontSize: '12px' }}>{formatDateTime(v.createdAt)}</div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
