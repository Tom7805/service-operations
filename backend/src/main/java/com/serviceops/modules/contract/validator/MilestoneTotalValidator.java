package com.serviceops.modules.contract.validator;

import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.List;

/**
 * Kiem soat tong gia tri cac moc thanh toan o tang service (NCL-04-CN-003,
 * TC-01/TC-02): danh sach moc phai co it nhat mot moc va tong so tien phai
 * dung bang gia tri hop dong, neu khong he thong tu choi luu.
 */
@Component
public class MilestoneTotalValidator {

	/**
	 * @param totalValue gia tri hop dong (khong null).
	 * @param amounts    so tien da quy doi cua tung moc trong danh sach.
	 */
	public void validate(BigDecimal totalValue, List<BigDecimal> amounts) {
		if (amounts.isEmpty()) {
			throw new BusinessRuleException(ErrorCode.VALIDATION_ERROR,
					"Phai co it nhat mot moc thanh toan");
		}
		BigDecimal sum = amounts.stream().reduce(BigDecimal.ZERO, BigDecimal::add);
		if (sum.compareTo(totalValue) != 0) {
			throw new BusinessRuleException(ErrorCode.VALIDATION_ERROR,
					"Tong cac moc thanh toan (" + sum + ") phai dung bang gia tri hop dong (" + totalValue + ")");
		}
	}
}
