package com.serviceops.modules.report;

import com.serviceops.common.audit.AuditTargetType;
import com.serviceops.common.audit.service.AuditLogService;
import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.modules.contract.enums.ContractType;
import com.serviceops.modules.identity.employee.entity.Employee;
import com.serviceops.modules.identity.employee.repository.EmployeeRepository;
import com.serviceops.modules.identity.user.entity.User;
import com.serviceops.modules.profitability.service.impl.EntryMarginCalculator;
import com.serviceops.modules.report.dto.request.RevenueReportReq;
import com.serviceops.modules.report.dto.response.MonthlyRevenueReportRes;
import com.serviceops.modules.report.dto.response.MonthlyRevenueRes;
import com.serviceops.modules.report.projection.RevenueProjection;
import com.serviceops.modules.report.repository.RevenueQueryRepository;
import com.serviceops.modules.report.service.impl.RevenueReportServiceImpl;
import com.serviceops.modules.timesheet.entity.TimeEntry;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** NCL-11-CN-005 — Báo cáo doanh thu theo tháng. */
@ExtendWith(MockitoExtension.class)
class RevenueReportServiceTest {

	private static final YearMonth JAN = YearMonth.of(2026, 1);
	private static final YearMonth DEC = YearMonth.of(2026, 12);

	@Mock private RevenueQueryRepository revenueQueryRepository;
	@Mock private EmployeeRepository employeeRepository;
	@Mock private EntryMarginCalculator entryMarginCalculator;
	@Mock private AuditLogService auditLogService;

	@InjectMocks private RevenueReportServiceImpl service;

	/**
	 * TC-01: mười hai tháng có đủ mười hai điểm dữ liệu, tách theo loại hợp đồng; so với cùng tháng năm trước và tổng
	 * cả kỳ.
	 */
	@Test
	void returnsTwelveMonthsSplitByContractTypeWithPreviousYear() {
		Employee employee = employee(5L, 900L);
		TimeEntry janHourly = entry(1L, 900L, LocalDate.of(2026, 1, 5));
		TimeEntry janFixed = entry(2L, 900L, LocalDate.of(2026, 1, 20));
		TimeEntry marHourly = entry(3L, 900L, LocalDate.of(2026, 3, 2));
		TimeEntry lastJan = entry(4L, 900L, LocalDate.of(2025, 1, 10));

		when(revenueQueryRepository.findApprovedBillableEntries(JAN.atDay(1), DEC.atEndOfMonth())).thenReturn(List.of(
				new RevenueProjection(janHourly, 500L, ContractType.TIME_AND_MATERIAL),
				new RevenueProjection(janFixed, 501L, ContractType.FIXED_PRICE),
				new RevenueProjection(marHourly, 500L, ContractType.TIME_AND_MATERIAL)));
		when(revenueQueryRepository.findApprovedBillableEntries(LocalDate.of(2025, 1, 1), LocalDate.of(2025, 12, 31)))
				.thenReturn(List.of(new RevenueProjection(lastJan, 500L, ContractType.TIME_AND_MATERIAL)));
		when(employeeRepository.findByUser_IdIn(List.of(900L))).thenReturn(List.of(employee));
		stubRevenue(janHourly, employee, 500L, "10000000.00");
		stubRevenue(janFixed, employee, 501L, "5000000.00");
		stubRevenue(marHourly, employee, 500L, "8000000.00");
		stubRevenue(lastJan, employee, 500L, "12000000.00");

		MonthlyRevenueReportRes report = service.getMonthlyRevenue(new RevenueReportReq(JAN, DEC));

		assertThat(report.hasData()).isTrue();
		assertThat(report.months()).hasSize(12);
		assertThat(report.months()).extracting(MonthlyRevenueRes::month).startsWith(JAN).endsWith(DEC);

		MonthlyRevenueRes jan = report.months().get(0);
		assertThat(jan.revenue()).isEqualByComparingTo("15000000");
		assertThat(jan.byContractType()).containsOnlyKeys(ContractType.values());
		assertThat(jan.byContractType().get(ContractType.TIME_AND_MATERIAL)).isEqualByComparingTo("10000000");
		assertThat(jan.byContractType().get(ContractType.FIXED_PRICE)).isEqualByComparingTo("5000000");
		assertThat(jan.byContractType().get(ContractType.MAINTENANCE)).isEqualByComparingTo("0");
		assertThat(jan.previousYearRevenue()).isEqualByComparingTo("12000000");
		assertThat(jan.changePercent()).isEqualByComparingTo("25.00");

		MonthlyRevenueRes feb = report.months().get(1);
		assertThat(feb.revenue()).isEqualByComparingTo("0");
		assertThat(feb.changePercent()).isNull();

		assertThat(report.totalRevenue()).isEqualByComparingTo("23000000");
		assertThat(report.totalByContractType().get(ContractType.TIME_AND_MATERIAL)).isEqualByComparingTo("18000000");
		assertThat(report.previousYearTotalRevenue()).isEqualByComparingTo("12000000");
		assertThat(report.totalChangePercent()).isEqualByComparingTo("91.67");
		assertThat(report.warnings()).anyMatch(w -> w.contains("trọn gói"));
	}

	/** TC-02: kỳ chưa có doanh thu ghi nhận -> hasData = false, các tháng bằng 0, không lỗi. */
	@Test
	void emptyPeriodReportsNoData() {
		when(revenueQueryRepository.findApprovedBillableEntries(any(), any())).thenReturn(List.of());

		MonthlyRevenueReportRes report = service.getMonthlyRevenue(new RevenueReportReq(JAN, YearMonth.of(2026, 3)));

		assertThat(report.hasData()).isFalse();
		assertThat(report.months()).hasSize(3).allSatisfy(month -> assertThat(month.revenue()).isZero());
		assertThat(report.totalRevenue()).isZero();
		assertThat(report.totalChangePercent()).isNull();
		assertThat(report.warnings()).isEmpty();
	}

	/** Dòng thiếu hồ sơ nhân sự hoặc đơn giá bán được đếm và cảnh báo thay vì làm hỏng cả báo cáo. */
	@Test
	void countsEntriesWithoutRatesOrEmployeeProfile() {
		TimeEntry noProfile = entry(1L, 901L, LocalDate.of(2026, 1, 5));
		TimeEntry noRate = entry(2L, 900L, LocalDate.of(2026, 1, 6));
		Employee employee = employee(5L, 900L);
		when(revenueQueryRepository.findApprovedBillableEntries(JAN.atDay(1), JAN.atEndOfMonth())).thenReturn(List.of(
				new RevenueProjection(noProfile, 500L, ContractType.TIME_AND_MATERIAL),
				new RevenueProjection(noRate, 500L, ContractType.TIME_AND_MATERIAL)));
		when(revenueQueryRepository.findApprovedBillableEntries(LocalDate.of(2025, 1, 1), LocalDate.of(2025, 1, 31)))
				.thenReturn(List.of());
		when(employeeRepository.findByUser_IdIn(List.of(901L, 900L))).thenReturn(List.of(employee));
		when(entryMarginCalculator.resolve(noRate, employee, 500L)).thenReturn(
				new EntryMarginCalculator.Result(BigDecimal.ZERO, false, BigDecimal.ZERO, true));

		MonthlyRevenueReportRes report = service.getMonthlyRevenue(new RevenueReportReq(JAN, JAN));

		assertThat(report.hasData()).isTrue();
		assertThat(report.missingRevenueEntryCount()).isEqualTo(2);
		assertThat(report.warnings()).anyMatch(w -> w.startsWith("2 dòng giờ công"));
		verify(entryMarginCalculator, never()).resolve(eq(noProfile), any(), any());
	}

	/** TC-04: mỗi lượt xem ghi Nhật ký hệ thống. */
	@Test
	void logsEveryView() {
		when(revenueQueryRepository.findApprovedBillableEntries(any(), any())).thenReturn(List.of());

		service.getMonthlyRevenue(new RevenueReportReq(JAN, DEC));

		verify(auditLogService).record(eq("Xem báo cáo doanh thu theo tháng"), eq(AuditTargetType.GENERAL), isNull(),
				eq("Báo cáo doanh thu theo tháng"), contains("2026-01 đến 2026-12"));
	}

	@Test
	void validatesPeriod() {
		assertThatThrownBy(() -> new RevenueReportReq(null, DEC)).isInstanceOf(BusinessRuleException.class);
		assertThatThrownBy(() -> new RevenueReportReq(DEC, JAN)).isInstanceOf(BusinessRuleException.class);
		assertThatThrownBy(() -> new RevenueReportReq(YearMonth.of(2023, 1), DEC))
				.isInstanceOf(BusinessRuleException.class).hasMessageContaining("36");
		assertThat(new RevenueReportReq(YearMonth.of(2024, 1), DEC).monthCount()).isEqualTo(36);
	}

	private void stubRevenue(TimeEntry entry, Employee employee, Long contractId, String revenue) {
		when(entryMarginCalculator.resolve(entry, employee, contractId)).thenReturn(
				new EntryMarginCalculator.Result(BigDecimal.ZERO, false, new BigDecimal(revenue), false));
	}

	private static TimeEntry entry(Long id, Long userId, LocalDate workDate) {
		TimeEntry entry = new TimeEntry();
		entry.setId(id);
		entry.setUserId(userId);
		entry.setWorkDate(workDate);
		entry.setHours(new BigDecimal("8.00"));
		entry.setBillable(true);
		return entry;
	}

	private static Employee employee(Long employeeId, Long userId) {
		User user = new User();
		user.setId(userId);
		Employee employee = new Employee();
		employee.setId(employeeId);
		employee.setUser(user);
		return employee;
	}
}
