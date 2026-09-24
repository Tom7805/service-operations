package com.serviceops.modules.portal.service.impl;

import com.serviceops.common.audit.AuditTargetType;
import com.serviceops.common.audit.service.AuditLogService;
import com.serviceops.modules.acceptance.entity.AcceptanceCertificate;
import com.serviceops.modules.acceptance.entity.Deliverable;
import com.serviceops.modules.acceptance.entity.DeliverableVersion;
import com.serviceops.modules.acceptance.repository.AcceptanceCertificateRepository;
import com.serviceops.modules.acceptance.repository.DeliverableRepository;
import com.serviceops.modules.acceptance.repository.DeliverableVersionRepository;
import com.serviceops.modules.contract.entity.Contract;
import com.serviceops.modules.contract.repository.ContractRepository;
import com.serviceops.modules.identity.user.entity.User;
import com.serviceops.modules.identity.user.repository.UserRepository;
import com.serviceops.modules.portal.dto.response.PortalProjectProgressRes;
import com.serviceops.modules.portal.dto.response.PortalProjectProgressRes.DeliveredItemRes;
import com.serviceops.modules.portal.dto.response.PortalProjectProgressRes.MilestoneProgressRes;
import com.serviceops.modules.portal.dto.response.PortalProjectProgressRes.WorkPackageProgressRes;
import com.serviceops.modules.portal.dto.response.PortalProjectRes;
import com.serviceops.modules.portal.security.PortalDataScopeGuard;
import com.serviceops.modules.portal.security.PortalDataScopeGuard.PortalScope;
import com.serviceops.modules.portal.service.PortalProjectService;
import com.serviceops.modules.project.entity.Project;
import com.serviceops.modules.project.entity.ProjectMilestone;
import com.serviceops.modules.project.entity.Task;
import com.serviceops.modules.project.entity.WorkPackage;
import com.serviceops.modules.project.enums.MilestoneProgressStatus;
import com.serviceops.modules.project.enums.TaskStatus;
import com.serviceops.modules.project.repository.ProjectMilestoneRepository;
import com.serviceops.modules.project.repository.ProjectRepository;
import com.serviceops.modules.project.repository.TaskRepository;
import com.serviceops.modules.project.repository.WorkPackageRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * NCL-13-CN-002: tien do du an tren cong khach hang.
 *
 * <ul>
 *   <li>TC-01: chi liet ke du an cua chinh khach hang (pham vi tu {@link PortalDataScopeGuard}).</li>
 *   <li>TC-02: mo du an cua khach hang khac bang duong dan truc tiep -&gt; 403 + nhat ky tu choi.</li>
 *   <li>TC-03: chi tra muc tong quan (ty le hoan thanh, moc, san pham da ban giao); khong tra mo ta/ghi chu
 *       noi bo, ten cong viec chi tiet, gio cong, ngan sach, rui ro hay gia tri tai chinh noi bo.</li>
 *   <li>TC-05: moi luot khach hang xem duoc ghi Nhat ky he thong (PORTAL).</li>
 * </ul>
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PortalProjectServiceImpl implements PortalProjectService {

	private final PortalDataScopeGuard scopeGuard;
	private final ProjectRepository projectRepository;
	private final ContractRepository contractRepository;
	private final UserRepository userRepository;
	private final TaskRepository taskRepository;
	private final WorkPackageRepository workPackageRepository;
	private final ProjectMilestoneRepository milestoneRepository;
	private final DeliverableRepository deliverableRepository;
	private final DeliverableVersionRepository deliverableVersionRepository;
	private final AcceptanceCertificateRepository certificateRepository;
	private final AuditLogService auditLogService;
	private final Clock clock;

	@Override
	public List<PortalProjectRes> listMyProjects() {
		PortalScope scope = scopeGuard.currentScope();
		List<Project> projects = projectRepository.findByCustomerIdInOrderByIdDesc(scope.customerIds());
		Map<Long, String> contractCodes = contractRepository.findAllById(projects.stream()
						.map(Project::getContractId).filter(Objects::nonNull).distinct().toList()).stream()
				.collect(Collectors.toMap(Contract::getId, Contract::getContractCode));
		Map<Long, String> managerNames = userRepository.findAllById(projects.stream()
						.map(Project::getProjectManagerId).filter(Objects::nonNull).distinct().toList()).stream()
				.collect(Collectors.toMap(User::getId, User::getFullName));
		LocalDate today = LocalDate.now(clock);
		List<PortalProjectRes> result = projects.stream()
				.map(project -> toSummary(project, contractCodes.get(project.getContractId()),
						managerNames.get(project.getProjectManagerId()),
						taskRepository.findByProjectIdOrderByIdAsc(project.getId()),
						milestoneRepository.findByProjectIdOrderByPlannedDateAscIdAsc(project.getId()), today))
				.toList();
		auditLogService.record("Khách hàng xem danh sách dự án", AuditTargetType.PORTAL, scope.accountId(),
				"Cổng khách hàng " + scope.username(),
				"Khach hang " + scope.username() + " xem danh sach " + result.size() + " du an tren cong");
		return result;
	}

	@Override
	public PortalProjectProgressRes getProgress(Long projectId) {
		PortalScope scope = scopeGuard.currentScope();
		Project project = scopeGuard.requireProject(scope, projectId);
		LocalDate today = LocalDate.now(clock);

		List<Task> tasks = taskRepository.findByProjectIdOrderByIdAsc(project.getId());
		List<ProjectMilestone> milestones = milestoneRepository.findByProjectIdOrderByPlannedDateAscIdAsc(project.getId());
		List<WorkPackage> packages = workPackageRepository.findByProjectIdOrderBySortOrderAscIdAsc(project.getId());
		String contractCode = contractRepository.findById(project.getContractId())
				.map(Contract::getContractCode).orElse(null);
		String managerName = userRepository.findById(project.getProjectManagerId())
				.map(User::getFullName).orElse(null);

		PortalProjectRes summary = toSummary(project, contractCode, managerName, tasks, milestones, today);
		PortalProjectProgressRes result = new PortalProjectProgressRes(summary,
				workPackageProgress(project, packages, tasks),
				milestones.stream().map(milestone -> toMilestone(milestone, today)).toList(),
				deliveredItems(project, packages));

		auditLogService.record("Khách hàng xem tiến độ dự án", AuditTargetType.PORTAL, project.getId(),
				"Dự án " + project.getProjectCode(),
				"Khach hang " + scope.username() + " xem tien do du an " + project.getProjectCode() + " - "
						+ project.getName() + " tren cong");
		return result;
	}

	private PortalProjectRes toSummary(Project project, String contractCode, String managerName, List<Task> tasks,
			List<ProjectMilestone> milestones, LocalDate today) {
		int doneTasks = (int) tasks.stream().filter(task -> task.getStatus() == TaskStatus.DONE).count();
		List<MilestoneProgressRes> milestoneStates = milestones.stream()
				.map(milestone -> toMilestone(milestone, today)).toList();
		MilestoneProgressRes next = milestoneStates.stream()
				.filter(milestone -> milestone.status() != MilestoneProgressStatus.DONE)
				.min(Comparator.comparing(MilestoneProgressRes::plannedDate))
				.orElse(null);
		return new PortalProjectRes(project.getId(), project.getProjectCode(), project.getName(), project.getStatus(),
				project.getStartDate(), project.getExpectedEndDate(), contractCode, managerName,
				tasks.size(), doneTasks, percent(doneTasks, tasks.size()),
				milestoneStates.size(),
				(int) milestoneStates.stream().filter(m -> m.status() == MilestoneProgressStatus.DONE).count(),
				(int) milestoneStates.stream().filter(m -> m.status() == MilestoneProgressStatus.LATE).count(),
				next == null ? null : next.name(), next == null ? null : next.plannedDate());
	}

	/** Cung quy tac NCL-05-CN-008: DONE khi co ngay thuc te, LATE khi qua ngay ke hoach, con lai ON_TRACK. */
	private MilestoneProgressRes toMilestone(ProjectMilestone milestone, LocalDate today) {
		MilestoneProgressStatus status;
		Long daysLate = null;
		if (milestone.getActualDate() != null) {
			status = MilestoneProgressStatus.DONE;
		} else if (milestone.getPlannedDate().isBefore(today)) {
			status = MilestoneProgressStatus.LATE;
			daysLate = ChronoUnit.DAYS.between(milestone.getPlannedDate(), today);
		} else {
			status = MilestoneProgressStatus.ON_TRACK;
		}
		return new MilestoneProgressRes(milestone.getId(), milestone.getName(), milestone.getPlannedDate(),
				milestone.getActualDate(), status, daysLate);
	}

	/** Ty le hoan thanh tung hang muc, tinh ca cong viec cua hang muc con chau (nhu QTN-24 cua NCL-12). */
	private List<WorkPackageProgressRes> workPackageProgress(Project project, List<WorkPackage> packages,
			List<Task> tasks) {
		Map<Long, List<Long>> children = new HashMap<>();
		for (WorkPackage pack : packages) {
			if (pack.getParentId() != null) {
				children.computeIfAbsent(pack.getParentId(), key -> new ArrayList<>()).add(pack.getId());
			}
		}
		Map<Long, List<Task>> tasksByPackage = tasks.stream()
				.collect(Collectors.groupingBy(Task::getWorkPackageId));
		Map<Long, AcceptanceCertificate> certificateByPackage = certificateRepository
				.findByProjectIdOrderByIdDesc(project.getId()).stream()
				.collect(Collectors.toMap(AcceptanceCertificate::getWorkPackageId, Function.identity(),
						(newer, older) -> newer));
		return packages.stream().map(pack -> {
			int total = 0;
			int done = 0;
			for (Long packageId : subtree(pack.getId(), children)) {
				for (Task task : tasksByPackage.getOrDefault(packageId, List.of())) {
					total++;
					if (task.getStatus() == TaskStatus.DONE) {
						done++;
					}
				}
			}
			AcceptanceCertificate certificate = certificateByPackage.get(pack.getId());
			return new WorkPackageProgressRes(pack.getId(), pack.getParentId(), pack.getName(), total, done,
					percent(done, total), certificate == null ? null : certificate.getStatus());
		}).toList();
	}

	private List<Long> subtree(Long rootId, Map<Long, List<Long>> children) {
		List<Long> result = new ArrayList<>();
		List<Long> frontier = new ArrayList<>(List.of(rootId));
		while (!frontier.isEmpty()) {
			Long current = frontier.remove(frontier.size() - 1);
			if (!result.contains(current)) {
				result.add(current);
				frontier.addAll(children.getOrDefault(current, List.of()));
			}
		}
		return result;
	}

	/** San pham da ban giao it nhat mot lan (NCL-12-CN-004), phien ban moi nhat truoc. */
	private List<DeliveredItemRes> deliveredItems(Project project, List<WorkPackage> packages) {
		List<Deliverable> deliverables = deliverableRepository.findByProjectIdOrderByWorkPackageIdAscIdAsc(project.getId());
		if (deliverables.isEmpty()) {
			return List.of();
		}
		Map<Long, List<DeliverableVersion>> versions = deliverableVersionRepository
				.findByDeliverableIdInOrderByDeliveredDateDescIdDesc(deliverables.stream().map(Deliverable::getId).toList())
				.stream().collect(Collectors.groupingBy(DeliverableVersion::getDeliverableId));
		Map<Long, String> packageNames = packages.stream()
				.collect(Collectors.toMap(WorkPackage::getId, WorkPackage::getName));
		return deliverables.stream()
				.filter(deliverable -> versions.containsKey(deliverable.getId()))
				.map(deliverable -> {
					List<DeliverableVersion> history = versions.get(deliverable.getId());
					DeliverableVersion latest = history.get(0);
					return new DeliveredItemRes(deliverable.getId(), deliverable.getWorkPackageId(),
							packageNames.get(deliverable.getWorkPackageId()), deliverable.getName(),
							deliverable.getDeliverableType(), latest.getVersionNo(), latest.getDeliveredDate(),
							latest.getFileUrl(), history.size());
				})
				.toList();
	}

	private static int percent(int done, int total) {
		return total == 0 ? 0 : (int) Math.round(done * 100.0 / total);
	}
}
