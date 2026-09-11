package com.serviceops.modules.timesheet.validator;

import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import com.serviceops.modules.timesheet.repository.TimeEntryRepository;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Tran gio cong mot ngay cua mot nhan su (NCL-06-CN-001). Tong so gio cong
 * da ghi trong mot ngay (cong ca ban ghi dang sua) khong duoc vuot 24 gio.
 */
@Component
public class DailyHourLimitValidator {

	/** Tran gio cong toi da trong mot ngay. */
	public static final BigDecimal MAX_HOURS_PER_DAY = new BigDecimal("24");

	private final TimeEntryRepository timeEntryRepository;

	public DailyHourLimitValidator(TimeEntryRepository timeEntryRepository) {
		this.timeEntryRepository = timeEntryRepository;
	}

	/**
	 * @param userId         nhan su ghi gio.
	 * @param workDate       ngay lam viec.
	 * @param hours          so gio cua ban ghi dang ghi/sua.
	 * @param existingHours  so gio ban ghi da co tren cung ngay (0 khi tao moi,
	 *                       hoac so gio hien tai cua ban ghi khi sua) — da duoc
	 *                       tru khoi tong truoc khi cong voi {@code hours}.
	 * @throws BusinessRuleException INVALID_STATE neu vuot tran 24 gio/ngay.
	 */
	public void validate(Long userId, LocalDate workDate, BigDecimal hours, BigDecimal existingHours) {
		BigDecimal alreadyLogged = timeEntryRepository.sumHoursByUserIdAndWorkDate(userId, workDate)
				.subtract(existingHours == null ? BigDecimal.ZERO : existingHours);
		if (alreadyLogged.add(hours).compareTo(MAX_HOURS_PER_DAY) > 0) {
			throw new BusinessRuleException(ErrorCode.INVALID_STATE,
					"Tong gio cong trong ngay " + workDate + " khong duoc vuot " + MAX_HOURS_PER_DAY
							+ " gio (da ghi " + alreadyLogged + " gio)");
		}
	}
}
