package com.serviceops.modules.report;

import com.serviceops.modules.identity.department.entity.Department;
import com.serviceops.modules.identity.department.enums.DepartmentType;
import com.serviceops.modules.identity.employee.entity.Employee;
import com.serviceops.modules.identity.user.entity.User;
import com.serviceops.modules.report.repository.UtilizationQueryRepository;
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
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Chạy thật JPQL của báo cáo tỷ lệ giờ tính phí trên H2: test service dùng mock nên không bắt được lỗi truy vấn ở đây.
 */
@DataJpaTest(properties = "spring.flyway.enabled=false")
@ActiveProfiles("test")
@Import(UtilizationQueryRepository.class)
class UtilizationQueryRepositoryTest {

	private static final LocalDate FROM = LocalDate.of(2026, 1, 1);
	private static final LocalDate TO = LocalDate.of(2026, 1, 31);

	@Autowired
	private TestEntityManager em;

	@Autowired
	private UtilizationQueryRepository repository;

	@Test
	void sumsApprovedBillableHoursPerUserInPeriod() {
		saveEntry(1L, "8.00", true, TimeEntryStatus.APPROVED, TimeEntryType.ORIGINAL, FROM);
		saveEntry(1L, "-1.00", true, TimeEntryStatus.APPROVED, TimeEntryType.REVERSAL, TO);
		saveEntry(1L, "2.00", false, TimeEntryStatus.APPROVED, TimeEntryType.ORIGINAL, FROM.plusDays(1));
		saveEntry(1L, "9.00", true, TimeEntryStatus.APPROVED, TimeEntryType.ORIGINAL, TO.plusDays(1));
		saveEntry(2L, "5.00", true, TimeEntryStatus.APPROVED, TimeEntryType.ORIGINAL, FROM.plusDays(2));
		saveEntry(3L, "4.00", true, TimeEntryStatus.DRAFT, TimeEntryType.ORIGINAL, FROM);
		em.flush();

		Map<Long, BigDecimal> result = repository.sumApprovedBillableHoursByUser(FROM, TO);

		assertThat(result).containsOnlyKeys(1L, 2L);
		assertThat(result.get(1L)).isEqualByComparingTo("7.00");
		assertThat(result.get(2L)).isEqualByComparingTo("5.00");
	}

	@Test
	void returnsEmptyMapWhenNoApprovedBillableHoursInPeriod() {
		saveEntry(1L, "3.00", false, TimeEntryStatus.APPROVED, TimeEntryType.ORIGINAL, FROM);
		em.flush();

		assertThat(repository.sumApprovedBillableHoursByUser(FROM, TO)).isEmpty();
	}

	/** Lấy được cả nhân sự chưa gán bộ phận; giữ biên ngày vào/nghỉ; bỏ người vào sau kỳ hoặc nghỉ trước kỳ. */
	@Test
	void findsEmployeesOverlappingThePeriodWithUserAndOptionalDepartment() {
		Department engineering = saveDepartment("Phong ky thuat");
		saveEmployee("assigned", LocalDate.of(2025, 1, 1), null, engineering);
		saveEmployee("unassigned-hired-last-day", TO, null, null);
		saveEmployee("left-first-day", LocalDate.of(2025, 1, 1), FROM, engineering);
		saveEmployee("hired-after", TO.plusDays(1), null, engineering);
		saveEmployee("left-before", LocalDate.of(2025, 1, 1), FROM.minusDays(1), engineering);
		em.flush();
		em.clear();

		var employees = repository.findEmployeesEmployedBetween(FROM, TO);

		assertThat(employees).extracting(employee -> employee.getUser().getUsername())
				.containsExactlyInAnyOrder("assigned", "unassigned-hired-last-day", "left-first-day");
		assertThat(employees.stream().filter(employee -> employee.getUser().getUsername().equals("assigned"))
				.findFirst().orElseThrow().getDepartment().getName()).isEqualTo("Phong ky thuat");
		assertThat(employees.stream().filter(employee -> employee.getUser().getUsername().equals("unassigned-hired-last-day"))
				.findFirst().orElseThrow().getDepartment()).isNull();
	}

	private void saveEntry(Long userId, String hours, boolean billable, TimeEntryStatus status, TimeEntryType type,
			LocalDate workDate) {
		TimeEntry entry = new TimeEntry();
		entry.setTaskId(1L);
		entry.setUserId(userId);
		entry.setWorkDate(workDate);
		entry.setHours(new BigDecimal(hours));
		entry.setBillable(billable);
		entry.setStatus(status);
		entry.setType(type);
		entry.setCreatedAt(LocalDateTime.of(2026, 1, 1, 0, 0));
		entry.setUpdatedAt(LocalDateTime.of(2026, 1, 1, 0, 0));
		em.persist(entry);
	}

	private Department saveDepartment(String name) {
		Department department = new Department();
		department.setName(name);
		department.setType(DepartmentType.PHONG);
		return em.persist(department);
	}

	private void saveEmployee(String username, LocalDate hireDate, LocalDate endDate, Department department) {
		User user = new User();
		user.setUsername(username);
		user.setPasswordHash("hash");
		user.setFullName(username);
		em.persist(user);

		Employee employee = new Employee();
		employee.setUser(user);
		employee.setDepartment(department);
		employee.setStandardHoursPerWeek(new BigDecimal("40.00"));
		employee.setHireDate(hireDate);
		employee.setEndDate(endDate);
		em.persist(employee);
	}
}
