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
import com.serviceops.modules.project.dto.request.ProjectCreateFromContractReq;
import com.serviceops.modules.project.dto.response.ProjectRes;
import com.serviceops.modules.project.entity.Project;
import com.serviceops.modules.project.logging.ProjectAuditLogger;
import com.serviceops.modules.project.repository.ProjectRepository;
import com.serviceops.modules.project.service.impl.ProjectServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.TestingAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ProjectServiceImplTest {

	@Mock
	private ContractRepository contractRepository;

	@Mock
	private UserRepository userRepository;

	@Mock
	private ProjectRepository projectRepository;

	@Mock
	private ProjectAuditLogger auditLogger;

	private ProjectServiceImpl service;

	@BeforeEach
	void setUp() {
		service = new ProjectServiceImpl(contractRepository, userRepository, projectRepository, auditLogger);
		SecurityContextHolder.getContext().setAuthentication(new TestingAuthenticationToken("pm01", "n/a"));
	}

	@Test
	@DisplayName("TC-01: tao du an tu hop dong active va ke thua loai cung han muc")
	void createsProjectFromActiveContract() {
		Contract contract = contract(1L, ContractStatus.ACTIVE);
		when(contractRepository.findById(1L)).thenReturn(Optional.of(contract));
		when(userRepository.findById(7L)).thenReturn(Optional.of(activeUser(7L)));
		when(projectRepository.save(any(Project.class))).thenAnswer(invocation -> {
			Project project = invocation.getArgument(0);
			project.setId(20L);
			return project;
		});

		ProjectRes response = service.createFromContract(1L, request());

		assertThat(response.id()).isEqualTo(20L);
		assertThat(response.contractId()).isEqualTo(1L);
		assertThat(response.customerId()).isEqualTo(9L);
		assertThat(response.projectType()).isEqualTo(ContractType.FIXED_PRICE.name());
		assertThat(response.limitValue()).isEqualByComparingTo("600000000");
		assertThat(response.projectManagerId()).isEqualTo(7L);
		assertThat(response.status()).isEqualTo("RUNNING");
		verify(auditLogger).recordCreate(eq(20L), eq(1L), any(String.class));
	}

	@Test
	@DisplayName("TC-02: tu choi hop dong khong con hieu luc")
	void rejectsInactiveContract() {
		when(contractRepository.findById(1L)).thenReturn(Optional.of(contract(1L, ContractStatus.TERMINATED)));

		assertThatThrownBy(() -> service.createFromContract(1L, request()))
				.isInstanceOf(BusinessRuleException.class)
				.extracting(exception -> ((BusinessRuleException) exception).getErrorCode())
				.isEqualTo(ErrorCode.INVALID_STATE);
		verify(projectRepository, never()).save(any());
	}

	@Test
	@DisplayName("TC-03: tu choi ngay ket thuc du kien som hon ngay bat dau")
	void rejectsInvalidProjectDates() {
		when(contractRepository.findById(1L)).thenReturn(Optional.of(contract(1L, ContractStatus.ACTIVE)));

		ProjectCreateFromContractReq invalid = new ProjectCreateFromContractReq(
				"Du an ERP", LocalDate.of(2027, 10, 1), LocalDate.of(2027, 9, 30), 7L);
		assertThatThrownBy(() -> service.createFromContract(1L, invalid))
				.isInstanceOf(BusinessRuleException.class)
				.extracting(exception -> ((BusinessRuleException) exception).getErrorCode())
				.isEqualTo(ErrorCode.INVALID_STATE);
		verify(projectRepository, never()).save(any());
	}

	@Test
	@DisplayName("Khong tao du an khi nguoi quan ly khong ton tai")
	void rejectsMissingProjectManager() {
		when(contractRepository.findById(1L)).thenReturn(Optional.of(contract(1L, ContractStatus.ACTIVE)));
		when(userRepository.findById(7L)).thenReturn(Optional.empty());

		assertThatThrownBy(() -> service.createFromContract(1L, request()))
				.isInstanceOf(BusinessRuleException.class)
				.extracting(exception -> ((BusinessRuleException) exception).getErrorCode())
				.isEqualTo(ErrorCode.RESOURCE_NOT_FOUND);
		verify(projectRepository, never()).save(any());
	}

	@Test
	@DisplayName("Doc du an theo id, tra ve trang thai de FE khoa/mo nut chinh sua")
	void getsProjectById() {
		Project project = new Project();
		project.setId(20L);
		project.setProjectCode("DA-1");
		project.setName("Du an ERP");
		project.setContractId(1L);
		project.setCustomerId(9L);
		project.setProjectType("FIXED_PRICE");
		project.setStartDate(LocalDate.of(2027, 1, 1));
		project.setExpectedEndDate(LocalDate.of(2027, 12, 31));
		project.setProjectManagerId(7L);
		project.setStatus(com.serviceops.modules.project.enums.ProjectStatus.CLOSED);
		when(projectRepository.findById(20L)).thenReturn(Optional.of(project));

		ProjectRes res = service.getProject(20L);

		assertThat(res.id()).isEqualTo(20L);
		assertThat(res.status()).isEqualTo("CLOSED");
	}

	@Test
	@DisplayName("Doc du an khong ton tai -> RESOURCE_NOT_FOUND")
	void getProjectNotFound() {
		when(projectRepository.findById(404L)).thenReturn(Optional.empty());

		assertThatThrownBy(() -> service.getProject(404L))
				.isInstanceOf(BusinessRuleException.class)
				.extracting(exception -> ((BusinessRuleException) exception).getErrorCode())
				.isEqualTo(ErrorCode.RESOURCE_NOT_FOUND);
	}

	@Test
	@DisplayName("Liet ke du an theo hop dong, moi nhat truoc")
	void listsProjectsByContract() {
		Project older = new Project();
		older.setId(10L);
		older.setStatus(com.serviceops.modules.project.enums.ProjectStatus.RUNNING);
		Project newer = new Project();
		newer.setId(20L);
		newer.setStatus(com.serviceops.modules.project.enums.ProjectStatus.RUNNING);
		when(projectRepository.findByContractIdOrderByIdDesc(1L)).thenReturn(java.util.List.of(newer, older));

		assertThat(service.listByContract(1L)).extracting(ProjectRes::id).containsExactly(20L, 10L);
	}

	private ProjectCreateFromContractReq request() {
		return new ProjectCreateFromContractReq("Du an ERP", LocalDate.of(2027, 1, 1),
				LocalDate.of(2027, 12, 31), 7L);
	}

	private Contract contract(Long id, ContractStatus status) {
		Contract contract = new Contract();
		contract.setId(id);
		contract.setContractCode("HD-001");
		contract.setCustomerId(9L);
		contract.setContractType(ContractType.FIXED_PRICE);
		contract.setLimitValue(new BigDecimal("600000000"));
		contract.setStatus(status);
		return contract;
	}

	private User activeUser(Long id) {
		User user = new User();
		user.setId(id);
		user.setStatus(UserStatus.ACTIVE);
		return user;
	}
}