package com.serviceops.modules.contract.service;

import com.serviceops.modules.contract.dto.request.ContractAppendixCreateReq;
import com.serviceops.modules.contract.dto.response.ContractAppendixRes;

import java.util.List;

public interface ContractAppendixService {

	ContractAppendixRes create(Long contractId, ContractAppendixCreateReq request);

	List<ContractAppendixRes> list(Long contractId);
}