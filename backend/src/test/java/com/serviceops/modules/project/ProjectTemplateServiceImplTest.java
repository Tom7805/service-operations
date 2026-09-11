package com.serviceops.modules.project;

import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import com.serviceops.modules.contract.entity.Contract;
import com.serviceops.modules.contract.enums.ContractStatus;
import com.serviceops.modules.contract.enums.ContractType;
import com.serviceops.modules.contract.repository.ContractRepository;
import com.serviceops.modules.identity.user.entity.User;
import com.serviceops.modules.identity.user.enums.UserStatus;
import com.serviceops.modules.identity.user.repository.UserRepository;
import com.serviceops.modules.project.dto.request.ProjectCreateFromTemplateReq;
import com.serviceops.modules.project.dto.response.ProjectRes;
import com.serviceops.modules.project.entity.Project;
import com.serviceops.modules.project.entity.ProjectTemplate;
import com.serviceops.modules.project.entity.ProjectTemplateItem;
import com.serviceops.modules.project.entity.Task;
import com.serviceops.modules.project.entity.WorkPackage;
import com.serviceops.modules.project.enums.TemplateItemType;
import com.serviceops.modules.project.logging.ProjectAuditLogger;
import com.serviceops.modules.project.repository.ProjectRepository;
import com.serviceops.modules.project.repository.ProjectTemplateItemRepository;
import com.serviceops.modules.project.repository.ProjectTemplateRepository;
import com.serviceops.modules.project.repository.TaskRepository;
import com.serviceops.modules.project.repository.WorkPackageRepository;
import com.serviceops.modules.project.service.impl.ProjectTemplateServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.security.authentication.TestingAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * NCL-05-CN-007: tao du an tu mau co san cay cong viec.
 * TC-01: dung san cay cong viec va ngan sach gio theo mau.
 * TC-02: chi sao chep gia tri tu mau (mau goc khong tham chieu du an).
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class ProjectTemplateServiceImplTest {

	@Mock
	private ProjectTemplateRepository templateRepository;

	@Mock
	private ProjectTemplateItemRepository templateItemRepository;

	@Mock
	private ContractRepository contractRepository;

	@Mock
	private UserRepository userRepository;

	@Mock
	private ProjectRepository projectRepository;

	@Mock
	private WorkPackageRepository workPackageRepository;

	@Mock
	private TaskRepository taskRepository;

	@Mock
	private ProjectAuditLogger auditLogger;

	private ProjectTemplateServiceImpl service;

	@BeforeEach
	void setUp() {
		service = new ProjectTemplateServiceImpl(templateRepository, templateItemRepository, contractRepository,
				userRepository, projectRepository, workPackageRepository, taskRepository, auditLogger);
		SecurityContextHolder.getContext().setAuthentication(new TestingAuthenticationToken("pm01", "n/a"));
	}

	@Test
	@DisplayName("TC-01: tao du an tu mau va dung san cay cong viec kem ngan sach gio goi y")
	void buildsWorkBreakdownFromTemplate() {
		stubHappyPath();
		when(templateItemRepository.findByTemplateIdOrderByIdAsc(5L)).thenReturn(templateItems());

		ProjectRes response = service.createProjectFromTemplate(1L, request());

		assertThat(response.id()).isEqualTo(20L);
		assertThat(response.contractId()).isEqualTo(1L);
		assertThat(response.projectManagerId()).isEqualTo(7L);

		ArgumentCaptor<WorkPackage> packageCaptor = ArgumentCaptor.forClass(WorkPackage.class);
		verify(workPackageRepository).save(packageCaptor.capture());
		WorkPackage savedPackage = packageCaptor.getValue();
		assertThat(savedPackage.getProjectId()).isEqualTo(20L);
		assertThat(savedPackage.getName()).isEqualTo("Phat trien tinh nang");
		assertThat(savedPackage.getParentId()).isNull();

		ArgumentCaptor<Task> taskCaptor = ArgumentCaptor.forClass(Task.class);
		// Cong viec co ngan sach gio duoc luu hai lan: lan tao va lan cap nhat ngan sach.
		verify(taskRepository, times(4)).save(taskCaptor.capture());
		// TC-02: cong viec duoc sao chep gia tri, gan ngan sach gio goi y tu mau.
		Task firstTask = taskCaptor.getAllValues().get(0);
		assertThat(firstTask.getWorkPackageId()).isEqualTo(30L);
		assertThat(taskCaptor.getAllValues().get(1).getBudgetHours()).isEqualByComparingTo("40.00");
		Task secondTask = taskCaptor.getAllValues().get(2);
		assertThat(secondTask.getParentTaskId()).isEqualTo(31L);
		assertThat(taskCaptor.getAllValues().get(3).getBudgetHours()).isEqualByComparingTo("10.00");

		// TC-04: ghi nhat ky nguoi thuc hien, noi dung va thoi diem.
		verify(auditLogger).recordCreateFromTemplate(eq(20L), eq(1L), eq("MT-PHAN-MEM"), anyString());
	}

	@Test
	@DisplayName("Tu choi khi mau du an khong ton tai")
	void rejectsMissingTemplate() {
		stubHappyPath();
		when(templateRepository.findById(5L)).thenReturn(Optional.empty());

		assertThatThrownBy(() -> service.createProjectFromTemplate(1L, request()))
				.isInstanceOf(BusinessRuleException.class)
				.extracting(exception -> ((BusinessRuleException) exception).getErrorCode())
				.isEqualTo(ErrorCode.RESOURCE_NOT_FOUND);
		verify(projectRepository, never()).save(any());
	}

	@Test
	@DisplayName("Tu choi khi mau du an khong con hoat dong")
	void rejectsInactiveTemplate() {
		stubHappyPath();
		when(templateRepository.findById(5L)).thenReturn(Optional.of(template(false)));

		assertThatThrownBy(() -> service.createProjectFromTemplate(1L, request()))
				.isInstanceOf(BusinessRuleException.class)
				.extracting(exception -> ((BusinessRuleException) exception).getErrorCode())
				.isEqualTo(ErrorCode.INVALID_STATE);
		verify(projectRepository, never()).save(any());
	}

	@Test
	@DisplayName("Tu choi hop dong khong con hieu luc")
	void rejectsInactiveContract() {
		when(contractRepository.findById(1L))
				.thenReturn(Optional.of(contract(ContractStatus.TERMINATED)));

		assertThatThrownBy(() -> service.createProjectFromTemplate(1L, request()))
				.isInstanceOf(BusinessRuleException.class)
				.extracting(exception -> ((BusinessRuleException) exception).getErrorCode())
				.isEqualTo(ErrorCode.INVALID_STATE);
		verify(projectRepository, never()).save(any());
	}

	private void stubHappyPath() {
		when(contractRepository.findById(1L)).thenReturn(Optional.of(contract(ContractStatus.ACTIVE)));
		when(userRepository.findById(7L)).thenReturn(Optional.of(activeUser()));
		when(templateRepository.findById(5L)).thenReturn(Optional.of(template(true)));
		when(projectRepository.save(any(Project.class))).thenAnswer(invocation -> {
			Project project = invocation.getArgument(0);
			project.setId(20L);
			return project;
		});
		when(workPackageRepository.save(any(WorkPackage.class))).thenAnswer(invocation -> {
			WorkPackage pack = invocation.getArgument(0);
			pack.setId(30L);
			return pack;
		});
		when(taskRepository.save(any(Task.class))).thenAnswer(invocation -> {
			Task task = invocation.getArgument(0);
			task.setId(task.getParentTaskId() == null ? 31L : 32L);
			return task;
		});
	}

	private ProjectCreateFromTemplateReq request() {
		return new ProjectCreateFromTemplateReq(5L, "Du an ERP", LocalDate.of(2027, 1, 1),
				LocalDate.of(2027, 12, 31), 7L);
	}

	private Contract contract(ContractStatus status) {
		Contract contract = new Contract();
		contract.setId(1L);
		contract.setContractCode("HD-001");
		contract.setCustomerId(9L);
		contract.setContractType(ContractType.FIXED_PRICE);
		contract.setStatus(status);
		return contract;
	}

	private User activeUser() {
		User user = new User();
		user.setId(7L);
		user.setStatus(UserStatus.ACTIVE);
		return user;
	}

	private ProjectTemplate template(boolean active) {
		ProjectTemplate template = new ProjectTemplate();
		template.setId(5L);
		template.setCode("MT-PHAN-MEM");
		template.setName("Mau trien khai phan mem");
		template.setProjectType(ContractType.FIXED_PRICE.name());
		template.setActive(active);
		return template;
	}

	private List<ProjectTemplateItem> templateItems() {
		ProjectTemplateItem pack = item(1L, null, TemplateItemType.WORK_PACKAGE, "Phat trien tinh nang", null);
		ProjectTemplateItem task = item(2L, 1L, TemplateItemType.TASK, "Phan tich va thiet ke", new BigDecimal("40.00"));
		ProjectTemplateItem subTask = item(3L, 2L, TemplateItemType.TASK, "Thiet ke chi tiet", new BigDecimal("10.00"));
		return List.of(pack, task, subTask);
	}

	private ProjectTemplateItem item(Long id, Long parentId, TemplateItemType type, String name, BigDecimal budget) {
		ProjectTemplateItem item = new ProjectTemplateItem();
		item.setId(id);
		item.setTemplateId(5L);
		item.setParentId(parentId);
		item.setItemType(type);
		item.setName(name);
		item.setSortOrder(1);
		item.setSuggestedBudgetHours(budget);
		return item;
	}
}
