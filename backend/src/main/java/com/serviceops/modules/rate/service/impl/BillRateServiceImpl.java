package com.serviceops.modules.rate.service.impl;

import com.serviceops.common.audit.AuditTargetType;
import com.serviceops.common.audit.service.AuditLogService;
import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import com.serviceops.modules.rate.dto.request.BillRateCreateReq;
import com.serviceops.modules.rate.dto.response.BillRateRes;
import com.serviceops.modules.rate.entity.BillRate;
import com.serviceops.modules.rate.repository.BillRateRepository;
import com.serviceops.modules.rate.service.BillRateService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

@Service
@Transactional(readOnly = true)
public class BillRateServiceImpl implements BillRateService {

	private final BillRateRepository billRateRepository;
	private final AuditLogService auditLogService;

	public BillRateServiceImpl(BillRateRepository billRateRepository, AuditLogService auditLogService) {
		this.billRateRepository = billRateRepository;
		this.auditLogService = auditLogService;
	}

	@Override
	@Transactional
	public BillRateRes create(BillRateCreateReq request) {
		String role = request.professionalRole() == null ? "" : request.professionalRole().trim();
		if (role.isBlank()) {
			throw new BusinessRuleException(ErrorCode.VALIDATION_ERROR, "Vai trò chuyên môn không được để trống");
		}
		String level = request.level() == null ? "" : request.level().trim();
		if (level.isBlank()) {
			throw new BusinessRuleException(ErrorCode.VALIDATION_ERROR, "Cấp bậc không được để trống");
		}
		if (request.dailyRate() == null || request.dailyRate().compareTo(java.math.BigDecimal.ZERO) < 0) {
			throw new BusinessRuleException(ErrorCode.VALIDATION_ERROR, "Đơn giá theo ngày không được âm");
		}
		if (request.effectiveFrom() == null) {
			throw new BusinessRuleException(ErrorCode.VALIDATION_ERROR, "Ngày hiệu lực không được để trống");
		}

		billRateRepository.findByProfessionalRoleIgnoreCaseAndLevelIgnoreCaseAndEffectiveFrom(role, level, request.effectiveFrom())
				.ifPresent(existing -> {
					throw new BusinessRuleException(ErrorCode.DUPLICATE_DATA,
							"Đơn giá cho vai trò và cấp bậc này đã tồn tại tại ngày hiệu lực đã chọn");
				});

		BillRate entity = new BillRate();
		entity.setProfessionalRole(role);
		entity.setLevel(level);
		entity.setDailyRate(request.dailyRate());
		entity.setEffectiveFrom(request.effectiveFrom());
		BillRate saved = billRateRepository.save(entity);
		auditLogService.record("Khởi tạo bảng đơn giá theo vai trò", AuditTargetType.GENERAL, saved.getId(),
				role, "Tạo đơn giá mới: " + role + " (" + level + ") = " + request.dailyRate()
						+ " / ngày, hiệu lực từ " + request.effectiveFrom());
		return new BillRateRes(saved.getProfessionalRole(), saved.getLevel(), saved.getDailyRate(), saved.getEffectiveFrom());
	}

	@Override
	public List<BillRateRes> listCurrentlyEffective() {
		return billRateRepository.findAllCurrentlyEffective(LocalDate.now()).stream()
				.map(rate -> new BillRateRes(rate.getProfessionalRole(), rate.getLevel(), rate.getDailyRate(), rate.getEffectiveFrom()))
				.toList();
	}

	@Override
	public BillRateRes resolve(String professionalRole, String level, LocalDate asOf) {
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

		BillRate rate = billRateRepository
				.findTopByProfessionalRoleIgnoreCaseAndLevelIgnoreCaseAndEffectiveFromLessThanEqualOrderByEffectiveFromDesc(
						role, lvl, asOf)
				.orElseThrow(() -> new BusinessRuleException(ErrorCode.RESOURCE_NOT_FOUND,
						"Chưa có đơn giá hiệu lực cho " + role + " (" + lvl + ") tại ngày " + asOf));
		return new BillRateRes(rate.getProfessionalRole(), rate.getLevel(), rate.getDailyRate(), rate.getEffectiveFrom());
	}
}
