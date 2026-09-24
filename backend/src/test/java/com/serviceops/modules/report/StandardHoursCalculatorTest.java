package com.serviceops.modules.report;

import com.serviceops.modules.identity.employee.entity.Employee;
import com.serviceops.modules.identity.employee.entity.Holiday;
import com.serviceops.modules.identity.employee.service.HolidayCalendar;
import com.serviceops.modules.report.service.impl.StandardHoursCalculator;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * QTN-23 — giờ chuẩn của kỳ tính theo ngày thứ Hai đến thứ Sáu (không kể ngày lễ) × giờ/tuần ÷ 5, chỉ trong thời gian
 * nhân sự làm việc.
 */
class StandardHoursCalculatorTest {

	private static final LocalDate JAN_1 = LocalDate.of(2026, 1, 1);
	private static final LocalDate JAN_31 = LocalDate.of(2026, 1, 31);
	private static final LocalDate FEB_1 = LocalDate.of(2026, 2, 1);
	private static final LocalDate FEB_28 = LocalDate.of(2026, 2, 28);

	private final StandardHoursCalculator calculator = new StandardHoursCalculator();
	private final HolidayCalendar noHolidays = HolidayCalendar.none();

	/** Tháng 2/2026 có đúng 20 ngày làm việc: 40 giờ/tuần cho ra 160 giờ chuẩn (số liệu TC-01 của NCL-11-CN-002). */
	@Test
	void fullTimeEmployeeGetsFullMonthOfStandardHours() {
		Employee employee = employee("40.00", LocalDate.of(2025, 1, 1), null);

		assertThat(calculator.standardHours(employee, FEB_1, FEB_28, noHolidays)).isEqualByComparingTo("160.00");
		assertThat(calculator.standardHours(employee, JAN_1, JAN_31, noHolidays)).isEqualByComparingTo("176.00");
	}

	/** Bán thời gian dùng đúng giờ/tuần đã khai báo, không làm tròn về 40. */
	@Test
	void partTimeEmployeeUsesDeclaredWeeklyHours() {
		Employee employee = employee("20.00", LocalDate.of(2025, 1, 1), null);

		assertThat(calculator.standardHours(employee, JAN_1, JAN_31, noHolidays)).isEqualByComparingTo("88.00");
	}

	/** TC-02: vào làm giữa kỳ chỉ tính giờ chuẩn từ ngày vào làm (15/1/2026 là thứ Năm -> 12 ngày làm việc). */
	@Test
	void countsOnlyFromHireDateWhenHiredMidPeriod() {
		Employee employee = employee("40.00", LocalDate.of(2026, 1, 15), null);

		assertThat(calculator.standardHours(employee, JAN_1, JAN_31, noHolidays)).isEqualByComparingTo("96.00");
	}

	/** Nghỉ việc giữa kỳ chỉ tính đến ngày nghỉ (9/1/2026 là thứ Sáu -> 7 ngày làm việc). */
	@Test
	void countsOnlyUntilEndDateWhenLeftMidPeriod() {
		Employee employee = employee("40.00", LocalDate.of(2025, 1, 1), LocalDate.of(2026, 1, 9));

		assertThat(calculator.standardHours(employee, JAN_1, JAN_31, noHolidays)).isEqualByComparingTo("56.00");
	}

	@Test
	void isZeroWhenNotEmployedAnyDayOfThePeriod() {
		assertThat(calculator.standardHours(employee("40.00", LocalDate.of(2026, 2, 1), null), JAN_1, JAN_31, noHolidays))
				.isEqualByComparingTo(BigDecimal.ZERO);
		assertThat(calculator.standardHours(employee("40.00", LocalDate.of(2025, 1, 1), LocalDate.of(2025, 12, 31)),
				JAN_1, JAN_31, noHolidays)).isEqualByComparingTo(BigDecimal.ZERO);
	}

	/** Chỉ có cuối tuần trong phần giao với kỳ (31/1/2026 là thứ Bảy) -> không có giờ chuẩn. */
	@Test
	void isZeroWhenOnlyWeekendDaysOverlapThePeriod() {
		Employee employee = employee("40.00", JAN_31, null);

		assertThat(calculator.standardHours(employee, JAN_1, JAN_31, noHolidays)).isEqualByComparingTo(BigDecimal.ZERO);
	}

	/** Ngày lễ rơi vào thứ Hai đến thứ Sáu không tính giờ chuẩn: 17/2/2026 là thứ Ba nên còn 19 ngày = 152 giờ. */
	@Test
	void excludesWeekdayHolidaysFromStandardHours() {
		Employee employee = employee("40.00", LocalDate.of(2025, 1, 1), null);
		HolidayCalendar holidays = HolidayCalendar.of(List.of(holiday(LocalDate.of(2026, 2, 17), false)), FEB_1, FEB_28);

		assertThat(calculator.standardHours(employee, FEB_1, FEB_28, holidays)).isEqualByComparingTo("152.00");
	}

	/** Ngày lễ trùng cuối tuần (7/2/2026 là thứ Bảy) không trừ thêm vì cuối tuần vốn không có giờ chuẩn. */
	@Test
	void holidayOnWeekendDoesNotReduceStandardHoursAgain() {
		Employee employee = employee("40.00", LocalDate.of(2025, 1, 1), null);
		HolidayCalendar holidays = HolidayCalendar.of(List.of(holiday(LocalDate.of(2026, 2, 7), false)), FEB_1, FEB_28);

		assertThat(calculator.standardHours(employee, FEB_1, FEB_28, holidays)).isEqualByComparingTo("160.00");
	}

	/** Bán thời gian trừ ngày lễ theo giờ/ngày của mình: 20 giờ/tuần = 4 giờ/ngày, nghỉ 2 ngày lễ -> 18 ngày = 72 giờ. */
	@Test
	void partTimeEmployeeLosesOnlyItsOwnDailyHoursOnHolidays() {
		Employee employee = employee("20.00", LocalDate.of(2025, 1, 1), null);
		HolidayCalendar holidays = HolidayCalendar.of(List.of(
				holiday(LocalDate.of(2026, 2, 16), false), holiday(LocalDate.of(2026, 2, 17), false)), FEB_1, FEB_28);

		assertThat(calculator.standardHours(employee, FEB_1, FEB_28, holidays)).isEqualByComparingTo("72.00");
	}

	/** Ngày lễ trước ngày vào làm không ảnh hưởng: chỉ trừ ngày lễ nằm trong thời gian làm việc. */
	@Test
	void ignoresHolidaysBeforeHireDate() {
		Employee employee = employee("40.00", LocalDate.of(2026, 2, 16), null);
		HolidayCalendar holidays = HolidayCalendar.of(List.of(holiday(LocalDate.of(2026, 2, 3), false)), FEB_1, FEB_28);

		// 16/2 đến 27/2 là 10 ngày làm việc
		assertThat(calculator.standardHours(employee, FEB_1, FEB_28, holidays)).isEqualByComparingTo("80.00");
	}

	private static Holiday holiday(LocalDate date, boolean recurringYearly) {
		Holiday holiday = new Holiday();
		holiday.setName("Ngay le");
		holiday.setHolidayDate(date);
		holiday.setRecurringYearly(recurringYearly);
		return holiday;
	}

	private static Employee employee(String standardHoursPerWeek, LocalDate hireDate, LocalDate endDate) {
		Employee employee = new Employee();
		employee.setStandardHoursPerWeek(new BigDecimal(standardHoursPerWeek));
		employee.setHireDate(hireDate);
		employee.setEndDate(endDate);
		return employee;
	}
}
