package com.serviceops.modules.invoice;

import com.serviceops.common.audit.service.AuditLogService;
import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import com.serviceops.modules.contract.entity.Contract;
import com.serviceops.modules.contract.enums.ContractType;
import com.serviceops.modules.customer.entity.Customer;
import com.serviceops.modules.expense.entity.ProjectExpense;
import com.serviceops.modules.expense.enums.ExpenseStatus;
import com.serviceops.modules.expense.enums.ExpenseType;
import com.serviceops.modules.expense.repository.ProjectExpenseRepository;
import com.serviceops.modules.identity.employee.entity.Employee;
import com.serviceops.modules.identity.user.entity.User;
import com.serviceops.modules.invoice.validator.ContractValueLimitValidator;
import com.serviceops.modules.invoice.dto.request.InvoiceProposalCreateReq;
import com.serviceops.modules.invoice.dto.response.InvoiceProposalRes;
import com.serviceops.modules.invoice.entity.InvoiceProposalLine;
import com.serviceops.modules.invoice.enums.ProposalLineType;
import com.serviceops.modules.invoice.repository.InvoiceProposalLineRepository;
import com.serviceops.modules.invoice.repository.InvoiceProposalRepository;
import com.serviceops.modules.invoice.service.InvoiceProposalService;
import com.serviceops.modules.invoice.service.impl.InvoiceProposalServiceImpl;
import com.serviceops.modules.notification.service.NotificationService;
import com.serviceops.modules.project.entity.Project;
import com.serviceops.modules.project.entity.Task;
import com.serviceops.modules.project.entity.WorkPackage;
import com.serviceops.modules.rate.entity.BillRate;
import com.serviceops.modules.rate.entity.WorkTypeRateFactor;
import com.serviceops.modules.rate.service.impl.BillRateServiceImpl;
import com.serviceops.modules.rate.service.impl.ContractBillRateServiceImpl;
import com.serviceops.modules.rate.service.impl.RateResolutionServiceImpl;
import com.serviceops.modules.rate.service.impl.WorkTypeRateServiceImpl;
import com.serviceops.modules.timesheet.entity.TimeEntry;
import com.serviceops.modules.timesheet.enums.TimeEntryStatus;
import com.serviceops.modules.timesheet.enums.WorkType;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Chay {@link InvoiceProposalServiceImpl} tren JPA THAT (H2) cung chuoi tra don gia that — cac unit test dung mock
 * repository nen chua bao gio thuc thi truy van JPA va rang buoc UNIQUE cua bang moi (V78). Phu cac tieu chi cua
 * NCL-10-CN-001 voi so luong dong dung nhu backlog (TC-01: 20 dong, TC-02: 5 dong cho duyet, TC-03: dong da xuat),
 * cot moc chong gom trung o DB va kich ban nhieu ke toan bam cung luc.
 */
@DataJpaTest(properties = "spring.flyway.enabled=false")
@ActiveProfiles("test")
@Import({InvoiceProposalServiceImpl.class, RateResolutionServiceImpl.class, ContractBillRateServiceImpl.class,
		BillRateServiceImpl.class, WorkTypeRateServiceImpl.class, ContractValueLimitValidator.class,
		InvoiceProposalIntegrationTest.ClockConfig.class})
class InvoiceProposalIntegrationTest {

	@TestConfiguration
	static class ClockConfig {
		@Bean
		Clock clock() {
			return Clock.fixed(Instant.parse("2026-10-01T03:00:00Z"), ZoneId.of("Asia/Ho_Chi_Minh"));
		}
	}

	private static final LocalDate FROM = LocalDate.of(2026, 9, 1);
	private static final LocalDate TO = LocalDate.of(2026, 9, 30);
	private static final AtomicInteger UNIQUE = new AtomicInteger();

	@MockBean private NotificationService notificationService;
	@MockBean private AuditLogService auditLogService;

	@Autowired private TestEntityManager em;
	@Autowired private InvoiceProposalService service;
	@Autowired private InvoiceProposalRepository proposalRepository;
	@Autowired private InvoiceProposalLineRepository proposalLineRepository;
	@Autowired private ProjectExpenseRepository projectExpenseRepository;
	@Autowired private PlatformTransactionManager transactionManager;

	// ---------- TC-01 / TC-02 / TC-03 voi so luong dung nhu backlog ----------

	@Test
	@DisplayName("NCL-10-CN-001-TC-01: du an co 20 dong gio cong da duyet trong thang -> gom dung 20 dong va tong theo don gia")
	void gathersExactlyTwentyApprovedLinesAndTotalsThemByAppliedRate() {
		Fixture f = seed(20, 0);

		InvoiceProposalRes res = service.createFromApprovedTimesheets(f.projectId, request());

		assertThat(res.laborLines()).hasSize(20);
		// 20 dong x 8 gio x 300.000/gio (don gia ngay 2.400.000 / 8)
		assertThat(res.laborAmount()).isEqualByComparingTo("48000000.00");
		assertThat(res.totalAmount()).isEqualByComparingTo("48000000.00");
		assertThat(res.skipped().total()).isZero();
		assertThat(proposalLineRepository.findByInvoiceProposalIdOrderByIdAsc(res.id())).hasSize(20);
	}

	@Test
	@DisplayName("NCL-10-CN-001-TC-02: ky co 5 dong cho duyet -> bo qua 5 dong chua duyet va neu ro so dong bi bo qua")
	void skipsExactlyFiveLinesStillWaitingForApproval() {
		Fixture f = seed(3, 5);

		InvoiceProposalRes res = service.createFromApprovedTimesheets(f.projectId, request());

		assertThat(res.laborLines()).hasSize(3);
		assertThat(res.skipped().notApprovedCount()).isEqualTo(5);
		assertThat(res.skipped().total()).isEqualTo(5);
	}

	@Test
	@DisplayName("NCL-10-CN-001-TC-03: dong da nam trong hoa don truoc bi loai; chi dong moi duoc duyet them moi duoc gom")
	void secondProposalForTheSamePeriodOnlyTakesNewlyApprovedLines() {
		Fixture f = seed(4, 2);
		InvoiceProposalRes first = service.createFromApprovedTimesheets(f.projectId, request());
		assertThat(first.laborLines()).hasSize(4);

		// Ky da het dong du dieu kien: hai dong cho duyet van chua duyet -> khong tao de nghi rong
		assertThatThrownBy(() -> service.createFromApprovedTimesheets(f.projectId, request()))
				.isInstanceOfSatisfying(BusinessRuleException.class, ex -> {
					assertThat(ex.getErrorCode()).isEqualTo(ErrorCode.INVALID_STATE);
					assertThat(ex.getMessage()).contains("4 da nam trong de nghi truoc").contains("2 chua duyet");
				});

		// Duyet not hai dong cho duyet -> lan tao thu hai chi gom hai dong do
		for (TimeEntry entry : f.pending) {
			entry.setStatus(TimeEntryStatus.APPROVED);
			em.persist(entry);
		}
		em.flush();
		InvoiceProposalRes second = service.createFromApprovedTimesheets(f.projectId, request());

		assertThat(second.laborLines()).hasSize(2);
		assertThat(second.skipped().alreadyProposedCount()).isEqualTo(4);
		assertThat(second.laborAmount()).isEqualByComparingTo("4800000.00");
		assertThat(proposalRepository.count()).isEqualTo(2);
	}

	@Test
	@DisplayName("Moi dong gio cong chi nam trong dung mot de nghi sau nhieu lan tao")
	void everyTimeEntryEndsUpInExactlyOneProposal() {
		Fixture f = seed(6, 0);

		service.createFromApprovedTimesheets(f.projectId, new InvoiceProposalCreateReq(FROM, FROM.plusDays(2), null));
		service.createFromApprovedTimesheets(f.projectId, new InvoiceProposalCreateReq(FROM, TO, null));

		List<InvoiceProposalLine> lines = proposalLineRepository.findAll();
		assertThat(lines).hasSize(6);
		assertThat(lines.stream().map(InvoiceProposalLine::getTimeEntryId).distinct().count()).isEqualTo(6);
	}

	// ---------- chi phi tinh lai ----------

	@Test
	@DisplayName("Phieu chi phi tinh lai duoc gom va luu invoiced=true; lan sau khong gom lai")
	void billableExpenseIsProposedOnceAndPersistedAsInvoiced() {
		Fixture f = seed(1, 0);
		ProjectExpense expense = expense(f, ExpenseStatus.APPROVED, true, "2000000.00");
		ProjectExpense notBillable = expense(f, ExpenseStatus.APPROVED, false, "500000.00");
		em.flush();

		InvoiceProposalRes res = service.createFromApprovedTimesheets(f.projectId, request());
		em.flush();
		em.clear();

		assertThat(res.expenseLines()).hasSize(1);
		assertThat(res.totalAmount()).isEqualByComparingTo("4400000.00"); // 2.400.000 gio cong + 2.000.000 chi phi
		assertThat(res.expenseAmount()).isEqualByComparingTo("2000000.00");
		assertThat(projectExpenseRepository.findById(expense.getId()).orElseThrow().getInvoiced()).isTrue();
		assertThat(projectExpenseRepository.findById(notBillable.getId()).orElseThrow().getInvoiced()).isFalse();
		assertThatThrownBy(() -> service.createFromApprovedTimesheets(f.projectId, request()))
				.isInstanceOfSatisfying(BusinessRuleException.class,
						ex -> assertThat(ex.getErrorCode()).isEqualTo(ErrorCode.INVALID_STATE));
	}

	// ---------- chot chan cuoi o co so du lieu ----------

	@Test
	@DisplayName("UNIQUE(time_entry_id): ghi mot dong gio cong vao hai de nghi bi co so du lieu tu choi")
	void databaseRejectsTheSameTimeEntryInTwoProposals() {
		Fixture f = seed(1, 0);
		InvoiceProposalRes first = service.createFromApprovedTimesheets(f.projectId, request());
		Long timeEntryId = first.laborLines().get(0).timeEntryId();

		InvoiceProposalLine duplicate = new InvoiceProposalLine();
		duplicate.setInvoiceProposalId(first.id());
		duplicate.setLineType(ProposalLineType.LABOR);
		duplicate.setTimeEntryId(timeEntryId);
		duplicate.setLineDate(FROM);
		duplicate.setDescription("Dong trung");
		duplicate.setAmount(BigDecimal.TEN);

		assertThatThrownBy(() -> {
			proposalLineRepository.saveAndFlush(duplicate);
		}).isInstanceOf(DataIntegrityViolationException.class);
	}

	// ---------- nhieu ke toan bam cung luc ----------

	@Test
	@Transactional(propagation = Propagation.NOT_SUPPORTED)
	@DisplayName("Ba ke toan bam tao de nghi cung luc: dung mot nguoi gom duoc, moi dong chi vao mot de nghi")
	void concurrentRequestsNeverGatherTheSameLineTwice() throws Exception {
		TransactionTemplate tx = new TransactionTemplate(transactionManager);
		Fixture f = tx.execute(status -> seed(10, 0));
		try {
			int threads = 3;
			ExecutorService pool = Executors.newFixedThreadPool(threads);
			CountDownLatch ready = new CountDownLatch(threads);
			CountDownLatch go = new CountDownLatch(1);
			List<Future<String>> results = new ArrayList<>();
			for (int i = 0; i < threads; i++) {
				Callable<String> task = () -> {
					ready.countDown();
					go.await();
					try {
						InvoiceProposalRes res = service.createFromApprovedTimesheets(f.projectId, request());
						return "OK:" + res.laborLines().size();
					} catch (BusinessRuleException ex) {
						return ex.getErrorCode().name();
					}
				};
				results.add(pool.submit(task));
			}
			assertThat(ready.await(10, TimeUnit.SECONDS)).isTrue();
			go.countDown();
			List<String> outcomes = new ArrayList<>();
			for (Future<String> result : results) {
				outcomes.add(result.get(30, TimeUnit.SECONDS));
			}
			pool.shutdown();

			// Mot luot gom du 10 dong; hai luot con lai thay 10 dong da vao de nghi nen bi chan INVALID_STATE.
			assertThat(outcomes).containsOnlyOnce("OK:10");
			assertThat(outcomes.stream().filter(o -> o.equals("INVALID_STATE")).count()).isEqualTo(2);
			List<InvoiceProposalLine> lines = proposalLineRepository.findAll();
			assertThat(lines).hasSize(10);
			assertThat(lines.stream().map(InvoiceProposalLine::getTimeEntryId).distinct().count()).isEqualTo(10);
			assertThat(proposalRepository.count()).isEqualTo(1);
		} finally {
			tx.executeWithoutResult(status -> {
				proposalLineRepository.deleteAll();
				proposalRepository.deleteAll();
				em.getEntityManager().createQuery("DELETE FROM TimeEntry").executeUpdate();
				em.getEntityManager().createQuery("DELETE FROM Task").executeUpdate();
				em.getEntityManager().createQuery("DELETE FROM WorkPackage").executeUpdate();
				em.getEntityManager().createQuery("DELETE FROM Project").executeUpdate();
				em.getEntityManager().createQuery("DELETE FROM Contract").executeUpdate();
				em.getEntityManager().createQuery("DELETE FROM Customer").executeUpdate();
				em.getEntityManager().createQuery("DELETE FROM Employee").executeUpdate();
				em.getEntityManager().createQuery("DELETE FROM User").executeUpdate();
				em.getEntityManager().createQuery("DELETE FROM BillRate").executeUpdate();
				em.getEntityManager().createQuery("DELETE FROM WorkTypeRateFactor").executeUpdate();
			});
		}
	}

	// ---------- du lieu mau ----------

	private InvoiceProposalCreateReq request() {
		return new InvoiceProposalCreateReq(FROM, TO, null);
	}

	private record Fixture(Long projectId, Long userId, Long taskId, List<TimeEntry> approved, List<TimeEntry> pending) {
	}

	/** Du an theo gio co {@code approved} dong da duyet + {@code pending} dong cho duyet, nhan su co don gia 2.400.000/ngay. */
	private Fixture seed(int approved, int pending) {
		int n = UNIQUE.incrementAndGet();
		LocalDateTime now = LocalDateTime.of(2026, 9, 1, 8, 0);

		User user = new User();
		user.setUsername("dev" + n);
		user.setPasswordHash("x");
		user.setFullName("Dev " + n);
		em.persist(user);
		Employee employee = new Employee();
		employee.setUser(user);
		employee.setProfessionalRole("Lap trinh vien");
		employee.setLevel("Senior");
		employee.setStandardHoursPerWeek(new BigDecimal("40"));
		employee.setHireDate(LocalDate.of(2024, 1, 1));
		em.persist(employee);

		if (em.getEntityManager().createQuery("SELECT COUNT(b) FROM BillRate b", Long.class).getSingleResult() == 0) {
			BillRate rate = new BillRate();
			rate.setProfessionalRole("Lap trinh vien");
			rate.setLevel("Senior");
			rate.setDailyRate(new BigDecimal("2400000.00"));
			rate.setEffectiveFrom(LocalDate.of(2024, 1, 1));
			em.persist(rate);
		}
		if (em.getEntityManager().createQuery("SELECT COUNT(w) FROM WorkTypeRateFactor w", Long.class).getSingleResult() == 0) {
			WorkTypeRateFactor factor = new WorkTypeRateFactor();
			factor.setWorkType(WorkType.NORMAL);
			factor.setFactor(BigDecimal.ONE);
			em.persist(factor);
		}

		Customer customer = new Customer();
		customer.setCode("KH" + n);
		customer.setName("Khach hang " + n);
		customer.setCreatedAt(now);
		em.persist(customer);
		Contract contract = new Contract();
		contract.setContractCode("HD" + n);
		contract.setName("Hop dong theo gio " + n);
		contract.setCustomerId(customer.getId());
		contract.setContractType(ContractType.TIME_AND_MATERIAL);
		contract.setTotalValue(new BigDecimal("1000000000"));
		contract.setCreatedAt(now);
		em.persist(contract);
		Project project = new Project();
		project.setProjectCode("PRJ" + n);
		project.setName("Du an " + n);
		project.setContractId(contract.getId());
		project.setCustomerId(customer.getId());
		project.setProjectType("SERVICE");
		project.setStartDate(FROM);
		project.setExpectedEndDate(LocalDate.of(2026, 12, 31));
		project.setProjectManagerId(user.getId());
		project.setCreatedAt(now);
		em.persist(project);
		WorkPackage workPackage = new WorkPackage();
		workPackage.setProjectId(project.getId());
		workPackage.setName("WP" + n);
		workPackage.setCreatedAt(now);
		em.persist(workPackage);
		Task task = new Task();
		task.setProjectId(project.getId());
		task.setWorkPackageId(workPackage.getId());
		task.setName("Phat trien API");
		task.setCreatedAt(now);
		em.persist(task);

		List<TimeEntry> approvedEntries = new ArrayList<>();
		for (int i = 0; i < approved; i++) {
			approvedEntries.add(entry(task, user, FROM.plusDays(i), TimeEntryStatus.APPROVED));
		}
		List<TimeEntry> pendingEntries = new ArrayList<>();
		for (int i = 0; i < pending; i++) {
			pendingEntries.add(entry(task, user, FROM.plusDays(20 + i), TimeEntryStatus.SUBMITTED));
		}
		em.flush();
		return new Fixture(project.getId(), user.getId(), task.getId(), approvedEntries, pendingEntries);
	}

	private TimeEntry entry(Task task, User user, LocalDate date, TimeEntryStatus status) {
		TimeEntry entry = new TimeEntry();
		entry.setTaskId(task.getId());
		entry.setUserId(user.getId());
		entry.setWorkDate(date);
		entry.setHours(new BigDecimal("8.00"));
		entry.setStatus(status);
		entry.setBillable(true);
		entry.setWorkType(WorkType.NORMAL);
		entry.setCreatedAt(LocalDateTime.of(2026, 9, 1, 8, 0));
		entry.setUpdatedAt(LocalDateTime.of(2026, 9, 1, 8, 0));
		em.persist(entry);
		return entry;
	}

	private ProjectExpense expense(Fixture f, ExpenseStatus status, boolean billable, String amount) {
		ProjectExpense expense = new ProjectExpense();
		expense.setProjectId(f.projectId);
		expense.setUserId(f.userId);
		expense.setType(ExpenseType.TRAVEL);
		expense.setAmount(new BigDecimal(amount));
		expense.setExpenseDate(FROM.plusDays(3));
		expense.setDescription("Chi phi cong tac");
		expense.setStatus(status);
		expense.setBillable(billable);
		expense.setInvoiced(false);
		expense.setCreatedAt(LocalDateTime.of(2026, 9, 1, 8, 0));
		expense.setUpdatedAt(LocalDateTime.of(2026, 9, 1, 8, 0));
		em.persist(expense);
		return expense;
	}
}
