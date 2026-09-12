package com.serviceops.modules.timesheet.mapper;

import com.serviceops.modules.timesheet.dto.response.TimeEntryRes;
import com.serviceops.modules.timesheet.dto.response.TimesheetRes;
import com.serviceops.modules.timesheet.dto.response.TimesheetSummaryRes;
import com.serviceops.modules.timesheet.entity.Timesheet;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.List;

/**
 * Gom cac ban ghi gio cong cua mot cong viec trong mot tuan cham cong thanh
 * mot dong luoi tuan tra ve FE (NCL-06-CN-001), kem canh bao vuot ngan sach.
 */
@Component
public class TimesheetMapper {

	/** Nguong canh bao vuot ngan sach gio cong (QTN-20). */
	public static final BigDecimal OVER_BUDGET_WARNING_RATIO = new BigDecimal("0.80");

	/**
	 * @param taskId      ma cong viec.
	 * @param taskName    ten cong viec (lay truoc tu bang project_tasks).
	 * @param weekFrom    ngay dau tuan cham cong.
	 * @param weekTo      ngay cuoi tuan cham cong.
	 * @param entries     cac ban ghi gio cong trong tuan (da loc theo cong viec).
	 * @param budgetHours ngan sach gio cong cua cong viec; null neu chua dat.
	 * @param approvedHours gio cong da duyet cua cong viec.
	 */
	public TimesheetSummaryRes toSummary(Long taskId, String taskName, LocalDate weekFrom, LocalDate weekTo,
			List<TimeEntryRes> entries, BigDecimal budgetHours, BigDecimal approvedHours) {
		BigDecimal totalHours = entries.stream()
				.map(TimeEntryRes::hours)
				.reduce(BigDecimal.ZERO, BigDecimal::add);

		BigDecimal usageRatio = null;
		boolean overBudgetWarning = false;
		if (budgetHours != null && budgetHours.signum() > 0) {
			usageRatio = totalHours.divide(budgetHours, 4, RoundingMode.HALF_UP);
			overBudgetWarning = usageRatio.compareTo(OVER_BUDGET_WARNING_RATIO) >= 0;
		}

		return new TimesheetSummaryRes(taskId, taskName, weekFrom, weekTo, entries, totalHours,
				budgetHours, approvedHours, usageRatio, overBudgetWarning);
	}

	/**
	 * Anh xa bang cham cong tuan sang ban ghi tra ve FE (NCL-06-CN-002).
	 */
	public TimesheetRes toResponse(Timesheet timesheet) {
		return new TimesheetRes(
				timesheet.getId(),
				timesheet.getUserId(),
				timesheet.getWeekStartDate(),
				timesheet.getWeekEndDate(),
				timesheet.getStatus(),
				timesheet.getTotalHours(),
				timesheet.getSubmittedBy(),
				timesheet.getSubmittedAt()
		);
	}
}
