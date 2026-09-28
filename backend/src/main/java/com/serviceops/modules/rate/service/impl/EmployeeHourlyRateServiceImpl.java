package com.serviceops.modules.rate.service.impl;

import com.serviceops.common.audit.AuditTargetType;
import com.serviceops.common.audit.SensitiveAccessLogger;
import com.serviceops.common.audit.enums.SensitiveDataType;
import com.serviceops.common.audit.service.AuditLogService;
import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import com.serviceops.modules.identity.employee.repository.EmployeeRepository;
import com.serviceops.modules.rate.dto.request.EmployeeHourlyRateCreateReq;
import com.serviceops.modules.rate.dto.response.EmployeeHourlyRateRes;
import com.serviceops.modules.rate.dto.response.ResolvedEmployeeHourlyRateRes;
import com.serviceops.modules.rate.entity.EmployeeHourlyRate;
import com.serviceops.modules.rate.repository.EmployeeHourlyRateRepository;
import com.serviceops.modules.rate.service.EmployeeHourlyRateService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Service
@Transactional(readOnly = true)
public class EmployeeHourlyRateServiceImpl implements EmployeeHourlyRateService {

	private final EmployeeHourlyRateRepository employeeHourlyRateRepository;
	private final EmployeeRepository employeeRepository;
	private final AuditLogService auditLogService;
	private final SensitiveAccessLogger sensitiveAccessLogger;

	public EmployeeHourlyRateServiceImpl(EmployeeHourlyRateRepository employeeHourlyRateRepository,
										  EmployeeRepository employeeRepository,
										  AuditLogService auditLogService,
										  SensitiveAccessLogger sensitiveAccessLogger) {
		this.employeeHourlyRateRepository = employeeHourlyRateRepository;
		this.employeeRepository = employeeRepository;
		this.auditLogService = auditLogService;
		this.sensitiveAccessLogger = sensitiveAccessLogger;
	}

	@Override
	@Transactional
	public EmployeeHourlyRateRes create(Long employeeId, EmployeeHourlyRateCreateReq request) {
		if (employeeId == null || !employeeRepository.existsById(employeeId)) {
			throw new BusinessRuleException(ErrorCode.RESOURCE_NOT_FOUND, "Không tìm thấy hồ sơ nhân sự với ID: " + employeeId);
		}

		if (request.hourlyRate() == null || request.hourlyRate().compareTo(BigDecimal.ZERO) < 0) {
			throw new BusinessRuleException(ErrorCode.VALIDATION_ERROR, "Chi phí giờ công không được âm");
		}
		if (request.effectiveFrom() == null) {
			throw new BusinessRuleException(ErrorCode.VALIDATION_ERROR, "Ngày hiệu lực không được để trống");
		}

		employeeHourlyRateRepository.findByEmployeeIdAndEffectiveFrom(employeeId, request.effectiveFrom())
				.ifPresent(existing -> {
					throw new BusinessRuleException(ErrorCode.DUPLICATE_DATA,
							"Đã tồn tại khai báo chi phí giờ công cho nhân sự này tại ngày hiệu lực đã chọn");
				});

		EmployeeHourlyRate entity = new EmployeeHourlyRate();
		entity.setEmployeeId(employeeId);
		entity.setHourlyRate(request.hourlyRate());
		entity.setEffectiveFrom(request.effectiveFrom());

		EmployeeHourlyRate saved = employeeHourlyRateRepository.save(entity);

		auditLogService.record("Khai báo chi phí giờ công nội bộ", AuditTargetType.GENERAL, employeeId,
				"Chi phí giờ công", "Tạo chi phí giờ công cho NV #" + employeeId + " = "
						+ request.hourlyRate() + " / giờ, hiệu lực từ " + request.effectiveFrom());

		// Ghi nhật ký truy cập dữ liệu nhạy cảm (TC-04, SALARY/COST)
		sensitiveAccessLogger.logView(SensitiveDataType.SALARY, employeeId, "EmployeeHourlyRate",
				"Khai báo/cập nhật chi phí giờ công nội bộ cho nhân sự #" + employeeId);

		return new EmployeeHourlyRateRes(saved.getId(), saved.getEmployeeId(), saved.getHourlyRate(), saved.getEffectiveFrom());
	}

	@Override
	@Transactional
	public List<EmployeeHourlyRateRes> listByEmployee(Long employeeId) {
		if (employeeId == null || !employeeRepository.existsById(employeeId)) {
			throw new BusinessRuleException(ErrorCode.RESOURCE_NOT_FOUND, "Không tìm thấy hồ sơ nhân sự với ID: " + employeeId);
		}

		// Ghi nhật ký xem dữ liệu nhạy cảm chi phí giờ công (TC-04)
		sensitiveAccessLogger.logView(SensitiveDataType.SALARY, employeeId, "EmployeeHourlyRate",
				"Xem lịch sử chi phí giờ công nội bộ của nhân sự #" + employeeId);

		return employeeHourlyRateRepository.findByEmployeeIdOrderByEffectiveFromDesc(employeeId).stream()
				.map(rate -> new EmployeeHourlyRateRes(rate.getId(), rate.getEmployeeId(), rate.getHourlyRate(), rate.getEffectiveFrom()))
				.toList();
	}

	@Override
	public ResolvedEmployeeHourlyRateRes resolve(Long employeeId, LocalDate asOf) {
		if (employeeId == null || !employeeRepository.existsById(employeeId)) {
			throw new BusinessRuleException(ErrorCode.RESOURCE_NOT_FOUND, "Không tìm thấy hồ sơ nhân sự với ID: " + employeeId);
		}
		if (asOf == null) {
			throw new BusinessRuleException(ErrorCode.VALIDATION_ERROR, "Ngày phát sinh không được để trống");
		}

		var rateOpt = employeeHourlyRateRepository
				.findTopByEmployeeIdAndEffectiveFromLessThanEqualOrderByEffectiveFromDesc(employeeId, asOf);

		if (rateOpt.isEmpty()) {
			// TC-03: Dòng giờ công phát sinh trước mọi ngày hiệu lực đã khai báo -> Đánh dấu thiếu dữ liệu giá vốn
			return new ResolvedEmployeeHourlyRateRes(employeeId, null, null, true);
		}

		EmployeeHourlyRate rate = rateOpt.get();
		return new ResolvedEmployeeHourlyRateRes(employeeId, rate.getHourlyRate(), rate.getEffectiveFrom(), false);
	}
}

