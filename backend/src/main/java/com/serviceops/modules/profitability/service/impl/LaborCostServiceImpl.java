package com.serviceops.modules.profitability.service.impl;

import com.serviceops.common.audit.SensitiveAccessLogger;
import com.serviceops.common.audit.enums.SensitiveDataType;
import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import com.serviceops.modules.identity.employee.entity.Employee;
import com.serviceops.modules.identity.employee.repository.EmployeeRepository;
import com.serviceops.modules.project.entity.Task;
import com.serviceops.modules.project.repository.ProjectRepository;
import com.serviceops.modules.project.repository.TaskRepository;
import com.serviceops.modules.profitability.dto.response.LaborCostLineRes;
import com.serviceops.modules.profitability.dto.response.ProjectLaborCostRes;
import com.serviceops.modules.profitability.service.LaborCostService;
import com.serviceops.modules.rate.dto.response.ResolvedEmployeeHourlyRateRes;
import com.serviceops.modules.rate.service.EmployeeHourlyRateService;
import com.serviceops.modules.timesheet.entity.TimeEntry;
import com.serviceops.modules.timesheet.enums.TimeEntryStatus;
import com.serviceops.modules.timesheet.repository.TimeEntryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class LaborCostServiceImpl implements LaborCostService {

	private final ProjectRepository projectRepository;
	private final TaskRepository taskRepository;
	private final TimeEntryRepository timeEntryRepository;
	private final EmployeeRepository employeeRepository;
	private final EmployeeHourlyRateService employeeHourlyRateService;
	private final SensitiveAccessLogger sensitiveAccessLogger;

	@Override
	public ProjectLaborCostRes calculateProjectLaborCost(Long projectId) {
		if (projectId == null || projectRepository.findById(projectId).isEmpty()) {
			throw new BusinessRuleException(ErrorCode.RESOURCE_NOT_FOUND, "Khong tim thay du an voi ID: " + projectId);
		}

		List<Long> taskIds = taskRepository.findByProjectIdOrderByIdAsc(projectId).stream()
				.map(Task::getId)
				.toList();
		if (taskIds.isEmpty()) {
			sensitiveAccessLogger.logView(SensitiveDataType.COST, projectId, "ProjectLaborCost",
					"Xem gia von gio cong cua du an #" + projectId);
			return new ProjectLaborCostRes(projectId, BigDecimal.ZERO, BigDecimal.ZERO, 0, List.of());
		}

		List<TimeEntry> entries = timeEntryRepository.findByTaskIdInAndStatusOrderByWorkDateAscIdAsc(
				taskIds, TimeEntryStatus.APPROVED);
		Map<Long, Employee> employeesByUserId = employeeRepository.findAllById(
				entries.stream().map(TimeEntry::getUserId).distinct().toList()).stream()
					.collect(Collectors.toMap(employee -> employee.getUser().getId(), Function.identity()));

		BigDecimal totalHours = BigDecimal.ZERO;
		BigDecimal totalLaborCost = BigDecimal.ZERO;
		int missingCostEntryCount = 0;
		List<LaborCostLineRes> lines = new java.util.ArrayList<>();
		for (TimeEntry entry : entries) {
			totalHours = totalHours.add(entry.getHours());
			Employee employee = employeesByUserId.get(entry.getUserId());
			if (employee == null) {
				throw new BusinessRuleException(ErrorCode.RESOURCE_NOT_FOUND,
						"Khong tim thay ho so nhan su cua dong gio cong voi ID: " + entry.getId());
			}

			ResolvedEmployeeHourlyRateRes resolved = employeeHourlyRateService.resolve(employee.getId(), entry.getWorkDate());
			BigDecimal laborCost = BigDecimal.ZERO;
			if (resolved.missingCostData()) {
				missingCostEntryCount++;
			} else {
				laborCost = entry.getHours().multiply(resolved.hourlyRate());
				totalLaborCost = totalLaborCost.add(laborCost);
			}
			lines.add(new LaborCostLineRes(entry.getId(), employee.getId(), entry.getWorkDate(), entry.getHours(),
					resolved.hourlyRate(), laborCost, resolved.missingCostData()));
		}

		sensitiveAccessLogger.logView(SensitiveDataType.COST, projectId, "ProjectLaborCost",
				"Xem gia von gio cong cua du an #" + projectId);
		return new ProjectLaborCostRes(projectId, totalHours, totalLaborCost, missingCostEntryCount, lines);
	}
}
