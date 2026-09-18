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
import com.serviceops.modules.rate.dto.response.ResolvedContractBillRateRes;
import com.serviceops.modules.rate.dto.response.ResolvedEmployeeHourlyRateRes;
import com.serviceops.modules.rate.service.ContractBillRateService;
import com.serviceops.modules.rate.service.EmployeeHourlyRateService;
import com.serviceops.modules.rate.service.WorkTypeRateService;
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
 * tin cậy) có ngày làm việc trong kỳ chọn:</p>
 * <ul>
 *   <li><b>Giá vốn</b> (mọi dòng, kể cả không tính phí — QTN-17): giờ × chi phí giờ công của nhân sự
 *       hiệu lực tại ngày làm việc ({@link EmployeeHourlyRateService#resolve}).</li>
 *   <li><b>Doanh thu</b> (chỉ dòng {@code billable = true} — NCL-09-CN-002-TC-03): giờ × đơn giá bán
 *       hiệu lực tại ngày làm việc, ưu tiên đơn giá riêng hợp đồng rồi mới đến bảng giá chung
 *       (QTN-15/QTN-16, qua {@link ContractBillRateService#resolve}), nhân hệ số loại hình công việc
 *       (NCL-07-CN-006, qua {@link WorkTypeRateService#resolveFactor}).</li>
 * </ul>
 *
 * <p><b>Giới hạn đã biết:</b> {@code BillRate}/{@code ContractBillRate} định giá theo cặp
 * (vai trò, cấp bậc) nhưng hồ sơ nhân sự ({@code Employee}) hiện chỉ lưu vai trò chuyên môn, chưa có
 * cột cấp bậc (xem {@code RateLookupReq}). Báo cáo theo lô này dùng cấp bậc mặc định
 * {@link #DEFAULT_LEVEL} — đúng bằng giá trị backfill của migration {@code V64} — cho tới khi hồ sơ
 * nhân sự có cột cấp bậc riêng; dòng nào không tra được đơn giá ở cấp bậc này bị loại khỏi doanh thu
 * và được đếm vào {@code missingRevenueEntryCount} thay vì làm hỏng cả báo cáo.</p>
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class MarginReportServiceImpl implements MarginReportService {

	/** Trùng giá trị backfill của migration V64__add_level_to_bill_rates.sql. */
	private static final String DEFAULT_LEVEL = "Chưa phân loại";

	/** 40 giờ chuẩn/tuần (QTN-23) chia 5 ngày làm việc — quy đổi đơn giá theo ngày sang theo giờ. */
	private static final BigDecimal STANDARD_HOURS_PER_DAY = new BigDecimal("8");

	private final TimeEntryRepository timeEntryRepository;
	private final TaskRepository taskRepository;
	private final ProjectRepository projectRepository;
	private final CustomerRepository customerRepository;
	private final EmployeeRepository employeeRepository;
	private final EmployeeHourlyRateService employeeHourlyRateService;
	private final ContractBillRateService contractBillRateService;
	private final WorkTypeRateService workTypeRateService;
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

			ResolvedEmployeeHourlyRateRes costResolved =
					employeeHourlyRateService.resolve(employee.getId(), entry.getWorkDate());
			BigDecimal cost;
			if (costResolved.missingCostData()) {
				missingCost++;
				cost = BigDecimal.ZERO;
			} else {
				cost = entry.getHours().multiply(costResolved.hourlyRate()).setScale(2, RoundingMode.HALF_UP);
			}

			BigDecimal revenue = BigDecimal.ZERO;
			if (Boolean.TRUE.equals(entry.getBillable())) {
				String role = employee.getProfessionalRole() == null ? "" : employee.getProfessionalRole().trim();
				if (role.isBlank()) {
					missingRevenue++;
				} else {
					try {
						ResolvedContractBillRateRes billRate = contractBillRateService.resolve(
								project.getContractId(), role, DEFAULT_LEVEL, entry.getWorkDate());
						BigDecimal factor = workTypeRateService.resolveFactor(entry.getWorkType());
						BigDecimal hourlyRevenueRate = billRate.dailyRate().multiply(factor)
								.divide(STANDARD_HOURS_PER_DAY, 4, RoundingMode.HALF_UP);
						revenue = entry.getHours().multiply(hourlyRevenueRate).setScale(2, RoundingMode.HALF_UP);
					} catch (BusinessRuleException missingRate) {
						// Chua khai bao don gia ban / he so loai hinh cong viec o cap bac mac dinh —
						// loai dong nay khoi doanh thu thay vi lam hong ca bao cao (van tinh vao gia von o tren).
						missingRevenue++;
					}
				}
			}

			lines.add(new EntryMargin(customer.getId(), customer.getCode(), customer.getName(),
					employee.getId(), employee.getUser().getFullName(), employee.getProfessionalRole(),
					entry.getHours(), revenue, cost));
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
