package com.serviceops.modules.timesheet.validator;

import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import com.serviceops.modules.timesheet.enums.PeriodStatus;
import com.serviceops.modules.timesheet.repository.TimesheetPeriodRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.LocalDate;

/**
 * Chan thao tac tren gio cong thuoc ky cham cong da khoa (NCL-06-CN-005-TC-03).
 *
 * <p>Chua co ky nao duoc tao/khoa (man hinh khoa ky thuoc story NCL-06-CN-006)
 * thi coi nhu con mo — khong chan gi ca.</p>
 */
@Component
@RequiredArgsConstructor
public class PeriodLockValidator {

	private final TimesheetPeriodRepository periodRepository;

	/**
	 * @param workDate ngay lam viec cua dong gio cong dang duoc dieu chinh.
	 * @throws BusinessRuleException INVALID_STATE neu ky chua ngay do da bi khoa.
	 */
	public void validateOpen(LocalDate workDate) {
		periodRepository.findByDate(workDate).ifPresent(period -> {
			if (period.getStatus() == PeriodStatus.LOCKED) {
				throw new BusinessRuleException(ErrorCode.INVALID_STATE,
						"Ky cham cong chua ngay " + workDate + " da bi khoa — lien he ke toan de mo lai ky");
			}
		});
	}
}
