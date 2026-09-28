package com.serviceops.modules.acceptance.service;

import com.serviceops.modules.acceptance.dto.request.AcceptanceMilestoneLinkReq;
import com.serviceops.modules.acceptance.dto.response.AcceptanceDetailRes;
import com.serviceops.modules.acceptance.dto.response.MilestoneAcceptanceRes;

import java.util.List;

/**
 * NCL-12-CN-003: gan phieu nghiem thu voi moc thanh toan. Trang thai moc duoc dong bo theo phieu:
 * phieu ACCEPTED mo moc (READY_TO_INVOICE), phieu chua xac nhan giu moc o PENDING (QTN-25).
 */
public interface AcceptanceMilestoneLinkService {

	AcceptanceDetailRes link(Long certificateId, AcceptanceMilestoneLinkReq request);

	AcceptanceDetailRes unlink(Long certificateId);

	List<MilestoneAcceptanceRes> listForContract(Long contractId);
}
