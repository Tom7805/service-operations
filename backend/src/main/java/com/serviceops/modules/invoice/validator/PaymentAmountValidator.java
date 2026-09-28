package com.serviceops.modules.invoice.validator;

import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;

/**
 * So tien ghi nhan khong duoc lon hon so con phai thu cua hoa don (NCL-10-CN-003, TC-03):
 * thu thua se lam cong no am va sai lech doi soat.
 */
@Component
public class PaymentAmountValidator {

	/**
	 * @param remaining so con phai thu hien tai cua hoa don (tong hoa don - tong da thu)
	 * @param amount    so tien sap ghi nhan
	 */
	public void validate(BigDecimal remaining, BigDecimal amount) {
		if (amount.compareTo(remaining) > 0) {
			throw new BusinessRuleException(ErrorCode.VALIDATION_ERROR,
					"So tien ghi nhan (" + amount + ") lon hon so con phai thu cua hoa don (" + remaining + ")");
		}
	}
}
