package com.serviceops.modules.rate.service.impl;

import com.serviceops.common.audit.AuditTargetType;
import com.serviceops.common.audit.service.AuditLogService;
import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import com.serviceops.modules.rate.dto.request.WorkTypeRateFactorReq;
import com.serviceops.modules.rate.dto.response.WorkTypeRateFactorRes;
import com.serviceops.modules.rate.entity.WorkTypeRateFactor;
import com.serviceops.modules.rate.repository.WorkTypeRateFactorRepository;
import com.serviceops.modules.rate.service.WorkTypeRateService;
import com.serviceops.modules.timesheet.enums.WorkType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

@Service
@Transactional(readOnly = true)
public class WorkTypeRateServiceImpl implements WorkTypeRateService {

	private final WorkTypeRateFactorRepository workTypeRateFactorRepository;
	private final AuditLogService auditLogService;

	public WorkTypeRateServiceImpl(WorkTypeRateFactorRepository workTypeRateFactorRepository,
									AuditLogService auditLogService) {
		this.workTypeRateFactorRepository = workTypeRateFactorRepository;
		this.auditLogService = auditLogService;
	}

	@Override
	@Transactional
	public WorkTypeRateFactorRes upsert(WorkTypeRateFactorReq request) {
		if (request.workType() == null) {
			throw new BusinessRuleException(ErrorCode.VALIDATION_ERROR, "Loại hình công việc không được để trống");
		}
		if (request.factor() == null || request.factor().compareTo(BigDecimal.ZERO) <= 0) {
			throw new BusinessRuleException(ErrorCode.VALIDATION_ERROR, "Hệ số phải lớn hơn 0");
		}

		WorkTypeRateFactor entity = workTypeRateFactorRepository.findByWorkType(request.workType())
				.orElseGet(() -> {
					WorkTypeRateFactor created = new WorkTypeRateFactor();
					created.setWorkType(request.workType());
					return created;
				});
		BigDecimal previousFactor = entity.getFactor();
		entity.setFactor(request.factor());
		WorkTypeRateFactor saved = workTypeRateFactorRepository.save(entity);

		auditLogService.record("Khai báo hệ số đơn giá theo loại hình công việc", AuditTargetType.GENERAL,
				saved.getId(), saved.getWorkType().name(),
				(previousFactor == null ? "Tạo mới" : "Cập nhật (" + previousFactor + " -> )")
						+ " hệ số " + saved.getWorkType() + " = " + saved.getFactor());

		return new WorkTypeRateFactorRes(saved.getWorkType(), saved.getFactor());
	}

	@Override
	public List<WorkTypeRateFactorRes> listAll() {
		return workTypeRateFactorRepository.findAllByOrderByWorkTypeAsc().stream()
				.map(rate -> new WorkTypeRateFactorRes(rate.getWorkType(), rate.getFactor()))
				.toList();
	}

	@Override
	public BigDecimal resolveFactor(WorkType workType) {
		if (workType == null) {
			throw new BusinessRuleException(ErrorCode.VALIDATION_ERROR, "Loại hình công việc không được để trống");
		}
		return workTypeRateFactorRepository.findByWorkType(workType)
				.map(WorkTypeRateFactor::getFactor)
				.orElseThrow(() -> new BusinessRuleException(ErrorCode.RESOURCE_NOT_FOUND,
						"Chưa khai báo hệ số đơn giá cho loại hình công việc: " + workType));
	}
}
