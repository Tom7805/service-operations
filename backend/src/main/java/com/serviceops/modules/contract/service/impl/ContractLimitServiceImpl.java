package com.serviceops.modules.contract.service.impl;

import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import com.serviceops.modules.contract.dto.response.ContractUsageRes;
import com.serviceops.modules.contract.entity.Contract;
import com.serviceops.modules.contract.entity.ContractMilestone;
import com.serviceops.modules.contract.enums.ContractMilestoneStatus;
import com.serviceops.modules.contract.repository.ContractMilestoneRepository;
import com.serviceops.modules.contract.repository.ContractRepository;
import com.serviceops.modules.contract.service.ContractLimitService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;

/**
 * NCL-04-CN-005: Canh bao khi sap vuot han muc hop dong (QTN-19).
 *
 * <p>{@code usedValue} lay tong gia tri cac moc thanh toan da chuyen trang
 * thai {@code INVOICED} - he thong chua co module hoa don rieng (Epic
 * NCL-10) nen day la can cu gan nhat the hien phan "da xuat hoa don" cua
 * hop dong. Nguong canh bao co dinh 80% theo mo ta nghiep vu cua story.</p>
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ContractLimitServiceImpl implements ContractLimitService {

	/** Nguong canh bao sap vuot han muc (TC-01). */
	static final int WARNING_THRESHOLD_PERCENT = 80;

	private final ContractRepository contractRepository;
	private final ContractMilestoneRepository milestoneRepository;

	@Override
	public ContractUsageRes getUsage(Long contractId) {
		Contract contract = contractRepository.findById(contractId)
				.orElseThrow(() -> new BusinessRuleException(ErrorCode.RESOURCE_NOT_FOUND,
						"Khong tim thay hop dong voi id=" + contractId));

		BigDecimal usedValue = milestoneRepository.findByContractIdOrderByExpectedDateAscIdAsc(contractId).stream()
				.filter(m -> m.getStatus() == ContractMilestoneStatus.INVOICED)
				.map(ContractMilestone::getAmount)
				.reduce(BigDecimal.ZERO, BigDecimal::add)
				.setScale(2, RoundingMode.HALF_UP);

		BigDecimal limitValue = contract.getLimitValue();
		if (limitValue == null) {
			// Khong dat han muc ("neu co") - khong co gi de canh bao.
			return new ContractUsageRes(contractId, contract.getTotalValue(), null, usedValue,
					null, null, false, false);
		}

		BigDecimal remaining = limitValue.subtract(usedValue).setScale(2, RoundingMode.HALF_UP);
		int usedPercentage = limitValue.signum() == 0
				? 0
				: usedValue.multiply(BigDecimal.valueOf(100))
						.divide(limitValue, 0, RoundingMode.HALF_UP)
						.intValue();
		boolean overLimit = usedValue.compareTo(limitValue) > 0;
		boolean nearLimit = !overLimit && usedPercentage >= WARNING_THRESHOLD_PERCENT;

		return new ContractUsageRes(contractId, contract.getTotalValue(), limitValue, usedValue,
				remaining, usedPercentage, nearLimit, overLimit);
	}
}
