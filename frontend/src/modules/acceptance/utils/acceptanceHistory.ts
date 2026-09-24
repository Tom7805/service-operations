import {
  CHANNEL_LABEL,
  DECISION_META,
  MILESTONE_STATUS_META,
  type AcceptanceDetailRes,
} from '../types/acceptanceTypes';

export interface AcceptanceHistoryEntry {
  key: string;
  at: string;
  actor: string | null;
  label: string;
  detail?: string | null;
  badge: string;
}

function formatAmount(value: number): string {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 2 }).format(value);
}

function formatDate(value: string): string {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString('vi-VN');
}

/**
 * Lịch sử nghiệm thu của một phiếu (TC-04 của NCL-12-CN-001/002/003), mới nhất trước: lập phiếu, các lần
 * khách hàng xác nhận/từ chối, lần nộp lại gần nhất và liên kết mốc thanh toán hiện tại. Bản ghi đầy đủ mọi
 * thao tác (kể cả gỡ mốc) nằm ở Nhật ký hệ thống, loại đối tượng "Nghiệm thu".
 */
export function buildAcceptanceHistory(certificate: AcceptanceDetailRes): AcceptanceHistoryEntry[] {
  const entries: AcceptanceHistoryEntry[] = [
    {
      key: 'created',
      at: certificate.createdAt,
      actor: certificate.createdBy,
      label: 'Lập phiếu nghiệm thu',
      detail: `Giá trị ${formatAmount(certificate.acceptedValue)} · ${certificate.tasks.length} công việc · ${certificate.deliverables.length} sản phẩm bàn giao`,
      badge: 'badge--blue',
    },
    ...certificate.decisions.map((d) => ({
      key: `decision-${d.id}`,
      at: d.recordedAt,
      actor: d.recordedBy,
      label: `${DECISION_META[d.decision]?.label ?? d.decision} (lần nộp ${d.revisionNo})`,
      detail: [
        d.decision === 'REJECTED' && d.reason && `Lý do: ${d.reason}`,
        d.signerName && `Người ký: ${d.signerName}`,
        d.signedDate && `ngày ký ${formatDate(d.signedDate)}`,
        d.minutesUrl && `biên bản ${d.minutesUrl}`,
        `kênh: ${CHANNEL_LABEL[d.channel] ?? d.channel}`,
      ]
        .filter(Boolean)
        .join(' · '),
      badge: DECISION_META[d.decision]?.badge ?? 'badge--gray',
    })),
  ];

  // Lần nộp lại gần nhất: phiếu đang chờ xác nhận ở lần nộp > 1 thì updatedAt chính là lúc nộp lại.
  if (certificate.status === 'PENDING_CONFIRMATION' && certificate.revisionNo > 1 && certificate.updatedAt) {
    entries.push({
      key: 'resubmit',
      at: certificate.updatedAt,
      // Chỉ QLDA của dự án mới nộp lại được; tên tài khoản cụ thể nằm trong Nhật ký hệ thống.
      actor: 'Quản lý dự án',
      label: `Nộp lại phiếu (lần ${certificate.revisionNo})`,
      detail: `Giá trị ${formatAmount(certificate.acceptedValue)} · ${certificate.tasks.length} công việc`,
      badge: 'badge--gold',
    });
  }

  // NCL-12-CN-003: liên kết mốc thanh toán hiện tại (Kế toán gắn).
  if (certificate.paymentMilestone && certificate.linkedAt) {
    const m = certificate.paymentMilestone;
    entries.push({
      key: 'linked',
      at: certificate.linkedAt,
      actor: certificate.linkedBy,
      label: 'Gắn vào mốc thanh toán',
      detail: `Mốc "${m.name}" · ${formatAmount(m.amount)} · trạng thái mốc hiện tại: ${MILESTONE_STATUS_META[m.status]?.label ?? m.status}`,
      badge: 'badge--purple',
    });
  }

  return entries.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
}
