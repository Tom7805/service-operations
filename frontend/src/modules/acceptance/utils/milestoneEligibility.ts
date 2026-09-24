import { ACCEPTANCE_STATUS_META, type MilestoneAcceptanceRes } from '../types/acceptanceTypes';

export type MilestoneEligibility = 'ELIGIBLE' | 'INVOICED' | 'CERTIFICATE_NOT_ACCEPTED' | 'NO_CERTIFICATE';

/**
 * QTN-25 — mốc thanh toán chỉ đủ điều kiện lập hóa đơn khi đang "Sẵn sàng xuất hóa đơn" VÀ phiếu nghiệm
 * thu gắn kèm (nếu có) đã được khách hàng xác nhận. Khớp MilestoneAcceptanceValidator phía backend để màn
 * hình chặn trước, kèm lý do, thay vì để người dùng bấm rồi mới nhận lỗi 400 (NCL-12-CN-003 TC-02).
 */
export function milestoneEligibility(row: MilestoneAcceptanceRes): { state: MilestoneEligibility; reason: string } {
  if (row.milestoneStatus === 'INVOICED') {
    return { state: 'INVOICED', reason: 'Mốc đã xuất hóa đơn.' };
  }
  if (row.certificateId != null && row.certificateStatus !== 'ACCEPTED') {
    const label = row.certificateStatus ? ACCEPTANCE_STATUS_META[row.certificateStatus].label.toLowerCase() : 'chưa rõ trạng thái';
    return {
      state: 'CERTIFICATE_NOT_ACCEPTED',
      reason: `Chưa đủ điều kiện lập hóa đơn: phiếu ${row.certificateCode} chưa được khách hàng xác nhận (${label}).`,
    };
  }
  if (row.milestoneStatus === 'READY_TO_INVOICE') {
    return { state: 'ELIGIBLE', reason: 'Đủ điều kiện lập hóa đơn.' };
  }
  return {
    state: 'NO_CERTIFICATE',
    reason: 'Chưa đủ điều kiện lập hóa đơn: mốc chưa gắn phiếu nghiệm thu đã được khách hàng xác nhận.',
  };
}

/**
 * Trạng thái mốc sau khi gắn một phiếu có trạng thái `certificateStatus` — xem trước cho người dùng trước khi
 * xác nhận (bảng đồng bộ QTN-25 trong api-contract).
 */
export function milestoneStatusAfterLink(
  current: MilestoneAcceptanceRes['milestoneStatus'],
  certificateAccepted: boolean
): MilestoneAcceptanceRes['milestoneStatus'] {
  if (current === 'INVOICED') return current;
  return certificateAccepted ? 'READY_TO_INVOICE' : 'PENDING';
}
