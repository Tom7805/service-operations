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
import com.serviceops.modules.timesheet.entity.TimeEntry;
import com.serviceops.modules.timesheet.repository.TimeEntryRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class RateResolutionServiceImpl implements RateResolutionService {

	private final TimeEntryRepository timeEntryRepository;
	private final TaskRepository taskRepository;
	private final ProjectRepository projectRepository;
	private final EmployeeRepository employeeRepository;
	private final ContractBillRateService contractBillRateService;

	public RateResolutionServiceImpl(TimeEntryRepository timeEntryRepository,
									  TaskRepository taskRepository,
									  ProjectRepository projectRepository,
									  EmployeeRepository employeeRepository,
									  ContractBillRateService contractBillRateService) {
		this.timeEntryRepository = timeEntryRepository;
		this.taskRepository = taskRepository;
		this.projectRepository = projectRepository;
		this.employeeRepository = employeeRepository;
		this.contractBillRateService = contractBillRateService;
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

		TimeEntry entry = timeEntryRepository.findById(timeEntryId)
				.orElseThrow(() -> new BusinessRuleException(ErrorCode.RESOURCE_NOT_FOUND,
						"Khong tim thay dong gio cong voi ID: " + timeEntryId));

		Task task = taskRepository.findById(entry.getTaskId())
				.orElseThrow(() -> new BusinessRuleException(ErrorCode.RESOURCE_NOT_FOUND,
						"Khong tim thay cong viec voi ID: " + entry.getTaskId()));

		Project project = projectRepository.findById(task.getProjectId())
				.orElseThrow(() -> new BusinessRuleException(ErrorCode.RESOURCE_NOT_FOUND,
						"Khong tim thay du an voi ID: " + task.getProjectId()));

		Employee employee = employeeRepository.findByUser_Id(entry.getUserId())
				.orElseThrow(() -> new BusinessRuleException(ErrorCode.RESOURCE_NOT_FOUND,
						"Khong tim thay ho so nhan su cua nguoi thuc hien dong gio cong nay"));

		String role = employee.getProfessionalRole() == null ? "" : employee.getProfessionalRole().trim();
		if (role.isBlank()) {
			throw new BusinessRuleException(ErrorCode.VALIDATION_ERROR,
					"Nhan su thuc hien dong gio cong nay chua duoc khai bao vai tro chuyen mon");
		}

		// QTN-16: uy quyen cho luong tra cuu da co san (uu tien don gia hop dong,
		// khong co thi roi ve don gia chung cong ty) — dung ngay cong lam moc hieu luc.
		ResolvedContractBillRateRes resolved = contractBillRateService.resolve(
				project.getContractId(), role, level, entry.getWorkDate());

		return new ResolvedRateRes(entry.getId(), task.getId(), project.getId(), project.getContractId(),
				role, level, entry.getWorkDate(), entry.getHours(),
				resolved.dailyRate(), resolved.effectiveFrom(), resolved.isContractSpecific());
	}
}
