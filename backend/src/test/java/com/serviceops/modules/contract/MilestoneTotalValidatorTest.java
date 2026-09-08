package com.serviceops.modules.contract;

import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import com.serviceops.modules.contract.validator.MilestoneTotalValidator;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Unit test MilestoneTotalValidator - NCL-04-CN-003 (TC-01/TC-02): tong cac
 * moc thanh toan phai dung bang gia tri hop dong.
 */
class MilestoneTotalValidatorTest {

	private final MilestoneTotalValidator validator = new MilestoneTotalValidator();

	@Test
	@DisplayName("TC-01: tong ba moc (30/30/40%) dung bang gia tri hop dong la hop le")
	void acceptsSumEqualToTotalValue() {
		assertThatCode(() -> validator.validate(new BigDecimal("1000000000"),
				List.of(new BigDecimal("300000000"), new BigDecimal("300000000"), new BigDecimal("400000000"))))
				.doesNotThrowAnyException();
	}

	@Test
	@DisplayName("TC-02: tong cac moc vuot gia tri hop dong thi bao VALIDATION_ERROR va khong cho luu")
	void rejectsSumGreaterThanTotalValue() {
		assertThatThrownBy(() -> validator.validate(new BigDecimal("1000000000"),
				List.of(new BigDecimal("700000000"), new BigDecimal("500000000"))))
				.isInstanceOf(BusinessRuleException.class)
				.extracting(ex -> ((BusinessRuleException) ex).getErrorCode())
				.isEqualTo(ErrorCode.VALIDATION_ERROR);
	}

	@Test
	@DisplayName("Tong cac moc thap hon gia tri hop dong cung bi tu choi (phai dung bang, khong duoc thieu)")
	void rejectsSumLessThanTotalValue() {
		assertThatThrownBy(() -> validator.validate(new BigDecimal("1000000000"),
				List.of(new BigDecimal("300000000"), new BigDecimal("300000000"))))
				.isInstanceOf(BusinessRuleException.class)
				.extracting(ex -> ((BusinessRuleException) ex).getErrorCode())
				.isEqualTo(ErrorCode.VALIDATION_ERROR);
	}

	@Test
	@DisplayName("Danh sach rong thi bao VALIDATION_ERROR")
	void rejectsEmptyList() {
		assertThatThrownBy(() -> validator.validate(new BigDecimal("1000000000"), List.of()))
				.isInstanceOf(BusinessRuleException.class)
				.extracting(ex -> ((BusinessRuleException) ex).getErrorCode())
				.isEqualTo(ErrorCode.VALIDATION_ERROR);
	}
}
