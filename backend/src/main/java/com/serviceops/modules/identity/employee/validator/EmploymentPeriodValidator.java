package com.serviceops.modules.identity.employee.validator;

import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import org.springframework.stereotype.Component;

import java.time.LocalDate;

/**
 * Kiem tra ngay ket thuc khong duoc som hon ngay bat dau (TC-03 cua NCL-01-CN-007).
 * Dung chung cho ca ho so nhan su (hireDate/endDate) va hop dong lao dong (startDate/endDate).
 */
@Component
public class EmploymentPeriodValidator {

    public void validate(LocalDate startDate, LocalDate endDate) {
        if (startDate != null && endDate != null && endDate.isBefore(startDate)) {
            throw new BusinessRuleException(ErrorCode.INVALID_STATE,
                    "Ngay ket thuc khong duoc som hon ngay bat dau");
        }
    }
}
