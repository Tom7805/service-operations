package com.serviceops.modules.timesheet.service.impl;

import com.serviceops.common.audit.AuditTargetType;
import com.serviceops.common.audit.entity.AuditLog;
import com.serviceops.common.audit.repository.AuditLogRepository;
import com.serviceops.common.audit.service.AuditLogService;
import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import com.serviceops.modules.project.entity.Project;
import com.serviceops.modules.project.entity.Task;
import com.serviceops.modules.project.repository.ProjectRepository;
import com.serviceops.modules.project.repository.TaskRepository;
import com.serviceops.modules.timesheet.dto.request.TimesheetApproveReq;
import com.serviceops.modules.timesheet.dto.request.TimesheetRejectReq;
import com.serviceops.modules.timesheet.dto.response.PendingTimesheetRes;
import com.serviceops.modules.timesheet.dto.response.TimesheetApprovalHistoryRes;
import com.serviceops.modules.timesheet.dto.response.TimesheetApprovalRes;
import com.serviceops.modules.timesheet.dto.response.TimesheetRejectRes;
import com.serviceops.modules.timesheet.dto.response.TimesheetRes;
import com.serviceops.modules.timesheet.entity.TimeEntry;
import com.serviceops.modules.timesheet.entity.Timesheet;
import com.serviceops.modules.timesheet.enums.TimeEntryStatus;
import com.serviceops.modules.timesheet.enums.TimesheetStatus;
import com.serviceops.modules.timesheet.mapper.TimesheetMapper;
import com.serviceops.modules.timesheet.repository.TimeEntryRepository;
import com.serviceops.modules.timesheet.repository.TimesheetRepository;
import com.serviceops.modules.timesheet.service.TimesheetApprovalService;
import com.serviceops.modules.notification.enums.NotificationType;
import com.serviceops.modules.notification.service.NotificationService;
import com.serviceops.modules.identity.user.entity.User;
import com.serviceops.modules.identity.user.repository.UserRepository;
import com.serviceops.security.scope.CurrentUserScopeProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Clock;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class TimesheetApprovalServiceImpl implements TimesheetApprovalService {

	private static final String TIMESHEET_LABEL = "Bang cham cong tuan";
	private static final String ACTION_APPROVE = "Duyet bang cham cong";
	private static final String ACTION_REJECT = "Tu choi bang cham cong";

	private final TimeEntryRepository timeEntryRepository;
	private final TimesheetRepository timesheetRepository;
	private final TaskRepository taskRepository;
	private final ProjectRepository projectRepository;
	private final CurrentUserScopeProvider currentUserScopeProvider;
	private final AuditLogService auditLogService;
	private final AuditLogRepository auditLogRepository;
	private final TimesheetMapper timesheetMapper;
	private final NotificationService notificationService;
	private final UserRepository userRepository;
	private final Clock clock;

	@Override
	@Transactional(readOnly = true)
	public List<PendingTimesheetRes> findPending() {
		Long pmId = requireCurrentManager();
		List<Timesheet> pendingTimesheets = timesheetRepository.findByStatusOrderBySubmittedAtAsc(
				TimesheetStatus.PENDING_APPROVAL);
		Map<Long, String> namesByUserId = userRepository
				.findAllById(pendingTimesheets.stream().map(Timesheet::getUserId).distinct().toList())
				.stream()
				.collect(Collectors.toMap(com.serviceops.modules.identity.user.entity.User::getId,
						u -> u.getFullName() == null ? "" : u.getFullName()));

		List<PendingTimesheetRes> queue = new ArrayList<>();
		for (Timesheet timesheet : pendingTimesheets) {
			List<TimeEntry> pendingForMe = entriesOf(timesheet).stream()
					.filter(entry -> entry.getStatus() == TimeEntryStatus.SUBMITTED)
					.filter(entry -> managedByMe(entry, pmId))
					.toList();
			if (!pendingForMe.isEmpty()) {
				queue.add(new PendingTimesheetRes(timesheet.getId(), timesheet.getUserId(),
						namesByUserId.get(timesheet.getUserId()),
						timesheet.getWeekStartDate(), timesheet.getWeekEndDate(), timesheet.getTotalHours(),
						pendingForMe.size(),
						pendingForMe.stream().map(TimeEntry::getHours).reduce(BigDecimal.ZERO, BigDecimal::add),
						timesheet.getSubmittedAt()));
			}
		}
		return queue;
	}

	@Override
	public TimesheetApprovalRes approve(Long timesheetId, TimesheetApproveReq request) {
		Long pmId = requireCurrentManager();
		Timesheet timesheet = timesheetRepository.findById(timesheetId)
				.orElseThrow(() -> notFound("Khong tim thay bang cham cong"));
		if (timesheet.getStatus() != TimesheetStatus.PENDING_APPROVAL) {
			throw invalidState("Bang cham cong khong o trang thai cho duyet (" + timesheet.getStatus() + ")");
		}
		List<TimeEntry> entries = entriesOf(timesheet);
		List<TimeEntry> submitted = entries.stream()
				.filter(entry -> entry.getStatus() == TimeEntryStatus.SUBMITTED)
				.toList();
		if (submitted.isEmpty()) {
			throw invalidState("Khong con dong gio cong cho duyet trong bang nay");
		}
		List<TimeEntry> targets = resolveTargets(submitted, request, pmId);

		// TC-01: dong duyet chuyen APPROVED — bat bien theo QTN-10 (ImmutableEntryValidator chan sua/xoa).
		targets.forEach(entry -> entry.setStatus(TimeEntryStatus.APPROVED));
		timeEntryRepository.saveAll(targets);
		List<String> warnings = updateTaskApprovedHours(targets);

		boolean anyPendingLeft = entries.stream()
				.anyMatch(entry -> entry.getStatus() == TimeEntryStatus.SUBMITTED);
		if (!anyPendingLeft) {
			timesheet.setStatus(TimesheetStatus.APPROVED);
			timesheet.setApprovedBy(currentUsername());
			timesheet.setApprovedAt(LocalDateTime.now(clock));
			timesheet.setUpdatedAt(LocalDateTime.now(clock));
			timesheetRepository.save(timesheet);
		}

		// TC-04: ghi nhat ky nguoi duyet, noi dung, thoi diem (actor tu SecurityContextHolder).
		String note = request == null ? null : request.note();
		auditLogService.record(ACTION_APPROVE, AuditTargetType.GENERAL, timesheet.getId(),
				TIMESHEET_LABEL, "Tuan " + timesheet.getWeekStartDate() + " - " + timesheet.getWeekEndDate()
						+ ": duyet " + targets.size() + " dong ("
						+ sumHours(targets) + " gio)" + (anyPendingLeft ? " — con phan cho PM khac duyet" : "")
						+ (note != null && !note.isBlank() ? " — ghi chu: " + note : ""));

		// Hook TC-01 (tinh lai bien loi nhuan du an): module profitability chua trien khai —
		// khi di vao hoat dong se duoc tinh lai tai day dua tren approvedHours moi cap nhat.

		return timesheetMapper.toApprovalResponse(timesheet, warnings);
	}

	/**
	 * NCL-06-CN-004: tu choi bang cham cong dang cho duyet.
	 *
	 * <p>Quy tac:</p>
	 * <ul>
	 *   <li>Chi tu choi duoc bang o trang thai {@code PENDING_APPROVAL}; bang khac trang thai do
	 *       (vd da {@code APPROVED} — QTN-10 gio da duyet bat bien) bi tu choi voi loi
	 *       {@code 400 INVALID_STATE} (TC-01, Given).</li>
	 *   <li>Ly do tu choi la bat buoc — chan boi {@code @NotBlank} tren {@link TimesheetRejectReq}
	 *       truoc khi vao service (TC-02).</li>
	 *   <li>TC-02 (giong duyet): bulk = tu choi cac dong SUBMITTED thuoc du an cua PM hien tai;
	 *       rieng le ({@code entryIds}) = chi tu choi cac dong do, van phai thuoc du an cua PM.</li>
	 *   <li>Dong bi tu choi quay ve {@code DRAFT} de nguoi nop sua lai (TC-01, Then). Bang chi
	 *       chuyen han sang {@code REJECTED} khi khong con dong {@code SUBMITTED} nao (cua bat ky PM
	 *       nao) sau thao tac nay — neu con phan cua PM khac, bang giu nguyen
	 *       {@code PENDING_APPROVAL} cho PM do xu ly tiep.</li>
	 *   <li>TC-04: moi lan tu choi deu ghi Nhat ky he thong (nguoi thuc hien, noi dung, thoi diem).</li>
	 * </ul>
	 */
	@Override
	public TimesheetRejectRes reject(Long timesheetId, TimesheetRejectReq request) {
		Long pmId = requireCurrentManager();
		Timesheet timesheet = timesheetRepository.findById(timesheetId)
				.orElseThrow(() -> notFound("Khong tim thay bang cham cong"));
		if (timesheet.getStatus() != TimesheetStatus.PENDING_APPROVAL) {
			throw invalidState("Bang cham cong khong o trang thai cho duyet (" + timesheet.getStatus() + ")");
		}
		List<TimeEntry> entries = entriesOf(timesheet);
		List<TimeEntry> submitted = entries.stream()
				.filter(entry -> entry.getStatus() == TimeEntryStatus.SUBMITTED)
				.toList();
		if (submitted.isEmpty()) {
			throw invalidState("Khong con dong gio cong cho duyet trong bang nay");
		}
		List<TimeEntry> targets = resolveRejectTargets(submitted, request, pmId);

		// TC-01: dong bi tu choi quay ve DRAFT de nguoi nop sua lai va nop lai.
		targets.forEach(entry -> entry.setStatus(TimeEntryStatus.DRAFT));
		timeEntryRepository.saveAll(targets);

		String reason = request.reason().trim();
		LocalDateTime now = LocalDateTime.now(clock);
		boolean anyPendingLeft = entries.stream()
				.anyMatch(entry -> entry.getStatus() == TimeEntryStatus.SUBMITTED);
		if (!anyPendingLeft) {
			timesheet.setStatus(TimesheetStatus.REJECTED);
			timesheet.setRejectedBy(currentUsername());
			timesheet.setRejectedAt(now);
			timesheet.setRejectReason(reason);
			timesheet.setUpdatedAt(now);
			timesheetRepository.save(timesheet);
		}

		// TC-04: ghi nhat ky nguoi tu choi, noi dung (kem ly do), thoi diem.
		auditLogService.record(ACTION_REJECT, AuditTargetType.GENERAL, timesheet.getId(),
				TIMESHEET_LABEL, "Tuan " + timesheet.getWeekStartDate() + " - " + timesheet.getWeekEndDate()
						+ ": tu choi " + targets.size() + " dong (" + sumHours(targets) + " gio)"
						+ (anyPendingLeft ? " — con phan cho PM khac xu ly" : "") + " — ly do: " + reason);

		// TC-01: nguoi nop nhan thong bao trong ung dung ngay khi bi tu choi.
		notifyRejectedSubmitter(timesheet, targets, reason);

		return timesheetMapper.toRejectResponse(timesheet, targets.size());
	}

	/**
	 * NCL-06-CN-003/CN-004: lich su cac lan duyet/tu choi GAN NHAT do chinh PM hien tai thuc hien.
	 *
	 * <p>Man hinh "Duyet bang cham cong" chi hien hang cho duyet — sau khi xu ly xong, bang bien
	 * khoi hang cho vi da co quyet dinh chu khong phai mat du lieu. Thay vi them mot bang du lieu
	 * rieng chi de luu lai dieu nay, ham nay doc lai chinh {@code audit_logs} da duoc ghi san
	 * trong cung transaction voi {@link #approve} / {@link #reject} — moi lan duyet/tu choi la
	 * mot dong lich su rieng (mot bang co the xuat hien nhieu lan neu duoc xu ly nhieu dot boi
	 * cac PM khac nhau phu trach cac du an khac nhau trong cung bang).</p>
	 */
	@Override
	@Transactional(readOnly = true)
	public List<TimesheetApprovalHistoryRes> findMyApprovalHistory(int limit) {
		Long pmId = requireCurrentManager();
		int size = Math.min(Math.max(limit, 1), 100);
		List<AuditLog> logs = auditLogRepository.findByActorUserIdAndActionInOrderByPerformedAtDesc(
				pmId, List.of(ACTION_APPROVE, ACTION_REJECT), PageRequest.of(0, size));
		if (logs.isEmpty()) {
			return List.of();
		}

		List<Long> timesheetIds = logs.stream().map(AuditLog::getTargetId).distinct().toList();
		Map<Long, Timesheet> timesheetsById = timesheetRepository.findAllById(timesheetIds).stream()
				.collect(Collectors.toMap(Timesheet::getId, Function.identity()));
		Map<Long, String> namesByUserId = userRepository
				.findAllById(timesheetsById.values().stream().map(Timesheet::getUserId).distinct().toList())
				.stream()
				.collect(Collectors.toMap(User::getId, u -> u.getFullName() == null ? "" : u.getFullName()));

		List<TimesheetApprovalHistoryRes> history = new ArrayList<>();
		for (AuditLog log : logs) {
			Timesheet timesheet = timesheetsById.get(log.getTargetId());
			if (timesheet == null) {
				// Bang cham cong da bi xoa khoi he thong — bo qua dong nhat ky mo coi nay thay vi loi.
				continue;
			}
			String action = ACTION_APPROVE.equals(log.getAction()) ? "APPROVED" : "REJECTED";
			history.add(new TimesheetApprovalHistoryRes(log.getId(), timesheet.getId(), timesheet.getUserId(),
					namesByUserId.get(timesheet.getUserId()), timesheet.getWeekStartDate(),
					timesheet.getWeekEndDate(), action, log.getDetail(), log.getPerformedAt()));
		}
		return history;
	}

	/** TC-02: bulk = tu choi cac dong thuoc du an cua PM; rieng le = theo entryIds, sai quyen tu choi. */
	private List<TimeEntry> resolveRejectTargets(List<TimeEntry> submitted, TimesheetRejectReq request, Long pmId) {
		if (request.entryIds() == null || request.entryIds().isEmpty()) {
			List<TimeEntry> mine = submitted.stream()
					.filter(entry -> managedByMe(entry, pmId))
					.toList();
			if (mine.isEmpty()) {
				throw new AccessDeniedException(
						"Khong co dong gio cong nao thuoc du an ma ban quan ly trong bang nay");
			}
			return mine;
		}
		Map<Long, TimeEntry> byId = submitted.stream()
				.collect(Collectors.toMap(TimeEntry::getId, Function.identity()));
		return request.entryIds().stream().distinct().map(id -> {
			TimeEntry entry = byId.get(id);
			if (entry == null) {
				throw notFound("Khong tim thay dong gio cong cho duyet voi id=" + id);
			}
			if (taskRepository.findById(entry.getTaskId()).isEmpty()) {
				throw notFound("Khong tim thay cong viec cua dong gio cong id=" + id);
			}
			if (!managedByMe(entry, pmId)) {
				throw new AccessDeniedException("Dong gio cong thuoc du an ma ban khong quan ly");
			}
			return entry;
		}).toList();
	}

	/** TC-02: bulk = duyet cac dong thuoc du an cua PM; rieng le = theo entryIds, sai quyen tu choi. */
	private List<TimeEntry> resolveTargets(List<TimeEntry> submitted, TimesheetApproveReq request, Long pmId) {
		if (request == null || request.entryIds() == null || request.entryIds().isEmpty()) {
			List<TimeEntry> mine = submitted.stream()
					.filter(entry -> managedByMe(entry, pmId))
					.toList();
			if (mine.isEmpty()) {
				throw new AccessDeniedException(
						"Khong co dong gio cong nao thuoc du an ma ban quan ly trong bang nay");
			}
			return mine;
		}
		Map<Long, TimeEntry> byId = submitted.stream()
				.collect(Collectors.toMap(TimeEntry::getId, Function.identity()));
		return request.entryIds().stream().distinct().map(id -> {
			TimeEntry entry = byId.get(id);
			if (entry == null) {
				throw notFound("Khong tim thay dong gio cong cho duyet voi id=" + id);
			}
			if (taskRepository.findById(entry.getTaskId()).isEmpty()) {
				throw notFound("Khong tim thay cong viec cua dong gio cong id=" + id);
			}
			if (!managedByMe(entry, pmId)) {
				throw new AccessDeniedException("Dong gio cong thuoc du an ma ban khong quan ly");
			}
			return entry;
		}).toList();
	}

	/** Cong tong gio da duyet vao approved_hours cua tung cong viec; bao canh bao >= 80% ngan sach (QTN-20). */
	private List<String> updateTaskApprovedHours(List<TimeEntry> approvedEntries) {
		List<String> warnings = new ArrayList<>();
		for (Long taskId : approvedEntries.stream().map(TimeEntry::getTaskId)
				.collect(Collectors.toCollection(LinkedHashSet::new))) {
			Task task = taskRepository.findById(taskId).orElse(null);
			if (task == null) {
				continue;
			}
			BigDecimal approved = timeEntryRepository.sumHoursByTaskIdAndStatusIn(taskId,
					List.of(TimeEntryStatus.APPROVED));
			task.setApprovedHours(approved);
			taskRepository.save(task);
			if (task.getBudgetHours() != null && task.getBudgetHours().signum() > 0) {
				BigDecimal ratio = approved.divide(task.getBudgetHours(), 4, RoundingMode.HALF_UP);
				if (ratio.compareTo(TimesheetMapper.OVER_BUDGET_WARNING_RATIO) >= 0) {
					warnings.add("Cong viec #" + task.getId() + " " + task.getName() + ": " + approved
							+ "/" + task.getBudgetHours() + " gio — da vuot nguong 80% ngan sach (QTN-20)");
				}
			}
		}
		return warnings;
	}

	private List<TimeEntry> entriesOf(Timesheet timesheet) {
		return timeEntryRepository.findByUserIdAndWorkDateBetweenOrderByIdAsc(
				timesheet.getUserId(), timesheet.getWeekStartDate(), timesheet.getWeekEndDate());
	}

	/** TC-02: entry thuoc du an ma nguoi goi quan ly? entry -> task -> project.projectManagerId. */
	private boolean managedByMe(TimeEntry entry, Long pmId) {
		Task task = taskRepository.findById(entry.getTaskId()).orElse(null);
		if (task == null) {
			return false;
		}
		Project project = projectRepository.findById(task.getProjectId()).orElse(null);
		return project != null && Objects.equals(project.getProjectManagerId(), pmId);
	}

	private BigDecimal sumHours(List<TimeEntry> entries) {
		return entries.stream().map(TimeEntry::getHours).reduce(BigDecimal.ZERO, BigDecimal::add);
	}

	/** TC-01: bao cho nguoi nop biet bang cham cong bi tu choi kem ly do, ngay trong ung dung. */
	private void notifyRejectedSubmitter(Timesheet timesheet, List<TimeEntry> targets, String reason) {
		Long submitterId = timesheet.getUserId();
		if (submitterId == null) {
			return;
		}
		String content = String.format(
				"Bang cham cong tuan %s - %s bi tu choi (%s gio) — ly do: %s",
				timesheet.getWeekStartDate(), timesheet.getWeekEndDate(), sumHours(targets), reason);
		notificationService.sendInAppNotification(submitterId, NotificationType.TIMESHEET_REJECTED,
				"Bang cham cong bi tu choi", content, timesheet.getId(), TIMESHEET_LABEL);
	}

	private Long requireCurrentManager() {
		Long userId = currentUserScopeProvider.currentUserId();
		if (userId == null) {
			throw new AccessDeniedException("Chua xac thuc nguoi dung");
		}
		return userId;
	}

	private BusinessRuleException notFound(String message) {
		return new BusinessRuleException(ErrorCode.RESOURCE_NOT_FOUND, message);
	}

	private BusinessRuleException invalidState(String message) {
		return new BusinessRuleException(ErrorCode.INVALID_STATE, message);
	}

	private String currentUsername() {
		Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
		return authentication == null ? null : authentication.getName();
	}
}
