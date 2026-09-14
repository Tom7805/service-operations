package com.serviceops.modules.project;

import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import com.serviceops.modules.project.dto.request.ProjectMilestoneReq;
import com.serviceops.modules.project.dto.response.ProjectMilestoneRes;
import com.serviceops.modules.project.entity.Project;
import com.serviceops.modules.project.entity.ProjectMilestone;
import com.serviceops.modules.project.entity.ProjectMilestoneItem;
import com.serviceops.modules.project.entity.Task;
import com.serviceops.modules.project.entity.WorkPackage;
import com.serviceops.modules.project.enums.MilestoneProgressStatus;
import com.serviceops.modules.project.enums.ProjectAuditAction;
import com.serviceops.modules.project.enums.ProjectStatus;
import com.serviceops.modules.project.enums.TaskStatus;
import com.serviceops.modules.project.logging.ProjectAuditLogger;
import com.serviceops.modules.project.repository.ProjectMilestoneItemRepository;
import com.serviceops.modules.project.repository.ProjectMilestoneRepository;
import com.serviceops.modules.project.repository.ProjectRepository;
import com.serviceops.modules.project.repository.TaskRepository;
import com.serviceops.modules.project.repository.WorkPackageRepository;
import com.serviceops.modules.project.service.impl.ProjectMilestoneServiceImpl;
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
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * NCL-05-CN-008: quan ly moc tien do cua du an.
 * TC-01: tao moc thanh cong va hien tren bang theo doi.
 * TC-02: qua ngay ke hoach ma chua hoan thanh -> LATE kem so ngay tre.
 * TC-04: ghi nhat ky thay doi moc tien do.
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class ProjectMilestoneServiceImplTest {

	/** Hom nay = 2026-09-09 de tinh trang thai cham dung dinh, khong phu thuoc ngay that. */
	private static final Clock FIXED_CLOCK =
			Clock.fixed(Instant.parse("2026-09-09T00:00:00Z"), ZoneId.of("UTC"));

	@Mock
	private ProjectRepository projectRepository;

	@Mock
	private WorkPackageRepository workPackageRepository;

	@Mock
	private TaskRepository taskRepository;

	@Mock
	private ProjectMilestoneRepository milestoneRepository;

	@Mock
	private ProjectMilestoneItemRepository milestoneItemRepository;

	@Mock
	private ProjectAuditLogger auditLogger;

	private ProjectMilestoneServiceImpl service;

	@BeforeEach
	void setUp() {
		service = new ProjectMilestoneServiceImpl(projectRepository, workPackageRepository,
				taskRepository, milestoneRepository, milestoneItemRepository, auditLogger, FIXED_CLOCK);
		stubHappyPath();
	}

	@Test
	@DisplayName("TC-01: tao moc tien do thanh cong, luu moc + hang muc va ghi nhat ky")
	void createsMilestoneWithItems() {
		ProjectMilestoneRes res = service.createMilestone(1L,
				new ProjectMilestoneReq("Ban giao giai doan mot", null,
						LocalDate.of(2026, 10, 1), List.of(11L, 12L)));

		ArgumentCaptor<ProjectMilestone> milestoneCaptor = ArgumentCaptor.forClass(ProjectMilestone.class);
		verify(milestoneRepository).save(milestoneCaptor.capture());
		assertThat(milestoneCaptor.getValue().getName()).isEqualTo("Ban giao giai doan mot");
		assertThat(milestoneCaptor.getValue().getPlannedDate()).isEqualTo(LocalDate.of(2026, 10, 1));
		verify(milestoneItemRepository, times(2)).save(any(ProjectMilestoneItem.class));
		verify(auditLogger).recordMilestoneChange(eq(1L), eq(ProjectAuditAction.MILESTONE_CREATED), any());
		// ngay ke hoach con tuong lai -> dung han
		assertThat(res.status()).isEqualTo(MilestoneProgressStatus.ON_TRACK);
		assertThat(res.daysLate()).isNull();
	}

	@Test
	@DisplayName("TC-02: qua ngay ke hoach ma chua hoan thanh -> cham kem so ngay tre")
	void marksLateMilestoneWithDaysLate() {
		ProjectMilestone overdue = milestone(21L, LocalDate.of(2026, 9, 1), null);
		when(milestoneRepository.findByProjectIdOrderByPlannedDateAscIdAsc(1L))
				.thenReturn(List.of(overdue));

		ProjectMilestoneRes res = service.getMilestones(1L).get(0);

		assertThat(res.status()).isEqualTo(MilestoneProgressStatus.LATE);
		assertThat(res.daysLate()).isEqualTo(8L); // 2026-09-09 - 2026-09-01
	}

	@Test
	@DisplayName("TC-02: da co ngay thuc te -> moc hoan thanh, khong tinh tre")
	void marksDoneMilestone() {
		ProjectMilestone done = milestone(21L, LocalDate.of(2026, 9, 1), LocalDate.of(2026, 8, 30));
		when(milestoneRepository.findByProjectIdOrderByPlannedDateAscIdAsc(1L))
				.thenReturn(List.of(done));

		ProjectMilestoneRes res = service.getMilestones(1L).get(0);

		assertThat(res.status()).isEqualTo(MilestoneProgressStatus.DONE);
		assertThat(res.daysLate()).isNull();
	}

	@Test
	@DisplayName("Tu choi tao moc khi du an chua co cay cong viec (dieu kien bat dau)")
	void rejectsMilestoneWithoutWorkBreakdown() {
		when(workPackageRepository.findByProjectIdOrderBySortOrderAscIdAsc(1L)).thenReturn(List.of());

		assertThatThrownBy(() -> service.createMilestone(1L, request()))
				.isInstanceOf(BusinessRuleException.class)
				.extracting(exception -> ((BusinessRuleException) exception).getErrorCode())
				.isEqualTo(ErrorCode.INVALID_STATE);
		verify(milestoneRepository, never()).save(any());
	}

	@Test
	@DisplayName("Tu choi hang muc gan cong viec khong thuoc du an")
	void rejectsTaskFromAnotherProject() {
		ProjectMilestoneReq req = new ProjectMilestoneReq("Moc", null,
				LocalDate.of(2026, 10, 1), List.of(99L));

		assertThatThrownBy(() -> service.createMilestone(1L, req))
				.isInstanceOf(BusinessRuleException.class)
				.extracting(exception -> ((BusinessRuleException) exception).getErrorCode())
				.isEqualTo(ErrorCode.RESOURCE_NOT_FOUND);
		verify(milestoneItemRepository, never()).save(any());
	}

	@Test
	@DisplayName("TC-04: xoa moc cung ghi nhat ky thay doi")
	void auditsMilestoneDeletion() {
		service.deleteMilestone(1L, 21L);

		verify(auditLogger).recordMilestoneChange(eq(1L), eq(ProjectAuditAction.MILESTONE_DELETED), any());
		verify(milestoneRepository).delete(any(ProjectMilestone.class));
	}

	private void stubHappyPath() {
		Project project = new Project();
		project.setId(1L);
		project.setStatus(ProjectStatus.RUNNING);
		when(projectRepository.findById(1L)).thenReturn(Optional.of(project));
		when(workPackageRepository.findByProjectIdOrderBySortOrderAscIdAsc(1L))
				.thenReturn(List.of(new WorkPackage()));
		when(taskRepository.findByProjectIdOrderByIdAsc(1L)).thenReturn(List.of(task(11L), task(12L)));
		when(milestoneRepository.save(any(ProjectMilestone.class))).thenAnswer(invocation -> {
			ProjectMilestone milestone = invocation.getArgument(0);
			milestone.setId(21L);
			return milestone;
		});
		when(milestoneRepository.findById(21L)).thenAnswer(invocation -> {
			ProjectMilestone milestone = new ProjectMilestone();
			milestone.setId(21L);
			milestone.setProjectId(1L);
			milestone.setName("Ban giao giai doan mot");
			milestone.setPlannedDate(LocalDate.of(2026, 10, 1));
			return Optional.of(milestone);
		});
	}

	private ProjectMilestoneReq request() {
		return new ProjectMilestoneReq("Ban giao giai doan mot", null,
				LocalDate.of(2026, 10, 1), List.of(11L));
	}

	private Task task(Long id) {
		Task task = new Task();
		task.setId(id);
		task.setProjectId(1L);
		task.setWorkPackageId(30L);
		task.setName("Cong viec " + id);
		task.setStatus(TaskStatus.TODO);
		return task;
	}

	private ProjectMilestone milestone(Long id, LocalDate plannedDate, LocalDate actualDate) {
		ProjectMilestone milestone = new ProjectMilestone();
		milestone.setId(id);
		milestone.setProjectId(1L);
		milestone.setName("Ban giao giai doan mot");
		milestone.setPlannedDate(plannedDate);
		milestone.setActualDate(actualDate);
		return milestone;
	}
}


