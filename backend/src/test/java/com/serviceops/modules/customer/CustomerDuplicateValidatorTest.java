package com.serviceops.modules.customer;

import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import com.serviceops.modules.customer.dto.response.DuplicateCandidateRes;
import com.serviceops.modules.customer.validator.CustomerDuplicateValidator;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Unit test CustomerDuplicateValidator - logic chan luu that su duoc dung trong
 * CustomerServiceImpl.create()/createWithOverride() (NCL-02-CN-002, TC-01, TC-02, TC-03).
 */
class CustomerDuplicateValidatorTest {

	private final CustomerDuplicateValidator validator = new CustomerDuplicateValidator();

	@Test
	@DisplayName("TC-01: co ho so giong cao (>= 0.9) thi chan luu")
	void blocksWhenHighSimilarityCandidateExists() {
		DuplicateCandidateRes highMatch = new DuplicateCandidateRes(
				1L, "KH-1", "Cong ty TNHH ABC", "0101234567", "0987654321", 0.95, List.of("maSoThue"));

		assertThatThrownBy(() -> validator.validate(List.of(highMatch)))
				.isInstanceOf(BusinessRuleException.class)
				.extracting(ex -> ((BusinessRuleException) ex).getErrorCode())
				.isEqualTo(ErrorCode.DUPLICATE_DATA);
	}

	@Test
	@DisplayName("Chi co ho so giong thap (< 0.9) thi khong chan, chi la goi y")
	void doesNotBlockWhenSimilarityBelowThreshold() {
		DuplicateCandidateRes lowMatch = new DuplicateCandidateRes(
				1L, "KH-1", "Cong ty TNHH ABC gan giong", null, null, 0.7, List.of("ten"));

		assertThatCode(() -> validator.validate(List.of(lowMatch))).doesNotThrowAnyException();
	}

	@Test
	@DisplayName("TC-03: danh sach rong thi khong chan")
	void doesNotBlockWhenNoCandidates() {
		assertThatCode(() -> validator.validate(List.of())).doesNotThrowAnyException();
		assertThatCode(() -> validator.validate(null)).doesNotThrowAnyException();
	}

	@Test
	@DisplayName("TC-02: xac nhan bo qua canh bao ma khong nhap ly do thi bi tu choi")
	void rejectsBlankOverrideReason() {
		assertThatThrownBy(() -> validator.validateOverrideReason("   "))
				.isInstanceOf(BusinessRuleException.class)
				.extracting(ex -> ((BusinessRuleException) ex).getErrorCode())
				.isEqualTo(ErrorCode.VALIDATION_ERROR);

		assertThatThrownBy(() -> validator.validateOverrideReason(null))
				.isInstanceOf(BusinessRuleException.class)
				.extracting(ex -> ((BusinessRuleException) ex).getErrorCode())
				.isEqualTo(ErrorCode.VALIDATION_ERROR);
	}

	@Test
	@DisplayName("TC-02: co ly do hop le thi khong bi tu choi")
	void acceptsNonBlankOverrideReason() {
		assertThatCode(() -> validator.validateOverrideReason("Hai phap nhan khac nhau, cung ten viet tat"))
				.doesNotThrowAnyException();
	}
}
