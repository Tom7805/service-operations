package com.serviceops.modules.rate.service.impl;

import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import com.serviceops.modules.identity.employee.entity.Employee;
import com.serviceops.modules.identity.employee.repository.EmployeeRepository;
import com.serviceops.modules.project.entity.Project;
import com.serviceops.modules.project.entity.Task;
import com.serviceops.modules.project.repository.ProjectRepository;
import com.serviceops.modules.project.repository.TaskRepository;
import com.serviceops.modules.rate.dto.request.RateLookupReq;
import com.serviceops.modules.rate.dto.response.ResolvedContractBillRateRes;
import com.serviceops.modules.rate.dto.response.ResolvedRateRes;
import com.serviceops.modules.rate.service.ContractBillRateService;
import com.serviceops.modules.rate.service.RateResolutionService;
import com.serviceops.modules.rate.service.WorkTypeRateService;
import com.serviceops.modules.timesheet.entity.TimeEntry;
import com.serviceops.modules.timesheet.repository.TimeEntryRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.RoundingMode;

@Service
@Transactional(readOnly = true)
public class RateResolutionServiceImpl implements RateResolutionService {

	private final TimeEntryRepository timeEntryRepository;
	private final TaskRepository taskRepository;
	private final ProjectRepository projectRepository;
	private final EmployeeRepository employeeRepository;
	private final ContractBillRateService contractBillRateService;
	private final WorkTypeRateService workTypeRateService;

	public RateResolutionServiceImpl(TimeEntryRepository timeEntryRepository,
									  TaskRepository taskRepository,
									  ProjectRepository projectRepository,
									  EmployeeRepository employeeRepository,
									  ContractBillRateService contractBillRateService,
									  WorkTypeRateService workTypeRateService) {
		this.timeEntryRepository = timeEntryRepository;
		this.taskRepository = taskRepository;
		this.projectRepository = projectRepository;
		this.employeeRepository = employeeRepository;
		this.contractBillRateService = contractBillRateService;
		this.workTypeRateService = workTypeRateService;
	}

	@Override
	public ResolvedRateRes resolveForTimeEntry(Long timeEntryId, RateLookupReq request) {
		if (timeEntryId == null) {
			throw new BusinessRuleException(ErrorCode.VALIDATION_ERROR, "Thieu ID dong gio cong");
		}

		String level = request == null || request.level() == null ? "" : request.level().trim();
		if (level.isBlank()) {
			throw new BusinessRuleException(ErrorCode.VALIDATION_ERROR, "Cap bac khong duoc de trong");
		}

		TimeEntry entry = findEntry(timeEntryId);
		Task task = findTask(entry.getTaskId());
		Project project = findProject(task.getProjectId());
		Employee employee = findEmployee(entry.getUserId());
		String role = requireRole(employee);

		return resolve(entry, task, project, role, level);
	}

	@Override
	public ResolvedRateRes resolveForTimeEntry(Long timeEntryId) {
		if (timeEntryId == null) {
			throw new BusinessRuleException(ErrorCode.VALIDATION_ERROR, "Thieu ID dong gio cong");
		}

		TimeEntry entry = findEntry(timeEntryId);
		Task task = findTask(entry.getTaskId());
		Project project = findProject(task.getProjectId());
		Employee employee = findEmployee(entry.getUserId());
		String role = requireRole(employee);

		String level = employee.getLevel() == null ? "" : employee.getLevel().trim();
		if (level.isBlank()) {
			throw new BusinessRuleException(ErrorCode.VALIDATION_ERROR,
					"Nhan su thuc hien dong gio cong nay chua duoc khai bao cap bac trong ho so nhan su");
		}

		return resolve(entry, task, project, role, level);
	}

	private TimeEntry findEntry(Long timeEntryId) {
		return timeEntryRepository.findById(timeEntryId)
				.orElseThrow(() -> new BusinessRuleException(ErrorCode.RESOURCE_NOT_FOUND,
						"Khong tim thay dong gio cong voi ID: " + timeEntryId));
	}

	private Task findTask(Long taskId) {
		return taskRepository.findById(taskId)
				.orElseThrow(() -> new BusinessRuleException(ErrorCode.RESOURCE_NOT_FOUND,
						"Khong tim thay cong viec voi ID: " + taskId));
	}

	private Project findProject(Long projectId) {
		return projectRepository.findById(projectId)
				.orElseThrow(() -> new BusinessRuleException(ErrorCode.RESOURCE_NOT_FOUND,
						"Khong tim thay du an voi ID: " + projectId));
	}

	private Employee findEmployee(Long userId) {
		return employeeRepository.findByUser_Id(userId)
				.orElseThrow(() -> new BusinessRuleException(ErrorCode.RESOURCE_NOT_FOUND,
						"Khong tim thay ho so nhan su cua nguoi thuc hien dong gio cong nay"));
	}

	private String requireRole(Employee employee) {
		String role = employee.getProfessionalRole() == null ? "" : employee.getProfessionalRole().trim();
		if (role.isBlank()) {
			throw new BusinessRuleException(ErrorCode.VALIDATION_ERROR,
					"Nhan su thuc hien dong gio cong nay chua duoc khai bao vai tro chuyen mon");
		}
		return role;
	}

	/** Buoc chung cuoi cung: QTN-16 (uu tien don gia hop dong) roi nhan he so NCL-07-CN-006. */
	private ResolvedRateRes resolve(TimeEntry entry, Task task, Project project, String role, String level) {
		// QTN-16: uy quyen cho luong tra cuu da co san (uu tien don gia hop dong,
		// khong co thi roi ve don gia chung cong ty) — dung ngay cong lam moc hieu luc.
		ResolvedContractBillRateRes resolved = contractBillRateService.resolve(
				project.getContractId(), role, level, entry.getWorkDate());

		// NCL-07-CN-006: nhan them he so theo loai hinh cong viec cua chinh dong gio cong nay
		// de ra don gia cuoi cung dung tinh doanh thu.
		java.math.BigDecimal factor = workTypeRateService.resolveFactor(entry.getWorkType());
		java.math.BigDecimal appliedDailyRate = resolved.dailyRate().multiply(factor)
				.setScale(2, RoundingMode.HALF_UP);

		return new ResolvedRateRes(entry.getId(), task.getId(), project.getId(), project.getContractId(),
				role, level, entry.getWorkDate(), entry.getHours(), entry.getWorkType(),
				resolved.dailyRate(), resolved.effectiveFrom(), resolved.isContractSpecific(),
				factor, appliedDailyRate);
	}
}
