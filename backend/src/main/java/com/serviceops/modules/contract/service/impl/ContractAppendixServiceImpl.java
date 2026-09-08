package com.serviceops.modules.contract.service.impl;

import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import com.serviceops.modules.contract.dto.request.ContractAppendixCreateReq;
import com.serviceops.modules.contract.dto.response.ContractAppendixRes;
import com.serviceops.modules.contract.entity.Contract;
import com.serviceops.modules.contract.entity.ContractAppendix;
import com.serviceops.modules.contract.enums.ContractAuditAction;
import com.serviceops.modules.contract.enums.ContractStatus;
import com.serviceops.modules.contract.logging.ContractAuditLogger;
import com.serviceops.modules.contract.repository.ContractAppendixRepository;
import com.serviceops.modules.contract.repository.ContractRepository;
import com.serviceops.modules.contract.service.ContractAppendixService;
import com.serviceops.modules.contract.validator.ContractLimitValidator;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class ContractAppendixServiceImpl implements ContractAppendixService {

	private final ContractRepository contractRepository;
	private final ContractAppendixRepository appendixRepository;
	private final ContractAuditLogger auditLogger;
	private final ContractLimitValidator contractLimitValidator;

	@Override
	public ContractAppendixRes create(Long contractId, ContractAppendixCreateReq request) {
		Contract contract = requireContract(contractId);
		if (contract.getStatus() != ContractStatus.ACTIVE) {
			throw new BusinessRuleException(ErrorCode.INVALID_STATE,
					"Chi duoc lap phu luc khi hop dong dang con hieu luc (ACTIVE)");
		}

		LocalDate effectiveDate = request.effectiveDate();
		if (contract.getStartDate() != null && effectiveDate.isBefore(contract.getStartDate())) {
			throw new BusinessRuleException(ErrorCode.INVALID_STATE,
					"Ngay hieu luc phu luc khong duoc som hon ngay bat dau hop dong");
		}
		if (contract.getEndDate() != null && effectiveDate.isAfter(contract.getEndDate())) {
			throw new BusinessRuleException(ErrorCode.INVALID_STATE,
					"Ngay hieu luc phu luc khong duoc sau ngay ket thuc hop dong");
		}

		BigDecimal adjustment = request.adjustmentValue().setScale(2, RoundingMode.HALF_UP);
		if (adjustment.signum() == 0) {
			throw new BusinessRuleException(ErrorCode.VALIDATION_ERROR,
					"Gia tri dieu chinh phai khac 0");
		}
		BigDecimal before = contract.getTotalValue().setScale(2, RoundingMode.HALF_UP);
		BigDecimal after = before.add(adjustment).setScale(2, RoundingMode.HALF_UP);
		if (after.signum() < 0) {
			throw new BusinessRuleException(ErrorCode.VALIDATION_ERROR,
					"Gia tri hop dong sau dieu chinh khong duoc am");
		}
		contractLimitValidator.validate(after, contract.getLimitValue());

		ContractAppendix appendix = new ContractAppendix();
		appendix.setContractId(contractId);
		appendix.setContent(request.content().trim());
		appendix.setAdjustmentValue(adjustment);
		appendix.setValueBefore(before);
		appendix.setValueAfter(after);
		appendix.setEffectiveDate(effectiveDate);
		appendix.setCreatedBy(currentUsername());
		appendix.setCreatedAt(LocalDateTime.now());
		appendix = appendixRepository.save(appendix);

		contract.setTotalValue(after);
		contractRepository.save(contract);
		auditLogger.record(contractId, ContractAuditAction.APPENDIX_CREATE,
				"Lap phu luc dieu chinh gia tri " + adjustment + ", gia tri hop dong "
						+ before + " -> " + after + ", hieu luc tu " + effectiveDate);
		return toResponse(appendix);
	}

	@Override
	@Transactional(readOnly = true)
	public List<ContractAppendixRes> list(Long contractId) {
		requireContract(contractId);
		return appendixRepository.findByContractIdOrderByEffectiveDateAscIdAsc(contractId).stream()
				.map(this::toResponse)
				.toList();
	}

	private Contract requireContract(Long contractId) {
		return contractRepository.findById(contractId)
				.orElseThrow(() -> new BusinessRuleException(ErrorCode.RESOURCE_NOT_FOUND,
						"Khong tim thay hop dong voi id=" + contractId));
	}

	private ContractAppendixRes toResponse(ContractAppendix appendix) {
		return new ContractAppendixRes(appendix.getId(), appendix.getContractId(), appendix.getContent(),
				appendix.getAdjustmentValue(), appendix.getValueBefore(), appendix.getValueAfter(),
				appendix.getEffectiveDate(), appendix.getCreatedBy(), appendix.getCreatedAt());
	}

	private String currentUsername() {
		Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
		return authentication == null ? null : authentication.getName();
	}
}