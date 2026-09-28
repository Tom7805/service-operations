package com.serviceops.modules.rate.service;

import com.serviceops.modules.rate.dto.request.BillRateUpdateReq;
import com.serviceops.modules.rate.dto.request.ContractBillRateCreateReq;
import com.serviceops.modules.rate.dto.response.ContractBillRateRes;
import com.serviceops.modules.rate.dto.response.ResolvedContractBillRateRes;

import java.time.LocalDate;
import java.util.List;

public interface ContractBillRateService {

	ContractBillRateRes create(Long contractId, ContractBillRateCreateReq request);

	/** Sua truc tiep dong don gia rieng chua ap dung truoc hom nay — cung quy tac {@code RateEditRules}. */
	ContractBillRateRes update(Long contractId, Long rateId, BillRateUpdateReq request);

	List<ContractBillRateRes> listByContract(Long contractId);

	ResolvedContractBillRateRes resolve(Long contractId, String professionalRole, String level, LocalDate asOf);
}

