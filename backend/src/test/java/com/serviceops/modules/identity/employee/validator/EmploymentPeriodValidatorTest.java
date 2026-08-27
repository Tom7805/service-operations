package com.serviceops.modules.identity.employee.validator;

import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class EmploymentPeriodValidatorTest {

    private final EmploymentPeriodValidator validator = new EmploymentPeriodValidator();

    @Test
    void allowsEndDateAfterStartDate() {
        assertThatCode(() -> validator.validate(LocalDate.of(2026, 1, 1), LocalDate.of(2026, 6, 1)))
                .doesNotThrowAnyException();
    }

    @Test
    void allowsEndDateEqualToStartDate() {
        LocalDate day = LocalDate.of(2026, 1, 1);
        assertThatCode(() -> validator.validate(day, day)).doesNotThrowAnyException();
    }

    @Test
    void allowsMissingEndDate() {
        assertThatCode(() -> validator.validate(LocalDate.of(2026, 1, 1), null))
                .doesNotThrowAnyException();
    }

    @Test
    void rejectsEndDateBeforeStartDate() {
        assertThatThrownBy(() -> validator.validate(LocalDate.of(2026, 6, 1), LocalDate.of(2026, 1, 1)))
                .isInstanceOf(BusinessRuleException.class)
                .extracting(ex -> ((BusinessRuleException) ex).getErrorCode())
                .isEqualTo(ErrorCode.INVALID_STATE);
    }
}
