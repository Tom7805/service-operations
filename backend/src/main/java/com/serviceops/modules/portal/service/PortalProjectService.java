package com.serviceops.modules.portal.service;

import com.serviceops.modules.portal.dto.response.PortalProjectProgressRes;
import com.serviceops.modules.portal.dto.response.PortalProjectRes;

import java.util.List;

/** NCL-13-CN-002: khach hang xem tien do cac du an cua chinh minh tren cong (QTN-26). */
public interface PortalProjectService {

	List<PortalProjectRes> listMyProjects();

	PortalProjectProgressRes getProgress(Long projectId);
}
