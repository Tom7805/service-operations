package com.serviceops.modules.timesheet.service.impl;

import com.serviceops.common.audit.AuditTargetType;
import com.serviceops.common.audit.service.AuditLogService;
import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import com.serviceops.modules.timesheet.dto.request.TimesheetRejectReq;
import com.serviceops.modules.timesheet.dto.response.TimesheetRes;
import com.serviceops.modules.timesheet.entity.Timesheet;
import com.serviceops.modules.timesheet.enums.TimesheetStatus;
import com.serviceops.modules.timesheet.repository.TimesheetRepository;
import com.serviceops.modules.timesheet.service.TimesheetApprovalService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDateTime;

/**
 * NCL-06-CN-004: tu choi bang cham cong.
 *
 * <p>Quy tac (QTN-10 — gio cong da duyet la bat bien):</p>
 * <ul>
 *   <li>Chi tu choi duoc bang dang o trang thai {@code PENDING_APPROVAL} (cho duyet); bang o trang
 *       thai khac (DRAFT/APPROVED) bi tu choi voi loi {@code 400 INVALID_STATE} (TC theo QTN-10:
 *       khong the "tu choi nguoc" mot bang da duyet).</li>
 *   <li>Ly do tu choi la bat buoc — duoc {@code @NotBlank} tren {@link TimesheetRejectReq} chan o
 *       tang validate truoc khi vao service (NCL-06-CN-004-TC-02).</li>
 *   <li>Sau khi tu choi, bang quay ve trang thai {@code DRAFT} de nguoi nop sua lai
 *       (NCL-06-CN-004-TC-01); dau vet lan tu choi gan nhat (nguoi tu choi, thoi diem, ly do) duoc
 *       giu lai tren chinh ban ghi de nguoi nop biet vi sao bi tra ve.</li>
 *   <li>NCL-06-CN-004-TC-04: moi lan tu choi deu ghi Nhat ky he thong (nguoi thuc hien, noi dung,
 *       thoi diem) qua {@link AuditLogService}.</li>
 *   <li>Phan quyen (chi Quan ly du an — VT-02) duoc chan o tang controller bang
 *       {@code @PreAuthorize}; luot bi tu choi quyen duoc {@code AccessDeniedAuditRecorder} ghi nhat
 *       ky rieng (NCL-06-CN-004-TC-03).</li>
 * </ul>
 */
@Service
@RequiredArgsConstructor
@Transactional
public class TimesheetApprovalServiceImpl implements TimesheetApprovalService {

	private final TimesheetRepository timesheetRepository;
	private final AuditLogService auditLogService;
	private final Clock clock;

	@Override
	public TimesheetRes reject(Long timesheetId, TimesheetRejectReq request) {
		Timesheet timesheet = timesheetRepository.findById(timesheetId)
				.orElseThrow(() -> new BusinessRuleException(ErrorCode.RESOURCE_NOT_FOUND,
						"Khong tim thay bang cham cong"));

		if (timesheet.getStatus() != TimesheetStatus.PENDING_APPROVAL) {
			throw new BusinessRuleException(ErrorCode.INVALID_STATE,
					"Chi tu choi duoc bang cham cong dang cho duyet");
		}

		String reason = request.reason().trim();
		LocalDateTime now = LocalDateTime.now(clock);

		timesheet.setStatus(TimesheetStatus.DRAFT);
		timesheet.setRejectedBy(currentActorId());
		timesheet.setRejectedAt(now);
		timesheet.setRejectReason(reason);
		// Bang quay ve DRAFT nen bo cac dau vet nop/duyet cu — tranh hien thi lan nop truoc do
		// nhu the van dang cho duyet.
		timesheet.setSubmittedBy(null);
		timesheet.setSubmittedAt(null);
		timesheet.setUpdatedAt(now);
		Timesheet saved = timesheetRepository.save(timesheet);

		// NCL-06-CN-004-TC-01: bao cho nguoi nop biet ly do bi tra ve. Kenh gui thong bao trong ung
		// dung (NCL-14) chua duoc trien khai — Nhat ky he thong ben duoi la noi nguoi nop/nguoi lien
		// quan tra cuu duoc ngay ly do va thoi diem bi tu choi; se noi vao NotificationDispatcher khi
		// module Thong bao (NCL-14) duoc hien thuc.
		auditLogService.record(
				"Tu choi bang cham cong",
				AuditTargetType.TIMESHEET,
				saved.getId(),
				"Bang cham cong tuan " + saved.getWeekStartDate() + " - " + saved.getWeekEndDate(),
				"Tu choi bang cham cong cua nguoi dung #" + saved.getUserId() + " voi ly do: " + reason);

		return toResponse(saved);
	}

	private TimesheetRes toResponse(Timesheet timesheet) {
		return new TimesheetRes(timesheet.getId(), timesheet.getUserId(), timesheet.getWeekStartDate(),
				timesheet.getWeekEndDate(), timesheet.getStatus(), timesheet.getTotalHours(),
				timesheet.getSubmittedBy(), timesheet.getSubmittedAt(), timesheet.getApprovedBy(),
				timesheet.getApprovedAt(), timesheet.getRejectedBy(), timesheet.getRejectedAt(),
				timesheet.getRejectReason());
	}

	private Long currentActorId() {
		var authentication = org.springframework.security.core.context.SecurityContextHolder.getContext()
				.getAuthentication();
		if (authentication != null
				&& authentication.getPrincipal() instanceof com.serviceops.security.CustomUserDetails details) {
			return details.getId();
		}
		return null;
	}
}
