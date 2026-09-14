package com.serviceops.modules.project;

import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import com.serviceops.modules.identity.user.entity.User;
import com.serviceops.modules.identity.user.enums.UserStatus;
import com.serviceops.modules.identity.user.repository.UserRepository;
import com.serviceops.modules.project.dto.request.ProjectRiskReq;
import com.serviceops.modules.project.dto.request.ProjectRiskStatusReq;
import com.serviceops.modules.project.dto.response.ProjectRiskRes;
import com.serviceops.modules.project.entity.Project;
import com.serviceops.modules.project.entity.ProjectRisk;
import com.serviceops.modules.project.enums.ProjectAuditAction;
import com.serviceops.modules.project.enums.ProjectStatus;
import com.serviceops.modules.project.enums.RiskLevel;
import com.serviceops.modules.project.enums.RiskStatus;
import com.serviceops.modules.project.logging.ProjectAuditLogger;
import com.serviceops.modules.project.repository.ProjectRepository;
import com.serviceops.modules.project.repository.ProjectRiskRepository;
import com.serviceops.modules.project.service.impl.ProjectRiskServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * NCL-05-CN-009: quan ly rui ro cua du an.
 * TC-01: ghi nhan rui ro thanh cong va hien tren bang theo doi.
 * TC-02: diem/muc do rui ro tinh dong tu impact x likelihood; bang theo doi sap theo diem giam dan.
 * TC-04: ghi nhat ky thay doi rui ro.
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class ProjectRiskServiceImplTest {

	private static final Clock FIXED_CLOCK =
			Clock.fixed(Instant.parse("2026-09-09T00:00:00Z"), ZoneId.of("UTC"));

	@Mock
	private ProjectRepository projectRepository;

	@Mock
	private ProjectRiskRepository riskRepository;

	@Mock
	private UserRepository userRepository;

	@Mock
	private ProjectAuditLogger auditLogger;

	private ProjectRiskServiceImpl service;

	@BeforeEach
	void setUp() {
		service = new ProjectRiskServiceImpl(projectRepository, riskRepository, userRepository,
				auditLogger, FIXED_CLOCK);
		stubHappyPath();
	}

	@Test
	@DisplayName("TC-01: ghi nhan rui ro thanh cong, luu du lieu va ghi nhat ky; muc do tinh dong")
	void createsRisk() {
		ProjectRiskRes res = service.createRisk(1L,
				new ProjectRiskReq("Nha thau phu cham tien do", RiskLevel.HIGH, RiskLevel.MEDIUM,
						"Chuan bi nha thau du phong", 7L));

		ArgumentCaptor<ProjectRisk> captor = ArgumentCaptor.forClass(ProjectRisk.class);
		verify(riskRepository).save(captor.capture());
		assertThat(captor.getValue().getDescription()).isEqualTo("Nha thau phu cham tien do");
		assertThat(captor.getValue().getStatus()).isEqualTo(RiskStatus.OPEN);
		verify(auditLogger).recordRiskChange(eq(1L), eq(ProjectAuditAction.RISK_CREATED), any());
		// HIGH(3) x MEDIUM(2) = 6 -> severity HIGH
		assertThat(res.score()).isEqualTo(6);
		assertThat(res.severity()).isEqualTo(RiskLevel.HIGH);
		assertThat(res.watcherName()).isEqualTo("Nguyen Van A");
	}

	@Test
	@DisplayName("TC-02: bang theo doi sap theo diem rui ro giam dan va tra muc do do he thong tinh")
	void listsRisksOrderedBySeverity() {
		ProjectRisk low = risk(31L, RiskLevel.LOW, RiskLevel.LOW);      // score 1
		ProjectRisk high = risk(32L, RiskLevel.HIGH, RiskLevel.HIGH);   // score 9
		ProjectRisk mid = risk(33L, RiskLevel.MEDIUM, RiskLevel.LOW);   // score 2
		when(riskRepository.findByProjectIdOrderByIdAsc(1L)).thenReturn(List.of(low, high, mid));

		List<ProjectRiskRes> res = service.getRisks(1L);

		assertThat(res).extracting(ProjectRiskRes::id).containsExactly(32L, 33L, 31L);
		assertThat(res.get(0).score()).isEqualTo(9);
		assertThat(res.get(0).severity()).isEqualTo(RiskLevel.HIGH);
		assertThat(res.get(2).severity()).isEqualTo(RiskLevel.LOW);
	}

	@Test
	@DisplayName("TC-04: cap nhat trang thai rui ro ghi nhat ky RISK_UPDATED")
	void changeStatusAudited() {
		service.changeStatus(1L, 31L, new ProjectRiskStatusReq(RiskStatus.MITIGATING));

		verify(auditLogger).recordRiskChange(eq(1L), eq(ProjectAuditAction.RISK_UPDATED), any());
	}

	@Test
	@DisplayName("TC-04: xoa rui ro ghi nhat ky RISK_DELETED")
	void deleteAudited() {
		service.deleteRisk(1L, 31L);

		verify(auditLogger).recordRiskChange(eq(1L), eq(ProjectAuditAction.RISK_DELETED), any());
		verify(riskRepository).delete(any(ProjectRisk.class));
	}

	@Test
	@DisplayName("Tu choi ghi nhan rui ro khi du an da dong")
	void rejectsWhenProjectClosed() {
		Project closed = new Project();
		closed.setId(1L);
		closed.setStatus(ProjectStatus.CLOSED);
		when(projectRepository.findById(1L)).thenReturn(Optional.of(closed));

		assertThatThrownBy(() -> service.createRisk(1L,
				new ProjectRiskReq("X", RiskLevel.LOW, RiskLevel.LOW, null, 7L)))
				.isInstanceOf(BusinessRuleException.class)
				.extracting(ex -> ((BusinessRuleException) ex).getErrorCode())
				.isEqualTo(ErrorCode.INVALID_STATE);
		verify(riskRepository, never()).save(any());
	}

	@Test
	@DisplayName("Tu choi nguoi theo doi khong ton tai")
	void rejectsUnknownWatcher() {
		when(userRepository.findById(99L)).thenReturn(Optional.empty());

		assertThatThrownBy(() -> service.createRisk(1L,
				new ProjectRiskReq("X", RiskLevel.LOW, RiskLevel.LOW, null, 99L)))
				.isInstanceOf(BusinessRuleException.class)
				.extracting(ex -> ((BusinessRuleException) ex).getErrorCode())
				.isEqualTo(ErrorCode.RESOURCE_NOT_FOUND);
		verify(riskRepository, never()).save(any());
	}

	@Test
	@DisplayName("Tu choi nguoi theo doi khong con hoat dong")
	void rejectsInactiveWatcher() {
		User inactive = new User();
		inactive.setId(8L);
		inactive.setFullName("Nguoi nghi viec");
		inactive.setStatus(UserStatus.INACTIVE);
		when(userRepository.findById(8L)).thenReturn(Optional.of(inactive));

		assertThatThrownBy(() -> service.createRisk(1L,
				new ProjectRiskReq("X", RiskLevel.LOW, RiskLevel.LOW, null, 8L)))
				.isInstanceOf(BusinessRuleException.class)
				.extracting(ex -> ((BusinessRuleException) ex).getErrorCode())
				.isEqualTo(ErrorCode.INVALID_STATE);
	}

	private void stubHappyPath() {
		Project project = new Project();
		project.setId(1L);
		project.setStatus(ProjectStatus.RUNNING);
		when(projectRepository.findById(1L)).thenReturn(Optional.of(project));

		User watcher = new User();
		watcher.setId(7L);
		watcher.setFullName("Nguyen Van A");
		watcher.setStatus(UserStatus.ACTIVE);
		when(userRepository.findById(7L)).thenReturn(Optional.of(watcher));

		when(riskRepository.save(any(ProjectRisk.class))).thenAnswer(invocation -> {
			ProjectRisk risk = invocation.getArgument(0);
			if (risk.getId() == null) {
				risk.setId(31L);
			}
			return risk;
		});
		when(riskRepository.findById(31L)).thenAnswer(invocation -> Optional.of(risk(31L,
				RiskLevel.MEDIUM, RiskLevel.MEDIUM)));
	}

	private ProjectRisk risk(Long id, RiskLevel impact, RiskLevel likelihood) {
		ProjectRisk risk = new ProjectRisk();
		risk.setId(id);
		risk.setProjectId(1L);
		risk.setDescription("Rui ro " + id);
		risk.setImpact(impact);
		risk.setLikelihood(likelihood);
		risk.setWatcherId(7L);
		risk.setStatus(RiskStatus.OPEN);
		return risk;
	}
}
