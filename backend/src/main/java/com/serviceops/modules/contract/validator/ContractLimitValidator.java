package com.serviceops.modules.contract.validator;

import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;

/**
 * Kiem soat han muc tran hop dong o tang service (NCL-04-CN-002, TC-02, QTN-19):
 * han muc (neu co) phai khong am va khong duoc nho hon gia tri hop dong, neu
 * khong se khong the lap duoc hoa don ma khong vuot muc tran.
 */
@Component
public class ContractLimitValidator {

/**
 * @param totalValue gia tri hop dong sau khi ap dung yeu cau dieu chinh (khong null).
 * @param limitValue han muc tran nguoi dung khai bao; null = khong dat han muc (hop le).
 */
public void validate(BigDecimal totalValue, BigDecimal limitValue) {
if (limitValue == null) {
return;
}
if (limitValue.signum() < 0) {
throw new BusinessRuleException(ErrorCode.VALIDATION_ERROR,
"Han muc tran khong duoc am");
}
if (limitValue.compareTo(totalValue) < 0) {
throw new BusinessRuleException(ErrorCode.VALIDATION_ERROR,
"Han muc tran khong duoc nho hon gia tri hop dong (QTN-19)");
}
}
}