package com.serviceops.modules.timesheet.validator;

import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import org.springframework.stereotype.Component;

import java.time.Clock;
import java.time.LocalDate;

/**
 * Kiem tra ngay lam viec khong o tuong lai (NCL-06-CN-001).
 *
 * <p>Dung dong ho he thong ({@link Clock} inject tu {@code TimeConfig} de unit test thay the).
 * Viec chan ngay nam trong ky da khoa la trach nhiem rieng cua {@link PeriodLockValidator}
 * (NCL-06-CN-006) — hai validator doc lap, deu duoc goi truoc khi ghi/sua/xoa gio cong.</p>
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
