package com.serviceops.modules.project.service;

import com.serviceops.modules.project.dto.request.ProjectCreateFromContractReq;
import com.serviceops.modules.project.dto.response.ProjectRes;

public interface ProjectService {
	ProjectRes createFromContract(Long contractId, ProjectCreateFromContractReq request);
}