package com.serviceops.modules.report;

import com.serviceops.modules.identity.employee.entity.Employee;
import com.serviceops.modules.identity.user.entity.User;
import com.serviceops.modules.report.repository.DashboardQueryRepository;
import com.serviceops.modules.timesheet.entity.TimeEntry;
import com.serviceops.modules.timesheet.enums.TimeEntryStatus;
import com.serviceops.modules.timesheet.enums.TimeEntryType;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Chạy thật JPQL của bảng điều khiển trên H2: test service dùng mock nên không bắt được lỗi truy vấn ở đây.
 */
@DataJpaTest(properties = "spring.flyway.enabled=false")
@ActiveProfiles("test")
@Import(DashboardQueryRepository.class)
class DashboardQueryRepositoryTest {

	private static final LocalDate FROM = LocalDate.of(2026, 1, 1);
	private static final LocalDate TO = LocalDate.of(2026, 1, 31);

	@Autowired
	private TestEntityManager em;

	@Autowired
	private DashboardQueryRepository repository;

	@Test
	void sumsOnlyApprovedBillableHoursInPeriod() {
		save("8.00", true, TimeEntryStatus.APPROVED, TimeEntryType.ORIGINAL, FROM);
		save("2.00", false, TimeEntryStatus.APPROVED, TimeEntryType.ORIGINAL, FROM.plusDays(1));
		save("-1.00", true, TimeEntryStatus.APPROVED, TimeEntryType.REVERSAL, TO);
		save("5.00", true, TimeEntryStatus.DRAFT, TimeEntryType.ORIGINAL, FROM.plusDays(2));
		save("9.00", true, TimeEntryStatus.APPROVED, TimeEntryType.ORIGINAL, TO.plusDays(1));
		em.flush();

		assertThat(repository.sumApprovedBillableHours(FROM, TO)).isEqualByComparingTo("7.00");
	}

	@Test
	void returnsZeroWhenNoApprovedBillableHoursInPeriod() {
		save("4.00", true, TimeEntryStatus.SUBMITTED, TimeEntryType.ORIGINAL, FROM);
		save("3.00", false, TimeEntryStatus.APPROVED, TimeEntryType.ORIGINAL, FROM);
		em.flush();

		assertThat(repository.sumApprovedBillableHours(FROM, TO)).isEqualByComparingTo(BigDecimal.ZERO);
	}

	/** Giữ người còn làm (endDate trống), vào làm đúng ngày cuối kỳ, nghỉ đúng ngày đầu kỳ; bỏ người vào sau kỳ hoặc nghỉ trước kỳ. */
	@Test
	void findsOnlyEmployeesWhoseEmploymentOverlapsThePeriod() {
		saveEmployee("still-working", LocalDate.of(2025, 1, 1), null);
		saveEmployee("hired-last-day", TO, null);
		saveEmployee("left-first-day", LocalDate.of(2025, 1, 1), FROM);
		saveEmployee("hired-after", TO.plusDays(1), null);
		saveEmployee("left-before", LocalDate.of(2025, 1, 1), FROM.minusDays(1));
		em.flush();

		assertThat(repository.findEmployeesEmployedBetween(FROM, TO))
				.extracting(employee -> employee.getUser().getUsername())
				.containsExactlyInAnyOrder("still-working", "hired-last-day", "left-first-day");
	}

	private void save(String hours, boolean billable, TimeEntryStatus status, TimeEntryType type, LocalDate workDate) {
		TimeEntry entry = new TimeEntry();
		entry.setTaskId(1L);
		entry.setUserId(1L);
		entry.setWorkDate(workDate);
		entry.setHours(new BigDecimal(hours));
		entry.setBillable(billable);
		entry.setStatus(status);
		entry.setType(type);
		entry.setCreatedAt(LocalDateTime.of(2026, 1, 1, 0, 0));
		entry.setUpdatedAt(LocalDateTime.of(2026, 1, 1, 0, 0));
		em.persist(entry);
	}

	private void saveEmployee(String username, LocalDate hireDate, LocalDate endDate) {
		User user = new User();
		user.setUsername(username);
		user.setPasswordHash("hash");
		user.setFullName(username);
		em.persist(user);

		Employee employee = new Employee();
		employee.setUser(user);
		employee.setStandardHoursPerWeek(new BigDecimal("40.00"));
		employee.setHireDate(hireDate);
		employee.setEndDate(endDate);
		em.persist(employee);
	}
}
