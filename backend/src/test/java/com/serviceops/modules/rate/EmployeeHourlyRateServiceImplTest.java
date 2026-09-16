package com.serviceops.modules.rate;

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
import com.serviceops.modules.rate.service.impl.EmployeeHourlyRateServiceImpl;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class EmployeeHourlyRateServiceImplTest {

	@Mock
	private EmployeeHourlyRateRepository employeeHourlyRateRepository;

	@Mock
	private EmployeeRepository employeeRepository;

	@Mock
	private AuditLogService auditLogService;

	@Mock
	private SensitiveAccessLogger sensitiveAccessLogger;

	@InjectMocks
	private EmployeeHourlyRateServiceImpl service;

	@Test
	@DisplayName("TC-01: Luong thanh cong - Nhap chi phi gio cong giu nguyen ban ghi cu va tao ban ghi moi")
	void createsNewHourlyRateAndKeepsExisting() {
		Long employeeId = 1L;
		when(employeeRepository.existsById(employeeId)).thenReturn(true);
		when(employeeHourlyRateRepository.findByEmployeeIdAndEffectiveFrom(employeeId, LocalDate.of(2026, 1, 1)))
				.thenReturn(Optional.empty());

		when(employeeHourlyRateRepository.save(any(EmployeeHourlyRate.class))).thenAnswer(inv -> {
			EmployeeHourlyRate entity = inv.getArgument(0);
			entity.setId(100L);
			return entity;
		});

		EmployeeHourlyRateCreateReq req = new EmployeeHourlyRateCreateReq(new BigDecimal("250000"), LocalDate.of(2026, 1, 1));
		EmployeeHourlyRateRes result = service.create(employeeId, req);

		assertThat(result.employeeId()).isEqualTo(employeeId);
		assertThat(result.hourlyRate()).isEqualByComparingTo("250000");
		assertThat(result.effectiveFrom()).isEqualTo(LocalDate.of(2026, 1, 1));

		verify(employeeHourlyRateRepository, never()).deleteAll();
		verify(auditLogService).record(anyString(), any(AuditTargetType.class), anyLong(), anyString(), anyString());
		verify(sensitiveAccessLogger).logView(eq(SensitiveDataType.SALARY), eq(employeeId), anyString(), anyString());
	}

	@Test
	@DisplayName("TC-03: Dong gio cong phat sinh truoc moi ngay hieu luc khai bao thi danh dau missingCostData = true")
	void marksMissingCostDataWhenWorkDateIsBeforeAllEffectiveDates() {
		Long employeeId = 1L;
		when(employeeRepository.existsById(employeeId)).thenReturn(true);

		when(employeeHourlyRateRepository
				.findTopByEmployeeIdAndEffectiveFromLessThanEqualOrderByEffectiveFromDesc(employeeId, LocalDate.of(2025, 6, 1)))
				.thenReturn(Optional.empty());

		ResolvedEmployeeHourlyRateRes result = service.resolve(employeeId, LocalDate.of(2025, 6, 1));

		assertThat(result.missingCostData()).isTrue();
		assertThat(result.hourlyRate()).isNull();
		assertThat(result.effectiveFrom()).isNull();
	}

	@Test
	@DisplayName("TC-03: Tra cuu gia von thanh cong khi ngay phat sinh co ngay hieu luc hop le")
	void resolvesHourlyRateSuccessfully() {
		Long employeeId = 1L;
		when(employeeRepository.existsById(employeeId)).thenReturn(true);

		EmployeeHourlyRate rate = new EmployeeHourlyRate();
		rate.setEmployeeId(employeeId);
		rate.setHourlyRate(new BigDecimal("250000"));
		rate.setEffectiveFrom(LocalDate.of(2026, 1, 1));

		when(employeeHourlyRateRepository
				.findTopByEmployeeIdAndEffectiveFromLessThanEqualOrderByEffectiveFromDesc(employeeId, LocalDate.of(2026, 6, 1)))
				.thenReturn(Optional.of(rate));

		ResolvedEmployeeHourlyRateRes result = service.resolve(employeeId, LocalDate.of(2026, 6, 1));

		assertThat(result.missingCostData()).isFalse();
		assertThat(result.hourlyRate()).isEqualByComparingTo("250000");
		assertThat(result.effectiveFrom()).isEqualTo(LocalDate.of(2026, 1, 1));
	}

	@Test
	@DisplayName("TC-04: Xem chi phi gio cong va ghi nhat ky truy cap du lieu nhay cam")
	void recordsSensitiveAccessLogWhenListingRates() {
		Long employeeId = 1L;
		when(employeeRepository.existsById(employeeId)).thenReturn(true);

		service.listByEmployee(employeeId);

		verify(sensitiveAccessLogger).logView(eq(SensitiveDataType.SALARY), eq(employeeId), eq("EmployeeHourlyRate"), anyString());
	}
}

