package com.serviceops.modules.timesheet.service.impl;

import com.serviceops.common.audit.AuditTargetType;
import com.serviceops.common.audit.service.AuditLogService;
import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import com.serviceops.modules.project.entity.Project;
import com.serviceops.modules.project.entity.Task;
import com.serviceops.modules.project.repository.ProjectRepository;
import com.serviceops.modules.project.repository.TaskRepository;
import com.serviceops.modules.timesheet.dto.request.TimeEntryAdjustmentReq;
import com.serviceops.modules.timesheet.dto.response.AdjustmentTraceRes;
import com.serviceops.modules.timesheet.entity.TimeEntry;
import com.serviceops.modules.timesheet.entity.TimeEntryAdjustment;
import com.serviceops.modules.timesheet.enums.TimeEntryStatus;
import com.serviceops.modules.timesheet.enums.TimeEntryType;
import com.serviceops.modules.timesheet.mapper.TimeEntryMapper;
import com.serviceops.modules.timesheet.repository.TimeEntryAdjustmentRepository;
import com.serviceops.modules.timesheet.repository.TimeEntryRepository;
import com.serviceops.modules.timesheet.service.TimesheetAdjustmentService;
import com.serviceops.modules.timesheet.validator.PeriodLockValidator;
import com.serviceops.security.scope.CurrentUserScopeProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Objects;

/**
 * NCL-06-CN-005: dieu chinh mot dong gio cong da duyet bang but toan dao (QTN-11).
 *
 * <p>Quy tac:</p>
 * <ul>
 *   <li>Chi dieu chinh duoc dong dang {@code APPROVED} va la dong {@code ORIGINAL} (khong
 *       dieu chinh chong len mot dong dao/sua co san) — sai trang thai bi {@code 400 INVALID_STATE}
 *       (TC-01, Given).</li>
 *   <li>Chi PM quan ly du an cua cong viec do moi dieu chinh duoc (giong quy tac
 *       "chi duyet/tu choi entry thuoc du an minh quan ly" cua NCL-06-CN-003/004); nhan vien
 *       chuyen mon (VT-03) bi chan hoan toan boi {@code @PreAuthorize} o controller — khong the
 *       tu sua/xoa dong da duyet cua chinh minh qua API cua NCL-06-CN-001
 *       ({@code ImmutableEntryValidator}) (TC-02).</li>
 *   <li>Ky cham cong chua ngay lam viec cua dong goc da bi khoa thi chan dieu chinh, yeu cau
 *       ke toan mo lai ky (TC-03, {@link PeriodLockValidator}).</li>
 *   <li>Sinh hai dong moi cung {@code userId}/{@code taskId}/{@code workDate} voi dong goc —
 *       dong goc KHONG doi: dong dao ({@link TimeEntryType#REVERSAL}, so gio am dung bang dong
 *       goc) va dong sua ({@link TimeEntryType#CORRECTION}, so gio dung) — ca ba deu
 *       {@code APPROVED} ngay, khong phai nop/duyet lai (TC-01, Then).</li>
 *   <li>{@code approved_hours} cua cong viec duoc tinh lai tu tong cac dong APPROVED (gom ca
 *       dong dao/sua) de phan anh dung so gio thuc te.</li>
 *   <li>TC-04: moi lan dieu chinh deu ghi Nhat ky he thong (nguoi thuc hien, noi dung, thoi diem)
 *       va luu ban ghi {@link TimeEntryAdjustment} noi ca ba dong lai de tra cuu duoc lau dai.</li>
 * </ul>
 */
@Service
@RequiredArgsConstructor
@Transactional
public class TimesheetAdjustmentServiceImpl implements TimesheetAdjustmentService {

	private static final String FEATURE_LABEL = "Dieu chinh gio cong bang but toan dao";

	private final TimeEntryRepository timeEntryRepository;
	private final TimeEntryAdjustmentRepository adjustmentRepository;
	private final TaskRepository taskRepository;
	private final ProjectRepository projectRepository;
	private final CurrentUserScopeProvider currentUserScopeProvider;
	private final PeriodLockValidator periodLockValidator;
	private final AuditLogService auditLogService;
	private final TimeEntryMapper timeEntryMapper;
	private final Clock clock;

	@Override
	public AdjustmentTraceRes adjust(Long projectId, Long taskId, Long entryId, TimeEntryAdjustmentReq request) {
		Task task = requireManagedTask(projectId, taskId);
		TimeEntry original = requireEntryOfTask(entryId, task.getId());

		if (original.getStatus() != TimeEntryStatus.APPROVED) {
			throw invalidState("Chi dieu chinh duoc dong gio cong da duyet (dong hien o trang thai "
					+ original.getStatus() + ")");
		}
		if (original.getType() != TimeEntryType.ORIGINAL) {
			throw invalidState("Chi dieu chinh duoc dong gio cong goc, khong dieu chinh dong dao/sua");
		}
		periodLockValidator.validateOpen(original.getWorkDate());

		String reason = request.reason().trim();
		LocalDateTime now = LocalDateTime.now(clock);
		String actor = currentUsername();

		TimeEntry reversal = new TimeEntry();
		reversal.setTaskId(original.getTaskId());
		reversal.setUserId(original.getUserId());
		reversal.setWorkDate(original.getWorkDate());
		reversal.setHours(original.getHours().negate());
		reversal.setStatus(TimeEntryStatus.APPROVED);
		reversal.setType(TimeEntryType.REVERSAL);
		reversal.setNote("Dao dong #" + original.getId() + " — ly do: " + reason);
		reversal.setBillable(original.getBillable());
		reversal.setCreatedBy(actor);
		reversal.setCreatedAt(now);
		reversal.setUpdatedAt(now);

		TimeEntry corrected = new TimeEntry();
		corrected.setTaskId(original.getTaskId());
		corrected.setUserId(original.getUserId());
		corrected.setWorkDate(original.getWorkDate());
		corrected.setHours(request.correctedHours());
		corrected.setStatus(TimeEntryStatus.APPROVED);
		corrected.setType(TimeEntryType.CORRECTION);
		corrected.setNote("Sua dong #" + original.getId() + " — ly do: " + reason);
		corrected.setBillable(original.getBillable());
		corrected.setCreatedBy(actor);
		corrected.setCreatedAt(now);
		corrected.setUpdatedAt(now);

		TimeEntry savedReversal = timeEntryRepository.save(reversal);
		TimeEntry savedCorrected = timeEntryRepository.save(corrected);

		BigDecimal approved = timeEntryRepository.sumHoursByTaskIdAndStatusIn(task.getId(),
				List.of(TimeEntryStatus.APPROVED));
		task.setApprovedHours(approved);
		taskRepository.save(task);

		TimeEntryAdjustment adjustment = new TimeEntryAdjustment();
		adjustment.setOriginalEntryId(original.getId());
		adjustment.setReversalEntryId(savedReversal.getId());
		adjustment.setCorrectedEntryId(savedCorrected.getId());
		adjustment.setTaskId(task.getId());
		adjustment.setUserId(original.getUserId());
		adjustment.setWorkDate(original.getWorkDate());
		adjustment.setReason(reason);
		adjustment.setAdjustedBy(actor);
		adjustment.setAdjustedAt(now);
		adjustment.setCreatedAt(now);
		TimeEntryAdjustment savedAdjustment = adjustmentRepository.save(adjustment);

		// TC-04: ghi nhat ky nguoi dieu chinh, noi dung (so gio truoc/sau), thoi diem.
		auditLogService.record("Dieu chinh gio cong bang but toan dao", AuditTargetType.GENERAL, task.getId(),
				FEATURE_LABEL, "Cong viec #" + task.getId() + " ngay " + original.getWorkDate() + ": "
						+ formatHours(original.getHours()) + " -> " + formatHours(request.correctedHours())
						+ " gio (dong goc #" + original.getId() + ", dong dao #" + savedReversal.getId()
						+ ", dong sua #" + savedCorrected.getId() + ") — ly do: " + reason);

		return toTrace(savedAdjustment, original, savedReversal, savedCorrected);
	}

	@Override
	@Transactional(readOnly = true)
	public List<AdjustmentTraceRes> findHistory(Long projectId, Long taskId) {
		Task task = requireManagedTask(projectId, taskId);
		return adjustmentRepository.findByTaskIdOrderByAdjustedAtDesc(task.getId()).stream()
				.map(this::toTraceLoadingEntries)
				.toList();
	}

	private AdjustmentTraceRes toTraceLoadingEntries(TimeEntryAdjustment adjustment) {
		TimeEntry original = timeEntryRepository.findById(adjustment.getOriginalEntryId()).orElse(null);
		TimeEntry reversal = timeEntryRepository.findById(adjustment.getReversalEntryId()).orElse(null);
		TimeEntry corrected = timeEntryRepository.findById(adjustment.getCorrectedEntryId()).orElse(null);
		return toTrace(adjustment, original, reversal, corrected);
	}

	private AdjustmentTraceRes toTrace(TimeEntryAdjustment adjustment, TimeEntry original, TimeEntry reversal,
			TimeEntry corrected) {
		return new AdjustmentTraceRes(adjustment.getId(),
				original == null ? null : timeEntryMapper.toResponse(original),
				reversal == null ? null : timeEntryMapper.toResponse(reversal),
				corrected == null ? null : timeEntryMapper.toResponse(corrected),
				adjustment.getReason(), adjustment.getAdjustedBy(), adjustment.getAdjustedAt());
	}

	/** Chi PM quan ly du an cua cong viec nay moi duoc dieu chinh (giong NCL-06-CN-003/004). */
	private Task requireManagedTask(Long projectId, Long taskId) {
		Long pmId = requireCurrentManager();
		Project project = projectRepository.findById(projectId)
				.orElseThrow(() -> notFound("Khong tim thay du an"));
		Task task = taskRepository.findById(taskId)
				.filter(item -> item.getProjectId().equals(projectId))
				.orElseThrow(() -> notFound("Khong tim thay cong viec thuoc du an"));
		if (!Objects.equals(project.getProjectManagerId(), pmId)) {
			throw new AccessDeniedException("Ban khong phai quan ly cua du an nay");
		}
		return task;
	}

	private TimeEntry requireEntryOfTask(Long entryId, Long taskId) {
		return timeEntryRepository.findById(entryId)
				.filter(entry -> entry.getTaskId().equals(taskId))
				.orElseThrow(() -> notFound("Khong tim thay dong gio cong thuoc cong viec nay"));
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

	private String formatHours(BigDecimal hours) {
		return hours == null ? "0" : hours.toPlainString();
	}

	private String currentUsername() {
		Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
		return authentication == null ? null : authentication.getName();
	}
}
