package com.serviceops.modules.portal.service;

import com.serviceops.modules.acceptance.enums.AcceptanceStatus;
import com.serviceops.modules.portal.dto.request.PortalAcceptanceDecisionReq;
import com.serviceops.modules.portal.dto.response.PortalAcceptanceRes;
import com.serviceops.modules.portal.dto.response.PortalAcceptanceSummaryRes;

import java.util.List;

/** NCL-13-CN-003: khach hang xem, xac nhan hoac tu choi phieu nghiem thu tren cong (QTN-25, QTN-26). */
public interface PortalAcceptanceService {

	List<PortalAcceptanceSummaryRes> list(Long projectId, AcceptanceStatus status);

	PortalAcceptanceRes get(Long certificateId);

	PortalAcceptanceRes confirm(Long certificateId);

	PortalAcceptanceRes reject(Long certificateId, PortalAcceptanceDecisionReq request);
}
