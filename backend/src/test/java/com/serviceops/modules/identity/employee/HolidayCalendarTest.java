package com.serviceops.modules.identity.employee;

import com.serviceops.modules.identity.employee.entity.Holiday;
import com.serviceops.modules.identity.employee.service.HolidayCalendar;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class HolidayCalendarTest {

	private static final LocalDate FROM = LocalDate.of(2026, 1, 1);
	private static final LocalDate TO = LocalDate.of(2026, 12, 31);

	@Test
	void noneHasNoHolidays() {
		assertThat(HolidayCalendar.none().isHoliday(FROM)).isFalse();
	}

	@Test
	void oneOffHolidayCountsOnlyInsidePeriod() {
		Holiday inside = holiday(LocalDate.of(2026, 2, 17), false);
		Holiday outside = holiday(LocalDate.of(2027, 2, 6), false);

		HolidayCalendar calendar = HolidayCalendar.of(List.of(inside, outside), FROM, TO);

		assertThat(calendar.isHoliday(LocalDate.of(2026, 2, 17))).isTrue();
		assertThat(calendar.isHoliday(LocalDate.of(2027, 2, 6))).isFalse();
		assertThat(calendar.isHoliday(LocalDate.of(2026, 2, 18))).isFalse();
	}

	/** Lễ lặp hằng năm áp dụng cho cùng ngày/tháng ở mọi năm trong kỳ, kể cả kỳ nhiều năm. */
	@Test
	void recurringHolidayAppliesToEveryYearOfThePeriod() {
		Holiday nationalDay = holiday(LocalDate.of(2025, 9, 2), true);

		HolidayCalendar calendar = HolidayCalendar.of(List.of(nationalDay), LocalDate.of(2025, 1, 1),
				LocalDate.of(2027, 12, 31));

		assertThat(calendar.isHoliday(LocalDate.of(2025, 9, 2))).isTrue();
		assertThat(calendar.isHoliday(LocalDate.of(2026, 9, 2))).isTrue();
		assertThat(calendar.isHoliday(LocalDate.of(2027, 9, 2))).isTrue();
		assertThat(calendar.isHoliday(LocalDate.of(2026, 9, 3))).isFalse();
	}

	/** Lễ lặp hằng năm chỉ có hiệu lực từ năm khai báo, không lùi về các năm trước. */
	@Test
	void recurringHolidayDoesNotApplyBeforeItsDeclaredYear() {
		Holiday declaredIn2026 = holiday(LocalDate.of(2026, 4, 30), true);

		HolidayCalendar calendar = HolidayCalendar.of(List.of(declaredIn2026), LocalDate.of(2025, 1, 1),
				LocalDate.of(2026, 12, 31));

		assertThat(calendar.isHoliday(LocalDate.of(2025, 4, 30))).isFalse();
		assertThat(calendar.isHoliday(LocalDate.of(2026, 4, 30))).isTrue();
	}

	/** Chỉ ngày trong kỳ mới được tính, dù lễ lặp hằng năm rơi vào cùng năm nhưng ngoài kỳ. */
	@Test
	void recurringHolidayOutsideThePeriodIsIgnored() {
		Holiday newYear = holiday(LocalDate.of(2025, 1, 1), true);

		HolidayCalendar calendar = HolidayCalendar.of(List.of(newYear), LocalDate.of(2026, 2, 1), LocalDate.of(2026, 2, 28));

		assertThat(calendar.isHoliday(LocalDate.of(2026, 1, 1))).isFalse();
	}

	/** 29/2 chỉ có hiệu lực ở năm nhuận; năm không nhuận không bị dời sang 28/2. */
	@Test
	void leapDayHolidayAppliesOnlyInLeapYears() {
		Holiday leapDay = holiday(LocalDate.of(2024, 2, 29), true);

		HolidayCalendar calendar = HolidayCalendar.of(List.of(leapDay), LocalDate.of(2024, 1, 1),
				LocalDate.of(2028, 12, 31));

		assertThat(calendar.isHoliday(LocalDate.of(2024, 2, 29))).isTrue();
		assertThat(calendar.isHoliday(LocalDate.of(2025, 2, 28))).isFalse();
		assertThat(calendar.isHoliday(LocalDate.of(2028, 2, 29))).isTrue();
	}

	private static Holiday holiday(LocalDate date, boolean recurringYearly) {
		Holiday holiday = new Holiday();
		holiday.setName("Ngay le");
		holiday.setHolidayDate(date);
		holiday.setRecurringYearly(recurringYearly);
		return holiday;
	}
}
