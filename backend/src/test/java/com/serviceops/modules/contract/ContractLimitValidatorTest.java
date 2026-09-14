package com.serviceops.modules.contract;

import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import com.serviceops.modules.contract.validator.ContractLimitValidator;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Unit test ContractLimitValidator - NCL-04-CN-002 (TC-02, QTN-19):
 * han muc tran (neu co) phai khong am va khong nho hon gia tri hop dong.
 */
class ContractLimitValidatorTest {

private final ContractLimitValidator validator = new ContractLimitValidator();

@Test
@DisplayName("Khong dat han muc (null) la hop le")
void acceptsNullLimit() {
assertThatCode(() -> validator.validate(new BigDecimal("500000000"), null))
.doesNotThrowAnyException();
}

@Test
@DisplayName("TC-01: han muc bang hoac lon hon gia tri hop dong la hop le")
void acceptsLimitAtOrAboveValue() {
assertThatCode(() -> validator.validate(new BigDecimal("500000000"), new BigDecimal("500000000")))
.doesNotThrowAnyException();
assertThatCode(() -> validator.validate(new BigDecimal("500000000"), new BigDecimal("600000000")))
.doesNotThrowAnyException();
}

@Test
@DisplayName("TC-02 (QTN-19): han muc nho hon gia tri hop dong thi bao VALIDATION_ERROR")
void rejectsLimitBelowValue() {
assertThatThrownBy(() -> validator.validate(
new BigDecimal("500000000"), new BigDecimal("400000000")))
.isInstanceOf(BusinessRuleException.class)
.extracting(ex -> ((BusinessRuleException) ex).getErrorCode())
.isEqualTo(ErrorCode.VALIDATION_ERROR);
}

@Test
@DisplayName("Han muc am thi bao VALIDATION_ERROR")
void rejectsNegativeLimit() {
assertThatThrownBy(() -> validator.validate(
new BigDecimal("500000000"), new BigDecimal("-1")))
.isInstanceOf(BusinessRuleException.class)
.extracting(ex -> ((BusinessRuleException) ex).getErrorCode())
.isEqualTo(ErrorCode.VALIDATION_ERROR);
}
}