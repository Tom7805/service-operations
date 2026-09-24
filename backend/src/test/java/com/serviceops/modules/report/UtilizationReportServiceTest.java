package com.serviceops.modules.report;

import com.serviceops.common.audit.AuditTargetType;
import com.serviceops.common.audit.service.AuditLogService;
import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.modules.identity.department.entity.Department;
import com.serviceops.modules.identity.employee.entity.Employee;
import com.serviceops.modules.identity.employee.entity.Holiday;
import com.serviceops.modules.identity.employee.service.HolidayCalendar;
import com.serviceops.modules.identity.employee.service.HolidayService;
import com.serviceops.modules.identity.user.entity.User;
import com.serviceops.modules.report.dto.request.ReportPeriodReq;
import com.serviceops.modules.report.dto.response.UtilizationByDepartmentRes;
import com.serviceops.modules.report.dto.response.UtilizationEmployeeRes;
import com.serviceops.modules.report.dto.response.UtilizationRes;
import com.serviceops.modules.report.repository.UtilizationQueryRepository;
import com.serviceops.modules.report.service.impl.StandardHoursCalculator;
import com.serviceops.modules.report.service.impl.UtilizationReportServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

/**
 * NCL-11-CN-002 — báo cáo tỷ lệ giờ tính phí. Tháng 2/2026 có đúng 20 ngày làm việc nên 40 giờ/tuần cho 160 giờ chuẩn.
 */
@ExtendWith(MockitoExtension.class)
class UtilizationReportServiceTest {

	private static final LocalDate FROM = LocalDate.of(2026, 2, 1);
	private static final LocalDate TO = LocalDate.of(2026, 2, 28);
	private static final LocalDate LONG_AGO = LocalDate.of(2025, 1, 1);

	@Mock private UtilizationQueryRepository utilizationQueryRepository;
	@Mock private HolidayService holidayService;
	@Mock private AuditLogService auditLogService;

	private UtilizationReportServiceImpl service;

	@BeforeEach
	void setUp() {
		service = new UtilizationReportServiceImpl(utilizationQueryRepository, new StandardHoursCalculator(),
				holidayService, auditLogService);
		lenient().when(holidayService.calendarFor(any(), any())).thenReturn(HolidayCalendar.none());
	}

	/**
	 * Ngày lễ 2/2/2026 (thứ Hai) không tính giờ chuẩn: còn 19 ngày = 152 giờ. Giờ làm vào ngày lễ vẫn nằm ở tử số nên
	 * người làm 160 giờ tính phí ra 160/152 = 1.0526, vượt 100% giống làm thêm giờ.
	 */
	@Test
	void excludesHolidaysFromStandardHoursButKeepsHolidayWorkInBillableHours() {
		Holiday holiday = new Holiday();
		holiday.setName("Nghi bu");
		holiday.setHolidayDate(LocalDate.of(2026, 2, 2));
		when(holidayService.calendarFor(FROM, TO)).thenReturn(HolidayCalendar.of(List.of(holiday), FROM, TO));
		when(utilizationQueryRepository.findEmployeesEmployedBetween(FROM, TO))
				.thenReturn(List.of(employee(11L, 201L, "Nhan su A", "40.00", LONG_AGO, null)));
		when(utilizationQueryRepository.sumApprovedBillableHoursByUser(FROM, TO))
				.thenReturn(Map.of(201L, new BigDecimal("160.00")));

		UtilizationRes result = service.getReport(new ReportPeriodReq(FROM, TO));

		assertThat(result.employees().get(0).standardHours()).isEqualByComparingTo("152.00");
		assertThat(result.employees().get(0).ratio()).isEqualByComparingTo("1.0526");
		assertThat(result.totalRatio()).isEqualByComparingTo("1.0526");
	}

	/**
	 * TC-01 (120/160 = 75%), TC-02 (vào làm 16/2 chỉ tính 10 ngày = 80 giờ), TC-03 (chưa có giờ vẫn hiện, tỷ lệ 0),
	 * bán thời gian, nhân sự chưa gán bộ phận, và bộ phận là tổng ÷ tổng chứ không phải trung bình các tỷ lệ.
	 */
	@Test
	void reportsRatioPerEmployeePerDepartmentAndCompanyWide() {
		Department engineering = department(1L, "Phong ky thuat");
		Department sales = department(2L, "Phong kinh doanh");
		Employee full = employee(11L, 201L, "Nhan su A", "40.00", LONG_AGO, engineering);
		Employee midPeriodHire = employee(12L, 202L, "Nhan su B", "40.00", LocalDate.of(2026, 2, 16), engineering);
		Employee noHours = employee(13L, 203L, "Nhan su C", "40.00", LONG_AGO, engineering);
		Employee partTime = employee(14L, 204L, "Nhan su D", "20.00", LONG_AGO, sales);
		Employee noDepartment = employee(15L, 205L, "Nhan su E", "40.00", LONG_AGO, null);
		// Vào làm đúng thứ Bảy 28/2: không có ngày làm việc nào trong kỳ và không có giờ -> bị loại.
		Employee notWorkingInPeriod = employee(16L, 206L, "Nhan su F", "40.00", LocalDate.of(2026, 2, 28), engineering);

		when(utilizationQueryRepository.findEmployeesEmployedBetween(FROM, TO))
				.thenReturn(List.of(noDepartment, partTime, noHours, notWorkingInPeriod, midPeriodHire, full));
		when(utilizationQueryRepository.sumApprovedBillableHoursByUser(FROM, TO)).thenReturn(Map.of(
				201L, new BigDecimal("120.00"), 202L, new BigDecimal("40.00"), 204L, new BigDecimal("60.00"),
				205L, new BigDecimal("80.00"), 999L, new BigDecimal("24.00")));

		UtilizationRes result = service.getReport(new ReportPeriodReq(FROM, TO));

		assertThat(result.employees()).extracting(UtilizationEmployeeRes::fullName)
				.containsExactly("Nhan su A", "Nhan su B", "Nhan su C", "Nhan su D", "Nhan su E");
		assertEmployee(result, "Nhan su A", "120.00", "160.00", "0.7500");
		assertEmployee(result, "Nhan su B", "40.00", "80.00", "0.5000");
		assertEmployee(result, "Nhan su C", "0", "160.00", "0.0000");
		assertEmployee(result, "Nhan su D", "60.00", "80.00", "0.7500");
		assertEmployee(result, "Nhan su E", "80.00", "160.00", "0.5000");

		assertThat(result.departments()).extracting(UtilizationByDepartmentRes::departmentName)
				.containsExactly("Phong kinh doanh", "Phong ky thuat", "Chưa gán bộ phận");
		UtilizationByDepartmentRes salesLine = result.departments().get(0);
		assertThat(salesLine.employeeCount()).isEqualTo(1);
		assertThat(salesLine.ratio()).isEqualByComparingTo("0.7500");
		// (120 + 40 + 0) / (160 + 80 + 160), khác trung bình cộng (0.75 + 0.5 + 0) / 3
		UtilizationByDepartmentRes engineeringLine = result.departments().get(1);
		assertThat(engineeringLine.employeeCount()).isEqualTo(3);
		assertThat(engineeringLine.billableHours()).isEqualByComparingTo("160.00");
		assertThat(engineeringLine.standardHours()).isEqualByComparingTo("400.00");
		assertThat(engineeringLine.ratio()).isEqualByComparingTo("0.4000");
		UtilizationByDepartmentRes unassignedLine = result.departments().get(2);
		assertThat(unassignedLine.departmentId()).isNull();
		assertThat(unassignedLine.employeeCount()).isEqualTo(1);
		assertThat(unassignedLine.ratio()).isEqualByComparingTo("0.5000");

		// Tổng các dòng bộ phận khớp số toàn công ty; giờ của tài khoản không có hồ sơ được tách riêng.
		assertThat(result.totalBillableHours()).isEqualByComparingTo("300.00");
		assertThat(result.totalStandardHours()).isEqualByComparingTo("640.00");
		assertThat(result.totalRatio()).isEqualByComparingTo("0.4688");
		assertThat(result.departments().stream().map(UtilizationByDepartmentRes::billableHours)
				.reduce(BigDecimal.ZERO, BigDecimal::add)).isEqualByComparingTo(result.totalBillableHours());
		assertThat(result.departments().stream().map(UtilizationByDepartmentRes::standardHours)
				.reduce(BigDecimal.ZERO, BigDecimal::add)).isEqualByComparingTo(result.totalStandardHours());
		assertThat(result.unlistedBillableHours()).isEqualByComparingTo("24.00");
	}

	/** Có giờ tính phí nhưng không có ngày làm việc nào trong kỳ (dữ liệu ngày vào/nghỉ sai): hiện dòng với tỷ lệ rỗng, không mất giờ. */
	@Test
	void keepsEmployeeWithBillableHoursButNoStandardHoursAndLeavesRatioEmpty() {
		Employee anomaly = employee(16L, 206L, "Nhan su F", "40.00", LocalDate.of(2026, 2, 28), null);
		when(utilizationQueryRepository.findEmployeesEmployedBetween(FROM, TO)).thenReturn(List.of(anomaly));
		when(utilizationQueryRepository.sumApprovedBillableHoursByUser(FROM, TO))
				.thenReturn(Map.of(206L, new BigDecimal("8.00")));

		UtilizationRes result = service.getReport(new ReportPeriodReq(FROM, TO));

		assertThat(result.employees()).hasSize(1);
		assertThat(result.employees().get(0).ratio()).isNull();
		assertThat(result.employees().get(0).billableHours()).isEqualByComparingTo("8.00");
		assertThat(result.totalBillableHours()).isEqualByComparingTo("8.00");
		assertThat(result.totalRatio()).isNull();
		assertThat(result.unlistedBillableHours()).isEqualByComparingTo(BigDecimal.ZERO);
	}

	@Test
	void returnsEmptyReportWhenNoOneWorkedInThePeriod() {
		when(utilizationQueryRepository.findEmployeesEmployedBetween(FROM, TO)).thenReturn(List.of());
		when(utilizationQueryRepository.sumApprovedBillableHoursByUser(FROM, TO)).thenReturn(Map.of());

		UtilizationRes result = service.getReport(new ReportPeriodReq(FROM, TO));

		assertThat(result.employees()).isEmpty();
		assertThat(result.departments()).isEmpty();
		assertThat(result.totalBillableHours()).isEqualByComparingTo(BigDecimal.ZERO);
		assertThat(result.totalStandardHours()).isEqualByComparingTo(BigDecimal.ZERO);
		assertThat(result.totalRatio()).isNull();
	}

	/** TC-05: mỗi lượt xem thành công ghi nhật ký (người thực hiện/thời điểm do AuditLogService tự điền). */
	@Test
	void recordsAuditLogForSuccessfulView() {
		when(utilizationQueryRepository.findEmployeesEmployedBetween(FROM, TO)).thenReturn(List.of());
		when(utilizationQueryRepository.sumApprovedBillableHoursByUser(FROM, TO)).thenReturn(Map.of());

		service.getReport(new ReportPeriodReq(FROM, TO));

		verify(auditLogService).record(eq("Xem báo cáo tỷ lệ giờ tính phí"), eq(AuditTargetType.GENERAL), isNull(),
				eq("Báo cáo tỷ lệ giờ tính phí"), contains("2026-02-01 - 2026-02-28"));
	}

	@Test
	void rejectsMissingOrInvertedPeriodWithoutQueryingOrLogging() {
		assertThatThrownBy(() -> service.getReport(null)).isInstanceOf(BusinessRuleException.class);
		assertThatThrownBy(() -> service.getReport(new ReportPeriodReq(null, TO))).isInstanceOf(BusinessRuleException.class);
		assertThatThrownBy(() -> service.getReport(new ReportPeriodReq(FROM, null))).isInstanceOf(BusinessRuleException.class);
		assertThatThrownBy(() -> service.getReport(new ReportPeriodReq(TO, FROM))).isInstanceOf(BusinessRuleException.class);

		verifyNoInteractions(utilizationQueryRepository, auditLogService);
	}

	private static void assertEmployee(UtilizationRes result, String fullName, String billable, String standard, String ratio) {
		UtilizationEmployeeRes line = result.employees().stream()
				.filter(employee -> employee.fullName().equals(fullName)).findFirst().orElseThrow();
		assertThat(line.billableHours()).isEqualByComparingTo(billable);
		assertThat(line.standardHours()).isEqualByComparingTo(standard);
		assertThat(line.ratio()).isEqualByComparingTo(ratio);
	}

	private static Department department(Long id, String name) {
		Department department = new Department();
		department.setId(id);
		department.setName(name);
		return department;
	}

	private static Employee employee(Long id, Long userId, String fullName, String weeklyHours, LocalDate hireDate,
			Department department) {
		Employee employee = new Employee();
		employee.setId(id);
		employee.setStandardHoursPerWeek(new BigDecimal(weeklyHours));
		employee.setHireDate(hireDate);
		employee.setDepartment(department);
		User user = new User();
		user.setId(userId);
		user.setFullName(fullName);
		employee.setUser(user);
		return employee;
	}
}
