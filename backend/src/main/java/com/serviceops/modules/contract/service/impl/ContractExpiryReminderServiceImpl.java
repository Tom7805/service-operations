package com.serviceops.modules.contract.service.impl;

import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import com.serviceops.modules.contract.dto.response.ContractExpiryAlertRes;
import com.serviceops.modules.contract.entity.Contract;
import com.serviceops.modules.contract.enums.ContractStatus;
import com.serviceops.modules.contract.repository.ContractRepository;
import com.serviceops.modules.contract.service.ContractExpiryReminderService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDate;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Stream;

/**
 * NCL-04-CN-006: Nhac hop dong sap het hieu luc.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ContractExpiryReminderServiceImpl implements ContractExpiryReminderService {

	private final ContractRepository contractRepository;

	@Override
	public List<ContractExpiryAlertRes> findExpiringSoon(int withinDays) {
		if (withinDays < 0) {
			throw new BusinessRuleException(ErrorCode.VALIDATION_ERROR,
					"So ngay ra soat khong duoc am");
		}
		LocalDate today = LocalDate.now();
		LocalDate to = today.plusDays(withinDays);

		// TC-02: hop dong da qua ngay ket thuc nhung chua duoc dong/gia han
		// (van ACTIVE) - khan cap nen luon liet ke bat ke withinDays la bao nhieu.
		List<Contract> alreadyExpired = contractRepository.findByStatusAndEndDateBefore(ContractStatus.ACTIVE, today);
		// TC-01: hop dong con hieu luc, sap het han trong vong withinDays ngay toi.
		List<Contract> expiringSoon = contractRepository.findByStatusAndEndDateBetween(ContractStatus.ACTIVE, today, to);

		return Stream.concat(alreadyExpired.stream(), expiringSoon.stream())
				.sorted(Comparator.comparing(Contract::getEndDate))
				.map(c -> new ContractExpiryAlertRes(c.getId(), c.getContractCode(), c.getName(),
						c.getCustomerId(), c.getEndDate(), Duration.between(today.atStartOfDay(),
								c.getEndDate().atStartOfDay()).toDays()))
				.toList();
	}
}
