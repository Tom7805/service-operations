package com.serviceops.modules.admin;

import com.serviceops.common.audit.AuditTargetType;
import com.serviceops.common.audit.service.AuditLogService;
import com.serviceops.common.enums.Currency;
import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import com.serviceops.modules.admin.dto.request.CompanySettingReq;
import com.serviceops.modules.admin.dto.response.CompanySettingRes;
import com.serviceops.modules.admin.dto.response.FiscalPeriodRes;
import com.serviceops.modules.admin.mapper.AdminMapper;
import com.serviceops.modules.admin.service.CompanySettingService;
import com.serviceops.modules.admin.service.FiscalPeriodService;
import com.serviceops.modules.admin.service.impl.CompanySettingServiceImpl;
import com.serviceops.modules.admin.service.impl.FiscalPeriodServiceImpl;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.tuple;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;

/** BE-QA NCL-15-CN-002: cau hinh cong ty va chia ky tai chinh theo thang bat dau. */
@DataJpaTest(properties = "spring.flyway.enabled=false")
@ActiveProfiles("test")
@Import({CompanySettingServiceImpl.class, FiscalPeriodServiceImpl.class, AdminMapper.class,
		CompanySettingServiceTest.Config.class})
class CompanySettingServiceTest {

	@TestConfiguration
	static class Config {
		@Bean
		Clock clock() {
			return Clock.fixed(Instant.parse("2026-02-10T03:00:00Z"), ZoneId.of("Asia/Ho_Chi_Minh"));
		}
	}

	@MockBean private AuditLogService auditLogService;
	@Autowired private CompanySettingService companySettingService;
	@Autowired private FiscalPeriodService fiscalPeriodService;

	@Test
	@DisplayName("Chua cau hinh -> tra mac dinh (VND, nam tai chinh tu thang 1, 22 ngay cong)")
	void defaultsWhenNotConfigured() {
		CompanySettingRes res = companySettingService.get();
		assertThat(res.configured()).isFalse();
		assertThat(res.currency()).isEqualTo(Currency.VND);
		assertThat(fiscalPeriodService.getFiscalYear(2026).startDate()).isEqualTo(LocalDate.of(2026, 1, 1));
	}

	@Test
	@DisplayName("TC-01: dat thang bat dau nam tai chinh la thang 4 -> bao cao theo nam chia ky tu thang 4")
	void fiscalYearStartsInApril() {
		companySettingService.update(req("Cong ty Mo phong", 4));

		FiscalPeriodRes fy = fiscalPeriodService.getFiscalYear(2026);
		assertThat(fy.startDate()).isEqualTo(LocalDate.of(2026, 4, 1));
		assertThat(fy.endDate()).isEqualTo(LocalDate.of(2027, 3, 31));
		assertThat(fy.quarters()).extracting(FiscalPeriodRes.Quarter::startDate, FiscalPeriodRes.Quarter::endDate)
				.containsExactly(
						tuple(LocalDate.of(2026, 4, 1), LocalDate.of(2026, 6, 30)),
						tuple(LocalDate.of(2026, 7, 1), LocalDate.of(2026, 9, 30)),
						tuple(LocalDate.of(2026, 10, 1), LocalDate.of(2026, 12, 31)),
						tuple(LocalDate.of(2027, 1, 1), LocalDate.of(2027, 3, 31)));
		assertThat(fy.months().get(11).yearMonth()).isEqualTo("2027-03");
		// Hom nay 10/02/2026 thuoc nam tai chinh 2025 (01/04/2025 - 31/03/2026).
		assertThat(fiscalPeriodService.resolve(null).fiscalYear()).isEqualTo(2025);
		assertThat(fiscalPeriodService.resolve(LocalDate.of(2026, 4, 1)).fiscalYear()).isEqualTo(2026);
	}

	@Test
	@DisplayName("TC-02: thieu ten cong ty -> VALIDATION_ERROR, khong luu")
	void companyNameRequired() {
		assertThatThrownBy(() -> companySettingService.update(req("   ", 4)))
				.isInstanceOf(BusinessRuleException.class)
				.extracting("errorCode").isEqualTo(ErrorCode.VALIDATION_ERROR);
		assertThat(companySettingService.get().configured()).isFalse();
	}

	@Test
	@DisplayName("TC-04: moi lan luu ghi nhat ky kem cac truong thay doi")
	void auditsChangedFields() {
		companySettingService.update(req("Cong ty Mo phong", 1));
		companySettingService.update(req("Cong ty Mo phong", 4));

		verify(auditLogService).record(eq("Cập nhật cấu hình công ty"), eq(AuditTargetType.SYSTEM), eq(1L),
				eq("Cấu hình công ty"), contains("thang bat dau nam tai chinh: 1 -> 4"));
		assertThat(companySettingService.get().fiscalYearStartMonth()).isEqualTo(4);
	}

	@Test
	@DisplayName("Nam tai chinh ngoai khoang hop ly -> VALIDATION_ERROR")
	void fiscalYearRange() {
		assertThatThrownBy(() -> fiscalPeriodService.getFiscalYear(1999))
				.extracting("errorCode").isEqualTo(ErrorCode.VALIDATION_ERROR);
	}

	private static CompanySettingReq req(String name, int startMonth) {
		return new CompanySettingReq(name, "0101234567", "Ha Noi", null, null, Currency.VND, startMonth, 22);
	}
}
