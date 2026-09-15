package com.serviceops.modules.timesheet.validator;

import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import com.serviceops.modules.timesheet.entity.TimeEntry;
import com.serviceops.modules.timesheet.enums.TimeEntryStatus;
import org.springframework.stereotype.Component;

/**
 * Chan sua/xoa ban ghi gio cong khong con la nhap (NCL-06-CN-001). Chi ban ghi
 * o trang thai {@link TimeEntryStatus#DRAFT} duoc phep thay doi; ban ghi da
 * nop/da duyet chi sua qua luong dieu chinh voi but toan dao (story VHDV-80).
 */
@Component
public class ImmutableEntryValidator {

	/**
	 * @param entry ban ghi gio cong dang xem xet sua/xoa.
	 * @throws BusinessRuleException INVALID_STATE neu ban ghi khong o trang thai DRAFT.
	 */
	public void validate(TimeEntry entry) {
		if (entry.getStatus() != TimeEntryStatus.DRAFT) {
			throw new BusinessRuleException(ErrorCode.INVALID_STATE,
					"Ban ghi gio cong da nop/da duyet, khong the sua hoac xoa truc tiep");
		}
	}
}
