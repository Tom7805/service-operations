package com.serviceops.modules.invoice;

import com.serviceops.common.audit.AuditTargetType;
import com.serviceops.common.audit.service.AuditLogService;
import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import com.serviceops.modules.contract.entity.Contract;
import com.serviceops.modules.contract.enums.ContractType;
import com.serviceops.modules.contract.repository.ContractRepository;
import com.serviceops.modules.expense.entity.ProjectExpense;
import com.serviceops.modules.expense.enums.ExpenseStatus;
import com.serviceops.modules.expense.enums.ExpenseType;
import com.serviceops.modules.expense.repository.ProjectExpenseRepository;
import com.serviceops.modules.invoice.dto.request.InvoiceProposalCreateReq;
import com.serviceops.modules.invoice.dto.response.InvoiceProposalRes;
import com.serviceops.modules.invoice.entity.InvoiceProposal;
import com.serviceops.modules.invoice.entity.InvoiceProposalLine;
import com.serviceops.modules.invoice.enums.ProposalLineType;
import com.serviceops.modules.invoice.enums.ProposalStatus;
import com.serviceops.modules.invoice.repository.InvoiceLineRepository;
import com.serviceops.modules.invoice.repository.InvoiceProposalLineRepository;
import com.serviceops.modules.invoice.repository.InvoiceProposalRepository;
import com.serviceops.modules.invoice.repository.InvoiceRepository;
import com.serviceops.modules.invoice.service.impl.InvoiceProposalServiceImpl;
import com.serviceops.modules.invoice.validator.ContractValueLimitValidator;
import com.serviceops.modules.notification.enums.NotificationType;
import com.serviceops.modules.notification.service.NotificationService;
import com.serviceops.modules.project.entity.Project;
import com.serviceops.modules.project.entity.Task;
import com.serviceops.modules.project.repository.ProjectRepository;
import com.serviceops.modules.project.repository.TaskRepository;
import com.serviceops.modules.rate.dto.response.ResolvedRateRes;
import com.serviceops.modules.rate.service.RateResolutionService;
import com.serviceops.modules.timesheet.entity.TimeEntry;
import com.serviceops.modules.timesheet.enums.TimeEntryStatus;
import com.serviceops.modules.timesheet.enums.TimeEntryType;
import com.serviceops.modules.timesheet.enums.WorkType;
import com.serviceops.modules.timesheet.repository.TimeEntryRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicLong;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Nghiep vu tao de nghi xuat hoa don tu gio cong da duyet (NCL-10-CN-001, QTN-18):
 * TC-01 gom dung cac dong va tinh tong theo don gia ap dung, TC-02 bo qua dong chua duyet va dem so dong bi bo qua,
 * TC-03 loai dong da nam trong de nghi truoc, TC-05 ghi Nhat ky he thong. TC-04 (vai tro) nam o
 * {@link InvoiceProposalControllerTest}.
 */
@ExtendWith(MockitoExtension.class)
class InvoiceProposalServiceTest {

	private static final ZoneId ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
	private static final LocalDate FROM = LocalDate.of(2026, 9, 1);
	private static final LocalDate TO = LocalDate.of(2026, 9, 30);
	private static final Long PROJECT_ID = 1L;
	private static final Long TASK_ID = 20L;
	/** Don gia ngay ap dung 2.400.000 -> 300.000/gio (1 ngay cong = 8 gio). */
	private static final String DAILY_RATE = "2400000.00";

	@Mock private ProjectRepository projectRepository;
	@Mock private ContractRepository contractRepository;
	@Mock private TaskRepository taskRepository;
	@Mock private TimeEntryRepository timeEntryRepository;
	@Mock private ProjectExpenseRepository projectExpenseRepository;
	@Mock private InvoiceProposalRepository proposalRepository;
	@Mock private InvoiceProposalLineRepository proposalLineRepository;
	@Mock private InvoiceRepository invoiceRepository;
	@Mock private InvoiceLineRepository invoiceLineRepository;
	@Mock private ContractValueLimitValidator limitValidator;
	@Mock private RateResolutionService rateResolutionService;
	@Mock private NotificationService notificationService;
	@Mock private AuditLogService auditLogService;

	private InvoiceProposalServiceImpl service;

	@BeforeEach
	void setUp() {
		Clock clock = Clock.fixed(Instant.parse("2026-10-01T03:00:00Z"), ZONE);
		service = new InvoiceProposalServiceImpl(projectRepository, contractRepository, taskRepository,
				timeEntryRepository, projectExpenseRepository, proposalRepository, proposalLineRepository,
				invoiceRepository, invoiceLineRepository, limitValidator,
				rateResolutionService, notificationService, auditLogService, clock);
		SecurityContextHolder.getContext().setAuthentication(
				new UsernamePasswordAuthenticationToken("ketoan01", "x"));
	}

	@AfterEach
	void clearSecurityContext() {
		SecurityContextHolder.clearContext();
	}

	// ---------- TC-01 ----------

	@Test
	@DisplayName("NCL-10-CN-001-TC-01: 20 dong gio cong da duyet -> gom du 20 dong, tong theo don gia ap dung")
	void gathersAllTwentyApprovedBillableEntriesAndTotalsThemByAppliedRate() {
		stubProjectAndContract(ContractType.TIME_AND_MATERIAL);
		stubEntries(entries(20, TimeEntryStatus.APPROVED, true));
		stubNoExpenses();
		stubPersistence();
		stubResolvableRates();

		InvoiceProposalRes res = service.createFromApprovedTimesheets(PROJECT_ID, request());

		assertThat(res.laborLines()).hasSize(20);
		// moi dong 8 gio x 300.000/gio = 2.400.000; 20 dong = 48.000.000
		assertThat(res.laborAmount()).isEqualByComparingTo("48000000.00");
		assertThat(res.expenseAmount()).isEqualByComparingTo("0");
		assertThat(res.totalAmount()).isEqualByComparingTo("48000000.00");
		assertThat(res.laborLines().get(0).unitRate()).isEqualByComparingTo("300000");
		assertThat(res.laborLines().get(0).amount()).isEqualByComparingTo("2400000.00");
		assertThat(res.skipped().total()).isZero();
		assertThat(res.status()).isEqualTo("PENDING");
		assertThat(res.proposalCode()).startsWith("IP-20261001-");
		assertThat(res.createdBy()).isEqualTo("ketoan01");
		assertThat(res.contractId()).isEqualTo(5L);
		assertThat(res.customerId()).isEqualTo(9L);

		ArgumentCaptor<InvoiceProposal> saved = ArgumentCaptor.forClass(InvoiceProposal.class);
		verify(proposalRepository).save(saved.capture());
		assertThat(saved.getValue().getStatus()).isEqualTo(ProposalStatus.PENDING);
		assertThat(saved.getValue().getPeriodFrom()).isEqualTo(FROM);
		assertThat(saved.getValue().getPeriodTo()).isEqualTo(TO);
	}

	@Test
	@DisplayName("Bang gia ap dung theo tung dong: don gia rieng tung ngay cong duoc dung, khong dung mot don gia chung")
	void usesTheRateResolvedForEachEntryIndividually() {
		stubProjectAndContract(ContractType.TIME_AND_MATERIAL);
		TimeEntry cheap = entry(1L, TimeEntryStatus.APPROVED, true, "8.00");
		TimeEntry pricey = entry(2L, TimeEntryStatus.APPROVED, true, "4.00");
		stubEntries(List.of(cheap, pricey));
		stubNoExpenses();
		stubPersistence();
		when(rateResolutionService.resolveForTimeEntry(1L)).thenReturn(rate(1L, "1600000.00")); // 200.000/gio
		when(rateResolutionService.resolveForTimeEntry(2L)).thenReturn(rate(2L, "4000000.00")); // 500.000/gio

		InvoiceProposalRes res = service.createFromApprovedTimesheets(PROJECT_ID, request());

		// 8h x 200.000 + 4h x 500.000 = 1.600.000 + 2.000.000
		assertThat(res.laborAmount()).isEqualByComparingTo("3600000.00");
	}

	// ---------- TC-02 ----------

	@Test
	@DisplayName("NCL-10-CN-001-TC-02: 5 dong cho duyet bi bo qua va so dong bi bo qua duoc neu ro")
	void skipsFiveEntriesStillWaitingForApprovalAndReportsTheCount() {
		stubProjectAndContract(ContractType.TIME_AND_MATERIAL);
		List<TimeEntry> all = new ArrayList<>(entries(3, TimeEntryStatus.APPROVED, true));
		for (int i = 0; i < 5; i++) {
			all.add(entry(100L + i, TimeEntryStatus.SUBMITTED, true, "8.00"));
		}
		stubEntries(all);
		stubNoExpenses();
		stubPersistence();
		stubResolvableRates();

		InvoiceProposalRes res = service.createFromApprovedTimesheets(PROJECT_ID, request());

		assertThat(res.laborLines()).hasSize(3);
		assertThat(res.skipped().notApprovedCount()).isEqualTo(5);
		assertThat(res.skipped().total()).isEqualTo(5);
		// chi 3 dong da duyet duoc xin rate — cac dong SUBMITTED khong bao gio duoc tra don gia
		verify(rateResolutionService, never()).resolveForTimeEntry(eq(100L));
	}

	@Test
	@DisplayName("Dong nhap (DRAFT) va bi tu choi (REJECTED) cung tinh la chua duyet")
	void countsDraftAndRejectedEntriesAsNotApproved() {
		stubProjectAndContract(ContractType.TIME_AND_MATERIAL);
		stubEntries(List.of(
				entry(1L, TimeEntryStatus.APPROVED, true, "8.00"),
				entry(2L, TimeEntryStatus.DRAFT, true, "8.00"),
				entry(3L, TimeEntryStatus.REJECTED, true, "8.00")));
		stubNoExpenses();
		stubPersistence();
		stubResolvableRates();

		InvoiceProposalRes res = service.createFromApprovedTimesheets(PROJECT_ID, request());

		assertThat(res.laborLines()).hasSize(1);
		assertThat(res.skipped().notApprovedCount()).isEqualTo(2);
	}

	@Test
	@DisplayName("Dong da duyet nhung khong tinh phi bi loai va duoc dem rieng")
	void excludesApprovedNonBillableEntriesAndCountsThem() {
		stubProjectAndContract(ContractType.TIME_AND_MATERIAL);
		stubEntries(List.of(
				entry(1L, TimeEntryStatus.APPROVED, true, "8.00"),
				entry(2L, TimeEntryStatus.APPROVED, false, "2.00")));
		stubNoExpenses();
		stubPersistence();
		stubResolvableRates();

		InvoiceProposalRes res = service.createFromApprovedTimesheets(PROJECT_ID, request());

		assertThat(res.laborLines()).extracting(l -> l.timeEntryId()).containsExactly(1L);
		assertThat(res.skipped().nonBillableCount()).isEqualTo(1);
		verify(rateResolutionService, never()).resolveForTimeEntry(eq(2L));
	}

	// ---------- TC-03 ----------

	@Test
	@DisplayName("NCL-10-CN-001-TC-03: dong da nam trong de nghi truoc bi loai khoi de nghi moi")
	void excludesEntriesAlreadyInAPreviousProposal() {
		stubProjectAndContract(ContractType.TIME_AND_MATERIAL);
		stubEntries(entries(4, TimeEntryStatus.APPROVED, true));
		stubNoExpenses();
		stubPersistence();
		stubResolvableRates();
		when(proposalLineRepository.findProposedTimeEntryIds(anyCollection())).thenReturn(List.of(1L, 2L));

		InvoiceProposalRes res = service.createFromApprovedTimesheets(PROJECT_ID, request());

		assertThat(res.laborLines()).extracting(l -> l.timeEntryId()).containsExactly(3L, 4L);
		assertThat(res.skipped().alreadyProposedCount()).isEqualTo(2);
		assertThat(res.laborAmount()).isEqualByComparingTo("4800000.00");
		verify(rateResolutionService, never()).resolveForTimeEntry(eq(1L));
		verify(rateResolutionService, never()).resolveForTimeEntry(eq(2L));
	}

	@Test
	@DisplayName("Tao lan hai cho cung ky khi moi dong da vao de nghi: bi chan, khong tao de nghi rong")
	void rejectsSecondProposalWhenEverythingIsAlreadyProposed() {
		stubProjectAndContract(ContractType.TIME_AND_MATERIAL);
		stubEntries(entries(2, TimeEntryStatus.APPROVED, true));
		stubNoExpenses();
		when(proposalLineRepository.findProposedTimeEntryIds(anyCollection())).thenReturn(List.of(1L, 2L));

		assertThatThrownBy(() -> service.createFromApprovedTimesheets(PROJECT_ID, request()))
				.isInstanceOfSatisfying(BusinessRuleException.class, ex -> {
					assertThat(ex.getErrorCode()).isEqualTo(ErrorCode.INVALID_STATE);
					assertThat(ex.getMessage()).contains("2 da nam trong de nghi truoc");
				});

		assertNothingWritten();
	}

	// ---------- dong thieu don gia ----------

	@Test
	@DisplayName("Dong chua tra duoc don gia bi bo qua va duoc dem, khong lam hong ca de nghi")
	void skipsEntriesWithoutResolvableRateAndCountsThem() {
		stubProjectAndContract(ContractType.TIME_AND_MATERIAL);
		stubEntries(List.of(
				entry(1L, TimeEntryStatus.APPROVED, true, "8.00"),
				entry(2L, TimeEntryStatus.APPROVED, true, "8.00")));
		stubNoExpenses();
		stubPersistence();
		when(rateResolutionService.resolveForTimeEntry(1L)).thenReturn(rate(1L, DAILY_RATE));
		when(rateResolutionService.resolveForTimeEntry(2L)).thenThrow(new BusinessRuleException(
				ErrorCode.VALIDATION_ERROR, "Nhan su chua duoc khai bao cap bac"));

		InvoiceProposalRes res = service.createFromApprovedTimesheets(PROJECT_ID, request());

		assertThat(res.laborLines()).extracting(l -> l.timeEntryId()).containsExactly(1L);
		assertThat(res.skipped().missingRateCount()).isEqualTo(1);
		assertThat(res.laborAmount()).isEqualByComparingTo("2400000.00");
	}

	@Test
	@DisplayName("Dong dao (but toan dao QTN-11) mang gio am -> thanh tien am, cong tru dung vao tong")
	void reversalEntryContributesNegativeAmount() {
		stubProjectAndContract(ContractType.TIME_AND_MATERIAL);
		TimeEntry reversal = entry(1L, TimeEntryStatus.APPROVED, true, "-8.00");
		reversal.setType(TimeEntryType.REVERSAL);
		TimeEntry correction = entry(2L, TimeEntryStatus.APPROVED, true, "6.00");
		correction.setType(TimeEntryType.CORRECTION);
		stubEntries(List.of(reversal, correction));
		stubNoExpenses();
		stubPersistence();
		stubResolvableRates();

		InvoiceProposalRes res = service.createFromApprovedTimesheets(PROJECT_ID, request());

		assertThat(res.laborLines().get(0).amount()).isEqualByComparingTo("-2400000.00");
		assertThat(res.laborLines().get(1).amount()).isEqualByComparingTo("1800000.00");
		assertThat(res.laborAmount()).isEqualByComparingTo("-600000.00");
	}

	// ---------- chi phi tinh lai (NCL-08-CN-003) ----------

	@Test
	@DisplayName("Phieu chi phi da duyet + danh dau tinh lai + chua xuat vao de nghi va duoc danh dau invoiced")
	void includesApprovedBillableExpensesAndMarksThemInvoiced() {
		stubProjectAndContract(ContractType.TIME_AND_MATERIAL);
		stubEntries(entries(1, TimeEntryStatus.APPROVED, true));
		ProjectExpense eligible = expense(50L, ExpenseStatus.APPROVED, true, false, "2000000.00");
		ProjectExpense notApproved = expense(51L, ExpenseStatus.SUBMITTED, true, false, "100.00");
		ProjectExpense notBillable = expense(52L, ExpenseStatus.APPROVED, false, false, "200.00");
		ProjectExpense alreadyInvoiced = expense(53L, ExpenseStatus.APPROVED, true, true, "300.00");
		when(projectExpenseRepository.findByProjectIdAndExpenseDateBetweenOrderByExpenseDateAscIdAsc(PROJECT_ID, FROM, TO))
				.thenReturn(List.of(eligible, notApproved, notBillable, alreadyInvoiced));
		stubPersistence();
		stubResolvableRates();

		InvoiceProposalRes res = service.createFromApprovedTimesheets(PROJECT_ID, request());

		assertThat(res.expenseLines()).hasSize(1);
		assertThat(res.expenseLines().get(0).projectExpenseId()).isEqualTo(50L);
		assertThat(res.expenseLines().get(0).lineType()).isEqualTo(ProposalLineType.EXPENSE.name());
		assertThat(res.expenseAmount()).isEqualByComparingTo("2000000.00");
		assertThat(res.laborAmount()).isEqualByComparingTo("2400000.00");
		assertThat(res.totalAmount()).isEqualByComparingTo("4400000.00");
		assertThat(eligible.getInvoiced()).isTrue();
		assertThat(notApproved.getInvoiced()).isFalse();
		assertThat(notBillable.getInvoiced()).isFalse();
	}

	@Test
	@DisplayName("Ky chi co phieu chi phi tinh lai (khong co gio cong) van tao duoc de nghi")
	void allowsProposalContainingOnlyExpenses() {
		stubProjectAndContract(ContractType.TIME_AND_MATERIAL);
		stubEntries(List.of());
		when(projectExpenseRepository.findByProjectIdAndExpenseDateBetweenOrderByExpenseDateAscIdAsc(PROJECT_ID, FROM, TO))
				.thenReturn(List.of(expense(50L, ExpenseStatus.APPROVED, true, false, "1500000.00")));
		stubPersistence();

		InvoiceProposalRes res = service.createFromApprovedTimesheets(PROJECT_ID, request());

		assertThat(res.laborLines()).isEmpty();
		assertThat(res.totalAmount()).isEqualByComparingTo("1500000.00");
	}

	// ---------- TC-05 & thong bao ----------

	@Test
	@DisplayName("NCL-10-CN-001-TC-05: ghi Nhat ky he thong voi nguoi thuc hien, noi dung va doi tuong hoa don")
	void writesSystemAuditLogWithProposalTargetAndSummary() {
		stubProjectAndContract(ContractType.TIME_AND_MATERIAL);
		stubEntries(entries(2, TimeEntryStatus.APPROVED, true));
		stubNoExpenses();
		stubPersistence();
		stubResolvableRates();

		InvoiceProposalRes res = service.createFromApprovedTimesheets(PROJECT_ID, request());

		ArgumentCaptor<String> detail = ArgumentCaptor.forClass(String.class);
		verify(auditLogService).record(eq("Tao de nghi xuat hoa don tu gio cong"), eq(AuditTargetType.INVOICE),
				eq(100L), eq(res.proposalCode()), detail.capture());
		assertThat(detail.getValue()).contains(res.proposalCode()).contains("PRJ-01").contains("2 dong gio cong")
				.contains("4800000.00");
	}

	@Test
	@DisplayName("Tich hop thong bao: gui thong bao trong ung dung cho quan ly du an")
	void notifiesTheProjectManagerInApp() {
		stubProjectAndContract(ContractType.TIME_AND_MATERIAL);
		stubEntries(entries(2, TimeEntryStatus.APPROVED, true));
		stubNoExpenses();
		stubPersistence();
		stubResolvableRates();

		InvoiceProposalRes res = service.createFromApprovedTimesheets(PROJECT_ID, request());

		ArgumentCaptor<String> content = ArgumentCaptor.forClass(String.class);
		verify(notificationService).sendInAppNotification(eq(7L), eq(NotificationType.INVOICE_PROPOSAL_CREATED),
				anyString(), content.capture(), eq(100L), eq("InvoiceProposal"));
		assertThat(content.getValue()).contains(res.proposalCode()).contains("4800000.00");
	}

	// ---------- ngoai le / rang buoc ----------

	@Test
	@DisplayName("Chi ap dung cho hop dong theo gio: hop dong tron goi bi tu choi INVALID_STATE")
	void rejectsNonTimeAndMaterialContract() {
		stubProjectAndContract(ContractType.FIXED_PRICE);

		assertThatThrownBy(() -> service.createFromApprovedTimesheets(PROJECT_ID, request()))
				.isInstanceOfSatisfying(BusinessRuleException.class, ex -> {
					assertThat(ex.getErrorCode()).isEqualTo(ErrorCode.INVALID_STATE);
					assertThat(ex.getMessage()).contains("TIME_AND_MATERIAL");
				});

		assertNothingWritten();
	}

	@Test
	void rejectsUnknownProjectWith404() {
		when(projectRepository.findById(99L)).thenReturn(Optional.empty());

		assertThatThrownBy(() -> service.createFromApprovedTimesheets(99L, request()))
				.isInstanceOfSatisfying(BusinessRuleException.class,
						ex -> assertThat(ex.getErrorCode()).isEqualTo(ErrorCode.RESOURCE_NOT_FOUND));
		assertNothingWritten();
	}

	@Test
	void rejectsMissingContractWith404() {
		when(projectRepository.findById(PROJECT_ID)).thenReturn(Optional.of(project()));
		when(contractRepository.findByIdForUpdate(5L)).thenReturn(Optional.empty());

		assertThatThrownBy(() -> service.createFromApprovedTimesheets(PROJECT_ID, request()))
				.isInstanceOfSatisfying(BusinessRuleException.class,
						ex -> assertThat(ex.getErrorCode()).isEqualTo(ErrorCode.RESOURCE_NOT_FOUND));
	}

	@Test
	void rejectsPeriodWhereStartIsAfterEnd() {
		assertThatThrownBy(() -> service.createFromApprovedTimesheets(PROJECT_ID,
				new InvoiceProposalCreateReq(TO, FROM, null)))
				.isInstanceOfSatisfying(BusinessRuleException.class,
						ex -> assertThat(ex.getErrorCode()).isEqualTo(ErrorCode.VALIDATION_ERROR));
		verify(projectRepository, never()).findById(anyLong());
	}

	@Test
	void rejectsMissingPeriodBounds() {
		assertThatThrownBy(() -> service.createFromApprovedTimesheets(PROJECT_ID,
				new InvoiceProposalCreateReq(null, TO, null)))
				.isInstanceOfSatisfying(BusinessRuleException.class,
						ex -> assertThat(ex.getErrorCode()).isEqualTo(ErrorCode.VALIDATION_ERROR));
	}

	@Test
	@DisplayName("Ky khong co dong nao du dieu kien: INVALID_STATE kem so dong bi bo qua, khong ghi gi")
	void rejectsProposalWhenNothingIsEligibleAndExplainsWhy() {
		stubProjectAndContract(ContractType.TIME_AND_MATERIAL);
		List<TimeEntry> pending = new ArrayList<>();
		for (int i = 0; i < 5; i++) {
			pending.add(entry(100L + i, TimeEntryStatus.SUBMITTED, true, "8.00"));
		}
		stubEntries(pending);
		stubNoExpenses();

		assertThatThrownBy(() -> service.createFromApprovedTimesheets(PROJECT_ID, request()))
				.isInstanceOfSatisfying(BusinessRuleException.class, ex -> {
					assertThat(ex.getErrorCode()).isEqualTo(ErrorCode.INVALID_STATE);
					assertThat(ex.getMessage()).contains("bo qua 5 dong").contains("5 chua duyet");
				});

		assertNothingWritten();
	}

	@Test
	@DisplayName("Du an chua co cong viec nao: khong truy van gio cong, bao khong co dong du dieu kien")
	void projectWithoutTasksHasNothingToPropose() {
		stubProjectAndContract(ContractType.TIME_AND_MATERIAL);
		when(taskRepository.findByProjectIdOrderByIdAsc(PROJECT_ID)).thenReturn(List.of());
		stubNoExpenses();

		assertThatThrownBy(() -> service.createFromApprovedTimesheets(PROJECT_ID, request()))
				.isInstanceOfSatisfying(BusinessRuleException.class,
						ex -> assertThat(ex.getErrorCode()).isEqualTo(ErrorCode.INVALID_STATE));
		verify(timeEntryRepository, never()).findByTaskIdInAndWorkDateBetweenOrderByWorkDateAscIdAsc(any(), any(), any());
	}

	@Test
	void trimsSurroundingWhitespaceOfTheNote() {
		stubProjectAndContract(ContractType.TIME_AND_MATERIAL);
		stubEntries(entries(1, TimeEntryStatus.APPROVED, true));
		stubNoExpenses();
		stubPersistence();
		stubResolvableRates();

		InvoiceProposalRes withNote = service.createFromApprovedTimesheets(PROJECT_ID,
				new InvoiceProposalCreateReq(FROM, TO, "  Ky thang 9  "));
		assertThat(withNote.note()).isEqualTo("Ky thang 9");
	}

	// ---------- helpers ----------

	private InvoiceProposalCreateReq request() {
		return new InvoiceProposalCreateReq(FROM, TO, null);
	}

	private Project project() {
		Project project = new Project();
		project.setId(PROJECT_ID);
		project.setProjectCode("PRJ-01");
		project.setContractId(5L);
		project.setCustomerId(9L);
		project.setProjectManagerId(7L);
		return project;
	}

	private void stubProjectAndContract(ContractType type) {
		when(projectRepository.findById(PROJECT_ID)).thenReturn(Optional.of(project()));
		Contract contract = new Contract();
		contract.setId(5L);
		contract.setCustomerId(9L);
		contract.setContractType(type);
		when(contractRepository.findByIdForUpdate(5L)).thenReturn(Optional.of(contract));
	}

	private void stubEntries(List<TimeEntry> entries) {
		Task task = new Task();
		task.setId(TASK_ID);
		task.setProjectId(PROJECT_ID);
		task.setName("Phat trien API");
		when(taskRepository.findByProjectIdOrderByIdAsc(PROJECT_ID)).thenReturn(List.of(task));
		when(timeEntryRepository.findByTaskIdInAndWorkDateBetweenOrderByWorkDateAscIdAsc(List.of(TASK_ID), FROM, TO))
				.thenReturn(entries);
	}

	private void stubNoExpenses() {
		when(projectExpenseRepository.findByProjectIdAndExpenseDateBetweenOrderByExpenseDateAscIdAsc(PROJECT_ID, FROM, TO))
				.thenReturn(List.of());
	}

	/** Gan id tang dan cho de nghi (100) va cac dong luu ra — mo phong khoa chinh do DB cap. */
	private void stubPersistence() {
		when(proposalRepository.save(any(InvoiceProposal.class))).thenAnswer(invocation -> {
			InvoiceProposal proposal = invocation.getArgument(0);
			proposal.setId(100L);
			return proposal;
		});
		AtomicLong lineId = new AtomicLong(1000);
		when(proposalLineRepository.saveAll(anyCollection())).thenAnswer(invocation -> {
			List<InvoiceProposalLine> lines = new ArrayList<>(invocation.<java.util.Collection<InvoiceProposalLine>>getArgument(0));
			lines.forEach(line -> line.setId(lineId.incrementAndGet()));
			return lines;
		});
	}

	private void stubResolvableRates() {
		when(rateResolutionService.resolveForTimeEntry(anyLong()))
				.thenAnswer(invocation -> rate(invocation.getArgument(0), DAILY_RATE));
	}

	private List<TimeEntry> entries(int count, TimeEntryStatus status, boolean billable) {
		List<TimeEntry> list = new ArrayList<>();
		for (int i = 1; i <= count; i++) {
			list.add(entry(i, status, billable, "8.00"));
		}
		return list;
	}

	private TimeEntry entry(long id, TimeEntryStatus status, boolean billable, String hours) {
		TimeEntry entry = new TimeEntry();
		entry.setId(id);
		entry.setTaskId(TASK_ID);
		entry.setUserId(100L + id);
		entry.setWorkDate(FROM.plusDays(id % 20));
		entry.setHours(new BigDecimal(hours));
		entry.setStatus(status);
		entry.setBillable(billable);
		entry.setWorkType(WorkType.NORMAL);
		return entry;
	}

	private ResolvedRateRes rate(Long timeEntryId, String appliedDailyRate) {
		return new ResolvedRateRes(timeEntryId, TASK_ID, PROJECT_ID, 5L, "Lap trinh vien", "Senior",
				FROM, new BigDecimal("8.00"), WorkType.NORMAL, new BigDecimal(appliedDailyRate),
				LocalDate.of(2026, 1, 1), false, BigDecimal.ONE, new BigDecimal(appliedDailyRate));
	}

	private ProjectExpense expense(long id, ExpenseStatus status, boolean billable, boolean invoiced, String amount) {
		ProjectExpense expense = new ProjectExpense();
		expense.setId(id);
		expense.setProjectId(PROJECT_ID);
		expense.setType(ExpenseType.TRAVEL);
		expense.setAmount(new BigDecimal(amount));
		expense.setExpenseDate(FROM.plusDays(3));
		expense.setDescription("Ve may bay cong tac");
		expense.setStatus(status);
		expense.setBillable(billable);
		expense.setInvoiced(invoiced);
		return expense;
	}

	private void assertNothingWritten() {
		verify(proposalRepository, never()).save(any());
		verify(proposalLineRepository, never()).saveAll(any());
		verify(projectExpenseRepository, never()).saveAll(any());
		verify(auditLogService, never()).record(anyString(), any(), any(), any(), any());
		verify(notificationService, never()).sendInAppNotification(any(), any(), any(), any(), any(), any());
	}
}
