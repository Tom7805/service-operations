package com.serviceops.modules.acceptance.service;

import com.serviceops.modules.acceptance.dto.request.AcceptanceConfirmReq;
import com.serviceops.modules.acceptance.dto.request.AcceptanceRejectReq;
import com.serviceops.modules.acceptance.dto.response.AcceptanceDetailRes;

/**
 * NCL-12-CN-002: ghi nhan khach hang xac nhan hoac tu choi phieu nghiem thu (kenh noi bo — Quan ly du
 * an tai bien ban mo phong). Xac nhan khoa noi dung phieu va mo moc thanh toan da gan (QTN-25).
 */
public interface AcceptanceConfirmationService {

	AcceptanceDetailRes confirm(Long certificateId, AcceptanceConfirmReq request);

	AcceptanceDetailRes reject(Long certificateId, AcceptanceRejectReq request);

	/**
	 * NCL-13-CN-003: khach hang tu xac nhan phieu tren cong (kenh PORTAL) — cung quy tac voi {@link #confirm}:
	 * chi phieu PENDING_CONFIRMATION, khoa noi dung, mo moc thanh toan da gan (QTN-25). Ngay ky = hom nay,
	 * nguoi ky = nguoi lien he dang dang nhap cong, khong co bien ban giay.
	 *
	 * <p>Khong kiem tra quyen: noi goi (cong khach hang) PHAI chan pham vi khach hang truoc (QTN-26).</p>
	 */
	void confirmOnPortal(Long certificateId, String signerName);

	/** NCL-13-CN-003: khach hang tu choi phieu tren cong kem ly do — nhu {@link #reject}, kenh PORTAL. */
	void rejectOnPortal(Long certificateId, String reason, String signerName);
}
