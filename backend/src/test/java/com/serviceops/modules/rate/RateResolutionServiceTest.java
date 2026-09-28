package com.serviceops.modules.rate;

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
import com.serviceops.modules.rate.service.WorkTypeRateService;
import com.serviceops.modules.rate.service.impl.RateResolutionServiceImpl;
import com.serviceops.modules.timesheet.entity.TimeEntry;
import com.serviceops.modules.timesheet.enums.WorkType;
import com.serviceops.modules.timesheet.repository.TimeEntryRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RateResolutionServiceTest {

	@Mock
	private TimeEntryRepository timeEntryRepository;

	@Mock
	private TaskRepository taskRepository;

	@Mock
	private ProjectRepository projectRepository;

	@Mock
	private EmployeeRepository employeeRepository;

	@Mock
	private ContractBillRateService contractBillRateService;

	@Mock
	private WorkTypeRateService workTypeRateService;

	@InjectMocks
	private RateResolutionServiceImpl service;

	private TimeEntry entry(Long id, Long taskId, Long userId, LocalDate workDate, BigDecimal hours) {
		return entry(id, taskId, userId, workDate, hours, WorkType.NORMAL);
	}

	private TimeEntry entry(Long id, Long taskId, Long userId, LocalDate workDate, BigDecimal hours, WorkType workType) {
		TimeEntry e = new TimeEntry();
		e.setId(id);
		e.setTaskId(taskId);
		e.setUserId(userId);
		e.setWorkDate(workDate);
		e.setHours(hours);
		e.setWorkType(workType);
		return e;
	}

	private Task task(Long id, Long projectId) {
		Task t = new Task();
		t.setId(id);
		t.setProjectId(projectId);
		return t;
	}

	private Project project(Long id, Long contractId) {
		Project p = new Project();
		p.setId(id);
		p.setContractId(contractId);
		return p;
	}

	private Employee employee(String role) {
		Employee emp = new Employee();
		emp.setProfessionalRole(role);
		return emp;
	}

	private Employee employee(String role, String level) {
		Employee emp = employee(role);
		emp.setLevel(level);
		return emp;
	}

	@Test
	@DisplayName("TC-01: Tra dung don gia (uu tien hop dong) tai ngay cong cua dong gio cong")
	void resolvesRateForTimeEntry() {
		when(timeEntryRepository.findById(100L))
				.thenReturn(Optional.of(entry(100L, 5L, 7L, LocalDate.of(2026, 6, 30), new BigDecimal("8.00"))));
		when(taskRepository.findById(5L)).thenReturn(Optional.of(task(5L, 2L)));
		when(projectRepository.findById(2L)).thenReturn(Optional.of(project(2L, 1L)));
		when(employeeRepository.findByUser_Id(7L)).thenReturn(Optional.of(employee("Lập trình viên")));

		ResolvedContractBillRateRes resolved = new ResolvedContractBillRateRes(
				new BigDecimal("3000000"), LocalDate.of(2026, 1, 1), true);
		when(contractBillRateService.resolve(1L, "Lập trình viên", "Cao cấp", LocalDate.of(2026, 6, 30)))
				.thenReturn(resolved);
		when(workTypeRateService.resolveFactor(WorkType.NORMAL)).thenReturn(new BigDecimal("1.00"));

		ResolvedRateRes result = service.resolveForTimeEntry(100L, new RateLookupReq("Cao cấp"));

		assertThat(result.timeEntryId()).isEqualTo(100L);
		assertThat(result.taskId()).isEqualTo(5L);
		assertThat(result.projectId()).isEqualTo(2L);
		assertThat(result.contractId()).isEqualTo(1L);
		assertThat(result.professionalRole()).isEqualTo("Lập trình viên");
		assertThat(result.level()).isEqualTo("Cao cấp");
		assertThat(result.workDate()).isEqualTo(LocalDate.of(2026, 6, 30));
		assertThat(result.workType()).isEqualTo(WorkType.NORMAL);
		assertThat(result.dailyRate()).isEqualByComparingTo("3000000");
		assertThat(result.effectiveFrom()).isEqualTo(LocalDate.of(2026, 1, 1));
		assertThat(result.isContractSpecific()).isTrue();
		assertThat(result.rateFactor()).isEqualByComparingTo("1.00");
		assertThat(result.appliedDailyRate()).isEqualByComparingTo("3000000.00");
	}

	@Test
	@DisplayName("NCL-07-CN-006: Nhan he so theo loai hinh cong viec vao don gia da tra")
	void appliesWorkTypeFactorToResolvedRate() {
		when(timeEntryRepository.findById(101L))
				.thenReturn(Optional.of(entry(101L, 5L, 7L, LocalDate.of(2026, 6, 30), new BigDecimal("4.00"), WorkType.OVERTIME)));
		when(taskRepository.findById(5L)).thenReturn(Optional.of(task(5L, 2L)));
		when(projectRepository.findById(2L)).thenReturn(Optional.of(project(2L, 1L)));
		when(employeeRepository.findByUser_Id(7L)).thenReturn(Optional.of(employee("Lập trình viên")));

		ResolvedContractBillRateRes resolved = new ResolvedContractBillRateRes(
				new BigDecimal("1000000"), LocalDate.of(2026, 1, 1), false);
		when(contractBillRateService.resolve(1L, "Lập trình viên", "Cao cấp", LocalDate.of(2026, 6, 30)))
				.thenReturn(resolved);
		when(workTypeRateService.resolveFactor(WorkType.OVERTIME)).thenReturn(new BigDecimal("1.50"));

		ResolvedRateRes result = service.resolveForTimeEntry(101L, new RateLookupReq("Cao cấp"));

		assertThat(result.workType()).isEqualTo(WorkType.OVERTIME);
		assertThat(result.rateFactor()).isEqualByComparingTo("1.50");
		assertThat(result.appliedDailyRate()).isEqualByComparingTo("1500000.00");
	}

	@Test
	@DisplayName("Khong tim thay dong gio cong thi bao RESOURCE_NOT_FOUND")
	void rejectsUnknownTimeEntry() {
		when(timeEntryRepository.findById(999L)).thenReturn(Optional.empty());

		assertThatThrownBy(() -> service.resolveForTimeEntry(999L, new RateLookupReq("Cao cấp")))
				.isInstanceOf(BusinessRuleException.class)
				.extracting(e -> ((BusinessRuleException) e).getErrorCode())
				.isEqualTo(ErrorCode.RESOURCE_NOT_FOUND);
	}

	@Test
	@DisplayName("Khong tim thay ho so nhan su thi bao RESOURCE_NOT_FOUND")
	void rejectsWhenEmployeeProfileMissing() {
		when(timeEntryRepository.findById(100L))
				.thenReturn(Optional.of(entry(100L, 5L, 7L, LocalDate.of(2026, 6, 30), new BigDecimal("8.00"))));
		when(taskRepository.findById(5L)).thenReturn(Optional.of(task(5L, 2L)));
		when(projectRepository.findById(2L)).thenReturn(Optional.of(project(2L, 1L)));
		when(employeeRepository.findByUser_Id(7L)).thenReturn(Optional.empty());

		assertThatThrownBy(() -> service.resolveForTimeEntry(100L, new RateLookupReq("Cao cấp")))
				.isInstanceOf(BusinessRuleException.class)
				.extracting(e -> ((BusinessRuleException) e).getErrorCode())
				.isEqualTo(ErrorCode.RESOURCE_NOT_FOUND);
	}

	@Test
	@DisplayName("Thieu level thi bao VALIDATION_ERROR")
	void rejectsBlankLevel() {
		assertThatThrownBy(() -> service.resolveForTimeEntry(100L, new RateLookupReq("  ")))
				.isInstanceOf(BusinessRuleException.class)
				.extracting(e -> ((BusinessRuleException) e).getErrorCode())
				.isEqualTo(ErrorCode.VALIDATION_ERROR);
	}

	@Test
	@DisplayName("Chua co don gia (chung lan rieng) hieu luc truoc asOf thi bao RESOURCE_NOT_FOUND")
	void propagatesNotFoundWhenNoRateEffective() {
		when(timeEntryRepository.findById(100L))
				.thenReturn(Optional.of(entry(100L, 5L, 7L, LocalDate.of(2020, 1, 1), new BigDecimal("8.00"))));
		when(taskRepository.findById(5L)).thenReturn(Optional.of(task(5L, 2L)));
		when(projectRepository.findById(2L)).thenReturn(Optional.of(project(2L, 1L)));
		when(employeeRepository.findByUser_Id(7L)).thenReturn(Optional.of(employee("Lập trình viên")));
		when(contractBillRateService.resolve(1L, "Lập trình viên", "Cao cấp", LocalDate.of(2020, 1, 1)))
				.thenThrow(new BusinessRuleException(ErrorCode.RESOURCE_NOT_FOUND, "Khong tim thay don gia"));

		assertThatThrownBy(() -> service.resolveForTimeEntry(100L, new RateLookupReq("Cao cấp")))
				.isInstanceOf(BusinessRuleException.class)
				.extracting(e -> ((BusinessRuleException) e).getErrorCode())
				.isEqualTo(ErrorCode.RESOURCE_NOT_FOUND);
	}

	@Test
	@DisplayName("NCL-09-CN-002: Tu dong tra don gia tu Employee.level, khong can Frontend nhap tay")
	void resolvesRateAutomaticallyFromEmployeeLevel() {
		when(timeEntryRepository.findById(100L))
				.thenReturn(Optional.of(entry(100L, 5L, 7L, LocalDate.of(2026, 6, 30), new BigDecimal("8.00"))));
		when(taskRepository.findById(5L)).thenReturn(Optional.of(task(5L, 2L)));
		when(projectRepository.findById(2L)).thenReturn(Optional.of(project(2L, 1L)));
		when(employeeRepository.findByUser_Id(7L)).thenReturn(Optional.of(employee("Lập trình viên", "Cao cấp")));

		ResolvedContractBillRateRes resolved = new ResolvedContractBillRateRes(
				new BigDecimal("3000000"), LocalDate.of(2026, 1, 1), true);
		when(contractBillRateService.resolve(1L, "Lập trình viên", "Cao cấp", LocalDate.of(2026, 6, 30)))
				.thenReturn(resolved);
		when(workTypeRateService.resolveFactor(WorkType.NORMAL)).thenReturn(new BigDecimal("1.00"));

		ResolvedRateRes result = service.resolveForTimeEntry(100L);

		assertThat(result.level()).isEqualTo("Cao cấp");
		assertThat(result.appliedDailyRate()).isEqualByComparingTo("3000000.00");
	}

	@Test
	@DisplayName("NCL-09-CN-002: Nhan su chua khai bao cap bac thi bao VALIDATION_ERROR")
	void rejectsAutoResolveWhenEmployeeLevelMissing() {
		when(timeEntryRepository.findById(100L))
				.thenReturn(Optional.of(entry(100L, 5L, 7L, LocalDate.of(2026, 6, 30), new BigDecimal("8.00"))));
		when(taskRepository.findById(5L)).thenReturn(Optional.of(task(5L, 2L)));
		when(projectRepository.findById(2L)).thenReturn(Optional.of(project(2L, 1L)));
		when(employeeRepository.findByUser_Id(7L)).thenReturn(Optional.of(employee("Lập trình viên", null)));

		assertThatThrownBy(() -> service.resolveForTimeEntry(100L))
				.isInstanceOf(BusinessRuleException.class)
				.extracting(e -> ((BusinessRuleException) e).getErrorCode())
				.isEqualTo(ErrorCode.VALIDATION_ERROR);
	}

	@Test
	@DisplayName("NCL-09-CN-002: Khong tim thay dong gio cong khi tu dong tra don gia thi bao RESOURCE_NOT_FOUND")
	void rejectsAutoResolveForUnknownTimeEntry() {
		when(timeEntryRepository.findById(999L)).thenReturn(Optional.empty());

		assertThatThrownBy(() -> service.resolveForTimeEntry(999L))
				.isInstanceOf(BusinessRuleException.class)
				.extracting(e -> ((BusinessRuleException) e).getErrorCode())
				.isEqualTo(ErrorCode.RESOURCE_NOT_FOUND);
	}
}
