package com.serviceops.modules.timesheet.validator;

import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import org.springframework.stereotype.Component;

import java.time.Clock;
import java.time.LocalDate;

/**
 * Kiem tra ngay lam viec phai nam trong ky cham cong dang mo (NCL-06-CN-001).
 *
 * <p>Hien tai chi kiem tra ngay khong duoc o tuong lai so voi dong ho he thong
 * ({@link Clock} inject tu {@code TimeConfig} de unit test thay the). Viec chan
 * ngay nam trong ky da khoá se duoc bo sung boi story khoa ky cham cong
 * (VHDV-70) khi bang {@code timesheet_periods} di vao hoat dong.</p>
 */
@Component
public class OpenPeriodValidator {

	private final Clock clock;

	public OpenPeriodValidator(Clock clock) {
		this.clock = clock;
	}

	/**
	 * @param workDate ngay lam viec nguoi dung khai bao.
	 * @throws BusinessRuleException INVALID_STATE neu ngay o tuong lai.
	 */
	public void validate(LocalDate workDate) {
		LocalDate today = LocalDate.now(clock);
		if (workDate.isAfter(today)) {
			throw new BusinessRuleException(ErrorCode.INVALID_STATE,
					"Ngay lam viec khong duoc o tuong lai (hom nay la " + today + ")");
		}
	}
}
