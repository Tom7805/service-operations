package com.serviceops.modules.acceptance.service;

import com.serviceops.modules.acceptance.dto.request.DeliverableCreateReq;
import com.serviceops.modules.acceptance.dto.request.DeliverableVersionReq;
import com.serviceops.modules.acceptance.dto.response.DeliverableRes;
import com.serviceops.modules.acceptance.dto.response.DeliverableVersionRes;

import java.util.List;

/** NCL-12-CN-004: quan ly san pham ban giao va phien ban. */
public interface DeliverableService {

	DeliverableRes create(Long projectId, DeliverableCreateReq request);

	/** @param workPackageId loc theo hang muc; NULL = moi san pham cua du an */
	List<DeliverableRes> list(Long projectId, Long workPackageId);

	DeliverableRes get(Long deliverableId);

	/** Them phien ban moi, giu nguyen phien ban cu (TC-01); trung so phien ban bi chan (TC-02). */
	DeliverableVersionRes addVersion(Long deliverableId, DeliverableVersionReq request);

	List<DeliverableVersionRes> listVersions(Long deliverableId);
}
