package com.serviceops.modules.profitability.service.impl;

import com.serviceops.common.audit.SensitiveAccessLogger;
import com.serviceops.common.audit.enums.SensitiveDataType;
import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import com.serviceops.modules.customer.entity.Customer;
import com.serviceops.modules.customer.repository.CustomerRepository;
import com.serviceops.modules.identity.employee.entity.Employee;
import com.serviceops.modules.identity.employee.repository.EmployeeRepository;
import com.serviceops.modules.profitability.dto.request.ProfitQueryReq;
import com.serviceops.modules.profitability.dto.response.CustomerMarginLineRes;
import com.serviceops.modules.profitability.dto.response.EmployeeMarginLineRes;
import com.serviceops.modules.profitability.dto.response.MarginByCustomerRes;
import com.serviceops.modules.profitability.dto.response.MarginByEmployeeRes;
import com.serviceops.modules.profitability.service.MarginReportService;
import com.serviceops.modules.project.entity.Project;
import com.serviceops.modules.project.entity.Task;
import com.serviceops.modules.project.repository.ProjectRepository;
import com.serviceops.modules.project.repository.TaskRepository;
import com.serviceops.modules.timesheet.entity.TimeEntry;
import com.serviceops.modules.timesheet.enums.TimeEntryStatus;
import com.serviceops.modules.timesheet.repository.TimeEntryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * NCL-09-CN-005 — Báo cáo biên lợi nhuận theo khách hàng và theo nhân sự.
 *
 * <p>Gộp từ các dòng giờ công ĐÃ DUYỆT ({@link TimeEntryStatus#APPROVED}, QTN-10 — bất biến, đáng
 * tin cậy) có ngày làm việc trong kỳ chọn, giá vốn (QTN-17) và doanh thu (QTN-15/QTN-16) của từng dòng
 * được tính bởi {@link EntryMarginCalculator} — dùng chung với NCL-09-CN-006 để hai báo cáo không lệch
 * công thức nhau.</p>
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class MarginReportServiceImpl implements MarginReportService {

	private final TimeEntryRepository timeEntryRepository;
	private final TaskRepository taskRepository;
	private final ProjectRepository projectRepository;
	private final CustomerRepository customerRepository;
	private final EmployeeRepository employeeRepository;
	private final EntryMarginCalculator entryMarginCalculator;
	private final SensitiveAccessLogger sensitiveAccessLogger;

	@Override
	public MarginByCustomerRes marginByCustomer(ProfitQueryReq period) {
		LocalDate from = requireFrom(period);
		LocalDate to = requireTo(period);

		ComputationResult result = compute(from, to);

		Map<Long, CustomerAccumulator> byCustomer = new LinkedHashMap<>();
		for (EntryMargin entry : result.entries()) {
			byCustomer.computeIfAbsent(entry.customerId(),
					id -> new CustomerAccumulator(entry.customerId(), entry.customerCode(), entry.customerName()))
					.add(entry.hours(), entry.revenue(), entry.cost());
		}

		List<CustomerMarginLineRes> lines = byCustomer.values().stream()
				.map(CustomerAccumulator::toLine)
				.sorted(Comparator.comparing(CustomerMarginLineRes::revenue).reversed())
				.toList();

		BigDecimal totalRevenue = sum(lines, CustomerMarginLineRes::revenue);
		BigDecimal totalCost = sum(lines, CustomerMarginLineRes::cost);
		BigDecimal totalMargin = totalRevenue.subtract(totalCost);

		sensitiveAccessLogger.logView(SensitiveDataType.MARGIN, null, "MarginByCustomer",
				"Xem bao cao bien loi nhuan theo khach hang ky " + from + " - " + to);

		return new MarginByCustomerRes(from, to, totalRevenue, totalCost, totalMargin,
				marginPercent(totalMargin, totalRevenue), lines,
				result.missingCostEntryCount(), result.missingRevenueEntryCount());
	}

	@Override
	public MarginByEmployeeRes marginByEmployee(ProfitQueryReq period) {
		LocalDate from = requireFrom(period);
		LocalDate to = requireTo(period);

		ComputationResult result = compute(from, to);

		Map<Long, EmployeeAccumulator> byEmployee = new LinkedHashMap<>();
		for (EntryMargin entry : result.entries()) {
			byEmployee.computeIfAbsent(entry.employeeId(),
					id -> new EmployeeAccumulator(entry.employeeId(), entry.employeeName(), entry.professionalRole()))
					.add(entry.hours(), entry.revenue(), entry.cost());
		}

		List<EmployeeMarginLineRes> lines = byEmployee.values().stream()
				.map(EmployeeAccumulator::toLine)
				.sorted(Comparator.comparing(EmployeeMarginLineRes::revenue).reversed())
				.toList();

		BigDecimal totalRevenue = sum(lines, EmployeeMarginLineRes::revenue);
		BigDecimal totalCost = sum(lines, EmployeeMarginLineRes::cost);
		BigDecimal totalMargin = totalRevenue.subtract(totalCost);

		sensitiveAccessLogger.logView(SensitiveDataType.MARGIN, null, "MarginByEmployee",
				"Xem bao cao bien loi nhuan theo nhan su ky " + from + " - " + to);

		return new MarginByEmployeeRes(from, to, totalRevenue, totalCost, totalMargin,
				marginPercent(totalMargin, totalRevenue), lines,
				result.missingCostEntryCount(), result.missingRevenueEntryCount());
	}

	/** Tra cuu don gia/gia von cho tung dong gio cong DA DUYET trong ky, mot lan dung chung cho ca hai chieu bao cao. */
	private ComputationResult compute(LocalDate from, LocalDate to) {
		List<TimeEntry> entries = timeEntryRepository
				.findByStatusAndWorkDateBetweenOrderByWorkDateAscIdAsc(TimeEntryStatus.APPROVED, from, to);
		if (entries.isEmpty()) {
			return new ComputationResult(List.of(), 0, 0);
		}

		Map<Long, Task> tasksById = taskRepository
				.findAllById(entries.stream().map(TimeEntry::getTaskId).distinct().toList()).stream()
				.collect(Collectors.toMap(Task::getId, Function.identity()));

		Map<Long, Project> projectsById = projectRepository
				.findAllById(tasksById.values().stream().map(Task::getProjectId).distinct().toList()).stream()
				.collect(Collectors.toMap(Project::getId, Function.identity()));

		Map<Long, Customer> customersById = customerRepository
				.findAllById(projectsById.values().stream().map(Project::getCustomerId).distinct().toList()).stream()
				.collect(Collectors.toMap(Customer::getId, Function.identity()));

		Map<Long, Employee> employeesByUserId = employeeRepository
				.findByUser_IdIn(entries.stream().map(TimeEntry::getUserId).distinct().toList()).stream()
				.collect(Collectors.toMap(employee -> employee.getUser().getId(), Function.identity()));

		List<EntryMargin> lines = new ArrayList<>();
		int missingCost = 0;
		int missingRevenue = 0;

		for (TimeEntry entry : entries) {
			Task task = tasksById.get(entry.getTaskId());
			if (task == null) {
				throw new BusinessRuleException(ErrorCode.RESOURCE_NOT_FOUND,
						"Khong tim thay cong viec voi ID: " + entry.getTaskId());
			}
			Project project = projectsById.get(task.getProjectId());
			if (project == null) {
				throw new BusinessRuleException(ErrorCode.RESOURCE_NOT_FOUND,
						"Khong tim thay du an voi ID: " + task.getProjectId());
			}
			Customer customer = customersById.get(project.getCustomerId());
			if (customer == null) {
				throw new BusinessRuleException(ErrorCode.RESOURCE_NOT_FOUND,
						"Khong tim thay khach hang voi ID: " + project.getCustomerId());
			}
			Employee employee = employeesByUserId.get(entry.getUserId());
			if (employee == null) {
				throw new BusinessRuleException(ErrorCode.RESOURCE_NOT_FOUND,
						"Khong tim thay ho so nhan su cua dong gio cong voi ID: " + entry.getId());
			}

			EntryMarginCalculator.Result resolved = entryMarginCalculator.resolve(entry, employee, project.getContractId());
			if (resolved.missingCost()) {
				missingCost++;
			}
			if (resolved.missingRevenue()) {
				missingRevenue++;
			}

			lines.add(new EntryMargin(customer.getId(), customer.getCode(), customer.getName(),
					employee.getId(), employee.getUser().getFullName(), employee.getProfessionalRole(),
					entry.getHours(), resolved.revenue(), resolved.cost()));
		}

		return new ComputationResult(lines, missingCost, missingRevenue);
	}

	private static LocalDate requireFrom(ProfitQueryReq period) {
		if (period == null || period.from() == null) {
			throw new BusinessRuleException(ErrorCode.VALIDATION_ERROR, "Ngay bat dau ky bao cao khong duoc de trong");
		}
		if (period.to() != null && period.from().isAfter(period.to())) {
			throw new BusinessRuleException(ErrorCode.VALIDATION_ERROR,
					"Ngay bat dau khong duoc sau ngay ket thuc ky bao cao");
		}
		return period.from();
	}

	private static LocalDate requireTo(ProfitQueryReq period) {
		if (period == null || period.to() == null) {
			throw new BusinessRuleException(ErrorCode.VALIDATION_ERROR, "Ngay ket thuc ky bao cao khong duoc de trong");
		}
		return period.to();
	}

	private static <T> BigDecimal sum(List<T> lines, Function<T, BigDecimal> extractor) {
		return lines.stream().map(extractor).reduce(BigDecimal.ZERO, BigDecimal::add);
	}

	/** Null khi doanh thu bang 0 (khong the tinh %) — thay vi chia cho 0. */
	private static BigDecimal marginPercent(BigDecimal margin, BigDecimal revenue) {
		if (revenue.compareTo(BigDecimal.ZERO) == 0) {
			return null;
		}
		return margin.multiply(new BigDecimal("100")).divide(revenue, 2, RoundingMode.HALF_UP);
	}

	private record EntryMargin(Long customerId, String customerCode, String customerName,
								Long employeeId, String employeeName, String professionalRole,
								BigDecimal hours, BigDecimal revenue, BigDecimal cost) {
	}

	private record ComputationResult(List<EntryMargin> entries, int missingCostEntryCount, int missingRevenueEntryCount) {
	}

	private static final class CustomerAccumulator {
		private final Long customerId;
		private final String customerCode;
		private final String customerName;
		private BigDecimal hours = BigDecimal.ZERO;
		private BigDecimal revenue = BigDecimal.ZERO;
		private BigDecimal cost = BigDecimal.ZERO;

		private CustomerAccumulator(Long customerId, String customerCode, String customerName) {
			this.customerId = customerId;
			this.customerCode = customerCode;
			this.customerName = customerName;
		}

		void add(BigDecimal h, BigDecimal r, BigDecimal c) {
			hours = hours.add(h);
			revenue = revenue.add(r);
			cost = cost.add(c);
		}

		CustomerMarginLineRes toLine() {
			BigDecimal margin = revenue.subtract(cost);
			return new CustomerMarginLineRes(customerId, customerCode, customerName, hours, revenue, cost, margin,
					marginPercent(margin, revenue));
		}
	}

	private static final class EmployeeAccumulator {
		private final Long employeeId;
		private final String employeeName;
		private final String professionalRole;
		private BigDecimal hours = BigDecimal.ZERO;
		private BigDecimal revenue = BigDecimal.ZERO;
		private BigDecimal cost = BigDecimal.ZERO;

		private EmployeeAccumulator(Long employeeId, String employeeName, String professionalRole) {
			this.employeeId = employeeId;
			this.employeeName = employeeName;
			this.professionalRole = professionalRole;
		}

		void add(BigDecimal h, BigDecimal r, BigDecimal c) {
			hours = hours.add(h);
			revenue = revenue.add(r);
			cost = cost.add(c);
		}

		EmployeeMarginLineRes toLine() {
			BigDecimal margin = revenue.subtract(cost);
			return new EmployeeMarginLineRes(employeeId, employeeName, professionalRole, hours, revenue, cost, margin,
					marginPercent(margin, revenue));
		}
	}
}
