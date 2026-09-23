package com.serviceops.modules.rate.service.impl;

import com.serviceops.common.audit.AuditTargetType;
import com.serviceops.common.audit.dto.AuditLogRes;
import com.serviceops.common.audit.service.AuditLogService;
import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import com.serviceops.modules.rate.dto.request.BillRateCreateReq;
import com.serviceops.modules.rate.dto.response.BillRateHistoryEntryRes;
import com.serviceops.modules.rate.dto.response.BillRateHistoryRes;
import com.serviceops.modules.rate.dto.response.BillRateRes;
import com.serviceops.modules.rate.entity.BillRate;
import com.serviceops.modules.rate.repository.BillRateRepository;
import com.serviceops.modules.rate.service.BillRateService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Service
// noRollbackFor: xem RateResolutionServiceImpl - resolve(...) duoc goi long trong luong tra don gia cua bao cao Epic 9.
@Transactional(readOnly = true, noRollbackFor = BusinessRuleException.class)
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

	@Override
	public BillRateHistoryRes history(String professionalRole, String level) {
		String role = professionalRole == null ? "" : professionalRole.trim();
		if (role.isBlank()) {
			throw new BusinessRuleException(ErrorCode.VALIDATION_ERROR, "Vai trò chuyên môn không được để trống");
		}
		String lvl = level == null ? "" : level.trim();
		if (lvl.isBlank()) {
			throw new BusinessRuleException(ErrorCode.VALIDATION_ERROR, "Cấp bậc không được để trống");
		}

		List<BillRate> rates = billRateRepository
				.findByProfessionalRoleIgnoreCaseAndLevelIgnoreCaseOrderByEffectiveFromAsc(role, lvl);
		if (rates.isEmpty()) {
			throw new BusinessRuleException(ErrorCode.RESOURCE_NOT_FOUND,
					"Chưa có đơn giá nào cho " + role + " (" + lvl + ")");
		}

		List<BillRateHistoryEntryRes> entries = new ArrayList<>();
		for (int i = 0; i < rates.size(); i++) {
			BillRate rate = rates.get(i);
			boolean isLatest = i == rates.size() - 1;
			// Khoang hieu luc cua mot moc ket thuc dung truoc ngay moc ke tiep bat dau — moc moi
			// nhat con dang ap dung nen effectiveTo la null (TC-01).
			LocalDate effectiveTo = isLatest ? null : rates.get(i + 1).getEffectiveFrom().minusDays(1);
			// "Nguoi thay doi" tra tu audit_logs cua chinh lan tao dong nay (NCL-07-CN-001 da ghi
			// san khi POST /bill-rates) — khong dung bang lich su rieng. Rong neu dong duoc tao
			// tu du lieu seed truoc khi co audit log.
			AuditLogRes log = auditLogService
					.findFirstForTarget(AuditTargetType.GENERAL, rate.getId())
					.orElse(null);
			entries.add(new BillRateHistoryEntryRes(rate.getId(), rate.getDailyRate(), rate.getEffectiveFrom(),
					effectiveTo, isLatest, log == null ? null : log.getActorUsername(),
					log == null ? null : log.getPerformedAt()));
		}

		// TC-02: chi mot moc duy nhat = chua tung thay doi.
		return new BillRateHistoryRes(role, lvl, entries, entries.size() > 1);
	}
}
