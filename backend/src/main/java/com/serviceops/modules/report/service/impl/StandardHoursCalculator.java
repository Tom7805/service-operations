package com.serviceops.modules.report.service.impl;

import com.serviceops.modules.identity.employee.entity.Employee;
import com.serviceops.modules.identity.employee.service.HolidayCalendar;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.DayOfWeek;
import java.time.LocalDate;

/**
 * Giờ làm việc chuẩn của một nhân sự trong một kỳ (QTN-23) — mẫu số của tỷ lệ giờ tính phí, dùng chung cho
 * bảng điều khiển (NCL-11-CN-001) và báo cáo tỷ lệ giờ tính phí (NCL-11-CN-002) để hai nơi không lệch số.
 *
 * <p>Giờ chuẩn = số ngày thứ Hai đến thứ Sáu, không phải ngày lễ, trong phần giao giữa kỳ và thời gian làm việc của
 * nhân sự ({@code hireDate} đến {@code endDate}, để trống là còn làm) × {@code standardHoursPerWeek} ÷ 5. Ngày lễ
 * không cộng thêm giờ chuẩn; giờ công làm vào ngày lễ vẫn nằm ở tử số nên tỷ lệ có thể vượt 100%.</p>
 */
@Component
public class StandardHoursCalculator {

	private static final BigDecimal WORKING_DAYS_PER_WEEK = new BigDecimal("5");

	/** 0 khi nhân sự không làm việc ngày nào (thứ Hai đến thứ Sáu, ngoài ngày lễ) trong kỳ. */
	public BigDecimal standardHours(Employee employee, LocalDate from, LocalDate to, HolidayCalendar holidays) {
		LocalDate start = employee.getHireDate().isAfter(from) ? employee.getHireDate() : from;
		LocalDate end = employee.getEndDate() != null && employee.getEndDate().isBefore(to) ? employee.getEndDate() : to;
		if (start.isAfter(end)) {
			return BigDecimal.ZERO.setScale(2);
		}

		long workingDays = start.datesUntil(end.plusDays(1))
				.filter(day -> day.getDayOfWeek() != DayOfWeek.SATURDAY && day.getDayOfWeek() != DayOfWeek.SUNDAY)
				.filter(day -> !holidays.isHoliday(day))
				.count();
		return employee.getStandardHoursPerWeek().multiply(BigDecimal.valueOf(workingDays))
				.divide(WORKING_DAYS_PER_WEEK, 2, RoundingMode.HALF_UP);
	}
}
