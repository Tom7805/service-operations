package com.serviceops.modules.timesheet.service.impl;

import com.serviceops.common.audit.AuditTargetType;
import com.serviceops.common.audit.service.AuditLogService;
import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import com.serviceops.modules.timesheet.dto.request.PeriodLockReq;
import com.serviceops.modules.timesheet.dto.response.TimesheetPeriodRes;
import com.serviceops.modules.timesheet.entity.Timesheet;
import com.serviceops.modules.timesheet.entity.TimesheetPeriod;
import com.serviceops.modules.timesheet.enums.PeriodStatus;
import com.serviceops.modules.timesheet.enums.TimesheetStatus;
import com.serviceops.modules.timesheet.repository.TimesheetPeriodRepository;
import com.serviceops.modules.timesheet.repository.TimesheetRepository;
import com.serviceops.modules.timesheet.service.TimesheetPeriodService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.List;

/**
 * NCL-06-CN-006: khoa/mo ky cham cong (QTN-12).
 *
 * <p>Quy tac:</p>
 * <ul>
 *   <li>Ky duoc xac dinh theo thang ({@code year}/{@code month}); neu chua co ban ghi ky cho
 *       thang do thi tao moi (o trang thai mo) roi khoa luon trong cung thao tac.</li>
 *   <li>Chi khoa duoc khi KHONG con bang cham cong nao dang {@code PENDING_APPROVAL} co tuan
 *       giao voi ky — neu con, chan va liet ke cac bang do (TC-02).</li>
 *   <li>Ky da khoa roi thi khong khoa lai duoc nua (400 INVALID_STATE); tuong tu, chi mo lai
 *       duoc ky dang o trang thai LOCKED.</li>
 *   <li>TC-04: moi lan khoa hoac mo lai ky deu ghi Nhat ky he thong (nguoi thuc hien, noi dung,
 *       thoi diem) qua {@link AuditLogService}.</li>
 *   <li>Sau khi khoa, moi thao tac them/sua gio cong (NCL-06-CN-001) va dieu chinh bang but
 *       toan dao (NCL-06-CN-005) tren cac ngay thuoc ky deu bi chan boi
 *       {@link com.serviceops.modules.timesheet.validator.PeriodLockValidator} (TC-01, Then).</li>
 * </ul>
 */
@Service
@RequiredArgsConstructor
@Transactional
public class TimesheetPeriodServiceImpl implements TimesheetPeriodService {

	private static final String FEATURE_LABEL = "Khoa ky cham cong";

	private final TimesheetPeriodRepository periodRepository;
	private final TimesheetRepository timesheetRepository;
	private final AuditLogService auditLogService;
	private final Clock clock;

	@Override
	@Transactional(readOnly = true)
	public List<TimesheetPeriodRes> findAll() {
		return periodRepository.findAllByOrderByPeriodStartDesc().stream().map(this::toResponse).toList();
	}

	@Override
	public TimesheetPeriodRes lock(PeriodLockReq request) {
		YearMonth yearMonth = YearMonth.of(request.year(), request.month());
		TimesheetPeriod period = periodRepository.findByPeriodStart(yearMonth.atDay(1))
				.orElseGet(() -> newPeriod(yearMonth));

		if (period.getStatus() == PeriodStatus.LOCKED) {
			throw invalidState("Ky cham cong thang " + yearMonth + " da bi khoa tu truoc");
		}

		// TC-02: chan khoa khi con bang cham cong dang cho duyet trong ky.
		List<Timesheet> pending = timesheetRepository.findOverlappingByStatus(TimesheetStatus.PENDING_APPROVAL,
				period.getPeriodStart(), period.getPeriodEnd());
		if (!pending.isEmpty()) {
			throw invalidState("Con " + pending.size() + " bang cham cong dang cho duyet trong ky, "
					+ "chua the khoa: " + pending.stream()
							.map(t -> "#" + t.getId() + " (nguoi dung #" + t.getUserId() + ", tuan "
									+ t.getWeekStartDate() + " - " + t.getWeekEndDate() + ")")
							.reduce((a, b) -> a + "; " + b).orElse(""));
		}

		String actor = currentUsername();
		LocalDateTime now = LocalDateTime.now(clock);
		period.setStatus(PeriodStatus.LOCKED);
		period.setLockedBy(actor);
		period.setLockedAt(now);
		period.setUpdatedAt(now);
		TimesheetPeriod saved = periodRepository.save(period);

		// TC-04: ghi nhat ky nguoi khoa, noi dung, thoi diem.
		auditLogService.record("Khoa ky cham cong", AuditTargetType.GENERAL, saved.getId(), FEATURE_LABEL,
				"Ky " + saved.getPeriodStart() + " - " + saved.getPeriodEnd() + ": da khoa");

		return toResponse(saved);
	}

	@Override
	public TimesheetPeriodRes unlock(Long periodId) {
		TimesheetPeriod period = periodRepository.findById(periodId)
				.orElseThrow(() -> notFound("Khong tim thay ky cham cong"));
		if (period.getStatus() != PeriodStatus.LOCKED) {
			throw invalidState("Ky cham cong chua bi khoa, khong can mo lai");
		}

		LocalDateTime now = LocalDateTime.now(clock);
		period.setStatus(PeriodStatus.OPEN);
		period.setUpdatedAt(now);
		TimesheetPeriod saved = periodRepository.save(period);

		// TC-04: ghi nhat ky nguoi mo lai ky, noi dung, thoi diem.
		auditLogService.record("Mo lai ky cham cong", AuditTargetType.GENERAL, saved.getId(), FEATURE_LABEL,
				"Ky " + saved.getPeriodStart() + " - " + saved.getPeriodEnd() + ": da mo lai");

		return toResponse(saved);
	}

	private TimesheetPeriod newPeriod(YearMonth yearMonth) {
		TimesheetPeriod period = new TimesheetPeriod();
		LocalDateTime now = LocalDateTime.now(clock);
		period.setPeriodStart(yearMonth.atDay(1));
		period.setPeriodEnd(yearMonth.atEndOfMonth());
		period.setStatus(PeriodStatus.OPEN);
		period.setCreatedAt(now);
		period.setUpdatedAt(now);
		return period;
	}

	private TimesheetPeriodRes toResponse(TimesheetPeriod period) {
		return new TimesheetPeriodRes(period.getId(), period.getPeriodStart(), period.getPeriodEnd(),
				period.getStatus(), period.getLockedBy(), period.getLockedAt());
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
