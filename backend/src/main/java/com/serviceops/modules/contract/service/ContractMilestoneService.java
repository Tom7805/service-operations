package com.serviceops.modules.contract.service;

import com.serviceops.modules.contract.dto.request.ContractMilestoneReq;
import com.serviceops.modules.contract.dto.response.ContractMilestoneRes;

import java.util.List;

public interface ContractMilestoneService {

    List<ContractMilestoneRes> list(Long contractId);

    List<ContractMilestoneRes> replace(Long contractId, List<ContractMilestoneReq> requests);
}