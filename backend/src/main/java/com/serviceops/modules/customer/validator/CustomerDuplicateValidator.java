package com.serviceops.modules.customer.validator;

import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import com.serviceops.modules.customer.dto.response.DuplicateCandidateRes;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Kiem tra chong trung ho so khach hang (NCL-02-CN-002).
 *
 * <p>Khi luu ho so moi ma co ho so nghi trung muc do giong cao (vi du cung ma so
 * thue) thi chan luu (TC-01). Neu nguoi dung muon tao moi, bat buoc co ly do (TC-02).</p>
 */
@Component
public class CustomerDuplicateValidator {

    /** Nguong muc do giong duoc xem la chan luu (TC-01). */
    private static final double BLOCKING_SIMILARITY = 0.9;

    public void validate(List<DuplicateCandidateRes> candidates) {
        if (candidates == null || candidates.isEmpty()) {
            return;
        }
        boolean blocking = candidates.stream().anyMatch(c -> c.similarity() >= BLOCKING_SIMILARITY);
        if (blocking) {
            throw new BusinessRuleException(ErrorCode.DUPLICATE_DATA,
                    "Ho so khach hang co the trung voi ho so da co (muc do giong cao). "
                            + "Vui long kiem tra hoac xac nhan tao moi kem ly do (TC-02).");
        }
    }

    public void validateOverrideReason(String reason) {
        if (reason == null || reason.isBlank()) {
            throw new BusinessRuleException(ErrorCode.VALIDATION_ERROR,
                    "Phai ghi ly do khi bo qua canh bao trung ho so khach hang");
        }
    }
}
