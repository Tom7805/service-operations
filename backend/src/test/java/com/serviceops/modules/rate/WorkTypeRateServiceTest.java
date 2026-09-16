package com.serviceops.modules.rate;

import com.serviceops.common.audit.AuditTargetType;
import com.serviceops.common.audit.service.AuditLogService;
import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import com.serviceops.modules.rate.dto.request.WorkTypeRateFactorReq;
import com.serviceops.modules.rate.dto.response.WorkTypeRateFactorRes;
import com.serviceops.modules.rate.entity.WorkTypeRateFactor;
import com.serviceops.modules.rate.repository.WorkTypeRateFactorRepository;
import com.serviceops.modules.rate.service.impl.WorkTypeRateServiceImpl;
import com.serviceops.modules.timesheet.enums.WorkType;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class WorkTypeRateServiceTest {

	@Mock
	private WorkTypeRateFactorRepository workTypeRateFactorRepository;

	@Mock
	private AuditLogService auditLogService;

	@InjectMocks
	private WorkTypeRateServiceImpl service;

	@Test
	@DisplayName("Khai bao he so moi cho mot loai hinh cong viec chua ton tai")
	void createsNewFactor() {
		when(workTypeRateFactorRepository.findByWorkType(WorkType.OVERTIME)).thenReturn(Optional.empty());
		when(workTypeRateFactorRepository.save(any(WorkTypeRateFactor.class))).thenAnswer(inv -> {
			WorkTypeRateFactor entity = inv.getArgument(0);
			entity.setId(1L);
			return entity;
		});

		WorkTypeRateFactorRes result = service.upsert(new WorkTypeRateFactorReq(WorkType.OVERTIME, new BigDecimal("1.50")));

		assertThat(result.workType()).isEqualTo(WorkType.OVERTIME);
		assertThat(result.factor()).isEqualByComparingTo("1.50");
	}

	@Test
	@DisplayName("Khai bao lai mot loai hinh da co thi ghi de he so cu")
	void updatesExistingFactor() {
		WorkTypeRateFactor existing = new WorkTypeRateFactor();
		existing.setId(2L);
		existing.setWorkType(WorkType.WEEKEND);
		existing.setFactor(new BigDecimal("1.80"));
		when(workTypeRateFactorRepository.findByWorkType(WorkType.WEEKEND)).thenReturn(Optional.of(existing));
		when(workTypeRateFactorRepository.save(any(WorkTypeRateFactor.class))).thenAnswer(inv -> inv.getArgument(0));

		WorkTypeRateFactorRes result = service.upsert(new WorkTypeRateFactorReq(WorkType.WEEKEND, new BigDecimal("2.00")));

		assertThat(result.factor()).isEqualByComparingTo("2.00");
		org.mockito.Mockito.verify(auditLogService).record(anyString(), any(AuditTargetType.class), anyLong(), anyString(), anyString());
	}

	@Test
	@DisplayName("He so am hoac bang 0 bi reject VALIDATION_ERROR")
	void rejectsNonPositiveFactor() {
		assertThatThrownBy(() -> service.upsert(new WorkTypeRateFactorReq(WorkType.NORMAL, BigDecimal.ZERO)))
				.isInstanceOf(BusinessRuleException.class)
				.extracting(e -> ((BusinessRuleException) e).getErrorCode())
				.isEqualTo(ErrorCode.VALIDATION_ERROR);
	}

	@Test
	@DisplayName("Danh sach he so tra ve tat ca loai hinh da khai bao")
	void listsAllFactors() {
		WorkTypeRateFactor normal = new WorkTypeRateFactor();
		normal.setWorkType(WorkType.NORMAL);
		normal.setFactor(new BigDecimal("1.00"));
		when(workTypeRateFactorRepository.findAllByOrderByWorkTypeAsc()).thenReturn(List.of(normal));

		List<WorkTypeRateFactorRes> result = service.listAll();

		assertThat(result).hasSize(1);
		assertThat(result.get(0).workType()).isEqualTo(WorkType.NORMAL);
	}

	@Test
	@DisplayName("Tra he so cua loai hinh da khai bao")
	void resolvesFactorForKnownWorkType() {
		WorkTypeRateFactor holiday = new WorkTypeRateFactor();
		holiday.setWorkType(WorkType.HOLIDAY);
		holiday.setFactor(new BigDecimal("3.00"));
		when(workTypeRateFactorRepository.findByWorkType(WorkType.HOLIDAY)).thenReturn(Optional.of(holiday));

		BigDecimal factor = service.resolveFactor(WorkType.HOLIDAY);

		assertThat(factor).isEqualByComparingTo("3.00");
	}

	@Test
	@DisplayName("Loai hinh chua khai bao he so thi bao RESOURCE_NOT_FOUND")
	void rejectsUnresolvedWorkType() {
		when(workTypeRateFactorRepository.findByWorkType(WorkType.HOLIDAY)).thenReturn(Optional.empty());

		assertThatThrownBy(() -> service.resolveFactor(WorkType.HOLIDAY))
				.isInstanceOf(BusinessRuleException.class)
				.extracting(e -> ((BusinessRuleException) e).getErrorCode())
				.isEqualTo(ErrorCode.RESOURCE_NOT_FOUND);
	}
}
