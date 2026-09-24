package com.serviceops.modules.report;

import com.serviceops.modules.report.repository.DashboardQueryRepository;
import com.serviceops.modules.report.repository.DashboardQueryRepository.ApprovedHours;
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
	void sumsOnlyApprovedHoursInPeriodAndSplitsBillable() {
		save("8.00", true, TimeEntryStatus.APPROVED, TimeEntryType.ORIGINAL, FROM);
		save("2.00", false, TimeEntryStatus.APPROVED, TimeEntryType.ORIGINAL, FROM.plusDays(1));
		save("-1.00", true, TimeEntryStatus.APPROVED, TimeEntryType.REVERSAL, TO);
		save("5.00", true, TimeEntryStatus.DRAFT, TimeEntryType.ORIGINAL, FROM.plusDays(2));
		save("9.00", true, TimeEntryStatus.APPROVED, TimeEntryType.ORIGINAL, TO.plusDays(1));
		em.flush();

		ApprovedHours result = repository.sumApprovedHours(FROM, TO);

		assertThat(result.billableHours()).isEqualByComparingTo("7.00");
		assertThat(result.totalHours()).isEqualByComparingTo("9.00");
	}

	@Test
	void returnsZeroWhenNoApprovedHoursInPeriod() {
		save("4.00", true, TimeEntryStatus.SUBMITTED, TimeEntryType.ORIGINAL, FROM);
		em.flush();

		ApprovedHours result = repository.sumApprovedHours(FROM, TO);

		assertThat(result.billableHours()).isEqualByComparingTo(BigDecimal.ZERO);
		assertThat(result.totalHours()).isEqualByComparingTo(BigDecimal.ZERO);
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
}
