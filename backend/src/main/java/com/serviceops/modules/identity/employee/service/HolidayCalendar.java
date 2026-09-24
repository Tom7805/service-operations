package com.serviceops.modules.identity.employee.service;

import com.serviceops.modules.identity.employee.entity.Holiday;

import java.time.LocalDate;
import java.time.MonthDay;
import java.util.Collection;
import java.util.HashSet;
import java.util.Set;

/** Các ngày nghỉ lễ nằm trong một khoảng ngày, đã trải phẳng cả ngày lễ lặp hằng năm. */
public final class HolidayCalendar {

	private static final HolidayCalendar NONE = new HolidayCalendar(Set.of());

	private final Set<LocalDate> holidayDates;

	private HolidayCalendar(Set<LocalDate> holidayDates) {
		this.holidayDates = holidayDates;
	}

	/** Lịch không có ngày lễ nào. */
	public static HolidayCalendar none() {
		return NONE;
	}

	/**
	 * Lễ một lần chỉ tính khi nằm trong khoảng. Lễ lặp hằng năm áp dụng cho cùng ngày/tháng của mọi năm từ năm của
	 * ngày khai báo; ngày 29/2 chỉ có hiệu lực ở năm nhuận.
	 */
	public static HolidayCalendar of(Collection<Holiday> holidays, LocalDate from, LocalDate to) {
		Set<LocalDate> dates = new HashSet<>();
		for (Holiday holiday : holidays) {
			LocalDate declared = holiday.getHolidayDate();
			if (!holiday.isRecurringYearly()) {
				if (!declared.isBefore(from) && !declared.isAfter(to)) {
					dates.add(declared);
				}
				continue;
			}
			MonthDay monthDay = MonthDay.from(declared);
			for (int year = Math.max(from.getYear(), declared.getYear()); year <= to.getYear(); year++) {
				if (!monthDay.isValidYear(year)) {
					continue;
				}
				LocalDate date = monthDay.atYear(year);
				if (!date.isBefore(from) && !date.isAfter(to)) {
					dates.add(date);
				}
			}
		}
		return new HolidayCalendar(dates);
	}

	public boolean isHoliday(LocalDate date) {
		return holidayDates.contains(date);
	}
}
