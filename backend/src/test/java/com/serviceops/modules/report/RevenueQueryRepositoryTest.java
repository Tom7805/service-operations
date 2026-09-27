package com.serviceops.modules.report;

import com.serviceops.modules.contract.entity.Contract;
import com.serviceops.modules.contract.enums.ContractType;
import com.serviceops.modules.project.entity.Project;
import com.serviceops.modules.project.entity.Task;
import com.serviceops.modules.report.projection.RevenueProjection;
import com.serviceops.modules.report.repository.RevenueQueryRepository;
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
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/** Chạy thật JPQL của báo cáo doanh thu theo tháng trên H2: test service dùng mock nên không bắt được lỗi truy vấn. */
@DataJpaTest(properties = "spring.flyway.enabled=false")
@ActiveProfiles("test")
@Import(RevenueQueryRepository.class)
class RevenueQueryRepositoryTest {

	private static final LocalDate FROM = LocalDate.of(2026, 1, 1);
	private static final LocalDate TO = LocalDate.of(2026, 3, 31);
	private static final LocalDateTime NOW = LocalDateTime.of(2026, 1, 1, 0, 0);

	@Autowired
	private TestEntityManager em;

	@Autowired
	private RevenueQueryRepository repository;

	/** Chỉ lấy dòng đã duyệt, tính phí, trong kỳ (giữ cả biên đầu/cuối); kèm đúng hợp đồng và loại hợp đồng. */
	@Test
	void returnsApprovedBillableEntriesInPeriodWithContract() {
		Contract hourly = saveContract("HD-1", ContractType.TIME_AND_MATERIAL);
		Contract fixed = saveContract("HD-2", ContractType.FIXED_PRICE);
		Long hourlyTask = saveTask(saveProject("DA-1", hourly.getId()).getId());
		Long fixedTask = saveTask(saveProject("DA-2", fixed.getId()).getId());

		TimeEntry first = saveEntry(hourlyTask, "8.00", true, TimeEntryStatus.APPROVED, FROM);
		TimeEntry last = saveEntry(fixedTask, "4.00", true, TimeEntryStatus.APPROVED, TO);
		saveEntry(hourlyTask, "2.00", false, TimeEntryStatus.APPROVED, FROM.plusDays(3));
		saveEntry(hourlyTask, "3.00", true, TimeEntryStatus.SUBMITTED, FROM.plusDays(4));
		saveEntry(hourlyTask, "5.00", true, TimeEntryStatus.APPROVED, TO.plusDays(1));
		saveEntry(hourlyTask, "6.00", true, TimeEntryStatus.APPROVED, FROM.minusDays(1));
		em.flush();
		em.clear();

		List<RevenueProjection> rows = repository.findApprovedBillableEntries(FROM, TO);

		assertThat(rows).extracting(row -> row.entry().getId()).containsExactly(first.getId(), last.getId());
		assertThat(rows.get(0).contractId()).isEqualTo(hourly.getId());
		assertThat(rows.get(0).contractType()).isEqualTo(ContractType.TIME_AND_MATERIAL);
		assertThat(rows.get(1).contractType()).isEqualTo(ContractType.FIXED_PRICE);
	}

	@Test
	void returnsEmptyWhenNothingInPeriod() {
		assertThat(repository.findApprovedBillableEntries(FROM, TO)).isEmpty();
	}

	private Contract saveContract(String code, ContractType type) {
		Contract contract = new Contract();
		contract.setContractCode(code);
		contract.setName("Hop dong " + code);
		contract.setCustomerId(1L);
		contract.setContractType(type);
		contract.setTotalValue(new BigDecimal("100000000.00"));
		contract.setCreatedAt(NOW);
		return em.persist(contract);
	}

	private Project saveProject(String code, Long contractId) {
		Project project = new Project();
		project.setProjectCode(code);
		project.setName("Du an " + code);
		project.setContractId(contractId);
		project.setCustomerId(1L);
		project.setProjectType("DEV");
		project.setStartDate(FROM);
		project.setExpectedEndDate(TO);
		project.setProjectManagerId(1L);
		project.setCreatedAt(NOW);
		return em.persist(project);
	}

	private Long saveTask(Long projectId) {
		Task task = new Task();
		task.setProjectId(projectId);
		task.setWorkPackageId(1L);
		task.setName("Cong viec");
		task.setCreatedAt(NOW);
		return em.persist(task).getId();
	}

	private TimeEntry saveEntry(Long taskId, String hours, boolean billable, TimeEntryStatus status,
			LocalDate workDate) {
		TimeEntry entry = new TimeEntry();
		entry.setTaskId(taskId);
		entry.setUserId(1L);
		entry.setWorkDate(workDate);
		entry.setHours(new BigDecimal(hours));
		entry.setBillable(billable);
		entry.setStatus(status);
		entry.setType(TimeEntryType.ORIGINAL);
		entry.setCreatedAt(NOW);
		entry.setUpdatedAt(NOW);
		return em.persist(entry);
	}
}
