package com.serviceops.modules.rate.service.impl;

import com.serviceops.common.audit.AuditTargetType;
import com.serviceops.common.audit.service.AuditLogService;
import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import com.serviceops.modules.contract.repository.ContractRepository;
import com.serviceops.modules.rate.dto.request.ContractBillRateCreateReq;
import com.serviceops.modules.rate.dto.response.BillRateRes;
import com.serviceops.modules.rate.dto.response.ContractBillRateRes;
import com.serviceops.modules.rate.dto.response.ResolvedContractBillRateRes;
import com.serviceops.modules.rate.entity.ContractBillRate;
import com.serviceops.modules.rate.repository.ContractBillRateRepository;
import com.serviceops.modules.rate.service.BillRateService;
import com.serviceops.modules.rate.service.ContractBillRateService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Service
// noRollbackFor: xem RateResolutionServiceImpl - nguoi goi (bao cao Epic 9) co the bat BusinessRuleException cua
// resolve(...) de danh dau "thieu don gia"; cac ham ghi ben duoi co @Transactional rieng nen khong bi anh huong.
@Transactional(readOnly = true, noRollbackFor = BusinessRuleException.class)
public class ContractBillRateServiceImpl implements ContractBillRateService {

	private final ContractBillRateRepository contractBillRateRepository;
	private final ContractRepository contractRepository;
	private final BillRateService billRateService;
	private final AuditLogService auditLogService;

	public ContractBillRateServiceImpl(ContractBillRateRepository contractBillRateRepository,
										ContractRepository contractRepository,
										BillRateService billRateService,
										AuditLogService auditLogService) {
		this.contractBillRateRepository = contractBillRateRepository;
		this.contractRepository = contractRepository;
		this.billRateService = billRateService;
		this.auditLogService = auditLogService;
	}

	@Override
	@Transactional
	public ContractBillRateRes create(Long contractId, ContractBillRateCreateReq request) {
		if (contractId == null || !contractRepository.existsById(contractId)) {
			throw new BusinessRuleException(ErrorCode.RESOURCE_NOT_FOUND, "Không tìm thấy hợp đồng với ID: " + contractId);
		}

		String role = request.professionalRole() == null ? "" : request.professionalRole().trim();
		if (role.isBlank()) {
			throw new BusinessRuleException(ErrorCode.VALIDATION_ERROR, "Vai trò chuyên môn không được để trống");
		}
		String level = request.level() == null ? "" : request.level().trim();
		if (level.isBlank()) {
			throw new BusinessRuleException(ErrorCode.VALIDATION_ERROR, "Cấp bậc không được để trống");
		}
		if (request.dailyRate() == null || request.dailyRate().compareTo(BigDecimal.ZERO) < 0) {
			throw new BusinessRuleException(ErrorCode.VALIDATION_ERROR, "Đơn giá theo ngày không được âm");
		}
		if (request.effectiveFrom() == null) {
			throw new BusinessRuleException(ErrorCode.VALIDATION_ERROR, "Ngày hiệu lực không được để trống");
		}

		contractBillRateRepository.findByContractIdAndProfessionalRoleIgnoreCaseAndLevelIgnoreCaseAndEffectiveFrom(
						contractId, role, level, request.effectiveFrom())
				.ifPresent(existing -> {
					throw new BusinessRuleException(ErrorCode.DUPLICATE_DATA,
							"Đơn giá riêng cho hợp đồng này tại vai trò, cấp bậc và ngày hiệu lực đã chọn đã tồn tại");
				});

		ContractBillRate entity = new ContractBillRate();
		entity.setContractId(contractId);
		entity.setProfessionalRole(role);
		entity.setLevel(level);
		entity.setDailyRate(request.dailyRate());
		entity.setEffectiveFrom(request.effectiveFrom());

		ContractBillRate saved = contractBillRateRepository.save(entity);

		auditLogService.record("Khai báo đơn giá riêng theo hợp đồng", AuditTargetType.GENERAL, contractId,
				role, "Tạo đơn giá riêng cho HĐ #" + contractId + ": " + role + " (" + level + ") = "
						+ request.dailyRate() + " / ngày, hiệu lực từ " + request.effectiveFrom());

		return new ContractBillRateRes(saved.getContractId(), saved.getProfessionalRole(),
				saved.getLevel(), saved.getDailyRate(), saved.getEffectiveFrom());
	}

	@Override
	public List<ContractBillRateRes> listByContract(Long contractId) {
		if (contractId == null || !contractRepository.existsById(contractId)) {
			throw new BusinessRuleException(ErrorCode.RESOURCE_NOT_FOUND, "Không tìm thấy hợp đồng với ID: " + contractId);
		}
		return contractBillRateRepository.findByContractIdOrderByEffectiveFromDesc(contractId).stream()
				.map(rate -> new ContractBillRateRes(rate.getContractId(), rate.getProfessionalRole(),
						rate.getLevel(), rate.getDailyRate(), rate.getEffectiveFrom()))
				.toList();
	}

	@Override
	public ResolvedContractBillRateRes resolve(Long contractId, String professionalRole, String level, LocalDate asOf) {
		if (contractId == null || !contractRepository.existsById(contractId)) {
			throw new BusinessRuleException(ErrorCode.RESOURCE_NOT_FOUND, "Không tìm thấy hợp đồng với ID: " + contractId);
		}

		String role = professionalRole == null ? "" : professionalRole.trim();
		if (role.isBlank()) {
			throw new BusinessRuleException(ErrorCode.VALIDATION_ERROR, "Vai trò chuyên môn không được để trống");
		}
		String lvl = level == null ? "" : level.trim();
		if (lvl.isBlank()) {
			throw new BusinessRuleException(ErrorCode.VALIDATION_ERROR, "Cấp bậc không được để trống");
		}
		if (asOf == null) {
			throw new BusinessRuleException(ErrorCode.VALIDATION_ERROR, "Ngày phát sinh không được để trống");
		}

		// QTN-16: Đơn giá hợp đồng ưu tiên hơn bảng giá chung
		var specificRateOpt = contractBillRateRepository
				.findTopByContractIdAndProfessionalRoleIgnoreCaseAndLevelIgnoreCaseAndEffectiveFromLessThanEqualOrderByEffectiveFromDesc(
						contractId, role, lvl, asOf);

		if (specificRateOpt.isPresent()) {
			ContractBillRate specificRate = specificRateOpt.get();
			return new ResolvedContractBillRateRes(specificRate.getDailyRate(), specificRate.getEffectiveFrom(), true);
		}

		// Quay về dùng đơn giá chung công ty
		BillRateRes generalRate = billRateService.resolve(role, lvl, asOf);
		return new ResolvedContractBillRateRes(generalRate.dailyRate(), generalRate.effectiveFrom(), false);
	}
}
