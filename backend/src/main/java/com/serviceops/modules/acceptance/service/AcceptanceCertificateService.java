package com.serviceops.modules.acceptance.service;

import com.serviceops.modules.acceptance.dto.request.AcceptanceCreateReq;
import com.serviceops.modules.acceptance.dto.request.AcceptanceUpdateReq;
import com.serviceops.modules.acceptance.dto.response.AcceptanceCertificateRes;
import com.serviceops.modules.acceptance.dto.response.AcceptanceDetailRes;
import com.serviceops.modules.acceptance.dto.response.AcceptanceReadinessRes;
import com.serviceops.modules.acceptance.enums.AcceptanceStatus;

import java.util.List;

/** NCL-12-CN-001: lap, nop lai va tra cuu phieu nghiem thu hang muc. */
public interface AcceptanceCertificateService {

	/** Xem truoc hang muc da du dieu kien lap phieu chua (QTN-24) va noi dung se vao phieu. */
	AcceptanceReadinessRes getReadiness(Long projectId, Long workPackageId);

	/**
	 * Lap phieu cho hang muc da hoan thanh toan bo cong viec; phieu o trang thai PENDING_CONFIRMATION.
	 *
	 * @throws com.serviceops.common.exception.BusinessRuleException RESOURCE_NOT_FOUND (du an/hang
	 *         muc), INVALID_STATE (du an da dong, hang muc chua co/con cong viec dang do — TC-02),
	 *         DUPLICATE_DATA (hang muc hoac nhanh cay cua no da co phieu)
	 * @throws org.springframework.security.access.AccessDeniedException khong phai PM cua du an (TC-03)
	 */
	AcceptanceDetailRes create(Long projectId, AcceptanceCreateReq request);

	/** Chinh sua va nop lai phieu dang NEEDS_REVISION (sau khi khach hang tu choi). */
	AcceptanceDetailRes resubmit(Long certificateId, AcceptanceUpdateReq request);

	List<AcceptanceCertificateRes> listByProject(Long projectId);

	/** Ke toan thay moi phieu; Quan ly du an chi thay phieu cua du an minh phu trach. */
	List<AcceptanceCertificateRes> search(Long contractId, Long projectId, AcceptanceStatus status);

	AcceptanceDetailRes getDetail(Long certificateId);
}
