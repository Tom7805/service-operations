package com.serviceops.modules.rate;

import com.serviceops.common.audit.AuditTargetType;
import com.serviceops.common.audit.service.AuditLogService;
import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import com.serviceops.modules.rate.dto.request.BillRateCreateReq;
import com.serviceops.modules.rate.dto.response.BillRateRes;
import com.serviceops.modules.rate.entity.BillRate;
import com.serviceops.modules.rate.repository.BillRateRepository;
import com.serviceops.modules.rate.service.impl.BillRateServiceImpl;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
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
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * NCL-07-CN-001 (tao dong don gia) va NCL-07-CN-002 (hieu luc theo thoi diem, QTN-15).
 */
@ExtendWith(MockitoExtension.class)
class BillRateServiceImplTest {

	@Mock
	private BillRateRepository billRateRepository;

	@Mock
	private AuditLogService auditLogService;

	private BillRateServiceImpl service;

	private BillRateServiceImpl service() {
		return new BillRateServiceImpl(billRateRepository, auditLogService);
	}

	@Test
	@org.junit.jupiter.api.DisplayName("Tao dong don gia moi khong dung tren dong cu (NCL-07-CN-002 TC-01)")
	void createsNewRateWithoutTouchingExisting() {
		service = service();
		when(billRateRepository.findByProfessionalRoleIgnoreCaseAndLevelIgnoreCaseAndEffectiveFrom(
				"Lap trinh vien", "Cao cap", LocalDate.of(2026, 7, 1))).thenReturn(Optional.empty());
		when(billRateRepository.save(any(BillRate.class))).thenAnswer(invocation -> {
			BillRate saved = invocation.getArgument(0);
			saved.setId(2L);
			return saved;
		});

		BillRateRes result = service.create(new BillRateCreateReq("Lap trinh vien", "Cao cap",
				new BigDecimal("600000"), LocalDate.of(2026, 7, 1)));

		assertThat(result.dailyRate()).isEqualByComparingTo("600000");
		assertThat(result.effectiveFrom()).isEqualTo(LocalDate.of(2026, 7, 1));
		verify(billRateRepository, never()).deleteAll();
		verify(auditLogService).record(anyString(), any(AuditTargetType.class), anyLong(), anyString(), anyString());
	}

	@Test
	@org.junit.jupiter.api.DisplayName("Trung moc hieu luc bi tu choi (NCL-07-CN-002 TC-03)")
	void rejectsDuplicateEffectiveDate() {
		service = service();
		BillRate existing = new BillRate();
		existing.setProfessionalRole("Lap trinh vien");
		existing.setLevel("Cao cap");
		existing.setEffectiveFrom(LocalDate.of(2026, 7, 1));
		when(billRateRepository.findByProfessionalRoleIgnoreCaseAndLevelIgnoreCaseAndEffectiveFrom(
				"Lap trinh vien", "Cao cap", LocalDate.of(2026, 7, 1))).thenReturn(Optional.of(existing));

		assertThatThrownBy(() -> service.create(new BillRateCreateReq("Lap trinh vien", "Cao cap",
				new BigDecimal("600000"), LocalDate.of(2026, 7, 1))))
				.isInstanceOf(BusinessRuleException.class)
				.extracting(error -> ((BusinessRuleException) error).getErrorCode())
				.isEqualTo(ErrorCode.DUPLICATE_DATA);
		verify(billRateRepository, never()).save(any());
	}

	@Test
	@org.junit.jupiter.api.DisplayName("Gio cong phat sinh truoc ngay tang gia van ap don gia cu (NCL-07-CN-002 TC-02)")
	void resolvesOldRateForWorkDateBeforePriceChange() {
		service = service();
		BillRate oldRate = rate("Lap trinh vien", "Cao cap", "500000", LocalDate.of(2026, 1, 1));
		when(billRateRepository
				.findTopByProfessionalRoleIgnoreCaseAndLevelIgnoreCaseAndEffectiveFromLessThanEqualOrderByEffectiveFromDesc(
						"Lap trinh vien", "Cao cap", LocalDate.of(2026, 6, 30)))
				.thenReturn(Optional.of(oldRate));

		BillRateRes result = service.resolve("Lap trinh vien", "Cao cap", LocalDate.of(2026, 6, 30));

		assertThat(result.dailyRate()).isEqualByComparingTo("500000");
		assertThat(result.effectiveFrom()).isEqualTo(LocalDate.of(2026, 1, 1));
	}

	@Test
	@org.junit.jupiter.api.DisplayName("Gio cong phat sinh tu ngay hieu luc moi ap dung gia moi (NCL-07-CN-002 TC-02)")
	void resolvesNewRateOnOrAfterEffectiveDate() {
		service = service();
		BillRate newRate = rate("Lap trinh vien", "Cao cap", "600000", LocalDate.of(2026, 7, 1));
		when(billRateRepository
				.findTopByProfessionalRoleIgnoreCaseAndLevelIgnoreCaseAndEffectiveFromLessThanEqualOrderByEffectiveFromDesc(
						"Lap trinh vien", "Cao cap", LocalDate.of(2026, 7, 1)))
				.thenReturn(Optional.of(newRate));

		BillRateRes result = service.resolve("Lap trinh vien", "Cao cap", LocalDate.of(2026, 7, 1));

		assertThat(result.dailyRate()).isEqualByComparingTo("600000");
		assertThat(result.effectiveFrom()).isEqualTo(LocalDate.of(2026, 7, 1));
	}

	@Test
	@org.junit.jupiter.api.DisplayName("Chua co don gia hieu luc tai ngay yeu cau thi bao khong tim thay")
	void throwsNotFoundWhenNoRateApplies() {
		service = service();
		when(billRateRepository
				.findTopByProfessionalRoleIgnoreCaseAndLevelIgnoreCaseAndEffectiveFromLessThanEqualOrderByEffectiveFromDesc(
						"Lap trinh vien", "Cao cap", LocalDate.of(2020, 1, 1)))
				.thenReturn(Optional.empty());

		assertThatThrownBy(() -> service.resolve("Lap trinh vien", "Cao cap", LocalDate.of(2020, 1, 1)))
				.isInstanceOf(BusinessRuleException.class)
				.extracting(error -> ((BusinessRuleException) error).getErrorCode())
				.isEqualTo(ErrorCode.RESOURCE_NOT_FOUND);
	}

	private BillRate rate(String role, String level, String dailyRate, LocalDate effectiveFrom) {
		BillRate rate = new BillRate();
		rate.setProfessionalRole(role);
		rate.setLevel(level);
		rate.setDailyRate(new BigDecimal(dailyRate));
		rate.setEffectiveFrom(effectiveFrom);
		return rate;
	}
}
