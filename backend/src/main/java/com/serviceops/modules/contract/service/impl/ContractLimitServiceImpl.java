package com.serviceops.modules.contract.service.impl;

import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import com.serviceops.modules.contract.dto.request.ContractUsageReq;
import com.serviceops.modules.contract.dto.response.ContractUsageRes;
import com.serviceops.modules.contract.entity.Contract;
import com.serviceops.modules.contract.enums.ContractAuditAction;
import com.serviceops.modules.contract.enums.UsageSource;
import com.serviceops.modules.contract.logging.ContractAuditLogger;
import com.serviceops.modules.contract.repository.ContractRepository;
import com.serviceops.modules.contract.service.ContractLimitService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;

/**
 * Nghiep vu canh bao khi sap vuot han muc hop dong (NCL-04-CN-005).
 *
 * <p>Luong xu ly (TC-01): doc hop dong - cong don gia tri phat sinh vao
 * used_value - neu nguon la gio cong da duyet thi luon cho ghi nhan, chi canh
 * bao khi ty le dat tu tam muoi phan tram han muc tro len - neu nguon la hoa
 * don thi tu choi ghi nhan khi lam vuot han muc tran (TC-02, QTN-19) - moi lan
 * ghi nhan thanh cong deu luu nhat ky LIMIT_USAGE_UPDATE (TC-04).</p>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ContractLimitServiceImpl implements ContractLimitService {

	/** Nguong canh bao sap vuot han muc (QTN-19, TC-01). */
	private static final BigDecimal WARNING_THRESHOLD_PERCENT = new BigDecimal("80");

	private final ContractRepository contractRepository;
	private final ContractAuditLogger contractAuditLogger;

	@Override
	@Transactional(readOnly = true)
	public ContractUsageRes getUsage(Long contractId) {
		Contract contract = findContract(contractId);
		return toResponse(contract);
	}

	@Override
	@Transactional
	public ContractUsageRes recordUsage(Long contractId, ContractUsageReq request) {
		Contract contract = findContract(contractId);

		BigDecimal currentUsed = contract.getUsedValue() == null ? BigDecimal.ZERO : contract.getUsedValue();
		BigDecimal resolvedUsed = currentUsed.add(request.amount());

		// TC-02 (QTN-19): hoa don khong duoc phep lam vuot han muc tran da khai bao.
		if (request.source() == UsageSource.INVOICE
				&& contract.getLimitValue() != null
				&& resolvedUsed.compareTo(contract.getLimitValue()) > 0) {
			throw new BusinessRuleException(ErrorCode.VALIDATION_ERROR,
					"Ghi nhan hoa don se lam vuot han muc tran cua hop dong, "
							+ "yeu cau lap phu luc dieu chinh han muc truoc khi xuat hoa don (QTN-19)");
		}

		contract.setUsedValue(resolvedUsed);
		contract = contractRepository.save(contract);

		ContractUsageRes response = toResponse(contract);

		// TC-04: ghi nguoi thuc hien, noi dung (nguon, gia tri phat sinh, ty le da dung) va thoi diem.
		contractAuditLogger.record(contractId, ContractAuditAction.LIMIT_USAGE_UPDATE,
				"Ghi nhan gia tri phat sinh tu " + request.source().name() + "=" + request.amount()
						+ ", gia tri da dung=" + resolvedUsed
						+ (response.usageRatio() == null ? "" : ", ty le da dung=" + response.usageRatio() + "%")
						+ (response.nearingLimit() ? " (canh bao sap vuot han muc)" : ""));

		log.info("CONTRACT_LIMIT_USAGE_RECORDED contractId={} source={} amount={} usedValue={} nearingLimit={} by={}",
				contractId, request.source(), request.amount(), resolvedUsed, response.nearingLimit(), currentUsername());

		return response;
	}

	private Contract findContract(Long contractId) {
		return contractRepository.findById(contractId)
				.orElseThrow(() -> new BusinessRuleException(ErrorCode.RESOURCE_NOT_FOUND,
						"Khong tim thay hop dong voi id=" + contractId));
	}

	private ContractUsageRes toResponse(Contract contract) {
		BigDecimal usedValue = contract.getUsedValue() == null ? BigDecimal.ZERO : contract.getUsedValue();
		BigDecimal limitValue = contract.getLimitValue();

		BigDecimal usageRatio = null;
		BigDecimal remainingValue = null;
		boolean nearingLimit = false;
		boolean overLimit = false;
		if (limitValue != null && limitValue.signum() > 0) {
			usageRatio = usedValue.multiply(new BigDecimal("100"))
					.divide(limitValue, 2, RoundingMode.HALF_UP);
			remainingValue = limitValue.subtract(usedValue);
			nearingLimit = usageRatio.compareTo(WARNING_THRESHOLD_PERCENT) >= 0;
			overLimit = usedValue.compareTo(limitValue) > 0;
		}

		return new ContractUsageRes(
				contract.getId(),
				contract.getTotalValue(),
				limitValue,
				usedValue,
				remainingValue,
				usageRatio,
				nearingLimit,
				overLimit
		);
	}

	private String currentUsername() {
		Authentication auth = SecurityContextHolder.getContext().getAuthentication();
		return auth == null ? null : auth.getName();
	}
}
