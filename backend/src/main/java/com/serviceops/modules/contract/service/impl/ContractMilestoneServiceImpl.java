package com.serviceops.modules.contract.service.impl;

import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import com.serviceops.modules.contract.dto.request.ContractMilestoneReq;
import com.serviceops.modules.contract.dto.response.ContractMilestoneRes;
import com.serviceops.modules.contract.entity.Contract;
import com.serviceops.modules.contract.entity.ContractMilestone;
import com.serviceops.modules.contract.enums.ContractAuditAction;
import com.serviceops.modules.contract.enums.ContractMilestoneStatus;
import com.serviceops.modules.contract.logging.ContractAuditLogger;
import com.serviceops.modules.contract.repository.ContractMilestoneRepository;
import com.serviceops.modules.contract.repository.ContractRepository;
import com.serviceops.modules.contract.service.ContractMilestoneService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class ContractMilestoneServiceImpl implements ContractMilestoneService {

    private static final BigDecimal ONE_HUNDRED = new BigDecimal("100");

    private final ContractRepository contractRepository;
    private final ContractMilestoneRepository milestoneRepository;
    private final ContractAuditLogger auditLogger;

    @Override
    @Transactional(readOnly = true)
    public List<ContractMilestoneRes> list(Long contractId) {
        requireContract(contractId);
        return milestoneRepository.findByContractIdOrderByExpectedDateAscIdAsc(contractId).stream()
                .map(this::toResponse)
                .toList();
    }

    @Override
    public List<ContractMilestoneRes> replace(Long contractId, List<ContractMilestoneReq> requests) {
        Contract contract = requireContract(contractId);
        if (requests == null || requests.isEmpty()) {
            throw new BusinessRuleException(ErrorCode.VALIDATION_ERROR,
                    "Hop dong phai co it nhat mot moc thanh toan");
        }

        List<ContractMilestone> milestones = requests.stream()
                .map(request -> toEntity(contract, request))
                .toList();
        BigDecimal total = milestones.stream()
                .map(ContractMilestone::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .setScale(2, RoundingMode.HALF_UP);
        BigDecimal contractValue = contract.getTotalValue().setScale(2, RoundingMode.HALF_UP);
        if (total.compareTo(contractValue) != 0) {
            throw new BusinessRuleException(ErrorCode.VALIDATION_ERROR,
                    "Tong cac moc thanh toan phai bang gia tri hop dong (tong hien tai=" + total + ")");
        }

        milestoneRepository.deleteByContractId(contractId);
        List<ContractMilestone> saved = milestoneRepository.saveAll(milestones);
        auditLogger.record(contractId, ContractAuditAction.MILESTONE_UPDATE,
                "Khai bao " + saved.size() + " moc thanh toan, tong gia tri=" + total);
        return saved.stream().map(this::toResponse).toList();
    }

    private ContractMilestone toEntity(Contract contract, ContractMilestoneReq request) {
        if (request.percentage() == null && request.amount() == null) {
            throw new BusinessRuleException(ErrorCode.VALIDATION_ERROR,
                    "Moi moc thanh toan phai co ty le hoac so tien");
        }
        BigDecimal amount = request.amount();
        if (request.percentage() != null) {
            BigDecimal calculated = contract.getTotalValue()
                    .multiply(request.percentage())
                    .divide(ONE_HUNDRED, 2, RoundingMode.HALF_UP);
            if (amount != null && amount.setScale(2, RoundingMode.HALF_UP).compareTo(calculated) != 0) {
                throw new BusinessRuleException(ErrorCode.VALIDATION_ERROR,
                        "So tien khong khop voi ty le cua moc thanh toan");
            }
            amount = calculated;
        }
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessRuleException(ErrorCode.VALIDATION_ERROR,
                    "So tien thanh toan phai lon hon 0");
        }
        ContractMilestone milestone = new ContractMilestone();
        milestone.setContractId(contract.getId());
        milestone.setName(request.name().trim());
        milestone.setPercentage(request.percentage());
        milestone.setAmount(amount.setScale(2, RoundingMode.HALF_UP));
        milestone.setExpectedDate(request.expectedDate());
        milestone.setAcceptanceCondition(blankToNull(request.acceptanceCondition()));
        milestone.setStatus(ContractMilestoneStatus.PENDING);
        milestone.setCreatedBy(currentUsername());
        milestone.setCreatedAt(LocalDateTime.now());
        milestone.setUpdatedAt(LocalDateTime.now());
        return milestone;
    }

    @Override
    public ContractMilestoneRes updateStatus(Long contractId, Long milestoneId, ContractMilestoneStatus newStatus) {
        requireContract(contractId);
        ContractMilestone milestone = milestoneRepository.findById(milestoneId)
                .orElseThrow(() -> new BusinessRuleException(ErrorCode.RESOURCE_NOT_FOUND,
                        "Khong tim thay moc thanh toan voi id=" + milestoneId));
        if (!milestone.getContractId().equals(contractId)) {
            throw new BusinessRuleException(ErrorCode.RESOURCE_NOT_FOUND,
                    "Moc thanh toan voi id=" + milestoneId + " khong thuoc hop dong id=" + contractId);
        }

        ContractMilestoneStatus current = milestone.getStatus();
        // Chi cho di dung mot buoc ve phia truoc theo trinh tu enum khai bao
        // (PENDING -> READY_TO_INVOICE -> INVOICED), khong cho nhay coc hay lui lai.
        if (newStatus.ordinal() != current.ordinal() + 1) {
            throw new BusinessRuleException(ErrorCode.INVALID_STATE,
                    "Khong the doi trang thai moc thanh toan tu " + current + " sang " + newStatus
                            + " — chi duoc chuyen tuan tu PENDING -> READY_TO_INVOICE -> INVOICED");
        }

        milestone.setStatus(newStatus);
        milestone.setUpdatedAt(LocalDateTime.now());
        milestone = milestoneRepository.save(milestone);

        auditLogger.record(contractId, ContractAuditAction.MILESTONE_STATUS_UPDATE,
                "Doi trang thai moc thanh toan \"" + milestone.getName() + "\" tu " + current + " sang " + newStatus);

        return toResponse(milestone);
    }

    private Contract requireContract(Long contractId) {
        return contractRepository.findById(contractId)
                .orElseThrow(() -> new BusinessRuleException(ErrorCode.RESOURCE_NOT_FOUND,
                        "Khong tim thay hop dong voi id=" + contractId));
    }

    private ContractMilestoneRes toResponse(ContractMilestone milestone) {
        return new ContractMilestoneRes(milestone.getId(), milestone.getContractId(), milestone.getName(),
                milestone.getPercentage(), milestone.getAmount(), milestone.getExpectedDate(),
                milestone.getAcceptanceCondition(), milestone.getStatus().name(), milestone.getCreatedBy());
    }

    private String blankToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private String currentUsername() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        return authentication == null ? null : authentication.getName();
    }
}