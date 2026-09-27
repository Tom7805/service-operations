package com.serviceops.modules.portal.service;

import com.serviceops.modules.identity.user.enums.UserStatus;
import com.serviceops.modules.portal.dto.request.PortalAccountCreateReq;
import com.serviceops.modules.portal.dto.request.PortalAccountStatusReq;
import com.serviceops.modules.portal.dto.response.PortalAccountRes;
import com.serviceops.modules.portal.dto.response.PortalContactCandidateRes;

import java.util.List;

/** NCL-13-CN-001: Quan tri vien cap, tra cuu, khoa va mo lai tai khoan cong khach hang (QTN-26). */
public interface PortalAccountService {

	/** Nguoi lien he cua mot khach hang kem tai khoan cong da cap (neu co). */
	List<PortalContactCandidateRes> listCandidates(Long customerId);

	PortalAccountRes create(PortalAccountCreateReq request);

	List<PortalAccountRes> search(Long customerId, UserStatus status);

	PortalAccountRes get(Long accountId);

	PortalAccountRes updateStatus(Long accountId, PortalAccountStatusReq request);
}
