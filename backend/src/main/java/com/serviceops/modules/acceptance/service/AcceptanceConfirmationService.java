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
}
