package com.serviceops.modules.profitability.service;

import com.serviceops.modules.profitability.dto.response.ProjectMarginRes;

public interface ProjectMarginService {

	/** Tinh bien loi nhuan gop theo du lieu hien hanh cua du an. */
	ProjectMarginRes calculateProjectMargin(Long projectId);
}