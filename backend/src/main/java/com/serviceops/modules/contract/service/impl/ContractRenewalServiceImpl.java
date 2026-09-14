package com.serviceops.modules.contract.service.impl;

import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import com.serviceops.modules.contract.dto.request.RenewalCreateReq;
import com.serviceops.modules.contract.dto.response.RenewalRes;
import com.serviceops.modules.contract.entity.Contract;
import com.serviceops.modules.contract.entity.ContractRenewal;
import com.serviceops.modules.contract.enums.ContractAuditAction;
import com.serviceops.modules.contract.enums.ContractStatus;
import com.serviceops.modules.contract.logging.ContractAuditLogger;
import com.serviceops.modules.contract.repository.ContractRenewalRepository;
import com.serviceops.modules.contract.repository.ContractRepository;
import com.serviceops.modules.contract.service.ContractRenewalService;
import com.serviceops.modules.contract.validator.ContractLimitValidator;
import com.serviceops.modules.project.entity.Project;
import com.serviceops.modules.project.enums.ProjectStatus;
import com.serviceops.modules.project.logging.ProjectAuditLogger;
import com.serviceops.modules.project.repository.ProjectRepository;
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

/**
 * NCL-04-CN-007: Gia han hop dong.
 *
 * <p>Dieu kien bat dau: hop dong dang ACTIVE (con hieu luc). Hop dong da
 * COMPLETED hoac TERMINATED ("da dong") bi tu choi va nguoi dung duoc de
 * nghi lap hop dong moi (TC-02), dung quy uoc INVALID_STATE nhu cac ham
 * validate trang thai khac cua module hop dong.</p>
 */
@Service
@RequiredArgsConstructor
@Transactional
public class ContractRenewalServiceImpl implements ContractRenewalService {

	private final ContractRepository contractRepository;
	private final ContractRenewalRepository renewalRepository;
	private final ContractAuditLogger auditLogger;
	private final ContractLimitValidator contractLimitValidator;
	private final ProjectRepository projectRepository;
	private final ProjectAuditLogger projectAuditLogger;

	@Override
	public RenewalRes create(Long contractId, RenewalCreateReq request) {
		Contract contract = requireContract(contractId);
		if (contract.getStatus() != ContractStatus.ACTIVE) {
			throw new BusinessRuleException(ErrorCode.INVALID_STATE,
					"Chi gia han duoc hop dong dang con hieu luc (ACTIVE); "
							+ "hop dong da dong vui long lap hop dong moi");
		}

		LocalDate previousEndDate = contract.getEndDate();
		if (previousEndDate == null) {
			throw new BusinessRuleException(ErrorCode.INVALID_STATE,
					"Hop dong chua co ngay ket thuc nen khong the gia han; "
							+ "vui long khai bao ngay ket thuc cho hop dong truoc");
		}
		LocalDate newEndDate = request.newEndDate();
		if (!newEndDate.isAfter(previousEndDate)) {
			throw new BusinessRuleException(ErrorCode.VALIDATION_ERROR,
					"Ngay ket thuc moi phai sau ngay ket thuc hien tai cua hop dong");
		}

		BigDecimal additional = request.additionalValue() == null
				? BigDecimal.ZERO
				: request.additionalValue().setScale(2, RoundingMode.HALF_UP);
		BigDecimal before = contract.getTotalValue().setScale(2, RoundingMode.HALF_UP);
		BigDecimal after = before.add(additional).setScale(2, RoundingMode.HALF_UP);
		if (additional.signum() != 0) {
			contractLimitValidator.validate(after, contract.getLimitValue());
		}

		ContractRenewal renewal = new ContractRenewal();
		renewal.setContractId(contractId);
		renewal.setPreviousEndDate(previousEndDate);
		renewal.setNewEndDate(newEndDate);
		renewal.setAdditionalValue(additional);
		renewal.setValueBefore(before);
		renewal.setValueAfter(after);
		renewal.setNotes(request.notes() == null ? null : request.notes().trim());
		renewal.setCreatedBy(currentUsername());
		renewal.setCreatedAt(LocalDateTime.now());
		renewal = renewalRepository.save(renewal);

		contract.setEndDate(newEndDate);
		contract.setTotalValue(after);
		contractRepository.save(contract);

		auditLogger.record(contractId, ContractAuditAction.RENEWAL_CREATE,
				"Gia han hop dong tu " + previousEndDate + " den " + newEndDate
						+ ", gia tri hop dong " + before + " -> " + after);

		syncRunningProjectTimeline(contractId, newEndDate);

		return toResponse(renewal);
	}

	@Override
	@Transactional(readOnly = true)
	public List<RenewalRes> list(Long contractId) {
		requireContract(contractId);
		return renewalRepository.findByContractIdOrderByCreatedAtDesc(contractId).stream()
				.map(this::toResponse)
				.toList();
	}

	/**
	 * NCL-04-CN-007: khi hop dong duoc gia han, day ngay ket thuc du kien cua du an
	 * dang RUNNING (neu co) theo dung ngay ket thuc moi cua hop dong. Du an da CLOSED
	 * giu nguyen vi la du lieu lich su, khong bi doi nguoc lai.
	 */
	private void syncRunningProjectTimeline(Long contractId, LocalDate newEndDate) {
		List<Project> projects = projectRepository.findByContractIdOrderByIdDesc(contractId);
		for (Project project : projects) {
			if (project.getStatus() != ProjectStatus.RUNNING) {
				continue;
			}
			LocalDate previousExpectedEndDate = project.getExpectedEndDate();
			if (newEndDate.equals(previousExpectedEndDate)) {
				continue;
			}
			project.setExpectedEndDate(newEndDate);
			projectRepository.save(project);
			projectAuditLogger.recordTimelineSyncedFromContract(project.getId(), contractId,
					previousExpectedEndDate, newEndDate);
		}
	}

	private Contract requireContract(Long contractId) {
		return contractRepository.findById(contractId)
				.orElseThrow(() -> new BusinessRuleException(ErrorCode.RESOURCE_NOT_FOUND,
						"Khong tim thay hop dong voi id=" + contractId));
	}

	private RenewalRes toResponse(ContractRenewal renewal) {
		return new RenewalRes(renewal.getId(), renewal.getContractId(), renewal.getPreviousEndDate(),
				renewal.getNewEndDate(), renewal.getAdditionalValue(), renewal.getValueBefore(),
				renewal.getValueAfter(), renewal.getNotes(), renewal.getCreatedBy(), renewal.getCreatedAt());
	}

	private String currentUsername() {
		Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
		return authentication == null ? null : authentication.getName();
	}
}
