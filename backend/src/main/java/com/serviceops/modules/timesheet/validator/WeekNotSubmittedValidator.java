package com.serviceops.modules.timesheet.validator;

import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import com.serviceops.modules.timesheet.entity.Timesheet;
import com.serviceops.modules.timesheet.enums.TimesheetStatus;
import com.serviceops.modules.timesheet.repository.TimesheetRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.temporal.TemporalAdjusters;

/**
 * Chan ghi gio cong MOI vao mot tuan da co bang cham cong khong con la
 * REJECTED (NCL-06-CN-002).
 *
 * <p>Truoc khi co validator nay, {@code TimeEntryServiceImpl#create} khong he
 * kiem tra bang cham cong tuan — nguoi dung van tao duoc dong NHAP moi cho mot
 * tuan ma bang cham cong da SUBMITTED/PENDING_APPROVAL/APPROVED tu truoc. Dong
 * NHAP do mac ket vinh vien: {@code TimesheetSubmitServiceImpl#submit} luon tu
 * choi nop lai mot tuan da khong con REJECTED (xem
 * {@code rejectsResubmitOfApprovedWeek}) — nen dong nay khong bao gio chuyen
 * duoc sang SUBMITTED, du giao dien van hien nut "Nop bang cham cong" moi lan
 * tai lai trang.</p>
 */
@Component
@RequiredArgsConstructor
public class WeekNotSubmittedValidator {

	private final TimesheetRepository timesheetRepository;

	/**
	 * @param userId   nguoi ghi gio cong.
	 * @param workDate ngay lam viec cua dong gio cong dang duoc tao.
	 * @throws BusinessRuleException INVALID_STATE neu tuan chua ngay do da co bang
	 *                                cham cong khong con REJECTED.
	 */
	public void validate(Long userId, LocalDate workDate) {
		LocalDate weekStart = workDate.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
		timesheetRepository.findByUserIdAndWeekStartDate(userId, weekStart).ifPresent(timesheet -> {
			if (timesheet.getStatus() != TimesheetStatus.REJECTED) {
				throw new BusinessRuleException(ErrorCode.INVALID_STATE,
						"Tuan cham cong bat dau " + weekStart + " da " + statusLabel(timesheet)
								+ " — khong the ghi them gio cong moi cho tuan nay."
								+ " Lien he Quan ly du an/Ke toan neu can bo sung gio cong da qua.");
			}
		});
	}

	private String statusLabel(Timesheet timesheet) {
		return switch (timesheet.getStatus()) {
			case PENDING_APPROVAL -> "duoc nop, dang cho duyet";
			case APPROVED -> "duoc duyet";
			case REJECTED -> "bi tu choi";
		};
	}
}
