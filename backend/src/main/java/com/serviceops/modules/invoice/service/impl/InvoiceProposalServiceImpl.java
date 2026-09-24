package com.serviceops.modules.invoice.service.impl;

import com.serviceops.common.audit.AuditTargetType;
import com.serviceops.common.audit.service.AuditLogService;
import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import com.serviceops.modules.contract.entity.Contract;
import com.serviceops.modules.contract.enums.ContractType;
import com.serviceops.modules.contract.repository.ContractRepository;
import com.serviceops.modules.expense.entity.ProjectExpense;
import com.serviceops.modules.expense.enums.ExpenseStatus;
import com.serviceops.modules.expense.repository.ProjectExpenseRepository;
import com.serviceops.modules.invoice.dto.request.InvoiceFromProposalReq;
import com.serviceops.modules.invoice.dto.request.InvoiceProposalCreateReq;
import com.serviceops.modules.invoice.dto.response.InvoiceProposalLineRes;
import com.serviceops.modules.invoice.dto.response.InvoiceProposalRes;
import com.serviceops.modules.invoice.dto.response.InvoiceProposalSkippedRes;
import com.serviceops.modules.invoice.dto.response.InvoiceRes;
import com.serviceops.modules.invoice.entity.Invoice;
import com.serviceops.modules.invoice.entity.InvoiceLine;
import com.serviceops.modules.invoice.entity.InvoiceProposal;
import com.serviceops.modules.invoice.entity.InvoiceProposalLine;
import com.serviceops.modules.invoice.enums.InvoiceStatus;
import com.serviceops.modules.invoice.enums.ProposalLineType;
import com.serviceops.modules.invoice.enums.ProposalStatus;
import com.serviceops.modules.invoice.repository.InvoiceLineRepository;
import com.serviceops.modules.invoice.repository.InvoiceProposalLineRepository;
import com.serviceops.modules.invoice.repository.InvoiceProposalRepository;
import com.serviceops.modules.invoice.repository.InvoiceRepository;
import com.serviceops.modules.invoice.service.InvoiceProposalService;
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
import com.serviceops.modules.timesheet.repository.TimeEntryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Tao de nghi xuat hoa don tu gio cong da duyet (NCL-10-CN-001, QTN-18).
 *
 * <p>Khoa ghi dong hop dong ngay tu dau (cung cach {@link MilestoneInvoiceServiceImpl}) de hai ke toan bam nut cung
 * luc tren cung mot hop dong chay tuan tu: lan thu hai se thay cac dong gio cong da nam trong de nghi thu nhat
 * va bo qua chung thay vi gom trung. UNIQUE tren {@code time_entry_id}/{@code project_expense_id} la chot cuoi.</p>
 *
 * <p>Don gia ban cua tung dong lay tu {@link RateResolutionService#resolveForTimeEntry(Long)} — cung nguon voi
 * doanh thu ghi nhan cua NCL-09-CN-002 nen so tien tren de nghi khop voi bao cao doanh thu (uu tien don gia rieng
 * cua hop dong roi moi den bang gia chung QTN-16, don gia co hieu luc tai dung ngay cong QTN-15).</p>
 */
@Service
@RequiredArgsConstructor
@Transactional
public class InvoiceProposalServiceImpl implements InvoiceProposalService {

	private static final DateTimeFormatter CODE_DATE = DateTimeFormatter.ofPattern("yyyyMMdd");
	/** Gia dinh 1 ngay cong = 8 gio, quy doi don gia ngay sang don gia gio (cung gia dinh cua NCL-09-CN-002). */
	private static final BigDecimal HOURS_PER_WORKDAY = new BigDecimal("8");
	private static final String NOTIFICATION_REFERENCE_TYPE = "InvoiceProposal";

	private final ProjectRepository projectRepository;
	private final ContractRepository contractRepository;
	private final TaskRepository taskRepository;
	private final TimeEntryRepository timeEntryRepository;
	private final ProjectExpenseRepository projectExpenseRepository;
	private final InvoiceProposalRepository proposalRepository;
	private final InvoiceProposalLineRepository proposalLineRepository;
	private final InvoiceRepository invoiceRepository;
	private final InvoiceLineRepository invoiceLineRepository;
	private final ContractValueLimitValidator limitValidator;
	private final RateResolutionService rateResolutionService;
	private final NotificationService notificationService;
	private final AuditLogService auditLogService;
	private final Clock clock;

	@Override
	public InvoiceProposalRes createFromApprovedTimesheets(Long projectId, InvoiceProposalCreateReq request) {
		validatePeriod(request);
		LocalDate from = request.periodFrom();
		LocalDate to = request.periodTo();

		Project project = projectRepository.findById(projectId)
				.orElseThrow(() -> new BusinessRuleException(ErrorCode.RESOURCE_NOT_FOUND,
						"Khong tim thay du an voi id=" + projectId));
		Contract contract = contractRepository.findByIdForUpdate(project.getContractId())
				.orElseThrow(() -> new BusinessRuleException(ErrorCode.RESOURCE_NOT_FOUND,
						"Khong tim thay hop dong voi id=" + project.getContractId()));
		if (contract.getContractType() != ContractType.TIME_AND_MATERIAL) {
			throw new BusinessRuleException(ErrorCode.INVALID_STATE,
					"Chi tao de nghi xuat hoa don tu gio cong cho hop dong theo gio (TIME_AND_MATERIAL); "
							+ "hop dong " + contract.getContractType() + " lap hoa don theo luong khac");
		}

		List<Task> tasks = taskRepository.findByProjectIdOrderByIdAsc(projectId);
		Map<Long, Task> taskById = tasks.stream().collect(Collectors.toMap(Task::getId, Function.identity()));
		List<TimeEntry> entries = tasks.isEmpty() ? List.of()
				: timeEntryRepository.findByTaskIdInAndWorkDateBetweenOrderByWorkDateAscIdAsc(
						tasks.stream().map(Task::getId).toList(), from, to);

		// QTN-18: chi gio cong da duyet va co the tinh phi; cac dong con lai bi bo qua va duoc dem lai de ke toan doi chieu.
		int notApprovedCount = 0;
		int nonBillableCount = 0;
		List<TimeEntry> billable = new ArrayList<>();
		for (TimeEntry entry : entries) {
			if (entry.getStatus() != TimeEntryStatus.APPROVED) {
				notApprovedCount++;
			} else if (!Boolean.TRUE.equals(entry.getBillable())) {
				nonBillableCount++;
			} else {
				billable.add(entry);
			}
		}
		Set<Long> alreadyProposed = billable.isEmpty() ? Set.of()
				: new HashSet<>(proposalLineRepository.findProposedTimeEntryIds(
						billable.stream().map(TimeEntry::getId).toList()));

		int alreadyProposedCount = 0;
		int missingRateCount = 0;
		List<InvoiceProposalLine> laborLines = new ArrayList<>();
		for (TimeEntry entry : billable) {
			if (alreadyProposed.contains(entry.getId())) {
				alreadyProposedCount++;
				continue;
			}
			try {
				ResolvedRateRes resolved = rateResolutionService.resolveForTimeEntry(entry.getId());
				BigDecimal unitRate = resolved.appliedDailyRate().divide(HOURS_PER_WORKDAY, 4, RoundingMode.HALF_UP);
				laborLines.add(laborLine(entry, taskById.get(entry.getTaskId()), unitRate));
			} catch (BusinessRuleException missingRate) {
				// Chua khai bao cap bac, chua co don gia hieu luc... — bo qua dong nay thay vi lam hong ca de nghi
				// (cung cach NCL-09-CN-002 danh dau missingRateData); dem lai de ke toan bo sung don gia roi gom sau.
				missingRateCount++;
			}
		}
		InvoiceProposalSkippedRes skipped = new InvoiceProposalSkippedRes(
				notApprovedCount, nonBillableCount, alreadyProposedCount, missingRateCount);

		// NCL-08-CN-003: phieu chi phi da duyet duoc danh dau tinh lai cho khach hang cung di vao de nghi cua du an.
		List<ProjectExpense> expenses = projectExpenseRepository
				.findByProjectIdAndExpenseDateBetweenOrderByExpenseDateAscIdAsc(projectId, from, to).stream()
				.filter(expense -> expense.getStatus() == ExpenseStatus.APPROVED
						&& Boolean.TRUE.equals(expense.getBillable())
						&& !Boolean.TRUE.equals(expense.getInvoiced()))
				.toList();

		if (laborLines.isEmpty() && expenses.isEmpty()) {
			throw new BusinessRuleException(ErrorCode.INVALID_STATE,
					"Khong co dong gio cong hoac chi phi nao du dieu kien de xuat hoa don trong ky " + from + " .. "
							+ to + " (bo qua " + skipped.total() + " dong gio cong: " + describe(skipped) + ")");
		}

		BigDecimal laborAmount = sum(laborLines);
		List<InvoiceProposalLine> expenseLines = expenses.stream().map(this::expenseLine).toList();
		BigDecimal expenseAmount = sum(expenseLines);

		LocalDateTime now = LocalDateTime.now(clock);
		InvoiceProposal proposal = new InvoiceProposal();
		proposal.setProposalCode(generateProposalCode(LocalDate.now(clock)));
		proposal.setProjectId(projectId);
		proposal.setContractId(contract.getId());
		proposal.setCustomerId(contract.getCustomerId());
		proposal.setPeriodFrom(from);
		proposal.setPeriodTo(to);
		proposal.setStatus(ProposalStatus.PENDING);
		proposal.setLaborAmount(laborAmount);
		proposal.setExpenseAmount(expenseAmount);
		proposal.setTotalAmount(laborAmount.add(expenseAmount));
		proposal.setNote(blankToNull(request.note()));
		proposal.setCreatedBy(currentUsername());
		proposal.setCreatedAt(now);
		proposal.setUpdatedAt(now);
		proposal = proposalRepository.save(proposal);

		List<InvoiceProposalLine> allLines = new ArrayList<>(laborLines);
		allLines.addAll(expenseLines);
		for (InvoiceProposalLine line : allLines) {
			line.setInvoiceProposalId(proposal.getId());
		}
		List<InvoiceProposalLine> saved = proposalLineRepository.saveAll(allLines);

		// Danh dau phieu chi phi da nam trong de nghi: khong vao de nghi khac va khong bo danh dau "tinh lai" duoc nua.
		for (ProjectExpense expense : expenses) {
			expense.setInvoiced(true);
			expense.setUpdatedAt(now);
		}
		projectExpenseRepository.saveAll(expenses);

		auditLogService.record("Tao de nghi xuat hoa don tu gio cong", AuditTargetType.INVOICE, proposal.getId(),
				proposal.getProposalCode(),
				"Tao de nghi " + proposal.getProposalCode() + " cho du an " + project.getProjectCode() + " ky "
						+ from + " .. " + to + ": " + laborLines.size() + " dong gio cong (" + laborAmount + "), "
						+ expenses.size() + " phieu chi phi (" + expenseAmount + "), tong "
						+ proposal.getTotalAmount() + "; bo qua " + skipped.total() + " dong gio cong ("
						+ describe(skipped) + ")");

		notifyProjectManager(project, proposal, laborLines.size(), expenses.size());

		return toResponse(proposal, saved, skipped);
	}

	@Override
	@Transactional(readOnly = true)
	public List<InvoiceProposalRes> listByContract(Long contractId) {
		List<InvoiceProposal> proposals = proposalRepository.findByContractIdOrderByIdDesc(contractId);
		InvoiceProposalSkippedRes noSkip = new InvoiceProposalSkippedRes(0, 0, 0, 0);
		return proposals.stream()
				.map(p -> toResponse(p, proposalLineRepository.findByInvoiceProposalIdOrderByIdAsc(p.getId()), noSkip))
				.toList();
	}

	@Override
	public InvoiceRes convertToInvoice(Long proposalId, InvoiceFromProposalReq request) {
		InvoiceProposal proposal = proposalRepository.findById(proposalId)
				.orElseThrow(() -> new BusinessRuleException(ErrorCode.RESOURCE_NOT_FOUND,
						"Khong tim thay de nghi xuat hoa don voi id=" + proposalId));
		if (proposal.getStatus() != ProposalStatus.PENDING) {
			throw new BusinessRuleException(ErrorCode.INVALID_STATE,
					"De nghi " + proposal.getProposalCode() + " dang o trang thai " + proposal.getStatus()
							+ ", chi de nghi PENDING moi lap hoa don duoc");
		}

		Contract contract = contractRepository.findByIdForUpdate(proposal.getContractId())
				.orElseThrow(() -> new BusinessRuleException(ErrorCode.RESOURCE_NOT_FOUND,
						"Khong tim thay hop dong voi id=" + proposal.getContractId()));

		BigDecimal amount = proposal.getTotalAmount().setScale(2, RoundingMode.HALF_UP);
		BigDecimal alreadyInvoiced = invoiceRepository.sumActiveTotalByContractId(contract.getId())
				.setScale(2, RoundingMode.HALF_UP);
		limitValidator.validate(contract, alreadyInvoiced, amount);

		LocalDate today = LocalDate.now(clock);
		LocalDateTime now = LocalDateTime.now(clock);
		LocalDate invoiceDate = request != null && request.invoiceDate() != null ? request.invoiceDate() : today;
		LocalDate dueDate = request != null && request.dueDate() != null
				? request.dueDate()
				: invoiceDate.plusDays(Invoice.DEFAULT_PAYMENT_TERM_DAYS);
		if (dueDate.isBefore(invoiceDate)) {
			throw new BusinessRuleException(ErrorCode.VALIDATION_ERROR,
					"Han thanh toan (" + dueDate + ") khong duoc truoc ngay hoa don (" + invoiceDate + ")");
		}
		String note = request != null && request.note() != null && !request.note().isBlank()
				? request.note().trim()
				: proposal.getNote();

		Invoice invoice = new Invoice();
		invoice.setInvoiceCode(generateInvoiceCode(today));
		invoice.setContractId(contract.getId());
		invoice.setCustomerId(proposal.getCustomerId());
		invoice.setStatus(InvoiceStatus.ISSUED);
		invoice.setTotalAmount(amount);
		invoice.setInvoiceDate(invoiceDate);
		invoice.setDueDate(dueDate);
		invoice.setNote(note);
		invoice.setCreatedBy(currentUsername());
		invoice.setCreatedAt(now);
		invoice.setUpdatedAt(now);
		invoice = invoiceRepository.save(invoice);

		List<InvoiceProposalLine> proposalLines = proposalLineRepository.findByInvoiceProposalIdOrderByIdAsc(proposal.getId());
		Long invoiceId = invoice.getId();
		List<InvoiceLine> invoiceLines = proposalLines.stream().map(pl -> {
			InvoiceLine line = new InvoiceLine();
			line.setInvoiceId(invoiceId);
			line.setDescription(pl.getDescription());
			line.setAmount(pl.getAmount());
			return line;
		}).toList();
		invoiceLineRepository.saveAll(invoiceLines);

		proposal.setStatus(ProposalStatus.INVOICED);
		proposal.setUpdatedAt(now);
		proposalRepository.save(proposal);

		auditLogService.record("Lap hoa don tu de nghi xuat hoa don", AuditTargetType.INVOICE, invoice.getId(),
				invoice.getInvoiceCode(),
				"Lap hoa don " + invoice.getInvoiceCode() + " gia tri " + amount + " tu de nghi "
						+ proposal.getProposalCode() + " cua hop dong " + contract.getContractCode()
						+ " (tong da xuat " + alreadyInvoiced + " -> " + alreadyInvoiced.add(amount) + ")");

		return new InvoiceRes(invoice.getId(), invoice.getInvoiceCode(), contract.getId(), null, null,
				invoice.getStatus().name(), amount, invoice.getInvoiceDate(), invoice.getDueDate(), invoice.getNote(),
				contract.getTotalValue(), alreadyInvoiced.add(amount), invoice.getCreatedBy(), invoice.getCreatedAt());
	}

	@Override
	public InvoiceProposalRes cancelProposal(Long proposalId) {
		InvoiceProposal proposal = proposalRepository.findById(proposalId)
				.orElseThrow(() -> new BusinessRuleException(ErrorCode.RESOURCE_NOT_FOUND,
						"Khong tim thay de nghi xuat hoa don voi id=" + proposalId));
		if (proposal.getStatus() != ProposalStatus.PENDING) {
			throw new BusinessRuleException(ErrorCode.INVALID_STATE,
					"De nghi " + proposal.getProposalCode() + " dang o trang thai " + proposal.getStatus()
							+ ", chi de nghi PENDING moi huy duoc");
		}

		List<InvoiceProposalLine> lines = proposalLineRepository.findByInvoiceProposalIdOrderByIdAsc(proposalId);
		List<Long> expenseIds = lines.stream()
				.map(InvoiceProposalLine::getProjectExpenseId)
				.filter(id -> id != null)
				.toList();
		if (!expenseIds.isEmpty()) {
			List<ProjectExpense> expenses = projectExpenseRepository.findAllById(expenseIds);
			LocalDateTime now = LocalDateTime.now(clock);
			for (ProjectExpense expense : expenses) {
				expense.setInvoiced(false);
				expense.setUpdatedAt(now);
			}
			projectExpenseRepository.saveAll(expenses);
		}
		// Xoa het cac dong de giai phong time_entry_id/project_expense_id (UNIQUE) — de nghi tao sau
		// moi gom lai duoc dung gio cong/chi phi nay (findProposedTimeEntryIds khong loc theo trang thai
		// de nghi cha nen chi xoa dong moi thuc su "tra lai" duoc du lieu).
		proposalLineRepository.deleteAll(lines);

		proposal.setStatus(ProposalStatus.CANCELLED);
		proposal.setUpdatedAt(LocalDateTime.now(clock));
		proposal = proposalRepository.save(proposal);

		auditLogService.record("Huy de nghi xuat hoa don", AuditTargetType.INVOICE, proposal.getId(),
				proposal.getProposalCode(),
				"Huy de nghi " + proposal.getProposalCode() + " (tong " + proposal.getTotalAmount()
						+ ") — giai phong " + lines.size() + " dong de gom lai o de nghi sau");

		return toResponse(proposal, List.of(), new InvoiceProposalSkippedRes(0, 0, 0, 0));
	}

	/** INV-yyyyMMdd-XXXXXX; cot invoice_code co UNIQUE nen trung ngau nhien (rat hiem) van bi chan o DB. */
	private String generateInvoiceCode(LocalDate date) {
		String suffix = UUID.randomUUID().toString().replace("-", "").substring(0, 6).toUpperCase();
		return "INV-" + CODE_DATE.format(date) + "-" + suffix;
	}

	private InvoiceProposalLine laborLine(TimeEntry entry, Task task, BigDecimal unitRate) {
		InvoiceProposalLine line = new InvoiceProposalLine();
		line.setLineType(ProposalLineType.LABOR);
		line.setTimeEntryId(entry.getId());
		line.setLineDate(entry.getWorkDate());
		line.setUserId(entry.getUserId());
		line.setHours(entry.getHours());
		line.setUnitRate(unitRate);
		line.setDescription(truncate("Gio cong ngay " + entry.getWorkDate()
				+ (task == null ? "" : " - " + task.getName()), 500));
		line.setAmount(entry.getHours().multiply(unitRate).setScale(2, RoundingMode.HALF_UP));
		return line;
	}

	private InvoiceProposalLine expenseLine(ProjectExpense expense) {
		InvoiceProposalLine line = new InvoiceProposalLine();
		line.setLineType(ProposalLineType.EXPENSE);
		line.setProjectExpenseId(expense.getId());
		line.setLineDate(expense.getExpenseDate());
		line.setDescription(truncate("Chi phi " + expense.getType() + ": " + expense.getDescription(), 500));
		line.setAmount(expense.getAmount().setScale(2, RoundingMode.HALF_UP));
		return line;
	}

	private void notifyProjectManager(Project project, InvoiceProposal proposal, int laborCount, int expenseCount) {
		if (project.getProjectManagerId() == null) {
			return;
		}
		notificationService.sendInAppNotification(project.getProjectManagerId(),
				NotificationType.INVOICE_PROPOSAL_CREATED,
				"De nghi xuat hoa don moi cho du an " + project.getProjectCode(),
				"Ke toan da tao de nghi " + proposal.getProposalCode() + " ky " + proposal.getPeriodFrom() + " .. "
						+ proposal.getPeriodTo() + ": " + laborCount + " dong gio cong, " + expenseCount
						+ " phieu chi phi, tong " + proposal.getTotalAmount() + ".",
				proposal.getId(), NOTIFICATION_REFERENCE_TYPE);
	}

	private InvoiceProposalRes toResponse(InvoiceProposal proposal, List<InvoiceProposalLine> lines,
			InvoiceProposalSkippedRes skipped) {
		List<InvoiceProposalLineRes> labor = lines.stream()
				.filter(line -> line.getLineType() == ProposalLineType.LABOR).map(this::toLineRes).toList();
		List<InvoiceProposalLineRes> expense = lines.stream()
				.filter(line -> line.getLineType() == ProposalLineType.EXPENSE).map(this::toLineRes).toList();
		return new InvoiceProposalRes(proposal.getId(), proposal.getProposalCode(), proposal.getProjectId(),
				proposal.getContractId(), proposal.getCustomerId(), proposal.getPeriodFrom(), proposal.getPeriodTo(),
				proposal.getStatus().name(), proposal.getLaborAmount(), proposal.getExpenseAmount(),
				proposal.getTotalAmount(), proposal.getNote(), labor, expense, skipped, proposal.getCreatedBy(),
				proposal.getCreatedAt());
	}

	private InvoiceProposalLineRes toLineRes(InvoiceProposalLine line) {
		return new InvoiceProposalLineRes(line.getId(), line.getLineType().name(), line.getTimeEntryId(),
				line.getProjectExpenseId(), line.getLineDate(), line.getUserId(), line.getHours(),
				line.getUnitRate(), line.getDescription(), line.getAmount());
	}

	private void validatePeriod(InvoiceProposalCreateReq request) {
		if (request == null || request.periodFrom() == null || request.periodTo() == null) {
			throw new BusinessRuleException(ErrorCode.VALIDATION_ERROR, "Thieu ngay bat dau hoac ngay ket thuc ky");
		}
		if (request.periodFrom().isAfter(request.periodTo())) {
			throw new BusinessRuleException(ErrorCode.VALIDATION_ERROR,
					"Ngay bat dau ky (" + request.periodFrom() + ") khong duoc sau ngay ket thuc ky ("
							+ request.periodTo() + ")");
		}
	}

	private BigDecimal sum(List<InvoiceProposalLine> lines) {
		return lines.stream().map(InvoiceProposalLine::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add)
				.setScale(2, RoundingMode.HALF_UP);
	}

	private String describe(InvoiceProposalSkippedRes skipped) {
		return skipped.notApprovedCount() + " chua duyet, " + skipped.nonBillableCount() + " khong tinh phi, "
				+ skipped.alreadyProposedCount() + " da nam trong de nghi truoc, " + skipped.missingRateCount()
				+ " chua co don gia";
	}

	/** IP-yyyyMMdd-XXXXXX; cot proposal_code co UNIQUE nen trung ngau nhien (rat hiem) van bi chan o DB. */
	private String generateProposalCode(LocalDate date) {
		String suffix = UUID.randomUUID().toString().replace("-", "").substring(0, 6).toUpperCase();
		return "IP-" + CODE_DATE.format(date) + "-" + suffix;
	}

	private String truncate(String value, int max) {
		return value.length() <= max ? value : value.substring(0, max);
	}

	private String blankToNull(String value) {
		return value == null || value.isBlank() ? null : value.trim();
	}

	private String currentUsername() {
		Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
		return authentication == null ? null : authentication.getName();
	}
}
