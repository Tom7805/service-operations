package com.serviceops.modules.identity.employee;

import com.serviceops.modules.identity.employee.entity.Holiday;
import com.serviceops.modules.identity.employee.repository.HolidayRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.test.context.ActiveProfiles;

import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;

/** Chạy thật các truy vấn của lịch ngày lễ trên H2: test service dùng mock nên không bắt được lỗi truy vấn ở đây. */
@DataJpaTest(properties = "spring.flyway.enabled=false")
@ActiveProfiles("test")
class HolidayRepositoryTest {

	@Autowired
	private HolidayRepository repository;

	@Test
	void findsOneOffHolidaysInsidePeriodAndEveryRecurringHoliday() {
		repository.save(holiday("Trong ky", LocalDate.of(2026, 2, 17), false));
		repository.save(holiday("Ngoai ky", LocalDate.of(2027, 2, 6), false));
		repository.save(holiday("Lap hang nam", LocalDate.of(2025, 9, 2), true));

		var result = repository.findApplicableBetween(LocalDate.of(2026, 1, 1), LocalDate.of(2026, 12, 31));

		assertThat(result).extracting(Holiday::getName).containsExactlyInAnyOrder("Trong ky", "Lap hang nam");
	}

	@Test
	void detectsDuplicateDateExcludingItself() {
		Holiday saved = repository.save(holiday("Quoc khanh", LocalDate.of(2026, 9, 2), false));

		assertThat(repository.existsByHolidayDate(LocalDate.of(2026, 9, 2))).isTrue();
		assertThat(repository.existsByHolidayDateAndIdNot(LocalDate.of(2026, 9, 2), saved.getId())).isFalse();
		assertThat(repository.existsByHolidayDateAndIdNot(LocalDate.of(2026, 9, 2), saved.getId() + 1)).isTrue();
	}

	@Test
	void listsHolidaysInDateOrder() {
		repository.save(holiday("Cuoi nam", LocalDate.of(2026, 12, 25), false));
		repository.save(holiday("Dau nam", LocalDate.of(2026, 1, 1), false));

		assertThat(repository.findAllByOrderByHolidayDateAsc()).extracting(Holiday::getName)
				.containsExactly("Dau nam", "Cuoi nam");
	}

	private static Holiday holiday(String name, LocalDate date, boolean recurringYearly) {
		Holiday holiday = new Holiday();
		holiday.setName(name);
		holiday.setHolidayDate(date);
		holiday.setRecurringYearly(recurringYearly);
		return holiday;
	}
}
