package com.serviceops.modules.contract.service.impl;

import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import com.serviceops.modules.contract.dto.request.MilestoneCreateReq;
import com.serviceops.modules.contract.dto.request.MilestoneItemReq;
import com.serviceops.modules.contract.dto.response.MilestoneRes;
import com.serviceops.modules.contract.entity.Contract;
import com.serviceops.modules.contract.entity.ContractMilestone;
import com.serviceops.modules.contract.enums.ContractAuditAction;
import com.serviceops.modules.contract.enums.MilestoneStatus;
import com.serviceops.modules.contract.logging.ContractAuditLogger;
import com.serviceops.modules.contract.mapper.MilestoneMapper;
import com.serviceops.modules.contract.repository.ContractMilestoneRepository;
import com.serviceops.modules.contract.repository.ContractRepository;
import com.serviceops.modules.contract.service.ContractMilestoneService;
import com.serviceops.modules.contract.validator.MilestoneTotalValidator;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Nghiep vu quan ly moc thanh toan cua hop dong (NCL-04-CN-003).
 *
 * <p>Luong xu ly (TC-01): doc hop dong - quy doi tung moc ve so tien (nhap
 * truc tiep hoac tu ty le phan tram) - kiem tra tong dung bang gia tri hop
 * dong (TC-02, {@link MilestoneTotalValidator}) - thay the toan bo danh sach
 * moc cu bang danh sach moi - ghi nhat ky MILESTONE_UPDATE kem nguoi thuc
 * hien, noi dung va thoi diem (TC-04).</p>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ContractMilestoneServiceImpl implements ContractMilestoneService {

	private final ContractRepository contractRepository;
	private final ContractMilestoneRepository milestoneRepository;
	private final MilestoneMapper milestoneMapper;
	private final MilestoneTotalValidator milestoneTotalValidator;
	private final ContractAuditLogger contractAuditLogger;

	@Override
	@Transactional
	public List<MilestoneRes> replaceMilestones(Long contractId, MilestoneCreateReq request) {
		Contract contract = contractRepository.findById(contractId)
				.orElseThrow(() -> new BusinessRuleException(ErrorCode.RESOURCE_NOT_FOUND,
						"Khong tim thay hop dong voi id=" + contractId));

		List<ContractMilestone> resolved = new ArrayList<>();
		int order = 0;
		for (MilestoneItemReq item : request.milestones()) {
			ContractMilestone milestone = new ContractMilestone();
			milestone.setContractId(contractId);
			milestone.setName(item.name());
			milestone.setPercentage(item.percentage());
			milestone.setAmount(resolveAmount(item, contract.getTotalValue()));
			milestone.setExpectedDate(item.expectedDate());
			milestone.setAcceptanceCondition(item.acceptanceCondition());
			milestone.setStatus(MilestoneStatus.PLANNED);
			milestone.setSortOrder(order++);
			milestone.setCreatedAt(LocalDateTime.now());
			resolved.add(milestone);
		}

		// TC-02: tong cac moc phai dung bang gia tri hop dong, neu khong tu choi luu.
		milestoneTotalValidator.validate(contract.getTotalValue(),
				resolved.stream().map(ContractMilestone::getAmount).toList());

		milestoneRepository.deleteByContractId(contractId);
		List<ContractMilestone> saved = milestoneRepository.saveAll(resolved);

		// TC-04: ghi nguoi thuc hien, noi dung va thoi diem thay doi moc thanh toan.
		contractAuditLogger.record(contractId, ContractAuditAction.MILESTONE_UPDATE,
				"Cap nhat " + saved.size() + " moc thanh toan, tong=" + contract.getTotalValue());

		log.info("CONTRACT_MILESTONES_UPDATED contractId={} count={} by={}",
				contractId, saved.size(), currentUsername());

		return saved.stream().map(milestoneMapper::toResponse).toList();
	}

	@Override
	@Transactional(readOnly = true)
	public List<MilestoneRes> list(Long contractId) {
		if (!contractRepository.existsById(contractId)) {
			throw new BusinessRuleException(ErrorCode.RESOURCE_NOT_FOUND,
					"Khong tim thay hop dong voi id=" + contractId);
		}
		return milestoneRepository.findByContractIdOrderBySortOrderAsc(contractId).stream()
				.map(milestoneMapper::toResponse)
				.toList();
	}

	/** So tien nhap truc tiep duoc uu tien; neu bo trong thi quy doi tu ty le phan tram cua gia tri hop dong. */
	private BigDecimal resolveAmount(MilestoneItemReq item, BigDecimal totalValue) {
		if (item.amount() != null) {
			return item.amount();
		}
		if (item.percentage() == null) {
			throw new BusinessRuleException(ErrorCode.VALIDATION_ERROR,
					"Moc '" + item.name() + "' phai nhap ty le hoac so tien");
		}
		return totalValue.multiply(item.percentage())
				.divide(new BigDecimal("100"), 2, RoundingMode.HALF_UP);
	}

	private String currentUsername() {
		Authentication auth = SecurityContextHolder.getContext().getAuthentication();
		return auth == null ? null : auth.getName();
	}
}
