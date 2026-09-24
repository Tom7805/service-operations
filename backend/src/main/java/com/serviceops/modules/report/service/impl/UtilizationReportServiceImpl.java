package com.serviceops.modules.report.service.impl;

import com.serviceops.common.audit.AuditTargetType;
import com.serviceops.common.audit.service.AuditLogService;
import com.serviceops.modules.identity.department.entity.Department;
import com.serviceops.modules.identity.employee.entity.Employee;
import com.serviceops.modules.identity.employee.service.HolidayCalendar;
import com.serviceops.modules.identity.employee.service.HolidayService;
import com.serviceops.modules.report.dto.request.ReportPeriodReq;
import com.serviceops.modules.report.dto.response.UtilizationByDepartmentRes;
import com.serviceops.modules.report.dto.response.UtilizationEmployeeRes;
import com.serviceops.modules.report.dto.response.UtilizationRes;
import com.serviceops.modules.report.repository.UtilizationQueryRepository;
import com.serviceops.modules.report.service.UtilizationReportService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * NCL-11-CN-002 — Báo cáo tỷ lệ giờ tính phí.
 *
 * <p>Tỷ lệ = giờ công tính phí ĐÃ DUYỆT ÷ giờ làm việc chuẩn của kỳ (QTN-23, {@link StandardHoursCalculator}), tính cho
 * từng người, từng bộ phận (chỉ nhân sự trực tiếp thuộc bộ phận) và toàn công ty. Bộ phận và toàn công ty là tổng giờ
 * tính phí ÷ tổng giờ chuẩn, không phải trung bình cộng các tỷ lệ. Báo cáo đi từ hồ sơ nhân sự nên người chưa có giờ
 * công vẫn hiện với tỷ lệ 0 (TC-03).</p>
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class UtilizationReportServiceImpl implements UtilizationReportService {

	static final String UNASSIGNED_DEPARTMENT_NAME = "Chưa gán bộ phận";

	private final UtilizationQueryRepository utilizationQueryRepository;
	private final StandardHoursCalculator standardHoursCalculator;
	private final HolidayService holidayService;
	private final AuditLogService auditLogService;

	@Override
	public UtilizationRes getReport(ReportPeriodReq period) {
		ReportPeriodReq validPeriod = ReportPeriodReq.requireValid(period);
		LocalDate from = validPeriod.from();
		LocalDate to = validPeriod.to();

		Map<Long, BigDecimal> billableByUser = utilizationQueryRepository.sumApprovedBillableHoursByUser(from, to);
		HolidayCalendar holidays = holidayService.calendarFor(from, to);

		List<UtilizationEmployeeRes> employees = new ArrayList<>();
		Map<Long, DepartmentAccumulator> byDepartment = new HashMap<>();
		Set<Long> listedUserIds = new HashSet<>();
		BigDecimal totalBillable = BigDecimal.ZERO;
		BigDecimal totalStandard = BigDecimal.ZERO;

		for (Employee employee : utilizationQueryRepository.findEmployeesEmployedBetween(from, to)) {
			Long userId = employee.getUser().getId();
			BigDecimal billable = billableByUser.getOrDefault(userId, BigDecimal.ZERO);
			BigDecimal standard = standardHoursCalculator.standardHours(employee, from, to, holidays);
			// Không làm việc ngày nào trong kỳ và không có giờ nào: không phải người "làm không hiệu quả", chỉ là không thuộc kỳ.
			if (standard.signum() == 0 && billable.signum() == 0) {
				continue;
			}

			Department department = employee.getDepartment();
			Long departmentId = department == null ? null : department.getId();
			String departmentName = department == null ? UNASSIGNED_DEPARTMENT_NAME : department.getName();

			listedUserIds.add(userId);
			totalBillable = totalBillable.add(billable);
			totalStandard = totalStandard.add(standard);
			byDepartment.computeIfAbsent(departmentId, id -> new DepartmentAccumulator(id, departmentName))
					.add(billable, standard);
			employees.add(new UtilizationEmployeeRes(employee.getId(), userId, employee.getUser().getFullName(),
					employee.getProfessionalRole(), departmentId, departmentName, billable, standard,
					ratio(billable, standard)));
		}

		BigDecimal unlistedBillable = billableByUser.entrySet().stream()
				.filter(entry -> !listedUserIds.contains(entry.getKey()))
				.map(Map.Entry::getValue)
				.reduce(BigDecimal.ZERO, BigDecimal::add);

		employees.sort(Comparator.comparing(UtilizationEmployeeRes::fullName, String.CASE_INSENSITIVE_ORDER)
				.thenComparing(UtilizationEmployeeRes::employeeId));
		List<UtilizationByDepartmentRes> departments = byDepartment.values().stream()
				.map(DepartmentAccumulator::toLine)
				.sorted(Comparator.comparing((UtilizationByDepartmentRes line) -> line.departmentId() == null)
						.thenComparing(UtilizationByDepartmentRes::departmentName, String.CASE_INSENSITIVE_ORDER))
				.toList();

		auditLogService.record("Xem báo cáo tỷ lệ giờ tính phí", AuditTargetType.GENERAL, null,
				"Báo cáo tỷ lệ giờ tính phí", "Xem báo cáo tỷ lệ giờ tính phí kỳ " + from + " - " + to);

		return new UtilizationRes(from, to, totalBillable, totalStandard, ratio(totalBillable, totalStandard),
				unlistedBillable, departments, employees);
	}

	/** Null khi giờ chuẩn bằng 0: không có năng lực để so sánh, khác với 0% của người có giờ chuẩn mà không ghi giờ nào. */
	private static BigDecimal ratio(BigDecimal billableHours, BigDecimal standardHours) {
		if (standardHours.signum() == 0) {
			return null;
		}
		return billableHours.divide(standardHours, 4, RoundingMode.HALF_UP);
	}

	private static final class DepartmentAccumulator {
		private final Long departmentId;
		private final String departmentName;
		private int employeeCount;
		private BigDecimal billableHours = BigDecimal.ZERO;
		private BigDecimal standardHours = BigDecimal.ZERO;

		private DepartmentAccumulator(Long departmentId, String departmentName) {
			this.departmentId = departmentId;
			this.departmentName = departmentName;
		}

		void add(BigDecimal billable, BigDecimal standard) {
			employeeCount++;
			billableHours = billableHours.add(billable);
			standardHours = standardHours.add(standard);
		}

		UtilizationByDepartmentRes toLine() {
			return new UtilizationByDepartmentRes(departmentId, departmentName, employeeCount, billableHours,
					standardHours, ratio(billableHours, standardHours));
		}
	}
}
