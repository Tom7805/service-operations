package com.serviceops.modules.contract.service.impl;

import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import com.serviceops.modules.contract.dto.request.AmendmentCreateReq;
import com.serviceops.modules.contract.dto.response.AmendmentRes;
import com.serviceops.modules.contract.entity.Contract;
import com.serviceops.modules.contract.entity.ContractAmendment;
import com.serviceops.modules.contract.enums.ContractAuditAction;
import com.serviceops.modules.contract.logging.ContractAuditLogger;
import com.serviceops.modules.contract.mapper.AmendmentMapper;
import com.serviceops.modules.contract.repository.ContractAmendmentRepository;
import com.serviceops.modules.contract.repository.ContractRepository;
import com.serviceops.modules.contract.service.ContractAmendmentService;
import com.serviceops.modules.contract.validator.ContractLimitValidator;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Nghiep vu lap phu luc dieu chinh hop dong (NCL-04-CN-004).
 *
 * <p>Luong xu ly (TC-01): doc hop dong - kiem tra co it nhat mot noi dung dieu
 * chinh (gia tri hoac thoi han, TC-02) - neu dieu chinh gia tri thi kiem tra
 * khong vuot han muc tran da khai bao ({@link ContractLimitValidator}, QTN-19)
 * - luu phu luc moi (THEM NOI TIEP, giu lai lich su - khac voi moc thanh toan
 * la thay the toan bo) - ap dung gia tri/thoi han moi len hop dong - ghi nhat
 * ky AMENDMENT_CREATE kem nguoi thuc hien, noi dung va thoi diem (TC-04).</p>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ContractAmendmentServiceImpl implements ContractAmendmentService {

	private final ContractRepository contractRepository;
	private final ContractAmendmentRepository amendmentRepository;
	private final AmendmentMapper amendmentMapper;
	private final ContractLimitValidator contractLimitValidator;
	private final ContractAuditLogger contractAuditLogger;

	@Override
	@Transactional
	public AmendmentRes create(Long contractId, AmendmentCreateReq request) {
		Contract contract = contractRepository.findById(contractId)
				.orElseThrow(() -> new BusinessRuleException(ErrorCode.RESOURCE_NOT_FOUND,
						"Khong tim thay hop dong voi id=" + contractId));

		// TC-02: phu luc phai dieu chinh it nhat mot trong hai noi dung gia tri/thoi han.
		if (request.newTotalValue() == null && request.newEndDate() == null) {
			throw new BusinessRuleException(ErrorCode.VALIDATION_ERROR,
					"Phu luc phai dieu chinh it nhat gia tri hoac thoi han hop dong");
		}

		if (request.newEndDate() != null && contract.getStartDate() != null
				&& request.newEndDate().isBefore(contract.getStartDate())) {
			throw new BusinessRuleException(ErrorCode.INVALID_STATE,
					"Ngay ket thuc moi khong duoc som hon ngay bat dau hop dong");
		}

		BigDecimal resolvedTotalValue = request.newTotalValue() != null
				? request.newTotalValue()
				: contract.getTotalValue();

		// QTN-19: gia tri hop dong sau dieu chinh khong duoc vuot han muc tran da khai bao (NCL-04-CN-002).
		contractLimitValidator.validate(resolvedTotalValue, contract.getLimitValue());

		BigDecimal oldTotalValue = contract.getTotalValue();
		LocalDate oldEndDate = contract.getEndDate();

		ContractAmendment amendment = new ContractAmendment();
		amendment.setContractId(contractId);
		amendment.setAmendmentNo(generateAmendmentNo(contract));
		amendment.setReason(request.reason());
		amendment.setOldTotalValue(request.newTotalValue() != null ? oldTotalValue : null);
		amendment.setNewTotalValue(request.newTotalValue());
		amendment.setOldEndDate(request.newEndDate() != null ? oldEndDate : null);
		amendment.setNewEndDate(request.newEndDate());
		amendment.setEffectiveDate(request.effectiveDate());
		amendment.setNotes(request.notes());
		amendment.setCreatedBy(currentUsername());
		amendment.setCreatedAt(LocalDateTime.now());
		amendment = amendmentRepository.save(amendment);

		if (request.newTotalValue() != null) {
			contract.setTotalValue(request.newTotalValue());
		}
		if (request.newEndDate() != null) {
			contract.setEndDate(request.newEndDate());
		}
		contractRepository.save(contract);

		// TC-04: ghi nguoi thuc hien, noi dung (gia tri/thoi han cu -> moi) va thoi diem.
		contractAuditLogger.record(contractId, ContractAuditAction.AMENDMENT_CREATE,
				"Lap phu luc " + amendment.getAmendmentNo() + ", ly do=" + request.reason()
						+ (request.newTotalValue() != null
								? ", gia tri: " + oldTotalValue + " -> " + request.newTotalValue()
								: "")
						+ (request.newEndDate() != null
								? ", thoi han: " + oldEndDate + " -> " + request.newEndDate()
								: ""));

		log.info("CONTRACT_AMENDMENT_CREATED contractId={} amendmentNo={} by={}",
				contractId, amendment.getAmendmentNo(), currentUsername());

		return amendmentMapper.toResponse(amendment);
	}

	@Override
	@Transactional(readOnly = true)
	public List<AmendmentRes> list(Long contractId) {
		if (!contractRepository.existsById(contractId)) {
			throw new BusinessRuleException(ErrorCode.RESOURCE_NOT_FOUND,
					"Khong tim thay hop dong voi id=" + contractId);
		}
		return amendmentRepository.findByContractIdOrderByCreatedAtDesc(contractId).stream()
				.map(amendmentMapper::toResponse)
				.toList();
	}

	/** Ma phu luc duy nhat: PL-<ma hop dong>-NN, NN la so thu tu phu luc cua hop dong (bat dau tu 01). */
	private String generateAmendmentNo(Contract contract) {
		long sequence = amendmentRepository.countByContractId(contract.getId()) + 1;
		return "PL-" + contract.getContractCode() + "-" + String.format("%02d", sequence);
	}

	private String currentUsername() {
		Authentication auth = SecurityContextHolder.getContext().getAuthentication();
		return auth == null ? null : auth.getName();
	}
}
